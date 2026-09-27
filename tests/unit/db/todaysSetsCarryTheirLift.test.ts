// @vitest-environment node
/**
 * "FIRST TIME LOGGED: BENCH PRESS", ON THE FIFTH BENCH SESSION.
 *
 * A regression I introduced. `detectPersonalRecords` and `firstTimeLifts` were
 * converted to key on `liftKey` — `library_id ?? name` — so "Back Squat" and
 * StrongLifts' "Squat" stop being two lifts. `completeSet` writes `library_id`
 * on every stored row, so the HISTORY keys on `lib_bench_press`.
 *
 * `toSetRow`, the adapter that hands TODAY's sets to those same two functions,
 * set `library_id: null` — under a docblock that said, correctly at the time,
 * that nothing downstream matched on it. Afterwards the two sides keyed on
 * different things and never matched:
 *
 *   WHAT YOU DID       Bench Press  61 kg × 5
 *   First time logged: Bench Press
 *
 * on every workout, for every catalogue lift, frozen into the row at finish by
 * `p_records`. A lift the library has never heard of kept working, which is
 * exactly what made it look fine in passing.
 *
 * WHY THE TEST THAT WAS MEANT TO PROVE THE FIX COULD NOT SEE IT.
 * `oneLiftTwoNames.test.ts` builds its new sets with
 * `library_id: "lib_back_squat"` — a shape the only production call site
 * cannot produce. It tested the readers against a fixture the adapter would
 * never hand them. My first replacement was no better: it re-derived the key
 * the same way the adapter does and asserted the two agreed, which passes with
 * the bug back in. This calls the adapter.
 */

import { describe, expect, test } from "vitest"
import { toSetRow } from "@/src/db/workoutRepo"
import { firstTimeLifts, detectPersonalRecords } from "@/src/health/healthService"
import { libraryByName } from "@/src/programs/data/exerciseLibrary"
import type { LiveWorkoutSet } from "@/src/programs/types"

/** A live set as the screen holds it: a name, and no library id anywhere. */
const liveSet = (exercise: string, weightKg: number): LiveWorkoutSet =>
  ({
    id: `s-${exercise}-${weightKg}`,
    exercise,
    exerciseId: null,
    weightKg,
    weight: weightKg,
    reps: 5,
    setNumber: 1,
    kind: "working",
    side: null,
    notes: null,
    exerciseNotes: null,
    rpe: null,
    prescribedIndex: null,
    completedAt: "2026-09-28T09:30:00.000Z",
  }) as unknown as LiveWorkoutSet

/** A stored row, as `completeSet` writes it. */
const storedRow = (exercise: string, weightKg: number) =>
  ({
    id: `r-${weightKg}`,
    log_id: "l0",
    exercise,
    weight_kg: weightKg,
    reps: 5,
    set_number: 1,
    notes: null,
    exercise_notes: null,
    exercise_id: null,
    library_id: libraryByName(exercise)?.id ?? null,
    set_kind: "working",
    prescribed_index: null,
    completed_at: "2026-09-21T09:30:00.000Z",
    rpe: null,
    side: null,
    logged_at: "2026-09-21T09:30:00.000Z",
  }) as never

describe("the adapter that hands today's sets to the history functions", () => {
  test("carries the library id, which is what those functions key on", () => {
    expect(toSetRow(liveSet("Bench Press", 61)).library_id).toBe("lib_bench_press")
  })

  test("so a lift done before is not announced as a first", () => {
    const today = [liveSet("Bench Press", 61)].map(toSetRow) as never[]
    expect(firstTimeLifts([storedRow("Bench Press", 60)], today)).toEqual([])
  })

  test("and a heavier set is seen as the personal best it is", () => {
    const today = [liveSet("Bench Press", 61)].map(toSetRow) as never[]
    const records = detectPersonalRecords([storedRow("Bench Press", 60)], today, "2026-09-28")
    expect(records).toHaveLength(1)
    expect(records[0].weight_kg).toBe(61)
  })

  test("a lift the library has never heard of still stands on its name", () => {
    // `library_id` is null for those, and the name is the key — which is why
    // an unknown lift kept working while every catalogue lift did not.
    expect(toSetRow(liveSet("Sandbag Zerchers of My Own Invention", 61)).library_id).toBeNull()
    const today = [liveSet("Sandbag Zerchers of My Own Invention", 61)].map(toSetRow) as never[]
    expect(firstTimeLifts([storedRow("Sandbag Zerchers of My Own Invention", 60)], today)).toEqual([])
  })
})
