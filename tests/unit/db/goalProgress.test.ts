/**
 * HOW FAR ALONG A GOAL IS.
 *
 * The defect these pin, found on the owner's real rows on 2026-09-19: progress
 * was `current_value / target_value`, which measures the distance from zero
 * rather than the distance travelled. His "Dates per Month" goal climbs from 1
 * to 6 and read 17% complete before he had been on a single date.
 *
 * Every test below fails if the old formula comes back. The last two are the
 * compatibility floor — a practice and a finish line must read exactly as they
 * did, because this change is meant to move ladders and nothing else.
 */

import { describe, test, expect } from "vitest"
import { climbOf, progressPercent, isGoalComplete, hasMeasurement, rungReached } from "@/src/db/goalProgress"

/** Only the three fields the rule reads. */
function row(current: number, target: number, start?: number) {
  return {
    current_value: current,
    target_value: target,
    milestone_config: start === undefined ? null : { start, target, steps: 4 },
  }
}

describe("climbOf", () => {
  test("a row with no ladder is a climb from zero", () => {
    expect(climbOf(row(2, 3))).toEqual({
      start: 0,
      target: 3,
      current: 2,
      descending: false,
      degenerate: false,
    })
  })

  test("the ladder supplies the start, and target_value supplies the target", () => {
    // The hub's edit form writes target_value and leaves milestone_config
    // alone, so when the two disagree the column that drives completion wins.
    const goal = { current_value: 24, target_value: 30, milestone_config: { start: 22, target: 26 } }
    expect(climbOf(goal).start).toBe(22)
    expect(climbOf(goal).target).toBe(30)
  })

  test("a ladder whose start is above its target is descending", () => {
    expect(climbOf(row(96, 85, 96)).descending).toBe(true)
  })

  test("a non-numeric start is no start at all, not NaN", () => {
    const goal = { current_value: 5, target_value: 10, milestone_config: { start: "22" } }
    expect(climbOf(goal).start).toBe(0)
    expect(progressPercent(goal)).toBe(50)
  })
})

describe("progressPercent — the defect this change exists to fix", () => {
  test("the owner's Dates per Month goal, 1 to 6, reads 0% before anything happens", () => {
    // Was 17%: 1/6. The old formula counted the starting line as progress.
    expect(progressPercent(row(1, 6, 1))).toBe(0)
  })

  test("a bench press from 22 kg to 26 kg reads 0%, not 85%", () => {
    expect(progressPercent(row(22, 26, 22))).toBe(0)
  })

  test("halfway up that climb is 50%", () => {
    expect(progressPercent(row(24, 26, 22))).toBe(50)
  })

  test("reaching the target is 100%", () => {
    expect(progressPercent(row(26, 26, 22))).toBe(100)
  })

  test("going backwards past the start is 0%, never a negative bar", () => {
    // New at both ends: the old formula could not go below zero because it
    // measured from zero. 36 live rows sit below their ladder's start.
    expect(progressPercent(row(20, 26, 22))).toBe(0)
  })

  test("overshooting is still 100%", () => {
    expect(progressPercent(row(30, 26, 22))).toBe(100)
  })

  test("a climb with no distance is reached or it is not", () => {
    expect(progressPercent(row(5, 5, 5))).toBe(100)
    expect(progressPercent(row(4, 5, 5))).toBe(0)
  })

  test("a target of zero has nothing to measure against", () => {
    // The contract `tests/unit/db/goalTypes.test.ts` has asserted for a long
    // time. The first version of this file got it wrong in the other
    // direction and that test caught it.
    expect(progressPercent(row(0, 0))).toBe(0)
    expect(progressPercent(row(5, 0))).toBe(0)
    expect(progressPercent(row(3, -1))).toBe(0)
  })
})

describe("progressPercent — the compatibility floor", () => {
  test("a weekly practice with a target of 3 reads exactly as it did", () => {
    expect(progressPercent(row(0, 3))).toBe(0)
    expect(progressPercent(row(1, 3))).toBe(33)
    expect(progressPercent(row(2, 3))).toBe(67)
    expect(progressPercent(row(3, 3))).toBe(100)
  })

  test("a finish line reads 0 or 100 as it did", () => {
    expect(progressPercent(row(0, 1))).toBe(0)
    expect(progressPercent(row(1, 1))).toBe(100)
  })

  test("a ladder that genuinely starts at zero is unaffected", () => {
    // The owner's Deep Work Hours: 0 to 500.
    expect(progressPercent(row(250, 500, 0))).toBe(50)
  })
})

describe("progressPercent — downwards is the same climb in reverse", () => {
  /**
   * The owner's correction, 2026-09-19: "bring a number down is the reverse of
   * climb to number. It should have the same type of achievements or
   * notifications along the way."
   *
   * 90 kg on a climb from 96 to 85 is (90-96)/(85-96) = 55%, which is the same
   * arithmetic that gives 55% going up. There is no special case.
   */
  test("the owner's Body Weight goal, 96 kg down to 85 kg", () => {
    expect(progressPercent(row(96, 85, 96))).toBe(0)
    expect(progressPercent(row(90, 85, 96))).toBe(55)
    expect(progressPercent(row(85, 85, 96))).toBe(100)
  })

  test("going past the target is still 100%, not more", () => {
    expect(progressPercent(row(84, 85, 96))).toBe(100)
  })

  test("going the wrong way is 0%, never a negative bar", () => {
    expect(progressPercent(row(99, 85, 96))).toBe(0)
  })

  test("a goal aimed AT zero works — twenty a day down to none", () => {
    // target_value 0 is allowed through `hasMeasurement` precisely so this
    // reads correctly; it is the one descending shape where 0 is the answer.
    expect(progressPercent(row(20, 0, 20))).toBe(0)
    expect(progressPercent(row(10, 0, 20))).toBe(50)
    expect(progressPercent(row(0, 0, 20))).toBe(100)
    expect(isGoalComplete(row(0, 0, 20))).toBe(true)
  })
})

describe("a descending row with no measurement is not a finished one", () => {
  /**
   * THE BUG THIS PREVENTS, and it is the reason the direction was not switched
   * on in the same change as the formula. Three of the owner's live rows carry
   * `current_value` 0 with a ladder from 96 to 85. Read as a measurement that
   * says he weighs nothing, which downwards is past the target — so the app
   * would have congratulated him on reaching a goal he has not started.
   */
  test("zero against a positive target is the column default, not a weight", () => {
    expect(hasMeasurement(row(0, 85, 96))).toBe(false)
    expect(progressPercent(row(0, 85, 96))).toBe(0)
    expect(isGoalComplete(row(0, 85, 96))).toBe(false)
    expect(rungReached(row(0, 85, 96), 90)).toBe(false)
  })

  test("a real measurement is read normally", () => {
    expect(hasMeasurement(row(90, 85, 96))).toBe(true)
  })

  test("climbing goals are always measured — zero is a real starting point", () => {
    expect(hasMeasurement(row(0, 500, 0))).toBe(true)
    expect(progressPercent(row(0, 500, 0))).toBe(0)
  })
})

describe("rungReached — the notifications along the way", () => {
  test("climbing, a rung is passed by reaching it", () => {
    expect(rungReached(row(23, 26, 22), 23)).toBe(true)
    expect(rungReached(row(23, 26, 22), 24)).toBe(false)
  })

  test("descending, a rung is passed by dropping below it", () => {
    // Written by hand as `current >= rung` every rung of a descending climb is
    // already "passed" on day one, because the starting weight is above all of
    // them — the owner's notifications arriving all at once, before he starts.
    expect(rungReached(row(96, 85, 96), 93)).toBe(false)
    expect(rungReached(row(93, 85, 96), 93)).toBe(true)
    expect(rungReached(row(88, 85, 96), 93)).toBe(true)
  })
})

describe("isGoalComplete", () => {
  test("reached", () => {
    expect(isGoalComplete(row(3, 3))).toBe(true)
    expect(isGoalComplete(row(4, 3))).toBe(true)
  })

  test("not reached", () => {
    expect(isGoalComplete(row(2, 3))).toBe(false)
  })

  test("a climb is complete at its target even though it began above zero", () => {
    expect(isGoalComplete(row(26, 26, 22))).toBe(true)
    expect(isGoalComplete(row(24, 26, 22))).toBe(false)
  })

  test("downwards, complete means below — 84 kg finishes an 85 kg goal, 96 does not", () => {
    expect(isGoalComplete(row(84, 85, 96))).toBe(true)
    expect(isGoalComplete(row(85, 85, 96))).toBe(true)
    expect(isGoalComplete(row(96, 85, 96))).toBe(false)
  })
})
