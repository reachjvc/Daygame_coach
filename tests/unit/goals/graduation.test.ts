import { describe, test, expect } from "vitest"
import {
  detectPhaseTransition,
  checkGraduationRegression,
  isDailyActionable,
  groupSnapshotsIntoWeeks,
  detectAllPhaseTransitions,
} from "@/src/goals/goalsService"
import type { GoalWithProgress, PacingInfo, GoalTemplate } from "@/src/goals/types"
import type { DailyGoalSnapshotRow } from "@/src/db/goalTypes"

// ============================================================================
// Fixtures
// ============================================================================

function createGoal(overrides: Partial<GoalWithProgress> = {}): GoalWithProgress {
  return {
    id: "goal-1",
    user_id: "user-1",
    title: "Approaches",
    category: "daygame",
    tracking_type: "counter",
    period: "weekly",
    target_value: 20,
    current_value: 15,
    period_start_date: "2026-02-01",
    custom_end_date: null,
    current_streak: 4,
    best_streak: 8,
    is_active: true,
    is_archived: false,
    linked_metric: null,
    position: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-02-21T00:00:00Z",
    life_area: "daygame",
    parent_goal_id: null,
    target_date: null,
    description: null,
    goal_type: "habit_ramp",
    goal_nature: "input",
    display_category: "field_work",
    goal_level: 3,
    template_id: "l3_approach_volume",
    milestone_config: null,
    ramp_steps: null,
    motivation_note: null,
    streak_freezes_available: 0,
    streak_freezes_used: 0,
    last_freeze_date: null,
    progress_percentage: 75,
    is_complete: false,
    days_remaining: null,
    goal_phase: "acquisition",
    ...overrides,
  }
}

function createSnapshot(overrides: Partial<DailyGoalSnapshotRow> = {}): DailyGoalSnapshotRow {
  return {
    id: "snap-1",
    user_id: "user-1",
    goal_id: "goal-1",
    snapshot_date: "2026-02-17",
    current_value: 20,
    target_value: 20,
    was_complete: true,
    current_streak: 4,
    best_streak: 8,
    period: "weekly",
    created_at: "2026-02-17T10:00:00Z",
    ...overrides,
  }
}

/** Create a week of snapshots, all complete or all incomplete. */
function createWeek(complete: boolean): DailyGoalSnapshotRow[] {
  return Array.from({ length: 7 }, (_, i) =>
    createSnapshot({
      snapshot_date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      was_complete: complete,
    })
  )
}

/** Create a week with a specific completion rate (0-1). */
function createMixedWeek(completionRate: number): DailyGoalSnapshotRow[] {
  const completeDays = Math.round(7 * completionRate)
  return Array.from({ length: 7 }, (_, i) =>
    createSnapshot({
      snapshot_date: `2026-02-${String(i + 1).padStart(2, "0")}`,
      was_complete: i < completeDays,
    })
  )
}

const templateWithGraduation: GoalTemplate = {
  id: "l3_approach_volume",
  title: "Approach Volume",
  level: 3,
  nature: "input",
  lifeArea: "daygame",
  displayCategory: "field_work",
  templateType: "habit_ramp",
  defaultMilestoneConfig: null,
  defaultRampSteps: null,
  linkedMetric: "approaches",
  priority: "core",
  requiresOptIn: false,
  graduation_criteria: "Consistently averaging 20+ approaches/week for 8+ weeks",
  blindSpotTool: false,
}

const templateWithoutGraduation: GoalTemplate = {
  ...templateWithGraduation,
  graduation_criteria: null,
}

// ============================================================================
// detectPhaseTransition
// ============================================================================

describe("detectPhaseTransition", () => {
  test("acquisition → consolidation after 4 consecutive on-pace weeks", () => {
    const goal = createGoal({ goal_phase: "acquisition" })
    const weeks = [createMixedWeek(0.9), createMixedWeek(0.85), createMixedWeek(1.0), createMixedWeek(0.8)]
    const result = detectPhaseTransition(goal, null, weeks, templateWithGraduation)
    expect(result).toBe("consolidation")
  })

  test("stays in acquisition if fewer than 4 on-pace weeks", () => {
    const goal = createGoal({ goal_phase: "acquisition" })
    const weeks = [createMixedWeek(0.9), createMixedWeek(0.85), createMixedWeek(1.0)]
    const result = detectPhaseTransition(goal, null, weeks, templateWithGraduation)
    expect(result).toBeNull()
  })

  test("stays in acquisition if any week below 80% completion", () => {
    const goal = createGoal({ goal_phase: "acquisition" })
    const weeks = [createMixedWeek(0.9), createMixedWeek(0.7), createMixedWeek(1.0), createMixedWeek(0.9)]
    const result = detectPhaseTransition(goal, null, weeks, templateWithGraduation)
    expect(result).toBeNull()
  })

  test("consolidation → graduated after 8 complete weeks with graduation criteria", () => {
    const goal = createGoal({ goal_phase: "consolidation" })
    const weeks = Array.from({ length: 8 }, () => createWeek(true))
    const result = detectPhaseTransition(goal, null, weeks, templateWithGraduation)
    expect(result).toBe("graduated")
  })

  test("stays in consolidation if no graduation criteria on template", () => {
    const goal = createGoal({ goal_phase: "consolidation" })
    const weeks = Array.from({ length: 8 }, () => createWeek(true))
    const result = detectPhaseTransition(goal, null, weeks, templateWithoutGraduation)
    expect(result).toBeNull()
  })

  test("stays in consolidation if fewer than 8 complete weeks", () => {
    const goal = createGoal({ goal_phase: "consolidation" })
    const weeks = Array.from({ length: 7 }, () => createWeek(true))
    const result = detectPhaseTransition(goal, null, weeks, templateWithGraduation)
    expect(result).toBeNull()
  })

  test("stays in consolidation if any week has incomplete snapshots", () => {
    const goal = createGoal({ goal_phase: "consolidation" })
    const weeks = [
      ...Array.from({ length: 7 }, () => createWeek(true)),
      createMixedWeek(0.8), // not all complete
    ]
    const result = detectPhaseTransition(goal, null, weeks, templateWithGraduation)
    expect(result).toBeNull()
  })

  test("returns null for graduated goals (no further transition)", () => {
    const goal = createGoal({ goal_phase: "graduated" })
    const weeks = Array.from({ length: 8 }, () => createWeek(true))
    const result = detectPhaseTransition(goal, null, weeks, templateWithGraduation)
    expect(result).toBeNull()
  })

  test("treats null goal_phase as acquisition", () => {
    const goal = createGoal({ goal_phase: null })
    const weeks = [createMixedWeek(0.9), createMixedWeek(0.85), createMixedWeek(1.0), createMixedWeek(0.8)]
    const result = detectPhaseTransition(goal, null, weeks, templateWithGraduation)
    expect(result).toBe("consolidation")
  })
})

// ============================================================================
// checkGraduationRegression
// ============================================================================

describe("checkGraduationRegression", () => {
  test("regresses graduated to consolidation after 2 below-pace weeks", () => {
    const goal = createGoal({ goal_phase: "graduated" })
    const weeks = [createMixedWeek(0.3), createMixedWeek(0.4)]
    const result = checkGraduationRegression(goal, weeks)
    expect(result).toBe("consolidation")
  })

  test("does not regress if recent weeks are on pace", () => {
    const goal = createGoal({ goal_phase: "graduated" })
    const weeks = [createMixedWeek(0.3), createMixedWeek(0.8)]
    const result = checkGraduationRegression(goal, weeks)
    expect(result).toBeNull()
  })

  test("does not regress non-graduated goals", () => {
    const goal = createGoal({ goal_phase: "consolidation" })
    const weeks = [createMixedWeek(0.1), createMixedWeek(0.1)]
    const result = checkGraduationRegression(goal, weeks)
    expect(result).toBeNull()
  })

  test("treats empty weeks as below pace", () => {
    const goal = createGoal({ goal_phase: "graduated" })
    const weeks: DailyGoalSnapshotRow[][] = [[], []]
    const result = checkGraduationRegression(goal, weeks)
    expect(result).toBe("consolidation")
  })

  test("requires at least 2 weeks of data", () => {
    const goal = createGoal({ goal_phase: "graduated" })
    const weeks = [createMixedWeek(0.1)]
    const result = checkGraduationRegression(goal, weeks)
    expect(result).toBeNull()
  })
})

// ============================================================================
// isDailyActionable — graduated exclusion
// ============================================================================

describe("isDailyActionable graduated exclusion", () => {
  test("excludes graduated L3 habit_ramp goals", () => {
    const goal = createGoal({ goal_phase: "graduated", goal_type: "habit_ramp", goal_level: 3 })
    expect(isDailyActionable(goal)).toBe(false)
  })

  test("includes acquisition L3 habit_ramp goals", () => {
    const goal = createGoal({ goal_phase: "acquisition", goal_type: "habit_ramp", goal_level: 3 })
    expect(isDailyActionable(goal)).toBe(true)
  })

  test("includes consolidation L3 habit_ramp goals", () => {
    const goal = createGoal({ goal_phase: "consolidation", goal_type: "habit_ramp", goal_level: 3 })
    expect(isDailyActionable(goal)).toBe(true)
  })

  test("includes null phase L3 habit_ramp goals", () => {
    const goal = createGoal({ goal_phase: null, goal_type: "habit_ramp", goal_level: 3 })
    expect(isDailyActionable(goal)).toBe(true)
  })
})

// ============================================================================
// groupSnapshotsIntoWeeks
// ============================================================================

describe("groupSnapshotsIntoWeeks", () => {
  test("groups snapshots by ISO week (Monday start)", () => {
    const snapshots = [
      createSnapshot({ snapshot_date: "2026-02-16" }), // Monday week 1
      createSnapshot({ snapshot_date: "2026-02-17" }), // Tuesday week 1
      createSnapshot({ snapshot_date: "2026-02-23" }), // Monday week 2
    ]
    const weeks = groupSnapshotsIntoWeeks(snapshots)
    expect(weeks).toHaveLength(2)
    expect(weeks[0]).toHaveLength(2)
    expect(weeks[1]).toHaveLength(1)
  })

  test("returns empty array for empty input", () => {
    expect(groupSnapshotsIntoWeeks([])).toEqual([])
  })

  test("sorts weeks oldest first", () => {
    const snapshots = [
      createSnapshot({ snapshot_date: "2026-02-23" }), // week 2
      createSnapshot({ snapshot_date: "2026-02-16" }), // week 1
    ]
    const weeks = groupSnapshotsIntoWeeks(snapshots)
    expect(weeks[0][0].snapshot_date).toBe("2026-02-16")
    expect(weeks[1][0].snapshot_date).toBe("2026-02-23")
  })

  test("handles Sunday correctly (belongs to previous Monday's week)", () => {
    const snapshots = [
      createSnapshot({ snapshot_date: "2026-02-22" }), // Sunday — belongs to Mon Feb 16 week
      createSnapshot({ snapshot_date: "2026-02-23" }), // Monday — new week
    ]
    const weeks = groupSnapshotsIntoWeeks(snapshots)
    expect(weeks).toHaveLength(2)
    expect(weeks[0]).toHaveLength(1) // Sunday in week 1
    expect(weeks[1]).toHaveLength(1) // Monday in week 2
  })
})

// ============================================================================
// detectAllPhaseTransitions
// ============================================================================

describe("detectAllPhaseTransitions", () => {
  test("detects acquisition → consolidation for eligible goal", () => {
    const goal = createGoal({ id: "g1", goal_phase: "acquisition" })
    // 4 weeks of 80%+ completion
    const snapshots: DailyGoalSnapshotRow[] = []
    for (let week = 0; week < 4; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(2026, 0, 5 + week * 7 + day) // Jan 5 = Monday
        snapshots.push(createSnapshot({
          goal_id: "g1",
          snapshot_date: date.toISOString().split("T")[0],
          was_complete: day < 6, // 6/7 = 85%
        }))
      }
    }
    const events = detectAllPhaseTransitions([goal], snapshots)
    expect(events).toHaveLength(1)
    expect(events[0].newPhase).toBe("consolidation")
    expect(events[0].previousPhase).toBe("acquisition")
  })

  test("skips non-habit_ramp goals", () => {
    const goal = createGoal({ id: "g1", goal_type: "milestone", goal_level: 3 })
    const events = detectAllPhaseTransitions([goal], [])
    expect(events).toHaveLength(0)
  })

  test("skips non-L3 goals", () => {
    const goal = createGoal({ id: "g1", goal_type: "habit_ramp", goal_level: 2 })
    const events = detectAllPhaseTransitions([goal], [])
    expect(events).toHaveLength(0)
  })

  test("returns empty when no transitions detected", () => {
    const goal = createGoal({ id: "g1", goal_phase: "acquisition" })
    // Only 1 week of data — not enough for transition
    const snapshots = [
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-16", was_complete: true }),
    ]
    const events = detectAllPhaseTransitions([goal], snapshots)
    expect(events).toHaveLength(0)
  })

  test("detects graduation regression", () => {
    const goal = createGoal({ id: "g1", goal_phase: "graduated" })
    // 2 weeks below pace
    const snapshots: DailyGoalSnapshotRow[] = []
    for (let week = 0; week < 2; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(2026, 0, 5 + week * 7 + day)
        snapshots.push(createSnapshot({
          goal_id: "g1",
          snapshot_date: date.toISOString().split("T")[0],
          was_complete: false, // 0% — below pace
        }))
      }
    }
    const events = detectAllPhaseTransitions([goal], snapshots)
    expect(events).toHaveLength(1)
    expect(events[0].newPhase).toBe("consolidation")
    expect(events[0].previousPhase).toBe("graduated")
  })
})
