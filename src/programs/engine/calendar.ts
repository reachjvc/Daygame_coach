/**
 * WHERE IN THE PROGRAM TODAY IS — the day, the week, the cycle, and whether
 * it is over.
 *
 * Two ways of counting weeks (Q8). By WORKOUTS COMPLETED, the way the app has
 * always counted: the cursor walks the days in order, a full pass is a week,
 * and a program with no length counts passes as cycles and never has a week 2.
 * By the CALENDAR, from the day the program started: Monday-to-Sunday weeks,
 * so skipping a Friday does not freeze the program in week 3 — the sheet the
 * owner trains from works this way.
 *
 * And two ways of picking the day: in order (the cursor), or by today's
 * weekday, where a day with nothing on it is a rest day that still says what
 * comes next.
 *
 * At the end (Q9): "repeat" starts again at week 1 of the next cycle;
 * "finish" lets the counter run one past the last week, which is what
 * `complete` reads.
 */

import { daysBetweenDateKeys } from "@/src/shared/dateUtils"
import type { EnrollmentCursor } from "../types"
import type { ProgramSpec } from "../spec/types"
import { weekSetHas } from "../spec/weeks"

export interface Clock {
  /** Today on the account's calendar, `YYYY-MM-DD`. */
  today?: string
  /** 1 = Monday … 7 = Sunday, on the account's calendar. */
  todayWeekday?: number
}

export interface Placement {
  dayIndex: number
  /** The week of the program, 1-based. Always 1 for an open-ended program. */
  week: number
  cycle: number
  /** The program has run past its last week and was written to finish. */
  complete: boolean
  /** Nothing is on today's weekday; `dayIndex` is the next session. */
  restDay: boolean
  scheduledWeekday?: number
  phase?: string
  deload: boolean
  test: boolean
}

/** Monday of the week a date falls in, as days since the epoch. */
function mondayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number)
  const at = Date.UTC(y, m - 1, d)
  const dow = new Date(at).getUTCDay() // 0 = Sunday
  return Math.round(at / 86_400_000) - ((dow + 6) % 7)
}

/** The calendar week of `today` counted from the week `startedOn` is in: that week is 1. */
export function calendarWeek(startedOn: string, today: string): number {
  if (daysBetweenDateKeys(startedOn, today) < 0) return 1
  return Math.floor((mondayOf(today) - mondayOf(startedOn)) / 7) + 1
}

/** Today's day on a weekday program, or the next one with `restDay`. Null if nothing is pinned. */
export function dayForToday(
  spec: ProgramSpec,
  todayWeekday: number
): { dayIndex: number; restDay: boolean; scheduledWeekday: number; wrapsIntoNextWeek: boolean } | null {
  const pinned = spec.days.map((d, i) => ({ i, w: d.weekday })).filter((d): d is { i: number; w: number } => d.w != null)
  if (pinned.length === 0) return null
  const today = pinned.find((d) => d.w === todayWeekday)
  const next =
    today ?? [...pinned].sort((a, b) => ((a.w - todayWeekday + 7) % 7) - ((b.w - todayWeekday + 7) % 7))[0]
  return { dayIndex: next.i, restDay: !today, scheduledWeekday: next.w, wrapsIntoNextWeek: !today && next.w < todayWeekday }
}

/** The phase label and deload/test marks for a week. */
function weekMarks(spec: ProgramSpec, week: number) {
  const c = spec.calendar
  const phase = c.phases?.find((p) => weekSetHas(p.weeks, week))?.label
  return {
    ...(phase ? { phase } : {}),
    deload: weekSetHas(c.deloadWeeks, week),
    test: weekSetHas(c.testWeeks, week),
  }
}

/**
 * Where the program is. `dayIndex` forces a day (the person chose one); the
 * clock is the account's, and only weekday and calendar programs read it.
 */
export function place(
  spec: ProgramSpec,
  cursor: EnrollmentCursor,
  opts: { clock?: Clock; startedOn?: string; dayIndex?: number } = {}
): Placement {
  const { calendar } = spec
  const length = calendar.lengthWeeks
  let dayIndex = cursor.dayIndex
  let restDay = false
  let scheduledWeekday: number | undefined
  let nextWeek = false

  if (opts.dayIndex != null) {
    dayIndex = opts.dayIndex
    scheduledWeekday = spec.days[dayIndex]?.weekday
  } else if (calendar.days === "weekdays" && opts.clock?.todayWeekday != null) {
    const picked = dayForToday(spec, opts.clock.todayWeekday)
    if (picked) {
      dayIndex = picked.dayIndex
      restDay = picked.restDay
      scheduledWeekday = picked.scheduledWeekday
      nextWeek = picked.wrapsIntoNextWeek
    }
  }

  let week = cursor.week
  let cycle = cursor.cycle
  let complete = false
  if (calendar.weekCounting === "calendar" && opts.startedOn && opts.clock?.today) {
    const running = calendarWeek(opts.startedOn, opts.clock.today) + (nextWeek ? 1 : 0)
    if (length == null) {
      week = 1
      cycle = 1
    } else if (calendar.atEnd === "repeat") {
      cycle = Math.floor((running - 1) / length) + 1
      week = ((running - 1) % length) + 1
    } else {
      cycle = 1
      week = running
      complete = running > length
    }
  } else if (length != null && calendar.atEnd === "finish") {
    complete = week > length
  }

  return {
    dayIndex,
    week,
    cycle,
    complete,
    restDay,
    ...(scheduledWeekday != null ? { scheduledWeekday } : {}),
    ...weekMarks(spec, Math.min(week, length ?? week)),
  }
}

/**
 * The cursor after a session on `doneDayIndex`. Advances from the day that was
 * DONE, so logging out of order continues from there — the old engine's rule.
 */
export function advance(spec: ProgramSpec, cursor: EnrollmentCursor, doneDayIndex: number): EnrollmentCursor {
  const next: EnrollmentCursor = { ...cursor, sessionCount: cursor.sessionCount + 1, dayIndex: doneDayIndex + 1 }
  if (next.dayIndex < spec.days.length) return next
  next.dayIndex = 0
  const length = spec.calendar.lengthWeeks
  if (length == null) {
    next.cycle = cursor.cycle + 1
    return next
  }
  next.week = cursor.week + 1
  if (next.week > length) {
    if (spec.calendar.atEnd === "repeat") {
      next.week = 1
      next.cycle = cursor.cycle + 1
    } else {
      // Finished: one past the end, which is what `place` reads as complete.
      next.week = length + 1
    }
  }
  return next
}
