/**
 * "KEEP THESE CHANGES FOR NEXT TIME" — and the two things it cannot keep.
 *
 * The rack was taken, you did front squats, and next Tuesday the program asks
 * for squats again. Nothing here ever asked whether that should stick, so
 * every swap was a one-off and the same fight happened every week.
 *
 * Two things stop a change being keepable, and both are refusals to invent a
 * number:
 *
 *   - a lift typed by hand has no library entry, so there is no prescription
 *     to write into the program;
 *   - a lift with no ticked set has no starting weight, and
 *     `seedForAddedExercises` THROWS rather than guess one.
 *
 * Both are NAMED under the switch, with the reason, because "some of your
 * changes were kept" is the kind of half-answer people stop trusting.
 */

import { describe, it, expect } from "vitest"
import { keepableChanges } from "@/src/programs/programsService"
import { applyAdjustmentsToSchedule, scheduleDays } from "@/src/programs/customize"
import { libraryExercise } from "@/src/programs/data/exerciseLibrary"
import { strongLifts5x5 } from "@/src/programs/data/strength/stronglifts5x5"
import { materializeSchedule } from "@/src/programs/customize"
import type { LiveWorkoutSet, SessionPrescription, WorkoutAdjustments } from "@/src/programs/types"

const set = (over: Partial<LiveWorkoutSet> & { exerciseId: string }): LiveWorkoutSet => ({
  id: `s-${over.exerciseId}-${over.setNumber ?? 1}-${over.kind ?? "working"}`,
  exercise: over.exercise ?? "Squat",
  weight: 100,
  weightKg: 100,
  reps: 5,
  setNumber: 1,
  kind: "working",
  prescribedIndex: null,
  completedAt: "2026-09-23T10:00:00Z",
  rpe: null,
  side: null,
  ...over,
})

const prescription = {
  exercises: [
    { exerciseId: "squat", name: "Squat", sets: [] },
    { exerciseId: "bench_press", name: "Bench Press", sets: [] },
  ],
} as unknown as SessionPrescription

const keep = (adjustments: WorkoutAdjustments, sets: LiveWorkoutSet[] = []) =>
  keepableChanges(prescription, adjustments, sets, libraryExercise)

describe("what can be kept", () => {
  it("keeps a swapped-in lift at the heaviest working set ticked under it", () => {
    const result = keep(
      { swapped: { squat: { name: "Front Squat", libraryId: "lib_front_squat" } } },
      [
        set({ exerciseId: "added_front_squat", exercise: "Front Squat", weight: 80 }),
        set({ exerciseId: "added_front_squat", exercise: "Front Squat", weight: 85, setNumber: 2 }),
      ]
    )
    expect(result.swaps).toEqual([
      { fromId: "squat", libraryId: "lib_front_squat", name: "Front Squat", weight: 85 },
    ])
    expect(result.oneOffs).toEqual([])
    expect(result.any).toBe(true)
  })

  it("ignores a warm-up and a drop set when deciding the starting weight", () => {
    // A drop set is lighter on purpose, and starting next week from it would
    // walk the weight backwards.
    const result = keep(
      { added: [{ exerciseId: "added_dip", name: "Dip", libraryId: "lib_dip" }] },
      [
        set({ exerciseId: "added_dip", exercise: "Dip", weight: 200, kind: "warmup" }),
        set({ exerciseId: "added_dip", exercise: "Dip", weight: 40 }),
        set({ exerciseId: "added_dip", exercise: "Dip", weight: 20, kind: "drop", setNumber: 2 }),
      ]
    )
    expect(result.additions).toEqual([{ libraryId: "lib_dip", name: "Dip", weight: 40 }])
  })

  it("names a lift with no ticked set as a one-off, and says why", () => {
    const result = keep({ added: [{ exerciseId: "added_dip", name: "Dip", libraryId: "lib_dip" }] })
    expect(result.additions).toEqual([])
    expect(result.oneOffs).toEqual([{ name: "Dip", why: "no set was ticked" }])
    expect(result.any).toBe(false)
  })

  it("names a lift that is not in the library as a one-off", () => {
    // Typed by hand: there is no prescription to write into the program.
    const result = keep({ added: [{ exerciseId: "added_sled_push", name: "Sled Push" }] }, [
      set({ exerciseId: "added_sled_push", exercise: "Sled Push", weight: 60 }),
    ])
    expect(result.oneOffs).toEqual([{ name: "Sled Push", why: "not in the lift list" }])
  })

  it("keeps an edited rest, always — there is nothing to guess", () => {
    const result = keep({ rest: { squat: 210 } })
    expect(result.rest).toEqual({ squat: 210 })
    expect(result.any).toBe(true)
  })

  it("keeps a changed order, and does not count the program's own order as a change", () => {
    expect(keep({ order: ["bench_press", "squat"] }).order).toEqual(["bench_press", "squat"])
    // The order as prescribed is not a change, so the switch is not offered
    // for it.
    expect(keep({ order: ["squat", "bench_press"] }).order).toBeNull()
    expect(keep({ order: ["squat", "bench_press"] }).any).toBe(false)
  })

  it("offers nothing when nothing happened", () => {
    expect(keep({}).any).toBe(false)
  })
})

describe("writing them into the program", () => {
  const schedule = materializeSchedule(strongLifts5x5)
  const dayId = scheduleDays(schedule)[0].id

  it("swaps the day's lift and seeds the new one at the ticked weight", () => {
    const before = scheduleDays(schedule)[0].exercises.map((e) => e.name)
    const squatId = scheduleDays(schedule)[0].exercises[0].id

    const { schedule: next, workingWeights } = applyAdjustmentsToSchedule(
      schedule,
      dayId,
      {
        swaps: [{ fromId: squatId, libraryId: "lib_front_squat", name: "Front Squat", weight: 85 }],
        additions: [],
        order: null,
        rest: null,
        oneOffs: [],
        any: true,
      },
      libraryExercise
    )

    const after = scheduleDays(next)[0].exercises
    expect(after.map((e) => e.name)).not.toEqual(before)
    expect(after.map((e) => e.name)).toContain("Front Squat")
    expect(after.map((e) => e.name)).not.toContain("Squat")
    // The weight lands on the id the swap produced, which is the lift actually
    // in the day — not on the library's own id.
    const frontSquat = after.find((e) => e.name === "Front Squat")!
    expect(workingWeights[frontSquat.id]).toBe(85)
  })

  it("appends an added lift, and leaves every other day alone", () => {
    const otherBefore = scheduleDays(schedule)[1].exercises.map((e) => e.id)
    const { schedule: next, workingWeights } = applyAdjustmentsToSchedule(
      schedule,
      dayId,
      {
        swaps: [],
        additions: [{ libraryId: "lib_dip", name: "Dip", weight: 40 }],
        order: null,
        rest: null,
        oneOffs: [],
        any: true,
      },
      libraryExercise
    )
    const day = scheduleDays(next)[0].exercises
    expect(day[day.length - 1].name).toBe("Dip")
    expect(workingWeights[day[day.length - 1].id]).toBe(40)
    expect(scheduleDays(next)[1].exercises.map((e) => e.id)).toEqual(otherBefore)
  })

  it("reorders the day by the ids that are in it", () => {
    const ids = scheduleDays(schedule)[0].exercises.map((e) => e.id)
    const reversed = [...ids].reverse()
    const { schedule: next } = applyAdjustmentsToSchedule(
      schedule,
      dayId,
      { swaps: [], additions: [], order: reversed, rest: null, oneOffs: [], any: true },
      libraryExercise
    )
    expect(scheduleDays(next)[0].exercises.map((e) => e.id)).toEqual(reversed)
  })

  it("sets an edited rest on the lift, on every day it appears", () => {
    const squatId = scheduleDays(schedule)[0].exercises[0].id
    const { schedule: next } = applyAdjustmentsToSchedule(
      schedule,
      dayId,
      { swaps: [], additions: [], order: null, rest: { [squatId]: 210 }, oneOffs: [], any: true },
      libraryExercise
    )
    // Three minutes on squats is a fact about squats, not about Monday.
    for (const day of scheduleDays(next)) {
      for (const ex of day.exercises) {
        if (ex.id === squatId) expect((ex as { restSec?: number }).restSec).toBe(210)
      }
    }
  })

  it("changes nothing when there is nothing keepable", () => {
    const { schedule: next, workingWeights } = applyAdjustmentsToSchedule(
      schedule,
      dayId,
      { swaps: [], additions: [], order: null, rest: null, oneOffs: [], any: false },
      libraryExercise
    )
    expect(next).toEqual(schedule)
    expect(workingWeights).toEqual({})
  })
})
