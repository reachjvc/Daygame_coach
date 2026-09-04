/**
 * BADGES ON YOUR OWN GOALS, worked out from your own rows.
 *
 * Pure: no database, no clock, no Supabase import. Everything is a function of
 * the goal row and its snapshots, which is why the same code runs inside a
 * request, inside a unit test with a hand-written history, and inside a
 * command-line audit. The daygame half made the same choice for the same
 * reason — see `src/tracking/achievementsService.ts`.
 *
 * NOTHING IS WRITTEN ANYWHERE. See the note at the top of
 * `data/goalAchievementRules.ts`: a badge is always derivable from rows the
 * user already has, so storing it would be a second copy that can disagree with
 * the first.
 */

import type { UserGoalRow, DailyGoalSnapshotRow } from "@/src/db/goalTypes"
import { getGoalById, getGoalSnapshots, getGoalAccumulatedTotal } from "@/src/db/goalRepo"
import { getWidgets } from "@/src/db/dashboardRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { buildGoalMetricId } from "@/src/tracking/metricsService"
import { shapeOfRow } from "@/src/goals/data/goalShapes"
import {
  GOAL_ACHIEVEMENT_RULES,
  GOAL_RULE_IDS,
  type GoalFacts,
  type GoalRuleId,
} from "@/src/goals/data/goalAchievementRules"

export interface EarnedBadge {
  ruleId: GoalRuleId
  label: string
  blurb: string
  /** YYYY-MM-DD in the user's own calendar — a snapshot date, never a clock. */
  earnedOn: string
}

/**
 * WHAT THE ROWS SAY, before any rule looks at them.
 *
 * `snapshots` may arrive in any order — `getGoalSnapshots` returns them newest
 * first — so they are sorted here rather than trusted. Sorting a list you were
 * handed is cheap; discovering that a caller changed its order is not.
 *
 * `today` is passed in because the period in progress has no snapshot of its
 * own and still needs a date to be attributed to. Reading the clock here would
 * make every test depend on the day it ran.
 *
 * `isAbstinence` is an argument for the reason given on `GoalFacts`: nothing
 * sets it yet, and guessing it from the title is the fault this area has spent
 * a week removing.
 */
export function factsFor(
  goal: UserGoalRow,
  snapshots: DailyGoalSnapshotRow[],
  today: string,
  isAbstinence = false,
): GoalFacts {
  const asc = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))

  /**
   * COMPLETE PERIODS COME FROM THE STORED FLAG, never from
   * `current_value >= target_value`.
   *
   * A goal whose target was raised later would otherwise retroactively lose
   * weeks it genuinely completed at the time — the target on the row is today's
   * target, and the snapshot remembers the one that was in force.
   */
  const completePeriods = asc.filter((s) => s.was_complete).map((s) => s.snapshot_date)

  /* The running total, date by date, so a threshold badge can be dated to the
     day it was crossed rather than to the day somebody opened the page. The
     period in progress is appended as `today`, which is what makes the total
     agree with `getGoalAccumulatedTotal`. */
  const totalByDate: Array<[string, number]> = []
  let running = 0
  for (const s of asc) {
    running += s.current_value ?? 0
    totalByDate.push([s.snapshot_date, running])
  }
  if (goal.current_value > 0) {
    running += goal.current_value
    totalByDate.push([today, running])
  }

  const ladder = goal.milestone_config as { start?: number; target?: number } | null

  return {
    shape: shapeOfRow(goal),
    isAbstinence,
    completePeriods,
    period: goal.period,
    totalByDate,
    climb:
      ladder && typeof ladder.start === "number" && typeof ladder.target === "number"
        ? { start: ladder.start, target: ladder.target, current: goal.current_value }
        : null,
    complete: goal.target_value > 0 && goal.current_value >= goal.target_value,
    firstMoveOn: asc.find((s) => (s.current_value ?? 0) > 0)?.snapshot_date
      ?? (goal.current_value > 0 ? today : null),
  }
}

/**
 * Every badge this goal has earned, oldest first.
 *
 * A rule only runs on the shapes it lists, so a finish line is never asked how
 * far up a climb it is. The order is by the day it was earned, because that is
 * the order somebody lived them.
 */
export function earnedFor(facts: GoalFacts): EarnedBadge[] {
  const out: EarnedBadge[] = []
  for (const ruleId of GOAL_RULE_IDS) {
    const rule = GOAL_ACHIEVEMENT_RULES[ruleId]
    if (!rule.shapes.includes(facts.shape)) continue
    const earnedOn = rule.earnedOn(facts)
    if (earnedOn) out.push({ ruleId, label: rule.label, blurb: rule.blurb, earnedOn })
  }
  return out.sort((a, b) => a.earnedOn.localeCompare(b.earnedOn))
}

/** The badges one goal has earned. The two steps above, in the usual order. */
export function badgesForGoal(
  goal: UserGoalRow,
  snapshots: DailyGoalSnapshotRow[],
  today: string,
  isAbstinence = false,
): EarnedBadge[] {
  return earnedFor(factsFor(goal, snapshots, today, isAbstinence))
}


// ============================================================================
// The server side. Everything above this line is pure and stays that way.
// ============================================================================

export interface GoalAchievementsView {
  badges: EarnedBadge[]
  /** Every period ever, plus the one in progress. */
  total: number
  /** Whether that total is currently a tile on the tracking page. */
  totalPinned: boolean
}

/**
 * One goal's badges, its all-time total, and whether the total is pinned.
 *
 * TEN YEARS OF SNAPSHOTS, not the 90-day default. A badge is a claim about the
 * whole history — "fifty-two weeks in a row" — and a short window would
 * silently un-earn a year-old streak, which is the worst possible failure for
 * something whose entire design is that it repairs itself.
 *
 * Returns null when the goal is not this user's, so the route has one thing to
 * check rather than two.
 */
export async function goalAchievementsView(
  userId: string,
  goalId: string,
): Promise<GoalAchievementsView | null> {
  const tz = await getUserTimezone(userId)
  const goal = await getGoalById(userId, goalId, tz)
  if (!goal) return null

  const [snapshots, total, widgets] = await Promise.all([
    getGoalSnapshots(userId, goalId, 3650),
    getGoalAccumulatedTotal(userId, goalId),
    getWidgets(userId, "tracking"),
  ])

  return {
    badges: badgesForGoal(goal, snapshots, getTodayInTimezone(tz)),
    total,
    totalPinned: widgets.some((w) => w.metric_id === buildGoalMetricId(goalId, "total")),
  }
}

/** True when this goal belongs to this user. Used before writing a tile that names it. */
export async function goalBelongsTo(userId: string, goalId: string): Promise<boolean> {
  return (await getGoalById(userId, goalId, await getUserTimezone(userId))) !== null
}
