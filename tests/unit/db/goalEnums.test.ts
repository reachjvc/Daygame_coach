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
  test("GOAL_TYPES has expected values", () => {
    expect(GOAL_TYPES).toContain("recurring")
    expect(GOAL_TYPES).toContain("milestone")
    expect(GOAL_TYPES).toContain("habit_ramp")
    expect(GOAL_TYPES.length).toBe(3)
  })

  test("GOAL_DISPLAY_CATEGORIES has 27 values", () => {
    expect(GOAL_DISPLAY_CATEGORIES.length).toBe(27)
  })

  test("LINKED_METRICS has 15 values", () => {
    expect(LINKED_METRICS.length).toBe(15)
  })

  test("GOAL_PERIODS has 6 values", () => {
    expect(GOAL_PERIODS.length).toBe(6)
  })

  test("GOAL_TRACKING_TYPES has 4 values", () => {
    expect(GOAL_TRACKING_TYPES.length).toBe(4)
  })

  test("GOAL_PHASES has 3 values", () => {
    expect(GOAL_PHASES.length).toBe(3)
  })

  test("GOAL_NATURES has 2 values", () => {
    expect(GOAL_NATURES.length).toBe(2)
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
