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
 *
 * Since Phase 7 of Plans/life-plan-rebuild.md there is no counted goal: the
 * Track step's copies in `user_goals` and `goalToInsert` are gone, so the
 * checks that compared the grid with that goal went with them. The rate the
 * grid and Today read is what stays, and is what this file checks.
 */

import { describe, it, expect } from "vitest"
import { isEveryDay, practiceRateInWeek } from "@/src/goals/northStarTrackService"
import type { HabitRampStep } from "@/src/goals/types"

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

describe("a practice that is simply every day", () => {
  /**
   * The owner's concept item 13: "gør altid X", the mirror of item 14's "never
   * do Y". Seven occasions a week IS every day, and the two are not the same
   * promise once written down: as a weekly counter with a target of seven you
   * can log all seven on Sunday evening and the week reads complete, while the
   * point of "read every night" is that Wednesday had its own answer.
   */
  it("only when it counts occasions, never when it counts things", () => {
    // "Twenty approaches a week" is a weekly total; seven of those is not a
    // daily yes/no. Nor is a ramped goal, whose rate changes week by week.
    expect(isEveryDay({ perWeek: 20, daysPerWeek: 7, rampSteps: null } as never)).toBe(false)
    expect(isEveryDay({ perWeek: null, daysPerWeek: 7, rampSteps: APPROACHES_RAMP } as never)).toBe(false)
    expect(isEveryDay({ perWeek: null, daysPerWeek: 4, rampSteps: null } as never)).toBe(false)
    expect(isEveryDay({ perWeek: null, daysPerWeek: 7, rampSteps: null } as never)).toBe(true)
  })
})
