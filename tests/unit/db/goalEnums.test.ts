import { describe, test, expect } from "vitest"
import {
  GOAL_TYPES, GOAL_DISPLAY_CATEGORIES, LINKED_METRICS, GOAL_NATURES,
  GOAL_PERIODS, GOAL_TRACKING_TYPES, GOAL_PHASES,
  GoalTypeSchema, GoalDisplayCategorySchema, LinkedMetricSchema,
  GoalNatureSchema, GoalPeriodSchema, GoalTrackingTypeSchema, GoalPhaseSchema,
  isKnownDisplayCategory, isKnownGoalType, isKnownGoalPhase,
  isKnownLinkedMetric, isKnownGoalPeriod, isKnownTrackingType, isKnownGoalNature,
} from "@/src/db/goalEnums"
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/src/goals/config"

// ============================================================================
// Const array sanity checks
// ============================================================================

describe("const arrays", () => {
  /**
   * NAMES, NOT COUNTS. Six of these asserted a length. A count tells you the
   * list changed size; it does not tell you the list is right, and it fails on
   * every legitimate addition while catching no wrong one — swapping `daily`
   * for `hourly` keeps the count at six and breaks every rollover in the app.
   * That the lists match the database's own CHECK constraints is checked
   * separately, against real Postgres, in enumConstraintSync.integration.test.ts.
   */
  test("GOAL_TYPES is the three kinds a goal row can be", () => {
    expect([...GOAL_TYPES].sort()).toEqual(["habit_ramp", "milestone", "recurring"])
  })

  test("GOAL_DISPLAY_CATEGORIES ids are unique and well formed", () => {
    // A display grouping — it grows whenever a life area gains a heading, and a
    // count assertion made that a build failure.
    expect(new Set(GOAL_DISPLAY_CATEGORIES).size, "duplicate").toBe(GOAL_DISPLAY_CATEGORIES.length)
    for (const c of GOAL_DISPLAY_CATEGORIES) expect(c, c).toMatch(/^[a-z][a-z0-9_]*$/)
  })

  test("LINKED_METRICS is a set of well-formed ids, not a fixed count", () => {
    // This asserted `length === 41`. A count tells you the list changed size; it
    // does not tell you the list is right, and it fails on every legitimate
    // addition while catching no wrong one. What matters is that every id is
    // unique and shaped like the database enum values it mirrors — and that the
    // TWO lists agree, which enumConstraintSync.integration.test.ts checks
    // against the real Postgres type.
    expect(new Set(LINKED_METRICS).size, "duplicate metric id").toBe(LINKED_METRICS.length)
    for (const metric of LINKED_METRICS) {
      expect(metric, `${metric} is not snake_case`).toMatch(/^[a-z][a-z0-9_]*$/)
    }
    expect(LINKED_METRICS.length).toBeGreaterThan(30)
  })

  test("GOAL_PERIODS is every cadence a counter can run on", () => {
    expect([...GOAL_PERIODS].sort()).toEqual(["custom", "daily", "monthly", "quarterly", "weekly", "yearly"])
  })

  test("GOAL_TRACKING_TYPES is the two that are actually written", () => {
    // `percentage` and `streak` sat here for months and nothing ever wrote them.
    expect([...GOAL_TRACKING_TYPES].sort()).toEqual(["boolean", "counter"])
  })

  test("GOAL_PHASES is the arc the weekly review moves a goal along", () => {
    expect([...GOAL_PHASES].sort()).toEqual(["acquisition", "consolidation", "graduated"])
  })

  test("GOAL_NATURES separates what you do from what you get", () => {
    expect([...GOAL_NATURES].sort()).toEqual(["input", "outcome"])
  })
})

// ============================================================================
// Zod schemas — accept valid, reject invalid
// ============================================================================

describe("Zod schemas", () => {
  test("GoalTypeSchema accepts all valid values", () => {
    for (const v of GOAL_TYPES) {
      expect(GoalTypeSchema.safeParse(v).success).toBe(true)
    }
  })

  test("GoalTypeSchema rejects invalid value", () => {
    const result = GoalTypeSchema.safeParse("nonexistent_type")
    expect(result.success).toBe(false)
  })

  test("GoalDisplayCategorySchema accepts all valid values", () => {
    for (const v of GOAL_DISPLAY_CATEGORIES) {
      expect(GoalDisplayCategorySchema.safeParse(v).success).toBe(true)
    }
  })

  test("GoalDisplayCategorySchema rejects invalid value", () => {
    expect(GoalDisplayCategorySchema.safeParse("bad_category").success).toBe(false)
  })

  test("LinkedMetricSchema accepts all valid values and null", () => {
    for (const v of LINKED_METRICS) {
      expect(LinkedMetricSchema.safeParse(v).success).toBe(true)
    }
    expect(LinkedMetricSchema.safeParse(null).success).toBe(true)
  })

  test("LinkedMetricSchema rejects invalid value", () => {
    expect(LinkedMetricSchema.safeParse("fake_metric").success).toBe(false)
  })

  test("GoalNatureSchema accepts input and outcome", () => {
    expect(GoalNatureSchema.safeParse("input").success).toBe(true)
    expect(GoalNatureSchema.safeParse("outcome").success).toBe(true)
    expect(GoalNatureSchema.safeParse("other").success).toBe(false)
  })

  test("GoalPeriodSchema accepts all valid values", () => {
    for (const v of GOAL_PERIODS) {
      expect(GoalPeriodSchema.safeParse(v).success).toBe(true)
    }
    expect(GoalPeriodSchema.safeParse("biweekly").success).toBe(false)
  })

  test("GoalTrackingTypeSchema accepts all valid values", () => {
    for (const v of GOAL_TRACKING_TYPES) {
      expect(GoalTrackingTypeSchema.safeParse(v).success).toBe(true)
    }
    expect(GoalTrackingTypeSchema.safeParse("timer").success).toBe(false)
  })

  test("GoalPhaseSchema accepts all valid values", () => {
    for (const v of GOAL_PHASES) {
      expect(GoalPhaseSchema.safeParse(v).success).toBe(true)
    }
    expect(GoalPhaseSchema.safeParse("mastered").success).toBe(false)
  })
})

// ============================================================================
// Type guards
// ============================================================================

describe("type guards", () => {
  test("isKnownDisplayCategory", () => {
    expect(isKnownDisplayCategory("field_work")).toBe(true)
    expect(isKnownDisplayCategory("nutrition")).toBe(true)
    expect(isKnownDisplayCategory("nonexistent")).toBe(false)
    expect(isKnownDisplayCategory("")).toBe(false)
  })

  test("isKnownGoalType", () => {
    expect(isKnownGoalType("recurring")).toBe(true)
    expect(isKnownGoalType("milestone")).toBe(true)
    expect(isKnownGoalType("habit_ramp")).toBe(true)
    expect(isKnownGoalType("unknown")).toBe(false)
  })

  test("isKnownGoalPhase", () => {
    expect(isKnownGoalPhase("acquisition")).toBe(true)
    expect(isKnownGoalPhase("consolidation")).toBe(true)
    expect(isKnownGoalPhase("graduated")).toBe(true)
    expect(isKnownGoalPhase("mastered")).toBe(false)
  })

  test("isKnownLinkedMetric", () => {
    expect(isKnownLinkedMetric("approaches_weekly")).toBe(true)
    expect(isKnownLinkedMetric("sessions_cumulative")).toBe(true)
    expect(isKnownLinkedMetric("fake_metric")).toBe(false)
  })

  test("isKnownGoalPeriod", () => {
    expect(isKnownGoalPeriod("weekly")).toBe(true)
    expect(isKnownGoalPeriod("custom")).toBe(true)
    expect(isKnownGoalPeriod("biweekly")).toBe(false)
  })

  test("isKnownTrackingType", () => {
    expect(isKnownTrackingType("counter")).toBe(true)
    expect(isKnownTrackingType("boolean")).toBe(true)
    expect(isKnownTrackingType("timer")).toBe(false)
  })

  test("isKnownGoalNature", () => {
    expect(isKnownGoalNature("input")).toBe(true)
    expect(isKnownGoalNature("outcome")).toBe(true)
    expect(isKnownGoalNature("neutral")).toBe(false)
  })
})

// ============================================================================
// Exhaustiveness — config.ts must stay in sync
// ============================================================================

describe("config.ts exhaustiveness", () => {
  test("CATEGORY_LABELS has entry for every GOAL_DISPLAY_CATEGORIES value", () => {
    for (const cat of GOAL_DISPLAY_CATEGORIES) {
      expect(CATEGORY_LABELS).toHaveProperty(cat)
      expect(typeof CATEGORY_LABELS[cat]).toBe("string")
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0)
    }
  })

  test("CATEGORY_ORDER contains every GOAL_DISPLAY_CATEGORIES value", () => {
    for (const cat of GOAL_DISPLAY_CATEGORIES) {
      expect(CATEGORY_ORDER).toContain(cat)
    }
  })

  test("CATEGORY_ORDER has same length as GOAL_DISPLAY_CATEGORIES", () => {
    expect(CATEGORY_ORDER.length).toBe(GOAL_DISPLAY_CATEGORIES.length)
  })

  test("CATEGORY_ORDER has no duplicates", () => {
    const unique = new Set(CATEGORY_ORDER)
    expect(unique.size).toBe(CATEGORY_ORDER.length)
  })
})
