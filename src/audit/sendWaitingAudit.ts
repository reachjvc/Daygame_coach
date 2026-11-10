/**
 * THE AUDIT'S WAITING ANSWERS, SENT WITHOUT THE AUDIT PAGE, FOR LOG OUT.
 *
 * Log Out wipes the audit queue (`forgetOfflineCopies`). An answer given with
 * no signal, still waiting when signal returned on another page, was thrown
 * away with no word (alpha test fast-audit-01). Log Out now sends what waits
 * first, the way the page would (`useAudit`'s flush), and asks about the rest
 * (`LogOutButton`), as it does for Time.
 *
 * AN ANSWER THE SERVER REFUSES FOR GOOD STAYS IN THE QUEUE and comes back in
 * `refused`, with the server's reason, so Log Out can name it ("Changed on
 * another device since"). Only "Log out anyway" drops it; "Stay signed in"
 * keeps it, and the audit page names it the next time it sends (useAudit).
 *
 * Only ever for the account the queue names: the request carries it, and the
 * server answers 409 when someone else is signed in (`requireAuth`). That is
 * "stranger": the queue is not the person's who is logging out.
 */

import { browserStore, failureOf, refusedForGood, SEND_AT_MOST, type KeyValueStore } from "@/src/shared/offlineQueue"
import { AuditCallError, auditApi } from "./auditClient"
import {
  answersSent,
  auditQueueOwner,
  CLAIM_SEND_MS,
  CLAIM_SETTLE_MS,
  claimDeletes,
  claimHolds,
  deleteIsDue,
  deleteRefused,
  deletesSent,
  readAuditQueue,
  writeAuditQueue,
  type AuditQueue,
} from "./auditQueue"
import type { AnswerMark, AuditAnswer } from "./types"

export interface AuditSendOutcome {
  /** sent: nothing waits. refused: what waits can never be stored. waiting: might go later. stranger: not this person's. */
  status: "sent" | "waiting" | "stranger" | "refused"
  /** `stored`: what the quarter holds instead (null: deleted there), when another device answered it (alpha slow-pass-06). */
  refused: { answer: AuditAnswer; reason: string; stored?: AnswerMark | null }[]
  /**
   * Deletes the server refused (another device changed the answer: `stored`;
   * or outright). They stay in the queue: Log Out names them, and only "Log
   * out anyway" drops them (review of 81f325e9).
   */
  notDeleted: { id: string; slotAt: string | null; activity: string | null; reason: string; stored?: AnswerMark }[]
  /** Deletes sent although still inside their Undo time: he is leaving, so they go, and the dialog says so. */
  undoSent: number
}

const COULD_NOT_SAVE = "The server could not save it"
const COULD_NOT_DELETE = "The server could not delete it"
/** Re-exported: it lives with the claim rules in auditQueue. */
export { CLAIM_SETTLE_MS }

export async function sendWaitingAudit(store: KeyValueStore | null = browserStore()): Promise<AuditSendOutcome> {
  const refused: AuditSendOutcome["refused"] = []
  const notDeleted: AuditSendOutcome["notDeleted"] = []
  let undoSent = 0
  const outcome = (status: AuditSendOutcome["status"]): AuditSendOutcome =>
    status === "stranger" ? { status, refused: [], notDeleted: [], undoSent: 0 } : { status, refused, notDeleted, undoSent }
  const owner = auditQueueOwner(store)
  if (!owner) return outcome("sent")
  const api = auditApi(owner)
  // Read again before each write: the audit page in this tab may have changed it meanwhile.
  const current = () => readAuditQueue(store, owner)
  const put = (next: AuditQueue) => writeAuditQueue(store, { ...next, owner })
  const stranger = (error: unknown) => error instanceof AuditCallError && error.status === 409

  let waiting = false
  const answers = current().answers
  for (let i = 0; i < answers.length; i += SEND_AT_MOST) {
    const batch = answers.slice(i, i + SEND_AT_MOST)
    try {
      const result = await api.save(batch)
      const kept = new Set<string>()
      for (const r of result.refused ?? []) {
        kept.add(String(r.id))
        if (r.retry) {
          waiting = true
          continue
        }
        const answer = batch.find((a) => a.id === String(r.id))
        if (answer) refused.push({ answer, reason: r.error, ...(r.stored !== undefined ? { stored: r.stored } : {}) })
      }
      put(answersSent(current(), batch.filter((a) => !kept.has(a.id))))
    } catch (error) {
      if (stranger(error)) return outcome("stranger")
      if (refusedForGood(failureOf(error))) {
        for (const answer of batch) refused.push({ answer, reason: COULD_NOT_SAVE })
        continue
      }
      return outcome("waiting")
    }
  }
  if (waiting) return outcome("waiting")

  // Deletes still inside their Undo time are claimed first, and sent only if
  // still claimed a moment later: an Undo in another tab at the same instant
  // keeps the answer, and one after the claim says it is too late.
  const claimed = current()
    .deletes.filter((d) => !d.refused && !deleteIsDue(d, Date.now()))
    .map((d) => d.id)
  // A claim counts for CLAIM_HOLD_MS only (a Log Out tab closed mid-claim
  // leaves it): the claimed sends are given up before then, so none lands
  // after an Undo the ended claim allowed.
  const giveUp = new AbortController()
  let deadline: ReturnType<typeof setTimeout> | null = null
  if (claimed.length > 0) {
    put(claimDeletes(current(), claimed, Date.now()))
    deadline = setTimeout(() => giveUp.abort(), CLAIM_SETTLE_MS + CLAIM_SEND_MS)
    await new Promise((done) => setTimeout(done, CLAIM_SETTLE_MS))
  }
  try {
    return await sendDeletes()
  } finally {
    if (deadline !== null) clearTimeout(deadline)
    // what was not sent (no signal, refused, Stay signed in) can be undone
    // again: the release is marked, so another tab's claimed copy cannot bring the claim back
    const left = current()
    if (left.deletes.some((d) => claimHolds(d) && claimed.includes(d.id))) put(claimDeletes(left, claimed, null))
  }

  async function sendDeletes(): Promise<AuditSendOutcome> {
    for (const d of current().deletes) {
      // inside its Undo time and not claimed by this Log Out (made after the claim): left for the next try
      if (!d.refused && !deleteIsDue(d, Date.now()) && !(claimHolds(d) && claimed.includes(d.id))) continue
      const { id, at, seen } = d
      const name = (reason: string, stored?: AnswerMark) =>
        notDeleted.push({ id, slotAt: d.slotAt ?? null, activity: seen?.activity ?? null, reason, ...(stored ? { stored } : {}) })
      // refused before: not sent again, named
      if (d.refused) {
        name(d.refused.reason, d.refused.stored)
        continue
      }
      try {
        // Still inside its Undo time when claimed: sent anyway, as he is leaving (the dialog says so).
        const early = claimed.includes(id)
        const result = await api.remove(id, at, seen, early ? giveUp.signal : undefined)
        if (early) undoSent += 1
        if (result.changed) {
          // another device changed the answer since: kept, and named (prove-audit-03)
          put(deleteRefused(current(), id, "Changed on another device", result.changed))
          name("Changed on another device", result.changed)
        } else put(deletesSent(current(), [id]))
      } catch (error) {
        if (stranger(error)) return outcome("stranger")
        if (refusedForGood(failureOf(error))) {
          const reason = error instanceof AuditCallError ? error.message : COULD_NOT_DELETE
          put(deleteRefused(current(), id, reason))
          name(reason)
        } else return outcome("waiting")
      }
    }
    return outcome(refused.length + notDeleted.length > 0 ? "refused" : "sent")
  }
}
