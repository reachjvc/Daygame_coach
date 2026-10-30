/**
 * KEEPING THE NEXT REMINDER'S TIME TRUE.
 *
 * The clock only sends what `thought_prompt_schedule` says is due, so every
 * event that moves the next reminder writes it here: saving settings, logging
 * a thought (Q17: the wait restarts from your last answer), and the clock
 * itself after a send. The rule is `nextPromptAt` in ./schedule.ts.
 */

import { getUserTimezone } from "@/src/db/settingsRepo"
import { lastLogAt, readSettings } from "@/src/db/thoughtsRepo"
import { readPromptSchedule, writePromptSchedule } from "@/src/db/notificationsRepo"
import { latest, nextPromptAt } from "./schedule"

/**
 * Recompute and store the next reminder for this person.
 *
 * `switchedOn` is true when this save turned reminders on: the wait then
 * starts now, not from a log made days ago (which would make the first
 * reminder due at once).
 */
export async function reschedulePrompts(userId: string, options: { switchedOn?: boolean } = {}, now: Date = new Date()): Promise<Date | null> {
  const [settings, timezone, logAt, schedule] = await Promise.all([
    readSettings(userId),
    getUserTimezone(userId),
    lastLogAt(userId),
    readPromptSchedule(userId),
  ])
  const anchor = options.switchedOn ? now : (latest(logAt, schedule.lastSentAt) ?? now)
  const next = nextPromptAt(settings, timezone, anchor, now)
  await writePromptSchedule(userId, next)
  return next
}
