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
import { reconcileRunningEntries } from "../timetrackService"
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
/**
 * A request that is never answered used to hold `flushing` forever.
 *
 * `fetch` has no deadline of its own, so a connection that accepts and then
 * says nothing — a captive portal, a dead tunnel — left every later flush
 * returning at its first line, with the badge reading "Saving 3…" and nothing
 * in flight. Only a reload recovered. With a deadline it becomes an ordinary
 * failure, and the backoff below already knows what to do with those.
 */
const REQUEST_TIMEOUT_MS = 20_000

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
  /** set when a flush is asked for while one is already in the air */
  const flushAgain = useRef(false)
  /**
   * WHAT THIS DEVICE WROTE, AND WHEN — the guard against a stale answer.
   *
   * `pull` asks what changed since a cursor, and the server answers with rows
   * as they were when it read them. `mergeIncoming` takes the server's version
   * of every row except those still queued for upload, and compares nothing:
   * no timestamps, no versions. So a row that was queued, flushed and cleared
   * while the request was in the air is no longer protected, and the answer —
   * computed before the change — overwrites it.
   *
   * That is what "I had to press Stop twice" was. The timer stopped, the stop
   * went up, and the reply to a question asked a moment earlier put it back.
   * It was nearly invisible until the pull interval was repaired: pulls were
   * starved to roughly none while anybody was working, so fixing that turned a
   * dormant race into a daily one.
   *
   * Client clock only, and only ever compared with itself, so there is no skew
   * to get wrong.
   */
  const localWrites = useRef(new Map<string, number>())
  /**
   * Which pull is the current one.
   *
   * Nothing stopped two from being in flight at once — the tab-focus handler,
   * the sixty-second interval and coming back online can all ask, and a slow
   * answer outlives the next request. Two answers then applied in arrival
   * order, so the one computed FIRST could land LAST and put back what the
   * second had just replaced. Reproduced with two overlapping pulls: another
   * device's change was reverted by an answer written before it existed.
   *
   * A later request's answer is at least as fresh as an earlier one's, because
   * the cursor only moves when an answer is applied. So the newest request
   * wins and older answers are dropped unread.
   */
  const pullSeq = useRef(0)
  /** re-runs first contact after a failure; see the catch at the end of it */
  const firstContactRef = useRef<(() => Promise<void>) | null>(null)
  const firstContactDelay = useRef(RETRY_START_MS)

  latestState.current = state

  /**
   * THE STATUS, READABLE WITHOUT DEPENDING ON IT.
   *
   * Every flush sets `status` — "saving" on the way in, "offline"/"error"/
   * "signed-out" on the way out. Three effects below used to list `status` in
   * their dependencies, so each attempt tore them down and rebuilt them, which
   * meant the change-watcher re-armed its 800ms timer after every attempt and
   * the backoff never got to schedule anything. Measured in the product:
   * 25 POSTs in 20.0 seconds, gaps flat at ~850ms, while this file's own
   * backoff says 2s doubling to 60s.
   *
   * Assigned during render, like `latestState` above, so an effect that runs
   * later sees the current value without being re-created to get it.
   */
  const statusRef = useRef<SyncStatus>("starting")
  statusRef.current = status

  /**
   * The coarse signals effects MAY depend on: they change when the answer
   * actually changes, not on every attempt.
   */
  const syncActive = status !== "local-only" && status !== "starting" && status !== "signed-out"
  const signedOut = status === "signed-out"

  /** Forget any armed retry. `clearTimeout` alone leaves the handle truthy. */
  const clearRetry = useCallback(() => {
    if (retryAt.current) clearTimeout(retryAt.current)
    retryAt.current = null
  }, [])

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
    if (flushing.current) {
      // Something was queued while a request was in the air. That used to wait
      // for an unrelated edit: the request ends by setting the status it
      // already had, React bails, no effect re-runs, and the remainder sits
      // there with nothing in flight. Seen in the product: 21 rows, sixteen
      // seconds, badge reading "Saving 21…".
      flushAgain.current = true
      return
    }
    if (!userId.current) return
    if (countRows(pending.current) === 0) {
      setStatus("synced")
      return
    }
    flushing.current = true
    /**
     * Whether this attempt actually reached the server. The drain-again in
     * `finally` keys off THIS and not off the status, because the status ref is
     * written during render and a `return` inside this function happens long
     * before that — the first version of this guard read a stale "not signed
     * out" after a 401 and re-entered immediately, 19,201 times in a
     * twenty-second test. Caught by the test in the same commit.
     */
    let sent = false
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
        const abort = new AbortController()
        const deadline = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS)
        let response: Response
        try {
          response = await fetch("/api/timetrack/sync", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ rows: batch }),
            signal: abort.signal,
          })
        } finally {
          clearTimeout(deadline)
        }
        if (response.status === 401) {
          // The session ended while the tab was open. Retrying is pointless,
          // and the first version did it forever — sitting on "Saving 43…"
          // while the work went nowhere. Stop, say so, and keep every change
          // queued for after the next sign-in.
          setStatus("signed-out")
          clearRetry()
          return
        }
        if (!response.ok) {
          const failure = (await response.json().catch(() => ({}))) as { error?: string; ids?: string[] }
          const message = failure.error ?? response.statusText
          if (response.status >= 400 && response.status < 500) {
            /**
             * THE SERVER SAID THE ROWS ARE WRONG, NOT "TRY AGAIN LATER".
             *
             * Retrying those forever is what turned one mistyped end time into
             * an account that never saved again: the row was refused by a check
             * constraint, the queue drains all or nothing, and everything
             * behind it stayed in the browser while the badge promised it would
             * be sent. This file's neighbour records the same shape from a bad
             * workspace id, fixed only for that one cause.
             *
             * So: stop, keep the queue, and say what the server said — a
             * refusal the person can act on beats a spinner that never ends.
             */
            clearRetry()
            setStatus("error")
            /**
             * Name the entry, not the constraint. The server isolates which
             * rows it refused, so "Could not save “morning pages”" beats a
             * sentence about `timetrack_entries_stop_after_start` that nobody
             * can act on.
             */
            const named = (failure.ids ?? [])
              .map((id) => latestState.current?.entries.find((e) => e.id === id))
              .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
              .map((entry) => `“${entry.description.trim() || "(no description)"}”`)
            pushToast(
              named.length > 0
                ? `Your account refused ${named.join(", ")} and it has not been saved. Open it and check its times — an end before its start is the usual reason.`
                : `Your account refused a change and it has not been saved: ${message}. Nothing is lost — it is still in this browser. Reload to resync.`,
              "error",
            )
            return
          }
          throw new Error(message)
        }
      }
      // what we just sent is now what the server has
      serverRows.current = mergeIncoming(serverRows.current ?? emptyRows(), sending, new Set())
      // anything queued while that request was in the air stays queued
      pending.current = pending.current === queued ? {} : pending.current
      savePending()
      retryDelay.current = RETRY_START_MS
      clearRetry()
      sent = true
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
      /**
       * Whatever was queued while that request was in the air goes now, rather
       * than waiting for a status change that may never come. This is the work
       * the old 800ms re-arming loop was accidentally doing; it is done on
       * purpose here, once, instead of every 800ms forever.
       */
      const more = flushAgain.current || countRows(pending.current) > 0
      flushAgain.current = false
      if (sent && more && retryAt.current === null) {
        setTimeout(() => void flushRef.current?.(), 0)
      }
    }
  }, [clearRetry, pushToast, savePending])

  flushRef.current = flush

  useEffect(() => () => {
    if (retryAt.current) clearTimeout(retryAt.current)
    retryAt.current = null
  }, [])

  // --- first contact: who are we, and what does the server already have? ----
  useEffect(() => {
    if (!state || ready.current) return
    ready.current = true
    pending.current = readPending()
    setPendingCount(countRows(pending.current))
    // remember what was here before the server said anything
    startingState.current = state

    const attempt = async () => {
      try {
        const abort = new AbortController()
        const deadline = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS)
        let response: Response
        try {
          response = await fetch("/api/timetrack/sync", { signal: abort.signal })
        } finally {
          clearTimeout(deadline)
        }
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
          // than doing it behind their back. `latestState` rather than the
          // captured `state`, because this can run again after a failure and
          // the workspace may have moved on since the first try.
          const held = latestState.current ?? state
          const localRows = stateToRows(held, userId.current)
          serverRows.current = null
          adopted.current = true
          if (held.entries.length > 0 || held.projects.length > 0) {
            setImportOffer({
              entries: held.entries.length,
              projects: held.projects.length,
              items: held.entries
                .slice()
                .sort((a, b) => b.start.localeCompare(a.start))
                .map((entry) => ({
                  id: entry.id,
                  description: entry.description,
                  project: held.projects.find((p) => p.id === entry.projectId)?.name ?? null,
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
        const arrived = rowsToState(base, new Date().toISOString())
        const settled = reconcileRunningEntries(arrived)
        if (settled.stopped.length > 0) {
          pushToast(
            `Another device had a timer running too. The older one was stopped where this one started, so the same hour is not counted twice.`,
          )
        }
        const adoptedState = settled.state

        /**
         * IF THE SERVER HAS NOTHING YOU DO NOT ALREADY HAVE, DO NOT REDRAW.
         *
         * This used to replace the whole workspace unconditionally, which is the
         * common case done the expensive way: the usual outcome of opening the
         * tracker is that this device is already up to date. The replacement
         * swapped every object in the state, so every screen re-rendered and the
         * entry list was rebuilt from scratch — after first paint, so what you
         * were looking at flickered and settled a beat later. On a phone over
         * mobile data that beat is long enough to see, and it is the plainest
         * reading of "something weird with how it opens".
         *
         * Compared with `diffRows`, which is this slice's own definition of
         * whether two workspaces differ, rather than a new one invented here.
         * When there IS a difference the old path runs untouched: the server
         * wins, because that is the rule the rest of this file is built on.
         */
        const localRows = stateToRows(latestState.current ?? state, userId.current)
        const adoptedRows = stateToRows(adoptedState, userId.current)
        const nothingNew =
          diffRows(localRows, adoptedRows, new Date().toISOString()).count === 0

        if (nothingNew) {
          // The baseline is the round-tripped rows, not `body.rows`, for the same
          // reason the change-watcher below uses them: a mapping quirk must not
          // read as a local change on the very next tick.
          serverRows.current = adoptedRows
        } else {
          awaitingState.current = adoptedState
          replaceState(adoptedState)
        }
        adopted.current = true

        if (sinceOpening.count > 0) {
          pending.current = mergeChangeSets(pending.current, sinceOpening.changed)
          savePending()
        }
        setStatus("synced")
        void flush()
      } catch {
        /**
         * A SESSION THAT CANNOT SAY HELLO MUST KEEP TRYING.
         *
         * `ready` stops this effect running twice, and on failure nothing put
         * it back — so `userId` and `cursor` stayed unset, and with those unset
         * neither an upload nor a pull can even start. One flaky moment at open
         * left the tracker working locally and silently never syncing, with a
         * reload as the only way out. The badge says something is wrong; it
         * does not say it will stay wrong for ever.
         */
        setStatus(navigator.onLine ? "error" : "offline")
        const delay = firstContactDelay.current
        firstContactDelay.current = Math.min(delay * 2, RETRY_MAX_MS)
        setTimeout(() => void firstContactRef.current?.(), delay)
      }
    }

    firstContactRef.current = attempt
    void attempt()
  }, [state, replaceState, savePending, flush])

  // --- every local change becomes something to send -------------------------
  useEffect(() => {
    if (!state || !userId.current || statusRef.current === "local-only") return

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

    const writtenAt = Date.now()
    for (const key of keysIn(changed)) localWrites.current.set(key, writtenAt)
    if (localWrites.current.size > 2_000) {
      // a bounded memory: anything older than a few minutes cannot still be
      // racing a request that is in flight now
      const cutoff = writtenAt - 5 * 60_000
      for (const [key, at] of localWrites.current) if (at < cutoff) localWrites.current.delete(key)
    }

    /**
     * QUEUE AND RETURN WHEN SENDING IS POINTLESS.
     *
     * Two cases, both measured in the product before this existed:
     *
     *   - a retry is already armed, so the backoff owns the next attempt.
     *     Without this, typing while offline fires a request per word and each
     *     failure re-arms the next one 800ms later, which is how the flat
     *     ~850ms cadence outlived a backoff that says 2s → 60s.
     *   - the session has ended. The 401 branch above stops the retry and says
     *     so; this stops the schedule from starting it again. 23 POSTs in 20
     *     seconds, every one refused, in a file whose comment says it stopped
     *     doing exactly that.
     *
     * The work is not lost either way: it is in `pending`, on disk, and goes up
     * on the next success, on `online`, or when the tab is looked at again.
     */
    if (retryAt.current !== null || statusRef.current === "signed-out") return

    const timer = setTimeout(() => void flush(), 800)
    return () => clearTimeout(timer)
  }, [state, syncActive, savePending, flush])

  // --- ask for other devices' changes ---------------------------------------
  const pull = useCallback(async () => {
    if (!userId.current || !cursor.current) return
    // Everything this device writes from here on beats whatever comes back:
    // the answer was decided before those writes existed.
    const askedAt = Date.now()
    const mine = ++pullSeq.current
    try {
      const response = await fetch(`/api/timetrack/sync?since=${encodeURIComponent(cursor.current)}`)
      if (response.status === 401) {
        setStatus("signed-out")
        return
      }
      if (!response.ok) return
      const body = (await response.json()) as { rows: TimetrackRows; cursor: string }
      // A newer request has gone out while this one was in the air. Its answer
      // covers everything this one would have said, and applying this one
      // afterwards would undo it.
      if (mine !== pullSeq.current) return
      // and the cursor only ever moves forward, so a late answer cannot rewind
      // what the next request will ask for
      if (!cursor.current || body.cursor > cursor.current) cursor.current = body.cursor
      if (countRows(body.rows) === 0) return

      const dirty = keysIn(pending.current)
      for (const [key, at] of localWrites.current) if (at >= askedAt) dirty.add(key)
      const merged = mergeIncoming(serverRows.current ?? emptyRows(), body.rows, dirty)
      serverRows.current = merged
      const settled = reconcileRunningEntries(rowsToState(merged, new Date().toISOString()))

      /**
       * DO NOT REDRAW FOR AN ECHO OF YOUR OWN WRITES.
       *
       * A pull asks what changed since the cursor, and after this device
       * uploads anything, the answer contains that very row — so this used to
       * replace the whole workspace every time, swapping every object and
       * rebuilding the entry list for no change at all. Adoption already
       * refuses to do that; this is the same check, using the same definition
       * of "differs" rather than a new one.
       *
       * It is not only waste: a full redraw at the moment of a tap is a tap
       * that lands on a node that no longer exists.
       */
      const held = latestState.current
      const nothingNew =
        held !== null &&
        diffRows(stateToRows(held, userId.current), stateToRows(settled.state, userId.current), new Date().toISOString())
          .count === 0
      if (nothingNew && settled.stopped.length === 0) return

      if (settled.stopped.length > 0) {
        pushToast("Another device had a timer running too. The older one was stopped where this one started.")
      }
      replaceState(settled.state)
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
    if (!signedOut) return
    const recheck = async () => {
      if (document.visibilityState !== "visible") return
      try {
        const response = await fetch(
          "/api/timetrack/sync?since=" + encodeURIComponent(cursor.current ?? new Date().toISOString()),
        )
        if (response.status === 401) return
        setStatus("saving")
        void flush()
      } catch {
        // offline as well as signed out: nothing to do but wait for the next tick
      }
    }
    // A NAMED handler, because `removeEventListener` with a fresh arrow removes
    // nothing — this used to add one listener per run and never take one away.
    const onVisible = () => void recheck()
    document.addEventListener("visibilitychange", onVisible)
    const timer = setInterval(() => void recheck(), 15_000)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [signedOut, flush])

  /**
   * THE 60-SECOND PULL HAD TWO REASONS TO NEVER FIRE, AND ONLY ONE WAS `status`.
   *
   * `pull` is rebuilt whenever `replaceState` is — and `replaceState` comes
   * from a `useMemo` in `useTimetrack` whose dependencies include `state`. So
   * the interval below was torn down and recreated on every committed change,
   * and never reached sixty seconds while anybody was working. Measured in the
   * product: **1 pull in 75 seconds sitting still, 0 pulls in 80 seconds with
   * one real change every 5 seconds** — which is to say another device's
   * changes stopped arriving exactly when they mattered.
   *
   * The ref is the pattern `flushRef` above already uses: the effect depends on
   * whether syncing is on at all, and reads the current function when it fires.
   */
  const pullRef = useRef(pull)
  pullRef.current = pull

  useEffect(() => {
    if (!syncActive) return
    const timer = setInterval(() => void pullRef.current(), PULL_EVERY_MS)
    /**
     * Coming back is not a moment to wait out a backoff: the queue may be
     * sitting on a sixty-second timer from the last failure, and the person is
     * looking at the screen now.
     */
    const resume = () => {
      clearRetry()
      retryDelay.current = RETRY_START_MS
      void flushRef.current?.()
    }
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      void pullRef.current()
      resume()
    }
    const onOnline = () => resume()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onOnline)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onOnline)
    }
  }, [syncActive, clearRetry])

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
