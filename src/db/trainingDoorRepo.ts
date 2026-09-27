/**
 * EVERYTHING THE TRACKING CARD NEEDS, READ ONCE.
 *
 * The card used to chain three requests in the browser: the enrollment list,
 * then that enrollment's detail, then the live workout. Three answers arriving
 * at three moments, so the card popped in late and then FLIPPED — Start one
 * second, Resume the next, in front of somebody who had already reached for
 * the button.
 *
 * WHAT IT DOES NOT DO. It formats nothing, and it does not decide what "today"
 * contains. `recentlyFinished` is deliberately the last 48 hours rather than
 * today's workouts, because one pure function (`trainingCardState`) owns that
 * decision and has to make it on the account's calendar. A server that had
 * already filtered would have made that decision here, invisibly, in whatever
 * zone this process happens to run in.
 *
 * `new Date()` appears in this file exactly once, as the start of the 48-hour
 * window. It is never "today".
 */

import { createServerSupabaseClient } from "./supabase"
import { getUserTimezone } from "./settingsRepo"
import { listActiveEnrollments, getTodaySession, programFor } from "./programRepo"
import { getLiveWorkout, prescriptionForDay } from "./workoutRepo"
import { finishedWorkouts } from "./healthRepo"
import { nextSessionAfterToday } from "@/src/programs/programsService"
import { scheduleDaysOrNone, effectiveProgram } from "@/src/programs/customize"
import { getTodayInTimezone, isoWeekdayInTimezone } from "@/src/shared/dateUtils"
import type { TrainingDoorFacts } from "@/src/programs/types"

/** Two days, which covers "did I train today" in every timezone. */
const RECENT_HOURS = 48

/** Enough to hold two days of workouts for anybody, and bounded. */
const RECENT_LIMIT = 50

type FinishedRow = {
  id: string
  enrollment_id: string | null
  program_day_id: string | null
  logged_at: string
  duration_min: number | null
  distance_km: number | null
  session_type: string | null
  adjustments: { skipped?: string[]; incomplete?: string[] } | null
  workout_sets: { count: number }[]
}

export async function getTrainingDoorFacts(userId: string): Promise<TrainingDoorFacts> {
  const timezone = await getUserTimezone(userId)

  const [enrollments, live] = await Promise.all([
    listActiveEnrollments(userId),
    getLiveWorkout(userId),
  ])

  const todayWeekday = isoWeekdayInTimezone(timezone)

  /**
   * THE OPEN WORKOUT'S OWN SESSION, so the card can say which one it is.
   *
   * A loose workout — "start a workout now", no program — has no day and asked
   * for no sets, and both come out null rather than as a zero that reads like
   * a session with nothing in it.
   */
  let liveFacts: TrainingDoorFacts["live"] = null
  if (live) {
    let dayLabel: string | null = null
    let setsAsked: number | null = null
    if (live.enrollmentId) {
      try {
        const resolved = await prescriptionForDay(userId, live.enrollmentId, live.dayId ?? undefined)
        dayLabel = resolved.prescription.dayLabel
        /**
         * NULL FOR AN ENDURANCE DAY, for the same reason it is null for a
         * loose workout — the comment above says a zero here "reads like a
         * session with nothing in it", and then the guard was
         * `if (live.enrollmentId)`, which covers the loose case and not this
         * one. A Couch to 5K run has BLOCKS, not exercises, so the reduce
         * summed nothing and the card read "0 of 0 sets ticked" — before the
         * run, during it, and after two blocks were ticked.
         */
        const asked = resolved.prescription.exercises.reduce((n, ex) => n + ex.sets.length, 0)
        setsAsked = asked > 0 ? asked : null
      } catch {
        // A program whose schedule no longer resolves must not take the whole
        // door down: the workout is still open and still needs its way back.
      }
    }
    liveFacts = {
      id: live.id,
      enrollmentId: live.enrollmentId ?? null,
      dayId: live.dayId ?? null,
      dayLabel,
      startedAt: live.startedAt,
      setsTicked: live.sets.filter((s) => s.completedAt).length,
      setsAsked,
    }
  }

  const programs: TrainingDoorFacts["programs"] = []
  for (const enrollment of enrollments) {
    const prescription = await getTodaySession(userId, enrollment.id)
    const program = programFor(enrollment)
    programs.push({
      enrollment,
      prescription,
      next: nextSessionAfterToday(program, enrollment, todayWeekday),
      lastTimeThisDay: await lastTimeOnDay(userId, enrollment.id, prescription.dayId),
    })
  }

  return {
    timezone,
    todayDate: getTodayInTimezone(timezone),
    todayWeekday,
    live: liveFacts,
    programs,
    recentlyFinished: await recentlyFinished(userId, enrollments),
  }
}

/**
 * The last time this same day of the program came round.
 *
 * `complete` comes from what the FINISH wrote, not from counting today's
 * prescription against it: a program edited since would make those two
 * disagree, and the record of what happened is the one that is not allowed to
 * move.
 */
async function lastTimeOnDay(
  userId: string,
  enrollmentId: string,
  dayId: string
): Promise<TrainingDoorFacts["programs"][number]["lastTimeThisDay"]> {
  const supabase = await createServerSupabaseClient()
  // The `.limit()` sits INSIDE the wrapping call on purpose: the unpaged-read
  // guard reads the chain from `.from(` to the closing bracket of the call it
  // is wrapped in, so a limit chained after `)` would be invisible to it.
  const { data, error } = await finishedWorkouts(
    supabase
      .from("workout_logs")
      .select("id, logged_at, adjustments, workout_sets(count)")
      .eq("user_id", userId)
      .eq("enrollment_id", enrollmentId)
      .eq("program_day_id", dayId)
      .order("logged_at", { ascending: false })
      .limit(1)
  )
  if (error || !data || data.length === 0) return null

  const row = data[0] as unknown as FinishedRow
  const adjustments = row.adjustments ?? {}
  return {
    loggedAt: row.logged_at,
    setsDone: row.workout_sets?.[0]?.count ?? 0,
    complete: (adjustments.skipped?.length ?? 0) === 0 && (adjustments.incomplete?.length ?? 0) === 0,
  }
}

/** Finished workouts in the last 48 hours — the raw material for "today". */
async function recentlyFinished(
  userId: string,
  enrollments: Awaited<ReturnType<typeof listActiveEnrollments>>
): Promise<TrainingDoorFacts["recentlyFinished"]> {
  const supabase = await createServerSupabaseClient()
  const since = new Date(Date.now() - RECENT_HOURS * 3_600_000).toISOString()

  const { data, error } = await finishedWorkouts(
    supabase
      .from("workout_logs")
      .select("id, enrollment_id, program_day_id, logged_at, duration_min, distance_km, session_type, workout_sets(count)")
      .eq("user_id", userId)
      .gte("logged_at", since)
      .order("logged_at", { ascending: false })
      .limit(RECENT_LIMIT)
  )
  /**
   * A READ THAT FAILED IS NOT "YOU HAVE NOT TRAINED".
   *
   * This collapsed both into `[]`, and `trainingCardState` reads an empty
   * `recentlyFinished` as "nothing finished today" — so a failed query offers
   * **Start workout** on a day already trained, which the card's own comment
   * says "invites a second workout for the same session". `docs/known-failures.md`:
   * a value that could not be computed is a THIRD state, never zero.
   *
   * Thrown rather than guessed: the caller already handles a failure by saying
   * the door could not be loaded, which is the honest answer.
   */
  if (error) {
    console.error(`could not read recently finished workouts: ${error.message}`)
    throw new Error("Could not read your recent workouts. Reload and try again.")
  }
  if (!data) return []

  /** The day's name, from the enrollment's own schedule. */
  const labelFor = (enrollmentId: string | null, dayId: string | null): string | null => {
    if (!enrollmentId || !dayId) return null
    const enrollment = enrollments.find((e) => e.id === enrollmentId)
    if (!enrollment) return null
    const schedule = effectiveProgram(programFor(enrollment), enrollment.customSchedule).schedule
    return scheduleDaysOrNone(schedule).find((d) => d.id === dayId)?.label ?? null
  }

  return (data as unknown as FinishedRow[]).map((row) => ({
    workoutId: row.id,
    enrollmentId: row.enrollment_id,
    dayLabel: labelFor(row.enrollment_id, row.program_day_id),
    loggedAt: row.logged_at,
    durationMin: row.duration_min,
    /**
     * A RUN'S ONE NUMBER. The card read "Workout · 7 min · 0 sets" for a
     * 3.2 km run the app had just stored and prints as "Run · 3.2 km" on the
     * receipt and in History. Sets is the wrong figure for a session that has
     * none; the distance is the right one and was not being selected.
     */
    distanceKm: row.distance_km,
    /**
     * And the NAME, when the schedule cannot give one. `labelFor` walks
     * `scheduleDaysOrNone`, which is empty for a week-by-week endurance plan,
     * so every Couch to 5K session came back null and the card said
     * "Workout" — while the Today tab one screen over called the same session
     * "Week 1 · Run 1". The session type is at least true.
     */
    sessionType: row.session_type,
    sets: row.workout_sets?.[0]?.count ?? null,
  }))
}
