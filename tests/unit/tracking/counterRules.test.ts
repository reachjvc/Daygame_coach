/**
 * THE RULES A WEEKLY COUNTER OBEYS.
 *
 * These replace `trackingRepoHelpers.test.ts`, which spent 35 tests on the ISO
 * week-label arithmetic that has been deleted — the labels were derived from the
 * server clock and could give two different weeks the same name (see
 * `periodEquivalence.test.ts`). What survives is the part that is still a rule:
 * what makes a week active, and what the streak does when one qualifies.
 */

import { describe, it, expect } from "vitest"
import {
  isWeekActive,
  streakOnQualify,
  zeroedWeeklyCounters,
  WEEKLY_COUNTER_COLUMNS,
} from "@/src/tracking/counterRules"
import { previousPeriodStart } from "@/src/shared/dateUtils"

describe("isWeekActive", () => {
  it("counts 2+ sessions", () => {
    expect(isWeekActive(2, 0)).toBe(true)
    expect(isWeekActive(10, 0)).toBe(true)
  })

  it("counts 5+ approaches", () => {
    expect(isWeekActive(0, 5)).toBe(true)
    expect(isWeekActive(1, 5)).toBe(true)
  })

  it("does not count a week below both thresholds", () => {
    expect(isWeekActive(0, 0)).toBe(false)
    expect(isWeekActive(1, 0)).toBe(false)
    expect(isWeekActive(0, 4)).toBe(false)
    // THE WEEK THAT SHIPPED THE BUG: user edec2d78's week 07 had exactly one
    // session and one approach and was counted as active, because the approach
    // counter still held the PREVIOUS week's 15.
    expect(isWeekActive(1, 1)).toBe(false)
  })
})

describe("zeroedWeeklyCounters", () => {
  it("zeroes every weekly counter, not a subset", () => {
    // The original bug was a reset block that zeroed four of five columns. One
    // list, one place — and this asserts the list is complete.
    expect(Object.keys(zeroedWeeklyCounters()).sort()).toEqual([...WEEKLY_COUNTER_COLUMNS].sort())
    expect(Object.values(zeroedWeeklyCounters())).toEqual([0, 0, 0, 0, 0])
  })

  it("covers sessions, approaches, numbers, instadates and field reports", () => {
    expect([...WEEKLY_COUNTER_COLUMNS]).toEqual([
      "current_week_sessions",
      "current_week_approaches",
      "current_week_numbers",
      "current_week_instadates",
      "current_week_field_reports",
    ])
  })
})

describe("streakOnQualify", () => {
  const thisWeek = "2026-08-24"
  const lastWeek = "2026-08-17"

  it("extends a streak from the week immediately before", () => {
    expect(
      streakOnQualify({
        currentWeekStart: thisWeek,
        previousWeekStart: lastWeek,
        lastActiveStart: lastWeek,
        currentStreak: 3,
      })
    ).toEqual({ streak: 4, lastActiveStart: thisWeek })
  })

  it("restarts at 1 after a gap", () => {
    expect(
      streakOnQualify({
        currentWeekStart: thisWeek,
        previousWeekStart: lastWeek,
        lastActiveStart: "2026-08-03",
        currentStreak: 9,
      })
    ).toEqual({ streak: 1, lastActiveStart: thisWeek })
  })

  it("restarts at 1 when there has never been an active week", () => {
    expect(
      streakOnQualify({
        currentWeekStart: thisWeek,
        previousWeekStart: lastWeek,
        lastActiveStart: null,
        currentStreak: 0,
      })
    ).toEqual({ streak: 1, lastActiveStart: thisWeek })
  })

  it("is idempotent — a second qualifying session this week changes nothing", () => {
    const once = streakOnQualify({
      currentWeekStart: thisWeek,
      previousWeekStart: lastWeek,
      lastActiveStart: lastWeek,
      currentStreak: 3,
    })
    const twice = streakOnQualify({
      currentWeekStart: thisWeek,
      previousWeekStart: lastWeek,
      lastActiveStart: once.lastActiveStart,
      currentStreak: once.streak,
    })
    expect(twice).toEqual(once)
  })

  it("does not resurrect a six-month-old streak", () => {
    // The live row: streak 4, last active 2026-02-16, returning in week 35.
    expect(
      streakOnQualify({
        currentWeekStart: thisWeek,
        previousWeekStart: lastWeek,
        lastActiveStart: "2026-02-16",
        currentStreak: 4,
      })
    ).toEqual({ streak: 1, lastActiveStart: thisWeek })
  })
})

describe("replaying a real account", () => {
  /**
   * User edec2d78's weeks, counted from their own sessions and approaches in
   * Europe/Copenhagen. The row said streak 4, best 4. Two of those four weeks
   * had one session and one approach.
   */
  const weeks: Array<[string, { sessions: number; approaches: number }]> = [
    ["2026-01-26", { sessions: 10, approaches: 15 }],
    ["2026-02-02", { sessions: 5, approaches: 15 }],
    ["2026-02-09", { sessions: 1, approaches: 1 }],
    ["2026-02-16", { sessions: 1, approaches: 1 }],
    ["2026-08-17", { sessions: 1, approaches: 1 }],
  ]

  it("gives a streak of 2, not 4", () => {
    let streak = 0
    let best = 0
    let lastActive: string | null = null

    for (const [week, counts] of weeks) {
      if (!isWeekActive(counts.sessions, counts.approaches)) continue
      const next = streakOnQualify({
        currentWeekStart: week,
        previousWeekStart: previousPeriodStart("weekly", week),
        lastActiveStart: lastActive,
        currentStreak: streak,
      })
      streak = next.streak
      lastActive = next.lastActiveStart
      best = Math.max(best, streak)
    }

    expect({ streak, best, lastActive }).toEqual({
      streak: 2,
      best: 2,
      lastActive: "2026-02-02",
    })
  })
})
