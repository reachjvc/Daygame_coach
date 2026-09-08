/**
 * Database repository for Health & Appearance tracking
 *
 * All database access for weight_logs, sleep_logs, workout_logs, workout_sets, nutrition_logs.
 */

import { createServerSupabaseClient } from "./supabase"
import { getNowInTimezone, periodStartFor, startOfDayInstant } from "../shared/dateUtils"
import { weeklyStreakRun } from "../shared/streakRuns"
import { previousPeriodStart, toZonedDate, toDateISO, isStreakCurrent } from "../shared/dateUtils"
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
  BodyMeasurementRow,
  BodyMeasurementInsert,
} from "@/src/health/types"

/**
 * Monday 00:00 in the ACCOUNT HOLDER'S city, as the absolute instant it
 * happened — `logged_at` is a `timestamptz`, so the boundary has to be one too.
 *
 * This replaced nine hand-written copies of the same six lines, every one of
 * which used `new Date()` (the server's clock) and `monday.toISOString()`
 * (midnight in the SERVER's zone). For a Copenhagen user that moved the week
 * boundary by two hours, so a Sunday-evening workout counted towards the week
 * that had already ended.
 */
function weekStartInstant(timezone: string): string {
  return startOfDayInstant(periodStartFor("weekly", getNowInTimezone(timezone)), timezone)
}

/**
 * HOW MANY WEEKS IN A ROW SOMETHING WAS LOGGED.
 *
 * Two bugs lived in the two copies this replaces, and both were live:
 *
 * 1. **It could only ever return 0.** The two lists it compared were built with
 *    different formulas — one normalised to midnight before converting to a
 *    string, the other did not — so for any user east of London the week labels
 *    were a day apart and never matched.
 *
 * 2. **It wiped the streak every Monday.** It started at the current week and
 *    stopped at the first week with nothing in it. Before you had trained this
 *    week, that was this week, so ten weeks in a row read as 0 until you
 *    trained again. A run is over when a week has ENDED without being extended;
 *    the week you are still inside has not ended.
 *
 * Both are gone because there is now one implementation of "a run of
 * consecutive periods" (`streakRuns.ts`) and one implementation of "which week
 * is this instant in" (`periodStartFor` on a zoned date).
 */
function weeksTrainedInARow(loggedAt: string[], timezone: string): number {
  const thisWeek = periodStartFor("weekly", getNowInTimezone(timezone))
  const mondays = loggedAt.map((at) =>
    periodStartFor("weekly", toZonedDate(new Date(at), timezone))
  )
  const { run, last } = weeklyStreakRun(mondays, (monday) =>
    previousPeriodStart("weekly", monday)
  )

  // A health metric is computed for the screen and stored nowhere, so it gates
  // here rather than at a separate read. Same rule as every other streak: this
  // week and last week are both alive, because the user has not yet run out of
  // time to extend either.
  return isStreakCurrent("weekly", last, thisWeek) ? run : 0
}


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
    .order("created_at", { ascending: true })
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
    .order("created_at", { ascending: false })
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
    .order("created_at", { ascending: true })
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

/**
 * FINISHED workouts only — the filter every read of `workout_logs` needs.
 *
 * A workout in progress is now a row in this table with a start and no end, so
 * without this every existing reader counted it the second somebody pressed
 * Start: the weekly gym-sessions tile, the lifetime count, the streak, the
 * heatmap, the personal records, the CSV. Training hours would have summed a
 * NULL duration into a NaN.
 *
 * One helper rather than a filter repeated at every call site, and a unit test
 * greps for it, so a reader added later cannot quietly forget.
 */
export function finishedWorkouts<T extends { or: (f: string) => T }>(query: T): T {
  return query.or("ended_at.not.is.null,started_at.is.null")
}

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
    if (setsError) {
      /**
       * ALL OF IT, OR NONE OF IT.
       *
       * The workout row goes in first and the sets after, so a failure on the
       * sets used to leave an empty workout behind — it counts towards the
       * streak, the heatmap and the session totals while recording nothing that
       * happened. The person sees an error, tries again, and now has two.
       */
      await supabase.from("workout_logs").delete().eq("id", logData.id).eq("user_id", userId)
      throw new Error(`Failed to create workout sets: ${setsError.message}`)
    }
    insertedSets = (setsData ?? []) as WorkoutSetRow[]
  }

  return { ...(logData as WorkoutLogRow), sets: insertedSets }
}

export async function getWorkoutLogs(userId: string, days: number = 90): Promise<WorkoutLogRow[]> {
  const supabase = await createServerSupabaseClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: true })
    .order("created_at", { ascending: true })
  )
  if (error) throw new Error(`Failed to get workout logs: ${error.message}`)
  return (data ?? []) as WorkoutLogRow[]
}

export async function getWorkoutLogsWithSets(
  userId: string,
  days: number = 90
): Promise<(WorkoutLogRow & { sets: WorkoutSetRow[] })[]> {
  const supabase = await createServerSupabaseClient()
  const logs = await getWorkoutLogs(userId, days)
  if (logs.length === 0) return []
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .in("log_id", logs.map((l) => l.id))
    .order("set_number", { ascending: true })
  if (error) throw new Error(`Failed to get workout sets: ${error.message}`)
  const byLog = new Map<string, WorkoutSetRow[]>()
  for (const s of (data ?? []) as WorkoutSetRow[]) {
    const group = byLog.get(s.log_id)
    if (group) group.push(s)
    else byLog.set(s.log_id, [s])
  }
  return logs.map((l) => ({ ...l, sets: byLog.get(l.id) ?? [] }))
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
  const { data: logs, error: logsError } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("id")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10)
  )
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

export async function getWorkoutWeeklyCount(userId: string, timezone: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const weekStart = weekStartInstant(timezone)

  const { count, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("logged_at", weekStart)
  )
  if (error) throw new Error(`Failed to count weekly workouts: ${error.message}`)
  return count ?? 0
}

export async function getWorkoutCumulativeCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
  )
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
// Workout Templates
// ============================================


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
    .order("created_at", { ascending: true })
  if (error) throw new Error(`Failed to get nutrition logs: ${error.message}`)
  return (data ?? []) as NutritionLogRow[]
}

export async function getNutritionWeeklyAvg(userId: string, timezone: string): Promise<number | null> {
  const supabase = await createServerSupabaseClient()
  const weekStart = weekStartInstant(timezone)

  const { data, error } = await supabase
    .from("nutrition_logs")
    .select("quality_score")
    .eq("user_id", userId)
    .gte("logged_at", weekStart)
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

export async function getCardioWeeklyCount(userId: string, timezone: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const weekStart = weekStartInstant(timezone)

  const { count, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("session_type", "cardio")
    .gte("logged_at", weekStart)
  )
  if (error) throw new Error(`Failed to count cardio sessions: ${error.message}`)
  return count ?? 0
}

export async function getTrainingHoursCumulative(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("duration_min")
    .eq("user_id", userId)
  )
  if (error) throw new Error(`Failed to sum training hours: ${error.message}`)
  if (!data || data.length === 0) return 0
  // A workout still running has no duration yet. `finishedWorkouts` already
  // excludes those, so this is belt and braces — but summing a null once turns
  // the whole lifetime figure into NaN, and it shows on the dashboard.
  const totalMin = data.reduce((sum, d) => sum + (d.duration_min ?? 0), 0)
  return Math.round(totalMin / 60)
}

export async function getConsecutiveTrainingWeeks(userId: string, timezone: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("logged_at")
    .eq("user_id", userId)
  )
  if (error) throw new Error(`Failed to get training weeks: ${error.message}`)
  if (!data || data.length === 0) return 0

  return weeksTrainedInARow(data.map((row) => row.logged_at as string), timezone)
}

export async function getExerciseMax(userId: string, exercise: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  // Get all sets for this exercise, find the max weight (for 1RM estimation)
  const { data: logs, error: logsError } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("id")
    .eq("user_id", userId)
  )
  if (logsError) throw new Error(`Failed to query workout logs: ${logsError.message}`)
  if (!logs || logs.length === 0) return 0

  const logIds = logs.map((l) => l.id)
  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("weight_kg, reps")
    .in("log_id", logIds)
    .ilike("exercise", exercise)
    /**
     * `is_warmup` was dropped on 2026-09-07 and replaced by `set_kind`. This
     * filter survived the migration and threw on every call, so the estimated
     * one-rep max for every lift — and the strength goals built on it — came
     * back as an error rather than a number.
     *
     * Written as "these kinds count" rather than "not those kinds": the column
     * is NOT NULL with a default, so the list is exact, and it matches
     * `isWorkingSet`, which is the one place that decides what counts.
     */
    .in("set_kind", ["working", "amrap", "backoff"])
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

/**
 * DAYS this week on which the total protein reached the target.
 *
 * "Days", not log rows. This counted rows: two meals over 150g on the same day
 * scored 2, and a day made of three 60g meals — 180g, target hit — scored 0,
 * because no single row cleared the bar. A daily target is a fact about a day,
 * so the day is what has to be added up.
 *
 * The day is the user's day, from `toZonedDate`: a meal at 23:30 belongs to the
 * evening the user ate it.
 */
export async function getProteinDaysHitWeekly(userId: string, timezone: string, target: number = 150): Promise<number> {
  return countDaysMeetingTarget(userId, timezone, "protein_g", (total) => total >= target)
}

/**
 * DAYS this week on which the total stayed inside the calorie target.
 *
 * Two faults, both live: it counted rows rather than days, and it counted rows
 * where calories were **at or above** the target — the opposite of "stayed
 * inside". A day of heavy eating scored higher than a day of discipline.
 */
export async function getCalorieDaysHitWeekly(userId: string, timezone: string, target: number = 2000): Promise<number> {
  return countDaysMeetingTarget(userId, timezone, "calories", (total) => total <= target)
}

/**
 * How many of this week's days, summed over their own logs, meet a condition.
 *
 * A day with no logs at all is not counted either way — an empty day is a day
 * with no evidence, not a day inside the calorie target.
 */
async function countDaysMeetingTarget(
  userId: string,
  timezone: string,
  column: "protein_g" | "calories",
  meets: (dayTotal: number) => boolean
): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("nutrition_logs")
    .select(`logged_at, ${column}`)
    .eq("user_id", userId)
    .gte("logged_at", weekStartInstant(timezone))
    .not(column, "is", null)
  if (error) throw new Error(`Failed to read nutrition logs: ${error.message}`)
  if (!data) return 0

  const perDay = new Map<string, number>()
  for (const row of data as Array<Record<string, unknown>>) {
    const day = toDateISO(toZonedDate(new Date(row.logged_at as string), timezone))
    perDay.set(day, (perDay.get(day) ?? 0) + Number(row[column] ?? 0))
  }

  return [...perDay.values()].filter(meets).length
}

export async function getPullUpsMax(userId: string): Promise<number> {
  // Pull-ups are tracked as bodyweight exercise — max reps is the metric (not estimated 1RM)
  const supabase = await createServerSupabaseClient()
  const { data: logs, error: logsError } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("id")
    .eq("user_id", userId)
  )
  if (logsError) throw new Error(`Failed to query workout logs: ${logsError.message}`)
  if (!logs || logs.length === 0) return 0

  const logIds = logs.map((l) => l.id)
  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("reps")
    .in("log_id", logIds)
    .ilike("exercise", "%pull%up%")
    // Same dropped column as `getExerciseMax` above, same rule.
    .in("set_kind", ["working", "amrap", "backoff"])
  if (setsError) throw new Error(`Failed to query pull-up sets: ${setsError.message}`)
  if (!sets || sets.length === 0) return 0

  return Math.max(...sets.map((s) => s.reps))
}

// ============================================
// Body Measurements
// ============================================

export async function createBodyMeasurement(userId: string, m: BodyMeasurementInsert): Promise<BodyMeasurementRow> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("body_measurements")
    .insert({ user_id: userId, ...m })
    .select()
    .single()
  if (error) throw new Error(`Failed to create body measurement: ${error.message}`)
  return data as BodyMeasurementRow
}

export async function getBodyMeasurements(userId: string, days: number = 90): Promise<BodyMeasurementRow[]> {
  const supabase = await createServerSupabaseClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw new Error(`Failed to get body measurements: ${error.message}`)
  return (data ?? []) as BodyMeasurementRow[]
}

export async function getBodyMeasurementCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await supabase
    .from("body_measurements")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to count body measurements: ${error.message}`)
  return count ?? 0
}

export async function deleteBodyMeasurement(userId: string, id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("body_measurements")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to delete body measurement: ${error.message}`)
}

// ============================================
// Additional Aggregation Helpers
// ============================================


export async function getWeightLostFromPeak(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("logged_at", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw new Error(`Failed to get weight history: ${error.message}`)
  if (!data || data.length < 2) return 0
  const peak = Math.max(...data.map((d) => d.weight_kg))
  const latest = data[data.length - 1].weight_kg
  const lost = peak - latest
  return lost > 0 ? Math.round(lost * 10) / 10 : 0
}

export async function getWeightGainedFromLowest(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("logged_at", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw new Error(`Failed to get weight history: ${error.message}`)
  if (!data || data.length < 2) return 0
  const lowest = Math.min(...data.map((d) => d.weight_kg))
  const latest = data[data.length - 1].weight_kg
  const gained = latest - lowest
  return gained > 0 ? Math.round(gained * 10) / 10 : 0
}

export async function getMobilitySessionsWeekly(userId: string, timezone: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const weekStart = weekStartInstant(timezone)

  const { count, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("session_type", "mobility")
    .gte("logged_at", weekStart)
  )
  if (error) throw new Error(`Failed to count mobility sessions: ${error.message}`)
  return count ?? 0
}

export async function getYogaSessionsWeekly(userId: string, timezone: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const weekStart = weekStartInstant(timezone)

  const { count, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("session_type", "yoga")
    .gte("logged_at", weekStart)
  )
  if (error) throw new Error(`Failed to count yoga sessions: ${error.message}`)
  return count ?? 0
}

export async function getFlexibilityHoursCumulative(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("duration_min")
    .eq("user_id", userId)
    .in("session_type", ["mobility", "yoga"])
  )
  if (error) throw new Error(`Failed to sum flexibility hours: ${error.message}`)
  if (!data || data.length === 0) return 0
  return Math.round(data.reduce((sum, d) => sum + d.duration_min, 0) / 60)
}

export async function getRunningSessionsWeekly(userId: string, timezone: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const weekStart = weekStartInstant(timezone)

  const { count, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("session_type", "running")
    .gte("logged_at", weekStart)
  )
  if (error) throw new Error(`Failed to count running sessions: ${error.message}`)
  return count ?? 0
}

export async function getRunningDistanceCumulative(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("distance_km")
    .eq("user_id", userId)
    .eq("session_type", "running")
    .not("distance_km", "is", null)
  )
  if (error) throw new Error(`Failed to sum running distance: ${error.message}`)
  if (!data || data.length === 0) return 0
  return Math.round(data.reduce((sum, d) => sum + (d.distance_km ?? 0), 0) * 10) / 10
}

export async function getLongestRunKm(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("distance_km")
    .eq("user_id", userId)
    .eq("session_type", "running")
    .not("distance_km", "is", null)
    .order("distance_km", { ascending: false })
    .limit(1)
  )
  if (error) throw new Error(`Failed to get longest run: ${error.message}`)
  if (!data || data.length === 0) return 0
  return data[0].distance_km ?? 0
}

export async function getConsecutiveCardioWeeks(userId: string, timezone: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("logged_at")
    .eq("user_id", userId)
    .in("session_type", ["cardio", "running"])
  )
  if (error) throw new Error(`Failed to get cardio weeks: ${error.message}`)
  if (!data || data.length === 0) return 0

  return weeksTrainedInARow(data.map((row) => row.logged_at as string), timezone)
}

export async function getSleepWeeklyAvgHours(userId: string, timezone: string): Promise<number | null> {
  const supabase = await createServerSupabaseClient()
  const weekStart = weekStartInstant(timezone)

  const { data, error } = await supabase
    .from("sleep_logs")
    .select("bedtime, wake_time")
    .eq("user_id", userId)
    .gte("logged_at", weekStart)
  if (error) throw new Error(`Failed to get sleep avg: ${error.message}`)
  if (!data || data.length === 0) return null

  const { computeSleepHours } = await import("@/src/health/healthService")
  const totalHours = data.reduce((sum, d) => sum + computeSleepHours(d.bedtime, d.wake_time), 0)
  return Math.round((totalHours / data.length) * 10) / 10
}
