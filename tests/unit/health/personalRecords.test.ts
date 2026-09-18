/**
 * ONE DEFINITION OF A PERSONAL BEST.
 *
 * In plain terms, what was wrong. Three screens each answered "is this a new
 * best?" from a different slice of your training: the finish summary looked at
 * the last 400 workouts, the Progress list at 365 days, and the fill-in-later
 * form at 90. So the same set was a record on one screen and not on the next.
 *
 * And with no history at all, every set was a record — the very first set a new
 * account ever logged came back as "New best", which is meaningless. A lift you
 * have never done is a FIRST. That is true, and still worth seeing.
 */

import { describe, it, expect } from "vitest"
import {
  detectPersonalRecords,
  firstTimeLifts,
  liftBests,
} from "@/src/health/healthService"
import type { WorkoutLogWithSets, WorkoutSetRow } from "@/src/health/types"

const TZ = "Europe/Copenhagen"

const set = (
  exercise: string,
  weight_kg: number,
  reps: number,
  over: Partial<WorkoutSetRow> = {}
): WorkoutSetRow => ({
  id: `${exercise}-${weight_kg}-${reps}-${over.set_number ?? 1}`,
  log_id: "l1",
  exercise,
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
  ...over,
})

const past = (at: string, sets: WorkoutSetRow[]) => sets.map((s) => ({ ...s, logged_at: at }))

/**
 * The lifter's own calendar day, which `detectPersonalRecords` requires rather
 * than taking from the clock — it used to default to the SERVER's calendar,
 * which filed a Copenhagen lifter's 00:30 Tuesday record on Monday. The tests
 * that pass this are not about the date, so one constant serves them all; the
 * test that IS about the date passes its own day and asserts on it.
 */
const ON_DAY = "2026-09-17"

describe("a best, a first, and the difference", () => {
  it("no best is claimed for a lift with no history — it is a first", () => {
    const today = [set("Front Squat", 80, 5)]
    expect(detectPersonalRecords([], today, ON_DAY)).toEqual([])
    expect(firstTimeLifts([], today)).toEqual(["Front Squat"])
  })

  it("a heavier set fourteen months ago beats today's, because the baseline is all time", () => {
    // The old windows were 400 workouts / 365 days / 90 days. Fourteen months
    // fell outside two of them, so 102.5 kg was announced as a new best against
    // a 110 kg set the person had actually done.
    const longAgo = past("2025-07-01T10:00:00Z", [set("Bench Press", 110, 3)])
    expect(detectPersonalRecords(longAgo, [set("Bench Press", 102.5, 5)], ON_DAY)).toEqual([])
    expect(firstTimeLifts(longAgo, [set("Bench Press", 102.5, 5)])).toEqual([])
  })

  it("a lift done only as a warm-up before is still a first", () => {
    // Five reps of the empty bar is not "you have benched before".
    const warmupsOnly = past("2026-01-01T10:00:00Z", [
      set("Bench Press", 20, 5, { set_kind: "warmup" }),
    ])
    expect(firstTimeLifts(warmupsOnly, [set("Bench Press", 60, 5)])).toEqual(["Bench Press"])
    expect(detectPersonalRecords(warmupsOnly, [set("Bench Press", 60, 5)], ON_DAY)).toEqual([])
  })

  it("names a first once, however many sets of it there are", () => {
    const today = [
      set("Front Squat", 80, 5, { set_number: 1 }),
      set("Front Squat", 80, 5, { set_number: 2 }),
      set("Front Squat", 85, 5, { set_number: 3 }),
    ]
    expect(firstTimeLifts([], today)).toEqual(["Front Squat"])
  })

  it("the finish summary, Progress bests and the past-workout form agree", () => {
    /**
     * ONE FIXTURE, THREE CALLERS. Each of the three used to reach a different
     * answer about this exact history, because each looked at a different
     * window of it. They now read the same baseline.
     */
    const history: WorkoutLogWithSets[] = [
      {
        id: "l-old",
        user_id: "u1",
        session_type: "weights",
        duration_min: 60,
        intensity: 3,
        logged_at: "2025-05-04T10:00:00Z",
        sets: [set("Bench Press", 105, 3, { log_id: "l-old" })],
      } as unknown as WorkoutLogWithSets,
      {
        id: "l-recent",
        user_id: "u1",
        session_type: "weights",
        duration_min: 60,
        intensity: 3,
        logged_at: "2026-09-01T10:00:00Z",
        sets: [set("Bench Press", 100, 5, { log_id: "l-recent" })],
      } as unknown as WorkoutLogWithSets,
    ]
    const flat = history.flatMap((l) => (l.sets ?? []).map((s) => ({ ...s, logged_at: l.logged_at })))

    // Progress's list: the heaviest bench is the one from 2025.
    const bests = liftBests(history, TZ)
    expect(bests.find((b) => b.exercise === "Bench Press")?.bestWeightKg).toBe(105)

    // The finish summary: 102.5 × 5 does not beat 105 × 3.
    expect(detectPersonalRecords(flat, [set("Bench Press", 102.5, 5)], ON_DAY)).toEqual([])

    // The past-workout form: a lift never logged is a first, not a record.
    expect(firstTimeLifts(flat, [set("Front Squat", 60, 8)])).toEqual(["Front Squat"])
  })

  it("a best is filed on the lifter's day, not the server's", () => {
    // 23:30 UTC on the 17th is 01:30 on the 18th in Copenhagen. Read through
    // the server's UTC calendar this best lands on the wrong day.
    const log = {
      id: "l1",
      user_id: "u1",
      session_type: "weights",
      duration_min: 60,
      intensity: 3,
      logged_at: "2026-08-17T23:30:00Z",
      sets: [set("Squat", 140, 3)],
    } as unknown as WorkoutLogWithSets
    expect(liftBests([log], TZ)[0].bestWeightDate).toBe("2026-08-18")
    expect(liftBests([log], "UTC")[0].bestWeightDate).toBe("2026-08-17")
  })
})
