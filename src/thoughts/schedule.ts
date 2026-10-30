/**
 * WHEN THE NEXT REMINDER IS DUE, as one pure function.
 *
 * The server's clock and a future native app (Plans/thought.md, R4) must
 * agree on this, so it takes everything as arguments and reads no clock.
 *
 * THE RULES (Plans/thought.md Q5, Q16, Q17):
 *   - The interval counts from the later of the last log and the last
 *     reminder, so answering by hand restarts the wait (Q17).
 *   - Nothing is caught up: if the due time has passed (the clock was down,
 *     the phone was off), the next one is now, once, never a burst (Q16).
 *   - A pause moves it to the end of the pause.
 *   - Quiet hours and inactive days are read in the PERSON's zone, and a due
 *     time inside them moves to the first allowed minute after. Quiet hours
 *     may span midnight. Weekdays are the local calendar day of the moment
 *     itself, so 23:00 on a Sunday is Sunday.
 *
 * Clock changes: every wall-clock time is turned into an instant through
 * `localTimeInstant`, which resolves the offset at the instant itself, so
 * 08:00 is 08:00 on both sides of a change.
 */

import { getTodayInTimezone, isoWeekdayInTimezone, localTimeInstant, toZonedDate } from "@/src/shared/dateUtils"
import type { ThoughtSettings } from "./types"

type ScheduleSettings = Pick<
  ThoughtSettings,
  "remindersOn" | "intervalMinutes" | "quietStart" | "quietEnd" | "activeDays" | "pausedUntil"
>

const MINUTE = 60_000

/** Is local minute-of-day `m` inside quiet hours? */
export function inQuietHours(m: number, quietStart: number | null, quietEnd: number | null): boolean {
  if (quietStart === null || quietEnd === null) return false
  return quietStart < quietEnd ? m >= quietStart && m < quietEnd : m >= quietStart || m < quietEnd
}

/** Bit for an ISO weekday (1 = Monday ... 7 = Sunday). */
export function dayBit(isoWeekday: number): number {
  return 1 << (isoWeekday - 1)
}

function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

function nextDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/** May a reminder go out at this instant? */
export function isAllowedAt(at: Date, settings: ScheduleSettings, timezone: string): boolean {
  if ((settings.activeDays & dayBit(isoWeekdayInTimezone(timezone, at))) === 0) return false
  const local = toZonedDate(at, timezone)
  return !inQuietHours(local.getHours() * 60 + local.getMinutes(), settings.quietStart, settings.quietEnd)
}

/**
 * The first instant at or after `from` when a reminder may go out, or null if
 * there is none in the next fortnight (not reachable with valid settings: at
 * least one day is active and quiet hours never cover a whole day).
 */
export function firstAllowedAtOrAfter(from: Date, settings: ScheduleSettings, timezone: string): Date | null {
  let at = from
  for (let step = 0; step < 32; step++) {
    if (isAllowedAt(at, settings, timezone)) return at

    const dayKey = getTodayInTimezone(timezone, at)
    const local = toZonedDate(at, timezone)
    const minute = local.getHours() * 60 + local.getMinutes()
    const dayActive = (settings.activeDays & dayBit(isoWeekdayInTimezone(timezone, at))) !== 0
    const { quietStart: qs, quietEnd: qe } = settings

    let next: Date
    if (dayActive && qs !== null && qe !== null && inQuietHours(minute, qs, qe)) {
      // Inside quiet hours on an active day: jump to where they end. When they
      // span midnight and it is the evening part, that is tomorrow morning.
      const endsToday = qs < qe || minute < qe
      next = new Date(localTimeInstant(endsToday ? dayKey : nextDateKey(dayKey), hhmm(qe), timezone))
    } else {
      // An inactive day: the start of the next local day, which the next turn
      // of the loop checks against quiet hours and the day again.
      next = new Date(localTimeInstant(nextDateKey(dayKey), "00:00", timezone))
    }
    // Never stand still: a non-existent local time on a clock-change day can
    // resolve to an instant at or before `at`.
    at = next.getTime() > at.getTime() ? next : new Date(at.getTime() + MINUTE)
  }
  return null
}

/**
 * The next reminder, or null when reminders are off.
 *
 * `anchor` is the later of the last log and the last reminder, or the moment
 * reminders were switched on.
 */
export function nextPromptAt(settings: ScheduleSettings, timezone: string, anchor: Date, now: Date): Date | null {
  if (!settings.remindersOn) return null
  let at = new Date(Math.max(anchor.getTime() + settings.intervalMinutes * MINUTE, now.getTime()))
  if (settings.pausedUntil !== null) {
    const pause = Date.parse(settings.pausedUntil)
    if (pause > at.getTime()) at = new Date(pause)
  }
  return firstAllowedAtOrAfter(at, settings, timezone)
}

/** The later of the instants given, ignoring nulls; null if all are null. */
export function latest(...instants: (string | Date | null | undefined)[]): Date | null {
  let best: number | null = null
  for (const i of instants) {
    if (i === null || i === undefined) continue
    const t = typeof i === "string" ? Date.parse(i) : i.getTime()
    if (!Number.isNaN(t) && (best === null || t > best)) best = t
  }
  return best === null ? null : new Date(best)
}
