/**
 * THE ONE THING — what it is, when it runs out, and what it used to be.
 *
 * Every screen that shows your one thing asks this file, and this file reads
 * the newest row. Nothing anywhere keeps a copy, which is why the header on the
 * tracking page cannot go stale — there is no second place for it to be wrong.
 *
 * Pure functions over rows. The database access is in `lifeAnswerRepo`; the
 * timezone arrives as an argument because a date is a question about somebody's
 * calendar and has no answer without knowing whose.
 */

import { getTodayInTimezone } from "@/src/shared/dateUtils"
import type { LifeAnswerRow } from "@/src/db/lifeAnswerRepo"

/** How long a one thing runs when nobody says otherwise. */
export const DEFAULT_HORIZON_DAYS = 90

export interface OneThing {
  id: string
  /** What they wrote. */
  body: string
  /** The instant it was written, as stored. */
  answeredAt: string
  /** The day it runs until, YYYY-MM-DD in the user's timezone. */
  dueOn: string
  /** Days left, counted in the user's timezone. Negative once it has lapsed. */
  daysLeft: number
  /** True once `dueOn` is behind today. */
  lapsed: boolean
}

/**
 * WHOLE DAYS BETWEEN TWO CALENDAR DATES.
 *
 * Both sides are YYYY-MM-DD, so this is arithmetic on calendar days and not on
 * elapsed seconds. That matters at a daylight-saving boundary, where 90 × 24
 * hours lands an hour short and quietly moves the date.
 */
export function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split("-").map(Number)
  const [ty, tm, td] = toISO.split("-").map(Number)
  const from = Date.UTC(fy, fm - 1, fd)
  const to = Date.UTC(ty, tm - 1, td)
  return Math.round((to - from) / 86_400_000)
}

/** Add calendar days to a YYYY-MM-DD, staying on the calendar. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate()
  ).padStart(2, "0")}`
}

/** The default deadline for something written today, in the user's timezone. */
export function defaultDueOn(timezone: string, horizonDays = DEFAULT_HORIZON_DAYS): string {
  return addDays(getTodayInTimezone(timezone), horizonDays)
}

/** One row, with the countdown worked out for the user's calendar. */
function toOneThing(row: LifeAnswerRow, today: string): OneThing {
  const daysLeft = daysBetween(today, row.due_on)
  return {
    id: row.id,
    body: row.body,
    answeredAt: row.answered_at,
    dueOn: row.due_on,
    daysLeft,
    lapsed: daysLeft < 0,
  }
}

/**
 * WHAT MY ONE THING IS: the newest row, or nothing.
 *
 * `rows` arrives newest-first from the repo. "Current" is not a stored flag and
 * never can be — a flag is a second fact that can disagree with the first.
 */
export function currentOneThing(rows: LifeAnswerRow[], timezone: string): OneThing | null {
  if (rows.length === 0) return null
  return toOneThing(rows[0], getTodayInTimezone(timezone))
}

/**
 * WHAT IT USED TO BE: everything except the current one, newest first.
 *
 * The current one is excluded because the history tab sits beside the thing it
 * is the history OF, and showing today's answer at the top of "the ones before"
 * reads as though it had already been replaced.
 */
export function pastOneThings(rows: LifeAnswerRow[], timezone: string): OneThing[] {
  const today = getTodayInTimezone(timezone)
  return rows.slice(1).map((row) => toOneThing(row, today))
}

/**
 * WHETHER WRITING THIS WOULD CHANGE ANYTHING.
 *
 * Saving the same words again must not append a row, or a page that saves on
 * blur turns one afternoon of typing into forty entries of history. Compared on
 * the trimmed text, because a trailing space is not a new answer.
 */
export function isSameAsCurrent(rows: LifeAnswerRow[], body: string): boolean {
  if (rows.length === 0) return false
  return rows[0].body.trim() === body.trim()
}

/** What the header says when there is nothing to show. */
export type OneThingState = "set" | "lapsed" | "none"

export function oneThingState(current: OneThing | null): OneThingState {
  if (!current) return "none"
  return current.lapsed ? "lapsed" : "set"
}
