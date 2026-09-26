/**
 * WHAT "STILL OPEN" MEANS, IN ONE PLACE.
 *
 * A `workout_logs` row is in one of three shapes, and `workout_logs_lifecycle`
 * in the schema spells all three out:
 *
 *   started, no end              a workout happening right now
 *   started and ended            a workout that is over
 *   NO start, no end             one written up afterwards, which was never
 *                                "open" and must not be treated as though it
 *                                were
 *
 * The third is the one that catches people, and it caught this codebase: on
 * 2026-09-26 four functions in two files had three different answers to "is
 * this open", one of them written that same day.
 *
 *   `FINISHED_WORKOUTS_FILTER`  "ended_at.not.is.null,started_at.is.null"  ✓
 *   `getLiveWorkout`            ended IS NULL **and** started IS NOT NULL   ✓
 *   `deleteWorkoutLog`'s guard  started !== null && ended === null          ✓
 *   `fateOf`                    ended === null                             ✗
 *
 * `fateOf` called a written-up session "open", so a failed write against one
 * answered "That set could not be saved. Tap it again." — retry advice for a
 * workout that is not open and never was. One predicate now, imported by all
 * of them, and `docs/known-failures.md` asks the question this is the answer
 * to: "Does this name already mean something else here?"
 */

/** The two columns that decide it. Anything wider is the caller's business. */
export interface WorkoutLifecycleRow {
  started_at: string | null
  ended_at: string | null
}

/**
 * A workout somebody is in the middle of: it has a start, and no end.
 *
 * Deliberately NOT "has no end time". A session typed in afterwards has no end
 * time either and is finished, which is the distinction the whole file exists
 * for.
 */
export function isOpenWorkout(row: WorkoutLifecycleRow | null | undefined): boolean {
  return Boolean(row && row.started_at !== null && row.ended_at === null)
}

/**
 * What to say when somebody tries to delete one, wherever they try it from.
 *
 * TWO ROUTES REACH THE SAME DELETE, and until 2026-09-26 only one of them was
 * guarded — which is `CLAUDE.md` rule 3 half-done. `DELETE /api/health/workout`
 * goes through `deleteWorkoutLog`; `DELETE /api/programs/enrollments/[id]/log/
 * [logId]` goes through `removeProgramSession` into `remove_session_and_replay`,
 * whose SQL deletes by id and enrollment with no lifecycle predicate at all.
 * Deleting the workout somebody is mid-way through is how the owner came to see
 * a row-level-security message at a squat rack.
 *
 * It names the way out, because there IS one and a refusal without it leaves a
 * person holding a workout no button will shift.
 */
export const OPEN_WORKOUT_REFUSAL =
  "That workout is still open. Finish it or throw it away from the workout screen."
