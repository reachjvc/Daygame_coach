import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import {
  buildGoalTree,
  filterGoals,
  groupGoalsByLifeArea,
  groupGoalsByTimeHorizon,
  computeLifeAreaProgress,
  deriveTimeHorizon,
} from "@/src/goals/goalsService"
import type { GoalWithProgress, GoalFilterState } from "@/src/goals/types"

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
      life_area: "education",
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
      life_area: "finances",
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
    // g1 matches on life_area "health_fitness", g4 matches on title "Save money for health"
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
    const filters = createEmptyFilters({ lifeArea: "education", status: "complete" })
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
      createGoalWithProgress({ id: "g2", life_area: "education" }),
      createGoalWithProgress({ id: "g3", life_area: "health_fitness" }),
    ]

    const result = groupGoalsByLifeArea(goals)

    expect(Object.keys(result)).toHaveLength(2)
    expect(result["health_fitness"]).toHaveLength(2)
    expect(result["education"]).toHaveLength(1)
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
    expect(result["This Year"]).toHaveLength(1)
    expect(result["This Year"][0].id).toBe("g2")

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
        life_area: "education",
        progress_percentage: 50,
        is_complete: false,
      }),
    ]

    const result = computeLifeAreaProgress(goals)

    const health = result.find((r) => r.lifeArea === "health_fitness")
    const education = result.find((r) => r.lifeArea === "education")

    expect(health).toBeDefined()
    expect(health!.completed).toBe(1)
    expect(health!.total).toBe(2)
    expect(health!.avgProgress).toBe(90) // (80 + 100) / 2 = 90

    expect(education).toBeDefined()
    expect(education!.completed).toBe(0)
    expect(education!.total).toBe(1)
    expect(education!.avgProgress).toBe(50)
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
        life_area: "finances",
        progress_percentage: 100,
        is_complete: true,
      }),
      createGoalWithProgress({
        id: "g2",
        life_area: "finances",
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

    test("should return 'This Year' for target_date in a future year (within 5 years)", () => {
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: "2027-03-01",
      })
      expect(deriveTimeHorizon(goal)).toBe("This Year")
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

    test("should fall through to period switch for milestone without target_date", () => {
      // When goal_type is "milestone" but target_date is null, the code skips
      // the milestone branch and falls through to the period switch.
      // With period="custom", this returns "Custom".
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: null,
        period: "custom",
      })
      expect(deriveTimeHorizon(goal)).toBe("Custom")
    })

    test("should fall through to period for milestone without target_date (weekly)", () => {
      // Verifies the fallthrough behavior: milestone + no target_date + weekly period
      const goal = createGoalWithProgress({
        goal_type: "milestone",
        target_date: null,
        period: "weekly",
      })
      expect(deriveTimeHorizon(goal)).toBe("This Week")
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
})
