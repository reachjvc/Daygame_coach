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
  quality: z.number().int().min(1).max(10).optional(),
  note: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timestamp: z.string().datetime().optional(),
  voice_note_url: z.string().url().optional(),
})

export const UpdateApproachSchema = z.object({
  outcome: ApproachOutcomeSchema.optional(),
  set_type: SetTypeSchema.optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  quality: z.number().int().min(1).max(10).optional(),
  note: z.string().max(2000).optional(),
  voice_note_url: z.string().url().optional(),
})

// ============================================
// Field Report Schemas
// ============================================

export const CreateFieldReportSchema = z.object({
  template_id: z.string().uuid().optional(),        // UUID for custom templates only
  system_template_slug: z.string().max(50).optional(), // Slug for system templates (e.g., "quick-log")
  session_id: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  report_date: z.string().datetime().optional(),
  fields: z.record(z.string(), z.unknown()),
  approach_count: z.number().int().min(0).max(1000).optional(),
  location: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  is_draft: z.boolean().default(false),
}).refine(
  (data) => !(data.template_id && data.system_template_slug),
  { message: "Cannot specify both template_id and system_template_slug" }
)

export const UpdateFieldReportSchema = z.object({
  title: z.string().max(200).optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
  approach_count: z.number().int().min(0).max(1000).optional(),
  location: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  is_draft: z.boolean().optional(),
})

export const FavoriteActionSchema = z.object({
  templateId: z.string().uuid(),
  action: z.enum(["add", "remove"]),
})

// ============================================
// Review Schemas
// ============================================

// Template ID can be a UUID (user templates) or "system-{slug}" (system templates)
const TemplateIdSchema = z.string().refine(
  (val) => {
    // Allow system template IDs
    if (val.startsWith("system-")) return true
    // Allow valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(val)
  },
  { message: "Must be a valid UUID or system template ID" }
)

export const CreateReviewSchema = z.object({
  review_type: ReviewTypeSchema,
  template_id: TemplateIdSchema.optional().nullable(),
  fields: z.record(z.string(), z.unknown()),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  previous_commitment: z.string().max(1000).optional().nullable(),
  commitment_fulfilled: z.boolean().optional().nullable(),
  new_commitment: z.string().max(1000).optional().nullable(),
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
export type UpdateFieldReportInput = z.infer<typeof UpdateFieldReportSchema>
export type FavoriteActionInput = z.infer<typeof FavoriteActionSchema>
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
