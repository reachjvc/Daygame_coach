/**
 * WHAT THE PLAN HOLDS, READ THE WAY THE NEW VERSION NEEDS IT.
 *
 * Pure reads over `NsPlan`. The new version keeps a few facts the plan has no
 * column for (a goal's level, a hidden area, a fixed review day) as answer rows
 * whose keys start with `start:`, the prefix the plan already keeps and saves.
 * That needs no schema change; moving them into real columns is a later step
 * and only these helpers would change.
 */

import { DEFAULT_AREAS } from "@/src/goals/data/northStar"
import type { NsArea, NsGoal, NsPlan, NsRoutineStep } from "@/src/goals/types"

const NEW_PREFIX = "start:new:"

export const HIDDEN_AREAS_KEY = `${NEW_PREFIX}areas-hidden`
export const AREAS_DESCRIBED_KEY = `${NEW_PREFIX}areas-described`
export const CHECKIN_DAY_KEY = `${NEW_PREFIX}checkin-day`
export const CHECKIN_HOUR_KEY = `${NEW_PREFIX}checkin-hour`
export const CHECKIN_PHONE_KEY = `${NEW_PREFIX}checkin-phone`
export const tierKey = (goalId: string) => `${NEW_PREFIX}tier:${goalId}`
export const unfiledKey = (goalId: string) => `${NEW_PREFIX}unfiled:${goalId}`
export const seasonTakeKey = (seasonId: string) => `${NEW_PREFIX}season-take:${seasonId}`
export const SEASON_YES_ON_KEY = `${NEW_PREFIX}season-yes-season`

export type GoalTier = "life" | "become" | "season"

const LIFE_TIMEFRAMES = new Set(["3y", "5y", "10y", "20y"])

/** The level of a goal: its stored level, else read off its old time frame (3 years and out are big goals). */
export function tierOf(plan: NsPlan, goal: NsGoal): GoalTier {
  const stored = plan.answers[tierKey(goal.id)]
  if (stored === "life" || stored === "become" || stored === "season") return stored
  return goal.timeframe && LIFE_TIMEFRAMES.has(goal.timeframe) ? "life" : "season"
}

export function hiddenAreaIds(plan: NsPlan): Set<string> {
  const raw = plan.answers[HIDDEN_AREAS_KEY] ?? ""
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))
}

export function activeAreas(plan: NsPlan): NsArea[] {
  const hidden = hiddenAreaIds(plan)
  return plan.areas.filter((a) => !hidden.has(a.id))
}

export function hiddenAreas(plan: NsPlan): NsArea[] {
  const hidden = hiddenAreaIds(plan)
  return plan.areas.filter((a) => hidden.has(a.id))
}

export const isActive = (g: NsGoal) => g.status === "active"

export function goalsOfTier(plan: NsPlan, tier: GoalTier): NsGoal[] {
  return plan.goals.filter((g) => isActive(g) && tierOf(plan, g) === tier)
}

/** A goal in the current season: `servesOneThing` is its link to the season. */
export const inSeason = (g: NsGoal) => g.servesOneThing

export function activeSeasonGoals(plan: NsPlan): NsGoal[] {
  return plan.goals.filter((g) => isActive(g) && inSeason(g) && tierOf(plan, g) === "season")
}

/** Season goals not yet in the season, for the "also in your plan" list. */
export function otherActiveGoals(plan: NsPlan): NsGoal[] {
  return plan.goals.filter((g) => isActive(g) && tierOf(plan, g) === "season" && !inSeason(g))
}

export const isUnfiled = (plan: NsPlan, goalId: string) => plan.answers[unfiledKey(goalId)] === "1"

/** Is the season's number set complete for this goal? Target needs a unit and a target; Practice a weekly count; Finish line a task or a date. */
export function numbersComplete(goal: NsGoal): boolean {
  if (goal.type === "milestone_ladder") {
    return Boolean(goal.unit.trim()) && goal.ladder != null && goal.ladder.target !== goal.ladder.start
  }
  if (goal.type === "habit_ramp") return (goal.perWeek ?? 0) > 0 || goal.daysPerWeek > 0
  return goal.checkpoints.length > 0 || goal.targetDate != null
}

export const isWeeklyStep = (s: NsRoutineStep) => s.daysPerWeek > 0 || s.days.length > 0
export const isWeeklyGoal = (g: NsGoal) => isActive(g) && g.type === "habit_ramp" && ((g.perWeek ?? 0) > 0 || g.daysPerWeek > 0)

export interface WeeklyItem {
  kind: "step" | "goal"
  id: string
  title: string
  /** Goals it serves (a Practice goal serves itself). */
  serves: string[]
}

/** Every weekly item: routine steps with a weekly count or fixed days, and active Practice goals. */
export function weeklyItems(plan: NsPlan): WeeklyItem[] {
  const out: WeeklyItem[] = []
  for (const r of plan.routines) {
    for (const s of r.steps) if (isWeeklyStep(s)) out.push({ kind: "step", id: s.id, title: s.title, serves: s.servesGoalIds })
  }
  for (const g of plan.goals) if (isWeeklyGoal(g)) out.push({ kind: "goal", id: g.id, title: g.title, serves: [g.id] })
  return out
}

/** Weekly items that serve an active season goal. */
export function itemsServingSeason(plan: NsPlan): WeeklyItem[] {
  const season = new Set(activeSeasonGoals(plan).map((g) => g.id))
  return weeklyItems(plan).filter((i) => i.serves.some((id) => season.has(id)))
}

/** The old default description of an area, when it still carries it unchanged. */
export function carriesOldDescription(plan: NsPlan, area: NsArea): boolean {
  const old = DEFAULT_AREAS.find((a) => a.id === area.id)
  return Boolean(old && old.sublabel === area.sublabel && area.sublabel.trim())
}

export interface CheckinSettings {
  reviewDay: number
  reviewHour: number
  pushOn: boolean
}

/** The `life_plan_reminders` row's shape. The copy space never sends one, so the settings it makes are kept as answers. */
export interface RemindersRow {
  review_day: number
  review_hour: number
  push_on: boolean
}

export function checkinSettings(plan: NsPlan, row: RemindersRow | null): CheckinSettings | null {
  if (row) return { reviewDay: row.review_day, reviewHour: row.review_hour, pushOn: row.push_on }
  const day = Number(plan.answers[CHECKIN_DAY_KEY])
  if (!Number.isInteger(day) || day < 1 || day > 7) return null
  const hour = Number(plan.answers[CHECKIN_HOUR_KEY] ?? 19)
  return {
    reviewDay: day,
    reviewHour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 19,
    pushOn: plan.answers[CHECKIN_PHONE_KEY] === "1",
  }
}

/** Percent of rungs reached across every goal that feeds this growth goal. Null when nothing feeds it or nothing has rungs. */
export function growthProgress(plan: NsPlan, growthId: string): number | null {
  const feeders = plan.goals.filter((g) => g.feedsGoalIds.includes(growthId))
  const rungs = feeders.flatMap((g) => g.checkpoints)
  if (rungs.length === 0) return null
  return Math.round((rungs.filter((c) => c.done).length / rungs.length) * 100)
}
