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
import type { AnswerMark, AuditAnswer } from "./types"

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
  /**
   * The answer as the server holds it, as far as this device knows: the delete
   * goes only if it is still that (alpha prove-audit-03). Absent: deleted by
   * the clock rule (`at`), as deletes queued before this rule were.
   */
  seen?: AnswerMark
  /** Its quarter, to name it when the server refuses the delete. */
  slotAt?: string
  /** Its audit, so an answer given again for that quarter inside the Undo time replaces it. */
  runId?: string
  /**
   * The server refused it: another device changed the answer since
   * (`stored`), or it refused it outright. Not sent again until he chooses
   * "Delete anyway" or "Keep" (review of 81f325e9); Log Out names it.
   */
  refused?: { reason: string; stored?: AnswerMark }
  /**
   * Log Out (in any tab) is about to send it inside its Undo time, at this
   * instant (ms): Undo no longer takes it back, and says it is too late. Log
   * Out sends it only if it is still claimed a moment later, so an Undo
   * written at the same instant keeps the answer (alpha p10-deletes-04).
   * It counts only while `claimHolds`: a Log Out tab closed mid-claim leaves
   * it, and it ends by itself (code review of p10-deletes-04).
   */
  claimed?: number
  /**
   * Log Out let go of its claim at this instant (ms): nothing was sent. Kept,
   * so a tab still holding the claimed copy cannot merge the claim back over
   * the release; a claim counts only when newer than this.
   */
  released?: number
}

/**
 * How long Log Out may send a claimed delete: it gives up on the send by then
 * (`sendWaitingAudit`), so a claim older than CLAIM_HOLD_MS is never acted on.
 */
export const CLAIM_SEND_MS = 3_000
/**
 * How long a delete inside its Undo time stays claimed before it is sent: an
 * Undo another tab read before the claim and writes after it lands well inside
 * this, and is kept (alpha p10-deletes-04).
 */
export const CLAIM_SETTLE_MS = 100
/** How long a claim counts: Log Out's settle moment plus its send. */
export const CLAIM_HOLD_MS = CLAIM_SETTLE_MS + CLAIM_SEND_MS

/** Is Log Out (in some tab) sending this delete now: claimed, not released since, and not too long ago? */
export const claimHolds = (d: QueuedDelete, nowMs: number = Date.now()): boolean =>
  d.claimed !== undefined && (d.released === undefined || d.released < d.claimed) && nowMs - d.claimed < CLAIM_HOLD_MS

export interface AuditQueue {
  owner: string | null
  answers: AuditAnswer[]
  /** Deletes the server has not confirmed. */
  deletes: QueuedDelete[]
  /**
   * What a tab took out of the queue (sent, undone, replaced) or put back, and
   * when: an older copy written by another tab cannot bring it back
   * (`mergeAuditQueues`, alpha p9-deletes-02). Kept for `QUEUE_MARK_KEEP_MS`,
   * a delete's for `DELETE_MARK_KEEP_MS`, at most `QUEUE_MARKS_MAX` of them.
   */
  marks?: QueueMark[]
}

/** One answer version (`a:`) or delete (`d:`) leaving the queue (`gone`) or coming back, at `at` (ms). */
export interface QueueMark {
  key: string
  at: number
  gone: boolean
}

/** How long a mark is kept: far longer than another tab's write takes to arrive. */
export const QUEUE_MARK_KEEP_MS = 60 * 60_000
/**
 * A delete's mark is kept for the audit's whole length: a tab frozen in the
 * background for hours (a phone) still holds its old copy of the delete, and
 * merged it back once the hour was over, sending a delete he had undone
 * (code review of auditQueue.ts).
 */
export const DELETE_MARK_KEEP_MS = 14 * 24 * 60 * 60_000
/** The newest marks kept, so the stored queue stays small. */
export const QUEUE_MARKS_MAX = 1000

export const emptyAuditQueue = (owner: string | null): AuditQueue => ({ owner, answers: [], deletes: [] })

export const queueIsEmpty = (q: AuditQueue): boolean => q.answers.length === 0 && q.deletes.length === 0

const quarterKey = (a: Pick<AuditAnswer, "runId" | "slotAt">) => `${a.runId}:${a.slotAt}`

export function readAuditQueue(store: KeyValueStore | null, owner: string): AuditQueue {
  return parseAuditQueue(readOwnedJson(store, AUDIT_QUEUE_KEY, owner), owner) ?? emptyAuditQueue(owner)
}

const isMark = (x: unknown): x is QueueMark =>
  !!x && typeof x === "object" && typeof (x as QueueMark).key === "string" && typeof (x as QueueMark).at === "number" && typeof (x as QueueMark).gone === "boolean"

/** A stored queue (its owner already checked and removed), or null when there is none. */
function parseAuditQueue(stored: Record<string, unknown> | null, owner: string): AuditQueue | null {
  const parsed = stored as Partial<AuditQueue> | null
  if (!parsed) return null
  const marks = Array.isArray(parsed.marks) ? parsed.marks.filter(isMark) : []
  return {
    ...(marks.length > 0 ? { marks } : {}),
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
  writeOwnedJson(store, AUDIT_QUEUE_KEY, owner, queueIsEmpty(q) && !q.marks?.length ? null : rest)
}

/**
 * The queue in a storage event's new text, or null when the key was removed
 * (Log Out in another tab) or holds another account's queue.
 */
export function auditQueueFromText(raw: string | null, owner: string): AuditQueue | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== "object" || parsed.owner !== owner) return null
    return parseAuditQueue(parsed, owner)
  } catch {
    return null
  }
}

/** A short fingerprint, so a mark never keeps an answer's text after it was sent (cyrb53). */
function fingerprint(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}
/** One version of one answer: an edit under the same id is another version. */
const answerKey = (a: AuditAnswer) => `a:${a.id}:${fingerprint(JSON.stringify(a))}`
const deleteKey = (d: QueuedDelete) => `d:${d.id}@${d.at}`
const keysOf = (q: AuditQueue) => new Set([...q.answers.map(answerKey), ...q.deletes.map(deleteKey)])

/** The latest mark of each key; at the same instant, gone wins. */
function latestMarks(...lists: (QueueMark[] | undefined)[]): Map<string, QueueMark> {
  const latest = new Map<string, QueueMark>()
  for (const m of lists.flatMap((l) => l ?? [])) {
    const was = latest.get(m.key)
    if (!was || m.at > was.at || (m.at === was.at && m.gone)) latest.set(m.key, m)
  }
  return latest
}

/**
 * `after` is `before` changed by this tab at `nowMs`: what left the queue is
 * marked gone, and what came back (Undo puts a waiting answer back) is marked
 * back. Marks older than QUEUE_MARK_KEEP_MS (a delete's: DELETE_MARK_KEEP_MS)
 * are dropped, and only the newest QUEUE_MARKS_MAX are kept.
 */
export function markRemoved(before: AuditQueue, after: AuditQueue, nowMs: number = Date.now()): AuditQueue {
  const was = keysOf(before)
  const now = keysOf(after)
  const latest = latestMarks(before.marks, after.marks)
  for (const key of was) if (!now.has(key)) latest.set(key, { key, at: nowMs, gone: true })
  for (const key of now) if (latest.get(key)?.gone) latest.set(key, { key, at: nowMs, gone: false })
  const marks = [...latest.values()]
    .filter((m) => m.at > nowMs - (m.key.startsWith("d:") ? DELETE_MARK_KEEP_MS : QUEUE_MARK_KEEP_MS))
    .sort((x, y) => y.at - x.at)
    .slice(0, QUEUE_MARKS_MAX)
  const { marks: _m, ...rest } = after
  void _m
  return marks.length > 0 ? { ...rest, marks } : rest
}

/**
 * Two tabs' copies of the queue as one (alpha p9-deletes-02): everything
 * either holds, minus what either took out since (its latest mark is gone).
 * `primary` wins where both hold the same delete, except that a refusal is
 * never lost. Answers keep `primary`'s order, the other's extras after.
 */
export function mergeAuditQueues(primary: AuditQueue, other: AuditQueue): AuditQueue {
  const latest = latestMarks(primary.marks, other.marks)
  const live = (key: string) => !latest.get(key)?.gone
  const answers = [...primary.answers]
  const haveAnswer = new Set(answers.map(answerKey))
  for (const a of other.answers) if (!haveAnswer.has(answerKey(a))) answers.push(a)
  const theirs = new Map(other.deletes.map((d) => [deleteKey(d), d]))
  const deletes = primary.deletes.map((d) => {
    const t = theirs.get(deleteKey(d))
    if (!t) return d
    const kept = !d.refused && t.refused ? t : d
    // a claim by Log Out is never lost, nor is its release: the newest of each
    // is kept, and a claim counts only when newer than the release
    const claimed = newest(d.claimed, t.claimed)
    const released = newest(d.released, t.released)
    const { claimed: _c, released: _r, ...rest } = kept
    void _c
    void _r
    return { ...rest, ...(claimed !== undefined ? { claimed } : {}), ...(released !== undefined ? { released } : {}) }
  })
  const haveDelete = new Set(deletes.map(deleteKey))
  for (const d of other.deletes) if (!haveDelete.has(deleteKey(d))) deletes.push(d)
  const marks = [...latest.values()]
  return {
    owner: primary.owner,
    answers: answers.filter((a) => live(answerKey(a))),
    deletes: deletes.filter((d) => live(deleteKey(d))),
    ...(marks.length > 0 ? { marks } : {}),
  }
}

const newest = (x: number | undefined, y: number | undefined) => (x === undefined ? y : y === undefined ? x : Math.max(x, y))

/** Do the two copies hold the same answers, deletes (and refusals) and marks? */
export function sameAuditQueue(x: AuditQueue, y: AuditQueue): boolean {
  const sig = (q: AuditQueue) =>
    JSON.stringify([
      [...q.answers.map(answerKey)].sort(),
      [...q.deletes.map((d) => `${deleteKey(d)}:${d.refused ? 1 : 0}:${d.claimed ?? ""}:${d.released ?? ""}`)].sort(),
      [...(q.marks ?? []).map((m) => `${m.key}:${m.at}:${m.gone}`)].sort(),
    ])
  return sig(x) === sig(y)
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
 * Answers that would replace a waiting answer their card never saw: their
 * `was` is not that one. Within one tab a card sees what waits (it is drawn),
 * so this is another tab's answer, waiting in the same stored queue. Replacing
 * it dropped that tab's answer while it still said "Saved" (alpha p9-saves-03);
 * like another device's, it is named, with "Keep that one" / "Use mine".
 * Answers with no `was` (made before it existed) are never held back.
 */
export function unseenWaiting(q: AuditQueue, answers: readonly AuditAnswer[]): { answer: AuditAnswer; stored: AnswerMark }[] {
  const waiting = new Map(q.answers.map((a) => [quarterKey(a), a]))
  return answers.flatMap((a) => {
    const w = waiting.get(quarterKey(a))
    return w && a.was !== undefined && !sameMark(a.was, markOf(w)) ? [{ answer: a, stored: markOf(w) }] : []
  })
}

/**
 * Delete an answer: out of the queue, and a delete queued in case it already
 * reached the server. With `notBefore`, it waits until then, and Undo
 * (`cancelDelete`) can take it back. `seen` is the answer as drawn on the
 * server's side; for an answer still waiting here, the server holds what that
 * one saw (`was`), and nothing of it when it was new.
 */
export function enqueueDelete(
  q: AuditQueue,
  id: string,
  at: string = new Date().toISOString(),
  notBefore?: string,
  drawn?: AnswerMark & { slotAt?: string; runId?: string },
): AuditQueue {
  const waiting = q.answers.find((a) => a.id === id)
  const seen = waiting ? (waiting.was ?? undefined) : drawn ? markOf(drawn) : undefined
  const slotAt = waiting?.slotAt ?? drawn?.slotAt
  const runId = waiting?.runId ?? drawn?.runId
  const entry: QueuedDelete = {
    id,
    at,
    ...(notBefore ? { notBefore, ...(waiting ? { restore: waiting } : {}) } : {}),
    ...(seen ? { seen } : {}),
    ...(slotAt ? { slotAt } : {}),
    ...(runId ? { runId } : {}),
  }
  return {
    ...q,
    answers: q.answers.filter((a) => a.id !== id),
    // deleting again what was refused is a new delete, over what he sees now
    deletes: q.deletes.some((d) => d.id === id && !d.refused) ? q.deletes : [...q.deletes.filter((d) => d.id !== id), entry],
  }
}

/** The server refused this delete: kept, named, and not sent again until he chooses. */
export function deleteRefused(q: AuditQueue, id: string, reason: string, stored?: AnswerMark): AuditQueue {
  return { ...q, deletes: q.deletes.map((d) => (d.id === id ? { ...d, refused: { reason, ...(stored ? { stored } : {}) } } : d)) }
}

/** "Delete anyway" / "Try again": sent now, over the answer as it is now when that is known. */
export function retryDelete(q: AuditQueue, id: string): AuditQueue {
  return {
    ...q,
    deletes: q.deletes.map((d) => {
      if (d.id !== id || !d.refused) return d
      const { refused, notBefore: _n, restore: _r, ...rest } = d
      void _n
      void _r
      return { ...rest, at: new Date().toISOString(), ...(refused.stored ? { seen: markOf(refused.stored) } : {}) }
    }),
  }
}

/** Deletes still to send (not refused): what hides an answer and what counts as waiting. */
export const pendingDeletes = (q: AuditQueue): QueuedDelete[] => q.deletes.filter((d) => !d.refused)

/**
 * These answers were just stored: a delete queued meanwhile for one of them
 * (tapped while its save was on its way) now saw that one.
 */
export function deletesSeeStored(q: AuditQueue, stored: readonly AuditAnswer[]): AuditQueue {
  const byId = new Map(stored.map((a) => [a.id, a]))
  if (!q.deletes.some((d) => byId.has(d.id))) return q
  return { ...q, deletes: q.deletes.map((d) => (byId.has(d.id) ? { ...d, seen: markOf(byId.get(d.id)!) } : d)) }
}

/** When the next delete still in its Undo time is due, or null when none waits. */
export function nextDeleteDue(q: AuditQueue, nowMs: number): number | null {
  const due = pendingDeletes(q).flatMap((d) => (d.notBefore && Date.parse(d.notBefore) > nowMs ? [Date.parse(d.notBefore)] : []))
  return due.length > 0 ? Math.min(...due) : null
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

/**
 * Log Out claims these deletes at `claimedAt` (or, with it null, lets go of
 * them at `nowMs`, a mark merging keeps): see `QueuedDelete.claimed`.
 */
export function claimDeletes(q: AuditQueue, ids: readonly string[], claimedAt: number | null, nowMs: number = Date.now()): AuditQueue {
  const these = new Set(ids)
  return {
    ...q,
    deletes: q.deletes.map((d) => {
      if (!these.has(d.id)) return d
      if (claimedAt !== null) return { ...d, claimed: claimedAt }
      return d.claimed === undefined ? d : { ...d, released: Math.max(nowMs, d.claimed) }
    }),
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

/**
 * Deletes on this device the server has not had yet (refused ones aside, which
 * Log Out names with their reason): named as deletes, since logging out
 * without them keeps the answer (alpha p9-deletes-04).
 */
export function unsentAuditDeletes(store: KeyValueStore | null = browserStore()): { id: string; slotAt: string | null; activity: string | null }[] {
  const owner = auditQueueOwner(store)
  if (!owner) return []
  return pendingDeletes(readAuditQueue(store, owner)).map((d) => ({
    id: d.id,
    slotAt: d.slotAt ?? null,
    activity: d.restore?.activity ?? d.seen?.activity ?? null,
  }))
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

const forgetListeners = new Set<() => void>()

/**
 * Called when this device's audit is forgotten (Log Out): an open audit page
 * drops its queue and its timers, so nothing is sent, or written back, after
 * (review of 81f325e9). Returns the unsubscribe.
 */
export function onAuditForgotten(listener: () => void): () => void {
  forgetListeners.add(listener)
  return () => void forgetListeners.delete(listener)
}

/** Signing out: no answer text stays on a shared phone, waiting or last read. */
export function forgetAuditOnThisDevice(store: KeyValueStore | null = browserStore()): void {
  for (const listener of [...forgetListeners]) listener()
  try {
    store?.removeItem(AUDIT_QUEUE_KEY)
    store?.removeItem(AUDIT_VIEW_KEY)
  } catch {
    // Nothing kept, nothing to forget.
  }
}
