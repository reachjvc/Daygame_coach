/**
 * Database repository for Health & Appearance tracking
 *
 * All database access for weight_logs, sleep_logs, workout_logs, workout_sets, nutrition_logs.
 */

import { createServerSupabaseClient } from "./supabase"
import type {
  WeightLogRow,
  WeightLogInsert,
  SleepLogRow,
  SleepLogInsert,
  WorkoutLogRow,
  WorkoutLogInsert,
  WorkoutSetRow,
  WorkoutSetInsert,
  NutritionLogRow,
  NutritionLogInsert,
} from "@/src/health/types"

// ============================================
// Weight Logs
// ============================================

export async function createWeightLog(userId: string, log: WeightLogInsert): Promise<WeightLogRow> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("weight_logs")
    .insert({ user_id: userId, ...log })
    .select()
    .single()
  if (error) throw new Error(`Failed to create weight log: ${error.message}`)
  return data as WeightLogRow
}

export async function getWeightLogs(userId: string, days: number = 30): Promise<WeightLogRow[]> {
  const supabase = await createServerSupabaseClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: true })
  if (error) throw new Error(`Failed to get weight logs: ${error.message}`)
  return (data ?? []) as WeightLogRow[]
}

export async function getLatestWeight(userId: string): Promise<WeightLogRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .single()
  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to get latest weight: ${error.message}`)
  }
  return data as WeightLogRow
}

export async function deleteWeightLog(userId: string, logId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("weight_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to delete weight log: ${error.message}`)
}

// ============================================
// Sleep Logs
// ============================================

export async function createSleepLog(userId: string, log: SleepLogInsert): Promise<SleepLogRow> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("sleep_logs")
    .insert({ user_id: userId, ...log })
    .select()
    .single()
  if (error) throw new Error(`Failed to create sleep log: ${error.message}`)
  return data as SleepLogRow
}

export async function getSleepLogs(userId: string, days: number = 30): Promise<SleepLogRow[]> {
  const supabase = await createServerSupabaseClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: true })
  if (error) throw new Error(`Failed to get sleep logs: ${error.message}`)
  return (data ?? []) as SleepLogRow[]
}

export async function deleteSleepLog(userId: string, logId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("sleep_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to delete sleep log: ${error.message}`)
}

// ============================================
// Workout Logs
// ============================================

export async function createWorkoutLog(
  userId: string,
  log: WorkoutLogInsert,
  sets?: WorkoutSetInsert[]
): Promise<WorkoutLogRow & { sets: WorkoutSetRow[] }> {
  const supabase = await createServerSupabaseClient()
  const { data: logData, error: logError } = await supabase
    .from("workout_logs")
    .insert({ user_id: userId, ...log })
    .select()
    .single()
  if (logError) throw new Error(`Failed to create workout log: ${logError.message}`)

  let insertedSets: WorkoutSetRow[] = []
  if (sets && sets.length > 0) {
    const setsWithLogId = sets.map((s) => ({ ...s, log_id: logData.id }))
    const { data: setsData, error: setsError } = await supabase
      .from("workout_sets")
      .insert(setsWithLogId)
      .select()
    if (setsError) throw new Error(`Failed to create workout sets: ${setsError.message}`)
    insertedSets = (setsData ?? []) as WorkoutSetRow[]
  }

  return { ...(logData as WorkoutLogRow), sets: insertedSets }
}

export async function getWorkoutLogs(userId: string, days: number = 90): Promise<WorkoutLogRow[]> {
  const supabase = await createServerSupabaseClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: true })
  if (error) throw new Error(`Failed to get workout logs: ${error.message}`)
  return (data ?? []) as WorkoutLogRow[]
}

export async function getWorkoutSets(logId: string): Promise<WorkoutSetRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("log_id", logId)
    .order("set_number", { ascending: true })
  if (error) throw new Error(`Failed to get workout sets: ${error.message}`)
  return (data ?? []) as WorkoutSetRow[]
}

export async function getLastWorkoutSets(userId: string, exercise: string): Promise<WorkoutSetRow[]> {
  const supabase = await createServerSupabaseClient()
  // Find the most recent workout log with sets for this exercise
  const { data: logs, error: logsError } = await supabase
    .from("workout_logs")
    .select("id")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(10)
  if (logsError) throw new Error(`Failed to query workout logs: ${logsError.message}`)
  if (!logs || logs.length === 0) return []

  const logIds = logs.map((l) => l.id)
  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("*")
    .in("log_id", logIds)
    .ilike("exercise", exercise)
    .order("set_number", { ascending: true })
  if (setsError) throw new Error(`Failed to query workout sets: ${setsError.message}`)

  if (!sets || sets.length === 0) return []

  // Return sets from the most recent log that had this exercise
  const firstLogId = sets[0].log_id
  return sets.filter((s) => s.log_id === firstLogId) as WorkoutSetRow[]
}

export async function getWorkoutWeeklyCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("logged_at", monday.toISOString())
  if (error) throw new Error(`Failed to count weekly workouts: ${error.message}`)
  return count ?? 0
}

export async function getWorkoutCumulativeCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to count total workouts: ${error.message}`)
  return count ?? 0
}

export async function deleteWorkoutLog(userId: string, logId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  // Sets cascade delete via FK
  const { error } = await supabase
    .from("workout_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to delete workout log: ${error.message}`)
}

// ============================================
// Nutrition Logs
// ============================================

export async function createNutritionLog(userId: string, log: NutritionLogInsert): Promise<NutritionLogRow> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("nutrition_logs")
    .insert({ user_id: userId, ...log })
    .select()
    .single()
  if (error) throw new Error(`Failed to create nutrition log: ${error.message}`)
  return data as NutritionLogRow
}

export async function getNutritionLogs(userId: string, days: number = 30): Promise<NutritionLogRow[]> {
  const supabase = await createServerSupabaseClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: true })
  if (error) throw new Error(`Failed to get nutrition logs: ${error.message}`)
  return (data ?? []) as NutritionLogRow[]
}

export async function getNutritionWeeklyAvg(userId: string): Promise<number | null> {
  const supabase = await createServerSupabaseClient()
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("quality_score")
    .eq("user_id", userId)
    .gte("logged_at", monday.toISOString())
  if (error) throw new Error(`Failed to get nutrition avg: ${error.message}`)
  if (!data || data.length === 0) return null
  return data.reduce((sum, d) => sum + d.quality_score, 0) / data.length
}

export async function deleteNutritionLog(userId: string, logId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("nutrition_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to delete nutrition log: ${error.message}`)
}

// ============================================
// Aggregation Helpers for Linked Metrics
// ============================================

export async function getCardioWeeklyCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("session_type", "cardio")
    .gte("logged_at", monday.toISOString())
  if (error) throw new Error(`Failed to count cardio sessions: ${error.message}`)
  return count ?? 0
}

export async function getTrainingHoursCumulative(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("workout_logs")
    .select("duration_min")
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to sum training hours: ${error.message}`)
  if (!data || data.length === 0) return 0
  const totalMin = data.reduce((sum, d) => sum + d.duration_min, 0)
  return Math.round(totalMin / 60)
}

export async function getConsecutiveTrainingWeeks(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  // Get all workout dates, determine which ISO weeks have ≥1 workout, count streak from current week backward
  const { data, error } = await supabase
    .from("workout_logs")
    .select("logged_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
  if (error) throw new Error(`Failed to get training weeks: ${error.message}`)
  if (!data || data.length === 0) return 0

  const weeksWithWorkouts = new Set<string>()
  for (const row of data) {
    const d = new Date(row.logged_at)
    const dayOfWeek = d.getDay() || 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - dayOfWeek + 1)
    weeksWithWorkouts.add(monday.toISOString().split("T")[0])
  }

  // Count consecutive weeks backward from current week
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const currentMonday = new Date(now)
  currentMonday.setDate(now.getDate() - dayOfWeek + 1)
  currentMonday.setHours(0, 0, 0, 0)

  let streak = 0
  const checkDate = new Date(currentMonday)
  while (weeksWithWorkouts.has(checkDate.toISOString().split("T")[0])) {
    streak++
    checkDate.setDate(checkDate.getDate() - 7)
  }
  return streak
}

export async function getExerciseMax(userId: string, exercise: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  // Get all sets for this exercise, find the max weight (for 1RM estimation)
  const { data: logs, error: logsError } = await supabase
    .from("workout_logs")
    .select("id")
    .eq("user_id", userId)
  if (logsError) throw new Error(`Failed to query workout logs: ${logsError.message}`)
  if (!logs || logs.length === 0) return 0

  const logIds = logs.map((l) => l.id)
  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("weight_kg, reps")
    .in("log_id", logIds)
    .ilike("exercise", exercise)
  if (setsError) throw new Error(`Failed to query sets for ${exercise}: ${setsError.message}`)
  if (!sets || sets.length === 0) return 0

  // Epley formula for estimated 1RM: weight × (1 + reps/30)
  let maxEstimated = 0
  for (const s of sets) {
    const estimated = s.reps === 1 ? s.weight_kg : s.weight_kg * (1 + s.reps / 30)
    if (estimated > maxEstimated) maxEstimated = estimated
  }
  return Math.round(maxEstimated)
}

export async function getProgressPhotoCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await supabase
    .from("weight_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("photo_url", "is", null)
  if (error) throw new Error(`Failed to count progress photos: ${error.message}`)
  return count ?? 0
}

export async function getProteinDaysHitWeekly(userId: string, target: number = 150): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("protein_g")
    .eq("user_id", userId)
    .gte("logged_at", monday.toISOString())
    .not("protein_g", "is", null)
  if (error) throw new Error(`Failed to get protein days: ${error.message}`)
  if (!data) return 0
  return data.filter((d) => (d.protein_g ?? 0) >= target).length
}

export async function getPullUpsMax(userId: string): Promise<number> {
  // Pull-ups are tracked as bodyweight exercise — max reps is the metric (not estimated 1RM)
  const supabase = await createServerSupabaseClient()
  const { data: logs, error: logsError } = await supabase
    .from("workout_logs")
    .select("id")
    .eq("user_id", userId)
  if (logsError) throw new Error(`Failed to query workout logs: ${logsError.message}`)
  if (!logs || logs.length === 0) return 0

  const logIds = logs.map((l) => l.id)
  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("reps")
    .in("log_id", logIds)
    .ilike("exercise", "%pull%up%")
  if (setsError) throw new Error(`Failed to query pull-up sets: ${setsError.message}`)
  if (!sets || sets.length === 0) return 0

  return Math.max(...sets.map((s) => s.reps))
}

export async function getSleepWeeklyAvgHours(userId: string): Promise<number | null> {
  const supabase = await createServerSupabaseClient()
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from("sleep_logs")
    .select("bedtime, wake_time")
    .eq("user_id", userId)
    .gte("logged_at", monday.toISOString())
  if (error) throw new Error(`Failed to get sleep avg: ${error.message}`)
  if (!data || data.length === 0) return null

  const { computeSleepHours } = await import("@/src/health/healthService")
  const totalHours = data.reduce((sum, d) => sum + computeSleepHours(d.bedtime, d.wake_time), 0)
  return Math.round((totalHours / data.length) * 10) / 10
}
