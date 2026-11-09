/**
 * THE AUDIT'S PINGS (Plans/energy-audit.md, Phase 5).
 *
 * Once a minute the clock asks the database which quarters just ended
 * unanswered (`audit_pings_due`: the quarter that just ended, in the first
 * 5 minutes after it, awake, not muted, with a switched-on device), and sends
 * each person one ping: "What did you do from 10:00 to 10:15?". The send log
 * holds one row per quarter (`audit:<run>:<epoch>`, unique), so two ticks at
 * once, or a tick after a failure, never send the same quarter twice.
 *
 * Then "Your two weeks are done", once per run, after its 14 days (never after
 * End now).
 *
 * THE LOCK SCREEN SHOWS ONLY TIMES (D-PRIVACY). Nothing a person wrote is ever
 * in a payload, and nothing is logged but a fixed tag and an error's message.
 */

import { auditEndsDueAsServer, auditPingsDueAsServer, markEndSentAsServer } from "@/src/db/auditRepo"
import { sendToPerson, type PushPayload } from "@/src/notifications/pushService"
import { ROUTES } from "@/src/shared/routes"
import { clockLabel, QUARTER_MS } from "./quarterService"

export const AUDIT_TITLE = "Time & energy audit"
const PINGS_PER_TICK = 200

/** The ping for one quarter. `slotAt` is the quarter's start. */
export function pingPayload(slotAt: string, timezone: string, sendId: string): PushPayload {
  const start = Date.parse(slotAt)
  const slotIso = new Date(start).toISOString()
  return {
    kind: "audit-ping",
    title: AUDIT_TITLE,
    body: `What did you do from ${clockLabel(start, timezone)} to ${clockLabel(start + QUARTER_MS, timezone)}?`,
    url: `${ROUTES.audit}?answer=${encodeURIComponent(slotIso)}&send=${sendId}`,
    tag: "audit-ping",
    slotAt: slotIso,
    sendId,
    actions: [
      { id: "same", title: "Same as before" },
      { id: "mute", title: "Mute 1 h" },
    ],
  }
}

export function endPayload(): PushPayload {
  return {
    kind: "audit-end",
    title: AUDIT_TITLE,
    body: "Your two weeks are done. See what takes your energy and what builds your life.",
    url: `${ROUTES.audit}?view=review`,
    tag: "audit-end",
  }
}

export const pingEntryId = (runId: string, slotAt: string) => `audit:${runId}:${Math.floor(Date.parse(slotAt) / 1000)}`

export interface PingClockResult {
  due: number
  sent: number
  failed: number
  ends: number
}

/** One tick: the pings due now, then the end notices. A failure for one person never stops the others. */
export async function runAuditPingClock(now: Date = new Date()): Promise<PingClockResult> {
  const result: PingClockResult = { due: 0, sent: 0, failed: 0, ends: 0 }
  const due = await auditPingsDueAsServer(PINGS_PER_TICK, now)
  result.due = due.length
  await Promise.all(
    due.map(async (row) => {
      try {
        const sent = await sendToPerson(row.userId, "audit-ping", (sendId) => pingPayload(row.slotAt, row.timezone, sendId), now, {
          entryId: pingEntryId(row.runId, row.slotAt),
        })
        if (sent.sendId) result.sent++
      } catch (error) {
        result.failed++
        console.error("[audit ping] not sent", error instanceof Error ? error.message : "unknown")
      }
    }),
  )

  const ends = await auditEndsDueAsServer(PINGS_PER_TICK, now)
  await Promise.all(
    ends.map(async (row) => {
      try {
        const sent = await sendToPerson(row.userId, "audit-end", () => endPayload(), now, { entryId: `audit-end:${row.runId}` })
        if (sent.sendId || sent.alreadySent) {
          await markEndSentAsServer(row.runId)
          result.ends++
        }
      } catch (error) {
        result.failed++
        console.error("[audit end] not sent", error instanceof Error ? error.message : "unknown")
      }
    }),
  )
  return result
}
