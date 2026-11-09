/**
 * QUIET HOURS AND ALLOWED INSTANTS, as pure functions.
 *
 * Moved out of the Thoughts schedule (Plans/energy-audit.md, Phase 1): the
 * audit's pings use the same quiet-hours rule. Nothing here reads a clock.
 *
 * Quiet hours and inactive days are read in the PERSON's zone, and an instant
 * inside them moves to the first allowed minute after. Quiet hours may span
 * midnight. Weekdays are the local calendar day of the moment itself, so 23:00
 * on a Sunday is Sunday. Every wall-clock time is turned into an instant
 * through `localTimeInstant`, which resolves the offset at the instant itself,
 * so 08:00 is 08:00 on both sides of a clock change.
 */

import { getTodayInTimezone, isoWeekdayInTimezone, localTimeInstant, toZonedDate } from "@/src/shared/dateUtils"

export interface QuietSettings {
  quietStart: number | null
  quietEnd: number | null
  activeDays: number
}

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
export function isAllowedAt(at: Date, settings: QuietSettings, timezone: string): boolean {
  if ((settings.activeDays & dayBit(isoWeekdayInTimezone(timezone, at))) === 0) return false
  const local = toZonedDate(at, timezone)
  return !inQuietHours(local.getHours() * 60 + local.getMinutes(), settings.quietStart, settings.quietEnd)
}

/**
 * The first instant at or after `from` when a reminder may go out, or null if
 * there is none in the next fortnight (not reachable with valid settings: at
 * least one day is active and quiet hours never cover a whole day).
 */
export function firstAllowedAtOrAfter(from: Date, settings: QuietSettings, timezone: string): Date | null {
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
    // Never stand still: a local time that does not exist on a clock-change
    // day (zones that jump at midnight, America/Santiago among them) can
    // resolve to an instant at or before `at`. A minute at a time could not
    // cross a one-hour gap within the loop's steps; an hour always does.
    at = next.getTime() > at.getTime() ? next : new Date(at.getTime() + 60 * MINUTE)
  }
  return null
}
