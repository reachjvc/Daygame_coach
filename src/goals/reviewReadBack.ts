/**
 * A REVIEW READS THE PERIOD BACK (Plans/life-plan-review-reads-back.md).
 *
 * Stefan, each week: "read over … what are my one-year goals, my three-month
 * goals, my one-month goals" (8kco2rjijjE); every two weeks: "are you on track,
 * are you making progress, are you behind" (GXhPOncX8CA). The owner's item 34:
 * a built-in way to see how well you did, by your own wishes.
 *
 * So for the period a review looks back over: each counted goal's count
 * against its number, each routine's ticks against what it plans, and what the
 * period before set out to bring. Worked out from the plan's own rows, like the
 * achievements; only the answer per goal is saved, on the review.
 *
 * Pure: the day is handed in.
 */

import type { NsGoal, NsPlan, NsRoutine } from "./types"
import { addDaysISO, goalsByPriority, isSystem, weekStartISO } from "./northStarService"
import { firstCountDays, practiceRateInWeek, rampWeek, weekCount } from "./northStarTrackService"
import { stepTick, NO_TRAINING_TICKS, type TrainingTicks } from "./dayTicks"
import { stepPerWeek } from "./planAchievementsService"
import { reviewFor, shiftPeriod, type ReviewPeriod } from "./reviewService"
import { latestReading, takesReadings, type Reading } from "./goalReadings"
import { isActive } from "./goalStatus"

/** A counted goal over the period. */
export interface CountedReadBack {
  goal: NsGoal
  /** What was logged in the period, up to today. */
  count: number
  /** The week's number, for a week; null for a longer period (it says weeks instead), or a week asking for none. */
  target: number | null
  /**
   * Weeks of the period on target, and the weeks it has had so far: from the
   * week it was first counted, leaving out weeks asking for none (a rest week
   * in a ramp), and a week still running only once met.
   */
  weeksMet: number
  weeks: number
}

/** A number goal over the period: where it stood at the period's end (or today), and its reading today. */
export interface NumberReadBack {
  goal: NsGoal
  /** The latest reading up to the period's end, or today when the period is still running. */
  latest: Reading | null
}

export interface GoalsReadBack {
  counted: CountedReadBack[]
  /** The number goals (body weight, bench), with their latest reading (Plans/life-plan-readings.md). */
  numbers: NumberReadBack[]
  /** The season's goals that are not counted: the ones this stretch is meant to be for. */
  season: NsGoal[]
  /** Every other goal, in priority order. */
  rest: NsGoal[]
  /** Goals achieved, paused or dropped inside the period. */
  changed: NsGoal[]
}

/** The Mondays of the weeks that start inside the period and have begun by today; a week review has its one. */
function weeksOf(period: ReviewPeriod, today: string): string[] {
  if (period.cadence === "week") return [weekStartISO(period.start)]
  const out: string[] = []
  const last = period.end < today ? period.end : today
  let monday = weekStartISO(period.start)
  if (monday < period.start) monday = addDaysISO(monday, 7)
  for (; monday <= last; monday = addDaysISO(monday, 7)) out.push(monday)
  return out
}

/** The goals, read back over the period: counted ones with their numbers, then the season's, then the rest. */
export function goalsReadBack(plan: NsPlan, period: ReviewPeriod, today: string): GoalsReadBack {
  const firsts = firstCountDays(plan)
  const last = period.end < today ? period.end : today
  const weeks = weeksOf(period, today)
  // The goals that were being worked on during the period: active ones, and
  // ones finished, paused or dropped only after it began, read back with
  // their counts like the rest. The ones that changed inside it are also
  // listed apart (`changed`); the ones set aside before it are left out.
  const all = goalsByPriority(plan)
  const ordered = all.filter((g) => isActive(g) || (g.statusOn != null && g.statusOn >= period.start))
  const counted: CountedReadBack[] = ordered.filter(isSystem).map((goal) => {
    let count = 0
    for (let d = period.start; d <= last; d = addDaysISO(d, 1)) count += plan.numbers?.[d]?.[goal.id] ?? 0
    const targetIn = (monday: string) => practiceRateInWeek(goal, rampWeek(plan, goal.id, monday, firsts))
    // A goal is judged from the week it was first counted: the weeks before it
    // was a habit are not weeks it missed.
    const first = firsts.get(goal.id)
    const from = first ? weekStartISO(first) : null
    let weeksMet = 0
    let weeksSoFar = 0
    for (const monday of weeks) {
      if (!from || monday < from) continue
      const target = targetIn(monday)
      if (target <= 0) continue
      const met = weekCount(plan, goal.id, monday) >= target
      if (met) weeksMet += 1
      if (met || addDaysISO(monday, 6) < today) weeksSoFar += 1
    }
    const weekTarget = period.cadence === "week" ? targetIn(weekStartISO(period.start)) : 0
    return { goal, count, target: weekTarget > 0 ? weekTarget : null, weeksMet, weeks: weeksSoFar }
  })
  // The season's number goals first: they are what this stretch is for.
  const numbers = [...ordered.filter((g) => takesReadings(g) && g.servesOneThing), ...ordered.filter((g) => takesReadings(g) && !g.servesOneThing)]
    .map((goal) => ({ goal, latest: latestReading(plan, goal.id, last) }))
  const other = ordered.filter((g) => !isSystem(g) && !takesReadings(g))
  const season = other.filter((g) => g.servesOneThing)
  const rest = other.filter((g) => !g.servesOneThing)
  const changed = all.filter((g) => !isActive(g) && g.statusOn != null && g.statusOn >= period.start && g.statusOn <= period.end)
  return { counted, numbers, season, rest, changed }
}

/** A goal's steps over the period (Plans/life-plan-dated-steps.md): null when it has none. */
export interface StepsReadBack {
  done: number
  total: number
  /** Ticked inside the period, by the day kept on the tick. */
  inPeriod: number
  /** Open with their day on or before the period's end (or today, while it runs). */
  behind: number
}

/**
 * As the steps stood at the period's end (or today, while it runs): done by
 * then, done inside it, and behind by then, a step due today not yet behind.
 * A step ticked before days were kept counts as done whenever it is read.
 */
export function stepsReadBack(goal: NsGoal, period: ReviewPeriod, today: string): StepsReadBack | null {
  if (goal.checkpoints.length === 0) return null
  const running = period.end >= today
  const doneBy = (c: NsGoal["checkpoints"][number]) => c.done && (c.doneOn == null || c.doneOn <= period.end)
  const dueBy = (day: string) => (running ? day < today : day <= period.end)
  return {
    done: goal.checkpoints.filter(doneBy).length,
    total: goal.checkpoints.length,
    inPeriod: goal.checkpoints.filter((c) => c.done && c.doneOn != null && c.doneOn >= period.start && c.doneOn <= period.end).length,
    behind: goal.checkpoints.filter((c) => !doneBy(c) && c.dueOn != null && dueBy(c.dueOn)).length,
  }
}

/** A routine over the period: its steps' ticks against what they plan. */
export interface RoutineReadBack {
  routine: NsRoutine
  done: number
  /** What its steps plan for the days of the period gone by so far, rounded: a daily step is one a day. */
  planned: number
}

/**
 * Each routine with steps, its ticks in the period (by hand or by a finished
 * workout) against its plan for the days of the period that have passed, so a
 * perfect week reads perfect on a Tuesday, and a month that ends on a
 * Saturday is not charged the rest of that week. (A step added during the
 * period is charged from the period's start: the plan does not record when a
 * step was added.)
 */
export function routinesReadBack(plan: NsPlan, period: ReviewPeriod, today: string, ticks: TrainingTicks = NO_TRAINING_TICKS): RoutineReadBack[] {
  const last = period.end < today ? period.end : today
  let days = 0
  for (let d = period.start; d <= last; d = addDaysISO(d, 1)) days += 1
  return plan.routines
    .filter((r) => r.steps.length > 0)
    .map((routine) => {
      let done = 0
      let planned = 0
      for (const step of routine.steps) {
        planned += (stepPerWeek(step) * days) / 7
        for (let d = period.start; d <= last; d = addDaysISO(d, 1)) if (stepTick(plan, d, step.id, ticks).done) done += 1
      }
      return { routine, done, planned: Math.round(planned) }
    })
}

/** What the period before, of the same kind, set out to bring; empty when nothing was written. */
export function previousOutcomes(plan: NsPlan, period: ReviewPeriod): { text: string; period: ReviewPeriod } | null {
  if (period.cadence === "fortnight") return null
  const before = shiftPeriod(period, -1)
  const text = reviewFor(plan, before)?.nextOutcomes.trim() ?? ""
  return text ? { text, period: before } : null
}
