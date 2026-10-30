"use client"

/**
 * THE THOUGHTS PAGE'S STATE: one read, instant taps, and a queue that sends
 * in the background.
 *
 * A tap must feel done the moment the finger lifts (Plans/thought.md, "The
 * habit": about three seconds from reminder to logged). So a tap changes the
 * screen first, goes into the queue (src/thoughts/logQueue.ts), and is sent
 * after; a failed send leaves it queued and marked "saved on this phone".
 * Everything that is not a tap — rewording, merging, deleting, reframes,
 * settings — waits for the server, because those are the person deciding
 * something, and a decision that silently did not happen is worse than a
 * spinner.
 *
 * THE PAGE REFUSES TO ACT ON A FAILED READ (.claude/rules/database.md): with
 * no read there are no buttons, only the error and a retry — except with no
 * connection at all, when it draws this person's last copy, marked as one.
 *
 * WHOSE PHONE. The account is read from the session this browser holds (no
 * network needed), and the queue and the page copy are only ever this
 * account's (logQueue.ts). Until it is known, nothing is sent.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createBrowserSupabaseClient } from "@/src/db/supabase-client"
import {
  browserStore,
  emptyQueue,
  enqueueLog,
  enqueueThought,
  isEmpty,
  logsAnswered,
  pendingByThought,
  readQueue,
  readViewCopy,
  saveViewCopy,
  thoughtRefused,
  thoughtStored,
  undoLog,
  undosAnswered,
  writeQueue,
  type QueueState,
} from "../logQueue"
import { bumpCounts, drawnThoughts } from "../pending"
import { ThoughtsCallError, thoughtsApi } from "../thoughtsClient"
import { normalizeThought, type ReframeInput } from "../thoughtsService"
import type { LogInput, LogSource, Reframe, Thought, ThoughtSettings, ThoughtsView } from "../types"

export interface LoggedNotice {
  logId: string
  thoughtId: string | null
  text: string
  today: number
  reframe: string | null
  /** Bumped each time, so the same thought tapped twice restarts the notice. */
  seq: number
}

/** Why the queue is not empty, for the line under the buttons. */
export type SendState = "sent" | "waiting" | "signed-out"

const REFRESH_AFTER_MS = 1500
/** The log route takes at most 500; smaller sends finish sooner on a weak signal. */
const SEND_AT_MOST = 200

/**
 * WHAT THE SERVER HAS CONFIRMED BUT THE SCREEN'S LAST READ MAY NOT INCLUDE.
 *
 * A tap leaves the queue the moment the server confirms it, and the next read
 * of the page arrives a moment later. In between it is still drawn, from
 * here, so a count never falls back by one under a notice that says it went
 * up. The read says which taps it includes (`recentLogIds`, read before its
 * counts), and those are never drawn on top (`drawnThoughts`). Only taps the
 * server NEWLY stored are kept here; a resent one was already counted.
 *
 * Two earlier versions guessed on this side instead — adding a confirmed tap
 * straight into the counts, then dropping it at the first read the phone had
 * started after the confirmation — and both drew some taps twice for seconds
 * under load: a read can leave the phone before a confirmation arrives and
 * still reach the database after the write.
 */
interface Confirmed {
  /**
   * `at` is when this phone got the confirmation. Any read that started later
   * has the thought — or knows it was merged or deleted since — so it goes.
   */
  thoughts: { id: string; text: string; at: number }[]
  logs: LogInput[]
}

const NONE: Confirmed = { thoughts: [], logs: [] }

function newId(): string {
  return crypto.randomUUID()
}

/** The signed-in account as this browser's session says, without the network. */
async function localUserId(): Promise<string | null> {
  try {
    const { data } = await createBrowserSupabaseClient().auth.getSession()
    return data.session?.user.id ?? null
  } catch {
    return null
  }
}

export function useThoughts() {
  const [view, setView] = useState<ThoughtsView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueState>(emptyQueue(null))
  const [confirmed, setConfirmed] = useState<Confirmed>(NONE)
  const [notice, setNotice] = useState<LoggedNotice | null>(null)
  const [sendState, setSendState] = useState<SendState>("sent")
  /** When the page is drawn from this phone's copy (no connection), the copy's time. */
  const [fromCopy, setFromCopy] = useState<string | null>(null)

  const owner = useRef<string | null>(null)
  const queueRef = useRef(queue)
  const confirmedRef = useRef<Confirmed>(NONE)
  const flushing = useRef(false)
  const flushAgain = useRef(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)
  const readsStarted = useRef(0)
  const readApplied = useRef(0)

  const setQ = useCallback((next: QueueState) => {
    const owned = { ...next, owner: owner.current }
    queueRef.current = owned
    setQueue(owned)
    writeQueue(browserStore(), owned)
  }, [])

  const setC = useCallback((next: Confirmed) => {
    confirmedRef.current = next
    setConfirmed(next)
  }, [])

  /**
   * Read the page. Reads can overlap (a refresh, the page coming back into
   * view); an answer older than one already drawn is dropped, never drawn
   * over a newer one.
   */
  const load = useCallback(async () => {
    const mine = ++readsStarted.current
    const started = Date.now()
    try {
      const fresh = await thoughtsApi.view()
      if (mine < readApplied.current) return
      readApplied.current = mine
      setView(fresh)
      setFromCopy(null)
      if (owner.current) saveViewCopy(browserStore(), fresh, new Date(), owner.current)
      // Confirmed entries this read includes are no longer needed.
      const named = new Set(fresh.recentLogIds)
      const c = confirmedRef.current
      setC({
        thoughts: c.thoughts.filter((t) => t.at >= started && !fresh.thoughts.some((x) => x.id === t.id)),
        logs: c.logs.filter((l) => !named.has(l.id)),
      })
      setLoadError(null)
    } catch (error) {
      // No connection, and nothing drawn yet: draw this person's last copy, marked as one.
      if (error instanceof ThoughtsCallError && error.status === 0 && readApplied.current === 0 && owner.current) {
        const copy = readViewCopy<ThoughtsView>(browserStore(), owner.current)
        if (copy) {
          setView((v) => v ?? copy.view)
          setFromCopy(copy.at)
          return
        }
      }
      setLoadError(error instanceof ThoughtsCallError ? error.message : "Could not read your thoughts")
    }
  }, [setC])

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => void load(), REFRESH_AFTER_MS)
  }, [load])

  /**
   * Send the queue: new thoughts first (a log needs its thought's row), then
   * the logs in chunks, then queued removals. One flush at a time; a flush
   * asked for while one runs runs again after it.
   *
   * WHAT A REFUSAL DOES. No connection or a 5xx: it stays queued. Signed out
   * (401): it stays queued too — it is still this person's phone until they
   * sign out here. Any other 4xx can never succeed, so only what it was about
   * is dropped. A thought that cannot be sent yet holds back only its own
   * taps: every other tap still goes.
   */
  const flush = useCallback(async () => {
    if (!owner.current) return
    if (flushing.current) {
      flushAgain.current = true
      return
    }
    flushing.current = true
    let stuck: ThoughtsCallError | null = null
    /** True when the refusal is for good; otherwise remembers why sending stopped. */
    const refusedForGood = (error: unknown): boolean => {
      if (error instanceof ThoughtsCallError && !error.retryable && error.status !== 401) return true
      stuck ??= error instanceof ThoughtsCallError ? error : new ThoughtsCallError("Could not send", 0, true)
      return false
    }
    try {
      do {
        flushAgain.current = false
        const waiting = new Set<string>()
        for (const t of queueRef.current.thoughts) {
          try {
            const { id } = await thoughtsApi.create(t.id, t.text)
            setC({ ...confirmedRef.current, thoughts: [...confirmedRef.current.thoughts, { id, text: t.text, at: Date.now() }] })
            setQ(thoughtStored(queueRef.current, t.id, id))
          } catch (error) {
            if (refusedForGood(error)) setQ(thoughtRefused(queueRef.current, t.id))
            else waiting.add(t.id)
          }
        }

        const ready = queueRef.current.logs.filter((l) => l.thoughtId === null || !waiting.has(l.thoughtId))
        for (let i = 0; i < ready.length; i += SEND_AT_MOST) {
          const batch = ready.slice(i, i + SEND_AT_MOST)
          try {
            const answer = await thoughtsApi.log(batch)
            const fresh = new Set(answer.inserted)
            const undone = new Set(queueRef.current.undos)
            const kept = batch.filter((l) => fresh.has(l.id) && !undone.has(l.id))
            setC({ ...confirmedRef.current, logs: [...confirmedRef.current.logs, ...kept] })
            setQ(logsAnswered(queueRef.current, batch.map((l) => l.id)))
          } catch (error) {
            if (refusedForGood(error)) setQ(logsAnswered(queueRef.current, batch.map((l) => l.id)))
            else break
          }
        }

        // Removals go last, after any send of the same tap: a DELETE that
        // overtook its own insert would leave the tap stored.
        for (const id of queueRef.current.undos) {
          try {
            await thoughtsApi.undo(id)
            setQ(undosAnswered(queueRef.current, [id]))
          } catch (error) {
            if (refusedForGood(error)) setQ(undosAnswered(queueRef.current, [id]))
            else break
          }
        }
      } while (flushAgain.current && !stuck)
      const why = stuck as ThoughtsCallError | null
      if (why) {
        setSendState(why.status === 401 ? "signed-out" : "waiting")
      } else {
        setSendState("sent")
        scheduleRefresh()
      }
    } finally {
      flushing.current = false
    }
  }, [scheduleRefresh, setQ, setC])

  useEffect(() => {
    let alive = true
    void (async () => {
      const me = await localUserId()
      if (!alive) return
      owner.current = me
      const stored = me ? readQueue(browserStore(), me) : emptyQueue(null)
      queueRef.current = stored
      setQueue(stored)
      void load()
      if (!isEmpty(stored)) void flush()
    })()

    const retry = () => {
      if (!isEmpty(queueRef.current)) void flush()
    }
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      retry()
      void load()
    }
    window.addEventListener("online", retry)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      alive = false
      window.removeEventListener("online", retry)
      document.removeEventListener("visibilitychange", onVisible)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [load, flush])

  const timezone = view?.timezone ?? "UTC"

  const thoughts: Thought[] = useMemo(
    () => (view ? drawnThoughts(view, queue, confirmed, new Date(), timezone) : []),
    [view, queue, confirmed, timezone],
  )
  const pending = useMemo(() => pendingByThought(queue), [queue])

  /** Queue one log and show the "logged" notice. `known` is the thought as drawn, if it is drawn yet. */
  const record = useCallback(
    (thoughtId: string | null, label: string, known: Thought | null, source: LogSource, promptId: string | null) => {
      const at = new Date().toISOString()
      const entry = { id: newId(), thoughtId, at, source, promptId }
      setQ(enqueueLog(queueRef.current, entry))
      try {
        navigator.vibrate?.(12)
      } catch {
        // Not every browser lets a page vibrate; the screen confirms anyway.
      }
      seq.current += 1
      setNotice({
        logId: entry.id,
        thoughtId,
        text: label,
        today: thoughtId === null ? 0 : known ? bumpCounts(known.counts, at, new Date(), timezone).today : 1,
        reframe: known?.reframe?.text ?? null,
        seq: seq.current,
      })
      void flush()
      return entry.id
    },
    [flush, setQ, timezone],
  )

  const log = useCallback(
    (thought: Thought, source: LogSource = "tap", promptId: string | null = null) =>
      record(thought.id, thought.text, thought, source, promptId),
    [record],
  )

  const nothingNotable = useCallback(
    (promptId: string) => record(null, "Nothing notable", null, "prompt", promptId),
    [record],
  )

  /** A typed thought: an existing one with the same words is logged instead of a copy being made. */
  const logText = useCallback(
    (text: string, source: LogSource = "typed", promptId: string | null = null) => {
      const norm = normalizeThought(text)
      if (!norm) return null
      const existing = thoughts.find((t) => normalizeThought(t.text) === norm)
      if (existing) return record(existing.id, existing.text, existing, source, promptId)
      const id = newId()
      const clean = text.replace(/\s+/g, " ").trim()
      setQ(enqueueThought(queueRef.current, { id, text: clean }))
      return record(id, clean, null, source, promptId)
    },
    [record, setQ, thoughts],
  )

  /**
   * Undo one tap. It may be only on this phone, already on the server, or —
   * after a send that timed out — either; so it leaves the queue and its
   * removal is queued, and a DELETE is idempotent whichever was true.
   */
  const undo = useCallback(
    (target: LoggedNotice) => {
      setNotice((n) => (n?.logId === target.logId ? null : n))
      const c = confirmedRef.current
      if (c.logs.some((l) => l.id === target.logId)) setC({ ...c, logs: c.logs.filter((l) => l.id !== target.logId) })
      else if (view?.recentLogIds.includes(target.logId) && target.thoughtId) {
        // Already in the last read's counts: take one off them until the next read.
        setView((v) =>
          v
            ? {
                ...v,
                thoughts: v.thoughts.map((t) =>
                  t.id === target.thoughtId ? { ...t, counts: bumpCounts(t.counts, new Date().toISOString(), new Date(), v.timezone, -1) } : t,
                ),
              }
            : v,
        )
      }
      setQ(undoLog(queueRef.current, target.logId))
      void flush()
    },
    [flush, setC, setQ, view],
  )

  /** Changes that are decisions: wait for the server, then re-read. */
  const decide = useCallback(
    async <T,>(run: () => Promise<T>): Promise<T> => {
      const result = await run()
      await load()
      return result
    },
    [load],
  )

  return {
    view,
    loadError,
    fromCopy,
    reload: load,
    thoughts,
    timezone,
    settings: view?.settings ?? null,
    pending,
    queued: queue.logs.length + queue.thoughts.length,
    sendState,
    notice,
    dismissNotice: useCallback(() => setNotice(null), []),
    log,
    logText,
    nothingNotable,
    undo,
    update: (id: string, patch: { text?: string; pinned?: boolean; archived?: boolean }) =>
      decide(() => thoughtsApi.update(id, patch)),
    merge: (id: string, into: string) => decide(() => thoughtsApi.merge(id, into)),
    remove: (id: string) => decide(() => thoughtsApi.remove(id)),
    reframes: (id: string): Promise<Reframe[]> => thoughtsApi.reframes(id).then((r) => r.reframes),
    saveReframe: (input: Omit<ReframeInput, "id"> & { id?: string }) =>
      decide(() => thoughtsApi.saveReframe({ ...input, id: input.id ?? newId() })),
    saveSettings: (settings: ThoughtSettings) => decide(() => thoughtsApi.saveSettings(settings)),
  }
}

export type ThoughtsState = ReturnType<typeof useThoughts>
