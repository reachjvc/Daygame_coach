/**
 * Database repository for Health & Appearance tracking
 *
 * All database access for weight_logs, sleep_logs, workout_logs, workout_sets, nutrition_logs.
 */

import { createServerSupabaseClient } from "./supabase"
import { chunkIds, readAllRows } from "./paging"
import { libraryByName } from "@/src/programs/data/exerciseLibrary"
import { getNowInTimezone, periodStartFor, startOfDayInstant } from "../shared/dateUtils"
import { weeklyStreakRun } from "../shared/streakRuns"
import {
  cappedEstimate,
  liftBests,
} from "@/src/health/healthService"
import { getUserTimezone } from "./settingsRepo"
import { previousPeriodStart, toZonedDate, toDateISO, isStreakCurrent } from "../shared/dateUtils"
import type {
  WeightLogRow,
  WeightLogInsert,
  SleepLogRow,
  SleepLogInsert,
  WorkoutLogRow,
  WorkoutSetRow,
  NutritionLogRow,
  NutritionLogInsert,
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
export const FINISHED_WORKOUTS_FILTER = "ended_at.not.is.null,started_at.is.null"

export function finishedWorkouts<T extends { or: (f: string) => T }>(query: T): T {
  return query.or(FINISHED_WORKOUTS_FILTER)
}

/**
 * `createWorkoutLog` was here: one insert that wrote a finished workout and
 * all its sets.
 *
 * It was the second way to record a workout. It read every weight as
 * kilograms whatever the account trains in, and it wrote the workout row
 * before its sets — so a refused set left an empty session counting towards
 * the streak, the heatmap and the totals while recording nothing. A workout
 * is now started and finished, which is two calls and one set of rules.
 */


export async function getWorkoutLogs(userId: string, days: number = 90): Promise<WorkoutLogRow[]> {
  const supabase = await createServerSupabaseClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  // History screens ask for `days=3650`. Somebody who trains four times a week
  // passes a thousand workouts in five years, and the ones that fall off the
  // end are the recent ones nobody would think to look for.
  return await readAllRows<WorkoutLogRow>("workout logs", (from, to) =>
    finishedWorkouts(
      supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: true })
        .order("created_at", { ascending: true })
        // Two workouts logged in the same second would otherwise be free to
        // swap places between pages, so one is read twice and one is lost.
        .order("id", { ascending: true })
        .range(from, to)
    )
  )
}

/**
 * The order the sets of one workout are read back in.
 *
 * Set numbers repeat inside a workout — a warm-up and the first working set are
 * both "set 1" — so sorting on the number alone leaves those two free to swap
 * places between one page load and the next. That is visible: the row you
 * clicked to edit is not the row you get. Warm-ups first, then the order they
 * were actually done in, and `id` last so the answer is never arbitrary.
 */
const inWorkoutOrder = (a: WorkoutSetRow, b: WorkoutSetRow): number =>
  a.set_number - b.set_number ||
  Number(a.set_kind !== "warmup") - Number(b.set_kind !== "warmup") ||
  (a.completed_at ?? "").localeCompare(b.completed_at ?? "") ||
  a.id.localeCompare(b.id)

export async function getWorkoutLogsWithSets(
  userId: string,
  days: number = 90
): Promise<(WorkoutLogRow & { sets: WorkoutSetRow[] })[]> {
  const supabase = await createServerSupabaseClient()
  const logs = await getWorkoutLogs(userId, days)
  if (logs.length === 0) return []
  /**
   * THE ONE THAT ALREADY BIT. A year of training is around 2,400 sets, and this
   * asked for all of them in a single request ordered by set number. It got the
   * first 1,000 — which, in that order, is every warm-up and every first and
   * second set, and none of the rest. So a five-set squat day appeared in
   * History as two sets, and the correction screen, which saves back the list
   * it was shown, would then delete the other three from the database.
   */
  const sets: WorkoutSetRow[] = []
  for (const ids of chunkIds(logs.map((l) => l.id))) {
    sets.push(
      ...(await readAllRows<WorkoutSetRow>("workout sets", (from, to) =>
        supabase
          .from("workout_sets")
          .select("*")
          .in("log_id", ids)
          // Set number is not unique across workouts, so it cannot be what the
          // pages are cut on. Ordered by id here, into display order below.
          .order("id", { ascending: true })
          .range(from, to)
      ))
    )
  }
  const byLog = new Map<string, WorkoutSetRow[]>()
  for (const s of sets) {
    const group = byLog.get(s.log_id)
    if (group) group.push(s)
    else byLog.set(s.log_id, [s])
  }
  for (const group of byLog.values()) group.sort(inWorkoutOrder)
  return logs.map((l) => ({ ...l, sets: byLog.get(l.id) ?? [] }))
}

/**
 * One workout's sets, whole.
 *
 * THE READ A CORRECTION MUST USE. Editing a workout saves back the list it was
 * shown, so it can only ever be as right as the list it started from — and the
 * list read (`getWorkoutLogsWithSets`) reads a year at a time, which is the one
 * that outgrew a page and started arriving short. Asking for a single workout
 * cannot outgrow anything, and if the request fails the screen is told so
 * rather than being handed a shorter list that looks complete.
 */
export async function getWorkoutSets(userId: string, logId: string): Promise<WorkoutSetRow[]> {
  const supabase = await createServerSupabaseClient()
  /**
   * Ownership checked here AS WELL AS by the database's own row policy. The
   * policy is the thing that actually stops it, but one of the two being wrong
   * should not be enough to hand somebody another person's training.
   */
  const { data: log, error: logError } = await supabase
    .from("workout_logs")
    .select("id")
    .eq("id", logId)
    .eq("user_id", userId)
    .maybeSingle()
  if (logError) throw new Error(`Failed to get workout: ${logError.message}`)
  if (!log) throw new Error("That workout could not be found.")

  const rows = await readAllRows<WorkoutSetRow>("workout sets", (from, to) =>
    supabase
      .from("workout_sets")
      .select("*")
      .eq("log_id", logId)
      .order("id", { ascending: true })
      .range(from, to)
  )
  return rows.sort(inWorkoutOrder)
}

/**
 * GYM SESSIONS ARE THE ONES WITH WEIGHT IN THEM.
 *
 * This counted every workout row whatever its `session_type`, so a week of
 * three runs read as three gym sessions — and a goal linked to "3 gym sessions a
 * week" was met by never touching a barbell. The same repository has
 * type-specific reads a few lines away (`cardio`, `mobility`, `yoga`), so the
 * column was always there to filter on; this read simply never did.
 *
 * `GYM_SESSION_TYPES` is the list, in one place, so the weekly and lifetime
 * counts cannot drift apart.
 */
export const GYM_SESSION_TYPES = ["weights"] as const

export async function getWorkoutWeeklyCount(userId: string, timezone: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const weekStart = weekStartInstant(timezone)

  const { count, error } = await finishedWorkouts(
    supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("session_type", GYM_SESSION_TYPES)
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
    // Same list as the weekly count above, for the same reason.
    .in("session_type", GYM_SESSION_TYPES)
  )
  if (error) throw new Error(`Failed to count total workouts: ${error.message}`)
  return count ?? 0
}

/**
 * Delete a workout — AND UNDO WHAT IT DID TO THE PROGRAM.
 *
 * THE BUG THIS FIXES. This deleted the row and stopped. If the workout answered
 * a program, the weights that workout advanced stayed advanced: you squatted
 * 100 kg on Tuesday, the program moved you to 102.5, you deleted Tuesday as a
 * mistake, and it kept asking for 102.5 forever, from a session that no longer
 * exists. There was no way to get back — the state a log advanced FROM is not
 * stored, so nothing could reverse it by hand.
 *
 * `recalculateEnrollment` replays every remaining session over the stored seed,
 * which is the only honest answer to "what should the weights say now". It is
 * the same call `reviseWorkout` already made for a correction; deleting simply
 * never made it.
 *
 * The enrollment is read BEFORE the delete, because `workout_logs.enrollment_id`
 * is `ON DELETE SET NULL` — after the row is gone there is nothing left to say
 * which program it belonged to.
 */
export async function deleteWorkoutLog(
  userId: string,
  logId: string
): Promise<{ recalculated: boolean }> {
  const supabase = await createServerSupabaseClient()

  const { data: log, error: readError } = await supabase
    .from("workout_logs")
    .select("enrollment_id")
    .eq("id", logId)
    .eq("user_id", userId)
    .maybeSingle()
  if (readError) throw new Error(`Failed to read that workout: ${readError.message}`)

  /**
   * A PROGRAM SESSION IS DELETED AND RECALCULATED TOGETHER, OR NOT AT ALL.
   *
   * These were two writes: delete, then recalculate. The delete committed, so a
   * recalculation that failed left the session gone AND the weights still
   * advanced by it — for ever, from a session that no longer exists — while the
   * screen said the delete had failed. `removeProgramSession` computes the new
   * weights first and commits them with the delete in one statement.
   */
  if (log?.enrollment_id) {
    const { removeProgramSession } = await import("./programRepo")
    await removeProgramSession(userId, log.enrollment_id, logId)
    return { recalculated: true }
  }

  // Sets cascade delete via FK
  const { error } = await supabase
    .from("workout_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to delete workout log: ${error.message}`)

  return { recalculated: false }
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
  // A lifetime total, so this is the read most likely to outgrow one page —
  // and losing the tail makes the number go DOWN as somebody trains more.
  const data = await readAllRows<{ duration_min: number | null }>("training hours", (from, to) =>
    finishedWorkouts(
      supabase
        .from("workout_logs")
        .select("duration_min")
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, to)
    )
  )
  if (data.length === 0) return 0
  // A workout still running has no duration yet. `finishedWorkouts` already
  // excludes those, so this is belt and braces — but summing a null once turns
  // the whole lifetime figure into NaN, and it shows on the dashboard.
  const totalMin = data.reduce((sum, d) => sum + (d.duration_min ?? 0), 0)
  return Math.round(totalMin / 60)
}

export async function getConsecutiveTrainingWeeks(userId: string, timezone: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  // The streak is counted from the WHOLE history; a page of it silently missing
  // breaks the run and resets somebody's streak to zero for no reason.
  const data = await readAllRows<{ logged_at: string }>("training weeks", (from, to) =>
    finishedWorkouts(
      supabase
        .from("workout_logs")
        .select("logged_at")
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, to)
    )
  )
  if (data.length === 0) return 0

  return weeksTrainedInARow(data.map((row) => row.logged_at), timezone)
}

/**
 * Every finished workout's id, for the reads that then look inside them.
 *
 * Paged, because these feed a "max ever" number: read half the history and the
 * app reports a personal best the user beat years ago, with no sign anything
 * was missing. Extracted so the two callers cannot drift apart.
 */
async function finishedLogIds(userId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  const rows = await readAllRows<{ id: string }>("workout logs", (from, to) =>
    finishedWorkouts(
      supabase
        .from("workout_logs")
        .select("id")
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, to)
    )
  )
  return rows.map((r) => r.id)
}

/**
 * THE HEAVIEST SET OF A LIFT, WHATEVER THE PROGRAM CALLED IT.
 *
 * WHAT WAS WRONG. This matched one exact name — `.ilike("exercise", exercise)`
 * is case-insensitive EQUALITY, with no wildcard — and the caller asks for
 * "squat" (`src/db/metricsRepo.ts:401`). The exercise library calls it "Back
 * Squat", and a self-built week copies the library's name onto every set. So
 * somebody who built their own week and squatted twice a week for three months
 * had a Squat 1RM tile reading 0 kg forever, indistinguishable from never having
 * squatted at all.
 *
 * It matches on `library_id` now — the lift's identity across programs — and
 * falls back to the name for the rows written before that column was populated.
 * Bench Press, Deadlift and Overhead Press were never affected because their
 * library names happen to equal the literals passed in; Squat was the one that
 * did not, which is exactly why a name is the wrong key.
 */
export async function getExerciseMax(userId: string, exercise: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const logIds = await finishedLogIds(userId)
  if (logIds.length === 0) return 0

  // The library entry the caller means, if there is one. `libraryByName` already
  // knows the aliases ("squat" -> the barbell back squat).
  const libraryId = libraryByName(exercise)?.id ?? null
  /**
   * Either match is this lift. Written as one `or` rather than a branch so the
   * query stays a single chain — `.range()` has to be on the same expression, and
   * `tests/unit/architecture.test.ts` refuses a read that cannot be seen to page.
   */
  const isThisLift = libraryId
    ? `library_id.eq.${libraryId},exercise.ilike.${exercise}`
    : `exercise.ilike.${exercise}`

  const sets: { weight_kg: number; reps: number }[] = []
  for (const ids of chunkIds(logIds)) {
    sets.push(...(await readAllRows<{ weight_kg: number; reps: number }>(`sets for ${exercise}`, (from, to) =>
    supabase
    .from("workout_sets")
    .select("weight_kg, reps")
    .in("log_id", ids)
    .or(isThisLift)
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
    .order("id", { ascending: true })
    .range(from, to)
    )))
  }
  if (sets.length === 0) return 0

  /**
   * THE SAME FORMULA "Your bests" USES, and it did not used to be.
   *
   * This ran Epley uncapped while `liftBests` capped it at ten reps, so a
   * twenty-rep set of 60 kg put "100 kg" on this tile and "60 kg" in the Progress
   * list — two numbers for one set, on two screens, neither labelled as an
   * estimate of anything different. One function owns it now.
   */
  let maxEstimated = 0
  for (const s of sets) {
    const estimated = cappedEstimate(s.weight_kg, s.reps)
    if (estimated > maxEstimated) maxEstimated = estimated
  }
  return Math.round(maxEstimated)
}

/**
 * Every working set you have ever logged — the history a best is measured from.
 *
 * ALL TIME, AND ALL OF IT. Three screens each had their own window: the finish
 * summary looked at the last 400 workouts, Progress at 365 days, the
 * past-workout form at 90. So one lift was a record on one screen and not on
 * the next, and a lifter coming back after a year was congratulated on weights
 * they had beaten before.
 *
 * PAGED IN TWO STEPS, never as a nested `workout_sets(*)` on an unpaged parent:
 * a year of training is around 2,400 set rows and the database silently hands
 * over 1,000. A short baseline is worse than no baseline, because it announces
 * records that are not records.
 *
 * `before` narrows it to what was logged BEFORE one particular workout, so the
 * workout being finished is never counted as its own previous best.
 *
 * A FAILED READ IS NOT AN EMPTY HISTORY. It comes back flagged, so the caller
 * can say "not checked" rather than "nothing to beat".
 */
export async function personalBestBaseline(
  userId: string,
  before?: { workoutId: string; loggedAt: string }
): Promise<{ sets: (WorkoutSetRow & { logged_at: string })[]; unavailable: boolean }> {
  const supabase = await createServerSupabaseClient()
  try {
    /**
     * TWO WHOLE CHAINS RATHER THAN ONE BUILT UP IN STEPS, and `.range()` inside
     * the `finishedWorkouts(...)` wrapper rather than after it.
     *
     * Both are so the paging is VISIBLE. `tests/unit/architecture.test.ts`
     * counts reads with no upper bound by looking at the chain that starts at
     * `.from(` — so a query assembled across several statements, or one whose
     * `.range()` lands outside the wrapper's parentheses, reads as unbounded.
     * The guard that catches a genuinely unbounded read is worth the repetition.
     * `getWorkoutLogs` above is written the same way, for the same reason.
     */
    const logs = await readAllRows<{ id: string; logged_at: string }>(
      "finished workouts",
      (from, to) =>
        before
          ? finishedWorkouts(
              supabase
                .from("workout_logs")
                .select("id, logged_at")
                .eq("user_id", userId)
                .lt("logged_at", before.loggedAt)
                .neq("id", before.workoutId)
                .order("logged_at", { ascending: true })
                .order("id", { ascending: true })
                .range(from, to)
            )
          : finishedWorkouts(
              supabase
                .from("workout_logs")
                .select("id, logged_at")
                .eq("user_id", userId)
                .order("logged_at", { ascending: true })
                .order("id", { ascending: true })
                .range(from, to)
            )
    )
    if (logs.length === 0) return { sets: [], unavailable: false }

    const loggedAt = new Map(logs.map((l) => [l.id, l.logged_at]))
    const sets: (WorkoutSetRow & { logged_at: string })[] = []
    for (const ids of chunkIds(logs.map((l) => l.id))) {
      const page = await readAllRows<WorkoutSetRow>("workout sets", (from, to) =>
        supabase
          .from("workout_sets")
          .select("*")
          .in("log_id", ids)
          .order("id", { ascending: true })
          .range(from, to)
      )
      for (const row of page) sets.push({ ...row, logged_at: loggedAt.get(row.log_id) ?? "" })
    }
    return { sets, unavailable: false }
  } catch (e) {
    /**
     * The workout itself must still save. Losing an hour of training because a
     * nice-to-have could not be computed is the worse trade — so the failure is
     * carried out with the answer.
     */
    console.error("could not read training history for personal records:", e)
    return { sets: [], unavailable: true }
  }
}

/**
 * The best on every lift, all time, on the account's own calendar.
 *
 * The Progress screen used to work this out in the browser from a 365-day
 * window, which made "Your bests" mean "your bests this year" and put a
 * different answer on it from the finish summary's.
 */
export async function liftBestsAllTime(userId: string) {
  const baseline = await personalBestBaseline(userId)
  if (baseline.unavailable) throw new Error("Could not read your training history.")
  const byLog = new Map<string, { logged_at: string; sets: WorkoutSetRow[] }>()
  for (const set of baseline.sets) {
    const group = byLog.get(set.log_id)
    if (group) group.sets.push(set)
    else byLog.set(set.log_id, { logged_at: set.logged_at, sets: [set] })
  }
  const logs = [...byLog.entries()].map(([id, g]) => ({ id, logged_at: g.logged_at, sets: g.sets }))
  return liftBests(logs as unknown as Parameters<typeof liftBests>[0], await getUserTimezone(userId))
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
  const logIds = await finishedLogIds(userId)
  if (logIds.length === 0) return 0

  const sets: { reps: number }[] = []
  for (const ids of chunkIds(logIds)) {
    sets.push(...(await readAllRows<{ reps: number }>("pull-up sets", (from, to) =>
      supabase
        .from("workout_sets")
        .select("reps")
        .in("log_id", ids)
        .ilike("exercise", "%pull%up%")
        // Same dropped column as `getExerciseMax` above, same rule.
        .in("set_kind", ["working", "amrap", "backoff"])
        .order("id", { ascending: true })
        .range(from, to)
    )))
  }
  if (sets.length === 0) return 0

  return Math.max(...sets.map((s) => s.reps))
}

// ============================================
// Body Measurements
// ============================================

export async function getBodyMeasurementCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await supabase
    .from("body_measurements")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to count body measurements: ${error.message}`)
  return count ?? 0
}

export async function getWeightLostFromPeak(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  // Oldest first, so an unpaged read would drop the RECENT weigh-ins and the
  // number would stop moving — for somebody who weighs in daily, after about
  // three years, silently.
  const data = await readAllRows<{ weight_kg: number }>("weight history", (from, to) =>
    supabase
      .from("weight_logs")
      .select("weight_kg")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  )
  if (data.length < 2) return 0
  const peak = Math.max(...data.map((d) => d.weight_kg))
  const latest = data[data.length - 1].weight_kg
  const lost = peak - latest
  return lost > 0 ? Math.round(lost * 10) / 10 : 0
}

export async function getWeightGainedFromLowest(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  // Oldest first, so an unpaged read would drop the RECENT weigh-ins and the
  // number would stop moving — for somebody who weighs in daily, after about
  // three years, silently.
  const data = await readAllRows<{ weight_kg: number }>("weight history", (from, to) =>
    supabase
      .from("weight_logs")
      .select("weight_kg")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  )
  if (data.length < 2) return 0
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
  // PAGED, and the filter is written inline rather than wrapped: the guard in
  // tests/unit/architecture.test.ts reads the chain that starts at `.from(`, and
  // a `.range()` outside the `finishedWorkouts(...)` wrapper is invisible to it.
  // A lifetime total is exactly the read that outgrows one page.
  const data = await readAllRows<{ duration_min: number }>("flexibility sessions", (from, to) =>
    supabase
      .from("workout_logs")
      .select("duration_min")
      .eq("user_id", userId)
      .in("session_type", ["mobility", "yoga"])
      .or(FINISHED_WORKOUTS_FILTER)
      .order("id", { ascending: true })
      .range(from, to)
  )
  if (data.length === 0) return 0
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
  const data = await readAllRows<{ distance_km: number | null }>("running distances", (from, to) =>
    supabase
      .from("workout_logs")
      .select("distance_km")
      .eq("user_id", userId)
      .eq("session_type", "running")
      .not("distance_km", "is", null)
      .or(FINISHED_WORKOUTS_FILTER)
      .order("id", { ascending: true })
      .range(from, to)
  )
  if (data.length === 0) return 0
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
  // A run of weeks is measured over the WHOLE history, so a page of 1,000 would
  // silently cut the streak off at whatever week that page reached.
  const data = await readAllRows<{ logged_at: string }>("cardio sessions", (from, to) =>
    supabase
      .from("workout_logs")
      .select("logged_at")
      .eq("user_id", userId)
      .in("session_type", ["cardio", "running"])
      .or(FINISHED_WORKOUTS_FILTER)
      .order("id", { ascending: true })
      .range(from, to)
  )
  if (data.length === 0) return 0

  return weeksTrainedInARow(data.map((row) => row.logged_at), timezone)
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
