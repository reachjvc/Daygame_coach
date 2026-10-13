import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import {
  groupGoalsByLifeArea,
  computeLifeAreaProgress,
  deriveTimeHorizon,
  isDailyActionable,
  isDailyMilestone,
  getMilestoneLadderValues,
  getInputMode,
  getButtonIncrements,
  getCelebrationTier,
  deriveChildLevel,
  getNextMilestoneInfo,
  formatStreakLabel,
  computeProjectedDate,
  generateDirtyDogInserts,
  getTimeOfDayBracket,
  isAlmostComplete,
  computePacing,
  buildMilestoneCelebrationData,
  computeMultiPeriodStats,
  getOrphanedGoalIds,
} from "@/src/goals/goalsService"
import type { GoalWithProgress, BadgeStatus } from "@/src/goals/types"
import type { DailyGoalSnapshotRow } from "@/src/db/goalTypes"

// ============================================================================
// Test Fixtures
// ============================================================================

function createGoalWithProgress(overrides: Partial<GoalWithProgress> = {}): GoalWithProgress {
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
    aligned_values: [],
    is_abstinence: false,
    stages: null,
    progress_percentage: 0,
    is_complete: false,
    days_remaining: null,
    ...overrides,
    /* `Partial<GoalWithProgress>` widens every optional-looking field to
       `| undefined`, and `goal_phase` is nullable rather than optional, so the
       spread alone does not type-check. Normalised here rather than baselined. */
    goal_phase: overrides.goal_phase ?? null,
  }
}

// ============================================================================
// groupGoalsByLifeArea
// ============================================================================

describe("groupGoalsByLifeArea", () => {
  test("should return empty object for empty array", () => {
    const result = groupGoalsByLifeArea([])
    expect(result).toEqual({})
  })

  test("should group goals by their life_area", () => {
    const goals = [
      createGoalWithProgress({ id: "g1", life_area: "health_fitness" }),
      createGoalWithProgress({ id: "g2", life_area: "personal_growth" }),
      createGoalWithProgress({ id: "g3", life_area: "health_fitness" }),
    ]

    const result = groupGoalsByLifeArea(goals)

    expect(Object.keys(result)).toHaveLength(2)
    expect(result["health_fitness"]).toHaveLength(2)
    expect(result["personal_growth"]).toHaveLength(1)
    expect(result["health_fitness"][0].id).toBe("g1")
    expect(result["health_fitness"][1].id).toBe("g3")
  })

  test("should handle single life area", () => {
    const goals = [
      createGoalWithProgress({ id: "g1", life_area: "daygame" }),
      createGoalWithProgress({ id: "g2", life_area: "daygame" }),
    ]

    const result = groupGoalsByLifeArea(goals)

    expect(Object.keys(result)).toHaveLength(1)
    expect(result["daygame"]).toHaveLength(2)
  })

  test("should use 'custom' for goals with empty life_area", () => {
    const goals = [createGoalWithProgress({ id: "g1", life_area: "" })]

    const result = groupGoalsByLifeArea(goals)

    expect(Object.keys(result)).toEqual(["custom"])
    expect(result["custom"]).toHaveLength(1)
  })
})

// ============================================================================
// computeLifeAreaProgress
// ============================================================================

describe("computeLifeAreaProgress", () => {
  test("should return empty array for empty input", () => {
    const result = computeLifeAreaProgress([])
    expect(result).toEqual([])
  })

  test("should compute correct averages and completed counts", () => {
    const goals = [
      createGoalWithProgress({
        id: "g1",
        life_area: "health_fitness",
        progress_percentage: 80,
        is_complete: false,
      }),
      createGoalWithProgress({
        id: "g2",
        life_area: "health_fitness",
        progress_percentage: 100,
        is_complete: true,
      }),
      createGoalWithProgress({
        id: "g3",
        life_area: "personal_growth",
        progress_percentage: 50,
        is_complete: false,
      }),
    ]

    const result = computeLifeAreaProgress(goals)

    const health = result.find((r) => r.lifeArea === "health_fitness")
    const growth = result.find((r) => r.lifeArea === "personal_growth")

    expect(health).toBeDefined()
    expect(health!.completed).toBe(1)
    expect(health!.total).toBe(2)
    expect(health!.avgProgress).toBe(90) // (80 + 100) / 2 = 90

    expect(growth).toBeDefined()
    expect(growth!.completed).toBe(0)
    expect(growth!.total).toBe(1)
    expect(growth!.avgProgress).toBe(50)
  })

  test("should round avgProgress to nearest integer", () => {
    const goals = [
      createGoalWithProgress({
        id: "g1",
        life_area: "daygame",
        progress_percentage: 33,
        is_complete: false,
      }),
      createGoalWithProgress({
        id: "g2",
        life_area: "daygame",
        progress_percentage: 34,
        is_complete: false,
      }),
    ]

    const result = computeLifeAreaProgress(goals)

    expect(result).toHaveLength(1)
    // (33 + 34) / 2 = 33.5 rounds to 34
    expect(result[0].avgProgress).toBe(34)
  })

  test("should handle all goals complete in a life area", () => {
    const goals = [
      createGoalWithProgress({
        id: "g1",
        life_area: "career_business",
        progress_percentage: 100,
        is_complete: true,
      }),
      createGoalWithProgress({
        id: "g2",
        life_area: "career_business",
        progress_percentage: 100,
        is_complete: true,
      }),
    ]

    const result = computeLifeAreaProgress(goals)

    expect(result).toHaveLength(1)
    expect(result[0].completed).toBe(2)
    expect(result[0].total).toBe(2)
    expect(result[0].avgProgress).toBe(100)
  })
})

// ============================================================================
// deriveTimeHorizon
// ============================================================================

describe("deriveTimeHorizon", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Fix time to 2026-02-07 (a Saturday), month index 1, Q1
    vi.setSystemTime(new Date("2026-02-07T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- Milestone goals: derive from target_date ---

  describe("milestone goals (target_date)", () => {
    test("should return 'Life' for target_date >5 years in future", () => {
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: "2035-06-01",
      })
      expect(deriveTimeHorizon(goal)).toBe("Life")
    })

    test("should return 'Multi-Year' for target_date in a future year (within 5 years)", () => {
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: "2027-03-01",
      })
      expect(deriveTimeHorizon(goal)).toBe("Multi-Year")
    })

    test("should return 'This Quarter' for target_date in later quarter this year", () => {
      // Current: Feb 2026 (Q1). Target: April 2026 (Q2)
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: "2026-04-15",
      })
      expect(deriveTimeHorizon(goal)).toBe("This Quarter")
    })

    test("should return 'This Month' for target_date in later month same quarter", () => {
      // Current: Feb 2026 (Q1). Target: March 2026 (still Q1 but later month)
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: "2026-03-15",
      })
      expect(deriveTimeHorizon(goal)).toBe("This Month")
    })

    test("should return 'This Month' for target_date same month but >7 days away", () => {
      // Current: Feb 7. Target: Feb 20 (13 days away)
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: "2026-02-20",
      })
      expect(deriveTimeHorizon(goal)).toBe("This Month")
    })

    test("should return 'This Week' for target_date same month within 7 days", () => {
      // Current: Feb 7. Target: Feb 12 (5 days away)
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: "2026-02-12",
      })
      expect(deriveTimeHorizon(goal)).toBe("This Week")
    })

    test("should return 'Today' for target_date on current day", () => {
      // Current: Feb 7. Target: Feb 7 (0 days)
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: "2026-02-07",
      })
      expect(deriveTimeHorizon(goal)).toBe("Today")
    })

    test("should return 'Custom' for milestone with past target_date (different month)", () => {
      // Current: Feb 7. Target: Jan 15 (past month)
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: "2026-01-15",
      })
      expect(deriveTimeHorizon(goal)).toBe("Custom")
    })

    test("should return Long-term for milestone without target_date", () => {
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: null,
        period: "custom",
      })
      expect(deriveTimeHorizon(goal)).toBe("Long-term")
    })

    test("should return Long-term for milestone without target_date regardless of period", () => {
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: null,
        period: "weekly",
      })
      expect(deriveTimeHorizon(goal)).toBe("Long-term")
    })
  })

  // --- Recurring goals: derive from period ---

  describe("recurring goals (period)", () => {
    test("should return 'Custom' for custom period", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "custom" })
      expect(deriveTimeHorizon(goal)).toBe("Custom")
    })
  })

  // ============================================================================
  // isDailyActionable
  // ============================================================================

  describe("isDailyActionable", () => {
    test("returns true for L3 habit_ramp goal", () => {
      const goal = createGoalWithProgress({ goal_level: 3, goal_type: "habit_ramp", period: "weekly" })
      expect(isDailyActionable(goal)).toBe(true)
    })

    test("returns true for L3 recurring weekly goal", () => {
      const goal = createGoalWithProgress({ goal_level: 3, goal_type: "recurring", period: "weekly" })
      expect(isDailyActionable(goal)).toBe(true)
    })

    test("returns false for L3 milestone goal", () => {
      const goal = createGoalWithProgress({ goal_level: 3, goal_type: "milestone" })
      expect(isDailyActionable(goal)).toBe(false)
    })

    test("returns false for L1 goal", () => {
      const goal = createGoalWithProgress({ goal_level: 1, goal_type: "milestone" })
      expect(isDailyActionable(goal)).toBe(false)
    })

    test("returns false for L2 goal", () => {
      const goal = createGoalWithProgress({ goal_level: 2, goal_type: "milestone" })
      expect(isDailyActionable(goal)).toBe(false)
    })

    test("returns true for null goal_level with recurring type (standalone custom goal)", () => {
      const goal = createGoalWithProgress({ goal_level: null, goal_type: "recurring" })
      expect(isDailyActionable(goal)).toBe(true)
    })

    test("returns true for null goal_level with habit_ramp type", () => {
      const goal = createGoalWithProgress({ goal_level: null, goal_type: "habit_ramp" })
      expect(isDailyActionable(goal)).toBe(true)
    })

    test("returns false for null goal_level with milestone type", () => {
      const goal = createGoalWithProgress({ goal_level: null, goal_type: "milestone" })
      expect(isDailyActionable(goal)).toBe(false)
    })
  })

  // ============================================================================
  // isDailyMilestone
  // ============================================================================

  describe("isDailyMilestone", () => {
    test("returns true for L3 milestone goal", () => {
      const goal = createGoalWithProgress({ goal_level: 3, goal_type: "milestone", is_archived: false })
      expect(isDailyMilestone(goal)).toBe(true)
    })

    test("returns true for null goal_level milestone goal", () => {
      const goal = createGoalWithProgress({ goal_level: null, goal_type: "milestone", is_archived: false })
      expect(isDailyMilestone(goal)).toBe(true)
    })

    test("returns false for archived milestone goal", () => {
      const goal = createGoalWithProgress({ goal_level: 3, goal_type: "milestone", is_archived: true })
      expect(isDailyMilestone(goal)).toBe(false)
    })

    test("returns false for L3 recurring goal", () => {
      const goal = createGoalWithProgress({ goal_level: 3, goal_type: "recurring" })
      expect(isDailyMilestone(goal)).toBe(false)
    })

    test("returns false for L1 milestone goal", () => {
      const goal = createGoalWithProgress({ goal_level: 1, goal_type: "milestone" })
      expect(isDailyMilestone(goal)).toBe(false)
    })
  })

  // ============================================================================
  // getInputMode
  // ============================================================================

  describe("getInputMode", () => {
    test("should return 'boolean' for boolean tracking type", () => {
      const goal = createGoalWithProgress({ tracking_type: "boolean", target_value: 1 })
      expect(getInputMode(goal)).toBe("boolean")
    })

    test("should return 'buttons' for counter with low target", () => {
      const goal = createGoalWithProgress({ tracking_type: "counter", target_value: 10 })
      expect(getInputMode(goal)).toBe("buttons")
    })

    test("should return 'buttons' for counter at boundary (50)", () => {
      const goal = createGoalWithProgress({ tracking_type: "counter", target_value: 50 })
      expect(getInputMode(goal)).toBe("buttons")
    })

    test("should return 'direct-entry' for counter with high target (51+)", () => {
      const goal = createGoalWithProgress({ tracking_type: "counter", target_value: 51 })
      expect(getInputMode(goal)).toBe("direct-entry")
    })
  })

  // ============================================================================
  // getButtonIncrements
  // ============================================================================

  describe("getButtonIncrements", () => {
    test("should return [1] for target <= 5", () => {
      expect(getButtonIncrements(1)).toEqual([1])
      expect(getButtonIncrements(5)).toEqual([1])
    })

    test("should return [1, 5] for target 6-20", () => {
      expect(getButtonIncrements(6)).toEqual([1, 5])
      expect(getButtonIncrements(10)).toEqual([1, 5])
      expect(getButtonIncrements(20)).toEqual([1, 5])
    })

    test("should return [1, 5, 10] for target > 20", () => {
      expect(getButtonIncrements(21)).toEqual([1, 5, 10])
      expect(getButtonIncrements(50)).toEqual([1, 5, 10])
    })
  })

  // ============================================================================
  // getCelebrationTier
  // ============================================================================

  describe("getCelebrationTier", () => {
    test("custom period → toast", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "custom" })
      expect(getCelebrationTier(goal)).toBe("toast")
    })
  })

  // ===========================================================================
  // deriveChildLevel
  // ===========================================================================

  describe("deriveChildLevel", () => {
    test("null parent level → null", () => {
      expect(deriveChildLevel(null)).toBeNull()
    })

    test("L2 → L3", () => {
      expect(deriveChildLevel(2)).toBe(3)
    })

    test("L3 → L3 (capped)", () => {
      expect(deriveChildLevel(3)).toBe(3)
    })
  })

  // ===========================================================================
  // getNextMilestoneInfo
  // ===========================================================================

  describe("getNextMilestoneInfo", () => {
    test("returns null when goal has no milestone_config", () => {
      const goal = createGoalWithProgress({ milestone_config: null, current_value: 5 })
      expect(getNextMilestoneInfo(goal)).toBeNull()
    })

    test("returns next milestone and remaining for goal with config", () => {
      const goal = createGoalWithProgress({
        current_value: 3,
        milestone_config: { start: 1, target: 100, steps: 5, curveTension: 2 },
      })
      const result = getNextMilestoneInfo(goal)
      expect(result).not.toBeNull()
      expect(result!.nextValue).toBeGreaterThan(3)
      expect(result!.remaining).toBe(result!.nextValue - 3)
    })

    test("returns null when goal has surpassed all milestones", () => {
      const goal = createGoalWithProgress({
        current_value: 100,
        milestone_config: { start: 1, target: 100, steps: 5, curveTension: 2 },
      })
      expect(getNextMilestoneInfo(goal)).toBeNull()
    })
  })

  // ===========================================================================
  // formatStreakLabel
  // ===========================================================================

  describe("formatStreakLabel", () => {
    test("returns empty string for 0 weeks", () => {
      expect(formatStreakLabel(0)).toBe("")
    })

    test("returns empty string for negative weeks", () => {
      expect(formatStreakLabel(-1)).toBe("")
    })

    test("returns formatted label for positive weeks", () => {
      expect(formatStreakLabel(8)).toBe("Week 8 streak")
    })
  })

  // ===========================================================================
  // computeProjectedDate
  // ===========================================================================

  describe("computeProjectedDate", () => {
    test("returns null when goal has no milestone_config", () => {
      const goal = createGoalWithProgress({
        milestone_config: null,
        ramp_steps: [{ frequencyPerWeek: 10, durationWeeks: 12 }],
      })
      expect(computeProjectedDate(goal)).toBeNull()
    })

    test("returns null when goal has no ramp_steps", () => {
      const goal = createGoalWithProgress({
        milestone_config: { start: 1, target: 100, steps: 5, curveTension: 2 },
        ramp_steps: null,
      })
      expect(computeProjectedDate(goal)).toBeNull()
    })

    test("returns null when ramp_steps is empty array", () => {
      const goal = createGoalWithProgress({
        milestone_config: { start: 1, target: 100, steps: 5, curveTension: 2 },
        ramp_steps: [],
      })
      expect(computeProjectedDate(goal)).toBeNull()
    })

    test("returns projections when goal has both config and ramp_steps", () => {
      const goal = createGoalWithProgress({
        current_value: 3,
        period_start_date: "2026-01-01",
        milestone_config: { start: 1, target: 100, steps: 5, curveTension: 2 },
        ramp_steps: [
          { frequencyPerWeek: 10, durationWeeks: 4 },
          { frequencyPerWeek: 15, durationWeeks: 8 },
        ],
      })
      const result = computeProjectedDate(goal)
      expect(result).not.toBeNull()
      expect(result!.nextLabel).toBeTruthy()
      expect(result!.nextLabel).toMatch(/\d+ by \w+ \d{4}/)
      expect(result!.finalLabel).toBeTruthy()
      expect(result!.finalLabel).toMatch(/100 by \w+ \d{4}/)
    })

    test("returns null nextLabel when goal has surpassed all milestones", () => {
      const goal = createGoalWithProgress({
        current_value: 100,
        period_start_date: "2026-01-01",
        milestone_config: { start: 1, target: 100, steps: 5, curveTension: 2 },
        ramp_steps: [{ frequencyPerWeek: 10, durationWeeks: 12 }],
      })
      const result = computeProjectedDate(goal)
      expect(result).not.toBeNull()
      expect(result!.nextLabel).toBeNull()
      expect(result!.finalLabel).toBeTruthy()
    })
  })

  // ============================================================================
  // generateDirtyDogInserts
  // ============================================================================

  describe("generateDirtyDogInserts", () => {
    test("returns all dirty dog goals when none exist and L2 parent present", () => {
      const goals = [
        createGoalWithProgress({ id: "l2-1", goal_level: 2, template_id: "l2_master_daygame" }),
        createGoalWithProgress({ id: "l3-1", goal_level: 3, template_id: "l3_approach_volume" }),
      ]
      const inserts = generateDirtyDogInserts(goals)
      expect(inserts.length).toBe(4)
      const templateIds = inserts.map((i) => i.template_id)
      expect(templateIds).toContain("l3_kiss_closes")
      expect(templateIds).toContain("l3_pull_attempts")
      expect(templateIds).toContain("l3_lays")
      expect(templateIds).toContain("l3_same_day_lays")
    })

    test("all inserts have _tempId starting with __temp_", () => {
      const goals = [
        createGoalWithProgress({ id: "l2-1", goal_level: 2, template_id: "l2_master_daygame" }),
      ]
      const inserts = generateDirtyDogInserts(goals)
      for (const insert of inserts) {
        expect(insert._tempId).toBeDefined()
        expect(insert._tempId).toMatch(/^__temp_/)
      }
    })

    test("all inserts have _tempParentId null (real parent_goal_id used instead)", () => {
      const goals = [
        createGoalWithProgress({ id: "l2-1", goal_level: 2, template_id: "l2_master_daygame" }),
      ]
      const inserts = generateDirtyDogInserts(goals)
      for (const insert of inserts) {
        expect(insert._tempParentId).toBeNull()
        expect(insert.parent_goal_id).toBe("l2-1")
      }
    })

    test("returns empty when no L2 parent exists", () => {
      const goals = [
        createGoalWithProgress({ id: "l3-1", goal_level: 3, template_id: "l3_approach_volume" }),
      ]
      expect(generateDirtyDogInserts(goals)).toEqual([])
    })

    test("skips dirty dog goals that already exist", () => {
      const goals = [
        createGoalWithProgress({ id: "l2-1", goal_level: 2, template_id: "l2_master_daygame" }),
        createGoalWithProgress({ id: "dd-1", goal_level: 3, template_id: "l3_lays" }),
        createGoalWithProgress({ id: "dd-2", goal_level: 3, template_id: "l3_kiss_closes" }),
        createGoalWithProgress({ id: "dd-3", goal_level: 3, template_id: "l3_pull_attempts" }),
        createGoalWithProgress({ id: "dd-4", goal_level: 3, template_id: "l3_same_day_lays" }),
      ]
      const inserts = generateDirtyDogInserts(goals)
      expect(inserts.length).toBe(0)
    })
  })
})

// ============================================================================
// Time-of-Day Helpers (Phase 6.5)
// ============================================================================

describe("getTimeOfDayBracket", () => {
  test("returns morning for hours 5-11", () => {
    expect(getTimeOfDayBracket(5)).toBe("morning")
    expect(getTimeOfDayBracket(8)).toBe("morning")
    expect(getTimeOfDayBracket(11)).toBe("morning")
  })

  test("returns afternoon for hours 12-16", () => {
    expect(getTimeOfDayBracket(12)).toBe("afternoon")
    expect(getTimeOfDayBracket(14)).toBe("afternoon")
    expect(getTimeOfDayBracket(16)).toBe("afternoon")
  })

  test("returns evening for hours 17-20", () => {
    expect(getTimeOfDayBracket(17)).toBe("evening")
    expect(getTimeOfDayBracket(19)).toBe("evening")
    expect(getTimeOfDayBracket(20)).toBe("evening")
  })

  test("returns night for hours 21-4", () => {
    expect(getTimeOfDayBracket(21)).toBe("night")
    expect(getTimeOfDayBracket(23)).toBe("night")
    expect(getTimeOfDayBracket(0)).toBe("night")
    expect(getTimeOfDayBracket(3)).toBe("night")
    expect(getTimeOfDayBracket(4)).toBe("night")
  })
})

describe("isAlmostComplete", () => {
  test("returns true when progress is at threshold", () => {
    const goal = createGoalWithProgress({ current_value: 8, target_value: 10 })
    expect(isAlmostComplete(goal)).toBe(true)
  })

  test("returns true when progress is above threshold but not complete", () => {
    const goal = createGoalWithProgress({ current_value: 9, target_value: 10 })
    expect(isAlmostComplete(goal)).toBe(true)
  })

  test("returns false when goal is complete", () => {
    const goal = createGoalWithProgress({ current_value: 10, target_value: 10 })
    expect(isAlmostComplete(goal)).toBe(false)
  })

  test("returns false when progress is below threshold", () => {
    const goal = createGoalWithProgress({ current_value: 7, target_value: 10 })
    expect(isAlmostComplete(goal)).toBe(false)
  })

  test("returns false when target_value is 0", () => {
    const goal = createGoalWithProgress({ current_value: 5, target_value: 0 })
    expect(isAlmostComplete(goal)).toBe(false)
  })

  test("respects custom threshold", () => {
    const goal = createGoalWithProgress({ current_value: 7, target_value: 10 })
    expect(isAlmostComplete(goal, 0.7)).toBe(true)
    expect(isAlmostComplete(goal, 0.8)).toBe(false)
  })
})

// ============================================================================
// Projection Pacing (Phase 6.7)
// ============================================================================

describe("computePacing", () => {
  const rampSteps = [
    { frequencyPerWeek: 5, durationWeeks: 4 },
    { frequencyPerWeek: 10, durationWeeks: 4 },
    { frequencyPerWeek: 15, durationWeeks: 4 },
  ] as unknown as Record<string, unknown>[]

  test("returns null for non-habit_ramp goals", () => {
    const goal = createGoalWithProgress({ goal_type: "recurring", ramp_steps: rampSteps })
    expect(computePacing(goal)).toBeNull()
  })

  test("returns null when no ramp_steps", () => {
    const goal = createGoalWithProgress({ goal_type: "habit_ramp", ramp_steps: null })
    expect(computePacing(goal)).toBeNull()
  })

  test("returns null for empty ramp_steps array", () => {
    const goal = createGoalWithProgress({ goal_type: "habit_ramp", ramp_steps: [] })
    expect(computePacing(goal)).toBeNull()
  })

  test("behind: actual rate below 85% of projected", () => {
    const now = new Date("2026-02-21T12:00:00Z")
    const goal = createGoalWithProgress({
      goal_type: "habit_ramp",
      ramp_steps: rampSteps,
      current_value: 5,
      period_start_date: "2026-02-01", // ~20 days = ~2.86 weeks
      created_at: "2026-02-01T00:00:00Z",
    })
    const pacing = computePacing(goal, now)
    expect(pacing).not.toBeNull()
    expect(pacing!.projectedRate).toBe(5) // still in step 1
    expect(pacing!.status).toBe("behind") // 5/2.86 ≈ 1.75, ratio ≈ 0.35
  })

  test("on-pace: actual rate within 85-115% of projected", () => {
    const now = new Date("2026-02-21T12:00:00Z")
    const goal = createGoalWithProgress({
      goal_type: "habit_ramp",
      ramp_steps: rampSteps,
      current_value: 14, // 14 / 2.86 weeks ≈ 4.9 per week, projected 5 → ratio ≈ 0.98
      period_start_date: "2026-02-01",
      created_at: "2026-02-01T00:00:00Z",
    })
    const pacing = computePacing(goal, now)
    expect(pacing).not.toBeNull()
    expect(pacing!.status).toBe("on-pace")
  })

  test("ahead: actual rate above 115% of projected", () => {
    const now = new Date("2026-02-21T12:00:00Z")
    const goal = createGoalWithProgress({
      goal_type: "habit_ramp",
      ramp_steps: rampSteps,
      current_value: 25, // 25 / 2.86 ≈ 8.75, projected 5 → ratio ≈ 1.75
      period_start_date: "2026-02-01",
      created_at: "2026-02-01T00:00:00Z",
    })
    const pacing = computePacing(goal, now)
    expect(pacing).not.toBeNull()
    expect(pacing!.status).toBe("ahead")
  })

  test("uses correct ramp step based on weeks elapsed", () => {
    // 35 days = 5 weeks → into step 2 (after 4 weeks of step 1)
    const now = new Date("2026-03-08T12:00:00Z")
    const goal = createGoalWithProgress({
      goal_type: "habit_ramp",
      ramp_steps: rampSteps,
      current_value: 50,
      period_start_date: "2026-02-01",
      created_at: "2026-02-01T00:00:00Z",
    })
    const pacing = computePacing(goal, now)
    expect(pacing).not.toBeNull()
    expect(pacing!.projectedRate).toBe(10) // step 2
  })

  test("falls back to created_at when no period_start_date", () => {
    const now = new Date("2026-02-15T12:00:00Z")
    const goal = createGoalWithProgress({
      goal_type: "habit_ramp",
      ramp_steps: rampSteps,
      current_value: 10,
      period_start_date: "",
      created_at: "2026-02-01T00:00:00Z",
    })
    const pacing = computePacing(goal, now)
    expect(pacing).not.toBeNull()
    expect(pacing!.daysActive).toBe(14)
  })
})

// ============================================================================
// Milestone Celebration Data (Phase 6.3)
// ============================================================================

describe("buildMilestoneCelebrationData", () => {
  const milestoneConfig = {
    start: 1,
    target: 100,
    steps: 5,
    curveTension: 0.5,
  } as unknown as Record<string, unknown>

  test("returns null when no milestone_config", () => {
    const goal = createGoalWithProgress({ milestone_config: null })
    expect(buildMilestoneCelebrationData(goal)).toBeNull()
  })

  test("returns null when current_value is below first milestone", () => {
    const goal = createGoalWithProgress({
      milestone_config: milestoneConfig,
      current_value: 0,
    })
    expect(buildMilestoneCelebrationData(goal)).toBeNull()
  })

  test("returns celebration data for mid-ladder milestone", () => {
    const goal = createGoalWithProgress({
      milestone_config: milestoneConfig,
      current_value: 50,
      target_value: 100,
    })
    const data = buildMilestoneCelebrationData(goal)
    expect(data).not.toBeNull()
    expect(data!.currentValue).toBe(50)
    expect(data!.totalMilestones).toBe(5)
    expect(data!.milestoneNumber).toBeGreaterThan(0)
    expect(data!.ladderPosition).toBeGreaterThan(0)
    expect(data!.ladderPosition).toBeLessThanOrEqual(100)
  })

  test("returns 100% ladder position for final milestone", () => {
    const goal = createGoalWithProgress({
      milestone_config: milestoneConfig,
      current_value: 100,
      target_value: 100,
    })
    const data = buildMilestoneCelebrationData(goal)
    expect(data).not.toBeNull()
    expect(data!.milestoneNumber).toBe(data!.totalMilestones)
    expect(data!.ladderPosition).toBe(100)
  })

  test("includes badge tier upgrade when provided", () => {
    const goal = createGoalWithProgress({
      milestone_config: milestoneConfig,
      current_value: 50,
    })
    const prevBadges: BadgeStatus[] = [
      { badgeId: "b1", title: "Badge 1", progress: 20, tier: "none", unlocked: false },
    ]
    const currBadges: BadgeStatus[] = [
      { badgeId: "b1", title: "Badge 1", progress: 30, tier: "bronze", unlocked: true },
    ]
    const data = buildMilestoneCelebrationData(goal, prevBadges, currBadges)
    expect(data).not.toBeNull()
    expect(data!.badgeTierUpgrade).not.toBeNull()
    expect(data!.badgeTierUpgrade!.newTier).toBe("bronze")
  })

  test("returns null badgeTierUpgrade when no upgrades", () => {
    const goal = createGoalWithProgress({
      milestone_config: milestoneConfig,
      current_value: 50,
    })
    const prevBadges: BadgeStatus[] = [
      { badgeId: "b1", title: "Badge 1", progress: 30, tier: "bronze", unlocked: true },
    ]
    const data = buildMilestoneCelebrationData(goal, prevBadges, prevBadges)
    expect(data).not.toBeNull()
    expect(data!.badgeTierUpgrade).toBeNull()
  })

  test("projectedNext is null without ramp_steps", () => {
    const goal = createGoalWithProgress({
      milestone_config: milestoneConfig,
      current_value: 50,
      ramp_steps: null,
    })
    const data = buildMilestoneCelebrationData(goal)
    expect(data).not.toBeNull()
    expect(data!.projectedNext).toBeNull()
  })
})

// ============================================================================
// computeMultiPeriodStats
// ============================================================================

describe("computeMultiPeriodStats", () => {
  // Fixed reference date: Wednesday 2026-03-18
  // Week starts Monday 2026-03-16
  // Month starts 2026-03-01
  // Year starts 2026-01-01
  const NOW = new Date("2026-03-18T12:00:00Z")

  function makeSnap(overrides: Partial<DailyGoalSnapshotRow> = {}): DailyGoalSnapshotRow {
    return {
      id: "snap-1",
      user_id: "user-1",
      goal_id: "protein",
      snapshot_date: "2026-03-17",
      current_value: 155,
      target_value: 150,
      was_complete: true,
      current_streak: 3,
      best_streak: 10,
      period: "daily",
      created_at: "2026-03-17T08:00:00Z",
      ...overrides,
    }
  }

  // --- Type A: Daily recurring goal — completion rates across periods ---

  test("daily goal: counts completions for week/month/year", () => {
    const goal = createGoalWithProgress({
      id: "protein",
      title: "Eat 150g protein daily",
      period: "daily",
      goal_type: "recurring",
      target_value: 150,
      current_value: 120,
    })

    // Simulate 2 months of daily snapshots
    const snapshots: DailyGoalSnapshotRow[] = [
      // January (outside current month, but in current year)
      makeSnap({ snapshot_date: "2026-01-15", was_complete: true }),
      makeSnap({ snapshot_date: "2026-01-16", was_complete: false }),
      makeSnap({ snapshot_date: "2026-01-17", was_complete: true }),
      // February
      makeSnap({ snapshot_date: "2026-02-10", was_complete: true }),
      makeSnap({ snapshot_date: "2026-02-11", was_complete: true }),
      makeSnap({ snapshot_date: "2026-02-12", was_complete: false }),
      // March (current month) — before this week
      makeSnap({ snapshot_date: "2026-03-02", was_complete: true }),
      makeSnap({ snapshot_date: "2026-03-03", was_complete: false }),
      makeSnap({ snapshot_date: "2026-03-10", was_complete: true }),
      makeSnap({ snapshot_date: "2026-03-11", was_complete: true }),
      makeSnap({ snapshot_date: "2026-03-12", was_complete: false }),
      makeSnap({ snapshot_date: "2026-03-13", was_complete: true }),
      // This week (Mon 2026-03-16 — Wed 2026-03-18)
      makeSnap({ snapshot_date: "2026-03-16", was_complete: true }),
      makeSnap({ snapshot_date: "2026-03-17", was_complete: false }),
    ]

    const stats = computeMultiPeriodStats(goal, snapshots, NOW)

    // This week: Mon+Tue = 2 snapshots, 1 complete
    expect(stats.weekCompleted).toBe(1)
    expect(stats.weekTotal).toBe(2)

    // This month (March): 8 snapshots, 5 complete
    expect(stats.monthCompleted).toBe(5)
    expect(stats.monthTotal).toBe(8)

    // This year: all 14 snapshots, 9 complete
    expect(stats.yearCompleted).toBe(9)
    expect(stats.yearTotal).toBe(14)

    // Not a milestone — no deltas
    expect(stats.monthDelta).toBeNull()
    expect(stats.yearDelta).toBeNull()
  })

  // --- Type B: Weekly goal — completion rates at week granularity ---

  test("weekly goal: counts weekly completions for month/year", () => {
    const goal = createGoalWithProgress({
      id: "gym",
      title: "Go to gym 4x/week",
      period: "weekly",
      goal_type: "recurring",
      target_value: 4,
      current_value: 2,
    })

    // Weekly snapshots (one per Monday reset)
    const snapshots: DailyGoalSnapshotRow[] = [
      // January
      makeSnap({ goal_id: "gym", snapshot_date: "2026-01-05", was_complete: true, period: "weekly" }),
      makeSnap({ goal_id: "gym", snapshot_date: "2026-01-12", was_complete: false, period: "weekly" }),
      makeSnap({ goal_id: "gym", snapshot_date: "2026-01-19", was_complete: true, period: "weekly" }),
      makeSnap({ goal_id: "gym", snapshot_date: "2026-01-26", was_complete: true, period: "weekly" }),
      // February
      makeSnap({ goal_id: "gym", snapshot_date: "2026-02-02", was_complete: true, period: "weekly" }),
      makeSnap({ goal_id: "gym", snapshot_date: "2026-02-09", was_complete: false, period: "weekly" }),
      makeSnap({ goal_id: "gym", snapshot_date: "2026-02-16", was_complete: true, period: "weekly" }),
      makeSnap({ goal_id: "gym", snapshot_date: "2026-02-23", was_complete: true, period: "weekly" }),
      // March (current month)
      makeSnap({ goal_id: "gym", snapshot_date: "2026-03-02", was_complete: true, period: "weekly" }),
      makeSnap({ goal_id: "gym", snapshot_date: "2026-03-09", was_complete: false, period: "weekly" }),
      makeSnap({ goal_id: "gym", snapshot_date: "2026-03-16", was_complete: true, period: "weekly" }),
    ]

    const stats = computeMultiPeriodStats(goal, snapshots, NOW)

    // This week: 1 snapshot (Mon 3/16), 1 complete
    expect(stats.weekCompleted).toBe(1)
    expect(stats.weekTotal).toBe(1)

    // This month: 3 snapshots (3/2, 3/9, 3/16), 2 complete
    expect(stats.monthCompleted).toBe(2)
    expect(stats.monthTotal).toBe(3)

    // This year: 11 snapshots, 8 complete (Jan: 3, Feb: 3, Mar: 2)
    expect(stats.yearCompleted).toBe(8)
    expect(stats.yearTotal).toBe(11)
  })

  // --- Type E: Habit ramp — was_complete uses ramp-appropriate target ---

  test("habit ramp: completion respects per-snapshot target (ramp-aware)", () => {
    const goal = createGoalWithProgress({
      id: "approach-freq",
      title: "Approach Frequency",
      period: "weekly",
      goal_type: "habit_ramp",
      target_value: 15, // current ramp step target
      current_value: 12,
      ramp_steps: [
        { durationWeeks: 4, frequencyPerWeek: 5 },
        { durationWeeks: 4, frequencyPerWeek: 10 },
        { durationWeeks: 8, frequencyPerWeek: 15 },
      ] as unknown as Record<string, unknown>[],
    })

    // Snapshots with DIFFERENT target_values reflecting ramp progression
    const snapshots: DailyGoalSnapshotRow[] = [
      // Ramp step 1 (target 5): hit 6 → complete
      makeSnap({ goal_id: "approach-freq", snapshot_date: "2026-01-05", target_value: 5, current_value: 6, was_complete: true, period: "weekly" }),
      makeSnap({ goal_id: "approach-freq", snapshot_date: "2026-01-12", target_value: 5, current_value: 4, was_complete: false, period: "weekly" }),
      // Ramp step 2 (target 10): hit 11 → complete
      makeSnap({ goal_id: "approach-freq", snapshot_date: "2026-02-02", target_value: 10, current_value: 11, was_complete: true, period: "weekly" }),
      makeSnap({ goal_id: "approach-freq", snapshot_date: "2026-02-09", target_value: 10, current_value: 8, was_complete: false, period: "weekly" }),
      // Ramp step 3 (target 15): in March
      makeSnap({ goal_id: "approach-freq", snapshot_date: "2026-03-02", target_value: 15, current_value: 16, was_complete: true, period: "weekly" }),
      makeSnap({ goal_id: "approach-freq", snapshot_date: "2026-03-09", target_value: 15, current_value: 10, was_complete: false, period: "weekly" }),
      makeSnap({ goal_id: "approach-freq", snapshot_date: "2026-03-16", target_value: 15, current_value: 18, was_complete: true, period: "weekly" }),
    ]

    const stats = computeMultiPeriodStats(goal, snapshots, NOW)

    // Year: 7 total, 4 complete (6>=5, 11>=10, 16>=15, 18>=15)
    // was_complete already accounts for the correct ramp target at each snapshot
    expect(stats.yearCompleted).toBe(4)
    expect(stats.yearTotal).toBe(7)

    // Month: 3 total (3/2, 3/9, 3/16), 2 complete
    expect(stats.monthCompleted).toBe(2)
    expect(stats.monthTotal).toBe(3)
  })

  // --- Type D: Cumulative milestone with delta ---

  test("cumulative milestone: computes month and year deltas", () => {
    const goal = createGoalWithProgress({
      id: "approach-vol",
      title: "Approach Volume",
      goal_type: "milestone",
      period: "weekly",
      target_value: 1000,
      current_value: 450, // current cumulative total
    })

    // Snapshots capture cumulative value at each weekly reset
    const snapshots: DailyGoalSnapshotRow[] = [
      // December last year (baseline for yearly delta)
      makeSnap({ goal_id: "approach-vol", snapshot_date: "2025-12-29", current_value: 100, was_complete: false, period: "weekly" }),
      // January
      makeSnap({ goal_id: "approach-vol", snapshot_date: "2026-01-05", current_value: 120, was_complete: false, period: "weekly" }),
      makeSnap({ goal_id: "approach-vol", snapshot_date: "2026-01-26", current_value: 200, was_complete: false, period: "weekly" }),
      // February (baseline for monthly delta — last snap before March)
      makeSnap({ goal_id: "approach-vol", snapshot_date: "2026-02-23", current_value: 350, was_complete: false, period: "weekly" }),
      // March (current month)
      makeSnap({ goal_id: "approach-vol", snapshot_date: "2026-03-02", current_value: 380, was_complete: false, period: "weekly" }),
      makeSnap({ goal_id: "approach-vol", snapshot_date: "2026-03-09", current_value: 410, was_complete: false, period: "weekly" }),
      makeSnap({ goal_id: "approach-vol", snapshot_date: "2026-03-16", current_value: 430, was_complete: false, period: "weekly" }),
    ]

    const stats = computeMultiPeriodStats(goal, snapshots, NOW)

    // Month delta: current (450) - last snap before March (350) = 100
    expect(stats.monthDelta).toBe(100)

    // Year delta: current (450) - last snap before Jan 1 (100) = 350
    expect(stats.yearDelta).toBe(350)
  })

  // --- Edge: no snapshots ---

  test("no snapshots: returns zeros for completion, current_value for deltas", () => {
    const recurring = createGoalWithProgress({
      id: "new-goal",
      period: "daily",
      goal_type: "recurring",
      current_value: 5,
    })

    const stats = computeMultiPeriodStats(recurring, [], NOW)
    expect(stats.weekCompleted).toBe(0)
    expect(stats.weekTotal).toBe(0)
    expect(stats.monthCompleted).toBe(0)
    expect(stats.monthTotal).toBe(0)
    expect(stats.yearCompleted).toBe(0)
    expect(stats.yearTotal).toBe(0)
    expect(stats.monthDelta).toBeNull()
    expect(stats.yearDelta).toBeNull()
  })

  test("milestone with no snapshots: delta equals current_value", () => {
    const milestone = createGoalWithProgress({
      id: "new-milestone",
      goal_type: "milestone",
      current_value: 21,
      target_value: 1000,
    })

    const stats = computeMultiPeriodStats(milestone, [], NOW)
    expect(stats.monthDelta).toBe(21)
    expect(stats.yearDelta).toBe(21)
  })

  // --- Edge: snapshots only from other goals are ignored ---

  test("ignores snapshots from other goals", () => {
    const goal = createGoalWithProgress({
      id: "my-goal",
      period: "daily",
      goal_type: "recurring",
    })

    const snapshots = [
      makeSnap({ goal_id: "other-goal", snapshot_date: "2026-03-16", was_complete: true }),
      makeSnap({ goal_id: "other-goal", snapshot_date: "2026-03-17", was_complete: true }),
    ]

    const stats = computeMultiPeriodStats(goal, snapshots, NOW)
    expect(stats.weekTotal).toBe(0)
    expect(stats.monthTotal).toBe(0)
  })
})

describe("getOrphanedGoalIds", () => {
  test("flags goals whose template_id is not in the goalGraph registry", () => {
    const goals = [
      createGoalWithProgress({ id: "stale", template_id: "l3_deleted_template" }),
      createGoalWithProgress({ id: "custom", template_id: null }),
    ]
    expect(getOrphanedGoalIds(goals)).toEqual(["stale"])
  })

  test("never flags framework-plan (fw:*) goals — they live in a separate namespace", () => {
    const goals = [
      createGoalWithProgress({ id: "p", template_id: "fw:pillar:health" }),
      createGoalWithProgress({ id: "o", template_id: "fw:obj:obj_strong" }),
      createGoalWithProgress({ id: "t", template_id: "fw:tgt:t_bench" }),
      createGoalWithProgress({ id: "c", template_id: "fw:custom:custom_tgt_1" }),
    ]
    expect(getOrphanedGoalIds(goals)).toEqual([])
  })
})
