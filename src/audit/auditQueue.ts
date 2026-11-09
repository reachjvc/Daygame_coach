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
import type { AuditView } from "./auditClient"
import { markOf, sameMark } from "./auditService"
import type { AuditAnswer } from "./types"

export const AUDIT_QUEUE_KEY = "audit-queue-v1"
/**
 * The page's last read, so /audit opened with no signal (a ping tapped in a
 * basement) still draws the day and takes answers (alpha test fast-audit-04).
 * Only drawn when a read fails for want of signal; one person's, like the queue.
 */
export const AUDIT_VIEW_KEY = "audit-view-v1"

export interface QueuedDelete {
  id: string
  /** When it was deleted, by this phone's clock: a newer answer on another device is kept. */
  at: string
  /**
   * Not sent before this instant: the "Deleted · Undo" time (alpha picky-eye-08).
   * It is in the stored queue from the tap, so Log Out counts and sends it,
   * and its `at` is the tap, not the end of the undo time (code review, 2026-11-09).
   */
  notBefore?: string
  /** The waiting answer the delete took out of the queue, put back by Undo. */
  restore?: AuditAnswer
}

export interface AuditQueue {
  owner: string | null
  answers: AuditAnswer[]
  /** Deletes the server has not confirmed. */
  deletes: QueuedDelete[]
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
    deletes: Array.isArray(parsed.deletes)
      ? (parsed.deletes as unknown[]).flatMap((x): QueuedDelete[] =>
          typeof x === "string"
            ? [{ id: x, at: new Date().toISOString() }]
            : x && typeof x === "object" && typeof (x as QueuedDelete).id === "string" && typeof (x as QueuedDelete).at === "string"
              ? [x as QueuedDelete]
              : [],
        )
      : [],
  }
}

export function writeAuditQueue(store: KeyValueStore | null, q: AuditQueue): void {
  const { owner, ...rest } = q
  writeOwnedJson(store, AUDIT_QUEUE_KEY, owner, queueIsEmpty(q) ? null : rest)
}

/**
 * Add answers; a newer answer for the same quarter replaces a waiting one.
 *
 * An answer made from one still waiting (its `was` is that answer) takes over
 * what the waiting one saw: the server never had the waiting one, so it
 * compares against what was there before it (alpha slow-pass-06).
 */
export function enqueueAnswers(q: AuditQueue, answers: readonly AuditAnswer[]): AuditQueue {
  const replaced = new Set(answers.map(quarterKey))
  const ids = new Set(answers.map((a) => a.id))
  const waiting = new Map(q.answers.map((a) => [quarterKey(a), a]))
  const added = answers.map((a) => {
    const w = waiting.get(quarterKey(a))
    return w && a.was && sameMark(a.was, markOf(w)) ? { ...a, was: w.was } : a
  })
  return {
    ...q,
    answers: [...q.answers.filter((a) => !replaced.has(quarterKey(a))), ...added],
    deletes: q.deletes.filter((d) => !ids.has(d.id)),
  }
}

/**
 * Delete an answer: out of the queue, and a delete queued in case it already
 * reached the server. With `notBefore`, it waits until then, and Undo
 * (`cancelDelete`) can take it back.
 */
export function enqueueDelete(q: AuditQueue, id: string, at: string = new Date().toISOString(), notBefore?: string): AuditQueue {
  const waiting = q.answers.find((a) => a.id === id)
  const entry: QueuedDelete = notBefore ? { id, at, notBefore, ...(waiting ? { restore: waiting } : {}) } : { id, at }
  return {
    ...q,
    answers: q.answers.filter((a) => a.id !== id),
    deletes: q.deletes.some((d) => d.id === id) ? q.deletes : [...q.deletes, entry],
  }
}

/** Undo: a delete still in its undo time leaves the queue, and the waiting answer it took out comes back. */
export function cancelDelete(q: AuditQueue, id: string): AuditQueue {
  const d = q.deletes.find((x) => x.id === id)
  if (!d) return q
  return {
    ...q,
    answers: d.restore && !q.answers.some((a) => a.id === id) ? [...q.answers, d.restore] : q.answers,
    deletes: q.deletes.filter((x) => x.id !== id),
  }
}

/** Is this delete's undo time over at `nowMs`? */
export const deleteIsDue = (d: QueuedDelete, nowMs: number): boolean => !d.notBefore || Date.parse(d.notBefore) <= nowMs

/**
 * These answers reached the server. Only the exact versions sent leave the
 * queue: an edit made while the first save was on its way keeps the same id,
 * and must still be sent (offline audit, 2026-11-09).
 *
 * Such an edit took over what the first one saw (`enqueueAnswers`). Once the
 * server STORED the first (`stored`, all of `sent` unless named), the edit saw
 * that one: its `was` becomes it, or the server would refuse the edit as a
 * change from another device (alpha slow-pass-06).
 */
export function answersSent(q: AuditQueue, sent: readonly AuditAnswer[], stored: readonly AuditAnswer[] = sent): AuditQueue {
  const done = new Set(sent.map((a) => JSON.stringify(a)))
  const kept = new Map(stored.map((a) => [`${quarterKey(a)}:${a.id}`, a]))
  return {
    ...q,
    answers: q.answers
      .filter((a) => !done.has(JSON.stringify(a)))
      .map((a) => {
        const s = kept.get(`${quarterKey(a)}:${a.id}`)
        return s && a.was !== undefined && sameMark(a.was, s.was) ? { ...a, was: markOf(s) } : a
      }),
  }
}

export function deletesSent(q: AuditQueue, ids: readonly string[]): AuditQueue {
  const done = new Set(ids)
  return { ...q, deletes: q.deletes.filter((d) => !done.has(d.id)) }
}

/** The account a stored queue belongs to, or null when there is none. Nothing else is read. */
export function auditQueueOwner(store: KeyValueStore | null = browserStore()): string | null {
  try {
    const raw = store?.getItem(AUDIT_QUEUE_KEY)
    const owner = raw ? (JSON.parse(raw) as { owner?: unknown } | null)?.owner : null
    return typeof owner === "string" && owner ? owner : null
  } catch {
    return null
  }
}

/** Answers and deletes on this device the server has not confirmed (Log Out asks before it loses them). */
export function unsentAuditChanges(store: KeyValueStore | null = browserStore()): number {
  const owner = auditQueueOwner(store)
  if (!owner) return 0
  const q = readAuditQueue(store, owner)
  return q.answers.length + q.deletes.length
}

export function readAuditViewCopy(store: KeyValueStore | null, owner: string): AuditView | null {
  const parsed = readOwnedJson(store, AUDIT_VIEW_KEY, owner) as { view?: AuditView } | null
  const view = parsed?.view
  return view && typeof view === "object" && Array.isArray(view.slots) && Array.isArray(view.runs) && typeof view.timezone === "string" ? view : null
}

export function writeAuditViewCopy(store: KeyValueStore | null, owner: string, view: AuditView): void {
  writeOwnedJson(store, AUDIT_VIEW_KEY, owner, { view })
}

/**
 * A sign-in (or a session that ended): the last read is a copy, not unsent
 * work, and it was the previous person's day. Answers still waiting stay
 * (they are sent only to their own account).
 */
export function forgetAuditViewCopy(store: KeyValueStore | null = browserStore()): void {
  try {
    store?.removeItem(AUDIT_VIEW_KEY)
  } catch {
    // Nothing kept, nothing to forget.
  }
}

/** Signing out: no answer text stays on a shared phone, waiting or last read. */
export function forgetAuditOnThisDevice(store: KeyValueStore | null = browserStore()): void {
  try {
    store?.removeItem(AUDIT_QUEUE_KEY)
    store?.removeItem(AUDIT_VIEW_KEY)
  } catch {
    // Nothing kept, nothing to forget.
  }
}
