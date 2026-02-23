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
// Type Exports (inferred from schemas)
// ============================================

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>
export type BatchCreateGoalInput = z.infer<typeof BatchCreateGoalSchema>
