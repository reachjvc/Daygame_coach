/**
 * Goal tracking types for the user_goals table
 */

import { getTodayInTimezone } from "../shared/dateUtils"

export type GoalTrackingType = "counter" | "percentage" | "streak" | "boolean"
export type GoalPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom"
export type GoalType = "recurring" | "milestone" | "habit_ramp"
export type GoalNature = "input" | "outcome"
export type GoalDisplayCategory = "field_work" | "results" | "dirty_dog" | "texting" | "dates" | "relationship"

/**
 * Metrics that can be linked to goals for auto-sync with tracking data
 */
export type LinkedMetric =
  | "approaches_weekly"
  | "sessions_weekly"
  | "numbers_weekly"
  | "instadates_weekly"
  | "approaches_cumulative"
  | "sessions_cumulative"
  | "numbers_cumulative"
  | "instadates_cumulative"
  | null

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
}

/**
 * Data required to create a new goal
 */
export interface UserGoalInsert {
  title: string
  category: string
  tracking_type?: GoalTrackingType
  period?: GoalPeriod
  target_value: number
  custom_end_date?: string
  linked_metric?: LinkedMetric
  position?: number
  life_area?: string
  parent_goal_id?: string
  target_date?: string
  description?: string
  goal_type?: GoalType
  goal_nature?: GoalNature
  display_category?: GoalDisplayCategory
  goal_level?: number
  template_id?: string
  milestone_config?: Record<string, unknown> | null
  ramp_steps?: Record<string, unknown>[] | null
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
  goal_nature?: GoalNature
  display_category?: GoalDisplayCategory
  goal_level?: number | null
  template_id?: string | null
  milestone_config?: Record<string, unknown> | null
  ramp_steps?: Record<string, unknown>[] | null
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
 * Compute progress fields from a goal row
 */
export function computeGoalProgress(goal: UserGoalRow, timezone: string | null = null): GoalWithProgress {
  const progress_percentage =
    goal.target_value > 0
      ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
      : 0

  const is_complete = goal.current_value >= goal.target_value

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
    progress_percentage,
    is_complete,
    days_remaining,
  }
}
