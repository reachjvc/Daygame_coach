/**
 * Zod validation schemas for goal mutation API routes.
 * Ensures all incoming data is properly validated before database operations.
 */

import { z } from "zod"
import {
  GoalTypeSchema, GoalDisplayCategorySchema, LinkedMetricSchema,
  GoalNatureSchema, GoalPeriodSchema, GoalTrackingTypeSchema, GoalPhaseSchema,
} from "./goalEnums"

// ============================================
// Create Goal Schema
// ============================================

export const CreateGoalSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  tracking_type: GoalTrackingTypeSchema.optional(),
  period: GoalPeriodSchema.optional(),
  target_value: z.number().int().min(1),
  current_value: z.number().int().min(0).optional(),
  current_streak: z.number().int().min(0).optional(),
  custom_end_date: z.string().optional(),
  linked_metric: LinkedMetricSchema.optional(),
  position: z.number().int().min(0).optional(),
  life_area: z.string().max(100).optional(),
  parent_goal_id: z.string().uuid().optional(),
  target_date: z.string().optional(),
  description: z.string().max(2000).optional(),
  goal_type: GoalTypeSchema.optional(),
  goal_nature: GoalNatureSchema.optional(),
  display_category: GoalDisplayCategorySchema.nullable().optional(),
  goal_level: z.number().int().min(0).max(3).nullable().optional(),
  template_id: z.string().optional(),
  milestone_config: z.record(z.string(), z.unknown()).nullable().optional(),
  ramp_steps: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  motivation_note: z.string().max(500).nullable().optional(),
  goal_phase: GoalPhaseSchema.nullable().optional(),
  aligned_values: z.array(z.string().max(100)).max(7).optional(),
}).refine(
  (data) => !!(data.category || data.life_area),
  { message: "Either category or life_area is required" }
)

// ============================================
// Update Goal Schema
// ============================================

export const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().max(100).optional(),
  tracking_type: GoalTrackingTypeSchema.optional(),
  period: GoalPeriodSchema.optional(),
  target_value: z.number().int().min(1).optional(),
  current_value: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  linked_metric: LinkedMetricSchema.optional(),
  position: z.number().int().min(0).optional(),
  life_area: z.string().max(100).optional(),
  parent_goal_id: z.string().uuid().nullable().optional(),
  target_date: z.string().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  goal_type: GoalTypeSchema.optional(),
  goal_nature: GoalNatureSchema.nullable().optional(),
  display_category: GoalDisplayCategorySchema.nullable().optional(),
  goal_level: z.number().int().min(0).max(3).nullable().optional(),
  template_id: z.string().nullable().optional(),
  milestone_config: z.record(z.string(), z.unknown()).nullable().optional(),
  ramp_steps: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  motivation_note: z.string().max(500).nullable().optional(),
  goal_phase: GoalPhaseSchema.nullable().optional(),
  aligned_values: z.array(z.string().max(100)).max(7).optional(),
})

// ============================================
// Batch Create Goal Schema
// ============================================

export const BatchCreateGoalSchema = z.object({
  goals: z.array(
    CreateGoalSchema.innerType().extend({
      _tempId: z.string().min(1),
      _tempParentId: z.string().nullable().optional(),
    })
  ).min(1).max(50),
})

// ============================================
// New-Goals Framework Plan Schema
// ============================================

const TargetOverrideSchema = z.object({
  enabled: z.boolean(),
  value: z.number(),
  startValue: z.number().optional(),
  steps: z.number(),
  curveTension: z.number(),
  targetDate: z.string(),
  milestoneEdits: z
    .record(z.string(), z.object({ value: z.number().optional(), date: z.string().optional() }))
    .optional(),
  rampSteps: z.array(z.object({ frequencyPerWeek: z.number(), durationWeeks: z.number() })).optional(),
})

export const NewGoalsPlanSchema = z.object({
  pillars: z.array(z.string().max(100)).max(20),
  objectives: z.array(z.string().max(100)).max(50),
  targetOverrides: z.record(z.string().max(100), TargetOverrideSchema),
  labels: z.record(z.string().max(100), z.string().max(200)).optional(),
  customTargets: z
    .array(z.object({ id: z.string().max(100), pillarId: z.string().max(100), unit: z.string().max(40) }))
    .max(100)
    .optional(),
})

// ============================================
// Type Exports (inferred from schemas)
// ============================================

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>
export type BatchCreateGoalInput = z.infer<typeof BatchCreateGoalSchema>
