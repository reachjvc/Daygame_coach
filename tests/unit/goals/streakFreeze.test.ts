import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { shouldAutoFreeze, getGoalStaleness } from "@/src/goals/goalsService"

// ============================================================================
// shouldAutoFreeze
// ============================================================================

describe("shouldAutoFreeze", () => {
  const baseGoal = {
    current_value: 3,
    target_value: 10,
    current_streak: 5,
    streak_freezes_available: 2,
    last_freeze_date: null as string | null,
  }

  test("returns true when all conditions met", () => {
    expect(shouldAutoFreeze(baseGoal, "2026-02-21")).toBe(true)
  })

  test("returns false when goal is complete (current >= target)", () => {
    const goal = { ...baseGoal, current_value: 10 }
    expect(shouldAutoFreeze(goal, "2026-02-21")).toBe(false)
  })

  test("returns false when goal exceeds target", () => {
    const goal = { ...baseGoal, current_value: 15 }
    expect(shouldAutoFreeze(goal, "2026-02-21")).toBe(false)
  })

  test("returns false when current_streak is 0", () => {
    const goal = { ...baseGoal, current_streak: 0 }
    expect(shouldAutoFreeze(goal, "2026-02-21")).toBe(false)
  })

  test("returns false when no freezes available", () => {
    const goal = { ...baseGoal, streak_freezes_available: 0 }
    expect(shouldAutoFreeze(goal, "2026-02-21")).toBe(false)
  })

  test("returns false when already frozen today", () => {
    const goal = { ...baseGoal, last_freeze_date: "2026-02-21" }
    expect(shouldAutoFreeze(goal, "2026-02-21")).toBe(false)
  })

  test("returns true when last_freeze_date is a different day", () => {
    const goal = { ...baseGoal, last_freeze_date: "2026-02-20" }
    expect(shouldAutoFreeze(goal, "2026-02-21")).toBe(true)
  })

  test("returns false when streak is 0 even with freezes available", () => {
    const goal = { ...baseGoal, current_streak: 0, streak_freezes_available: 3 }
    expect(shouldAutoFreeze(goal, "2026-02-21")).toBe(false)
  })

  test("returns true with exactly 1 freeze remaining", () => {
    const goal = { ...baseGoal, streak_freezes_available: 1 }
    expect(shouldAutoFreeze(goal, "2026-02-21")).toBe(true)
  })

  test("returns true with current_value partially done but not complete", () => {
    const goal = { ...baseGoal, current_value: 9, target_value: 10 }
    expect(shouldAutoFreeze(goal, "2026-02-21")).toBe(true)
  })
})

// ============================================================================
// getGoalStaleness
// ============================================================================

describe("getGoalStaleness", () => {
  test("returns 0 for goal updated today", () => {
    const now = new Date("2026-02-21T15:00:00Z")
    expect(getGoalStaleness("2026-02-21T10:00:00Z", now)).toBe(0)
  })

  test("returns 1 for goal updated yesterday", () => {
    const now = new Date("2026-02-21T12:00:00Z")
    expect(getGoalStaleness("2026-02-20T18:00:00Z", now)).toBe(1)
  })

  test("returns 7 for goal updated a week ago", () => {
    const now = new Date("2026-02-21T12:00:00Z")
    expect(getGoalStaleness("2026-02-14T12:00:00Z", now)).toBe(7)
  })

  test("returns 0 for goal updated minutes ago", () => {
    const now = new Date("2026-02-21T12:30:00Z")
    expect(getGoalStaleness("2026-02-21T12:00:00Z", now)).toBe(0)
  })

  test("returns large number for very old goal", () => {
    const now = new Date("2026-02-21T12:00:00Z")
    expect(getGoalStaleness("2025-02-21T12:00:00Z", now)).toBe(365)
  })
})
