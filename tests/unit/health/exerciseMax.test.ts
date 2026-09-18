/**
 * ONE ESTIMATE FORMULA, NOT TWO.
 *
 * In plain terms: the app shows an "estimated one-rep max" in two places — the
 * Squat tile on the dashboard and the "est. max" beside each lift in Your
 * bests. They used the same Epley formula, except the bests list capped it at
 * ten reps and the tile did not. Above ten reps Epley runs away: a 60 kg set of
 * twenty comes out as 100 kg, a weight the person has never lifted. So the same
 * set produced 100 on one screen and 60 on the other, neither labelled as
 * measuring anything different.
 *
 * `cappedEstimate` is now the one formula, and both read it.
 */

import { describe, it, expect } from "vitest"
import { cappedEstimate, liftBests } from "@/src/health/healthService"
import { estimateOneRepMax } from "@/src/programs/programsService"
import type { WorkoutLogWithSets, WorkoutSetRow } from "@/src/health/types"

const TZ = "Europe/Copenhagen"

const logWith = (weight_kg: number, reps: number): WorkoutLogWithSets =>
  ({
    id: "l1",
    user_id: "u1",
    session_type: "weights",
    duration_min: 60,
    intensity: 3,
    logged_at: "2026-09-01T10:00:00Z",
    sets: [
      {
        id: "s1",
        log_id: "l1",
        exercise: "Squat",
        weight_kg,
        reps,
        set_number: 1,
        set_kind: "working",
        notes: null,
        exercise_notes: null,
        exercise_id: null,
        library_id: null,
        prescribed_index: null,
        completed_at: null,
        rpe: null,
        side: null,
      } as WorkoutSetRow,
    ],
  }) as unknown as WorkoutLogWithSets

/**
 * What the dashboard tile computes, written out from `getExerciseMax`'s loop.
 *
 * The repository function itself needs a database; the ARITHMETIC is what the
 * two screens disagreed about, and it is now one call in both.
 */
const tileEstimate = (weight_kg: number, reps: number) => Math.round(cappedEstimate(weight_kg, reps))

describe("the 1RM tile and Your bests", () => {
  it("give the same estimate for the same set", () => {
    const bests = liftBests([logWith(100, 5)], TZ)
    expect(Math.round(bests[0].bestEstimatedMaxKg)).toBe(tileEstimate(100, 5))
  })

  it("agree on a twenty-rep set: both say the weight itself", () => {
    // This is the case that used to differ — 100 on the tile, 60 in the list.
    const bests = liftBests([logWith(60, 20)], TZ)
    expect(bests[0].bestEstimatedMaxKg).toBe(60)
    expect(tileEstimate(60, 20)).toBe(60)
  })

  it("caps exactly above ten reps, and not at ten", () => {
    expect(cappedEstimate(60, 10)).toBe(estimateOneRepMax(60, 10))
    expect(cappedEstimate(60, 11)).toBe(60)
  })

  it("a single is the weight, not an inflated version of it", () => {
    expect(cappedEstimate(140, 1)).toBe(140)
  })
})
