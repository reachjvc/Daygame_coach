// @vitest-environment node
/**
 * "FIRST TIME LOGGED: SQUAT", ON A SCREEN SHOWING 110×5 FOR IT.
 *
 * A lift's identity is its library entry, not the text on the row. Somebody
 * logs Back Squat from the exercise library for six months, then starts
 * StrongLifts, whose lift is called Squat. Both sets carry
 * `library_id: lib_back_squat`. Driven on one account:
 *
 *   receipt:  "First time logged: Squat"      (PREVIOUS said 110×5)
 *   receipt:  "PERSONAL BESTS  Squat 105 kg"  (the real best is 110)
 *   Progress: "Back Squat 110 kg" AND "Squat 100 kg" — two rows, one barbell
 *
 * `getExerciseMax` was converted to `library_id` and its docblock already
 * gives the argument: "Squat was the one that did not [match], which is
 * exactly why a name is the wrong key." Four readers were left on the name,
 * and the two that make CLAIMS — "New best", "First time logged" — were
 * telling a person something untrue about their own training.
 */

import { describe, expect, test } from "vitest"
import { detectPersonalRecords, firstTimeLifts, liftBests } from "@/src/health/healthService"
import type { WorkoutSetRow, WorkoutLogWithSets } from "@/src/health/types"

/**
 * `logged_at` is on it because `detectPersonalRecords` and `firstTimeLifts`
 * take `WorkoutSetRow & { logged_at: string }`. The first version omitted it
 * and the tests PASSED — the value is never read on these paths — while the
 * typecheck ratchet caught the lie in the signature.
 */
const set = (over: Partial<WorkoutSetRow> = {}): WorkoutSetRow & { logged_at: string } =>
  ({
    id: `s-${Math.random()}`,
    log_id: "l1",
    exercise: "Back Squat",
    weight_kg: 100,
    reps: 5,
    set_number: 1,
    notes: null,
    exercise_notes: null,
    exercise_id: null,
    library_id: "lib_back_squat",
    set_kind: "working",
    prescribed_index: null,
    completed_at: null,
    rpe: null,
    side: null,
    logged_at: "2026-09-27T10:00:00.000Z",
    ...over,
  }) as WorkoutSetRow & { logged_at: string }

/** The same barbell under the two names the app really produces. */
const asBackSquat = (kg: number) => set({ exercise: "Back Squat", weight_kg: kg })
const asSquat = (kg: number) => set({ exercise: "Squat", weight_kg: kg })

describe("one barbell, two spellings", () => {
  test("a lighter set under the program's name is not a new best", () => {
    const records = detectPersonalRecords([asBackSquat(110)], [asSquat(105)], "2026-09-27")
    expect(records, "105 does not beat 110, whatever the row says").toEqual([])
  })

  test("and a heavier one still is", () => {
    const records = detectPersonalRecords([asBackSquat(110)], [asSquat(115)], "2026-09-27")
    expect(records).toHaveLength(1)
    expect(records[0].weight_kg).toBe(115)
  })

  test("a lift with six months of history is not logged for the first time", () => {
    expect(firstTimeLifts([asBackSquat(110)], [asSquat(105)])).toEqual([])
  })

  test("and one genuinely new still is", () => {
    const firsts = firstTimeLifts([asBackSquat(110)], [set({ exercise: "Deadlift", library_id: "lib_deadlift" })])
    expect(firsts).toEqual(["Deadlift"])
  })

  test("Your bests shows one row, under the library's own name", () => {
    const log = (sets: WorkoutSetRow[]): WorkoutLogWithSets =>
      ({ id: "l1", logged_at: "2026-09-27T10:00:00Z", sets }) as unknown as WorkoutLogWithSets
    const bests = liftBests([log([asBackSquat(110), asSquat(100)])], "Europe/Copenhagen")
    expect(bests, "two spellings of one barbell are one lift").toHaveLength(1)
    expect(bests[0].exercise).toBe("Back Squat")
    expect(bests[0].bestWeightKg).toBe(110)
  })

  test("a lift the library has never heard of still stands on its own name", () => {
    // `library_id` is null for those rows, so the name is all there is — and
    // that is the fallback, not a bug.
    const odd = set({ exercise: "Zercher Squat", library_id: null })
    const other = set({ exercise: "Back Squat" })
    const log = (sets: WorkoutSetRow[]): WorkoutLogWithSets =>
      ({ id: "l1", logged_at: "2026-09-27T10:00:00Z", sets }) as unknown as WorkoutLogWithSets
    expect(liftBests([log([odd, other])], "Europe/Copenhagen")).toHaveLength(2)
  })
})
