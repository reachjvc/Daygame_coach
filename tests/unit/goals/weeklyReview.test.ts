import { describe, test, expect } from "vitest"
import { computeWeeklyReviewData } from "@/src/goals/goalsService"
import type { GoalWithProgress } from "@/src/goals/types"
import type { DailyGoalSnapshotRow } from "@/src/db/goalTypes"

// ============================================================================
// Test Fixtures
// ============================================================================

function createGoal(overrides: Partial<GoalWithProgress> = {}): GoalWithProgress {
  return {
    id: "goal-1",
    user_id: "user-1",
    title: "Test Goal",
    category: "fitness",
    tracking_type: "counter",
    period: "daily",
    target_value: 10,
    current_value: 5,
    period_start_date: "2026-02-17",
    custom_end_date: null,
    current_streak: 3,
    best_streak: 5,
    is_active: true,
    is_archived: false,
    linked_metric: null,
    position: 0,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-21T00:00:00Z",
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
    progress_percentage: 50,
    is_complete: false,
    days_remaining: null,
    ...overrides,
  }
}

function createSnapshot(overrides: Partial<DailyGoalSnapshotRow> = {}): DailyGoalSnapshotRow {
  return {
    id: "snap-1",
    user_id: "user-1",
    goal_id: "goal-1",
    snapshot_date: "2026-02-17",
    current_value: 10,
    target_value: 10,
    was_complete: true,
    current_streak: 3,
    best_streak: 5,
    period: "daily",
    created_at: "2026-02-17T10:00:00Z",
    ...overrides,
  }
}

// ============================================================================
// computeWeeklyReviewData
// ============================================================================

describe("computeWeeklyReviewData", () => {
  test("computes basic stats from 7 days of data", () => {
    const goals = [createGoal({ id: "g1", title: "Gym" })]
    const snapshots = [
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-17", was_complete: true }),
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-18", was_complete: true }),
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-19", was_complete: false }),
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-20", was_complete: true }),
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-21", was_complete: false }),
    ]

    const data = computeWeeklyReviewData(snapshots, goals)
    expect(data.goalsTotal).toBe(1)
    expect(data.goalMomentum).toHaveLength(1)
    expect(data.goalMomentum[0].completionRate).toBe(60) // 3/5
  })

  test("identifies best and worst day", () => {
    const goals = [
      createGoal({ id: "g1" }),
      createGoal({ id: "g2" }),
    ]
    const snapshots = [
      // Monday: 2 complete
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-17", was_complete: true }),
      createSnapshot({ goal_id: "g2", snapshot_date: "2026-02-17", was_complete: true }),
      // Tuesday: 0 complete
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-18", was_complete: false }),
      createSnapshot({ goal_id: "g2", snapshot_date: "2026-02-18", was_complete: false }),
    ]

    const data = computeWeeklyReviewData(snapshots, goals)
    expect(data.bestDay).toBe("2026-02-17")
    expect(data.worstDay).toBe("2026-02-18")
  })

  test("handles empty week", () => {
    const goals = [createGoal()]
    const data = computeWeeklyReviewData([], goals)
    expect(data.overallMomentumScore).toBe(0)
    expect(data.bestDay).toBeNull()
    expect(data.worstDay).toBeNull()
    expect(data.goalMomentum).toHaveLength(1)
    expect(data.goalMomentum[0].completionRate).toBe(0)
  })

  test("handles no goals", () => {
    const data = computeWeeklyReviewData([], [])
    expect(data.goalsTotal).toBe(0)
    expect(data.goalsCompleted).toBe(0)
    expect(data.overallMomentumScore).toBe(0)
  })

  test("computes overall momentum as average completion rate", () => {
    const goals = [
      createGoal({ id: "g1" }),
      createGoal({ id: "g2" }),
    ]
    const snapshots = [
      // g1: 100% complete (2/2)
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-17", was_complete: true }),
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-18", was_complete: true }),
      // g2: 0% complete (0/2)
      createSnapshot({ goal_id: "g2", snapshot_date: "2026-02-17", was_complete: false }),
      createSnapshot({ goal_id: "g2", snapshot_date: "2026-02-18", was_complete: false }),
    ]

    const data = computeWeeklyReviewData(snapshots, goals)
    expect(data.overallMomentumScore).toBe(50) // (100 + 0) / 2
  })

  test("includes tier upgrades from parameter", () => {
    const tierUpgrades = [
      { badgeId: "b1", badgeTitle: "Badge 1", previousTier: "none" as const, newTier: "bronze" as const },
    ]
    const data = computeWeeklyReviewData([], [createGoal()], tierUpgrades)
    expect(data.tierUpgrades).toHaveLength(1)
    expect(data.tierUpgrades[0].badgeId).toBe("b1")
  })

  test("determines trend from first half vs second half of snapshots", () => {
    const goals = [createGoal({ id: "g1" })]
    // First half: 0% complete, second half: 100% complete → improving
    const snapshots = [
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-17", was_complete: false }),
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-18", was_complete: false }),
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-19", was_complete: true }),
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-20", was_complete: true }),
    ]

    const data = computeWeeklyReviewData(snapshots, goals)
    expect(data.goalMomentum[0].trend).toBe("improving")
  })

  test("includes goalNature in momentum entries", () => {
    const goals = [
      createGoal({ id: "g1", goal_nature: "input" }),
      createGoal({ id: "g2", goal_nature: "outcome" }),
      createGoal({ id: "g3", goal_nature: null }),
    ]
    const snapshots = [
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-17", was_complete: true }),
      createSnapshot({ goal_id: "g2", snapshot_date: "2026-02-17", was_complete: true }),
      createSnapshot({ goal_id: "g3", snapshot_date: "2026-02-17", was_complete: true }),
    ]

    const data = computeWeeklyReviewData(snapshots, goals)
    expect(data.goalMomentum[0].goalNature).toBe("input")
    expect(data.goalMomentum[1].goalNature).toBe("outcome")
    expect(data.goalMomentum[2].goalNature).toBeNull()
  })

  test("weights input goals higher than outcome goals in momentum score", () => {
    // Two goals: one input at 100%, one outcome at 100%
    // Unweighted: (100 + 100) / 2 = 100
    // Weighted: (100*1.5 + 100*0.5) / (1.5+0.5) = 200/2 = 100
    // Now: one input at 100%, one outcome at 0%
    // Unweighted: (100 + 0) / 2 = 50
    // Weighted: (100*1.5 + 0*0.5) / (1.5+0.5) = 150/2 = 75
    const goals = [
      createGoal({ id: "g1", goal_nature: "input" }),
      createGoal({ id: "g2", goal_nature: "outcome" }),
    ]
    const snapshots = [
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-17", was_complete: true }),
      createSnapshot({ goal_id: "g2", snapshot_date: "2026-02-17", was_complete: false }),
    ]

    const data = computeWeeklyReviewData(snapshots, goals)
    // Input at 100% weighted 1.5, outcome at 0% weighted 0.5
    // (100*1.5 + 0*0.5) / (1.5+0.5) = 150/2 = 75
    expect(data.overallMomentumScore).toBe(75)
  })

  test("weights input goals lower when outcome is completing (reverse)", () => {
    // Input at 0%, outcome at 100%
    // Weighted: (0*1.5 + 100*0.5) / (1.5+0.5) = 50/2 = 25
    const goals = [
      createGoal({ id: "g1", goal_nature: "input" }),
      createGoal({ id: "g2", goal_nature: "outcome" }),
    ]
    const snapshots = [
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-17", was_complete: false }),
      createSnapshot({ goal_id: "g2", snapshot_date: "2026-02-17", was_complete: true }),
    ]

    const data = computeWeeklyReviewData(snapshots, goals)
    // (0*1.5 + 100*0.5) / (1.5+0.5) = 50/2 = 25
    expect(data.overallMomentumScore).toBe(25)
  })

  test("null goal_nature uses weight 1.0", () => {
    // Two goals: one null-nature at 100%, one input at 0%
    // Weighted: (100*1.0 + 0*1.5) / (1.0+1.5) = 100/2.5 = 40
    const goals = [
      createGoal({ id: "g1", goal_nature: null }),
      createGoal({ id: "g2", goal_nature: "input" }),
    ]
    const snapshots = [
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-17", was_complete: true }),
      createSnapshot({ goal_id: "g2", snapshot_date: "2026-02-17", was_complete: false }),
    ]

    const data = computeWeeklyReviewData(snapshots, goals)
    expect(data.overallMomentumScore).toBe(40)
  })

  test("phaseTransitions defaults to empty array", () => {
    const data = computeWeeklyReviewData([], [createGoal()])
    expect(data.phaseTransitions).toEqual([])
  })
})
