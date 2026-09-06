import { describe, it, expect } from "vitest"
import {
  buildWorkoutHeatmapWeeks,
  computeWeekStreak,
  summarizeWorkoutSets,
  findLastExerciseSets,
  workoutsOnDate,
  liftHistory,
  liftsWithHistory,
  workoutsToCsv,
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

/**
 * The double-log guard. A program session logged on /programs bridges into
 * workout_logs, and the free-form logger writes to the same table — so one gym
 * session written up both ways counts twice, on the week total, the streak, the
 * heatmap and any goal reading the metric. These assert on the thing that
 * actually matters: that a workout is matched to the day the person TRAINED, in
 * their own timezone, not the day UTC happened to be on.
 */
describe("workoutsOnDate", () => {
  it("finds the workout already logged on that day", () => {
    const logs = [
      log("a", new Date(2026, 6, 15, 7, 30).toISOString()),
      log("b", new Date(2026, 6, 14, 18, 0).toISOString()),
    ]
    expect(workoutsOnDate(logs, "2026-07-15").map((l) => l.id)).toEqual(["a"])
  })

  it("returns nothing on a day that was not trained", () => {
    const logs = [log("a", new Date(2026, 6, 15, 7, 30).toISOString())]
    expect(workoutsOnDate(logs, "2026-07-16")).toEqual([])
  })

  it("counts a late-evening workout on the day it was done, not the next UTC day", () => {
    // 23:30 local. In any timezone east of UTC this instant is already tomorrow
    // in UTC, and a naive toISOString().split("T")[0] would file it a day late —
    // the same clock bug this codebase has now hit three times.
    const lateNight = new Date(2026, 6, 15, 23, 30)
    expect(workoutsOnDate([log("a", lateNight.toISOString())], "2026-07-15")).toHaveLength(1)
  })

  it("reports every workout on the day, so a second one can be named", () => {
    const logs = [
      log("morning", new Date(2026, 6, 15, 7, 0).toISOString()),
      log("evening", new Date(2026, 6, 15, 19, 0).toISOString()),
    ]
    expect(workoutsOnDate(logs, "2026-07-15")).toHaveLength(2)
  })
})

/**
 * ONE LIFT, ACROSS EVERY PROGRAM.
 *
 * `summariseProgression` reads one enrollment, so "my bench" resets every time
 * you change program — backwards, because the lift persists and the program is
 * what changes. `workout_sets` already spans both program sessions and loose
 * workouts, keyed by exercise name.
 */
describe("liftHistory", () => {
  const s = (exercise: string, weight: number, loggedAt: string, overrides: Partial<WorkoutSetRow> = {}) => ({
    ...set(exercise, weight, 5, overrides),
    logged_at: new Date(loggedAt).toISOString(),
  })

  it("joins the same lift across two different programs into one line", () => {
    const sets = [
      s("Bench Press", 60, "2026-01-10T10:00:00"),
      s("Bench Press", 80, "2026-06-10T10:00:00"),
    ]
    expect(liftHistory(sets, "Bench Press").map((p) => p.weight)).toEqual([60, 80])
  })

  it("matches on the same key personal records use, so spelling does not split a lift", () => {
    const sets = [s("bench press", 60, "2026-01-10T10:00:00"), s("Bench Press ", 70, "2026-02-10T10:00:00")]
    expect(liftHistory(sets, "BENCH PRESS")).toHaveLength(2)
  })

  it("excludes warm-ups — a warm-up counted as working weight reads as a collapse", () => {
    const sets = [
      s("Squat", 100, "2026-01-10T10:00:00"),
      s("Squat", 20, "2026-01-17T10:00:00", { is_warmup: true }),
    ]
    expect(liftHistory(sets, "Squat").map((p) => p.weight)).toEqual([100])
  })

  it("takes the heaviest set of a day, so five sets are one point and a drop set is not a fall", () => {
    const sets = [
      s("Squat", 100, "2026-01-10T10:00:00"),
      s("Squat", 100, "2026-01-10T10:05:00"),
      s("Squat", 60, "2026-01-10T10:10:00"),
    ]
    const out = liftHistory(sets, "Squat")
    expect(out).toHaveLength(1)
    expect(out[0].weight).toBe(100)
  })

  it("returns oldest first, whatever order the rows arrive in", () => {
    const sets = [s("Row", 80, "2026-06-01T10:00:00"), s("Row", 40, "2026-01-01T10:00:00")]
    expect(liftHistory(sets, "Row").map((p) => p.weight)).toEqual([40, 80])
  })

  it("a lift never done is empty, not an error", () => {
    expect(liftHistory([], "Deadlift")).toEqual([])
  })
})

describe("liftsWithHistory", () => {
  const s = (exercise: string, weight: number, loggedAt: string, overrides: Partial<WorkoutSetRow> = {}) => ({
    ...set(exercise, weight, 5, overrides),
    logged_at: new Date(loggedAt).toISOString(),
  })

  it("drops a lift done only once — two points is the least a line can be drawn from", () => {
    const sets = [
      s("Squat", 100, "2026-01-01T10:00:00"),
      s("Squat", 110, "2026-01-08T10:00:00"),
      s("Curl", 20, "2026-01-01T10:00:00"),
    ]
    expect(liftsWithHistory(sets).map((l) => l.exercise)).toEqual(["Squat"])
  })

  it("lists the most-trained lift first", () => {
    const sets = [
      s("Squat", 100, "2026-01-01T10:00:00"), s("Squat", 105, "2026-01-08T10:00:00"), s("Squat", 110, "2026-01-15T10:00:00"),
      s("Row", 60, "2026-01-01T10:00:00"), s("Row", 62, "2026-01-08T10:00:00"),
    ]
    expect(liftsWithHistory(sets).map((l) => l.exercise)).toEqual(["Squat", "Row"])
  })

  it("keeps one spelling per lift rather than listing it twice", () => {
    const sets = [
      s("Bench Press", 60, "2026-01-01T10:00:00"),
      s("bench press", 65, "2026-01-08T10:00:00"),
    ]
    expect(liftsWithHistory(sets)).toHaveLength(1)
  })
})

describe("workoutsToCsv", () => {
  const log = (loggedAt: string, sets: WorkoutSetRow[]): WorkoutLogWithSets => ({
    id: "l1", user_id: "u", session_type: "weights", duration_min: 60, intensity: 3,
    distance_km: null, logged_at: new Date(loggedAt).toISOString(), created_at: new Date(loggedAt).toISOString(), sets,
  })

  it("quotes an exercise name containing a comma, or the file splits a column", () => {
    const csv = workoutsToCsv([log("2026-03-01T10:00:00", [set("Bench Press, close grip", 60, 5)])])
    expect(csv).toContain('"Bench Press, close grip"')
  })

  it("doubles a quote inside a name", () => {
    const csv = workoutsToCsv([log("2026-03-01T10:00:00", [set('The "good" one', 60, 5)])])
    expect(csv).toContain('"The ""good"" one"')
  })

  it("marks warm-ups rather than dropping them", () => {
    const csv = workoutsToCsv([log("2026-03-01T10:00:00", [set("Squat", 20, 10, { is_warmup: true })])])
    expect(csv).toContain("true")
    expect(csv.split("\n")).toHaveLength(2)
  })

  it("keeps a session with no sets, so the file agrees with the session count", () => {
    const csv = workoutsToCsv([log("2026-03-01T10:00:00", [])])
    expect(csv.split("\n")).toHaveLength(2)
    expect(csv).toContain("2026-03-01")
  })

  it("dates each row by the day you trained, in your own calendar", () => {
    // 23:30 local must not be filed on tomorrow.
    const csv = workoutsToCsv([log("2026-03-01T23:30:00", [set("Squat", 100, 5)])])
    expect(csv).toContain("2026-03-01")
  })

  it("has a header even with nothing to export", () => {
    expect(workoutsToCsv([]).split("\n")).toEqual(["date,session_type,duration_min,exercise,set,reps,weight_kg,warm_up"])
  })
})
