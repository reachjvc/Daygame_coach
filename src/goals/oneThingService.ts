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
 *
 * THE DEADLINE IS HALF THE ANSWER, and leaving it out of this comparison is
 * what made it uneditable: "quit weed for 100 days, until December" and the
 * same sentence until February are two different commitments, and for months
 * the second one could not be written down. Changing only the date IS a change,
 * appends a row like any other, and the one before it keeps the date it had.
 *
 * `dueOn` is optional so a caller that genuinely only asks about the words —
 * there are none today — keeps the old meaning rather than silently comparing
 * against `undefined`.
 */
export function isSameAsCurrent(rows: LifeAnswerRow[], body: string, dueOn?: string): boolean {
  if (rows.length === 0) return false
  if (rows[0].body.trim() !== body.trim()) return false
  return dueOn === undefined || rows[0].due_on === dueOn
}

/** The furthest ahead a one thing may run. A season, not a decade. */
export const MAX_HORIZON_YEARS = 5

/**
 * IS THIS A DAY THAT EXISTS?
 *
 * `/^\d{4}-\d{2}-\d{2}$/` says yes to 2026-13-45, which then reaches Postgres,
 * fails there, and comes back to the person as "That did not save" — the right
 * refusal for the wrong reason, with nothing they could act on. Round-tripping
 * through the calendar is the only check that knows February has 28 days.
 */
export function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [y, m, d] = iso.split("-").map(Number)
  const back = new Date(Date.UTC(y, m - 1, d))
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d
}

/**
 * WHY THIS DEADLINE WILL NOT DO, in words the person can act on, or null.
 *
 * A deadline in the past saved perfectly happily and the header then said "this
 * one has run its course" about a sentence written ten seconds ago. Nothing
 * refused it and nothing explained it. `today` is the caller's day in the
 * USER's timezone — a deadline is a question about somebody's calendar and the
 * server's UTC day is not an answer to it.
 */
export function dueOnProblem(dueOn: string, today: string): string | null {
  if (!isRealDate(dueOn)) return "That is not a date on the calendar — pick a day."
  if (daysBetween(today, dueOn) < 0) return "That day has already been. Pick one that is still ahead of you."
  if (daysBetween(today, dueOn) > MAX_HORIZON_YEARS * 366) {
    return `A one thing runs for a season, not a decade — pick a day within ${MAX_HORIZON_YEARS} years.`
  }
  return null
}

/**
 * HOW MUCH ROAD IS LEFT, as the one fact every screen asks about.
 *
 * The tracking header and the step both drew their own countdown and their own
 * wording, which is two places for one rule and therefore two places to get it
 * wrong. This is that rule.
 *
 * `ending` exists because the request was to prompt people as the dates shift.
 * A one thing that runs out on Friday and says nothing until Saturday leaves
 * somebody with no season and no warning; a fortnight is long enough to think
 * about what comes next and short enough that it is not nagging from day one.
 */
export const ENDING_SOON_DAYS = 14

export type OneThingStage = "none" | "running" | "ending" | "lapsed"

export function oneThingStage(current: OneThing | null): OneThingStage {
  if (!current) return "none"
  if (current.lapsed) return "lapsed"
  return current.daysLeft <= ENDING_SOON_DAYS ? "ending" : "running"
}

/** The day a deadline falls on, written the way both screens write it. */
export function formatDueDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

/**
 * WHAT THE COUNTDOWN SAYS, wherever it is drawn.
 *
 * Always carries the day itself, not only the number of sleeps: "120 days left"
 * is not something anybody can put in a calendar, and the date was typed on the
 * form by the person reading this.
 */
export function oneThingCountdown(current: OneThing | null): string {
  if (!current) return ""
  const day = formatDueDate(current.dueOn)
  const n = Math.abs(current.daysLeft)
  const days = n === 1 ? "day" : "days"
  if (current.lapsed) return `Ran out ${day}, ${n} ${days} ago — name the next one`
  if (current.daysLeft === 0) return `Last day — it runs out today, ${day}`
  return `${current.daysLeft} ${days} left, until ${day}`
}

/** The longest a written answer may be. Mirrors the CHECK in the migration. */
export const MAX_BODY_LENGTH = 2000

/**
 * WHAT WRITING THIS SHOULD DO — refuse it, do nothing, or append a row.
 *
 * One function, because the three answers depend on each other and used to be
 * spread across the route as three separate ifs. It is also the only place that
 * knows the rule that broke twice: **the deadline counts as part of the answer
 * only when the caller named one.** Compared against the server's rolling
 * ninety-day default instead, the identical request sent on two different days
 * looks like two different answers and appends a duplicate row.
 *
 * `timezone` is the user's, because "has that day already been" is a question
 * about their calendar and the server's UTC day is not an answer to it.
 */
export type OneThingWrite =
  | { kind: "reject"; reason: string }
  | { kind: "unchanged" }
  | { kind: "append"; dueOn: string }

export function planOneThingWrite(
  rows: LifeAnswerRow[],
  rawBody: unknown,
  askedDueOn: unknown,
  timezone: string,
): OneThingWrite {
  const body = typeof rawBody === "string" ? rawBody.trim() : ""
  if (!body || body.length > MAX_BODY_LENGTH) {
    return { kind: "reject", reason: `Write something, and keep it under ${MAX_BODY_LENGTH} characters` }
  }

  const asked = typeof askedDueOn === "string" ? askedDueOn : null
  const dueOn = asked ?? defaultDueOn(timezone)
  const problem = dueOnProblem(dueOn, getTodayInTimezone(timezone))
  if (problem) return { kind: "reject", reason: problem }

  // `asked ?? undefined` and not `dueOn`: see the note above.
  if (isSameAsCurrent(rows, body, asked ?? undefined)) return { kind: "unchanged" }
  return { kind: "append", dueOn }
}

/**
 * THE DEADLINE A FORM SHOULD OPEN ON.
 *
 * The saved one while it still has road left — so a picker reflects what is
 * actually committed to — and a fresh horizon once it has run out. Following a
 * lapsed deadline is a trap: the page asks for the next one thing, the form
 * posts the date that has already been, and the server refuses it, correctly,
 * leaving somebody in a loop with a refusal and no way out of it.
 *
 * `lapsed` was decided on the server in the user's own timezone, so this does
 * not re-open the date question in a browser that may be set to anything.
 */
export function nextDueOn(current: OneThing | null, freshDefault: string): string {
  return current && !current.lapsed ? current.dueOn : freshDefault
}

/**
 * WHETHER TO ASK FOR THE NEXT ONE, and nothing else.
 *
 * Separate from the countdown because the countdown is always shown and this is
 * not: a prompt on a one thing with three months to run is noise, and noise is
 * how a real prompt gets ignored three months later.
 */
export function oneThingPrompt(current: OneThing | null): string | null {
  const stage = oneThingStage(current)
  if (stage === "lapsed") return "This season is over. Write the one thing for the next one."
  if (stage === "ending") return "This one is nearly up — worth deciding now what comes after it."
  return null
}

/** What the header says when there is nothing to show. */
export type OneThingState = "set" | "lapsed" | "none"

export function oneThingState(current: OneThing | null): OneThingState {
  if (!current) return "none"
  return current.lapsed ? "lapsed" : "set"
}
