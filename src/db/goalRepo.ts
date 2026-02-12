/**
 * Database repository for Goal Tracking
 *
 * All database access for user_goals table.
 */

import { createServerSupabaseClient } from "./supabase"
import type {
  UserGoalRow,
  UserGoalInsert,
  UserGoalUpdate,
  GoalWithProgress,
  GoalTreeNode,
  LinkedMetric,
} from "./goalTypes"
import { computeGoalProgress } from "./goalTypes"
import { getUserTrackingStats } from "./trackingRepo"

// ============================================
// Get Goals
// ============================================

/**
 * Get all active (non-archived) goals for a user
 */
export async function getUserGoals(userId: string): Promise<GoalWithProgress[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("position", { ascending: true })

  if (error) {
    throw new Error(`Failed to get goals: ${error.message}`)
  }

  return (data as UserGoalRow[]).map(computeGoalProgress)
}

/**
 * Get goals filtered by category
 */
export async function getGoalsByCategory(
  userId: string,
  category: string
): Promise<GoalWithProgress[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("is_archived", false)
    .order("position", { ascending: true })

  if (error) {
    throw new Error(`Failed to get goals by category: ${error.message}`)
  }

  return (data as UserGoalRow[]).map(computeGoalProgress)
}

/**
 * Get goals filtered by life area
 */
export async function getGoalsByLifeArea(
  userId: string,
  lifeArea: string
): Promise<GoalWithProgress[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("life_area", lifeArea)
    .eq("is_archived", false)
    .order("position", { ascending: true })

  if (error) {
    throw new Error(`Failed to get goals by life area: ${error.message}`)
  }

  return (data as UserGoalRow[]).map(computeGoalProgress)
}

/**
 * Get a single goal by ID
 */
export async function getGoalById(
  userId: string,
  goalId: string
): Promise<GoalWithProgress | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    throw new Error(`Failed to get goal: ${error.message}`)
  }

  return computeGoalProgress(data as UserGoalRow)
}

// ============================================
// Create Goal
// ============================================

/**
 * Create a new goal
 */
export async function createGoal(
  userId: string,
  goal: UserGoalInsert
): Promise<GoalWithProgress> {
  const supabase = await createServerSupabaseClient()

  // Get max position for this user's active goals (new goals go at end)
  const { data: maxPosData } = await supabase
    .from("user_goals")
    .select("position")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("position", { ascending: false })
    .limit(1)
    .single()

  const nextPosition = maxPosData ? maxPosData.position + 1 : 0

  const lifeArea = goal.life_area ?? goal.category
  const category = goal.category ?? goal.life_area ?? "custom"

  const { data, error } = await supabase
    .from("user_goals")
    .insert({
      user_id: userId,
      title: goal.title,
      category,
      tracking_type: goal.tracking_type ?? "counter",
      period: goal.period ?? "weekly",
      target_value: goal.target_value,
      custom_end_date: goal.custom_end_date ?? null,
      linked_metric: goal.linked_metric ?? null,
      position: goal.position ?? nextPosition,
      life_area: lifeArea,
      parent_goal_id: goal.parent_goal_id ?? null,
      target_date: goal.target_date ?? null,
      description: goal.description ?? null,
      goal_type: goal.goal_type ?? "recurring",
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create goal: ${error.message}`)
  }

  return computeGoalProgress(data as UserGoalRow)
}

// ============================================
// Update Goal
// ============================================

/**
 * Update a goal's properties
 */
export async function updateGoal(
  userId: string,
  goalId: string,
  update: UserGoalUpdate
): Promise<GoalWithProgress> {
  const supabase = await createServerSupabaseClient()

  // Keep category in sync with life_area for backward compat
  const updateData = { ...update }
  if (updateData.life_area && !updateData.category) {
    updateData.category = updateData.life_area
  }

  const { data, error } = await supabase
    .from("user_goals")
    .update(updateData)
    .eq("id", goalId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update goal: ${error.message}`)
  }

  return computeGoalProgress(data as UserGoalRow)
}

/**
 * Increment goal progress by a given amount
 */
export async function incrementGoalProgress(
  userId: string,
  goalId: string,
  amount: number = 1
): Promise<GoalWithProgress> {
  const supabase = await createServerSupabaseClient()

  // First get current value
  const { data: current, error: fetchError } = await supabase
    .from("user_goals")
    .select("current_value, target_value, current_streak, best_streak")
    .eq("id", goalId)
    .eq("user_id", userId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch goal: ${fetchError.message}`)
  }

  const newValue = (current.current_value as number) + amount
  const wasComplete = current.current_value >= current.target_value
  const isNowComplete = newValue >= current.target_value

  // Update streak if just completed
  let updateData: Record<string, unknown> = { current_value: newValue }
  if (!wasComplete && isNowComplete) {
    const newStreak = (current.current_streak as number) + 1
    updateData = {
      ...updateData,
      current_streak: newStreak,
      best_streak: Math.max(newStreak, current.best_streak as number),
    }
  }

  const { data, error } = await supabase
    .from("user_goals")
    .update(updateData)
    .eq("id", goalId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to increment goal: ${error.message}`)
  }

  return computeGoalProgress(data as UserGoalRow)
}

// ============================================
// Reset Period
// ============================================

/**
 * Reset a goal's period (start fresh for new day/week/month)
 */
export async function resetGoalPeriod(
  userId: string,
  goalId: string
): Promise<GoalWithProgress> {
  const supabase = await createServerSupabaseClient()

  // Get current state to check if goal was completed
  const { data: current, error: fetchError } = await supabase
    .from("user_goals")
    .select("current_value, target_value, current_streak")
    .eq("id", goalId)
    .eq("user_id", userId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch goal for reset: ${fetchError.message}`)
  }

  const wasComplete = current.current_value >= current.target_value

  // If goal wasn't completed, reset streak
  const updateData: Record<string, unknown> = {
    current_value: 0,
    period_start_date: new Date().toISOString().split("T")[0],
  }

  if (!wasComplete) {
    updateData.current_streak = 0
  }

  const { data, error } = await supabase
    .from("user_goals")
    .update(updateData)
    .eq("id", goalId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to reset goal period: ${error.message}`)
  }

  return computeGoalProgress(data as UserGoalRow)
}

// ============================================
// Bulk Reset
// ============================================

/**
 * Reset all daily goals for a user
 * Updates streak based on completion status before resetting
 */
export async function resetDailyGoals(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  // Get all active daily goals
  const { data: goals, error: fetchError } = await supabase
    .from("user_goals")
    .select("id, current_value, target_value, current_streak")
    .eq("user_id", userId)
    .eq("period", "daily")
    .eq("is_active", true)
    .eq("is_archived", false)

  if (fetchError) {
    throw new Error(`Failed to fetch daily goals: ${fetchError.message}`)
  }

  if (!goals || goals.length === 0) {
    return 0
  }

  // Reset each goal
  for (const goal of goals) {
    const wasComplete = goal.current_value >= goal.target_value

    const updateData: Record<string, unknown> = {
      current_value: 0,
      period_start_date: new Date().toISOString().split("T")[0],
    }

    // Reset streak if goal wasn't completed
    if (!wasComplete) {
      updateData.current_streak = 0
    }

    await supabase
      .from("user_goals")
      .update(updateData)
      .eq("id", goal.id)
      .eq("user_id", userId)
  }

  return goals.length
}

// ============================================
// Linked Metrics Sync
// ============================================

/**
 * Get the metric value from tracking stats based on linked_metric type
 */
function getMetricValue(
  stats: { current_week_approaches: number; current_week_sessions: number },
  metric: LinkedMetric
): number {
  switch (metric) {
    case "approaches_weekly":
      return stats.current_week_approaches
    case "sessions_weekly":
      return stats.current_week_sessions
    // For numbers and instadates, we need weekly values which aren't tracked
    // separately, so we return 0 for now (these would need additional tracking)
    case "numbers_weekly":
    case "instadates_weekly":
      return 0
    default:
      return 0
  }
}

/**
 * Sync all goals with linked metrics to current tracking data
 * Call this after fetching tracking stats to keep goals in sync
 */
export async function syncLinkedGoals(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  // Get user's tracking stats
  const stats = await getUserTrackingStats(userId)
  if (!stats) {
    return 0
  }

  // Get all active goals with linked metrics
  const { data: goals, error: fetchError } = await supabase
    .from("user_goals")
    .select("id, linked_metric, current_value")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("is_archived", false)
    .not("linked_metric", "is", null)

  if (fetchError) {
    throw new Error(`Failed to fetch linked goals: ${fetchError.message}`)
  }

  if (!goals || goals.length === 0) {
    return 0
  }

  let updatedCount = 0

  for (const goal of goals) {
    const newValue = getMetricValue(stats, goal.linked_metric as LinkedMetric)

    // Only update if value changed
    if (newValue !== goal.current_value) {
      const { error } = await supabase
        .from("user_goals")
        .update({ current_value: newValue })
        .eq("id", goal.id)
        .eq("user_id", userId)

      if (!error) {
        updatedCount++
      }
    }
  }

  return updatedCount
}

// ============================================
// Reorder Goals
// ============================================

/**
 * Reorder goals by updating their positions
 * @param goalIds - Array of goal IDs in desired order (index 0 = position 0 = primary)
 */
export async function reorderGoals(
  userId: string,
  goalIds: string[]
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  // Update each goal's position based on array index
  for (let i = 0; i < goalIds.length; i++) {
    const { error } = await supabase
      .from("user_goals")
      .update({ position: i })
      .eq("id", goalIds[i])
      .eq("user_id", userId)

    if (error) {
      throw new Error(`Failed to reorder goals: ${error.message}`)
    }
  }
}

// ============================================
// Tree / Hierarchy Queries
// ============================================

/**
 * Build a goal tree from flat rows. O(n) algorithm.
 */
function buildTree(goals: GoalWithProgress[]): GoalTreeNode[] {
  const nodeMap = new Map<string, GoalTreeNode>()
  const roots: GoalTreeNode[] = []

  // Create nodes
  for (const goal of goals) {
    nodeMap.set(goal.id, { ...goal, children: [] })
  }

  // Link parents → children
  for (const goal of goals) {
    const node = nodeMap.get(goal.id)!
    if (goal.parent_goal_id && nodeMap.has(goal.parent_goal_id)) {
      nodeMap.get(goal.parent_goal_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/**
 * Get full goal tree for a user (all active goals as hierarchy)
 */
export async function getGoalTree(userId: string): Promise<GoalTreeNode[]> {
  const goals = await getUserGoals(userId)
  return buildTree(goals)
}

/**
 * Get direct children of a goal
 */
export async function getChildGoals(
  userId: string,
  parentGoalId: string
): Promise<GoalWithProgress[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("parent_goal_id", parentGoalId)
    .eq("is_archived", false)
    .order("position", { ascending: true })

  if (error) {
    throw new Error(`Failed to get child goals: ${error.message}`)
  }

  return (data as UserGoalRow[]).map(computeGoalProgress)
}

/**
 * Get ancestor chain from root to the given goal (inclusive)
 */
export async function getGoalAncestors(
  userId: string,
  goalId: string
): Promise<GoalWithProgress[]> {
  // Fetch all goals for user and walk up the tree
  const allGoals = await getUserGoals(userId)
  const goalMap = new Map(allGoals.map((g) => [g.id, g]))

  const ancestors: GoalWithProgress[] = []
  let current = goalMap.get(goalId)

  while (current) {
    ancestors.unshift(current)
    current = current.parent_goal_id ? goalMap.get(current.parent_goal_id) : undefined
  }

  return ancestors
}

// ============================================
// Archive/Delete Goal
// ============================================

/**
 * Archive a goal (soft delete)
 */
export async function archiveGoal(userId: string, goalId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("user_goals")
    .update({ is_archived: true, is_active: false })
    .eq("id", goalId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to archive goal: ${error.message}`)
  }
}

/**
 * Permanently delete a goal
 */
export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("user_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to delete goal: ${error.message}`)
  }
}
