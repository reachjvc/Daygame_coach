/**
 * Goal tracking types for the user_goals table
 *
 * Enum types are defined in goalEnums.ts (single source of truth)
 * and re-exported here for backwards compatibility.
 */

import { getTodayInTimezone } from "../shared/dateUtils"
import { progressPercent, isGoalComplete } from "./goalProgress"

export type {
  GoalTrackingType,
  GoalPeriod,
  GoalType,
  GoalNature,
  GoalPhase,
  GoalDisplayCategory,
  LinkedMetric,
} from "./goalEnums"

import type {
  GoalTrackingType,
  GoalPeriod,
  GoalType,
  GoalNature,
  GoalPhase,
  GoalDisplayCategory,
  LinkedMetric,
} from "./goalEnums"

/**
 * Database row type for user_goals table
 */
export interface UserGoalRow {
  id: string
  user_id: string
  title: string
  category: string
  tracking_type: GoalTrackingType
  period: GoalPeriod
  target_value: number
  current_value: number
  period_start_date: string
  custom_end_date: string | null
  current_streak: number
  best_streak: number
  is_active: boolean
  is_archived: boolean
  linked_metric: LinkedMetric
  position: number
  created_at: string
  updated_at: string
  life_area: string
  parent_goal_id: string | null
  target_date: string | null
  description: string | null
  goal_type: GoalType
  goal_nature: GoalNature | null
  display_category: GoalDisplayCategory | null
  goal_level: number | null
  template_id: string | null
  milestone_config: Record<string, unknown> | null
  ramp_steps: Record<string, unknown>[] | null
  motivation_note: string | null
  streak_freezes_available: number
  streak_freezes_used: number
  last_freeze_date: string | null
  goal_phase: GoalPhase | null
  aligned_values: string[]
  /**
   * True when this is a goal NOT to do — "No weed".
   *
   * Daily and yes-or-no like any standing rule; what differs is the reward.
   * Streak badges are suppressed (`goalAchievementRules.ts`), because a streak
   * punishes one bad day by deleting the record of every good one, and days
   * accumulated are counted instead. See the 20260920100000 migration.
   */
  is_abstinence: boolean
  /**
   * Ordered names of the steps this goal is reached by, or null when it is not
   * a staged goal. "first pull-up", "visible abs", "run a 5k".
   *
   * The COUNT reached is `current_value` and the number of stages is
   * `target_value`, so a staged goal is an ordinary climb from zero and every
   * piece of climb machinery works on it unchanged. See the 20260920110000
   * migration for why these are not child goals.
   */
  stages: string[] | null
}

/**
 * Data required to create a new goal
 */
export interface UserGoalInsert {
  title: string
  category?: string
  tracking_type?: GoalTrackingType
  period?: GoalPeriod
  target_value: number
  current_value?: number
  current_streak?: number
  custom_end_date?: string
  linked_metric?: LinkedMetric
  position?: number
  life_area?: string
  parent_goal_id?: string
  target_date?: string
  description?: string
  goal_type?: GoalType
  goal_nature?: GoalNature
  display_category?: GoalDisplayCategory | null
  goal_level?: number | null
  template_id?: string
  milestone_config?: Record<string, unknown> | null
  ramp_steps?: Record<string, unknown>[] | null
  motivation_note?: string | null
  goal_phase?: GoalPhase | null
  aligned_values?: string[]
  is_abstinence?: boolean
  stages?: string[] | null
}

/**
 * Fields that can be updated on a goal
 */
export interface UserGoalUpdate {
  title?: string
  category?: string
  tracking_type?: GoalTrackingType
  period?: GoalPeriod
  target_value?: number
  current_value?: number
  is_active?: boolean
  is_archived?: boolean
  linked_metric?: LinkedMetric
  position?: number
  life_area?: string
  parent_goal_id?: string | null
  target_date?: string | null
  description?: string | null
  goal_type?: GoalType
  goal_nature?: GoalNature | null
  display_category?: GoalDisplayCategory | null
  goal_level?: number | null
  template_id?: string | null
  milestone_config?: Record<string, unknown> | null
  ramp_steps?: Record<string, unknown>[] | null
  motivation_note?: string | null
  goal_phase?: GoalPhase | null
  aligned_values?: string[]
  is_abstinence?: boolean
  stages?: string[] | null
}

/**
 * Goal with computed progress fields for display
 */
export interface GoalWithProgress extends UserGoalRow {
  progress_percentage: number
  is_complete: boolean
  days_remaining: number | null
}

/**
 * Hierarchical goal node for tree views
 */
export interface GoalTreeNode extends GoalWithProgress {
  children: GoalTreeNode[]
}

/**
 * Database row type for daily_goal_snapshots table.
 * Captures goal state before period resets — enables heatmap, weekly review, trends.
 */
export interface DailyGoalSnapshotRow {
  id: string
  user_id: string
  goal_id: string
  snapshot_date: string
  current_value: number
  target_value: number
  was_complete: boolean
  current_streak: number
  best_streak: number
  period: string
  created_at: string
}

export interface DailyGoalSnapshotInsert {
  user_id: string
  goal_id: string
  snapshot_date: string
  current_value: number
  target_value: number
  was_complete: boolean
  current_streak: number
  best_streak: number
  period: string
}

/**
 * Compute progress fields from a goal row
 */
export function computeGoalProgress(goal: UserGoalRow, timezone: string): GoalWithProgress {
  /* Both come from `goalProgress.ts`, which is the one place that knows a goal
     can start somewhere other than zero. Written out by hand here, the sum
     measured the distance from zero rather than the distance travelled, and a
     climb from 1 to 6 reported 17% before anything happened. */
  const progress_percentage = progressPercent(goal)

  const is_complete = isGoalComplete(goal)

  let days_remaining: number | null = null
  const dateStr = goal.target_date ?? goal.custom_end_date
  if (dateStr) {
    const endDate = new Date(dateStr)
    const todayStr = getTodayInTimezone(timezone)
    const today = new Date(todayStr + "T00:00:00")
    endDate.setHours(0, 0, 0, 0)
    days_remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  return {
    ...goal,
    aligned_values: goal.aligned_values ?? [],
    progress_percentage,
    is_complete,
    days_remaining,
  }
}
