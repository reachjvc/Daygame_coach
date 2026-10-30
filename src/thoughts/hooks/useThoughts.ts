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
 * no view there are no buttons, only the error and a retry.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  browserStore,
  dropLog,
  enqueueLog,
  enqueueThought,
  logsAnswered,
  pendingByThought,
  readQueue,
  thoughtStored,
  writeQueue,
  type QueueState,
} from "../logQueue"
import { bumpCounts, settleLogs, settleThought, withPending } from "../pending"
import { ThoughtsCallError, thoughtsApi } from "../thoughtsClient"
import { normalizeThought, type ReframeInput } from "../thoughtsService"
import type { LogSource, Reframe, Thought, ThoughtSettings, ThoughtsView } from "../types"

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

function newId(): string {
  return crypto.randomUUID()
}

export function useThoughts() {
  const [view, setView] = useState<ThoughtsView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueState>({ thoughts: [], logs: [] })
  const [notice, setNotice] = useState<LoggedNotice | null>(null)
  const [sendState, setSendState] = useState<SendState>("sent")

  const queueRef = useRef(queue)
  const flushing = useRef(false)
  const flushAgain = useRef(false)
  const cancelled = useRef(new Set<string>())
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)

  const setQ = useCallback((next: QueueState) => {
    queueRef.current = next
    setQueue(next)
    writeQueue(browserStore(), next)
  }, [])

  const load = useCallback(async () => {
    try {
      const fresh = await thoughtsApi.view()
      setView(fresh)
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof ThoughtsCallError ? error.message : "Could not read your thoughts")
    }
  }, [])

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => void load(), REFRESH_AFTER_MS)
  }, [load])

  /**
   * Send the queue: new thoughts first (a log needs its thought's row), then
   * every log in one call. One flush at a time; a flush asked for while one
   * runs runs again after it.
   *
   * WHAT A REFUSAL DOES. No connection or a 5xx: everything stays queued.
   * Signed out (401): everything stays queued too — it is still this person's
   * phone until they sign out here, and signing back in sends it. Any other
   * 4xx can never succeed, so only the item it was about is dropped: one bad
   * entry must not hold every later tap hostage.
   */
  const flush = useCallback(async () => {
    if (flushing.current) {
      flushAgain.current = true
      return
    }
    flushing.current = true
    try {
      do {
        flushAgain.current = false
        for (const t of queueRef.current.thoughts) {
          try {
            const { id } = await thoughtsApi.create(t.id, t.text)
            setView((v) => (v ? { ...v, thoughts: settleThought(v.thoughts, id, t.text, new Date()) } : v))
            setQ(thoughtStored(queueRef.current, t.id, id))
          } catch (error) {
            if (!(error instanceof ThoughtsCallError) || error.retryable || error.status === 401) throw error
            setQ({
              thoughts: queueRef.current.thoughts.filter((x) => x.id !== t.id),
              logs: queueRef.current.logs.filter((l) => l.thoughtId !== t.id),
            })
          }
        }
        const batch = queueRef.current.logs
        if (batch.length > 0) {
          try {
            await thoughtsApi.log(batch)
          } catch (error) {
            if (!(error instanceof ThoughtsCallError) || error.retryable || error.status === 401) throw error
          }
          setView((v) => (v ? { ...v, thoughts: settleLogs(v.thoughts, batch, new Date(), v.timezone) } : v))
          setQ(logsAnswered(queueRef.current, batch.map((l) => l.id)))
          // Undone while it was on its way: it may have landed, so take it back out.
          for (const l of batch) {
            if (cancelled.current.delete(l.id)) await thoughtsApi.undo(l.id).catch(() => undefined)
          }
        }
      } while (flushAgain.current)
      setSendState("sent")
      scheduleRefresh()
    } catch (error) {
      setSendState(error instanceof ThoughtsCallError && error.status === 401 ? "signed-out" : "waiting")
    } finally {
      flushing.current = false
    }
  }, [scheduleRefresh, setQ])

  useEffect(() => {
    const stored = readQueue(browserStore())
    queueRef.current = stored
    setQueue(stored)
    void load()
    if (stored.thoughts.length > 0 || stored.logs.length > 0) void flush()

    const retry = () => {
      if (queueRef.current.thoughts.length > 0 || queueRef.current.logs.length > 0) void flush()
    }
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      retry()
      void load()
    }
    window.addEventListener("online", retry)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("online", retry)
      document.removeEventListener("visibilitychange", onVisible)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [load, flush])

  const timezone = view?.timezone ?? "UTC"

  /** What the screen draws: the server's thoughts with this phone's queue on top. */
  const thoughts: Thought[] = useMemo(
    () => (view ? withPending(view.thoughts, queue, new Date(), timezone) : []),
    [view, queue, timezone],
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
      setQ(enqueueThought(queueRef.current, { id, text: text.replace(/\s+/g, " ").trim() }))
      return record(id, text.replace(/\s+/g, " ").trim(), null, source, promptId)
    },
    [record, setQ, thoughts],
  )

  const undo = useCallback(
    async (target: LoggedNotice) => {
      setNotice((n) => (n?.logId === target.logId ? null : n))
      if (queueRef.current.logs.some((l) => l.id === target.logId)) {
        if (flushing.current) cancelled.current.add(target.logId)
        setQ(dropLog(queueRef.current, target.logId))
        return
      }
      // Already sent: take one off the screen now, then ask the server.
      setView((v) =>
        v && target.thoughtId
          ? {
              ...v,
              thoughts: v.thoughts.map((t) =>
                t.id === target.thoughtId
                  ? { ...t, counts: bumpCounts(t.counts, new Date().toISOString(), new Date(), v.timezone, -1) }
                  : t,
              ),
            }
          : v,
      )
      await thoughtsApi.undo(target.logId).catch(() => undefined)
      scheduleRefresh()
    },
    [scheduleRefresh, setQ],
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
