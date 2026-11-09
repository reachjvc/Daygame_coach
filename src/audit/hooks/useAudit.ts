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
 * no read there are no buttons, only the error and a retry.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { sendInChunks, browserStore } from "@/src/shared/offlineQueue"
import { AuditCallError, auditApi, type AuditView } from "../auditClient"
import {
  AUDIT_QUEUE_KEY,
  answersSent,
  deletesSent,
  emptyAuditQueue,
  enqueueAnswers,
  enqueueDelete,
  queueIsEmpty,
  readAuditQueue,
  writeAuditQueue,
  type AuditQueue,
} from "../auditQueue"
import type { MuteOption } from "../auditService"
import type { AuditAnswer, AuditSlot, Review } from "../types"

/** An answer as drawn: from the server, or still only on this phone. */
export type DrawnSlot = AuditSlot & { pending: boolean }

export type SendState = "sent" | "waiting" | "signed-out"

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

export function useAudit(account: string) {
  const api = useMemo(() => auditApi(account), [account])
  const [view, setView] = useState<AuditView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [queue, setQueue] = useState<AuditQueue>(emptyAuditQueue(account))
  const [sendState, setSendState] = useState<SendState>("sent")
  const [confirmed, setConfirmed] = useState<Confirmed>(NONE)
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

  const setQ = useCallback(
    (next: AuditQueue) => {
      const owned = { ...next, owner: account }
      queueRef.current = owned
      setQueue(owned)
      writeAuditQueue(browserStore(), owned)
    },
    [account],
  )

  /** Read the page. An answer older than one already drawn is dropped. */
  const load = useCallback(async () => {
    const mine = ++readsStarted.current
    const started = Date.now()
    try {
      const fresh = await api.view()
      if (mine < readApplied.current) return
      readApplied.current = mine
      setView(fresh)
      // What this read includes no longer needs drawing from here.
      const c = confirmedRef.current
      setC({ answers: c.answers.filter((x) => x.at >= started), deletes: c.deletes.filter((x) => x.at >= started) })
      setLoadError(null)
    } catch (error) {
      if (mine < readApplied.current) return
      setLoadError(error instanceof AuditCallError ? error.message : "Could not read your audit")
    }
  }, [api, setC])

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
        stuck = await sendInChunks(
          queueRef.current.answers,
          async (batch) => {
            const answer = await api.save(batch)
            const refused = answer.refused ?? []
            later = new Set(refused.filter((r) => r.retry).map((r) => String(r.id)))
            const gone = new Set(refused.map((r) => String(r.id)))
            const at = Date.now()
            const kept = batch.filter((a) => !gone.has(a.id)).map((a) => ({ answer: a, at }))
            const c = confirmedRef.current
            setC({ ...c, answers: [...c.answers.filter((x) => !kept.some((k) => quarterKey(k.answer) === quarterKey(x.answer))), ...kept] })
          },
          {
            onSent: (batch) => setQ(answersSent(queueRef.current, batch.filter((a) => !later.has(a.id)))),
            onDropped: (batch) => setQ(answersSent(queueRef.current, batch)),
          },
        )
        if (!stuck && queueRef.current.answers.some((a) => later.has(a.id))) stuck = { status: 0 }
        if (!stuck) {
          for (const { id, at: deletedAt } of queueRef.current.deletes) {
            try {
              await api.remove(id, deletedAt)
              const c = confirmedRef.current
              setC({ answers: c.answers.filter((x) => x.answer.id !== id), deletes: [...c.deletes, { id, at: Date.now() }] })
              setQ(deletesSent(queueRef.current, [id]))
            } catch (error) {
              const e = error as AuditCallError
              if (e instanceof AuditCallError && !e.retryable && e.status !== 401) setQ(deletesSent(queueRef.current, [id]))
              else {
                stuck = { status: e instanceof AuditCallError ? e.status : 0 }
                break
              }
            }
          }
        }
      } while (flushAgain.current && !stuck)
      if (stuck) setSendState(stuck.status === 401 ? "signed-out" : "waiting")
      else {
        setSendState("sent")
        void load()
      }
    } finally {
      flushing.current = false
    }
  }, [api, load, setQ, setC])

  useEffect(() => {
    const stored = readAuditQueue(browserStore(), account)
    queueRef.current = stored
    setQueue(stored)
    void load()
    if (!queueIsEmpty(stored)) void flush()
    const retry = () => {
      if (!queueIsEmpty(queueRef.current)) void flush()
    }
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      retry()
      void load()
    }
    // Another tab of this account changed the queue: take its version, so two
    // tabs never overwrite each other's waiting answers (offline audit, 2026-11-09).
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUDIT_QUEUE_KEY) return
      const shared = readAuditQueue(browserStore(), account)
      queueRef.current = shared
      setQueue(shared)
    }
    window.addEventListener("online", retry)
    window.addEventListener("storage", onStorage)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("online", retry)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [account, load, flush])

  /** The answers to draw: the server's, with what waits on this phone on top, minus waiting deletes. */
  const slots: DrawnSlot[] = useMemo(() => {
    if (!view) return []
    const byQuarter = new Map<string, DrawnSlot>()
    const deleted = new Set([...queue.deletes.map((d) => d.id), ...confirmed.deletes.map((d) => d.id)])
    for (const s of view.slots) if (!deleted.has(s.id)) byQuarter.set(quarterKey(s), { ...s, pending: false })
    for (const { answer } of confirmed.answers) byQuarter.set(quarterKey(answer), { ...answer, pending: false })
    for (const a of queue.answers) byQuarter.set(quarterKey(a), { ...a, pending: true })
    return [...byQuarter.values()].sort((x, y) => x.slotAt.localeCompare(y.slotAt))
  }, [view, queue, confirmed])

  const answer = useCallback(
    (answers: AuditAnswer[]) => {
      if (answers.length === 0) return
      setQ(enqueueAnswers(queueRef.current, answers))
      void flush()
    },
    [flush, setQ],
  )

  const remove = useCallback(
    (id: string) => {
      setQ(enqueueDelete(queueRef.current, id))
      void flush()
    },
    [flush, setQ],
  )

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
  const saveReview = useCallback((id: string, review: Review) => decide(() => api.review(id, review)), [api, decide])
  return {
    view,
    loadError,
    slots,
    sendState,
    waiting: queue.answers.length + queue.deletes.length,
    reload: load,
    answer,
    remove,
    start: () => decide(() => api.start(crypto.randomUUID())),
    end: () => (runId ? decide(() => api.end(runId)) : Promise.resolve("No audit is running")),
    mute: (option: MuteOption) => (runId ? decide(() => api.mute(runId, option)) : Promise.resolve("No audit is running")),
    setQuiet: (start: number, end: number) => (runId ? decide(() => api.quiet(runId, start, end)) : Promise.resolve("No audit is running")),
    saveReview,
    readRun,
  }
}

export type AuditState = ReturnType<typeof useAudit>
