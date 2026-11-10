/**
 * THE ONE THING — when it runs out, and how a screen says so.
 *
 * Its home is the plan's current season (`seasonService`), which builds the
 * `OneThing` below. Until Phase 7 of Plans/life-plan-rebuild.md it also had
 * rows of its own (`life_chapters`, `life_answers`) and the functions that read
 * them lived here; that copy is gone.
 *
 * Pure. The timezone arrives as an argument because a date is a question about
 * somebody's calendar and has no answer without knowing whose.
 */

import { getTodayInTimezone } from "@/src/shared/dateUtils"

/** How long a one thing runs when nobody says otherwise. */
export const DEFAULT_HORIZON_DAYS = 90

export interface OneThing {
  /** The version's own id — the particular wording. */
  id: string
  /** The chapter it belongs to. The chapter owns every date below. */
  chapterId: string
  /** What they wrote, in its newest wording. */
  body: string
  /** The instant that wording was written. */
  answeredAt: string
  /**
   * The day tracking runs FROM, and the reason chapters exist.
   *
   * Amending your wording does not move it. Moving the deadline does not move
   * it either — an extension is a new chapter that carries this across.
   */
  startedOn: string
  /** The day it runs until, YYYY-MM-DD in the user's timezone. */
  dueOn: string
  /** Days left, counted in the user's timezone. Negative once it has lapsed. */
  daysLeft: number
  /** True once `dueOn` is behind today. */
  lapsed: boolean
  /** How many wordings this chapter has had. 1 means it has never been amended. */
  wordings: number
  /** True when this chapter continued an earlier one because a deadline moved. */
  extended: boolean
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

/** The furthest ahead a one thing may run. A season, not a decade. */
export const MAX_HORIZON_YEARS = 5

/** The longest a written answer may be. Mirrors the CHECK in the migration. */
export const MAX_BODY_LENGTH = 2000

/**
 * IS THIS A DAY THAT EXISTS?
 *
 * `/^\d{4}-\d{2}-\d{2}$/` says yes to 2026-13-45, which then reached Postgres,
 * failed there, and came back to the person as "That did not save" — the right
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
 * THE THREE THINGS A PERSON CAN DO, AND WHAT EACH ONE COSTS.
 *
 * These are different acts and the whole design turns on keeping them apart:
 *
 *   amend  — you reworded it. Same commitment, same clock, a new wording added
 *            to the chapter. This is the common one, and it moves no date.
 *   extend — the words stand, the deadline moves. A new chapter that CONTINUES
 *            the old one and carries its `started_on` across, so the countdown
 *            changes and the "running since" does not.
 *   start  — a new commitment. A new chapter, starting today.
 */
export type OneThingAct = "amend" | "extend" | "start"

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

/** The day a date falls on, written the way every screen writes it. */
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

/**
 * HOW LONG YOU HAVE BEEN ON THIS, which amending must never reset.
 *
 * Shown beside the countdown once a chapter has been amended or extended,
 * because that is exactly when somebody would otherwise wonder whether their
 * clock had been restarted by a typo fix.
 *
 * AND ONCE IT HAS RUN A DAY, given `today`. The one thing is a season's
 * sentence since Plans/life-plan-rebuild.md, Phase 3, and a season keeps its
 * start through every reword and deadline move but counts neither, so
 * `wordings` is always 1 and the line never showed. A season begun before
 * today has a clock worth stating.
 */
export function runningSince(current: OneThing | null, today?: string | null): string | null {
  if (!current) return null
  const amended = current.wordings > 1 || current.extended
  const running = !!today && current.startedOn < today
  if (!amended && !running) return null
  return `Running since ${formatDueDate(current.startedOn)}`
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
