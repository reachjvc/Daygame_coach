import { describe, it, expect } from "vitest"
import {
  buildWorkoutHeatmapWeeks,
  computeWeekStreak,
  liftHistory,
  liftsWithHistory,
  workoutsToCsv,
  detectPersonalRecords,
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
    // Written up after the fact: no start, no end. A live workout has a start
    // and is excluded from every one of these reads until it is finished.
    started_at: null,
    ended_at: null,
    enrollment_id: null,
    program_day_id: null,
    program_cycle: null,
    program_week: null,
    adjustments: {},
    rpe: null,
    notes: null,
    client_key: null,
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
    notes: null,
    exercise_notes: null,
    exercise_id: null,
    library_id: null,
    // `is_warmup` became `set_kind`: a boolean could not tell an all-out top
    // set from a back-off, which is exactly what a progression rule reads.
    set_kind: "working",
    prescribed_index: null,
    completed_at: null,
    rpe: null,
    side: null,
    ...overrides,
  }
}

// Wed 2026-07-15 noon local — fixed reference date for determinism
const TODAY = new Date(2026, 6, 15, 12, 0, 0)

/**
 * The lifter's own calendar day, which `detectPersonalRecords` requires rather
 * than taking from the clock — it used to default to the SERVER's calendar,
 * which filed a Copenhagen lifter's 00:30 Tuesday record on Monday. The tests
 * that pass this are not about the date, so one constant serves them all; the
 * test that IS about the date passes its own day and asserts on it.
 */
const ON_DAY = "2026-09-17"

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

/**
 * "summarizeWorkoutSets", "findLastExerciseSets" and "workoutsOnDate" were
 * tested here. All three had one caller — the fill-in-afterwards form — and
 * went with it.
 *
 * WHERE THEIR SUBJECTS LIVE NOW:
 *   - the summary line: `HistoryTab` builds it in the LIFTER'S unit, which is
 *     the bug the deleted one had
 *   - the last time you did a lift: resolved server-side and handed to the
 *     live screen as `lastTime`
 *   - which workouts happened on a day: `workoutsByLocalDate`, in the
 *     account's zone rather than the running process's
 */


/**
 * THE ACCOUNT'S ZONE, PASSED IN EVERYWHERE.
 *
 * These functions used to bucket "which day was this" on the machine's clock —
 * the browser's here, UTC on the server — so a 23:30 Copenhagen set was filed
 * on the previous day the moment the work moved server-side. The zone is a
 * required argument now, which makes that class of bug unrepresentable rather
 * than merely absent.
 */
const TZ = "Europe/Copenhagen"

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
    expect(liftHistory(sets, "Bench Press", TZ).map((p) => p.weight)).toEqual([60, 80])
  })

  it("matches on the same key personal records use, so spelling does not split a lift", () => {
    const sets = [s("bench press", 60, "2026-01-10T10:00:00"), s("Bench Press ", 70, "2026-02-10T10:00:00")]
    expect(liftHistory(sets, "BENCH PRESS", TZ)).toHaveLength(2)
  })

  it("excludes warm-ups — a warm-up counted as working weight reads as a collapse", () => {
    const sets = [
      s("Squat", 100, "2026-01-10T10:00:00"),
      s("Squat", 20, "2026-01-17T10:00:00", { set_kind: "warmup" }),
    ]
    expect(liftHistory(sets, "Squat", TZ).map((p) => p.weight)).toEqual([100])
  })

  it("takes the heaviest set of a day, so five sets are one point and a drop set is not a fall", () => {
    const sets = [
      s("Squat", 100, "2026-01-10T10:00:00"),
      s("Squat", 100, "2026-01-10T10:05:00"),
      s("Squat", 60, "2026-01-10T10:10:00"),
    ]
    const out = liftHistory(sets, "Squat", TZ)
    expect(out).toHaveLength(1)
    expect(out[0].weight).toBe(100)
  })

  it("returns oldest first, whatever order the rows arrive in", () => {
    const sets = [s("Row", 80, "2026-06-01T10:00:00"), s("Row", 40, "2026-01-01T10:00:00")]
    expect(liftHistory(sets, "Row", TZ).map((p) => p.weight)).toEqual([40, 80])
  })

  it("a lift never done is empty, not an error", () => {
    expect(liftHistory([], "Deadlift", TZ)).toEqual([])
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
    expect(liftsWithHistory(sets, TZ).map((l) => l.exercise)).toEqual(["Squat"])
  })

  it("lists the most-trained lift first", () => {
    const sets = [
      s("Squat", 100, "2026-01-01T10:00:00"), s("Squat", 105, "2026-01-08T10:00:00"), s("Squat", 110, "2026-01-15T10:00:00"),
      s("Row", 60, "2026-01-01T10:00:00"), s("Row", 62, "2026-01-08T10:00:00"),
    ]
    expect(liftsWithHistory(sets, TZ).map((l) => l.exercise)).toEqual(["Squat", "Row"])
  })

  it("keeps one spelling per lift rather than listing it twice", () => {
    const sets = [
      s("Bench Press", 60, "2026-01-01T10:00:00"),
      s("bench press", 65, "2026-01-08T10:00:00"),
    ]
    expect(liftsWithHistory(sets, TZ)).toHaveLength(1)
  })
})

describe("workoutsToCsv", () => {
  // Named apart from the module-level `log` helper it builds on, which it used
  // to shadow.
  const workout = (loggedAt: string, sets: WorkoutSetRow[]): WorkoutLogWithSets => ({
    ...log("l1", new Date(loggedAt).toISOString()),
    sets,
  })

  it("quotes an exercise name containing a comma, or the file splits a column", () => {
    const csv = workoutsToCsv([workout("2026-03-01T10:00:00", [set("Bench Press, close grip", 60, 5)])], TZ)
    expect(csv).toContain('"Bench Press, close grip"')
  })

  it("doubles a quote inside a name", () => {
    const csv = workoutsToCsv([workout("2026-03-01T10:00:00", [set('The "good" one', 60, 5)])], TZ)
    expect(csv).toContain('"The ""good"" one"')
  })

  it("marks warm-ups rather than dropping them", () => {
    const csv = workoutsToCsv([workout("2026-03-01T10:00:00", [set("Squat", 20, 10, { set_kind: "warmup" })])], TZ)
    // The column says WHAT the set was, not merely whether it was a warm-up:
    // a top set and a back-off are different facts and used to be the same one.
    expect(csv).toContain("warmup")
    expect(csv.split("\n")).toHaveLength(2)
  })

  it("keeps a session with no sets, so the file agrees with the session count", () => {
    const csv = workoutsToCsv([workout("2026-03-01T10:00:00", [])], TZ)
    expect(csv.split("\n")).toHaveLength(2)
    expect(csv).toContain("2026-03-01")
  })

  it("dates each row by the day you trained, in your own calendar", () => {
    // 23:30 local must not be filed on tomorrow.
    const csv = workoutsToCsv([workout("2026-03-01T23:30:00", [set("Squat", 100, 5)])], TZ)
    expect(csv).toContain("2026-03-01")
  })

  it("has a header even with nothing to export", () => {
    expect(workoutsToCsv([], TZ).split("\n")).toEqual(["date,session_type,duration_min,exercise,set,reps,weight_kg,set_kind"])
  })
})

/**
 * PERSONAL RECORDS — one per lift, per workout.
 *
 * A workout is three to five sets of the same lift at the same weight, so the
 * naive "is this better than the history" check fired on every one of them and
 * the summary said "New best: Squat 100 kg × 5" three times in a row. It read
 * as a bug to anybody who has ever trained, because it is one.
 */
describe("detectPersonalRecords", () => {
  const history = [{ ...set("Squat", 95, 5), logged_at: "2026-09-01T10:00:00Z" }]

  it("announces one record for three sets across the old best", () => {
    const today = [
      set("Squat", 100, 5, { set_number: 1 }),
      set("Squat", 100, 5, { set_number: 2 }),
      set("Squat", 100, 5, { set_number: 3 }),
    ]
    const prs = detectPersonalRecords(history, today, ON_DAY)
    expect(prs).toHaveLength(1)
    expect(prs[0]).toMatchObject({ exercise: "Squat", weight_kg: 100, reps: 5 })
  })

  it("keeps the best of the session, not the first one over the line", () => {
    // Worked up: 97.5 beats the history, then 100 beats that, then 102.5×3.
    // The record is the heaviest, and it is the only line shown.
    const prs = detectPersonalRecords(history, [
      set("Squat", 97.5, 5, { set_number: 1 }),
      set("Squat", 100, 5, { set_number: 2 }),
      set("Squat", 102.5, 3, { set_number: 3 }),
    ], ON_DAY)
    expect(prs).toHaveLength(1)
    expect(prs[0]).toMatchObject({ weight_kg: 102.5, reps: 3 })
  })

  /**
   * CHANGED 2026-09-18, DELIBERATELY. This fixture gave Bench Press no history
   * at all and expected it to be announced as a record — which is the bug
   * behind "New best" on the very first set an account ever logged. A lift with
   * no history is a FIRST, not a best, so the fixture now gives the bench a
   * past to beat.
   */
  it("still reports each lift separately", () => {
    const withBench = [...history, { ...set("Bench Press", 55, 5), logged_at: "2026-09-01T10:00:00Z" }]
    const prs = detectPersonalRecords(withBench, [
      set("Squat", 100, 5, { set_number: 1 }),
      set("Squat", 100, 5, { set_number: 2 }),
      set("Bench Press", 60, 5, { set_number: 1 }),
    ], ON_DAY)
    expect(prs.map((p) => p.exercise).sort()).toEqual(["Bench Press", "Squat"])
  })

  it("does not call an extra rep at the same weight a second record", () => {
    // 100×5 then 100×6: the second is genuinely better, but it replaces the
    // first rather than adding a near-identical line beside it.
    const prs = detectPersonalRecords(history, [
      set("Squat", 100, 5, { set_number: 1 }),
      set("Squat", 100, 6, { set_number: 2 }),
    ], ON_DAY)
    expect(prs).toHaveLength(1)
    expect(prs[0]!.reps).toBe(6)
  })

  it("ignores warm-ups and drop sets", () => {
    const prs = detectPersonalRecords(history, [
      set("Squat", 140, 1, { set_kind: "warmup" }),
      set("Squat", 140, 1, { set_kind: "drop" }),
    ], ON_DAY)
    expect(prs).toEqual([])
  })

  it("says nothing when the session did not beat the history", () => {
    expect(detectPersonalRecords(history, [set("Squat", 90, 5)], ON_DAY)).toEqual([])
  })

  /**
   * THE DAY IS THE LIFTER'S, NOT THE SERVER'S.
   *
   * `detectPersonalRecords` runs in a route handler on a server whose process
   * clock is UTC, and it stamped records with that clock's calendar day. A
   * Berlin lifter finishing at 00:30 on Tuesday had the record filed on Monday;
   * a Los Angeles lifter finishing Monday evening had it filed on Tuesday. The
   * caller knows the timezone and the workout's own start, so it passes the day.
   */
  it("files a record on the day it is given, not on the server's day", () => {
    const prs = detectPersonalRecords(history, [set("Squat", 100, 5)], "2026-03-01")
    expect(prs[0]!.date).toBe("2026-03-01")
  })
})
