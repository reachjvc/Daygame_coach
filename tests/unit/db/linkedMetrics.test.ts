import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { getMetricValue } from "@/src/db/goalRepo"
import type { UserTrackingStatsRow } from "@/src/db/trackingTypes"
import type { LinkedMetric } from "@/src/db/goalTypes"

// Mock Supabase (required by goalRepo module)
vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}))

// dateUtils is NOT mocked. It is pure period arithmetic, and a partial mock of
// it is how this file broke when the week key changed: the mock supplied two of
// the five functions the code needs and the rest came back undefined. The clock
// is fixed instead, which is the thing that actually varies.

// Mock trackingRepo
vi.mock("@/src/db/trackingRepo", () => ({
  getUserTrackingStats: vi.fn(),
}))

// metricsRepo imports nothing from trackingService any more — weeks are Monday
// dates from shared/dateUtils, which is pure and needs no mock.

// Mock goalsService (shouldAutoFreeze)
vi.mock("@/src/goals/goalsService", () => ({
  shouldAutoFreeze: vi.fn(),
}))

const TZ = "Europe/Copenhagen"

function createStats(overrides: Partial<UserTrackingStatsRow> = {}): UserTrackingStatsRow {
  return {
    user_id: "user-1",
    total_approaches: 100,
    total_sessions: 20,
    total_numbers: 15,
    total_instadates: 5,
    total_field_reports: 12,
    current_streak: 3,
    longest_streak: 10,
    last_approach_date: "2026-02-20",
    // Saturday 21 Feb 2026 is in the week that started Monday the 16th.
    week_start_date: "2026-02-16",
    last_active_week_start: "2026-02-16",
    last_review_week_start: "2026-02-16",
    current_week_sessions: 3,
    current_week_approaches: 25,
    current_week_numbers: 4,
    current_week_instadates: 1,
    current_week_field_reports: 2,
    current_week_streak: 5,
    longest_week_streak: 12,
    unique_locations: ["mall", "park"],
    weekly_reviews_completed: 8,
    current_weekly_streak: 4,
    monthly_review_unlocked: true,
    quarterly_review_unlocked: false,
    favorite_template_ids: [],
    updated_at: "2026-02-20T12:00:00Z",
    ...overrides,
  }
}

// Saturday 21 February 2026, 12:00 UTC.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-02-21T12:00:00Z"))
})
afterEach(() => {
  vi.useRealTimers()
})

describe("getMetricValue", () => {
  describe("weekly metrics (current week)", () => {
    test("field_reports_weekly returns count for current week", () => {
      const stats = createStats({ current_week_field_reports: 3 })
      expect(getMetricValue(stats, "field_reports_weekly", TZ)).toBe(3)
    })

    test("approaches_weekly returns count for current week", () => {
      const stats = createStats({ current_week_approaches: 15 })
      expect(getMetricValue(stats, "approaches_weekly", TZ)).toBe(15)
    })

    test("sessions_weekly returns count for current week", () => {
      const stats = createStats({ current_week_sessions: 4 })
      expect(getMetricValue(stats, "sessions_weekly", TZ)).toBe(4)
    })

    test("numbers_weekly returns count for current week", () => {
      const stats = createStats({ current_week_numbers: 7 })
      expect(getMetricValue(stats, "numbers_weekly", TZ)).toBe(7)
    })

    test("instadates_weekly returns count for current week", () => {
      const stats = createStats({ current_week_instadates: 2 })
      expect(getMetricValue(stats, "instadates_weekly", TZ)).toBe(2)
    })
  })

  describe("weekly metrics (stale week)", () => {
    test("returns 0 when the counter belongs to a week that is over", () => {
      const stats = createStats({ week_start_date: "2026-02-09", current_week_field_reports: 5 })
      expect(getMetricValue(stats, "field_reports_weekly", TZ)).toBe(0)
    })

    test("returns 0 for approaches when the week is stale", () => {
      const stats = createStats({ week_start_date: "2026-02-02", current_week_approaches: 20 })
      expect(getMetricValue(stats, "approaches_weekly", TZ)).toBe(0)
    })

    test("returns 0 when the row has never been stamped with a week", () => {
      const stats = createStats({ week_start_date: null, current_week_approaches: 20 })
      expect(getMetricValue(stats, "approaches_weekly", TZ)).toBe(0)
    })
  })

  describe("cumulative metrics", () => {
    test("field_reports_cumulative returns total count", () => {
      const stats = createStats({ total_field_reports: 42 })
      expect(getMetricValue(stats, "field_reports_cumulative", TZ)).toBe(42)
    })

    test("approaches_cumulative returns total count", () => {
      const stats = createStats({ total_approaches: 500 })
      expect(getMetricValue(stats, "approaches_cumulative", TZ)).toBe(500)
    })

    test("sessions_cumulative returns total count", () => {
      const stats = createStats({ total_sessions: 80 })
      expect(getMetricValue(stats, "sessions_cumulative", TZ)).toBe(80)
    })

    test("numbers_cumulative returns total count", () => {
      const stats = createStats({ total_numbers: 30 })
      expect(getMetricValue(stats, "numbers_cumulative", TZ)).toBe(30)
    })

    test("instadates_cumulative returns total count", () => {
      const stats = createStats({ total_instadates: 10 })
      expect(getMetricValue(stats, "instadates_cumulative", TZ)).toBe(10)
    })
  })

  describe("unknown metric handling", () => {
    test("returns 0 for unknown metric and logs warning", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const stats = createStats()
      const result = getMetricValue(stats, "some_future_metric" as any, TZ)
      expect(result).toBe(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown linked_metric")
      )
      consoleSpy.mockRestore()
    })

    test("approach_quality_avg_weekly returns 0 with warning when called directly", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const stats = createStats()
      const result = getMetricValue(stats, "approach_quality_avg_weekly", TZ)
      expect(result).toBe(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("approach_quality_avg_weekly")
      )
      consoleSpy.mockRestore()
    })

    test("returns 0 for null metric without warning", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const stats = createStats()
      const result = getMetricValue(stats, null, TZ)
      expect(result).toBe(0)
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
