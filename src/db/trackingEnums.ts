/**
 * Canonical source of truth for all tracking-related enum values.
 *
 * All TypeScript types, Zod schemas, and type guards are derived from
 * the const arrays defined here. To add or remove a value, edit the
 * array — everything else follows automatically.
 *
 * DB constraints (CHECK / ALTER TYPE) must be kept in sync via a
 * migration file.
 */

import { z } from "zod"

// ============================================================================
// Canonical const arrays
// ============================================================================

export const APPROACH_OUTCOMES = ["blowout", "short", "good", "number", "instadate"] as const

export const SET_TYPES = [
  "solo", "two_set", "three_plus", "mixed_group", "mom_daughter",
  "sisters", "tourist", "moving", "seated", "working", "gym",
  "foreign_language", "celebrity_vibes", "double_set", "triple_set",
] as const

export const REVIEW_TYPES = ["daily", "weekly", "monthly", "quarterly"] as const

export const FIELD_TYPES = [
  "text", "textarea", "number", "select", "multiselect",
  "scale", "slider", "datetime", "list", "tags", "audio",
] as const

export const STICKING_POINT_STATUSES = ["active", "working_on", "resolved"] as const

export const SESSION_END_REASONS = ["completed", "abandoned"] as const

/**
 * Every achievement badge the app can award, in catalog order.
 *
 * This array is the single source of truth for badge identity. Two things are
 * typed against it and will not compile if a badge is missing from either:
 *   - ALL_MILESTONES in src/tracking/data/milestones.ts (label, tier, description)
 *   - MILESTONE_RULES in src/tracking/data/milestoneRules.ts (how it is earned)
 * See docs/plans/achievement_counters.md.
 */
export const MILESTONE_TYPES = [
  // Volume - Approaches
  "first_approach",
  "5_approaches",
  "10_approaches",
  "25_approaches",
  "50_approaches",
  "100_approaches",
  "250_approaches",
  "500_approaches",
  "1000_approaches",
  // Volume - Numbers
  "first_number",
  "2_numbers",
  "5_numbers",
  "10_numbers",
  "25_numbers",
  "50_numbers",
  "100_numbers",
  // Volume - Instadates
  "first_instadate",
  "2_instadates",
  "5_instadates",
  "10_instadates",
  "25_instadates",
  // Sessions
  "first_session",
  "3_sessions",
  "5_sessions",
  "10_sessions",
  "25_sessions",
  "50_sessions",
  "100_sessions",
  "first_5_approach_session",
  "first_10_approach_session",
  "first_goal_hit",
  // Weekly Streaks
  "2_week_streak",
  "4_week_streak",
  "8_week_streak",
  "12_week_streak",
  "26_week_streak",
  "52_week_streak",
  // Reports & Reviews
  "first_field_report",
  "5_field_reports",
  "10_field_reports",
  "25_field_reports",
  "50_field_reports",
  "first_weekly_review",
  "monthly_unlocked",
  "quarterly_unlocked",
  // Fun/Variety
  "night_owl",
  "early_bird",
  "globetrotter",
  "consistent",
  "marathon",
  "weekend_warrior",
  // Comeback & Resilience
  "comeback_kid",
  "rejection_proof",
  "never_give_up",
  // Time-based achievements
  "lunch_break_legend",
  "rush_hour_hero",
  "sunday_funday",
  "new_years_resolution",
  "valentines_warrior",
  // Efficiency achievements
  "sniper",
  "hot_streak",
  "perfect_session",
  "instant_connection",
  "double_date",
  // Location variety
  "coffee_connoisseur",
  "bookworm",
  "street_smart",
  "mall_rat",
  "park_ranger",
  // Mindset & Growth
  "first_rejection",
  "10_rejections",
  "50_rejections",
  "100_rejections",
  "first_blowout",
  "approach_anxiety_conquered",
  "zone_state",
  "flow_state",
  // Social (tracked via session wingman fields)
  "wing_commander",
  "10_wingman_sessions",
  "25_wingman_sessions",
  "first_double_set",
  "10_double_sets",
  // Unique Set Types (tracked via approach set_type field)
  "first_two_set",
  "first_group",
  "first_mixed_group",
  "first_mom_daughter",
  "first_sisters",
  "first_tourist",
  "tourist_guide",
  "world_traveler",
  "first_moving_set",
  "first_seated",
  "10_seated",
  "seated_master",
  "first_foreign",
  "polyglot",
  // Big milestones
  "2000_approaches",
  "5000_approaches",
  "200_numbers",
  "50_instadates",
  // Legacy
  "7_day_streak",
  "30_day_streak",
  "100_day_streak",
] as const

// ============================================================================
// Derived TypeScript types
// ============================================================================

export type ApproachOutcome = (typeof APPROACH_OUTCOMES)[number]
export type SetType = (typeof SET_TYPES)[number]
export type ReviewType = (typeof REVIEW_TYPES)[number]
export type FieldType = (typeof FIELD_TYPES)[number]
export type StickingPointStatus = (typeof STICKING_POINT_STATUSES)[number]
export type SessionEndReason = (typeof SESSION_END_REASONS)[number]
export type MilestoneType = (typeof MILESTONE_TYPES)[number]

// ============================================================================
// Zod schemas
// ============================================================================

export const ApproachOutcomeSchema = z.enum(APPROACH_OUTCOMES)
export const SetTypeSchema = z.enum(SET_TYPES)
export const ReviewTypeSchema = z.enum(REVIEW_TYPES)
export const FieldTypeSchema = z.enum(FIELD_TYPES)
export const StickingPointStatusSchema = z.enum(STICKING_POINT_STATUSES)
export const SessionEndReasonSchema = z.enum(SESSION_END_REASONS)

// ============================================================================
// Type guards
// ============================================================================

export function isKnownOutcome(val: string): val is ApproachOutcome {
  return (APPROACH_OUTCOMES as readonly string[]).includes(val)
}

export function isKnownSetType(val: string): val is SetType {
  return (SET_TYPES as readonly string[]).includes(val)
}

export function isKnownReviewType(val: string): val is ReviewType {
  return (REVIEW_TYPES as readonly string[]).includes(val)
}

export function isKnownFieldType(val: string): val is FieldType {
  return (FIELD_TYPES as readonly string[]).includes(val)
}

export function isKnownStickingPointStatus(val: string): val is StickingPointStatus {
  return (STICKING_POINT_STATUSES as readonly string[]).includes(val)
}

export function isKnownSessionEndReason(val: string): val is SessionEndReason {
  return (SESSION_END_REASONS as readonly string[]).includes(val)
}
