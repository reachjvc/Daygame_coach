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
} from "./goalTypes"
import { computeGoalProgress } from "./goalTypes"

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
    .order("created_at", { ascending: false })

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
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to get goals by category: ${error.message}`)
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

  const { data, error } = await supabase
    .from("user_goals")
    .insert({
      user_id: userId,
      title: goal.title,
      category: goal.category,
      tracking_type: goal.tracking_type ?? "counter",
      period: goal.period ?? "weekly",
      target_value: goal.target_value,
      custom_end_date: goal.custom_end_date ?? null,
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

  const { data, error } = await supabase
    .from("user_goals")
    .update(update)
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
