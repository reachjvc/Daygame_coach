import { describe, it, expect } from "vitest"
import {
  buildWorkoutHeatmapWeeks,
  computeWeekStreak,
  summarizeWorkoutSets,
  findLastExerciseSets,
} from "@/src/health/healthService"
import type { WorkoutLogRow, WorkoutLogWithSets, WorkoutSetRow } from "@/src/health/types"

function log(id: string, loggedAt: string): WorkoutLogRow {
  return {
    id,
    user_id: "u1",
    session_type: "weights",
    duration_min: 60,
    intensity: 3,
    distance_km: null,
    logged_at: loggedAt,
    created_at: loggedAt,
  }
}

function set(exercise: string, weight: number, reps: number, overrides: Partial<WorkoutSetRow> = {}): WorkoutSetRow {
  return {
    id: `${exercise}-${weight}-${reps}-${Math.abs(overrides.set_number ?? 1)}`,
    log_id: "l1",
    exercise,
    weight_kg: weight,
    reps,
    set_number: 1,
    is_warmup: false,
    notes: null,
    exercise_notes: null,
    ...overrides,
  }
}

// Wed 2026-07-15 noon local — fixed reference date for determinism
const TODAY = new Date(2026, 6, 15, 12, 0, 0)

describe("buildWorkoutHeatmapWeeks", () => {
  it("returns the requested number of Monday-start weeks ending with the current week", () => {
    const grid = buildWorkoutHeatmapWeeks([], TODAY, 13)
    expect(grid).toHaveLength(13)
    expect(grid.every((w) => w.length === 7)).toBe(true)
    // Current week: Mon 2026-07-13 … Sun 2026-07-19
    expect(grid[12][0].date).toBe("2026-07-13")
    expect(grid[12][6].date).toBe("2026-07-19")
    // First column starts 12 weeks before the current Monday
    expect(grid[0][0].date).toBe("2026-04-20")
  })

  it("counts workouts on their local date and flags future days", () => {
    const logs = [log("a", "2026-07-13T10:00:00"), log("b", "2026-07-13T18:00:00"), log("c", "2026-07-14T09:00:00")]
    const grid = buildWorkoutHeatmapWeeks(logs, TODAY, 2)
    const currentWeek = grid[1]
    expect(currentWeek[0]).toEqual({ date: "2026-07-13", count: 2, future: false })
    expect(currentWeek[1]).toEqual({ date: "2026-07-14", count: 1, future: false })
    expect(currentWeek[2].future).toBe(false) // today itself
    expect(currentWeek[3].future).toBe(true)
    expect(currentWeek[6].future).toBe(true)
  })
})

describe("computeWeekStreak", () => {
  it("returns 0 with no workouts", () => {
    expect(computeWeekStreak([], TODAY)).toBe(0)
  })

  it("counts consecutive weeks back from the current week", () => {
    const logs = [
      log("a", "2026-07-14T10:00:00"), // current week
      log("b", "2026-07-08T10:00:00"), // last week
      log("c", "2026-06-30T10:00:00"), // 2 weeks ago
    ]
    expect(computeWeekStreak(logs, TODAY)).toBe(3)
  })

  it("does not break the streak when the current week is still empty", () => {
    const logs = [log("a", "2026-07-08T10:00:00"), log("b", "2026-06-30T10:00:00")]
    expect(computeWeekStreak(logs, TODAY)).toBe(2)
  })

  it("stops at a gap week", () => {
    const logs = [log("a", "2026-07-14T10:00:00"), log("b", "2026-06-30T10:00:00")]
    expect(computeWeekStreak(logs, TODAY)).toBe(1)
  })
})

describe("summarizeWorkoutSets", () => {
  it("collapses uniform working sets", () => {
    const sets = [
      set("Bench Press", 80, 5, { set_number: 1 }),
      set("Bench Press", 80, 5, { set_number: 2 }),
      set("Bench Press", 80, 5, { set_number: 3 }),
    ]
    expect(summarizeWorkoutSets(sets)).toEqual([
      { exercise: "Bench Press", detail: "80kg × 5 × 3 sets", setCount: 3 },
    ])
  })

  it("lists mixed sets and marks warm-ups", () => {
    const sets = [
      set("Squat", 60, 5, { set_number: 1, is_warmup: true }),
      set("Squat", 100, 5, { set_number: 2 }),
      set("Squat", 105, 3, { set_number: 3 }),
    ]
    expect(summarizeWorkoutSets(sets)).toEqual([
      { exercise: "Squat", detail: "60×5w, 100×5, 105×3", setCount: 3 },
    ])
  })

  it("groups case-insensitively and preserves first-seen order", () => {
    const sets = [
      set("Bench Press", 80, 5, { set_number: 1 }),
      set("Row", 70, 8, { set_number: 2 }),
      set("bench press", 80, 5, { set_number: 3 }),
    ]
    const result = summarizeWorkoutSets(sets)
    expect(result.map((r) => r.exercise)).toEqual(["Bench Press", "Row"])
    expect(result[0].setCount).toBe(2)
  })
})

describe("findLastExerciseSets", () => {
  const logs: WorkoutLogWithSets[] = [
    { ...log("a", "2026-07-01T10:00:00"), sets: [set("Bench Press", 75, 5)] },
    { ...log("b", "2026-07-08T10:00:00"), sets: [set("Bench Press", 80, 5), set("Row", 70, 8)] },
    { ...log("c", "2026-07-14T10:00:00"), sets: [set("Squat", 100, 5)] },
  ]

  it("returns the most recent sets matching the exercise, case-insensitively", () => {
    const result = findLastExerciseSets(logs, "bench press")
    expect(result?.date).toBe("2026-07-08T10:00:00")
    expect(result?.sets.map((s) => s.weight_kg)).toEqual([80])
  })

  it("returns null for unknown or blank exercise names", () => {
    expect(findLastExerciseSets(logs, "Deadlift")).toBeNull()
    expect(findLastExerciseSets(logs, "  ")).toBeNull()
  })
})
