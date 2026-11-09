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
import { answersSent, auditQueueOwner, deletesSent, readAuditQueue, writeAuditQueue, type AuditQueue } from "./auditQueue"
import type { AnswerMark, AuditAnswer } from "./types"

export interface AuditSendOutcome {
  /** sent: nothing waits. refused: what waits can never be stored. waiting: might go later. stranger: not this person's. */
  status: "sent" | "waiting" | "stranger" | "refused"
  /** `stored`: what the quarter holds instead (null: deleted there), when another device answered it (alpha slow-pass-06). */
  refused: { answer: AuditAnswer; reason: string; stored?: AnswerMark | null }[]
}

const COULD_NOT_SAVE = "The server could not save it"

export async function sendWaitingAudit(store: KeyValueStore | null = browserStore()): Promise<AuditSendOutcome> {
  const refused: AuditSendOutcome["refused"] = []
  const owner = auditQueueOwner(store)
  if (!owner) return { status: "sent", refused }
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
      if (stranger(error)) return { status: "stranger", refused: [] }
      if (refusedForGood(failureOf(error))) {
        for (const answer of batch) refused.push({ answer, reason: COULD_NOT_SAVE })
        continue
      }
      return { status: "waiting", refused }
    }
  }
  if (waiting) return { status: "waiting", refused }

  for (const { id, at, seen } of current().deletes) {
    try {
      // Refused because another device changed the answer since: that answer
      // stays, which loses nothing he wrote (prove-audit-03), so it goes too.
      await api.remove(id, at, seen)
      put(deletesSent(current(), [id]))
    } catch (error) {
      if (stranger(error)) return { status: "stranger", refused: [] }
      // A delete refused for good undoes nothing a person wrote: it goes, as on the page.
      if (refusedForGood(failureOf(error))) put(deletesSent(current(), [id]))
      else return { status: "waiting", refused }
    }
  }
  return { status: refused.length > 0 ? "refused" : "sent", refused }
}
