/**
 * Zod validation schemas for tracking API routes.
 * Ensures all incoming data is properly validated before database operations.
 */

import { z } from "zod"

// ============================================
// Shared Enums
// ============================================

export const ApproachOutcomeSchema = z.enum([
  "blowout",
  "short",
  "good",
  "number",
  "instadate",
])

export const SetTypeSchema = z.enum([
  "solo",
  "two_set",
  "three_plus",
  "mixed_group",
  "mom_daughter",
  "sisters",
  "tourist",
  "moving",
  "seated",
  "working",
  "gym",
  "foreign_language",
  "celebrity_vibes",
  "double_set",
  "triple_set",
])

export const ReviewTypeSchema = z.enum(["weekly", "monthly", "quarterly"])

// ============================================
// Session Schemas
// ============================================

export const CreateSessionSchema = z.object({
  goal: z.number().int().min(1).max(100).optional(),
  primary_location: z.string().max(200).optional(),
  // Pre-session intentions
  session_focus: z.string().max(500).optional(),
  technique_focus: z.string().max(500).optional(),
  if_then_plan: z.string().max(500).optional(),
  custom_intention: z.string().max(500).optional(),
  pre_session_mood: z.number().int().min(1).max(5).optional(),
})

export const UpdateSessionSchema = z.object({
  goal: z.number().int().min(1).max(100).optional(),
  primary_location: z.string().max(200).optional(),
})

// ============================================
// Approach Schemas
// ============================================

export const CreateApproachSchema = z.object({
  session_id: z.string().uuid().optional(),
  outcome: ApproachOutcomeSchema.optional(),
  set_type: SetTypeSchema.optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  note: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timestamp: z.string().datetime().optional(),
})

export const UpdateApproachSchema = z.object({
  outcome: ApproachOutcomeSchema.optional(),
  set_type: SetTypeSchema.optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  note: z.string().max(2000).optional(),
})

// ============================================
// Field Report Schemas
// ============================================

export const CreateFieldReportSchema = z.object({
  template_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  fields: z.record(z.string(), z.unknown()),
  approach_count: z.number().int().min(0).max(1000).optional(),
  location: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  is_draft: z.boolean().default(false),
})

// ============================================
// Review Schemas
// ============================================

export const CreateReviewSchema = z.object({
  review_type: ReviewTypeSchema,
  template_id: z.string().uuid().optional(),
  fields: z.record(z.string(), z.unknown()),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  previous_commitment: z.string().max(1000).optional(),
  commitment_fulfilled: z.boolean().optional(),
  new_commitment: z.string().max(1000).optional(),
  is_draft: z.boolean().default(false),
})

// ============================================
// Type Exports (inferred from schemas)
// ============================================

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>
export type CreateApproachInput = z.infer<typeof CreateApproachSchema>
export type UpdateApproachInput = z.infer<typeof UpdateApproachSchema>
export type CreateFieldReportInput = z.infer<typeof CreateFieldReportSchema>
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
