/**
 * THE AUDIT'S WAITING ANSWERS, SENT WITHOUT THE AUDIT PAGE, FOR LOG OUT.
 *
 * Log Out wipes the audit queue (`forgetOfflineCopies`). An answer given with
 * no signal, still waiting when signal returned on another page, was thrown
 * away with no word (alpha test fast-audit-01). Log Out now sends what waits
 * first, the way the page would (`useAudit`'s flush), and asks about the rest
 * (`LogOutButton`), as it does for Time's changes.
 *
 * Only ever for the account the queue names: the request carries it, and the
 * server answers 409 when someone else is signed in (`requireAuth`). That is
 * "stranger": the queue is not the person's who is logging out.
 */

import { browserStore, sendInChunks, type KeyValueStore } from "@/src/shared/offlineQueue"
import { AuditCallError, auditApi } from "./auditClient"
import { answersSent, auditQueueOwner, deletesSent, queueIsEmpty, readAuditQueue, writeAuditQueue, type AuditQueue } from "./auditQueue"

export type AuditSendResult = "sent" | "waiting" | "stranger"

export async function sendWaitingAudit(store: KeyValueStore | null = browserStore()): Promise<AuditSendResult> {
  const owner = auditQueueOwner(store)
  if (!owner) return "sent"
  const api = auditApi(owner)
  // Read again before each write: the audit page in this tab may have changed it meanwhile.
  const current = () => readAuditQueue(store, owner)
  const put = (next: AuditQueue) => writeAuditQueue(store, { ...next, owner })
  let stranger = false
  const strangerIf = (error: unknown) => {
    if (error instanceof AuditCallError && error.status === 409) stranger = true
  }

  let later = new Set<string>()
  const stuck = await sendInChunks(
    current().answers,
    async (batch) => {
      try {
        const answer = await api.save(batch)
        later = new Set((answer.refused ?? []).filter((r) => r.retry).map((r) => String(r.id)))
      } catch (error) {
        strangerIf(error)
        throw error
      }
    },
    {
      onSent: (batch) => put(answersSent(current(), batch.filter((a) => !later.has(a.id)))),
      onDropped: (batch) => put(answersSent(current(), batch)),
    },
  )
  if (stranger) return "stranger"
  if (stuck) return "waiting"

  for (const { id, at } of current().deletes) {
    try {
      await api.remove(id, at)
      put(deletesSent(current(), [id]))
    } catch (error) {
      strangerIf(error)
      if (stranger) return "stranger"
      if (error instanceof AuditCallError && !error.retryable && error.status !== 401) put(deletesSent(current(), [id]))
      else return "waiting"
    }
  }
  return queueIsEmpty(current()) ? "sent" : "waiting"
}
