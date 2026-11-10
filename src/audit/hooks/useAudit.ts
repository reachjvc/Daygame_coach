"use client"

/**
 * THE AUDIT PAGE'S STATE: one read, answers that show at once, and a queue
 * that sends them in the background (D-OFFLINE).
 *
 * An answer is drawn the moment Save is pressed, goes into the queue
 * (`auditQueue.ts`), and is sent after; with no signal it waits, marked
 * "saved on this phone". Starting, ending, muting and settings wait for the
 * server, because those are decisions, and a decision that silently did not
 * happen is worse than a spinner.
 *
 * THE PAGE REFUSES TO ACT ON A FAILED READ (.claude/rules/database.md): with
 * no read there are no buttons, only the error and a retry. One exception, for
 * no signal only: the page's last read on this phone is drawn, so a ping tapped
 * in a basement can still be answered (fast-audit-04). Answers are checked by
 * the server one by one when they are sent; nothing loaded is saved back.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { sendInChunks, browserStore } from "@/src/shared/offlineQueue"
import { AuditCallError, auditApi, type AuditView } from "../auditClient"
import {
  AUDIT_QUEUE_KEY,
  answersSent,
  cancelDelete,
  deleteIsDue,
  deleteRefused,
  deletesSeeStored,
  deletesSent,
  emptyAuditQueue,
  enqueueAnswers,
  unseenWaiting,
  enqueueDelete,
  nextDeleteDue,
  onAuditForgotten,
  pendingDeletes,
  queueIsEmpty,
  readAuditQueue,
  readAuditViewCopy,
  retryDelete,
  writeAuditQueue,
  writeAuditViewCopy,
  type AuditQueue,
} from "../auditQueue"
import { CHANGED_SINCE, markOf, type MuteOption, type ReviewChange } from "../auditService"
import type { AnswerMark, AuditAnswer, AuditSlot } from "../types"

/** An answer as drawn: from the server, or still only on this phone. */
export type DrawnSlot = AuditSlot & { pending: boolean }

/**
 * sent: nothing is stuck. offline: a send failed for want of signal. waiting:
 * the server did not take it (and may later). signed-out: sign in again.
 * Only "offline" may say "when you have signal" (alpha prove-audit-01).
 */
export type SendState = "sent" | "waiting" | "offline" | "signed-out"

const quarterKey = (s: { runId: string; slotAt: string }) => `${s.runId}:${s.slotAt}`

/**
 * WHAT THE SERVER HAS CONFIRMED BUT THE SCREEN'S LAST READ MAY NOT INCLUDE.
 *
 * An answer leaves the queue the moment the server confirms it; the next read
 * arrives a moment later (seconds on a weak signal). In between it must still
 * be drawn, or the row turns back into a grey gap, and a tap on it starts a
 * new answer over the saved one (phone audit, 2026-11-09). Each entry is
 * dropped by the first read that STARTED after its confirmation: that read
 * has it, or knows it was changed since.
 */
interface Confirmed {
  answers: { answer: AuditAnswer; at: number }[]
  deletes: { id: string; at: number }[]
}
const NONE: Confirmed = { answers: [], deletes: [] }

/**
 * AN ANSWER THE SERVER REFUSED FOR GOOD, SHOWN UNTIL HE HAS SEEN IT.
 *
 * Most often: this phone answered a quarter with no signal, another device
 * answered it after, and the newer answer stays ("Changed on another device
 * since"). It used to leave the queue with no word while the sheet still said
 * "Saved" (alpha test fast-audit-02).
 */
export interface NotKept {
  answer: AuditAnswer
  reason: string
  /**
   * The answer the quarter holds instead, when another device answered or
   * changed it since this one's card opened (alpha slow-pass-06): named, with
   * "Keep that one" / "Use mine". Null: it was deleted there.
   */
  stored?: AnswerMark | null
}

/**
 * A DELETE THE SERVER REFUSED: another device changed the answer after this
 * one drew it (alpha prove-audit-03), or the server refused it outright
 * (review of 81f325e9). Named, with "Delete anyway" / "Keep"; it stays in the
 * stored queue until he chooses, so a reload or Log Out still names it.
 */
export interface NotDeleted {
  id: string
  slotAt: string | null
  /** The answer as this device drew it, when known. */
  seen: AnswerMark | null
  reason: string
  /** What the answer is now, when another device changed it. */
  stored?: AnswerMark
}

/**
 * HOW OFTEN AN OPEN PAGE READS AGAIN, so an answer given on another device
 * shows here within a minute and is not answered over blindly (alpha test
 * fast-audit-03). Only while the page is on screen.
 */
export const REREAD_MS = 30_000
/** A focus, a visibility change or a tick this soon after a read started is the same read. */
export const REREAD_GAP_MS = 1_000

/** The queue's stored text, or null when there is none or storage is blocked. */
function rawQueue(): string | null {
  try {
    return browserStore()?.getItem(AUDIT_QUEUE_KEY) ?? null
  } catch {
    return null
  }
}

export function useAudit(account: string) {
  const api = useMemo(() => auditApi(account), [account])
  const [view, setView] = useState<AuditView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [queue, setQueue] = useState<AuditQueue>(emptyAuditQueue(account))
  const [sendState, setSendState] = useState<SendState>("sent")
  const [confirmed, setConfirmed] = useState<Confirmed>(NONE)
  const [notKept, setNotKept] = useState<NotKept[]>([])
  /** The send at the end of the next delete's Undo time (alpha prove-audit-01). */
  const deleteTimer = useRef<number | null>(null)
  const flushRef = useRef<() => void>(() => {})
  /** Off once the page is gone or its audit forgotten: no timer is armed after (review of 81f325e9). */
  const live = useRef(false)
  /** Send again when the next delete's Undo time ends; one timer at a time. */
  const armDeleteTimer = useCallback(() => {
    if (deleteTimer.current !== null) window.clearTimeout(deleteTimer.current)
    deleteTimer.current = null
    if (!live.current) return
    const due = nextDeleteDue(queueRef.current, Date.now())
    if (due !== null) deleteTimer.current = window.setTimeout(() => flushRef.current(), Math.max(0, due - Date.now()) + 50)
  }, [])
  /** The view drawn is this phone's last read, kept for no signal (fast-audit-04). */
  const [fromCopy, setFromCopy] = useState(false)
  const viewRef = useRef<AuditView | null>(null)
  const confirmedRef = useRef<Confirmed>(NONE)
  const setC = useCallback((next: Confirmed) => {
    confirmedRef.current = next
    setConfirmed(next)
  }, [])
  const queueRef = useRef(queue)
  const flushing = useRef(false)
  const flushAgain = useRef(false)
  const readsStarted = useRef(0)
  const readApplied = useRef(0)
  const readsInFlight = useRef(0)
  const lastReadStarted = useRef(0)

  /** The stored queue as this tab last saw it: anything else there now was written by another tab. */
  const seenRaw = useRef<string | null>(null)
  /**
   * Change the queue, starting from the queue as stored when another tab of
   * this account has written it since this tab last looked: two tabs with no
   * signal each wrote their own copy over the other's answer (alpha p9-saves-03).
   */
  const setQ = useCallback(
    (change: (q: AuditQueue) => AuditQueue) => {
      const fromOtherTab = rawQueue() !== seenRaw.current
      const base = fromOtherTab ? readAuditQueue(browserStore(), account) : queueRef.current
      const owned = { ...change(base), owner: account }
      queueRef.current = owned
      setQueue(owned)
      writeAuditQueue(browserStore(), owned)
      seenRaw.current = rawQueue()
    },
    [account],
  )

  /**
   * Read the page. An answer older than one already drawn is dropped. Returns
   * what was read (null when it failed or was overtaken), so a sheet opened
   * right after fills from Time as it is now (D-PREFILL, alpha fast-time-01).
   */
  const load = useCallback(async (): Promise<AuditView | null> => {
    const mine = ++readsStarted.current
    const started = Date.now()
    readsInFlight.current += 1
    lastReadStarted.current = started
    try {
      const fresh = await api.view().finally(() => {
        readsInFlight.current -= 1
      })
      if (mine < readApplied.current) return null
      readApplied.current = mine
      viewRef.current = fresh
      setView(fresh)
      setFromCopy(false)
      writeAuditViewCopy(browserStore(), account, fresh)
      // What this read includes no longer needs drawing from here.
      const c = confirmedRef.current
      setC({ answers: c.answers.filter((x) => x.at >= started), deletes: c.deletes.filter((x) => x.at >= started) })
      setLoadError(null)
      return fresh
    } catch (error) {
      if (mine < readApplied.current) return null
      // No signal and nothing on screen yet: draw this phone's last read, so
      // answers can still be given and wait in the queue (D-OFFLINE). Decisions
      // (start, end, mute, settings) still need the server and say so.
      if (!viewRef.current && error instanceof AuditCallError && error.status === 0) {
        const copy = readAuditViewCopy(browserStore(), account)
        if (copy) {
          viewRef.current = copy
          setView(copy)
          setFromCopy(true)
        }
      }
      setLoadError(error instanceof AuditCallError ? error.message : "Could not read your audit")
      return null
    }
  }, [api, account, setC])

  /** A newer refusal for a quarter replaces an older one. */
  const addNotKept = useCallback((lost: NotKept[]) => {
    const keys = new Set(lost.map((x) => quarterKey(x.answer)))
    setNotKept((prev) => [...prev.filter((x) => !keys.has(quarterKey(x.answer))), ...lost])
  }, [])

  /** Send the queue: answers in chunks of 200, then deletes. One flush at a time. */
  const flush = useCallback(async () => {
    if (flushing.current) {
      flushAgain.current = true
      return
    }
    flushing.current = true
    try {
      let stuck: { status: number } | null = null
      do {
        flushAgain.current = false
        // Answers the server says may pass later (a quarter its clock has not reached) stay queued.
        let later = new Set<string>()
        let storedNow: AuditAnswer[] = []
        stuck = await sendInChunks(
          queueRef.current.answers,
          async (batch) => {
            const answer = await api.save(batch)
            const refused = answer.refused ?? []
            later = new Set(refused.filter((r) => r.retry).map((r) => String(r.id)))
            const gone = new Set(refused.map((r) => String(r.id)))
            const lost = refused.flatMap((r) => {
              const answer = r.retry ? undefined : batch.find((a) => a.id === String(r.id))
              return answer ? [{ answer, reason: r.error, ...(r.stored !== undefined ? { stored: r.stored } : {}) }] : []
            })
            if (lost.length > 0) addNotKept(lost)
            const at = Date.now()
            storedNow = batch.filter((a) => !gone.has(a.id))
            const kept = storedNow.map((a) => ({ answer: a, at }))
            const c = confirmedRef.current
            setC({ ...c, answers: [...c.answers.filter((x) => !kept.some((k) => quarterKey(k.answer) === quarterKey(x.answer))), ...kept] })
          },
          {
            onSent: (batch) => setQ((q) => deletesSeeStored(answersSent(q, batch.filter((a) => !later.has(a.id)), storedNow), storedNow)),
            onDropped: (batch) => {
              addNotKept(batch.map((answer) => ({ answer, reason: "The server could not save it" })))
              setQ((q) => answersSent(q, batch))
            },
          },
        )
        // the server's clock has not reached that quarter: waiting, but not for signal
        if (!stuck && queueRef.current.answers.some((a) => later.has(a.id))) stuck = { status: -1 }
        if (!stuck) {
          for (const d of pendingDeletes(queueRef.current)) {
            // still in its "Undo" time: sent by the timer that ends it
            if (!deleteIsDue(d, Date.now())) continue
            const { id } = d
            try {
              // a delete queued before a save of the same answer was stored saw that one (deletesSeeStored)
              const current = queueRef.current.deletes.find((x) => x.id === id) ?? d
              const result = await api.remove(id, current.at, current.seen)
              const c = confirmedRef.current
              if (result.changed) {
                // another device changed it since: it stays, and he is asked (prove-audit-03)
                setQ((q) => deleteRefused(q, id, "Changed on another device", result.changed))
              } else {
                setC({ answers: c.answers.filter((x) => x.answer.id !== id), deletes: [...c.deletes, { id, at: Date.now() }] })
                setQ((q) => deletesSent(q, [id]))
              }
            } catch (error) {
              const e = error as AuditCallError
              // refused for good: named and kept until he chooses, never dropped in silence (review of 81f325e9)
              if (e instanceof AuditCallError && !e.retryable && e.status !== 401) setQ((q) => deleteRefused(q, id, e.message))
              else {
                stuck = { status: e instanceof AuditCallError ? e.status : 0 }
                break
              }
            }
          }
        }
      } while (flushAgain.current && !stuck)
      if (stuck) setSendState(stuck.status === 401 ? "signed-out" : stuck.status === 0 ? "offline" : "waiting")
      else {
        setSendState("sent")
        void load()
      }
    } finally {
      flushing.current = false
      // A delete still in its Undo time (also one stored before a reload) is
      // sent when that time ends, with the page left open (prove-audit-01).
      armDeleteTimer()
    }
  }, [api, load, setQ, setC, addNotKept, armDeleteTimer])
  useEffect(() => {
    flushRef.current = () => void flush()
  }, [flush])

  useEffect(() => {
    live.current = true
    // Log Out forgot this device's audit: nothing more is sent or written back from here.
    const stopForget = onAuditForgotten(() => {
      live.current = false
      if (deleteTimer.current !== null) window.clearTimeout(deleteTimer.current)
      deleteTimer.current = null
      const empty = emptyAuditQueue(account)
      queueRef.current = empty
      setQueue(empty)
    })
    const stored = readAuditQueue(browserStore(), account)
    seenRaw.current = rawQueue()
    queueRef.current = stored
    setQueue(stored)
    void load()
    if (!queueIsEmpty(stored)) void flush()
    const retry = () => {
      if (!queueIsEmpty(queueRef.current)) void flush()
    }
    // Coming back fires focus and visibilitychange together: one read, not two.
    const readSoon = () => {
      if (readsInFlight.current > 0 || Date.now() - lastReadStarted.current < REREAD_GAP_MS) return
      void load()
    }
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      retry()
      readSoon()
    }
    // Another tab of this account changed the queue: take its version, so two
    // tabs never overwrite each other's waiting answers (offline audit, 2026-11-09).
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUDIT_QUEUE_KEY) return
      const shared = readAuditQueue(browserStore(), account)
      seenRaw.current = rawQueue()
      queueRef.current = shared
      setQueue(shared)
    }
    // Another device may have answered meanwhile (fast-audit-03): read again on
    // focus, and every REREAD_MS while the page is on screen.
    const onFocus = () => readSoon()
    const every = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      // what failed to send is tried again too, not only on the next app switch
      retry()
      readSoon()
    }, REREAD_MS)
    window.addEventListener("online", retry)
    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      live.current = false
      stopForget()
      window.clearInterval(every)
      if (deleteTimer.current !== null) window.clearTimeout(deleteTimer.current)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("online", retry)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [account, load, flush])

  /** The answers to draw: the server's, with what waits on this phone on top, minus waiting deletes. */
  const slots: DrawnSlot[] = useMemo(() => {
    if (!view) return []
    const byQuarter = new Map<string, DrawnSlot>()
    // a refused delete hides nothing: the server still holds that answer
    const deleted = new Set([...pendingDeletes(queue).map((d) => d.id), ...confirmed.deletes.map((d) => d.id)])
    for (const s of view.slots) if (!deleted.has(s.id)) byQuarter.set(quarterKey(s), { ...s, pending: false })
    for (const { answer } of confirmed.answers) if (!deleted.has(answer.id)) byQuarter.set(quarterKey(answer), { ...answer, pending: false })
    for (const a of queue.answers) byQuarter.set(quarterKey(a), { ...a, pending: true })
    return [...byQuarter.values()].sort((x, y) => x.slotAt.localeCompare(y.slotAt))
  }, [view, queue, confirmed])

  const answer = useCallback(
    (answers: AuditAnswer[]) => {
      if (answers.length === 0) return
      // Answered again: an earlier "not kept" for these quarters is over.
      const keys = new Set(answers.map(quarterKey))
      setNotKept((prev) => (prev.some((x) => keys.has(quarterKey(x.answer))) ? prev.filter((x) => !keys.has(quarterKey(x.answer))) : prev))
      // A quarter whose answer is being deleted (in its Undo time, or waiting
      // for signal) is drawn empty, but the server still holds that answer
      // until the delete is sent, after the answers: a card opened on it saw it.
      const deleting = new Set(pendingDeletes(queueRef.current).map((d) => d.id))
      const hidden = new Map((viewRef.current?.slots ?? []).filter((sl) => deleting.has(sl.id)).map((sl) => [quarterKey(sl), sl]))
      const seen = answers.map((a) => {
        const h = a.was === null ? hidden.get(quarterKey(a)) : undefined
        return h ? { ...a, was: markOf(h) } : a
      })
      // A waiting answer (another tab's) this card never saw is not replaced
      // blindly: he is asked, as for another device (alpha p9-saves-03).
      let unseen: ReturnType<typeof unseenWaiting> = []
      setQ((q) => {
        unseen = unseenWaiting(q, seen)
        const told = new Set(unseen.map((x) => x.answer))
        return enqueueAnswers(q, seen.filter((a) => !told.has(a)))
      })
      if (unseen.length > 0) addNotKept(unseen.map((x) => ({ answer: x.answer, reason: CHANGED_SINCE, stored: x.stored })))
      void flush()
    },
    [flush, setQ, addNotKept],
  )

  /** "Keep that one": the other device's answer stays, and this one's refusal is over. */
  const keepStored = useCallback((answers: readonly AuditAnswer[]) => {
    const keys = new Set(answers.map(quarterKey))
    setNotKept((prev) => prev.filter((x) => !keys.has(quarterKey(x.answer))))
  }, [])

  /**
   * Delete an answer. With `holdMs`, the delete is stored at once (stamped
   * with the tap) but sent only after that long, so Undo can take it back.
   * `seen`: the answer as drawn, so the server deletes only that one.
   */
  const remove = useCallback(
    (id: string, holdMs = 0, seen?: AnswerMark & { slotAt?: string }) => {
      const now = Date.now()
      setQ((q) => enqueueDelete(q, id, new Date(now).toISOString(), holdMs > 0 ? new Date(now + holdMs).toISOString() : undefined, seen))
      if (holdMs > 0) armDeleteTimer()
      else void flush()
    },
    [flush, setQ, armDeleteTimer],
  )
  /** "Delete anyway" / "Try again": sent now, over the answer as another device left it. */
  const deleteAnyway = useCallback(
    (x: NotDeleted) => {
      setQ((q) => retryDelete(q, x.id))
      void flush()
    },
    [flush, setQ],
  )
  /** "Keep": the answer stays, and the refused delete is over. */
  const keepNotDeleted = useCallback((id: string) => setQ((q) => deletesSent(q, [id])), [setQ])
  const notDeleted: NotDeleted[] = useMemo(
    () =>
      queue.deletes.flatMap((d) =>
        d.refused ? [{ id: d.id, slotAt: d.slotAt ?? null, seen: d.seen ?? null, reason: d.refused.reason, ...(d.refused.stored ? { stored: d.refused.stored } : {}) }] : [],
      ),
    [queue],
  )
  const undoRemove = useCallback((id: string) => setQ((q) => cancelDelete(q, id)), [setQ])

  /** A decision: waits for the server, then re-reads. Returns the error sentence, or null. */
  const decide = useCallback(
    async (call: () => Promise<unknown>): Promise<string | null> => {
      try {
        await call()
        await load()
        return null
      } catch (error) {
        return error instanceof AuditCallError ? error.message : "Something went wrong"
      }
    },
    [load],
  )

  const runId = view?.run?.id ?? null
  // Stable, so a screen can depend on them without re-reading on every render
  // (the review re-read itself on every parent render: code review, 2026-11-09).
  const readRun = useCallback((id: string) => api.view(id), [api])
  const changeReview = useCallback((id: string, change: ReviewChange) => decide(() => api.changeReview(id, change)), [api, decide])
  return {
    view,
    loadError,
    slots,
    sendState,
    // a delete still in its Undo time is not "waiting for signal"
    waiting: queue.answers.length + pendingDeletes(queue).filter((d) => deleteIsDue(d, Date.now())).length,
    reload: load,
    fromCopy,
    notKept,
    dismissNotKept: () => setNotKept([]),
    notDeleted,
    deleteAnyway,
    keepNotDeleted,
    setZone: (timezone: string) => decide(() => api.zone(timezone)),
    answer,
    keepStored,
    remove,
    undoRemove,
    start: () => decide(() => api.start(crypto.randomUUID())),
    end: () => (runId ? decide(() => api.end(runId)) : Promise.resolve("No audit is running")),
    mute: (option: MuteOption) => (runId ? decide(() => api.mute(runId, option)) : Promise.resolve("No audit is running")),
    setQuiet: (start: number, end: number) => (runId ? decide(() => api.quiet(runId, start, end)) : Promise.resolve("No audit is running")),
    changeReview,
    readRun,
  }
}

export type AuditState = ReturnType<typeof useAudit>
