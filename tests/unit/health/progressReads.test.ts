/**
 * The three numbers a progress view is built on.
 *
 * Each is a pure function so it can be argued with. The rules they encode are
 * not obvious and every one of them is a decision:
 *
 * - a day still to come is not a missed day
 * - warm-ups are not work, and a set counted in seconds is not volume
 * - the heaviest single and the best estimated max are DIFFERENT achievements
 */

import { describe, it, expect } from "vitest"
import { adherenceThisWeek, weeklyVolume, liftBests } from "@/src/health/healthService"
import type { WorkoutLogRow, WorkoutLogWithSets, WorkoutSetRow } from "@/src/health/types"

/** Wednesday 2026-08-19. Monday of that week is the 17th. */
const WEDNESDAY = new Date(2026, 7, 19, 12, 0, 0)

const log = (date: string, sets: Partial<WorkoutSetRow>[] = []): WorkoutLogWithSets =>
  ({
    id: date,
    user_id: "u1",
    session_type: "weights",
    duration_min: 60,
    intensity: 3,
    logged_at: new Date(`${date}T12:00:00`).toISOString(),
    sets: sets.map((s, i) => ({
      id: `${date}-${i}`,
      log_id: date,
      exercise: "Squat",
      weight_kg: 100,
      reps: 5,
      set_number: i + 1,
      set_kind: "working",
      notes: null,
      exercise_notes: null,
      exercise_id: null,
      library_id: null,
      prescribed_index: null,
      completed_at: null,
      rpe: null,
      side: null,
      ...s,
    })) as WorkoutSetRow[],
  }) as unknown as WorkoutLogWithSets

describe("adherenceThisWeek", () => {
  it("counts the workouts done since Monday", () => {
    const a = adherenceThisWeek(
      [log("2026-08-17"), log("2026-08-19")] as unknown as WorkoutLogRow[],
      4,
      WEDNESDAY
    )
    expect(a.done).toBe(2)
    expect(a.planned).toBe(4)
  })

  it("does not count a day that has not happened yet as a miss", () => {
    const a = adherenceThisWeek([], 4, WEDNESDAY)
    const future = a.days.filter((d) => d.future).map((d) => d.date)
    expect(future, "Thursday to Sunday are still to come").toEqual([
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ])
  })

  it("runs Monday to Sunday", () => {
    const a = adherenceThisWeek([], 3, WEDNESDAY)
    expect(a.days).toHaveLength(7)
    expect(a.days[0].date).toBe("2026-08-17")
    expect(a.days[6].date).toBe("2026-08-23")
  })

  it("ignores last week's workouts", () => {
    const a = adherenceThisWeek([log("2026-08-14")] as unknown as WorkoutLogRow[], 3, WEDNESDAY)
    expect(a.done).toBe(0)
  })
})

describe("weeklyVolume", () => {
  it("adds up weight times reps for working sets", () => {
    const weeks = weeklyVolume([log("2026-08-19", [{}, {}])], WEDNESDAY, 2)
    expect(weeks.at(-1)).toMatchObject({ weekStart: "2026-08-17", volumeKg: 1000, sets: 2 })
  })

  it("leaves warm-ups and drop sets out, because they are not the work", () => {
    const weeks = weeklyVolume(
      [log("2026-08-19", [{ set_kind: "warmup" }, { set_kind: "drop" }, {}])],
      WEDNESDAY,
      2
    )
    expect(weeks.at(-1)!.sets, "only the working set counts").toBe(1)
    expect(weeks.at(-1)!.volumeKg).toBe(500)
  })

  it("reports an empty week as zero rather than leaving a gap in the chart", () => {
    const weeks = weeklyVolume([log("2026-08-19", [{}])], WEDNESDAY, 3)
    expect(weeks).toHaveLength(3)
    expect(weeks[0]).toMatchObject({ volumeKg: 0, sets: 0 })
  })
})

describe("liftBests", () => {
  it("reports the heaviest single set with the day it happened", () => {
    const bests = liftBests([
      log("2026-08-10", [{ weight_kg: 100, reps: 5 }]),
      log("2026-08-17", [{ weight_kg: 110, reps: 3 }]),
    ])
    expect(bests[0]).toMatchObject({ bestWeightKg: 110, bestWeightReps: 3, bestWeightDate: "2026-08-17" })
  })

  it("treats more reps at the same weight as a better best", () => {
    const bests = liftBests([
      log("2026-08-10", [{ weight_kg: 100, reps: 5 }]),
      log("2026-08-17", [{ weight_kg: 100, reps: 8 }]),
    ])
    expect(bests[0].bestWeightReps).toBe(8)
  })

  /**
   * The point of the second number: 100×8 is a harder set than 110×1, and the
   * heaviest-single figure cannot see that.
   */
  it("keeps a separate best for the estimated max", () => {
    const bests = liftBests([
      log("2026-08-10", [{ weight_kg: 110, reps: 1 }]),
      log("2026-08-17", [{ weight_kg: 100, reps: 8 }]),
    ])
    expect(bests[0].bestWeightKg, "the heaviest single is still the heaviest single").toBe(110)
    expect(bests[0].bestEstimatedMaxKg).toBeCloseTo(126.7, 0)
    expect(bests[0].bestEstimatedDate).toBe("2026-08-17")
  })

  it("does not let a twenty-rep set be announced as a max nobody has lifted", () => {
    const bests = liftBests([log("2026-08-17", [{ weight_kg: 60, reps: 20 }])])
    expect(bests[0].bestEstimatedMaxKg, "capped at the weight itself above ten reps").toBe(60)
  })

  it("ignores warm-ups", () => {
    const bests = liftBests([
      log("2026-08-17", [{ weight_kg: 200, reps: 1, set_kind: "warmup" }, { weight_kg: 100, reps: 5 }]),
    ])
    expect(bests[0].bestWeightKg).toBe(100)
  })

  it("keeps each lift separate and puts the strongest first", () => {
    const bests = liftBests([
      log("2026-08-17", [
        { exercise: "Squat", weight_kg: 140, reps: 5 },
        { exercise: "Bench Press", weight_kg: 100, reps: 5 },
      ]),
    ])
    expect(bests.map((b) => b.exercise)).toEqual(["Squat", "Bench Press"])
  })
})

/**
 * THE TWO THINGS THE FIRST VERSION OF THESE TESTS ONLY CLAIMED.
 *
 * The docstring said a set counted in seconds was left out of the volume total.
 * It was not, and no test checked — so a 3 × 30 s carry at 40 kg contributed
 * 3,600 kg and outranked a 5 × 5 squat at 100 kg on the chart the whole feature
 * exists for. And a pull-up came out as "0 kg × 12 · est. max 0", which is not
 * a fact about anything.
 */
describe("work that is not weight times reps", () => {
  it("leaves a timed lift out of the weekly total", () => {
    // "Plank" is in the library and marked as timed; the 30 is seconds.
    const weeks = weeklyVolume(
      [log("2026-08-19", [{ exercise: "Plank", weight_kg: 40, reps: 30 }, { weight_kg: 100, reps: 5 }])],
      WEDNESDAY,
      2
    )
    expect(weeks.at(-1)!.volumeKg, "only the squat counts").toBe(500)
    expect(weeks.at(-1)!.sets).toBe(1)
  })

  it("does not put a timed hold in your bests as a one-rep max", () => {
    const bests = liftBests([log("2026-08-19", [{ exercise: "Plank", weight_kg: 40, reps: 45 }])])
    expect(bests.find((b) => b.exercise === "Plank")).toBeUndefined()
  })

  it("marks a lift with nothing loaded on it as bodyweight", () => {
    const bests = liftBests([log("2026-08-19", [{ exercise: "Pull-up", weight_kg: 0, reps: 12 }])])
    expect(bests[0]).toMatchObject({ exercise: "Pull-up", bodyweight: true, bestWeightReps: 12 })
  })

  it("stops calling it bodyweight once weight is added to it", () => {
    const bests = liftBests([
      log("2026-08-10", [{ exercise: "Pull-up", weight_kg: 0, reps: 12 }]),
      log("2026-08-19", [{ exercise: "Pull-up", weight_kg: 20, reps: 5 }]),
    ])
    expect(bests[0]).toMatchObject({ bodyweight: false, bestWeightKg: 20 })
  })
})
