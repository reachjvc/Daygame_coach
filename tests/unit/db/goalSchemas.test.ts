import { describe, test, expect } from "vitest"
import {
  CreateGoalSchema,
  UpdateGoalSchema,
  BatchCreateGoalSchema,
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

  test("accepts full payload with all optional fields", () => {
    const result = CreateGoalSchema.safeParse({
      ...validMinimal,
      tracking_type: "counter",
      period: "weekly",
      custom_end_date: "2026-06-01",
      linked_metric: "approaches_weekly",
      position: 0,
      life_area: "daygame",
      parent_goal_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      target_date: "2026-12-31",
      description: "My goal description",
      goal_type: "recurring",
      goal_nature: "input",
      display_category: "field_work",
      goal_level: 1,
      template_id: "some-template",
      milestone_config: { steps: 3 },
      ramp_steps: [{ week: 1, target: 5 }],
      motivation_note: "Stay consistent",
      goal_phase: "acquisition",
    })
    expect(result.success).toBe(true)
  })

  test("rejects invalid goal_type", () => {
    const result = CreateGoalSchema.safeParse({
      ...validMinimal,
      goal_type: "invalid_type",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields).toHaveProperty("goal_type")
    }
  })

  test("rejects invalid display_category", () => {
    const result = CreateGoalSchema.safeParse({
      ...validMinimal,
      display_category: "nonexistent_category",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields).toHaveProperty("display_category")
    }
  })

  test("requires either category or life_area", () => {
    const result = CreateGoalSchema.safeParse({
      title: "Missing both",
      target_value: 5,
    })
    expect(result.success).toBe(false)
  })

  test("rejects missing title", () => {
    const result = CreateGoalSchema.safeParse({
      category: "field_work",
      target_value: 10,
    })
    expect(result.success).toBe(false)
  })

  test("rejects missing target_value", () => {
    const result = CreateGoalSchema.safeParse({
      title: "No target",
      category: "field_work",
    })
    expect(result.success).toBe(false)
  })

  test("rejects target_value less than 1", () => {
    const result = CreateGoalSchema.safeParse({
      ...validMinimal,
      target_value: 0,
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
// UpdateGoalSchema
// ============================================================================

describe("UpdateGoalSchema", () => {
  test("accepts partial updates", () => {
    const result = UpdateGoalSchema.safeParse({ title: "New title" })
    expect(result.success).toBe(true)
  })

  test("accepts empty object (no fields to update)", () => {
    const result = UpdateGoalSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  test("accepts multiple fields", () => {
    const result = UpdateGoalSchema.safeParse({
      title: "Updated",
      target_value: 20,
      is_active: false,
      current_value: 5,
    })
    expect(result.success).toBe(true)
  })

  test("rejects invalid tracking_type", () => {
    const result = UpdateGoalSchema.safeParse({
      tracking_type: "invalid_tracking",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields).toHaveProperty("tracking_type")
    }
  })

  test("accepts nullable fields set to null", () => {
    const result = UpdateGoalSchema.safeParse({
      parent_goal_id: null,
      target_date: null,
      description: null,
      goal_nature: null,
      display_category: null,
      goal_level: null,
      template_id: null,
      milestone_config: null,
      ramp_steps: null,
      motivation_note: null,
      goal_phase: null,
    })
    expect(result.success).toBe(true)
  })

  test("rejects invalid goal_type", () => {
    const result = UpdateGoalSchema.safeParse({ goal_type: "bad" })
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

  test("accepts goals with life_area but no category (no refine)", () => {
    const result = BatchCreateGoalSchema.safeParse({
      goals: [{
        title: "Life area goal",
        life_area: "fitness",
        target_value: 3,
        _tempId: "temp-2",
      }],
    })
    expect(result.success).toBe(true)
  })

  test("accepts goals with _tempParentId", () => {
    const result = BatchCreateGoalSchema.safeParse({
      goals: [
        { ...validBatchGoal, _tempId: "parent-1" },
        { ...validBatchGoal, _tempId: "child-1", _tempParentId: "parent-1" },
      ],
    })
    expect(result.success).toBe(true)
  })

  test("rejects missing _tempId", () => {
    const result = BatchCreateGoalSchema.safeParse({
      goals: [{ title: "No temp id", category: "field_work", target_value: 5 }],
    })
    expect(result.success).toBe(false)
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

  test("rejects goal with invalid goal_type in batch", () => {
    const result = BatchCreateGoalSchema.safeParse({
      goals: [{ ...validBatchGoal, goal_type: "invalid_type" }],
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Error messages include field names
// ============================================================================

describe("error messages include field names", () => {
  test("CreateGoalSchema errors reference specific fields", () => {
    const result = CreateGoalSchema.safeParse({
      title: "",
      category: "field_work",
      target_value: -1,
      goal_type: "bad",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(Object.keys(fields).length).toBeGreaterThan(0)
      // Should have errors for title (min 1) and target_value (min 1) and goal_type
      expect(fields).toHaveProperty("title")
      expect(fields).toHaveProperty("target_value")
      expect(fields).toHaveProperty("goal_type")
    }
  })

  test("UpdateGoalSchema errors reference specific fields", () => {
    const result = UpdateGoalSchema.safeParse({
      tracking_type: "invalid",
      period: "biweekly",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields).toHaveProperty("tracking_type")
      expect(fields).toHaveProperty("period")
    }
  })
})
