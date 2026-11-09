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

export function useAudit(account: string) {
  const api = useMemo(() => auditApi(account), [account])
  const [view, setView] = useState<AuditView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [queue, setQueue] = useState<AuditQueue>(emptyAuditQueue(account))
  const [sendState, setSendState] = useState<SendState>("sent")
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
    try {
      const fresh = await api.view()
      if (mine < readApplied.current) return
      readApplied.current = mine
      setView(fresh)
      setLoadError(null)
    } catch (error) {
      if (mine < readApplied.current) return
      setLoadError(error instanceof AuditCallError ? error.message : "Could not read your audit")
    }
  }, [api])

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
        stuck = await sendInChunks(queueRef.current.answers, (batch) => api.save(batch).then(() => undefined), {
          onSent: (batch) => setQ(answersSent(queueRef.current, batch.map((x) => x.id))),
          onDropped: (batch) => setQ(answersSent(queueRef.current, batch.map((x) => x.id))),
        })
        if (!stuck) {
          for (const id of queueRef.current.deletes) {
            try {
              await api.remove(id)
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
  }, [api, load, setQ])

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
    window.addEventListener("online", retry)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("online", retry)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [account, load, flush])

  /** The answers to draw: the server's, with what waits on this phone on top, minus waiting deletes. */
  const slots: DrawnSlot[] = useMemo(() => {
    if (!view) return []
    const byQuarter = new Map<string, DrawnSlot>()
    const deleted = new Set(queue.deletes)
    for (const s of view.slots) if (!deleted.has(s.id)) byQuarter.set(quarterKey(s), { ...s, pending: false })
    for (const a of queue.answers) byQuarter.set(quarterKey(a), { ...a, pending: true })
    return [...byQuarter.values()].sort((x, y) => x.slotAt.localeCompare(y.slotAt))
  }, [view, queue])

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
    saveReview: (id: string, review: Review) => decide(() => api.review(id, review)),
    readRun: (id: string) => api.view(id),
  }
}

export type AuditState = ReturnType<typeof useAudit>
