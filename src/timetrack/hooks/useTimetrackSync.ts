"use client"

/**
 * Keeps this device and the server in step.
 *
 * HOW IT BEHAVES, in the order it matters to the person using it:
 *
 *  1. Your click is never waiting on the network. The change is applied and
 *     saved locally first, then sent. The tracker feels the same on a train as
 *     it does on wifi.
 *  2. If you are not signed in, it says so — "saved on this device only". It
 *     does not quietly pretend to sync, because the difference is your history.
 *  3. A failed send is kept and retried, and the number waiting is shown. The
 *     queue is written to this browser too, so closing the tab mid-send does
 *     not lose it.
 *  4. Nothing the server sends can overwrite a change of yours that has not
 *     been sent yet. See `syncService`.
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { emptyRows, type TimetrackRows } from "@/src/db/timetrackTypes"

import { PENDING_KEY, SYNC_CURSOR_KEY } from "../config"
import { stateToRows, rowsToState } from "../timetrackMapperService"
import {
  countRows,
  reattachToWorkspace,
  repairPending,
  diffRows,
  keysIn,
  mergeChangeSets,
  mergeIncoming,
  safeToSend,
  splitIntoBatches,
} from "../syncService"
import type { TimetrackState } from "../types"

export type SyncStatus =
  | "starting"
  /** never signed in here: this browser is the only copy, and it says so */
  | "local-only"
  /** was signed in, and the session has since expired */
  | "signed-out"
  | "synced"
  | "saving"
  | "offline"
  | "error"

export interface ImportOffer {
  entries: number
  projects: number
  /** what is actually in this browser, so it can be looked at before uploading */
  items: ImportItem[]
}

/** One line of the "here is what would be uploaded" list */
export interface ImportItem {
  id: string
  description: string
  project: string | null
  day: string
  seconds: number
}

interface Options {
  state: TimetrackState | null
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  replaceState: (next: TimetrackState) => void
  pushToast: (text: string, tone?: "info" | "error") => void
}

const PULL_EVERY_MS = 60_000
/**
 * A failed send retries on its own, doubling the wait up to a minute.
 *
 * It used to wait for the browser's "you are back online" event. That event is
 * not guaranteed — it does not fire when the connection was never lost but the
 * server was briefly unreachable, and some environments never dispatch it at
 * all. A queue that only drains on an event you do not control is a queue that
 * can hold somebody's afternoon forever.
 */
const RETRY_START_MS = 2_000
/** Rows per request. Keeps a big first upload well under any body-size limit. */
const MAX_ROWS_PER_REQUEST = 400
const RETRY_MAX_MS = 60_000

function readPending(): Partial<TimetrackRows> {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY)
    if (!raw) return {}
    return repairPending(JSON.parse(raw) as Partial<TimetrackRows>)
  } catch {
    return {}
  }
}

export function useTimetrackSync({ state, setState, replaceState, pushToast }: Options) {
  const [status, setStatus] = useState<SyncStatus>("starting")
  const [pendingCount, setPendingCount] = useState(0)
  const [importOffer, setImportOffer] = useState<ImportOffer | null>(null)

  /** the rows we believe the server has, so a diff knows what is new */
  const serverRows = useRef<TimetrackRows | null>(null)
  /** changes waiting to be sent */
  const pending = useRef<Partial<TimetrackRows>>({})
  const userId = useRef<string | null>(null)
  const cursor = useRef<string | null>(null)
  const flushing = useRef(false)
  const ready = useRef(false)
  /** the latest state, for code that runs after an await and would otherwise see a stale one */
  const latestState = useRef<TimetrackState | null>(null)
  /**
   * What this browser held the moment the page opened, kept as state rather
   * than rows.
   *
   * It used to be rows, mapped with a placeholder user id because the real one
   * had not arrived yet. Every row then looked different once the real id
   * turned up, and the settings row — which is keyed by user id — looked
   * deleted, so a tombstone was sent for a table that has no `deleted_at`
   * column. The whole batch was rejected, and because a queue drains all or
   * nothing, nothing was ever saved again. Verified against the live database.
   */
  const startingState = useRef<TimetrackState | null>(null)
  /**
   * True once we have successfully read the server and built the workspace from
   * it. Until then this device does not get to tell the server that anything is
   * gone — it has not earned an opinion about what exists.
   */
  const adopted = useRef(false)
  /**
   * The state we handed to `replaceState` and are still waiting for React to
   * apply.
   *
   * WITHOUT THIS: adoption sets the server's rows as the baseline, then the
   * change-watcher runs one more time with the state from *before* adoption —
   * an empty workspace — compares it with the baseline, and concludes that
   * every row on the server was deleted. It then sends exactly that. Verified:
   * it deleted a real entry, twice, before this ref existed.
   */
  const awaitingState = useRef<TimetrackState | null>(null)
  const retryAt = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelay = useRef(RETRY_START_MS)

  latestState.current = state

  const savePending = useCallback(() => {
    setPendingCount(countRows(pending.current))
    try {
      window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending.current))
    } catch {
      // the workspace itself is already saved; a lost queue re-derives from the
      // next diff, so this is worth reporting but not worth blocking on
      pushToast("Could not remember unsent changes in this browser", "error")
    }
  }, [pushToast])

  const flushRef = useRef<(() => Promise<void>) | null>(null)

  const flush = useCallback(async () => {
    if (flushing.current || !userId.current) return
    if (countRows(pending.current) === 0) {
      setStatus("synced")
      return
    }
    flushing.current = true
    setStatus("saving")
    // Everything goes to the one workspace the app is showing, whatever id the
    // row was created under before the server's copy arrived. `queued` is kept
    // separately: the queue is cleared by comparing against the object that was
    // queued, not against this rewritten copy, which is never the same object.
    const queued = pending.current
    const workspaceId = latestState.current?.workspace.id
    const sending = workspaceId ? reattachToWorkspace(queued, workspaceId) : queued
    try {
      // Sent in batches: a year of tracked time is megabytes, and a single
      // request that large is one the server may simply refuse — leaving the
      // person with nothing uploaded and no idea why.
      for (const batch of splitIntoBatches(sending, MAX_ROWS_PER_REQUEST)) {
        const response = await fetch("/api/timetrack/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        })
        if (response.status === 401) {
          // The session ended while the tab was open. Retrying is pointless,
          // and the first version did it forever — sitting on "Saving 43…"
          // while the work went nowhere. Stop, say so, and keep every change
          // queued for after the next sign-in.
          setStatus("signed-out")
          if (retryAt.current) clearTimeout(retryAt.current)
          return
        }
        if (!response.ok) {
          throw new Error((await response.json().catch(() => ({}))).error ?? response.statusText)
        }
      }
      // what we just sent is now what the server has
      serverRows.current = mergeIncoming(serverRows.current ?? emptyRows(), sending, new Set())
      // anything queued while that request was in the air stays queued
      pending.current = pending.current === queued ? {} : pending.current
      savePending()
      retryDelay.current = RETRY_START_MS
      setStatus(countRows(pending.current) > 0 ? "saving" : "synced")
    } catch (error) {
      // try again by ourselves, sooner at first and then less often
      if (retryAt.current) clearTimeout(retryAt.current)
      retryAt.current = setTimeout(() => void flushRef.current?.(), retryDelay.current)
      retryDelay.current = Math.min(retryDelay.current * 2, RETRY_MAX_MS)
      setStatus(navigator.onLine ? "error" : "offline")
      if (navigator.onLine) {
        pushToast(
          `Could not save to your account: ${error instanceof Error ? error.message : "unknown error"}. Your work is safe in this browser and will be sent again.`,
          "error",
        )
      }
    } finally {
      flushing.current = false
    }
  }, [pushToast, savePending])

  flushRef.current = flush

  useEffect(() => () => {
    if (retryAt.current) clearTimeout(retryAt.current)
  }, [])

  // --- first contact: who are we, and what does the server already have? ----
  useEffect(() => {
    if (!state || ready.current) return
    ready.current = true
    pending.current = readPending()
    setPendingCount(countRows(pending.current))
    // remember what was here before the server said anything
    startingState.current = state

    void (async () => {
      try {
        const response = await fetch("/api/timetrack/sync")
        if (response.status === 401) {
          setStatus("local-only")
          return
        }
        if (!response.ok) throw new Error(response.statusText)
        const body = (await response.json()) as {
          rows: TimetrackRows
          cursor: string
          empty: boolean
          userId?: string
        }
        cursor.current = body.cursor
        userId.current = body.userId ?? "self"

        if (body.empty) {
          // nothing stored yet. Offer to upload what this browser holds rather
          // than doing it behind their back.
          const localRows = stateToRows(state, userId.current)
          serverRows.current = null
          adopted.current = true
          if (state.entries.length > 0 || state.projects.length > 0) {
            setImportOffer({
              entries: state.entries.length,
              projects: state.projects.length,
              items: state.entries
                .slice()
                .sort((a, b) => b.start.localeCompare(a.start))
                .map((entry) => ({
                  id: entry.id,
                  description: entry.description,
                  project: state.projects.find((p) => p.id === entry.projectId)?.name ?? null,
                  day: entry.start.slice(0, 10),
                  seconds: entry.duration < 0 ? 0 : entry.duration,
                })),
            })
          } else {
            pending.current = mergeChangeSets(pending.current, diffRows(null, localRows, new Date().toISOString()).changed)
            savePending()
            void flush()
          }
          setStatus("synced")
          return
        }

        /**
         * Anything done between opening the page and the server answering must
         * survive. It used to be thrown away: press Start within the first two
         * seconds and the running timer simply vanished when the server's copy
         * arrived. Reproduced reliably before this existed.
         *
         * So the server's rows are the base, and whatever changed here since
         * the page opened is laid back on top — and queued for upload, because
         * the server has not heard about it either.
         */
        const sinceOpening = diffRows(
          startingState.current ? stateToRows(startingState.current, userId.current) : null,
          stateToRows(latestState.current ?? state, userId.current),
          new Date().toISOString(),
        )
        const base = sinceOpening.count > 0
          ? mergeIncoming(body.rows, sinceOpening.changed, new Set())
          : body.rows

        serverRows.current = body.rows
        const adoptedState = rowsToState(base, new Date().toISOString())
        awaitingState.current = adoptedState
        replaceState(adoptedState)
        adopted.current = true

        if (sinceOpening.count > 0) {
          pending.current = mergeChangeSets(pending.current, sinceOpening.changed)
          savePending()
        }
        setStatus("synced")
        void flush()
      } catch {
        setStatus(navigator.onLine ? "error" : "offline")
      }
    })()
  }, [state, replaceState, savePending, flush])

  // --- every local change becomes something to send -------------------------
  useEffect(() => {
    if (!state || !userId.current || status === "local-only") return

    // Nothing may be compared until the state we adopted has actually arrived.
    if (awaitingState.current) {
      if (state !== awaitingState.current) return
      awaitingState.current = null
      // the baseline is this exact state, round-tripped, so that mapping quirks
      // do not read as changes on the very next tick
      serverRows.current = stateToRows(state, userId.current)
      return
    }

    const rows = stateToRows(state, userId.current)
    const { changed, count } = diffRows(serverRows.current, rows, new Date().toISOString())
    if (count === 0) return

    const guard = safeToSend(changed, serverRows.current, adopted.current)
    if (!guard.ok) {
      // Refusing loudly. A change set that empties the account is either a bug
      // here or a half-read response, and either way the answer is not to do it
      // and hope. Reloading re-reads the server and starts from the truth.
      setStatus("error")
      pushToast(
        `Not sending a change that would delete ${guard.deletes} of your saved items. Nothing has been lost — reload the page to resync.`,
        "error",
      )
      return
    }

    pending.current = mergeChangeSets(pending.current, changed)
    savePending()
    const timer = setTimeout(() => void flush(), 800)
    return () => clearTimeout(timer)
  }, [state, status, savePending, flush])

  // --- ask for other devices' changes ---------------------------------------
  const pull = useCallback(async () => {
    if (!userId.current || !cursor.current) return
    try {
      const response = await fetch(`/api/timetrack/sync?since=${encodeURIComponent(cursor.current)}`)
      if (response.status === 401) {
        setStatus("signed-out")
        return
      }
      if (!response.ok) return
      const body = (await response.json()) as { rows: TimetrackRows; cursor: string }
      cursor.current = body.cursor
      if (countRows(body.rows) === 0) return

      const dirty = keysIn(pending.current)
      const merged = mergeIncoming(serverRows.current ?? emptyRows(), body.rows, dirty)
      serverRows.current = merged
      replaceState(rowsToState(merged, new Date().toISOString()))
    } catch {
      // a failed pull is not worth interrupting anyone: the next one will run
    }
  }, [replaceState])

  /**
   * Signing in again usually happens in this tab, which reloads and starts over.
   * But it can happen in another tab, and then this one would sit on "signed
   * out" forever with work queued behind it. So while signed out, quietly ask
   * every time the tab is looked at whether the session is back.
   */
  useEffect(() => {
    if (status !== "signed-out") return
    const recheck = async () => {
      if (document.visibilityState !== "visible") return
      const response = await fetch("/api/timetrack/sync?since=" + encodeURIComponent(cursor.current ?? new Date().toISOString()))
      if (response.status === 401) return
      setStatus("saving")
      void flush()
    }
    document.addEventListener("visibilitychange", () => void recheck())
    const timer = setInterval(() => void recheck(), 15_000)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", () => void recheck())
    }
  }, [status, flush])

  useEffect(() => {
    if (status === "local-only" || status === "starting" || status === "signed-out") return
    const timer = setInterval(() => void pull(), PULL_EVERY_MS)
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      void pull()
      void flush()
    }
    const onOnline = () => void flush()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onOnline)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onOnline)
    }
  }, [status, pull, flush])

  /**
   * Upload what this browser holds. `only` narrows it to chosen entries — the
   * projects, tags and settings they depend on go with them, because an entry
   * that arrives without its project is not the entry the user had.
   */
  const acceptImport = useCallback(
    (only?: string[]) => {
      if (!state || !userId.current) return
      const chosen =
        only && only.length < state.entries.length
          ? { ...state, entries: state.entries.filter((entry) => only.includes(entry.id)) }
          : state
      const rows = stateToRows(chosen, userId.current)
      pending.current = mergeChangeSets(pending.current, diffRows(null, rows, new Date().toISOString()).changed)
      savePending()
      setImportOffer(null)
      const count = chosen.entries.length
      pushToast(`Uploading ${count} ${count === 1 ? "entry" : "entries"} to your account…`)
      void flush()
    },
    [state, savePending, flush, pushToast],
  )

  /**
   * Send this browser's whole workspace up, whatever the server already has.
   * The way back from "Not now", and the repair for a device that has drifted.
   */
  const uploadEverything = useCallback(() => {
    if (!state || !userId.current) return
    const rows = stateToRows(state, userId.current)
    pending.current = mergeChangeSets(pending.current, diffRows(null, rows, new Date().toISOString()).changed)
    savePending()
    pushToast("Uploading this browser's copy to your account…")
    void flush()
  }, [state, savePending, flush, pushToast])

  const declineImport = useCallback(() => {
    setImportOffer(null)
    pushToast("Left alone. This browser's time stays here until you ask again.")
  }, [pushToast])

  return {
    status,
    pendingCount,
    importOffer,
    acceptImport,
    declineImport,
    uploadEverything,
    syncNow: flush,
    setState,
  }
}

export { SYNC_CURSOR_KEY }
