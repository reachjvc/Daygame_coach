import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import {
  buildGoalTree,
  filterGoals,
  groupGoalsByLifeArea,
  groupGoalsByTimeHorizon,
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
  getDaysLeftInWeek,
  computeProjectedDate,
  findExistingByTemplate,
  generateDirtyDogInserts,
  getTimeOfDayBracket,
  isAlmostComplete,
  getWeeklyRhythm,
  computePacing,
  buildMilestoneCelebrationData,
} from "@/src/goals/goalsService"
import type { GoalWithProgress, GoalFilterState, BadgeStatus } from "@/src/goals/types"
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
    progress_percentage: 0,
    is_complete: false,
    days_remaining: null,
    ...overrides,
  }
}

function createEmptyFilters(overrides: Partial<GoalFilterState> = {}): GoalFilterState {
  return {
    lifeArea: null,
    timeHorizon: null,
    status: null,
    search: "",
    ...overrides,
  }
}

// ============================================================================
// buildGoalTree
// ============================================================================

describe("buildGoalTree", () => {
  test("should return empty array for empty input", () => {
    const result = buildGoalTree([])
    expect(result).toEqual([])
  })

  test("should return all goals as roots when none have parents", () => {
    const goals = [
      createGoalWithProgress({ id: "a", title: "A" }),
      createGoalWithProgress({ id: "b", title: "B" }),
      createGoalWithProgress({ id: "c", title: "C" }),
    ]

    const result = buildGoalTree(goals)

    expect(result).toHaveLength(3)
    expect(result[0].id).toBe("a")
    expect(result[1].id).toBe("b")
    expect(result[2].id).toBe("c")
    expect(result[0].children).toEqual([])
    expect(result[1].children).toEqual([])
    expect(result[2].children).toEqual([])
  })

  test("should nest children under their parent", () => {
    const goals = [
      createGoalWithProgress({ id: "parent", title: "Parent" }),
      createGoalWithProgress({ id: "child-1", title: "Child 1", parent_goal_id: "parent" }),
      createGoalWithProgress({ id: "child-2", title: "Child 2", parent_goal_id: "parent" }),
    ]

    const result = buildGoalTree(goals)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("parent")
    expect(result[0].children).toHaveLength(2)
    expect(result[0].children[0].id).toBe("child-1")
    expect(result[0].children[1].id).toBe("child-2")
  })

  test("should handle orphans (parent not in array) as roots", () => {
    const goals = [
      createGoalWithProgress({ id: "orphan", title: "Orphan", parent_goal_id: "missing-parent" }),
      createGoalWithProgress({ id: "root", title: "Root" }),
    ]

    const result = buildGoalTree(goals)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("orphan")
    expect(result[1].id).toBe("root")
  })

  test("should handle deep nesting (3 levels)", () => {
    const goals = [
      createGoalWithProgress({ id: "grandparent", title: "Grandparent" }),
      createGoalWithProgress({ id: "parent", title: "Parent", parent_goal_id: "grandparent" }),
      createGoalWithProgress({ id: "child", title: "Child", parent_goal_id: "parent" }),
    ]

    const result = buildGoalTree(goals)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("grandparent")
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].id).toBe("parent")
    expect(result[0].children[0].children).toHaveLength(1)
    expect(result[0].children[0].children[0].id).toBe("child")
    expect(result[0].children[0].children[0].children).toEqual([])
  })

  test("should handle mixed roots, children, and orphans", () => {
    const goals = [
      createGoalWithProgress({ id: "root-1", title: "Root 1" }),
      createGoalWithProgress({ id: "child-of-root-1", title: "Child", parent_goal_id: "root-1" }),
      createGoalWithProgress({ id: "orphan", title: "Orphan", parent_goal_id: "deleted-goal" }),
    ]

    const result = buildGoalTree(goals)

    expect(result).toHaveLength(2) // root-1 and orphan
    expect(result[0].id).toBe("root-1")
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].id).toBe("child-of-root-1")
    expect(result[1].id).toBe("orphan")
    expect(result[1].children).toEqual([])
  })

  test("should treat self-referencing goal as root (no ghost)", () => {
    const goals = [
      createGoalWithProgress({ id: "self-ref", title: "Self Ref", parent_goal_id: "self-ref" }),
      createGoalWithProgress({ id: "normal", title: "Normal" }),
    ]

    const result = buildGoalTree(goals)

    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toContain("self-ref")
    expect(result.map((r) => r.id)).toContain("normal")
  })

  test("should break 2-node cycle and treat both as roots (no ghost)", () => {
    const goals = [
      createGoalWithProgress({ id: "a", title: "A", parent_goal_id: "b" }),
      createGoalWithProgress({ id: "b", title: "B", parent_goal_id: "a" }),
    ]

    const result = buildGoalTree(goals)

    // Both must appear — neither should be a ghost
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toContain("a")
    expect(result.map((r) => r.id)).toContain("b")
  })

  test("should break 3-node cycle and treat all as roots (no ghost)", () => {
    const goals = [
      createGoalWithProgress({ id: "a", title: "A", parent_goal_id: "c" }),
      createGoalWithProgress({ id: "b", title: "B", parent_goal_id: "a" }),
      createGoalWithProgress({ id: "c", title: "C", parent_goal_id: "b" }),
    ]

    const result = buildGoalTree(goals)

    expect(result).toHaveLength(3)
    expect(result.map((r) => r.id)).toContain("a")
    expect(result.map((r) => r.id)).toContain("b")
    expect(result.map((r) => r.id)).toContain("c")
  })
})

// ============================================================================
// filterGoals
// ============================================================================

describe("filterGoals", () => {
  const goals = [
    createGoalWithProgress({
      id: "g1",
      title: "Run 5K",
      life_area: "health_fitness",
      is_complete: false,
      period: "weekly",
    }),
    createGoalWithProgress({
      id: "g2",
      title: "Read books",
      life_area: "personal_growth",
      is_complete: true,
      period: "monthly",
    }),
    createGoalWithProgress({
      id: "g3",
      title: "Do approaches",
      life_area: "daygame",
      is_complete: false,
      period: "daily",
    }),
    createGoalWithProgress({
      id: "g4",
      title: "Save money for health",
      life_area: "career_business",
      is_complete: false,
      period: "yearly",
    }),
  ]

  test("should return all goals when filters are empty", () => {
    const filters = createEmptyFilters()
    const result = filterGoals(goals, filters)
    expect(result).toHaveLength(4)
  })

  test("should filter by lifeArea", () => {
    const filters = createEmptyFilters({ lifeArea: "health_fitness" })
    const result = filterGoals(goals, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("g1")
  })

  test("should filter by search text (title match, case-insensitive)", () => {
    const filters = createEmptyFilters({ search: "run" })
    const result = filterGoals(goals, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("g1")
  })

  test("should filter by search text (life_area match)", () => {
    const filters = createEmptyFilters({ search: "daygame" })
    const result = filterGoals(goals, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("g3")
  })

  test("should filter by search text matching title containing life area word", () => {
    // "health" appears in g1's life_area AND g4's title
    const filters = createEmptyFilters({ search: "health" })
    const result = filterGoals(goals, filters)
    // g1 matches on life_area "health_fitness", g4 matches on title "Save money for health" (career_business area)
    expect(result).toHaveLength(2)
    const ids = result.map((g) => g.id)
    expect(ids).toContain("g1")
    expect(ids).toContain("g4")
  })

  test("should filter by status=complete", () => {
    const filters = createEmptyFilters({ status: "complete" })
    const result = filterGoals(goals, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("g2")
  })

  test("should filter by status=active", () => {
    const filters = createEmptyFilters({ status: "active" })
    const result = filterGoals(goals, filters)
    expect(result).toHaveLength(3)
    expect(result.every((g) => !g.is_complete)).toBe(true)
  })

  test("should filter by timeHorizon", () => {
    // period=daily maps to "Today" via deriveTimeHorizon
    const filters = createEmptyFilters({ timeHorizon: "Today" })
    const result = filterGoals(goals, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("g3")
  })

  test("should apply combined filters (lifeArea + status)", () => {
    const filters = createEmptyFilters({ lifeArea: "personal_growth", status: "complete" })
    const result = filterGoals(goals, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("g2")
  })

  test("should return empty when combined filters match nothing", () => {
    const filters = createEmptyFilters({ lifeArea: "health_fitness", status: "complete" })
    const result = filterGoals(goals, filters)
    expect(result).toHaveLength(0)
  })

  test("should return empty when search matches nothing", () => {
    const filters = createEmptyFilters({ search: "zzznomatch" })
    const result = filterGoals(goals, filters)
    expect(result).toHaveLength(0)
  })
})

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
// groupGoalsByTimeHorizon
// ============================================================================

describe("groupGoalsByTimeHorizon", () => {
  test("should return empty object for empty array", () => {
    const result = groupGoalsByTimeHorizon([])
    expect(result).toEqual({})
  })

  test("should group goals by derived time horizon", () => {
    const goals = [
      createGoalWithProgress({ id: "g1", period: "daily", goal_type: "recurring" }),
      createGoalWithProgress({ id: "g2", period: "weekly", goal_type: "recurring" }),
      createGoalWithProgress({ id: "g3", period: "daily", goal_type: "recurring" }),
    ]

    const result = groupGoalsByTimeHorizon(goals)

    expect(Object.keys(result)).toHaveLength(2)
    expect(result["Today"]).toHaveLength(2)
    expect(result["This Week"]).toHaveLength(1)
  })

  test("should group milestones by their target date horizon", () => {
    // Use fake timers so date calculations are stable
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-07T12:00:00Z"))

    const goals = [
      createGoalWithProgress({
        id: "g1",
        goal_type: "milestone",
        target_date: "2035-01-01",
        period: "custom",
      }),
      createGoalWithProgress({
        id: "g2",
        goal_type: "milestone",
        target_date: "2027-06-01",
        period: "custom",
      }),
    ]

    const result = groupGoalsByTimeHorizon(goals)

    expect(result["Life"]).toHaveLength(1)
    expect(result["Life"][0].id).toBe("g1")
    expect(result["Multi-Year"]).toHaveLength(1)
    expect(result["Multi-Year"][0].id).toBe("g2")

    vi.useRealTimers()
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
    test("should return 'Today' for daily period", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "daily" })
      expect(deriveTimeHorizon(goal)).toBe("Today")
    })

    test("should return 'This Week' for weekly period", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "weekly" })
      expect(deriveTimeHorizon(goal)).toBe("This Week")
    })

    test("should return 'This Month' for monthly period", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "monthly" })
      expect(deriveTimeHorizon(goal)).toBe("This Month")
    })

    test("should return 'This Quarter' for quarterly period", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "quarterly" })
      expect(deriveTimeHorizon(goal)).toBe("This Quarter")
    })

    test("should return 'This Year' for yearly period", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "yearly" })
      expect(deriveTimeHorizon(goal)).toBe("This Year")
    })

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

    test("should return 'direct-entry' for counter with target 150", () => {
      const goal = createGoalWithProgress({ tracking_type: "counter", target_value: 150 })
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
    test("daily recurring goal → subtle", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "daily" })
      expect(getCelebrationTier(goal)).toBe("subtle")
    })

    test("weekly recurring goal → toast", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "weekly" })
      expect(getCelebrationTier(goal)).toBe("toast")
    })

    test("monthly recurring goal → toast", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "monthly" })
      expect(getCelebrationTier(goal)).toBe("toast")
    })

    test("quarterly recurring goal → confetti-small", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "quarterly" })
      expect(getCelebrationTier(goal)).toBe("confetti-small")
    })

    test("yearly recurring goal → confetti-full", () => {
      const goal = createGoalWithProgress({ goal_type: "recurring", period: "yearly" })
      expect(getCelebrationTier(goal)).toBe("confetti-full")
    })

    test("multi-year milestone → confetti-epic", () => {
      const nextYear = new Date()
      nextYear.setFullYear(nextYear.getFullYear() + 2)
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: nextYear.toISOString().split("T")[0],
      })
      expect(getCelebrationTier(goal)).toBe("confetti-epic")
    })

    test("life milestone (5+ years) → confetti-epic", () => {
      const farFuture = new Date()
      farFuture.setFullYear(farFuture.getFullYear() + 10)
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: farFuture.toISOString().split("T")[0],
      })
      expect(getCelebrationTier(goal)).toBe("confetti-epic")
    })

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

    test("L0 → L1", () => {
      expect(deriveChildLevel(0)).toBe(1)
    })

    test("L1 → L2", () => {
      expect(deriveChildLevel(1)).toBe(2)
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

    test("returns formatted label for 1 week", () => {
      expect(formatStreakLabel(1)).toBe("Week 1 streak")
    })
  })

  // ===========================================================================
  // getDaysLeftInWeek
  // ===========================================================================

  describe("getDaysLeftInWeek", () => {
    test("returns 0 on Sunday", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-02-08T12:00:00Z")) // Sunday
      expect(getDaysLeftInWeek()).toBe(0)
      vi.useRealTimers()
    })

    test("returns 6 on Monday", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-02-09T12:00:00Z")) // Monday
      expect(getDaysLeftInWeek()).toBe(6)
      vi.useRealTimers()
    })

    test("returns 1 on Saturday", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-02-07T12:00:00Z")) // Saturday
      expect(getDaysLeftInWeek()).toBe(1)
      vi.useRealTimers()
    })

    test("returns 4 on Wednesday", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-02-11T12:00:00Z")) // Wednesday
      expect(getDaysLeftInWeek()).toBe(4)
      vi.useRealTimers()
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
  // findExistingByTemplate
  // ============================================================================

  describe("findExistingByTemplate", () => {
    test("returns matching goal when template_id matches", () => {
      const goals = [
        createGoalWithProgress({ id: "g1", template_id: "l3_approach_volume" }),
        createGoalWithProgress({ id: "g2", template_id: "l3_phone_numbers" }),
      ]
      const result = findExistingByTemplate(goals, "l3_approach_volume")
      expect(result).not.toBeNull()
      expect(result!.id).toBe("g1")
    })

    test("returns null when no template_id matches", () => {
      const goals = [
        createGoalWithProgress({ id: "g1", template_id: "l3_approach_volume" }),
      ]
      expect(findExistingByTemplate(goals, "l3_instadates")).toBeNull()
    })

    test("returns null for empty array", () => {
      expect(findExistingByTemplate([], "l3_approach_volume")).toBeNull()
    })
  })

  // ============================================================================
  // generateDirtyDogInserts
  // ============================================================================

  describe("generateDirtyDogInserts", () => {
    test("returns 3 dirty dog goals when none exist and L2 parent present", () => {
      const goals = [
        createGoalWithProgress({ id: "l2-1", goal_level: 2, template_id: "l2_master_daygame" }),
        createGoalWithProgress({ id: "l3-1", goal_level: 3, template_id: "l3_approach_volume" }),
      ]
      const inserts = generateDirtyDogInserts(goals)
      expect(inserts.length).toBe(3)
      const templateIds = inserts.map((i) => i.template_id)
      expect(templateIds).toContain("l3_kiss_closes")
      expect(templateIds).toContain("l3_lays")
      expect(templateIds).toContain("l3_sustained_rotation")
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

    test("all inserts parented to existing L2 goal", () => {
      const goals = [
        createGoalWithProgress({ id: "l2-1", goal_level: 2, template_id: "l2_master_daygame" }),
      ]
      const inserts = generateDirtyDogInserts(goals)
      for (const insert of inserts) {
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
        createGoalWithProgress({ id: "dd-1", goal_level: 3, template_id: "l3_kiss_closes" }),
        createGoalWithProgress({ id: "dd-2", goal_level: 3, template_id: "l3_lays" }),
      ]
      const inserts = generateDirtyDogInserts(goals)
      expect(inserts.length).toBe(1)
      const templateIds = inserts.map((i) => i.template_id)
      expect(templateIds).toContain("l3_sustained_rotation")
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

  test("boundary: 4→night, 5→morning", () => {
    expect(getTimeOfDayBracket(4)).toBe("night")
    expect(getTimeOfDayBracket(5)).toBe("morning")
  })

  test("boundary: 11→morning, 12→afternoon", () => {
    expect(getTimeOfDayBracket(11)).toBe("morning")
    expect(getTimeOfDayBracket(12)).toBe("afternoon")
  })

  test("boundary: 16→afternoon, 17→evening", () => {
    expect(getTimeOfDayBracket(16)).toBe("afternoon")
    expect(getTimeOfDayBracket(17)).toBe("evening")
  })

  test("boundary: 20→evening, 21→night", () => {
    expect(getTimeOfDayBracket(20)).toBe("evening")
    expect(getTimeOfDayBracket(21)).toBe("night")
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

describe("getWeeklyRhythm", () => {
  function createSnapshot(overrides: Partial<DailyGoalSnapshotRow> = {}): DailyGoalSnapshotRow {
    return {
      id: "snap-1",
      user_id: "user-1",
      goal_id: "goal-1",
      snapshot_date: "2026-02-21",
      current_value: 10,
      target_value: 10,
      was_complete: true,
      current_streak: 3,
      best_streak: 5,
      period: "daily",
      created_at: "2026-02-21T10:00:00Z",
      ...overrides,
    }
  }

  test("counts active days from unique snapshot dates", () => {
    const snapshots = [
      createSnapshot({ snapshot_date: "2026-02-17", created_at: "2026-02-17T09:00:00Z" }),
      createSnapshot({ snapshot_date: "2026-02-18", created_at: "2026-02-18T14:00:00Z" }),
      createSnapshot({ snapshot_date: "2026-02-19", created_at: "2026-02-19T18:00:00Z" }),
    ]
    const rhythm = getWeeklyRhythm(snapshots)
    expect(rhythm.activeDays).toBe(3)
  })

  test("only counts completed goals as active", () => {
    const snapshots = [
      createSnapshot({ snapshot_date: "2026-02-17", was_complete: true }),
      createSnapshot({ snapshot_date: "2026-02-18", was_complete: false }),
      createSnapshot({ snapshot_date: "2026-02-19", was_complete: true }),
    ]
    const rhythm = getWeeklyRhythm(snapshots)
    expect(rhythm.activeDays).toBe(2)
  })

  test("identifies peak bracket", () => {
    const snapshots = [
      createSnapshot({ created_at: "2026-02-17T09:00:00Z" }), // morning
      createSnapshot({ created_at: "2026-02-18T10:00:00Z", snapshot_date: "2026-02-18" }), // morning
      createSnapshot({ created_at: "2026-02-19T15:00:00Z", snapshot_date: "2026-02-19" }), // afternoon
    ]
    const rhythm = getWeeklyRhythm(snapshots)
    expect(rhythm.peakBracket).toBe("morning")
    expect(rhythm.bracketCounts.morning).toBe(2)
    expect(rhythm.bracketCounts.afternoon).toBe(1)
  })

  test("returns null peakBracket when no completed snapshots", () => {
    const snapshots = [
      createSnapshot({ was_complete: false }),
    ]
    const rhythm = getWeeklyRhythm(snapshots)
    expect(rhythm.peakBracket).toBeNull()
    expect(rhythm.activeDays).toBe(0)
  })

  test("handles empty snapshots", () => {
    const rhythm = getWeeklyRhythm([])
    expect(rhythm.activeDays).toBe(0)
    expect(rhythm.peakBracket).toBeNull()
    expect(rhythm.bracketCounts).toEqual({ morning: 0, afternoon: 0, evening: 0, night: 0 })
  })

  test("deduplicates same-day snapshots for active days count", () => {
    const snapshots = [
      createSnapshot({ goal_id: "g1", snapshot_date: "2026-02-17", created_at: "2026-02-17T09:00:00Z" }),
      createSnapshot({ goal_id: "g2", snapshot_date: "2026-02-17", created_at: "2026-02-17T10:00:00Z" }),
    ]
    const rhythm = getWeeklyRhythm(snapshots)
    expect(rhythm.activeDays).toBe(1)
    expect(rhythm.bracketCounts.morning).toBe(2) // both snapshots contribute to bracket counts
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
