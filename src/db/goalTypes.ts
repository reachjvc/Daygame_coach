/**
 * Goal tracking types for the user_goals table
 */

export type GoalTrackingType = "counter" | "percentage" | "streak" | "boolean"
export type GoalPeriod = "daily" | "weekly" | "monthly" | "custom"

/**
 * Metrics that can be linked to goals for auto-sync with tracking data
 */
export type LinkedMetric =
  | "approaches_weekly"
  | "sessions_weekly"
  | "numbers_weekly"
  | "instadates_weekly"
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
 * Compute progress fields from a goal row
 */
export function computeGoalProgress(goal: UserGoalRow): GoalWithProgress {
  const progress_percentage =
    goal.target_value > 0
      ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
      : 0

  const is_complete = goal.current_value >= goal.target_value

  let days_remaining: number | null = null
  if (goal.custom_end_date) {
    const endDate = new Date(goal.custom_end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
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
