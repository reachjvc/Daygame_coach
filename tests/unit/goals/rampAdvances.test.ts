/**
 * THE RAMP MOVES THE TARGET.
 *
 * This is the defect the owner found himself, and the sentence he used for it
 * was "remembers it, never acts on it".
 *
 * He writes: approach ten a week, building to twenty-five over two months. The
 * build-up is stored faithfully — `rampSteps` on the plan goal, `ramp_steps`
 * on the counted row — and then `target_value` is set once, at creation, and
 * nothing ever moves it. Week nine asks for exactly what week one asked for,
 * for ever. A grep for the callers of the functions that read a ramp at
 * runtime came back empty.
 *
 * `rampTargetForPeriod` is what acts on it, at the weekly roll. These test it
 * through `practiceRateInWeek`, which is the same function the Track step's
 * week grid uses, so the schedule and the goal cannot drift apart — that pair
 * having two implementations is what made the goal ask for seven while the
 * grid above it showed five.
 */

import { describe, it, expect } from "vitest"
import { rampTargetForPeriod } from "@/src/db/goalRepo"
import { practiceRateInWeek } from "@/src/goals/northStarTrackService"
import type { HabitRampStep } from "@/src/goals/types"

/** The owner's real Approaches ramp, from plan_snapshots revision 340. */
const RAMP: HabitRampStep[] = [
  { durationWeeks: 8, frequencyPerWeek: 5 },
  { durationWeeks: 12, frequencyPerWeek: 10 },
  { durationWeeks: 12, frequencyPerWeek: 15 },
  { durationWeeks: 24, frequencyPerWeek: 20 },
  { durationWeeks: 4, frequencyPerWeek: 21 },
]

/**
 * The real function the roll calls, on a row shaped as the database returns it.
 *
 * Deliberately not a re-implementation. The first version of this file computed
 * the week index itself and compared the answer to `practiceRateInWeek` — which
 * is a test of arithmetic that agrees with itself, and would have gone on
 * passing with `rampTargetForPeriod` deleted.
 */
function targetOn(
  createdAt: string,
  today: string,
  ramp: HabitRampStep[],
  current = 7,
  period: string = "weekly",
): number | null {
  return rampTargetForPeriod(
    { period, ramp_steps: ramp, created_at: `${createdAt}T09:30:00Z`, target_value: current },
    today,
  )
}

describe("what the weekly roll asks for as the weeks pass", () => {
  const CREATED = "2026-01-05" // a Monday

  it("week one is the ramp's first step", () => {
    expect(targetOn(CREATED, "2026-01-05", RAMP)).toBe(5)
    expect(targetOn(CREATED, "2026-01-11", RAMP)).toBe(5)
  })

  it("holds five for the eight weeks the step says", () => {
    expect(targetOn(CREATED, "2026-02-23", RAMP)).toBe(5) // week 8
  })

  it("steps up to ten in week nine — the thing that never used to happen", () => {
    expect(targetOn(CREATED, "2026-03-02", RAMP)).toBe(10) // week 9
  })

  it("keeps stepping", () => {
    expect(targetOn(CREATED, "2026-05-25", RAMP)).toBe(15) // week 21
    expect(targetOn(CREATED, "2026-08-17", RAMP)).toBe(20) // week 33
  })

  it("settles at what the ramp built up to, not at the day count", () => {
    // Week 61 and beyond. Falling back to `daysPerWeek` here would have the
    // target drop from twenty-one to seven the week the ramp ran out.
    expect(targetOn(CREATED, "2027-03-08", RAMP)).toBe(21)
    expect(targetOn(CREATED, "2030-01-07", RAMP)).toBe(21)
  })

  it("never asks for less than one", () => {
    expect(targetOn(CREATED, "2026-01-05", [{ durationWeeks: 4, frequencyPerWeek: 0 }])).toBe(1)
  })
})

describe("what the roll leaves alone — null means the target is not touched", () => {
  const CREATED = "2026-01-05"

  it("a goal with no ramp keeps the target somebody chose", () => {
    expect(targetOn(CREATED, "2026-06-01", [])).toBeNull()
  })

  it("a goal that is not weekly is left alone", () => {
    // A ramp is a rate PER WEEK. Applying it to a daily yes/no or a yearly
    // counter would be inventing a meaning it does not have.
    expect(targetOn(CREATED, "2026-06-01", RAMP, 7, "daily")).toBeNull()
    expect(targetOn(CREATED, "2026-06-01", RAMP, 7, "yearly")).toBeNull()
    expect(targetOn(CREATED, "2026-06-01", RAMP, 7, "custom")).toBeNull()
  })

  it("a clock that reads before the goal existed changes nothing", () => {
    expect(targetOn(CREATED, "2025-12-01", RAMP)).toBeNull()
  })

  it("the time of day the goal was created does not shift the week", () => {
    // `created_at` is a timestamp; the week is counted from its DATE. A goal
    // made at half past nine must not sit in a different week from one made at
    // midnight.
    expect(targetOn(CREATED, "2026-02-23", RAMP)).toBe(5) // week 8
    expect(targetOn(CREATED, "2026-03-02", RAMP)).toBe(10) // week 9
  })
})

describe("the grid and the goal cannot drift apart", () => {
  it("both answer through practiceRateInWeek", () => {
    // That pair having two implementations is what made the goal ask for seven
    // while the schedule above it showed five.
    const CREATED = "2026-01-05"
    const cases: Array<[string, number]> = [
      ["2026-01-05", 1],
      ["2026-02-23", 8],
      ["2026-03-02", 9],
      ["2026-05-25", 21],
      ["2027-03-08", 61],
    ]
    for (const [day, week] of cases) {
      expect(targetOn(CREATED, day, RAMP), `week ${week}`).toBe(
        practiceRateInWeek({ perWeek: null, daysPerWeek: 7, rampSteps: RAMP }, week),
      )
    }
  })
})
