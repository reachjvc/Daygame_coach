/**
 * THE WEEKLY REVIEW REMINDER'S CLOCK (Plans/life-plan-after-setup.md, Phase 5, d4).
 *
 * Called once a minute by the notifications tick. For each person whose day
 * and hour have come (in their zone, first 20 minutes; `plan_reviews_due`):
 * when that week's review is already written, a record with no devices so the
 * clock stops asking; otherwise one push. The payload is built from the period
 * alone, so nothing the person wrote can reach the notification.
 */

import { sendToPerson, type PushPayload } from "@/src/notifications/pushService"
import { ROUTES } from "@/src/shared/routes"
import { closeSend, openSend } from "@/src/db/notificationsRepo"
import { remindersDueAsServer, weekReviewWrittenAsServer, type Reminder } from "@/src/db/lifePlanRemindersRepo"
import { periodLabel, periodOf, reviewIdFor, type ReviewPeriod } from "./reviewService"
import { dueWeekPeriod } from "./dueNowService"

export function reminderPayload(p: ReviewPeriod): PushPayload {
  return {
    title: "Weekly review",
    body: `Look back at ${periodLabel(p)}: score, magic moments, next week.`,
    url: `${ROUTES.plan}?step=review&period=${reviewIdFor(p)}`,
    tag: "plan-review",
    renotify: false,
  }
}

/**
 * The one-send key: the Monday of the local ISO week the reminder goes out in
 * (Phase 6). The unique index on it allows one record per person per week, so
 * moving the reminder day mid-week cannot send a second one. Matches the SQL in
 * 20261109170000_plan_review_one_per_week.sql character for character.
 */
export function reminderEntryId(userId: string, localDay: string): string {
  return `plan-review:${userId}:${periodOf("week", localDay).start}`
}

export async function runPlanReviewClock(now = new Date()): Promise<{ sent: number; skipped: number; failed: number }> {
  const result = { sent: 0, skipped: 0, failed: 0 }
  const rows = await remindersDueAsServer(200, now)
  for (const row of rows) {
    try {
      const p = dueWeekPeriod(row.local_day, row.review_day)
      const entryId = reminderEntryId(row.user_id, row.local_day)
      if (await weekReviewWrittenAsServer(row.user_id, p.start)) {
        // Written already: a record with nothing sent, so the clock stops asking this week.
        const id = await openSend(row.user_id, "plan-review", now, entryId)
        if (id !== null) await closeSend(id, { devices: 0, delivered: 0, removed: 0 })
        result.skipped++
      } else {
        // sendToPerson opens the record itself; opening one first would make it refuse.
        const out = await sendToPerson(row.user_id, "plan-review", () => reminderPayload(p), now, { entryId })
        if (out.sendId) result.sent++
      }
    } catch (error) {
      result.failed++
      console.error("[plan review] not sent", error instanceof Error ? error.message : "unknown")
    }
  }
  return result
}

/** The patch, or null when the body holds anything but the three keys with their own types and ranges. */
export function readReminderPatch(body: unknown): Partial<Reminder> | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null
  const patch: Partial<Reminder> = {}
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (key === "pushOn" && typeof value === "boolean") patch.pushOn = value
    else if (key === "reviewDay" && Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 7) patch.reviewDay = value as number
    else if (key === "reviewHour" && Number.isInteger(value) && (value as number) >= 6 && (value as number) <= 22) patch.reviewHour = value as number
    else return null
  }
  return Object.keys(patch).length > 0 ? patch : null
}
