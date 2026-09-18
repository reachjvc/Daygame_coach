/**
 * WHAT IS LEFT UNDONE, AND WHAT THAT MEANS.
 *
 * In plain terms, the bug this closes. The squat rack was busy, so you did
 * front squats instead and added them to the workout on the day. An added lift
 * gets three empty rows so there is somewhere to put the sets — and the finish
 * sheet counted those rows as sets the program had asked for. "Front Squat
 * 0 of 3" then appeared under "these count as misses and will bring the weight
 * down": a lift nobody prescribed, at a weight the program does not track,
 * against a count the app invented.
 *
 * A lift you chose to do is never a lift you failed to do.
 */

import { describe, it, expect } from "vitest"
import { unfinishedLifts } from "@/src/programs/programsService"
import type { LiveWorkoutSet, PrescribedExercise, WorkoutAdjustments } from "@/src/programs/types"

const lift = (exerciseId: string, name: string, sets: number): PrescribedExercise => ({
  exerciseId,
  name,
  sets: Array.from({ length: sets }, (_, i) => ({
    setNumber: i + 1,
    weight: 100,
    weightKg: 100,
    reps: 5,
    amrap: false,
  })),
})

const set = (
  exerciseId: string,
  setNumber: number,
  kind: LiveWorkoutSet["kind"] = "working"
): LiveWorkoutSet => ({
  id: `${exerciseId}-${setNumber}-${kind}`,
  exerciseId,
  exercise: exerciseId,
  weight: 100,
  weightKg: 100,
  reps: 5,
  setNumber,
  kind,
  prescribedIndex: null,
  completedAt: null,
  rpe: null,
  side: null,
})

const added: WorkoutAdjustments = {
  added: [{ exerciseId: "added_front_squat", name: "Front Squat" }],
}

describe("unfinishedLifts", () => {
  it("a lift added on the day is never a miss", () => {
    const result = unfinishedLifts([lift("squat", "Squat", 5)], added, [
      set("squat", 1),
      set("squat", 2),
      set("squat", 3),
      set("squat", 4),
      set("squat", 5),
    ])
    expect(result.short).toEqual([])
    expect(result.untouchedAdded).toEqual([
      { exerciseId: "added_front_squat", name: "Front Squat" },
    ])
  })

  it("a prescribed lift with two of five sets is short by three", () => {
    const result = unfinishedLifts([lift("squat", "Squat", 5)], {}, [
      set("squat", 1),
      set("squat", 2),
    ])
    expect(result.short).toEqual([
      { exerciseId: "squat", name: "Squat", done: 2, asked: 5 },
    ])
  })

  it("a warm-up is not one of the sets that were asked for", () => {
    // Otherwise three warm-ups make a five-set squat look two short of nothing.
    const result = unfinishedLifts([lift("squat", "Squat", 2)], {}, [
      set("squat", 1, "warmup"),
      set("squat", 2, "warmup"),
      set("squat", 1),
      set("squat", 2),
    ])
    expect(result.short).toEqual([])
  })

  it("a skipped lift is not listed", () => {
    // Skipping is already a decision the person made and told the app about.
    const result = unfinishedLifts(
      [lift("squat", "Squat", 5), lift("bench", "Bench Press", 5)],
      { skipped: ["bench"] },
      [set("squat", 1), set("squat", 2), set("squat", 3), set("squat", 4), set("squat", 5)]
    )
    expect(result.short).toEqual([])
  })

  it("an added lift with one ticked set is listed nowhere", () => {
    // It happened. There is no plan for it to have fallen short of.
    const result = unfinishedLifts([], added, [set("added_front_squat", 1)])
    expect(result.short).toEqual([])
    expect(result.untouchedAdded).toEqual([])
  })

  it("an added lift the person skipped is listed nowhere either", () => {
    const result = unfinishedLifts([], { ...added, skipped: ["added_front_squat"] }, [])
    expect(result.untouchedAdded).toEqual([])
  })

  it("a lift with nothing prescribed cannot be short of anything", () => {
    // An endurance day prescribes blocks, not sets. Zero asked is not a miss.
    const result = unfinishedLifts([{ exerciseId: "run", name: "Run", sets: [] }], {}, [])
    expect(result.short).toEqual([])
  })

  it("an added lift is never double-counted as a prescribed one", () => {
    // The live screen builds one list of prescribed-plus-added rows. Handing
    // that list in must not turn the added lift back into a "0 of 3" miss.
    const bothLists = [lift("squat", "Squat", 5), lift("added_front_squat", "Front Squat", 3)]
    const result = unfinishedLifts(bothLists, added, [])
    expect(result.short.map((u) => u.exerciseId)).toEqual(["squat"])
    expect(result.untouchedAdded).toHaveLength(1)
  })
})
