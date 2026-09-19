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
import { climbOf, progressPercent, isGoalComplete } from "@/src/db/goalProgress"

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

describe("progressPercent — descending goals are deliberately left alone", () => {
  /**
   * NOT AN ENDORSEMENT. The arithmetic above already works downwards — 85 on a
   * climb from 90 to 80 is (85-90)/(80-80-10) = 50% — and switching it on is
   * one edit in `goalProgress.ts`. What stops it is DATA: three of the owner's
   * live descending rows carry `current_value = 0`, the column default rather
   * than a measurement, and read downwards that says he is past his target and
   * therefore finished. These tests pin today's reading so that turning the
   * direction on is a deliberate act that makes them fail, not an accident.
   */
  test("a descending row still reads the old way", () => {
    expect(progressPercent(row(96, 85, 96))).toBe(100)
  })

  test("an unmeasured descending row still reads 0% and is not complete", () => {
    // The owner's Body Weight, Body Fat % and Waist Measurement rows, today.
    expect(progressPercent(row(0, 85, 96))).toBe(0)
    expect(isGoalComplete(row(0, 85, 96))).toBe(false)
  })
})

describe("isGoalComplete — unchanged in every direction, on purpose", () => {
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
})
