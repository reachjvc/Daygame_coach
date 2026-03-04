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

// ============================================================================
// Derived TypeScript types
// ============================================================================

export type ApproachOutcome = (typeof APPROACH_OUTCOMES)[number]
export type SetType = (typeof SET_TYPES)[number]
export type ReviewType = (typeof REVIEW_TYPES)[number]
export type FieldType = (typeof FIELD_TYPES)[number]
export type StickingPointStatus = (typeof STICKING_POINT_STATUSES)[number]
export type SessionEndReason = (typeof SESSION_END_REASONS)[number]

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
