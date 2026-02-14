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
      goal_nature: goal.goal_nature ?? null,
      display_category: goal.display_category ?? null,
      goal_level: goal.goal_level ?? null,
      template_id: goal.template_id ?? null,
      milestone_config: goal.milestone_config ?? null,
      ramp_steps: goal.ramp_steps ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create goal: ${error.message}`)
  }

  return computeGoalProgress(data as UserGoalRow)
}

// ============================================
// Batch Create Goals (for tree generation)
// ============================================

/**
 * Create multiple goals in order, resolving temp parent IDs to real UUIDs.
 * Inserts must be ordered so that parents appear before children.
 */
export async function createGoalBatch(
  userId: string,
  goals: (UserGoalInsert & { _tempId: string; _tempParentId: string | null })[]
): Promise<GoalWithProgress[]> {
  const tempToReal = new Map<string, string>()
  const created: GoalWithProgress[] = []

  for (const goal of goals) {
    const realParentId = goal._tempParentId ? tempToReal.get(goal._tempParentId) ?? null : null
    const { _tempId, _tempParentId, ...insert } = goal
    insert.parent_goal_id = realParentId ?? undefined

    const result = await createGoal(userId, insert)
    tempToReal.set(_tempId, result.id)
    created.push(result)
  }

  return created
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
  stats: {
    current_week_approaches: number
    current_week_sessions: number
    total_approaches: number
    total_sessions: number
    total_numbers: number
    total_instadates: number
  },
  metric: LinkedMetric
): number {
  switch (metric) {
    case "approaches_weekly":
      return stats.current_week_approaches
    case "sessions_weekly":
      return stats.current_week_sessions
    case "numbers_weekly":
    case "instadates_weekly":
      return 0
    case "approaches_cumulative":
      return stats.total_approaches
    case "sessions_cumulative":
      return stats.total_sessions
    case "numbers_cumulative":
      return stats.total_numbers
    case "instadates_cumulative":
      return stats.total_instadates
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
 * Detects cycles and self-references — orphaned nodes become roots.
 */
function buildTree(goals: GoalWithProgress[]): GoalTreeNode[] {
  const nodeMap = new Map<string, GoalTreeNode>()
  const roots: GoalTreeNode[] = []

  // Create nodes
  for (const goal of goals) {
    nodeMap.set(goal.id, { ...goal, children: [] })
  }

  // Detect cycles: walk parent chain, if we revisit a node it's a cycle
  const safeParent = new Map<string, string | null>()
  for (const goal of goals) {
    if (!goal.parent_goal_id || !nodeMap.has(goal.parent_goal_id)) {
      safeParent.set(goal.id, null)
      continue
    }
    // Self-reference check
    if (goal.parent_goal_id === goal.id) {
      safeParent.set(goal.id, null)
      continue
    }
    // Walk up the parent chain to detect cycles
    const visited = new Set<string>([goal.id])
    let ancestor = goal.parent_goal_id
    let hasCycle = false
    while (ancestor && nodeMap.has(ancestor)) {
      if (visited.has(ancestor)) { hasCycle = true; break }
      visited.add(ancestor)
      const ancestorGoal = goals.find((g) => g.id === ancestor)
      ancestor = ancestorGoal?.parent_goal_id ?? null
    }
    safeParent.set(goal.id, hasCycle ? null : goal.parent_goal_id)
  }

  // Link parents → children using cycle-safe parent references
  for (const goal of goals) {
    const node = nodeMap.get(goal.id)!
    const parentId = safeParent.get(goal.id)
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node)
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
