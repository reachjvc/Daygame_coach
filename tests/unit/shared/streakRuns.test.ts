/**
 * COUNTING A RUN, AND DECIDING WHETHER TO SHOW IT.
 *
 * Two bugs, both live, both caused by one rule written twice:
 *
 *   - the daygame week streak never went down at all, and showed a February
 *     number in August;
 *   - `getConsecutiveTrainingWeeks` went down every Monday morning, because it
 *     started counting at the current week and stopped at the first week with
 *     nothing in it — so ten weeks of training read as 0 until you trained.
 *
 * `streakRun` counts and never hides. `isStreakCurrent` hides and never counts.
 * Both are asserted here against the same fixtures, because the fault was in
 * the seam between them.
 */

import { describe, it, expect } from "vitest"
import { streakRun, weeklyStreakRun } from "@/src/shared/streakRuns"
import { previousPeriodStart, isStreakCurrent } from "@/src/shared/dateUtils"

const prevWeek = (monday: string) => previousPeriodStart("weekly", monday)

/** Four Mondays in a row: 27 July to 17 August 2026. */
const FOUR_IN_A_ROW = ["2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17"]

describe("streakRun", () => {
  it("counts a run of four", () => {
    const { run, longest, last } = weeklyStreakRun(FOUR_IN_A_ROW, prevWeek)
    expect(run).toBe(4)
    expect(longest).toBe(4)
    expect(last).toBe("2026-08-17")
  })

  it("keeps the longest and restarts the current after a gap", () => {
    const { run, longest } = weeklyStreakRun([...FOUR_IN_A_ROW, "2026-09-07"], prevWeek)
    expect(run).toBe(1)
    expect(longest).toBe(4)
  })

  it("does not hide a run that is over — that is not its job", () => {
    // The old health code returned 0 here. This returns 4, and the caller
    // decides whether to draw it.
    expect(weeklyStreakRun(FOUR_IN_A_ROW, prevWeek).run).toBe(4)
  })

  it("is unbothered by duplicates and unsorted input, for weeks", () => {
    const shuffled = ["2026-08-10", "2026-07-27", "2026-08-17", "2026-08-03", "2026-08-10"]
    expect(weeklyStreakRun(shuffled, prevWeek)).toEqual(
      weeklyStreakRun(FOUR_IN_A_ROW, prevWeek)
    )
  })

  it("returns nothing for no periods", () => {
    expect(streakRun([], () => true)).toEqual({ run: 0, longest: 0, last: null })
  })
})

describe("counting and hiding, composed", () => {
  const { run, last } = weeklyStreakRun(FOUR_IN_A_ROW, prevWeek)

  it("shows four on the Monday after, before anything is logged", () => {
    // THE BUG THIS PINS: the health streak read 0 here, every Monday morning,
    // because the week you are still inside had nothing in it yet. That week has
    // not ended, so nothing has been missed.
    expect(isStreakCurrent("weekly", last, "2026-08-24")).toBe(true)
    expect(isStreakCurrent("weekly", last, "2026-08-24") ? run : 0).toBe(4)
  })

  it("still shows four during the week it was last extended", () => {
    expect(isStreakCurrent("weekly", last, "2026-08-17") ? run : 0).toBe(4)
  })

  it("shows nothing once a whole week has passed without training", () => {
    expect(isStreakCurrent("weekly", last, "2026-08-31") ? run : 0).toBe(0)
  })

  it("shows nothing six months later", () => {
    expect(isStreakCurrent("weekly", last, "2027-02-15") ? run : 0).toBe(0)
  })
})
