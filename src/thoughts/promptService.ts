/**
 * THE REMINDERS: keeping the next one's time true, and sending the ones due.
 *
 * The clock only sends what `thought_prompt_schedule` says is due, so every
 * event that moves the next reminder writes it here: saving settings, logging
 * a thought (Q17: the wait restarts from your last answer), and the clock
 * itself after a send. The rule is `nextPromptAt` in ./schedule.ts.
 */

import { getUserTimezone } from "@/src/db/settingsRepo"
import { lastLogAt, readSettings, readThoughtsAsServer } from "@/src/db/thoughtsRepo"
import { claimDuePrompts, readPromptSchedule, timezoneAsServer, writePromptSchedule } from "@/src/db/notificationsRepo"
import { sendToPerson, type PushPayload } from "@/src/notifications/pushService"
import { ROUTES } from "@/src/shared/routes"
import { latest, nextPromptAt } from "./schedule"
import { sortForButtons } from "./thoughtsService"

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

/** A claimed reminder is not due again for this long, unless the sender writes the real next time first. */
export const CLAIM_LEASE_SECONDS = 300
/** How late the stored time may be against the rules before it is treated as not due yet. */
const SLACK_MS = 30_000

export const PROMPT_TITLE = "What's on your mind?"
export const PROMPT_BODY = "Tap to log your last thought."
const ACTION_TITLE_MAX = 40

/** Where a reminder opens: the quick-log sheet, carrying the reminder's id. */
export function promptUrl(sendId: string | null): string {
  return sendId ? `${ROUTES.thoughts}?log=1&prompt=${sendId}` : `${ROUTES.thoughts}?log=1`
}

/**
 * THE REMINDER ITSELF. Generic unless the person switched "show thoughts" on
 * (Q6): then their two most frequent thoughts become buttons on it, which the
 * worker logs without opening the app — and which anyone glancing at the lock
 * screen can read, which is why it is off by default.
 */
export function promptPayload(sendId: string, buttons: { id: string; text: string }[]): PushPayload {
  return {
    title: PROMPT_TITLE,
    body: PROMPT_BODY,
    url: promptUrl(sendId),
    tag: "thought-prompt",
    promptId: sendId,
    actions: buttons.slice(0, 2).map((b) => ({
      id: b.id,
      title: b.text.length > ACTION_TITLE_MAX ? `${b.text.slice(0, ACTION_TITLE_MAX - 1)}…` : b.text,
    })),
  }
}

export interface ClockResult {
  claimed: number
  sent: number
  skipped: number
  failed: number
}

/**
 * ONE TICK OF THE CLOCK: take every reminder due now, check it against the
 * rules once more, send it, and write the next time.
 *
 * The second check is not redundant. The stored time was computed when it was
 * last written; a log since then whose reschedule failed, a pause, or a change
 * of zone can make it early. The rules at this moment win, and a reminder
 * that is not due yet just gets its correct time written.
 *
 * A person whose send throws keeps the lease the claim gave them, so they are
 * tried again in five minutes rather than every minute.
 */
export async function runPromptClock(now: Date = new Date(), limit = 200): Promise<ClockResult> {
  const due = await claimDuePrompts(now, CLAIM_LEASE_SECONDS, limit)
  const result: ClockResult = { claimed: due.length, sent: 0, skipped: 0, failed: 0 }

  await Promise.all(
    due.map(async ({ userId }) => {
      try {
        const [settings, timezone, logAt, schedule] = await Promise.all([
          readSettings(userId, true),
          timezoneAsServer(userId),
          lastLogAt(userId, true),
          readPromptSchedule(userId),
        ])
        const anchor = latest(logAt, schedule.lastSentAt) ?? new Date(0)
        const expected = nextPromptAt(settings, timezone, anchor, now)
        if (expected === null || expected.getTime() > now.getTime() + SLACK_MS) {
          await writePromptSchedule(userId, expected)
          result.skipped++
          return
        }

        const buttons = settings.showThoughts
          ? sortForButtons(await readThoughtsAsServer(userId, timezone, now)).map((t) => ({ id: t.id, text: t.text }))
          : []
        const sent = await sendToPerson(userId, "thought-prompt", (sendId) => promptPayload(sendId, buttons), now)
        await writePromptSchedule(userId, nextPromptAt(settings, timezone, now, now), now)
        if (sent.sendId) result.sent++
        else result.skipped++
      } catch (error) {
        result.failed++
        console.error("[thoughts clock] a reminder failed", error instanceof Error ? error.message : "unknown")
      }
    }),
  )
  return result
}
