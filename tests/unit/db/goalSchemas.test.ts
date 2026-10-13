import { describe, test, expect } from "vitest"
import {
  CreateGoalSchema,
  BatchCreateGoalSchema,
  NewGoalsPlanSchema,
} from "@/src/db/goalSchemas"

// ============================================================================
// CreateGoalSchema
// ============================================================================

describe("CreateGoalSchema", () => {
  const validMinimal = {
    title: "Do 10 approaches per week",
    category: "field_work",
    target_value: 10,
  }

  test("accepts a valid minimal payload", () => {
    const result = CreateGoalSchema.safeParse(validMinimal)
    expect(result.success).toBe(true)
  })

  test("accepts life_area instead of category", () => {
    const result = CreateGoalSchema.safeParse({
      title: "Get stronger",
      life_area: "fitness",
      target_value: 5,
    })
    expect(result.success).toBe(true)
  })

  test("requires either category or life_area", () => {
    const result = CreateGoalSchema.safeParse({
      title: "Missing both",
      target_value: 5,
    })
    expect(result.success).toBe(false)
  })

  /**
   * ZERO IS A LEGITIMATE TARGET GOING DOWNWARDS, since 2026-09-20.
   *
   * This asserted `target_value: 0` was rejected, which was right while every
   * target was something you counted UP to. Descending ladders are pushed as
   * real counters now, and "twenty cigarettes a day down to none" aims at
   * zero. The floor of 1 turned that one goal into a 400 for the WHOLE batch,
   * so nothing in the plan was written while the button said "Send".
   *
   * Negative is still refused: a target below zero has no meaning in either
   * direction.
   */
  test("accepts a target_value of zero, for a goal that counts down to none", () => {
    const result = CreateGoalSchema.safeParse({
      ...validMinimal,
      target_value: 0,
    })
    expect(result.success).toBe(true)
  })

  test("rejects a negative target_value", () => {
    const result = CreateGoalSchema.safeParse({
      ...validMinimal,
      target_value: -1,
    })
    expect(result.success).toBe(false)
  })

  test("rejects title longer than 200 characters", () => {
    const result = CreateGoalSchema.safeParse({
      ...validMinimal,
      title: "x".repeat(201),
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// BatchCreateGoalSchema
// ============================================================================

describe("BatchCreateGoalSchema", () => {
  const validBatchGoal = {
    title: "Batch goal 1",
    category: "field_work",
    target_value: 5,
    _tempId: "temp-1",
  }

  test("accepts valid array", () => {
    const result = BatchCreateGoalSchema.safeParse({
      goals: [validBatchGoal],
    })
    expect(result.success).toBe(true)
  })

  test("rejects empty goals array", () => {
    const result = BatchCreateGoalSchema.safeParse({ goals: [] })
    expect(result.success).toBe(false)
  })

  test("rejects more than 50 goals", () => {
    const goals = Array.from({ length: 51 }, (_, i) => ({
      ...validBatchGoal,
      _tempId: `temp-${i}`,
    }))
    const result = BatchCreateGoalSchema.safeParse({ goals })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// NewGoalsPlanSchema — workout-program attachment
// ============================================================================

describe("NewGoalsPlanSchema programSelections", () => {
  const base = { pillars: ["health"], objectives: ["obj_strong"], targetOverrides: {} }

  test("accepts a plan with no program selections", () => {
    expect(NewGoalsPlanSchema.safeParse(base).success).toBe(true)
  })

  test("accepts one program per discipline (1RM + linear)", () => {
    const result = NewGoalsPlanSchema.safeParse({
      ...base,
      programSelections: [
        { programId: "wendler-531", level: "intermediate", unitSystem: "kg", oneRepMaxes: { squat: 140 } },
        { programId: "stronglifts-5x5", level: "beginner", unitSystem: "lb", workingWeights: { squat: 135 } },
      ],
    })
    expect(result.success).toBe(true)
  })

  test("rejects an invalid unit system / non-positive max", () => {
    expect(NewGoalsPlanSchema.safeParse({ ...base, programSelections: [{ programId: "x", level: "beginner", unitSystem: "stone" }] }).success).toBe(false)
    expect(NewGoalsPlanSchema.safeParse({ ...base, programSelections: [{ programId: "x", level: "beginner", unitSystem: "kg", oneRepMaxes: { squat: -5 } }] }).success).toBe(false)
  })
})
