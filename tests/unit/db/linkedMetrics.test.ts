import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { getMetricValue } from "@/src/db/goalRepo"
import type { UserTrackingStatsRow } from "@/src/db/trackingTypes"
import type { LinkedMetric } from "@/src/db/goalTypes"

// Mock Supabase (required by goalRepo module)
vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}))

// Mock dateUtils
vi.mock("@/src/shared/dateUtils", () => ({
  getTodayInTimezone: () => "2026-02-21",
  getNowInTimezone: () => new Date("2026-02-21T12:00:00Z"),
}))

// Mock trackingRepo
vi.mock("@/src/db/trackingRepo", () => ({
  getUserTrackingStats: vi.fn(),
}))

// Mock trackingService (getISOWeekString)
vi.mock("@/src/tracking/trackingService", () => ({
  getISOWeekString: () => "2026-W08",
}))

// Mock goalsService (shouldAutoFreeze)
vi.mock("@/src/goals/goalsService", () => ({
  shouldAutoFreeze: vi.fn(),
}))

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
    current_week: "2026-W08",
    current_week_sessions: 3,
    current_week_approaches: 25,
    current_week_numbers: 4,
    current_week_instadates: 1,
    current_week_field_reports: 2,
    current_week_streak: 5,
    longest_week_streak: 12,
    last_active_week: "2026-W08",
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

describe("getMetricValue", () => {
  describe("weekly metrics (current week)", () => {
    test("field_reports_weekly returns count for current week", () => {
      const stats = createStats({ current_week_field_reports: 3 })
      expect(getMetricValue(stats, "field_reports_weekly")).toBe(3)
    })

    test("approaches_weekly returns count for current week", () => {
      const stats = createStats({ current_week_approaches: 15 })
      expect(getMetricValue(stats, "approaches_weekly")).toBe(15)
    })

    test("sessions_weekly returns count for current week", () => {
      const stats = createStats({ current_week_sessions: 4 })
      expect(getMetricValue(stats, "sessions_weekly")).toBe(4)
    })

    test("numbers_weekly returns count for current week", () => {
      const stats = createStats({ current_week_numbers: 7 })
      expect(getMetricValue(stats, "numbers_weekly")).toBe(7)
    })

    test("instadates_weekly returns count for current week", () => {
      const stats = createStats({ current_week_instadates: 2 })
      expect(getMetricValue(stats, "instadates_weekly")).toBe(2)
    })
  })

  describe("weekly metrics (stale week)", () => {
    test("returns 0 when current_week does not match", () => {
      const stats = createStats({ current_week: "2026-W07", current_week_field_reports: 5 })
      expect(getMetricValue(stats, "field_reports_weekly")).toBe(0)
    })

    test("returns 0 for approaches when week is stale", () => {
      const stats = createStats({ current_week: "2026-W06", current_week_approaches: 20 })
      expect(getMetricValue(stats, "approaches_weekly")).toBe(0)
    })
  })

  describe("cumulative metrics", () => {
    test("field_reports_cumulative returns total count", () => {
      const stats = createStats({ total_field_reports: 42 })
      expect(getMetricValue(stats, "field_reports_cumulative")).toBe(42)
    })

    test("approaches_cumulative returns total count", () => {
      const stats = createStats({ total_approaches: 500 })
      expect(getMetricValue(stats, "approaches_cumulative")).toBe(500)
    })

    test("sessions_cumulative returns total count", () => {
      const stats = createStats({ total_sessions: 80 })
      expect(getMetricValue(stats, "sessions_cumulative")).toBe(80)
    })

    test("numbers_cumulative returns total count", () => {
      const stats = createStats({ total_numbers: 30 })
      expect(getMetricValue(stats, "numbers_cumulative")).toBe(30)
    })

    test("instadates_cumulative returns total count", () => {
      const stats = createStats({ total_instadates: 10 })
      expect(getMetricValue(stats, "instadates_cumulative")).toBe(10)
    })
  })

  describe("null/unknown metric", () => {
    test("returns 0 for null metric", () => {
      const stats = createStats()
      expect(getMetricValue(stats, null)).toBe(0)
    })
  })
})
