/**
 * ACHIEVEMENTS ON THE PLAN, worked out from what you did (Plans/life-plan-achievements.md; Q11).
 *
 * The owner's words (docs/product/life-mastery-concept.md, item 22): a goal to
 * train four times a week has no day it is finished, so instead of a date it
 * can have achievements; "100 approaches in all, or 10 in one day", even when
 * the goal is 25 a week, or the goal is a girlfriend and approaching is the
 * system built for it. Item 30: they have to connect to whatever goals people
 * write themselves. Item 32: how you celebrate yourself afterwards. Stefan:
 * "whatever gets rewarded gets repeated", and a review starts with what was
 * good.
 *
 * So the rules are written once and apply to every goal and every routine
 * step, never one badge per goal:
 *   - a counted goal (Today's "Log one"): its first one, totals, a best day
 *     (for goals that count things, not sessions), and weeks on target in a
 *     row;
 *   - a routine step: times done, and weeks done as planned in a row;
 *   - a milestone reached, an experience done, and weekly reviews in a row.
 *
 * NOTHING IS STORED, as for the old goals' badges (`goalAchievementRules.ts`):
 * every achievement is a function of rows the plan already holds, so it can
 * never disagree with them, and a count taken back takes its achievement with
 * it. Each carries the day it was earned where the rows can say it.
 *
 * Pure: the day is handed in.
 */

import type { NsGoal, NsPlan, NsReview, NsRoutineStep } from "./types"
import { addDaysISO, isSystem, weekStartISO } from "./northStarService"
import { firstCountDays, isEveryDay, practiceRateInWeek, rampWeek, steadyRate } from "./northStarTrackService"
import { stepTick, NO_TRAINING_TICKS, type TrainingTicks } from "./dayTicks"

/** Totals a counted goal can reach. */
export const GOAL_TOTALS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000] as const
/** Best days, only for a goal that counts things rather than sessions. */
export const BEST_DAYS = [3, 5, 10, 20, 50] as const
/** Weeks in a row: on target, as planned, or reviewed. */
export const WEEKS_IN_A_ROW = [4, 12, 26, 52] as const
/** Times a routine step can be done. */
export const STEP_TOTALS = [10, 50, 100, 365, 1000] as const

export type AchievementKind = "first" | "total" | "best_day" | "weeks" | "milestone" | "experience" | "reviews"

export interface PlanAchievement {
  /** Stable: the part, the rule, the threshold. */
  id: string
  /** The goal, step or experience it is on; `reviews` for the review streak. */
  partId: string
  /** What the part is called, for lists that mix parts. */
  partTitle: string
  kind: AchievementKind
  label: string
  /** The day it was earned, `YYYY-MM-DD`; null where the rows do not say (a milestone ticked). */
  earnedOn: string | null
}

export interface NextAchievement {
  partId: string
  label: string
  /** "12 to go", "2 more weeks". */
  toGo: string
}

/** One part's achievements: what it has, newest first, and the next one. */
export interface PartAchievements {
  earned: PlanAchievement[]
  next: NextAchievement | null
}

const byDay = (a: PlanAchievement, b: PlanAchievement) => (b.earnedOn ?? "").localeCompare(a.earnedOn ?? "") || a.id.localeCompare(b.id)

/**
 * The goal's unit when it names a thing counted ("approaches"), else none. A
 * rate ("/week", "days/week", which plans hold for "5× a week") is not a
 * thing: "10 /week in all" says nothing.
 */
function unitOf(goal: NsGoal): string {
  const unit = goal.unit.trim()
  return unit.includes("/") ? "" : unit
}

/** The days a goal was counted on, oldest first, with each day's number. */
function countedDays(plan: NsPlan, goalId: string, today: string): Array<[string, number]> {
  return Object.entries(plan.numbers ?? {})
    .filter(([date, row]) => date <= today && (row[goalId] ?? 0) > 0)
    .map(([date, row]) => [date, row[goalId]] as [string, number])
    .sort(([a], [b]) => a.localeCompare(b))
}

/** The first day a running total reaches each threshold, for thresholds reached. */
function totalsReached(days: Array<[string, number]>, thresholds: readonly number[]): Array<[number, string]> {
  const out: Array<[number, string]> = []
  let sum = 0
  let next = 0
  for (const [date, n] of days) {
    sum += n
    while (next < thresholds.length && sum >= thresholds[next]) out.push([thresholds[next++], date])
  }
  return out
}

/**
 * Weeks in a row a part met its target, Monday to Sunday, from the week of
 * `firstDay` to the week holding `today`. A week met counts on the day it was
 * met; the week still running breaks nothing until it is over. Returns each
 * streak threshold reached and the day it was, and the run as it stands now.
 */
function weeksInARow(
  firstDay: string,
  today: string,
  week: (monday: string) => { target: number; days: Array<[string, number]> },
  /** Weeks at the end, this one included, that break nothing while unmet: 2 for reviews, written the day after. */
  open = 1,
): { reached: Array<[number, string]>; current: number } {
  const reached: Array<[number, string]> = []
  const best = new Set<number>()
  let run = 0
  const thisWeek = weekStartISO(today)
  const stillOpen = addDaysISO(thisWeek, -7 * (open - 1))
  for (let monday = weekStartISO(firstDay); monday <= thisWeek; monday = addDaysISO(monday, 7)) {
    const { target, days } = week(monday)
    let sum = 0
    let metOn: string | null = null
    for (const [date, n] of days) {
      if (date > today) break
      sum += n
      if (target > 0 && sum >= target) {
        metOn = date
        break
      }
    }
    if (metOn) {
      run += 1
      for (const t of WEEKS_IN_A_ROW) {
        if (run === t && !best.has(t)) {
          best.add(t)
          reached.push([t, metOn])
        }
      }
    } else if (monday < stillOpen) {
      run = 0
    }
  }
  return { reached, current: run }
}

/** The seven days from a Monday, each with this part's number. */
function weekDays(monday: string, numberOn: (date: string) => number): Array<[string, number]> {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDaysISO(monday, i)
    return [date, numberOn(date)] as [string, number]
  })
}

/** "12 to go". */
const toGo = (n: number) => `${n} to go`
/** "2 more weeks". */
const moreWeeks = (n: number) => (n === 1 ? "1 more week" : `${n} more weeks`)

/**
 * A COUNTED GOAL: what "Log one" on Today adds up, day by day.
 *
 * The streak follows the goal's own weekly number, ramp and all (the Track
 * schedule's), and is left out for a goal about stopping something: a streak
 * a single bad day deletes is the wrong number to hand somebody quitting
 * (`goalAchievementRules.ts` says why). A best day is offered only to a goal
 * that counts things (approaches) rather than sessions (gym four times a week),
 * where one in a day is all there is.
 */
export function goalAchievements(plan: NsPlan, goalId: string, today: string, firsts = firstCountDays(plan)): PartAchievements {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal || !isSystem(goal)) return { earned: [], next: null }
  const days = countedDays(plan, goalId, today)
  const unit = unitOf(goal)
  const amount = (n: number) => (unit ? `${n} ${unit} in all` : `${n} in all`)
  const earned: PlanAchievement[] = []
  const mk = (kind: AchievementKind, key: string, label: string, earnedOn: string | null): PlanAchievement => ({
    id: `${goalId}:${kind}:${key}`, partId: goalId, partTitle: goal.title, kind, label, earnedOn,
  })

  if (days.length === 0) return { earned, next: { partId: goalId, label: "The first one", toGo: "log one on Today" } }
  earned.push(mk("first", "1", unit ? `First ${unit} logged` : "First one logged", days[0][0]))

  const totals = totalsReached(days, GOAL_TOTALS)
  for (const [n, date] of totals) earned.push(mk("total", String(n), amount(n), date))

  const countsThings = !isEveryDay(goal) && steadyRate(goal) >= 7
  if (countsThings) {
    let best = 0
    for (const [date, n] of days) {
      for (const t of BEST_DAYS) if (n >= t && best < t) earned.push(mk("best_day", String(t), `${t} in one day`, date))
      best = Math.max(best, n)
    }
  }

  let streakNext: NextAchievement | null = null
  if (!goal.isAbstinence) {
    const { reached, current } = weeksInARow(days[0][0], today, (monday) => ({
      target: practiceRateInWeek(goal, rampWeek(plan, goalId, monday, firsts)),
      days: weekDays(monday, (date) => plan.numbers?.[date]?.[goalId] ?? 0),
    }))
    for (const [n, date] of reached) earned.push(mk("weeks", String(n), `${n} weeks on target in a row`, date))
    const goalWeeks = WEEKS_IN_A_ROW.find((t) => t > current)
    if (goalWeeks && current > 0) streakNext = { partId: goalId, label: `${goalWeeks} weeks on target in a row`, toGo: moreWeeks(goalWeeks - current) }
  }

  const sum = days.reduce((acc, [, n]) => acc + n, 0)
  const nextTotal = GOAL_TOTALS.find((t) => t > sum)
  const next = nextTotal ? { partId: goalId, label: amount(nextTotal), toGo: toGo(nextTotal - sum) } : streakNext
  return { earned: earned.sort(byDay), next }
}

/** How often a step is meant to run in a week: its days, or its "N times a week". */
export function stepPerWeek(step: NsRoutineStep): number {
  return Math.max(1, step.days.length || step.daysPerWeek)
}

/**
 * A ROUTINE STEP: the days it was ticked, by hand on Today or by a finished
 * workout (`stepTick`, the one rule for "done that day").
 */
export function stepAchievements(plan: NsPlan, stepId: string, today: string, ticks: TrainingTicks = NO_TRAINING_TICKS): PartAchievements {
  const step = plan.routines.flatMap((r) => r.steps).find((s) => s.id === stepId)
  if (!step) return { earned: [], next: null }
  const dates = new Set<string>()
  for (const [date, ids] of Object.entries(plan.logged)) if (date <= today && ids.includes(stepId)) dates.add(date)
  for (const [date, ids] of Object.entries(ticks)) if (date <= today && ids.includes(stepId)) dates.add(date)
  const days = [...dates].sort().map((d) => [d, 1] as [string, number])
  const mk = (kind: AchievementKind, key: string, label: string, earnedOn: string | null): PlanAchievement => ({
    id: `${stepId}:${kind}:${key}`, partId: stepId, partTitle: step.title, kind, label, earnedOn,
  })
  if (days.length === 0) return { earned: [], next: { partId: stepId, label: "Done for the first time", toGo: "tick it on Today" } }

  const earned: PlanAchievement[] = [mk("first", "1", "Done for the first time", days[0][0])]
  for (const [n, date] of totalsReached(days, STEP_TOTALS)) earned.push(mk("total", String(n), `Done ${n} times`, date))
  const done = (date: string) => (stepTick(plan, date, stepId, ticks).done ? 1 : 0)
  const { reached, current } = weeksInARow(days[0][0], today, (monday) => ({ target: stepPerWeek(step), days: weekDays(monday, done) }))
  for (const [n, date] of reached) earned.push(mk("weeks", String(n), `${n} weeks as planned in a row`, date))

  const nextTotal = STEP_TOTALS.find((t) => t > days.length)
  const nextWeeks = WEEKS_IN_A_ROW.find((t) => t > current)
  const next = nextTotal
    ? { partId: stepId, label: `Done ${nextTotal} times`, toGo: toGo(nextTotal - days.length) }
    : nextWeeks ? { partId: stepId, label: `${nextWeeks} weeks as planned in a row`, toGo: moreWeeks(nextWeeks - current) } : null
  return { earned: earned.sort(byDay), next }
}

/** Weekly reviews written, week after week (Stefan's weekly ritual). The week still running breaks nothing. */
export function reviewAchievements(plan: NsPlan, today: string): PartAchievements {
  const weeks = new Map(plan.reviews.filter((r: NsReview) => r.cadence === "week" && r.periodStart <= today).map((r) => [r.periodStart, r]))
  if (weeks.size === 0) return { earned: [], next: null }
  const first = [...weeks.keys()].sort()[0]
  const { reached, current } = weeksInARow(first, today, (monday) => {
    const r = weeks.get(monday)
    // A review counts on the day it was written: once, whatever is in it.
    return { target: 1, days: r ? [[r.writtenOn < monday ? monday : r.writtenOn, 1]] : [] }
  }, 2)
  const earned = reached.map(([n, date]): PlanAchievement => ({
    id: `reviews:weeks:${n}`, partId: "reviews", partTitle: "Weekly review", kind: "reviews", label: `${n} weekly reviews in a row`, earnedOn: date,
  }))
  const nextWeeks = WEEKS_IN_A_ROW.find((t) => t > current)
  return { earned: earned.sort(byDay), next: nextWeeks && current > 0 ? { partId: "reviews", label: `${nextWeeks} weekly reviews in a row`, toGo: moreWeeks(nextWeeks - current) } : null }
}

/** A goal's milestones reached. The plan does not record when, so these carry no day. */
export function milestoneAchievements(plan: NsPlan, goalId: string): PlanAchievement[] {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return []
  return goal.checkpoints
    .filter((c) => c.done && c.title.trim())
    .map((c) => ({ id: `${goalId}:milestone:${c.id}`, partId: goalId, partTitle: goal.title, kind: "milestone", label: `Reached: ${c.title.trim()}`, earnedOn: null }))
}

/** Experiences done, on the day they were ticked. */
export function experienceAchievements(plan: NsPlan): PlanAchievement[] {
  return plan.experiences
    .filter((x) => x.done && x.title.trim())
    .map((x) => ({ id: `${x.id}:experience`, partId: x.id, partTitle: x.title, kind: "experience" as const, label: `Did it: ${x.title.trim()}`, earnedOn: x.doneOn }))
}

/**
 * EVERYTHING THE PLAN HAS EARNED, newest first: each counted goal's, each
 * routine step's, milestones, experiences and the review streak.
 */
export function allAchievements(plan: NsPlan, today: string, ticks: TrainingTicks = NO_TRAINING_TICKS): PlanAchievement[] {
  const firsts = firstCountDays(plan)
  return [
    ...plan.goals.flatMap((g) => [...goalAchievements(plan, g.id, today, firsts).earned, ...milestoneAchievements(plan, g.id)]),
    ...plan.routines.flatMap((r) => r.steps.flatMap((s) => stepAchievements(plan, s.id, today, ticks).earned)),
    ...experienceAchievements(plan),
    ...reviewAchievements(plan, today).earned,
  ].sort(byDay)
}

/** What was earned between two days, both inclusive: what a review of that stretch celebrates first. */
export function earnedBetween(plan: NsPlan, from: string, to: string, today: string, ticks: TrainingTicks = NO_TRAINING_TICKS): PlanAchievement[] {
  return allAchievements(plan, to < today ? to : today, ticks).filter((a) => a.earnedOn != null && a.earnedOn >= from && a.earnedOn <= to)
}

/**
 * WHAT FEEDS A BIGGER GOAL, and what it has earned: the owner's "the goal is a
 * girlfriend, and the system built for it is approaching". A goal's own
 * achievements, then those of the goals that feed it (`feedsGoalIds`) and of
 * the routine steps that serve it (`servesGoalIds`), newest first.
 */
export function fedAchievements(plan: NsPlan, goalId: string, today: string, ticks: TrainingTicks = NO_TRAINING_TICKS): PlanAchievement[] {
  const feeders = plan.goals.filter((g) => g.id !== goalId && g.feedsGoalIds.includes(goalId))
  const steps = plan.routines.flatMap((r) => r.steps).filter((s) => s.servesGoalIds.includes(goalId))
  const firsts = firstCountDays(plan)
  return [
    ...feeders.flatMap((g) => [...goalAchievements(plan, g.id, today, firsts).earned, ...milestoneAchievements(plan, g.id)]),
    ...steps.flatMap((s) => stepAchievements(plan, s.id, today, ticks).earned),
  ].sort(byDay)
}
