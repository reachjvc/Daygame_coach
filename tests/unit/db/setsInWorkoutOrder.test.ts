// @vitest-environment node
/**
 * FIVE SQUATS THEN FIVE BENCHES LISTED AS SQUAT 1, BENCH 1, SQUAT 2, BENCH 2.
 *
 * `inWorkoutOrder` had `set_number` as its FIRST key, so every screen that
 * lists a workout's sets flat — the correction editor and the CSV export —
 * read them round-robin, on a workout nobody had corrected. `completed_at`
 * was the third tiebreaker, reachable only within one set number and one
 * kind, so it never decided anything.
 *
 * Found by a review that ticked Squat ×5, then Bench ×5, then Row ×4 and read
 * the list back. It looked like the known `completed_at` migration surfacing;
 * it is not. Those rows' timestamps were intact and this comparator ignored
 * them.
 *
 * NULLS LAST IS WHAT MAKES IT SAFE. A session written up afterwards has no
 * `completed_at`, and every correction nulls it until the parked migration is
 * applied, so those rows fall through to exactly the old keys.
 */

import { describe, expect, test } from "vitest"
import { inWorkoutOrder } from "@/src/db/healthRepo"
import type { WorkoutSetRow } from "@/src/health/types"

const row = (over: Partial<WorkoutSetRow>): WorkoutSetRow =>
  ({
    id: "id-" + Math.random(),
    log_id: "l1",
    exercise: "Squat",
    weight_kg: 100,
    reps: 5,
    set_number: 1,
    notes: null,
    exercise_notes: null,
    exercise_id: null,
    library_id: null,
    set_kind: "working",
    prescribed_index: null,
    completed_at: null,
    rpe: null,
    side: null,
    ...over,
  }) as WorkoutSetRow

const at = (min: number) => `2026-09-27T10:${String(min).padStart(2, "0")}:00.000Z`

describe("inWorkoutOrder", () => {
  test("lists the lifts in the order they were actually done", () => {
    // Squat 1,2 then Bench 1,2 — which is what the person did.
    const sets = [
      row({ id: "b1", exercise: "Bench", set_number: 1, completed_at: at(10) }),
      row({ id: "s2", exercise: "Squat", set_number: 2, completed_at: at(3) }),
      row({ id: "b2", exercise: "Bench", set_number: 2, completed_at: at(13) }),
      row({ id: "s1", exercise: "Squat", set_number: 1, completed_at: at(0) }),
    ]
    expect([...sets].sort(inWorkoutOrder).map((s) => s.id)).toEqual(["s1", "s2", "b1", "b2"])
  })

  test("a circuit stays a circuit, because that is also what happened", () => {
    const sets = [
      row({ id: "a2", exercise: "A", set_number: 2, completed_at: at(6) }),
      row({ id: "b1", exercise: "B", set_number: 1, completed_at: at(3) }),
      row({ id: "a1", exercise: "A", set_number: 1, completed_at: at(0) }),
      row({ id: "b2", exercise: "B", set_number: 2, completed_at: at(9) }),
    ]
    expect([...sets].sort(inWorkoutOrder).map((s) => s.id)).toEqual(["a1", "b1", "a2", "b2"])
  })

  test("a workout with no timestamps is ordered exactly as it was before", () => {
    // Written up afterwards, or corrected — the old keys, unchanged.
    const sets = [
      row({ id: "n2", set_number: 2 }),
      row({ id: "w1", set_number: 1, set_kind: "warmup" }),
      row({ id: "n1", set_number: 1 }),
    ]
    expect([...sets].sort(inWorkoutOrder).map((s) => s.id)).toEqual(["w1", "n1", "n2"])
  })

  test("rows that know when they happened come before rows that do not", () => {
    const sets = [
      row({ id: "unstamped", set_number: 1 }),
      row({ id: "stamped", set_number: 9, completed_at: at(5) }),
    ]
    expect([...sets].sort(inWorkoutOrder).map((s) => s.id)).toEqual(["stamped", "unstamped"])
  })

  test("is a total order, so sorting is deterministic whatever order it is given", () => {
    /**
     * The rule "by time when both know, by slot otherwise" is NOT transitive
     * when written as a pairwise test, and `Array.sort` answers a broken
     * comparator with an arbitrary order rather than an error. This shuffles
     * the same rows and asserts one answer.
     */
    const sets = [
      row({ id: "a", set_number: 5, completed_at: at(1) }),
      row({ id: "b", set_number: 1 }),
      row({ id: "c", set_number: 2, completed_at: at(2) }),
      row({ id: "d", set_number: 3 }),
    ]
    const once = [...sets].sort(inWorkoutOrder).map((s) => s.id)
    for (let i = 0; i < 12; i++) {
      const shuffled = [...sets].sort(() => Math.random() - 0.5)
      expect(shuffled.sort(inWorkoutOrder).map((s) => s.id)).toEqual(once)
    }
    expect(once).toEqual(["a", "c", "b", "d"])
  })
})

describe("a set re-ticked to fix a number", () => {
  /**
   * `completeSet` UPDATEs the existing row when you tap the same set again —
   * "how a person fixes a number", says its own comment — and the payload
   * carried `completed_at: now`, so the correction rewrote WHEN the set
   * happened. Harmless while this comparator sorted on `set_number`; the
   * moment it started sorting on `completed_at` the corrected set jumped to
   * the end of the workout on the receipt, in History and in the editor:
   *
   *   Squat 1 | Squat 3 | Bench 1 | Bench 2 | Bench 3 | Squat 2
   *
   * Only an INSERT stamps the time now. This is the ordering half of that;
   * the write half is that `completeSet`'s update payload no longer contains
   * the column at all.
   */
  test("stays where it was done, not where it was last edited", async () => {
    const done = [
      row({ id: "s1", exercise: "Squat", set_number: 1, completed_at: at(0) }),
      row({ id: "s2", exercise: "Squat", set_number: 2, completed_at: at(6) }),
      row({ id: "s3", exercise: "Squat", set_number: 3, completed_at: at(9) }),
      row({ id: "b1", exercise: "Bench", set_number: 1, completed_at: at(12) }),
    ]
    // s2 corrected at 10:31. Its `completed_at` must be untouched, so the
    // order is unchanged.
    expect([...done].sort(inWorkoutOrder).map((s) => s.id)).toEqual(["s1", "s2", "s3", "b1"])
  })
})

describe("ISO instants compare as text, not under a collator", () => {
  test("a sub-second timestamp sorts after the whole second it follows", () => {
    /**
     * `localeCompare` ranks "+" after "." in ICU, so
     * "…T10:00:00+00:00".localeCompare("…T10:00:00.5+00:00") is 1 — the
     * wrong way round. Only bites the row whose millisecond is 0, which is
     * about one in a thousand, which is exactly the kind of thing that
     * surfaces once and is never reproduced.
     */
    const sets = [
      row({ id: "later", completed_at: "2026-09-27T10:00:00.500+00:00", set_number: 1 }),
      row({ id: "earlier", completed_at: "2026-09-27T10:00:00+00:00", set_number: 2 }),
    ]
    expect([...sets].sort(inWorkoutOrder).map((s) => s.id)).toEqual(["earlier", "later"])
  })
})
