/**
 * A STREAK THAT IS OVER READS AS ZERO.
 *
 * The bug this pins: the Week Streak tile on /dashboard/tracking showed "4 week
 * streak" for six months of total inactivity. `getMetricValue` returned
 * `stats.current_week_streak` raw, and nothing anywhere decayed it — the number
 * and the week it was earned in are two facts stored apart, and nothing forced
 * them to be read together.
 *
 * The fixture below is the real production row (user edec2d78) that was
 * showing 4: streak 4, last active week 2026-W08, read in week 35.
 */

import { describe, it, expect } from "vitest"
import { isStreakCurrent, previousPeriodStart, periodStartFor } from "@/src/shared/dateUtils"
import { getMetricValue, gateStreaks } from "@/src/db/metricsRepo"
import type { UserTrackingStatsRow } from "@/src/db/trackingTypes"

function statsRow(overrides: Partial<UserTrackingStatsRow> = {}): UserTrackingStatsRow {
  return {
    user_id: "user-1",
    total_approaches: 31, total_sessions: 21, total_numbers: 0,
    total_instadates: 0, total_field_reports: 10,
    current_streak: 1, longest_streak: 3, last_approach_date: "2026-08-19",
    current_week: "2026-W34", current_week_sessions: 1, current_week_approaches: 1,
    current_week_numbers: 0, current_week_instadates: 0, current_week_field_reports: 0,
    current_week_streak: 4, longest_week_streak: 4,
    // Monday 16 February — the row that showed "4 week streak" every day from
    // February to August.
    last_active_week_start: "2026-02-16",
    week_start_date: "2026-08-17", last_review_week_start: null,
    unique_locations: [],
    weekly_reviews_completed: 0, current_weekly_streak: 0,
    monthly_review_unlocked: false, quarterly_review_unlocked: false,
    favorite_template_ids: [], updated_at: "2026-08-19T00:00:00Z",
    ...overrides,
  }
}

describe("isStreakCurrent", () => {
  // 2026-08-24 is a Monday; 2026-08-17 and 2026-08-10 are the two before it.
  it("counts a streak earned this week", () => {
    expect(isStreakCurrent("weekly", "2026-08-24", "2026-08-24")).toBe(true)
  })

  it("counts a streak earned last week — this week is not over yet", () => {
    expect(isStreakCurrent("weekly", "2026-08-17", "2026-08-24")).toBe(true)
  })

  it("drops a streak whose last active week was two weeks ago", () => {
    expect(isStreakCurrent("weekly", "2026-08-10", "2026-08-24")).toBe(false)
  })

  it("drops the six-month-old streak that shipped", () => {
    expect(isStreakCurrent("weekly", "2026-02-16", "2026-08-24")).toBe(false)
  })

  it("never counts a streak with no recorded period", () => {
    expect(isStreakCurrent("weekly", null, "2026-08-24")).toBe(false)
  })

  it("counts yesterday but not the day before, for days", () => {
    expect(isStreakCurrent("daily", "2026-08-27", "2026-08-27")).toBe(true)
    expect(isStreakCurrent("daily", "2026-08-26", "2026-08-27")).toBe(true)
    expect(isStreakCurrent("daily", "2026-08-25", "2026-08-27")).toBe(false)
  })
})

describe("previousPeriodStart", () => {
  it("crosses a year boundary without a special case", () => {
    expect(previousPeriodStart("weekly", "2026-01-05")).toBe("2025-12-29")
    expect(previousPeriodStart("daily", "2026-01-01")).toBe("2025-12-31")
    expect(previousPeriodStart("monthly", "2026-01-01")).toBe("2025-12-01")
    expect(previousPeriodStart("quarterly", "2026-01-01")).toBe("2025-10-01")
    expect(previousPeriodStart("yearly", "2026-01-01")).toBe("2025-01-01")
  })

  it("always lands on a period boundary", () => {
    expect(previousPeriodStart("quarterly", "2026-07-01")).toBe("2026-04-01")
    expect(previousPeriodStart("monthly", "2026-03-01")).toBe("2026-02-01")
  })

  it("survives a DST transition — Europe/Copenhagen springs forward 2026-03-29", () => {
    // The Monday after the change, back one week, must be the Monday before it.
    expect(previousPeriodStart("weekly", "2026-03-30")).toBe("2026-03-23")
  })
})

describe("periodStartFor quarterly", () => {
  it("starts a quarter on the first of its first month", () => {
    expect(periodStartFor("quarterly", new Date(2026, 0, 15))).toBe("2026-01-01")
    expect(periodStartFor("quarterly", new Date(2026, 4, 31))).toBe("2026-04-01")
    expect(periodStartFor("quarterly", new Date(2026, 8, 1))).toBe("2026-07-01")
    expect(periodStartFor("quarterly", new Date(2026, 11, 31))).toBe("2026-10-01")
  })
})

describe("the tile, on the row that shipped the bug", () => {
  it("shows 0, not 4", () => {
    expect(getMetricValue(statsRow(), "week_streak", "Europe/Copenhagen")).toBe(0)
  })

  it("still shows the record", () => {
    expect(getMetricValue(statsRow(), "best_week_streak", "Europe/Copenhagen")).toBe(4)
  })

  it("shows 0 for a day streak whose last approach was a week ago", () => {
    expect(getMetricValue(statsRow(), "day_streak", "Europe/Copenhagen")).toBe(0)
  })

  it("keeps a live streak alive", () => {
    const live = statsRow({ last_active_week_start: "2026-08-24", current_week_streak: 3 })
    const gated = gateStreaks(live, "Europe/Copenhagen")
    // Only true while the clock says week 35 or 36; assert against the same
    // question the code asks rather than against a hardcoded today.
    const thisWeek = periodStartFor("weekly", new Date())
    expect(gated.current_week_streak).toBe(
      isStreakCurrent("weekly", "2026-08-24", thisWeek) ? 3 : 0
    )
  })

  it("never lowers a record", () => {
    expect(gateStreaks(statsRow(), "Europe/Copenhagen").longest_week_streak).toBe(4)
    expect(gateStreaks(statsRow(), "Europe/Copenhagen").longest_streak).toBe(3)
  })

  it("shows no review streak when no review was ever submitted", () => {
    const row = statsRow({ current_weekly_streak: 5, weekly_reviews_completed: 0 })
    expect(getMetricValue(row, "weekly_review_streak", "Europe/Copenhagen")).toBe(0)
  })
})
