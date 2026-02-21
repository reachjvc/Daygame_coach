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
  DailyGoalSnapshotRow,
} from "./goalTypes"
import { computeGoalProgress } from "./goalTypes"
import type { UserTrackingStatsRow } from "./trackingTypes"
import { getOrCreateUserTrackingStats, getWeeklyApproachQualityAvg } from "./trackingRepo"
import { getISOWeekString } from "../tracking/trackingService"
import { getTodayInTimezone, getNowInTimezone } from "../shared/dateUtils"
import { shouldAutoFreeze } from "../goals/goalsService"

// ============================================
// Duplicate Prevention
// ============================================

export class DuplicateGoalError extends Error {
  constructor(
    public readonly reason: "template_exists" | "linked_metric_exists" | "title_life_area_exists",
    public readonly existingGoalId: string
  ) {
    super(`Duplicate goal: ${reason} (existing: ${existingGoalId})`)
    this.name = "DuplicateGoalError"
  }
}

/**
 * Check if creating this goal would produce a duplicate for the user.
 * Checks (in priority order):
 * 1. Same template_id on an active non-archived goal
 * 2. Same linked_metric on an active non-archived goal
 * 3. Same title + life_area on an active non-archived non-template goal
 */
async function checkGoalDuplicate(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  goal: UserGoalInsert
): Promise<void> {
  // Check 1: template_id (strongest signal)
  if (goal.template_id) {
    const { data } = await supabase
      .from("user_goals")
      .select("id")
      .eq("user_id", userId)
      .eq("template_id", goal.template_id)
      .eq("is_archived", false)
      .limit(1)
      .maybeSingle()
    if (data) throw new DuplicateGoalError("template_exists", data.id)
  }

  // Check 2: linked_metric
  if (goal.linked_metric) {
    const { data } = await supabase
      .from("user_goals")
      .select("id")
      .eq("user_id", userId)
      .eq("linked_metric", goal.linked_metric)
      .eq("is_archived", false)
      .limit(1)
      .maybeSingle()
    if (data) throw new DuplicateGoalError("linked_metric_exists", data.id)
  }

  // Check 3: title + life_area (only for non-template custom goals)
  if (!goal.template_id) {
    const lifeArea = goal.life_area ?? goal.category
    const { data } = await supabase
      .from("user_goals")
      .select("id")
      .eq("user_id", userId)
      .eq("title", goal.title)
      .eq("life_area", lifeArea)
      .eq("is_archived", false)
      .limit(1)
      .maybeSingle()
    if (data) throw new DuplicateGoalError("title_life_area_exists", data.id)
  }
}

// ============================================
// Get Goals
// ============================================

/**
 * Get all active (non-archived) goals for a user.
 * Pass includeArchived=true to also return archived goals (for customize mode).
 */
export async function getUserGoals(userId: string, includeArchived = false, timezone: string | null = null): Promise<GoalWithProgress[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })

  if (!includeArchived) {
    query = query.eq("is_archived", false)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get goals: ${error.message}`)
  }

  return (data as UserGoalRow[]).map((g) => computeGoalProgress(g, timezone))
}

/**
 * Get goals filtered by category
 */
export async function getGoalsByCategory(
  userId: string,
  category: string,
  timezone: string | null = null
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

  return (data as UserGoalRow[]).map((g) => computeGoalProgress(g, timezone))
}

/**
 * Get goals filtered by life area
 */
export async function getGoalsByLifeArea(
  userId: string,
  lifeArea: string,
  timezone: string | null = null
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

  return (data as UserGoalRow[]).map((g) => computeGoalProgress(g, timezone))
}

/**
 * Get a single goal by ID
 */
export async function getGoalById(
  userId: string,
  goalId: string,
  timezone: string | null = null
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

  return computeGoalProgress(data as UserGoalRow, timezone)
}

// ============================================
// Create Goal
// ============================================

/**
 * Create a new goal
 */
export async function createGoal(
  userId: string,
  goal: UserGoalInsert,
  timezone: string | null = null
): Promise<GoalWithProgress> {
  const supabase = await createServerSupabaseClient()

  // Duplicate check — throws DuplicateGoalError if match found
  await checkGoalDuplicate(supabase, userId, goal)

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
      goal_phase: goal.goal_phase ?? null,
    })
    .select()
    .single()

  if (error) {
    // Race condition fallback: DB constraint caught a duplicate
    if (error.code === "23505") {
      const reason = error.message.includes("uq_user_goals_template") ? "template_exists"
        : error.message.includes("uq_user_goals_linked_metric") ? "linked_metric_exists"
        : "template_exists"
      throw new DuplicateGoalError(reason, "unknown")
    }
    throw new Error(`Failed to create goal: ${error.message}`)
  }

  return computeGoalProgress(data as UserGoalRow, timezone)
}

// ============================================
// Batch Create Goals (for tree generation)
// ============================================

/**
 * Create multiple goals in order, resolving temp parent IDs to real UUIDs.
 * Inserts must be ordered so that parents appear before children.
 * Idempotent: duplicates are silently skipped and the existing goal is used
 * for parent ID resolution, so re-running the same batch is safe.
 */
export async function createGoalBatch(
  userId: string,
  goals: (UserGoalInsert & { _tempId: string; _tempParentId: string | null })[],
  timezone: string | null = null
): Promise<GoalWithProgress[]> {
  const tempToReal = new Map<string, string>()
  const created: GoalWithProgress[] = []

  for (const goal of goals) {
    const realParentId = goal._tempParentId ? tempToReal.get(goal._tempParentId) ?? null : null
    const { _tempId, _tempParentId, ...insert } = goal
    insert.parent_goal_id = realParentId ?? undefined

    try {
      const result = await createGoal(userId, insert, timezone)
      tempToReal.set(_tempId, result.id)
      created.push(result)
    } catch (err) {
      if (err instanceof DuplicateGoalError && err.existingGoalId !== "unknown") {
        // Skip duplicate — map temp ID to existing goal so children resolve correctly
        tempToReal.set(_tempId, err.existingGoalId)
        const existing = await getGoalById(userId, err.existingGoalId, timezone)
        if (existing) created.push(existing)
      } else {
        throw err
      }
    }
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
  update: UserGoalUpdate,
  timezone: string | null = null
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

  return computeGoalProgress(data as UserGoalRow, timezone)
}

/**
 * Increment goal progress by a given amount
 */
export async function incrementGoalProgress(
  userId: string,
  goalId: string,
  amount: number = 1,
  timezone: string | null = null
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

  return computeGoalProgress(data as UserGoalRow, timezone)
}

// ============================================
// Reset Period
// ============================================

/**
 * Reset a goal's period (start fresh for new day/week/month)
 */
export async function resetGoalPeriod(
  userId: string,
  goalId: string,
  timezone: string | null = null
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
    period_start_date: getTodayInTimezone(timezone),
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

  return computeGoalProgress(data as UserGoalRow, timezone)
}

// ============================================
// Bulk Reset
// ============================================

/**
 * Reset all daily goals for a user
 * Updates streak based on completion status before resetting
 */
export async function resetDailyGoals(userId: string, timezone: string | null = null): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const today = getTodayInTimezone(timezone)

  // Get all active daily goals that haven't already been reset today
  const { data: goals, error: fetchError } = await supabase
    .from("user_goals")
    .select("id, current_value, target_value, current_streak, best_streak, period, period_start_date, streak_freezes_available, streak_freezes_used, last_freeze_date")
    .eq("user_id", userId)
    .eq("period", "daily")
    .eq("is_active", true)
    .eq("is_archived", false)
    .neq("period_start_date", today) // Skip goals already reset today

  if (fetchError) {
    throw new Error(`Failed to fetch daily goals: ${fetchError.message}`)
  }

  if (!goals || goals.length === 0) {
    return 0
  }

  // Snapshot BEFORE reset — capture pre-reset state for heatmap/review
  await snapshotGoals(userId, goals, today).catch(() => {})

  // Reset each goal
  for (const goal of goals) {
    const wasComplete = goal.current_value >= goal.target_value

    const updateData: Record<string, unknown> = {
      current_value: 0,
      period_start_date: today,
    }

    if (!wasComplete) {
      // Check if we should auto-freeze instead of killing streak
      if (shouldAutoFreeze(goal, today)) {
        updateData.streak_freezes_available = goal.streak_freezes_available - 1
        updateData.streak_freezes_used = goal.streak_freezes_used + 1
        updateData.last_freeze_date = today
      } else {
        updateData.current_streak = 0
      }
    }

    await supabase
      .from("user_goals")
      .update(updateData)
      .eq("id", goal.id)
      .eq("user_id", userId)
  }

  return goals.length
}

/**
 * Reset all weekly goals for a user when a new week starts.
 * Mirrors resetDailyGoals but uses Monday-based week boundaries.
 * Idempotent: skips goals whose period_start_date is already in the current week.
 */
export async function resetWeeklyGoals(userId: string, timezone: string | null = null): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const now = getNowInTimezone(timezone)
  const today = getTodayInTimezone(timezone)

  // Compute this week's Monday (ISO: Mon=1 ... Sun=7)
  const dayOfWeek = now.getDay() || 7 // Convert Sun=0 to 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  const mondayStr = monday.toISOString().split("T")[0]

  // Get all active weekly goals whose period_start_date is before this Monday
  const { data: goals, error: fetchError } = await supabase
    .from("user_goals")
    .select("id, current_value, target_value, current_streak, best_streak, period, period_start_date, streak_freezes_available, streak_freezes_used, last_freeze_date, linked_metric")
    .eq("user_id", userId)
    .eq("period", "weekly")
    .eq("is_active", true)
    .eq("is_archived", false)
    .lt("period_start_date", mondayStr) // Only goals from a previous week

  if (fetchError) {
    throw new Error(`Failed to fetch weekly goals: ${fetchError.message}`)
  }

  if (!goals || goals.length === 0) {
    return 0
  }

  // Snapshot ALL weekly goals BEFORE reset — capture pre-reset state for heatmap/review
  await snapshotGoals(userId, goals, today).catch(() => {})

  // Reset all weekly goals (including linked ones).
  // Linked goals get current_value set to 0 here, then syncLinkedGoals
  // (called after this in the tree route) immediately sets the correct value.
  // This ensures period_start_date, streak logic, and snapshots work for ALL goals.
  for (const goal of goals) {
    const wasComplete = goal.current_value >= goal.target_value

    const updateData: Record<string, unknown> = {
      current_value: 0,
      period_start_date: mondayStr,
    }

    if (!wasComplete) {
      if (shouldAutoFreeze(goal, today)) {
        updateData.streak_freezes_available = goal.streak_freezes_available - 1
        updateData.streak_freezes_used = goal.streak_freezes_used + 1
        updateData.last_freeze_date = today
      } else {
        updateData.current_streak = 0
      }
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
 * Get the metric value from tracking stats based on linked_metric type.
 * Weekly metrics validate that current_week matches the actual current week —
 * if the week rolled over but no new session was logged, weekly values return 0.
 */
export function getMetricValue(
  stats: UserTrackingStatsRow,
  metric: LinkedMetric,
  timezone: string | null = null
): number {
  const currentWeek = getISOWeekString(getNowInTimezone(timezone))
  const isCurrentWeek = stats.current_week === currentWeek

  switch (metric) {
    case "approaches_weekly":
      return isCurrentWeek ? stats.current_week_approaches : 0
    case "sessions_weekly":
      return isCurrentWeek ? stats.current_week_sessions : 0
    case "numbers_weekly":
      return isCurrentWeek ? (stats.current_week_numbers ?? 0) : 0
    case "instadates_weekly":
      return isCurrentWeek ? (stats.current_week_instadates ?? 0) : 0
    case "field_reports_weekly":
      return isCurrentWeek ? (stats.current_week_field_reports ?? 0) : 0
    case "approaches_cumulative":
      return stats.total_approaches
    case "sessions_cumulative":
      return stats.total_sessions
    case "numbers_cumulative":
      return stats.total_numbers
    case "instadates_cumulative":
      return stats.total_instadates
    case "field_reports_cumulative":
      return stats.total_field_reports
    default:
      return 0
  }
}

/**
 * Sync all goals with linked metrics to current tracking data
 * Call this after fetching tracking stats to keep goals in sync
 */
export async function syncLinkedGoals(userId: string, timezone: string | null = null): Promise<number> {
  const supabase = await createServerSupabaseClient()

  // Get user's tracking stats (create row if missing so linked goals always sync)
  let stats = await getOrCreateUserTrackingStats(userId)

  // Recompute weekly counters from actual data each sync.
  // Pre-computed counters can drift when different tracking paths (session vs approach
  // vs field-report) advance current_week without resetting each other's counters.
  const computedWeek = getISOWeekString(getNowInTimezone(timezone))
  if (stats.current_week === computedWeek) {
    const now = getNowInTimezone(timezone)
    const dayOfWeek = now.getDay() || 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek + 1)
    monday.setHours(0, 0, 0, 0)
    const mondayISO = monday.toISOString()

    // Count actual sessions this week
    const { count: sessionCount } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("started_at", mondayISO)

    // Count actual approaches this week
    const { count: approachCount } = await supabase
      .from("approaches")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", mondayISO)

    const realSessions = sessionCount ?? 0
    const realApproaches = approachCount ?? 0

    if (realSessions !== stats.current_week_sessions || realApproaches !== stats.current_week_approaches) {
      console.warn(`[syncLinkedGoals] repairing weekly counters: sessions ${stats.current_week_sessions} → ${realSessions}, approaches ${stats.current_week_approaches} → ${realApproaches}`)
      const { updateUserTrackingStats } = await import("./trackingRepo")
      await updateUserTrackingStats(userId, {
        current_week_sessions: realSessions,
        current_week_approaches: realApproaches,
      })
      stats = { ...stats, current_week_sessions: realSessions, current_week_approaches: realApproaches }
    }
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

  // Pre-fetch async metrics (only if any goal uses them)
  const needsQualityAvg = goals.some(g => g.linked_metric === "approach_quality_avg_weekly")
  let qualityAvg = 0
  if (needsQualityAvg) {
    const now = getNowInTimezone(timezone)
    const dayOfWeek = now.getDay() || 7 // 1=Mon..7=Sun
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek + 1)
    monday.setHours(0, 0, 0, 0)
    qualityAvg = await getWeeklyApproachQualityAvg(userId, monday.toISOString())
  }

  let updatedCount = 0

  for (const goal of goals) {
    const metric = goal.linked_metric as LinkedMetric
    const newValue = metric === "approach_quality_avg_weekly"
      ? qualityAvg
      : getMetricValue(stats, metric, timezone)

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
// Daily Goal Snapshots
// ============================================

/**
 * Snapshot goals before a period reset — captures pre-reset state for
 * heatmap calendar, weekly review, and trend analysis.
 * Uses admin client because daily_goal_snapshots is system-only (no INSERT RLS for users).
 */
export async function snapshotGoals(
  userId: string,
  goals: Array<{ id: string; current_value: number; target_value: number; current_streak: number; best_streak: number; period: string }>,
  snapshotDate: string
): Promise<number> {
  if (goals.length === 0) return 0

  const supabase = await createServerSupabaseClient()
  const rows = goals.map((g) => ({
    user_id: userId,
    goal_id: g.id,
    snapshot_date: snapshotDate,
    current_value: g.current_value,
    target_value: g.target_value,
    was_complete: g.current_value >= g.target_value,
    current_streak: g.current_streak,
    best_streak: g.best_streak,
    period: g.period,
  }))

  // Upsert to handle re-runs on the same day (idempotent)
  const { error } = await supabase
    .from("daily_goal_snapshots")
    .upsert(rows, { onConflict: "goal_id,snapshot_date" })

  if (error) {
    // Non-fatal: snapshot failure should not block reset
    console.error(`Snapshot failed: ${error.message}`)
    return 0
  }
  return rows.length
}

/**
 * Get snapshots for a single goal, most recent first.
 */
export async function getGoalSnapshots(
  userId: string,
  goalId: string,
  days: number = 90
): Promise<DailyGoalSnapshotRow[]> {
  const supabase = await createServerSupabaseClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("daily_goal_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .gte("snapshot_date", cutoffStr)
    .order("snapshot_date", { ascending: false })

  if (error) throw new Error(`Failed to fetch snapshots: ${error.message}`)
  return (data ?? []) as DailyGoalSnapshotRow[]
}

/**
 * Get all snapshots for a user in a date range (for weekly review, heatmap).
 */
export async function getSnapshotsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyGoalSnapshotRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("daily_goal_snapshots")
    .select("*")
    .eq("user_id", userId)
    .gte("snapshot_date", startDate)
    .lte("snapshot_date", endDate)
    .order("snapshot_date", { ascending: true })

  if (error) throw new Error(`Failed to fetch snapshots: ${error.message}`)
  return (data ?? []) as DailyGoalSnapshotRow[]
}

/**
 * Get all snapshots for a user in a week (convenience for weekly review).
 * weekStart should be a Monday date string (YYYY-MM-DD).
 */
export async function getWeeklyReviewSnapshots(
  userId: string,
  weekStart: string
): Promise<DailyGoalSnapshotRow[]> {
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const endStr = end.toISOString().split("T")[0]
  return getSnapshotsForDateRange(userId, weekStart, endStr)
}

// ============================================
// Streak Freezes
// ============================================

const MAX_STREAK_FREEZES = 3

/**
 * Award a streak freeze to a goal (earned from consistent streaks).
 * Capped at MAX_STREAK_FREEZES (3). Returns the new count.
 */
export async function awardStreakFreeze(userId: string, goalId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { data, error: fetchError } = await supabase
    .from("user_goals")
    .select("streak_freezes_available")
    .eq("id", goalId)
    .eq("user_id", userId)
    .single()

  if (fetchError) throw new Error(`Failed to fetch goal for freeze award: ${fetchError.message}`)

  const current = data.streak_freezes_available as number
  if (current >= MAX_STREAK_FREEZES) return current

  const newCount = current + 1
  const { error } = await supabase
    .from("user_goals")
    .update({ streak_freezes_available: newCount })
    .eq("id", goalId)
    .eq("user_id", userId)

  if (error) throw new Error(`Failed to award streak freeze: ${error.message}`)
  return newCount
}

/**
 * Manually consume a streak freeze for a goal.
 * Decrements available, increments used, sets last_freeze_date.
 */
export async function useStreakFreeze(userId: string, goalId: string, today: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { data, error: fetchError } = await supabase
    .from("user_goals")
    .select("streak_freezes_available, streak_freezes_used")
    .eq("id", goalId)
    .eq("user_id", userId)
    .single()

  if (fetchError) throw new Error(`Failed to fetch goal for freeze use: ${fetchError.message}`)
  if ((data.streak_freezes_available as number) <= 0) throw new Error("No streak freezes available")

  const { error } = await supabase
    .from("user_goals")
    .update({
      streak_freezes_available: (data.streak_freezes_available as number) - 1,
      streak_freezes_used: (data.streak_freezes_used as number) + 1,
      last_freeze_date: today,
    })
    .eq("id", goalId)
    .eq("user_id", userId)

  if (error) throw new Error(`Failed to use streak freeze: ${error.message}`)
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
 * Get full goal tree for a user (all active goals as hierarchy).
 * Pass includeArchived=true to also return archived goals (for customize mode).
 */
export async function getGoalTree(userId: string, includeArchived = false, timezone: string | null = null): Promise<GoalTreeNode[]> {
  const goals = await getUserGoals(userId, includeArchived, timezone)
  return buildTree(goals)
}

/**
 * Get direct children of a goal
 */
export async function getChildGoals(
  userId: string,
  parentGoalId: string,
  timezone: string | null = null
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

  return (data as UserGoalRow[]).map((g) => computeGoalProgress(g, timezone))
}

/**
 * Get ancestor chain from root to the given goal (inclusive)
 */
export async function getGoalAncestors(
  userId: string,
  goalId: string,
  timezone: string | null = null
): Promise<GoalWithProgress[]> {
  // Fetch all goals for user and walk up the tree
  const allGoals = await getUserGoals(userId, false, timezone)
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

/**
 * Permanently delete ALL goals for a user (single atomic query).
 * Returns the count of deleted goals.
 */
export async function getUserGoalCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await supabase
    .from("user_goals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_archived", false)
  if (error) throw new Error(`Failed to count goals: ${error.message}`)
  return count ?? 0
}

export async function deleteAllGoals(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  // First get count so we can report it
  const { data: goals, error: countError } = await supabase
    .from("user_goals")
    .select("id")
    .eq("user_id", userId)

  if (countError) {
    throw new Error(`Failed to count goals: ${countError.message}`)
  }

  const count = goals?.length ?? 0
  if (count === 0) return 0

  // Single atomic delete — no FK race conditions
  const { error } = await supabase
    .from("user_goals")
    .delete()
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to delete all goals: ${error.message}`)
  }

  return count
}
