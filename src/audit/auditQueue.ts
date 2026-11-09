/**
 * ANSWERS KEPT ON THIS PHONE UNTIL THE SERVER HAS THEM (D-OFFLINE).
 *
 * Daygame happens outside, often with no signal. An answer shows at once and
 * waits here until it is sent. Its id is made on the phone and one quarter
 * holds one answer, so a resend saves once. Deletes wait here too, and go
 * after the answers, so a delete never overtakes the save it undoes.
 *
 * Everything here is ONE PERSON'S (`src/shared/offlineQueue.ts`): another
 * account's queue is thrown away unread, and signing out wipes it
 * (`forgetAuditOnThisDevice`, called from `forgetOfflineCopies`).
 */

import { browserStore, readOwnedJson, writeOwnedJson, type KeyValueStore } from "@/src/shared/offlineQueue"
import type { AuditAnswer } from "./types"

export const AUDIT_QUEUE_KEY = "audit-queue-v1"

export interface AuditQueue {
  owner: string | null
  answers: AuditAnswer[]
  /** Answer ids whose delete the server has not confirmed. */
  deletes: string[]
}

export const emptyAuditQueue = (owner: string | null): AuditQueue => ({ owner, answers: [], deletes: [] })

export const queueIsEmpty = (q: AuditQueue): boolean => q.answers.length === 0 && q.deletes.length === 0

const quarterKey = (a: Pick<AuditAnswer, "runId" | "slotAt">) => `${a.runId}:${a.slotAt}`

export function readAuditQueue(store: KeyValueStore | null, owner: string): AuditQueue {
  const parsed = readOwnedJson(store, AUDIT_QUEUE_KEY, owner) as Partial<AuditQueue> | null
  if (!parsed) return emptyAuditQueue(owner)
  return {
    owner,
    answers: Array.isArray(parsed.answers) ? parsed.answers : [],
    deletes: Array.isArray(parsed.deletes) ? parsed.deletes.filter((x): x is string => typeof x === "string") : [],
  }
}

export function writeAuditQueue(store: KeyValueStore | null, q: AuditQueue): void {
  const { owner, ...rest } = q
  writeOwnedJson(store, AUDIT_QUEUE_KEY, owner, queueIsEmpty(q) ? null : rest)
}

/** Add answers; a newer answer for the same quarter replaces a waiting one. */
export function enqueueAnswers(q: AuditQueue, answers: readonly AuditAnswer[]): AuditQueue {
  const replaced = new Set(answers.map(quarterKey))
  const ids = new Set(answers.map((a) => a.id))
  return {
    ...q,
    answers: [...q.answers.filter((a) => !replaced.has(quarterKey(a))), ...answers],
    deletes: q.deletes.filter((id) => !ids.has(id)),
  }
}

/** Delete an answer: out of the queue, and a delete queued in case it already reached the server. */
export function enqueueDelete(q: AuditQueue, id: string): AuditQueue {
  return {
    ...q,
    answers: q.answers.filter((a) => a.id !== id),
    deletes: q.deletes.includes(id) ? q.deletes : [...q.deletes, id],
  }
}

export function answersSent(q: AuditQueue, ids: readonly string[]): AuditQueue {
  const done = new Set(ids)
  return { ...q, answers: q.answers.filter((a) => !done.has(a.id)) }
}

export function deletesSent(q: AuditQueue, ids: readonly string[]): AuditQueue {
  const done = new Set(ids)
  return { ...q, deletes: q.deletes.filter((id) => !done.has(id)) }
}

/** Signing out: no answer text stays on a shared phone. */
export function forgetAuditOnThisDevice(store: KeyValueStore | null = browserStore()): void {
  try {
    store?.removeItem(AUDIT_QUEUE_KEY)
  } catch {
    // Nothing kept, nothing to forget.
  }
}
