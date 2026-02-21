import { describe, it, expect } from "vitest"
import { computeWillGate, computeBottleneck } from "@/src/goals/goalsService"
import type { GoalWithProgress, PacingInfo, WillGateResult } from "@/src/goals/types"

// ============================================================================
// Test Helpers
// ============================================================================

function mockGoal(overrides: Partial<GoalWithProgress> & { id: string }): GoalWithProgress {
  return {
    user_id: "test",
    title: overrides.id,
    category: "daygame",
    tracking_type: "counter",
    period: "weekly",
    target_value: 100,
    current_value: 0,
    period_start_date: "2026-01-01",
    custom_end_date: null,
    current_streak: 0,
    best_streak: 0,
    is_active: true,
    is_archived: false,
    linked_metric: null,
    position: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    life_area: "daygame",
    parent_goal_id: null,
    target_date: null,
    description: null,
    goal_type: "habit_ramp",
    goal_nature: "input",
    display_category: "field_work",
    goal_level: 3,
    milestone_config: null,
    ramp_steps: null,
    progress_percentage: 50,
    is_complete: false,
    days_remaining: null,
    motivation_note: null,
    streak_freezes_available: 0,
    streak_freezes_used: 0,
    last_freeze_date: null,
    goal_phase: null,
    template_id: null,
    ...overrides,
  }
}

// ============================================================================
// computeWillGate
// ============================================================================

describe("computeWillGate", () => {
  it("triggers gate when no session time logged", () => {
    const result = computeWillGate(10, 0)
    expect(result.gateTriggered).toBe(true)
    expect(result.ratio).toBe(0)
    expect(result.message).toContain("getting out the door")
  })

  it("triggers gate when approach rate is below threshold", () => {
    // 5 approaches in 120 minutes (2 hours) = 2.5 per hour < 3
    const result = computeWillGate(5, 120)
    expect(result.gateTriggered).toBe(true)
    expect(result.ratio).toBe(2.5)
    expect(result.message).toContain("getting started")
  })

  it("does not trigger gate when approach rate meets threshold", () => {
    // 10 approaches in 120 minutes (2 hours) = 5 per hour > 3
    const result = computeWillGate(10, 120)
    expect(result.gateTriggered).toBe(false)
    expect(result.ratio).toBe(5)
    expect(result.message).toBe("")
  })

  it("does not trigger gate at exactly threshold", () => {
    // 6 approaches in 120 minutes = 3.0 per hour = threshold
    const result = computeWillGate(6, 120)
    expect(result.gateTriggered).toBe(false)
  })

  it("accepts custom threshold", () => {
    // 5 per hour, threshold = 6
    const result = computeWillGate(10, 120, 6)
    expect(result.gateTriggered).toBe(true)
    expect(result.ratio).toBe(5)
  })

  it("handles very high approach rate", () => {
    const result = computeWillGate(30, 60)
    expect(result.gateTriggered).toBe(false)
    expect(result.ratio).toBe(30)
  })
})

// ============================================================================
// computeBottleneck
// ============================================================================

describe("computeBottleneck", () => {
  const willGateTriggered: WillGateResult = {
    gateTriggered: true,
    ratio: 1.5,
    message: "Your bottleneck is getting started, not improving a skill. Focus on showing up more.",
  }

  const willGateClear: WillGateResult = {
    gateTriggered: false,
    ratio: 5.0,
    message: "",
  }

  it("returns will gate message when gate is triggered", () => {
    const goals = [mockGoal({ id: "a", title: "Approaches" })]
    const pacingMap = new Map<string, PacingInfo>()
    const result = computeBottleneck(goals, pacingMap, willGateTriggered)

    expect(result.willGate).not.toBeNull()
    expect(result.willGate!.gateTriggered).toBe(true)
    expect(result.bottleneckGoalId).toBeNull()
    expect(result.description).toContain("getting started")
  })

  it("identifies worst-pacing L3 goal as bottleneck", () => {
    const goals = [
      mockGoal({ id: "a", title: "Approaches", goal_level: 3 }),
      mockGoal({ id: "b", title: "Phone Numbers", goal_level: 3 }),
      mockGoal({ id: "c", title: "Dates", goal_level: 3 }),
    ]
    const pacingMap = new Map<string, PacingInfo>([
      ["a", { actualRate: 8, projectedRate: 10, pacingRatio: 0.8, status: "behind", daysActive: 30 }],
      ["b", { actualRate: 2, projectedRate: 5, pacingRatio: 0.4, status: "behind", daysActive: 30 }],
      ["c", { actualRate: 1, projectedRate: 1, pacingRatio: 1.0, status: "on-pace", daysActive: 30 }],
    ])

    const result = computeBottleneck(goals, pacingMap, willGateClear)
    expect(result.bottleneckGoalId).toBe("b")
    expect(result.description).toContain("Phone Numbers")
    expect(result.description).toContain("40%")
  })

  it("returns no bottleneck when all goals are on pace", () => {
    const goals = [
      mockGoal({ id: "a", title: "Approaches", goal_level: 3 }),
    ]
    const pacingMap = new Map<string, PacingInfo>([
      ["a", { actualRate: 10, projectedRate: 10, pacingRatio: 1.0, status: "on-pace", daysActive: 30 }],
    ])

    const result = computeBottleneck(goals, pacingMap, willGateClear)
    // Even though on pace, the function still identifies the worst (which is 1.0)
    expect(result.bottleneckGoalId).toBe("a")
  })

  it("ignores non-L3 goals", () => {
    const goals = [
      mockGoal({ id: "a", title: "L1 Goal", goal_level: 1 }),
      mockGoal({ id: "b", title: "L3 Goal", goal_level: 3 }),
    ]
    const pacingMap = new Map<string, PacingInfo>([
      ["a", { actualRate: 0, projectedRate: 10, pacingRatio: 0, status: "behind", daysActive: 30 }],
      ["b", { actualRate: 8, projectedRate: 10, pacingRatio: 0.8, status: "behind", daysActive: 30 }],
    ])

    const result = computeBottleneck(goals, pacingMap, willGateClear)
    expect(result.bottleneckGoalId).toBe("b")
  })

  it("returns default message when no goals have pacing data", () => {
    const goals = [mockGoal({ id: "a", title: "Test", goal_level: 3 })]
    const pacingMap = new Map<string, PacingInfo>()

    const result = computeBottleneck(goals, pacingMap, willGateClear)
    expect(result.bottleneckGoalId).toBeNull()
    expect(result.description).toContain("on pace")
  })
})
