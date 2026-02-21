import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { computeGoalProgress } from "@/src/db/goalTypes"
import type { UserGoalRow, DailyGoalSnapshotInsert } from "@/src/db/goalTypes"

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
    linked_metric: null,
    position: 0,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
    life_area: "health_fitness",
    parent_goal_id: null,
    target_date: null,
    description: null,
    goal_type: "recurring",
    goal_nature: null,
    display_category: null,
    goal_level: null,
    template_id: null,
    milestone_config: null,
    ramp_steps: null,
    motivation_note: null,
    streak_freezes_available: 0,
    streak_freezes_used: 0,
    last_freeze_date: null,
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

    test("should return null when no custom_end_date or target_date", () => {
      // Arrange
      const goal = createGoalRow({ custom_end_date: null, target_date: null })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.days_remaining).toBeNull()
    })

    test("should use target_date when both target_date and custom_end_date are set", () => {
      // Arrange - target_date takes precedence
      const goal = createGoalRow({
        target_date: "2026-02-14",
        custom_end_date: "2026-02-21",
      })

      // Act
      const result = computeGoalProgress(goal)

      // Assert - should use target_date (7 days), not custom_end_date (14 days)
      expect(result.days_remaining).toBe(7)
    })

    test("should fall back to custom_end_date when no target_date", () => {
      // Arrange
      const goal = createGoalRow({
        target_date: null,
        custom_end_date: "2026-02-14",
      })

      // Act
      const result = computeGoalProgress(goal)

      // Assert
      expect(result.days_remaining).toBe(7)
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

// ============================================================================
// DailyGoalSnapshotInsert — type construction
// ============================================================================

describe("DailyGoalSnapshotInsert", () => {
  test("constructs snapshot from goal pre-reset state", () => {
    const goal = createGoalRow({
      id: "goal-42",
      current_value: 8,
      target_value: 10,
      current_streak: 3,
      best_streak: 7,
      period: "daily",
    })

    const snapshot: DailyGoalSnapshotInsert = {
      user_id: goal.user_id,
      goal_id: goal.id,
      snapshot_date: "2026-02-21",
      current_value: goal.current_value,
      target_value: goal.target_value,
      was_complete: goal.current_value >= goal.target_value,
      current_streak: goal.current_streak,
      best_streak: goal.best_streak,
      period: goal.period,
    }

    expect(snapshot.was_complete).toBe(false)
    expect(snapshot.current_value).toBe(8)
    expect(snapshot.current_streak).toBe(3)
  })

  test("marks was_complete true when goal met target", () => {
    const goal = createGoalRow({
      current_value: 10,
      target_value: 10,
      current_streak: 5,
    })

    const snapshot: DailyGoalSnapshotInsert = {
      user_id: goal.user_id,
      goal_id: goal.id,
      snapshot_date: "2026-02-21",
      current_value: goal.current_value,
      target_value: goal.target_value,
      was_complete: goal.current_value >= goal.target_value,
      current_streak: goal.current_streak,
      best_streak: goal.best_streak,
      period: goal.period,
    }

    expect(snapshot.was_complete).toBe(true)
  })

  test("marks was_complete true when goal exceeds target", () => {
    const goal = createGoalRow({
      current_value: 15,
      target_value: 10,
    })

    const snapshot: DailyGoalSnapshotInsert = {
      user_id: goal.user_id,
      goal_id: goal.id,
      snapshot_date: "2026-02-21",
      current_value: goal.current_value,
      target_value: goal.target_value,
      was_complete: goal.current_value >= goal.target_value,
      current_streak: goal.current_streak,
      best_streak: goal.best_streak,
      period: goal.period,
    }

    expect(snapshot.was_complete).toBe(true)
  })
})
