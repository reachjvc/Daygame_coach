import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { computeGoalProgress } from "@/src/db/goalTypes"
import type { UserGoalRow } from "@/src/db/goalTypes"

// ============================================================================
// Test Fixtures
// ============================================================================

function createGoalRow(overrides: Partial<UserGoalRow> = {}): UserGoalRow {
  return {
    id: "goal-1",
    user_id: "user-1",
    title: "Test Goal",
    category: "fitness",
    tracking_type: "counter",
    period: "weekly",
    target_value: 10,
    current_value: 0,
    period_start_date: "2026-02-01",
    custom_end_date: null,
    current_streak: 0,
    best_streak: 0,
    is_active: true,
    is_archived: false,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
    ...overrides,
  }
}

// ============================================================================
// computeGoalProgress - progress_percentage
// ============================================================================

describe("computeGoalProgress", () => {
  describe("progress_percentage", () => {
    test("should return 0% when current_value is 0", () => {
      // Arrange
      const goal = createGoalRow({ current_value: 0, target_value: 10 })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.progress_percentage).toBe(0)
    })

    test("should return 50% when current is half of target", () => {
      // Arrange
      const goal = createGoalRow({ current_value: 5, target_value: 10 })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.progress_percentage).toBe(50)
    })

    test("should return 100% when current equals target", () => {
      // Arrange
      const goal = createGoalRow({ current_value: 10, target_value: 10 })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.progress_percentage).toBe(100)
    })

    test("should cap at 100% when current exceeds target", () => {
      // Arrange
      const goal = createGoalRow({ current_value: 15, target_value: 10 })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.progress_percentage).toBe(100)
    })

    test("should return 0 when target_value is 0", () => {
      // Arrange
      const goal = createGoalRow({ current_value: 5, target_value: 0 })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.progress_percentage).toBe(0)
    })

    test("should round to nearest integer", () => {
      // Arrange
      const goal = createGoalRow({ current_value: 1, target_value: 3 })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.progress_percentage).toBe(33) // 33.33... rounds to 33
    })
  })

  // ============================================================================
  // computeGoalProgress - is_complete
  // ============================================================================

  describe("is_complete", () => {
    test("should return false when current < target", () => {
      // Arrange
      const goal = createGoalRow({ current_value: 5, target_value: 10 })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.is_complete).toBe(false)
    })

    test("should return true when current equals target", () => {
      // Arrange
      const goal = createGoalRow({ current_value: 10, target_value: 10 })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.is_complete).toBe(true)
    })

    test("should return true when current exceeds target", () => {
      // Arrange
      const goal = createGoalRow({ current_value: 15, target_value: 10 })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.is_complete).toBe(true)
    })
  })

  // ============================================================================
  // computeGoalProgress - days_remaining
  // ============================================================================

  describe("days_remaining", () => {
    beforeEach(() => {
      // Mock Date to 2026-02-07
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-02-07T12:00:00Z"))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test("should return null when no custom_end_date", () => {
      // Arrange
      const goal = createGoalRow({ custom_end_date: null })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.days_remaining).toBeNull()
    })

    test("should return positive number for future date", () => {
      // Arrange
      const goal = createGoalRow({ custom_end_date: "2026-02-14" })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.days_remaining).toBe(7)
    })

    test("should return 0 for today", () => {
      // Arrange
      const goal = createGoalRow({ custom_end_date: "2026-02-07" })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.days_remaining).toBe(0)
    })

    test("should return negative for past date", () => {
      // Arrange
      const goal = createGoalRow({ custom_end_date: "2026-02-01" })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.days_remaining).toBe(-6)
    })
  })

  // ============================================================================
  // computeGoalProgress - preserves original data
  // ============================================================================

  describe("data preservation", () => {
    test("should preserve all original goal fields", () => {
      // Arrange
      const goal = createGoalRow({
        id: "custom-id",
        title: "Custom Title",
        category: "eating",
        current_streak: 5,
      })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.id).toBe("custom-id")
      expect(result.title).toBe("Custom Title")
      expect(result.category).toBe("eating")
      expect(result.current_streak).toBe(5)
    })
  })
})
