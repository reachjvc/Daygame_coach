/**
 * WHAT A PRACTICE ASKS FOR THIS WEEK.
 *
 * THE DEFECT THESE PIN, found in the owner's live data on 2026-09-19.
 *
 * His Approaches goal carries a ramp: five a week for eight weeks, then ten,
 * fifteen, twenty, twenty-one. The goal the product created asked for SEVEN a
 * week, from day one, for ever. Seven is neither end of that ramp — it is
 * `daysPerWeek`, a count of DAYS, standing in for a count of approaches
 * because `perWeek` was never set and `goalToInsert` never read the ramp.
 *
 * A ramp exists to ease somebody in. Starting it at a number above its own
 * first step starts them at the hardest setting it will ever ask for in the
 * first two months.
 *
 * Worse, the plan already knew better: `activityPerWeek` walked the ramp
 * correctly for the week grid on the Track step, so the schedule showed FIVE
 * while the goal rendered directly beneath it asked for SEVEN. The last test
 * here is the one that matters — it asserts the two surfaces cannot disagree
 * again, which is the class, not the instance.
 *
 * Nothing pinned any of this before: the whole `tests/unit/goals` suite passed
 * unchanged when the behaviour was corrected.
 */

import { describe, it, expect } from "vitest"
import { addGoal, emptyNsPlan, updateGoal } from "@/src/goals/northStarService"
import {
  activityPerWeek,
  goalToInsert,
  practiceRateInWeek,
  trackActivities,
} from "@/src/goals/northStarTrackService"
import type { HabitRampStep } from "@/src/goals/types"

const RUN = "run-1"

/** The owner's real Approaches ramp, from plan_snapshots revision 340. */
const APPROACHES_RAMP: HabitRampStep[] = [
  { durationWeeks: 8, frequencyPerWeek: 5 },
  { durationWeeks: 12, frequencyPerWeek: 10 },
  { durationWeeks: 12, frequencyPerWeek: 15 },
  { durationWeeks: 24, frequencyPerWeek: 20 },
  { durationWeeks: 4, frequencyPerWeek: 21 },
]

/** His Consistent Bedtime ramp, same source. */
const BEDTIME_RAMP: HabitRampStep[] = [
  { durationWeeks: 4, frequencyPerWeek: 4 },
  { durationWeeks: 8, frequencyPerWeek: 6 },
  { durationWeeks: 24, frequencyPerWeek: 7 },
]

/** A driver exactly as the owner's plan holds it. */
function driver(over: { perWeek?: number | null; daysPerWeek?: number; rampSteps?: HabitRampStep[] | null; unit?: string } = {}) {
  const seed = emptyNsPlan()
  const added = addGoal(seed, "lm_relationship", "Approaches", "habit_ramp")
  const goal = added.goals[added.goals.length - 1]
  const plan = updateGoal(added, goal.id, {
    perWeek: over.perWeek ?? null,
    daysPerWeek: over.daysPerWeek ?? 7,
    rampSteps: over.rampSteps ?? null,
    unit: over.unit ?? "/week",
  })
  return { plan, goal: plan.goals[0] }
}

describe("practiceRateInWeek", () => {
  const approaches = { perWeek: null, daysPerWeek: 7, rampSteps: APPROACHES_RAMP }

  it("week one asks for the ramp's first step, not the day count", () => {
    // Was 7 — daysPerWeek used as a number of approaches.
    expect(practiceRateInWeek(approaches, 1)).toBe(5)
  })

  it("holds that step for as long as the step lasts", () => {
    expect(practiceRateInWeek(approaches, 8)).toBe(5)
    expect(practiceRateInWeek(approaches, 9)).toBe(10)
    expect(practiceRateInWeek(approaches, 20)).toBe(10)
    expect(practiceRateInWeek(approaches, 21)).toBe(15)
  })

  it("past the end of the ramp it is what the ramp built up to", () => {
    // 8 + 12 + 12 + 24 + 4 = 60 weeks. Falling back to daysPerWeek here made
    // the schedule read 5, 10, 15, 20, 21 and then 7.
    expect(practiceRateInWeek(approaches, 61)).toBe(21)
    expect(practiceRateInWeek(approaches, 500)).toBe(21)
  })

  it("an explicit rate still wins past the ramp, because somebody said it", () => {
    expect(practiceRateInWeek({ perWeek: 30, daysPerWeek: 7, rampSteps: APPROACHES_RAMP }, 61)).toBe(30)
    // ...but not during it. The ramp is the ease-in to that rate.
    expect(practiceRateInWeek({ perWeek: 30, daysPerWeek: 7, rampSteps: APPROACHES_RAMP }, 1)).toBe(5)
  })

  it("the bedtime ramp starts at four nights, not seven", () => {
    expect(practiceRateInWeek({ perWeek: null, daysPerWeek: 7, rampSteps: BEDTIME_RAMP }, 1)).toBe(4)
    expect(practiceRateInWeek({ perWeek: null, daysPerWeek: 7, rampSteps: BEDTIME_RAMP }, 5)).toBe(6)
  })

  it("with no ramp it is what it always was", () => {
    expect(practiceRateInWeek({ perWeek: 20, daysPerWeek: 4, rampSteps: null }, 1)).toBe(20)
    expect(practiceRateInWeek({ perWeek: null, daysPerWeek: 4, rampSteps: null }, 1)).toBe(4)
    expect(practiceRateInWeek({ perWeek: null, daysPerWeek: 4, rampSteps: [] }, 1)).toBe(4)
  })
})

describe("the goal a ramped practice becomes", () => {
  it("asks for the ramp's first week, not its steady state", () => {
    const { plan, goal } = driver({ rampSteps: APPROACHES_RAMP })
    const insert = goalToInsert(plan, RUN, goal)

    expect(insert.tracking_type).toBe("counter")
    expect(insert.period).toBe("weekly")
    expect(insert.target_value).toBe(5) // was 7
    expect(insert.ramp_steps).toHaveLength(5)
  })

  it("a practice with no ramp is untouched", () => {
    const { plan, goal } = driver({ perWeek: 20, rampSteps: null })
    expect(goalToInsert(plan, RUN, goal).target_value).toBe(20)
  })

  it("never asks for less than one, however the ramp starts", () => {
    const { plan, goal } = driver({ rampSteps: [{ durationWeeks: 4, frequencyPerWeek: 0 }] })
    expect(goalToInsert(plan, RUN, goal).target_value).toBe(1)
  })
})

describe("the week grid and the goal beneath it cannot disagree", () => {
  /**
   * THE CLASS, not the instance. The schedule on the Track step and the counted
   * goal rendered below it are two readings of one question — "how many this
   * week" — and they were computed by two functions 250 lines apart in the same
   * file. One walked the ramp; one did not.
   */
  it("agree in week one, on the owner's own ramp", () => {
    const { plan, goal } = driver({ rampSteps: APPROACHES_RAMP })
    const activity = trackActivities(plan).find((a) => a.id === goal.id)!

    expect(activityPerWeek(activity, 1)).toBe(goalToInsert(plan, RUN, goal).target_value)
  })

  it("agree in week one for every shape of practice", () => {
    const shapes = [
      { rampSteps: APPROACHES_RAMP },
      { rampSteps: BEDTIME_RAMP },
      { perWeek: 20, rampSteps: APPROACHES_RAMP },
      { perWeek: 20, rampSteps: null },
      { perWeek: null, daysPerWeek: 4, rampSteps: null },
    ]

    for (const shape of shapes) {
      const { plan, goal } = driver(shape)
      const activity = trackActivities(plan).find((a) => a.id === goal.id)!
      expect(
        activityPerWeek(activity, 1),
        `week grid and goal disagree for ${JSON.stringify(shape)}`,
      ).toBe(goalToInsert(plan, RUN, goal).target_value)
    }
  })
})
