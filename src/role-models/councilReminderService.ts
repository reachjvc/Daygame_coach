/**
 * VALUE OF THE WEEK AND THE COUNCIL'S DAILY REMINDER (Plans/role-models.md, Phase 12).
 *
 * The value of the week copies Benjamin Franklin's little book (*Autobiography*):
 * one virtue a week, a mark for each day. The daily reminder is an invention,
 * labelled as one in the plan: opt-in, a time of day, sent through the push
 * path the weekly review reminder uses.
 *
 * QUIET HOURS. Nobody stores their own quiet hours yet (`quietHours.ts` holds
 * the rules, no table holds a setting), so the reminder keeps the house night:
 * nothing between 22:00 and 07:00 local, whatever is stored. The hours offered
 * are 07 to 21, and the clock checks again before it sends.
 */

import { readCouncilAsServer, councilRemindersDueAsServer, type CouncilSettings } from "@/src/db/roleModelsRepo"
import { closeSend, openSend } from "@/src/db/notificationsRepo"
import { periodOf } from "@/src/goals/reviewService"
import { sendToPerson, type PushPayload } from "@/src/notifications/pushService"
import { isAllowedAt, type QuietSettings } from "@/src/notifications/quietHours"
import { ROUTES } from "@/src/shared/routes"

import { shownPerson } from "./catalog"
import { memberForDay, visibleCouncil } from "./councilService"

export const COUNCIL_NIGHT: QuietSettings = { quietStart: 22 * 60, quietEnd: 7 * 60, activeDays: 0b1111111 }
export const REMIND_HOURS = { min: 7, max: 21 } as const

/** May a council reminder go out at this instant, in this zone? */
export function councilReminderAllowed(at: Date, timezone: string): boolean {
  return isAllowedAt(at, COUNCIL_NIGHT, timezone)
}

export function councilReminderEntryId(userId: string, localDay: string): string {
  return `council-daily:${userId}:${localDay}`
}

export function councilReminderPayload(name: string, pronoun: "he" | "she", taken: string[]): PushPayload {
  return {
    title: `Your council today: ${name}`,
    body: `Today, as if ${pronoun} were watching.${taken.length ? ` You take: ${taken.join(", ")}.` : ""}`,
    url: `${ROUTES.plan}?step=today`,
    tag: "council-daily",
    renotify: false,
  }
}

/** The Monday that starts the week holding `day`. */
export function weekOf(day: string): string {
  return periodOf("week", day).start
}

/** The value of the week, only in the week it was chosen for. */
export function weekValueFor(settings: Pick<CouncilSettings, "weekValue" | "weekOf">, day: string): string | null {
  if (!settings.weekValue || !settings.weekOf) return null
  return settings.weekOf === weekOf(day) ? settings.weekValue : null
}

/** The patch, or null when the body holds anything but these keys with their own types and ranges. */
export function readSettingsPatch(body: unknown): { weekValue?: string | null; remindOn?: boolean; remindHour?: number } | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null
  const patch: { weekValue?: string | null; remindOn?: boolean; remindHour?: number } = {}
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (key === "weekValue" && (value === null || (typeof value === "string" && value.trim().length > 0 && value.length <= 40))) patch.weekValue = value as string | null
    else if (key === "remindOn" && typeof value === "boolean") patch.remindOn = value
    else if (key === "remindHour" && Number.isInteger(value) && (value as number) >= REMIND_HOURS.min && (value as number) <= REMIND_HOURS.max) patch.remindHour = value as number
    else return null
  }
  return Object.keys(patch).length > 0 ? patch : null
}

/** The clock: each due person gets that day's council member, once a local day. */
export async function runCouncilReminderClock(now = new Date()): Promise<{ sent: number; skipped: number; failed: number }> {
  const result = { sent: 0, skipped: 0, failed: 0 }
  const rows = await councilRemindersDueAsServer(200, now)
  for (const row of rows) {
    try {
      const entryId = councilReminderEntryId(row.user_id, row.local_day)
      const members = visibleCouncil(await readCouncilAsServer(row.user_id))
      const member = memberForDay(members, row.local_day)
      const person = member ? shownPerson(member.roleModelId) : null
      if (!member || !person || !councilReminderAllowed(now, row.tz)) {
        // Nobody to show, or night: a record with nothing sent, so the clock stops asking today.
        const id = await openSend(row.user_id, "council-daily", now, entryId)
        if (id !== null) await closeSend(id, { devices: 0, delivered: 0, removed: 0 })
        result.skipped++
        continue
      }
      const out = await sendToPerson(row.user_id, "council-daily", () => councilReminderPayload(person.name, person.pronoun ?? "he", member.takenValues), now, { entryId })
      if (out.sendId) result.sent++
    } catch (error) {
      result.failed++
      console.error("[council reminder] not sent", error instanceof Error ? error.message : "unknown")
    }
  }
  return result
}
