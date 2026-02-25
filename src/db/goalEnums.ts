/**
 * Canonical source of truth for all goal-related enum values.
 *
 * All TypeScript types, Zod schemas, and type guards are derived from
 * the const arrays defined here. To add or remove a value, edit the
 * array — everything else follows automatically.
 *
 * DB constraints (CHECK / ALTER TYPE) must be kept in sync via the
 * generate-goal-constraints script and a migration file.
 */

import { z } from "zod"

// ============================================================================
// Canonical const arrays
// ============================================================================

export const GOAL_TYPES = ["recurring", "milestone", "habit_ramp"] as const

export const GOAL_DISPLAY_CATEGORIES = [
  // Daygame
  "field_work", "results", "dirty_dog", "texting", "dates", "relationship", "scenarios",
  // Personal Growth
  "mindfulness", "resilience", "learning", "reflection", "discipline",
  // Fitness
  "strength", "training", "nutrition", "body_comp", "flexibility", "endurance",
  // Wealth
  "income", "saving", "investing", "career_growth", "entrepreneurship",
  // Vices & Elimination
  "porn_freedom", "digital_discipline", "substance_control", "self_control",
] as const

export const LINKED_METRICS = [
  "approaches_weekly", "sessions_weekly", "numbers_weekly", "instadates_weekly",
  "field_reports_weekly", "approaches_cumulative", "sessions_cumulative",
  "numbers_cumulative", "instadates_cumulative", "field_reports_cumulative",
  "approach_quality_avg_weekly", "high_quality_approaches_cumulative",
  "scenario_sessions_cumulative", "scenario_types_cumulative", "scenario_high_scores_cumulative",
] as const

export const GOAL_NATURES = ["input", "outcome"] as const

export const GOAL_PERIODS = ["daily", "weekly", "monthly", "quarterly", "yearly", "custom"] as const

export const GOAL_TRACKING_TYPES = ["counter", "percentage", "streak", "boolean"] as const

export const GOAL_PHASES = ["acquisition", "consolidation", "graduated"] as const

// ============================================================================
// Derived TypeScript types
// ============================================================================

export type GoalType = (typeof GOAL_TYPES)[number]
export type GoalDisplayCategory = (typeof GOAL_DISPLAY_CATEGORIES)[number]
export type LinkedMetric = (typeof LINKED_METRICS)[number] | null
export type GoalNature = (typeof GOAL_NATURES)[number]
export type GoalPeriod = (typeof GOAL_PERIODS)[number]
export type GoalTrackingType = (typeof GOAL_TRACKING_TYPES)[number]
export type GoalPhase = (typeof GOAL_PHASES)[number]

// ============================================================================
// Zod schemas
// ============================================================================

export const GoalTypeSchema = z.enum(GOAL_TYPES)
export const GoalDisplayCategorySchema = z.enum(GOAL_DISPLAY_CATEGORIES)
export const LinkedMetricSchema = z.enum(LINKED_METRICS).nullable()
export const GoalNatureSchema = z.enum(GOAL_NATURES)
export const GoalPeriodSchema = z.enum(GOAL_PERIODS)
export const GoalTrackingTypeSchema = z.enum(GOAL_TRACKING_TYPES)
export const GoalPhaseSchema = z.enum(GOAL_PHASES)

// ============================================================================
// Type guards
// ============================================================================

export function isKnownDisplayCategory(val: string): val is GoalDisplayCategory {
  return (GOAL_DISPLAY_CATEGORIES as readonly string[]).includes(val)
}

export function isKnownGoalType(val: string): val is GoalType {
  return (GOAL_TYPES as readonly string[]).includes(val)
}

export function isKnownGoalPhase(val: string): val is GoalPhase {
  return (GOAL_PHASES as readonly string[]).includes(val)
}

export function isKnownLinkedMetric(val: string): val is (typeof LINKED_METRICS)[number] {
  return (LINKED_METRICS as readonly string[]).includes(val)
}

export function isKnownGoalPeriod(val: string): val is GoalPeriod {
  return (GOAL_PERIODS as readonly string[]).includes(val)
}

export function isKnownTrackingType(val: string): val is GoalTrackingType {
  return (GOAL_TRACKING_TYPES as readonly string[]).includes(val)
}

export function isKnownGoalNature(val: string): val is GoalNature {
  return (GOAL_NATURES as readonly string[]).includes(val)
}
