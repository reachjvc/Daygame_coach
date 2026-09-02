/**
 * Zod validation schemas for tracking API routes.
 * Ensures all incoming data is properly validated before database operations.
 */

import { z } from "zod"

// ============================================
// Shared Enums (re-exported from canonical source)
// ============================================

export { ApproachOutcomeSchema, SetTypeSchema, ReviewTypeSchema } from "@/src/db/trackingEnums"
import { ApproachOutcomeSchema, SetTypeSchema, ReviewTypeSchema } from "@/src/db/trackingEnums"

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
  // Not in the future. One row dated 2099 makes today's approach not "the most
  // recent", which collapses the daily and weekly streaks to zero on every
  // recount — permanently, because the recount is deterministic. A minute of
  // slack absorbs a phone clock that is slightly ahead.
  timestamp: z
    .string()
    .datetime()
    .refine((value) => new Date(value).getTime() <= Date.now() + 60_000, {
      message: "timestamp cannot be in the future",
    })
    .optional(),
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
  templateId: z.string().refine(
    (val) => {
      if (val.startsWith("system-")) return true
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(val)
    },
    { message: "Must be a valid UUID or system template ID" }
  ),
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

/**
 * A review's period is a pair of CALENDAR DATES, not instants.
 *
 * `reviews.period_start` and `period_end` are DATE columns, and an ISO instant
 * is stored as its UTC date — so a Copenhagen Monday 00:00 sent as
 * "2026-08-23T22:00:00.000Z" landed on the Sunday, and every weekly review was
 * filed one week early. Accepting only YYYY-MM-DD makes that unrepresentable
 * rather than merely discouraged.
 */
const PeriodDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a calendar date, YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "must be a real date",
  })

/** The daily review body. Same date rule as the weekly one. */
export const CreateDailyReviewSchema = z.object({
  fields: z.record(z.string(), z.unknown()).default({}),
  period_start: PeriodDateSchema,
  period_end: PeriodDateSchema,
})

export const CreateReviewSchema = z.object({
  review_type: ReviewTypeSchema,
  template_id: TemplateIdSchema.optional().nullable(),
  fields: z.record(z.string(), z.unknown()),
  period_start: PeriodDateSchema,
  period_end: PeriodDateSchema,
  previous_commitment: z.string().max(1000).optional().nullable(),
  commitment_fulfilled: z.boolean().optional().nullable(),
  new_commitment: z.string().max(1000).optional().nullable(),
  is_draft: z.boolean().default(false),
})

// ============================================
// Dashboard layout
// ============================================

/**
 * What the manage dialog PUTs. Slot order is array order — position is not sent,
 * so a reorder cannot disagree with itself.
 *
 * The count bounds and "is this a real metric" check live in
 * dashboardService.validateWidgets, which knows the catalogue; this schema only
 * guarantees the shape.
 */
export const DashboardWidgetInputSchema = z.object({
  widget_type: z.literal("metric_tile"),
  metric_id: z.string().min(1).max(128),
  config: z.record(z.string(), z.unknown()).optional(),
})

export const DashboardLayoutSchema = z.object({
  widgets: z.array(DashboardWidgetInputSchema).max(64),
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
export type DashboardLayoutInput = z.infer<typeof DashboardLayoutSchema>
