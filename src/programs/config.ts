/**
 * Constants for the Programs slice: discipline metadata, level labels,
 * metric-type registry, and unit / plate-loading configuration.
 *
 * No types are exported from this file (CLAUDE.md slice rule); only constants.
 */

import type { Discipline, LevelId, MetricType, UnitSystem } from "./types"

// ============================================================================
// Disciplines (M1 surfaces strength + bodybuilding; rest are catalog stubs)
// ============================================================================

export const DISCIPLINES: Record<
  Discipline,
  { label: string; metricType: MetricType; implemented: boolean }
> = {
  strength: { label: "Strength", metricType: "load", implemented: true },
  bodybuilding: { label: "Bodybuilding", metricType: "load", implemented: true },
  // (strength + bodybuilding both load — engine handles both)
  calisthenics: { label: "Calisthenics", metricType: "skill_tier", implemented: true },
  cardio: { label: "Cardio / Running", metricType: "endurance", implemented: true },
  flexibility: { label: "Flexibility", metricType: "hold_range", implemented: true },
  triathlon: { label: "Triathlon", metricType: "endurance", implemented: true },
  ironman: { label: "Ironman", metricType: "endurance", implemented: true },
}

export const LEVEL_LABELS: Record<LevelId, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
}

export const LEVEL_ORDER: LevelId[] = ["beginner", "intermediate", "advanced"]

// ============================================================================
// Units & plate loading
//
// Working weights are stored in the user's chosen unit; increments are
// unit-native (never converted). Prescribed weights round to a loadable value
// given a standard bar + smallest plate pair — never prescribe an unloadable
// number. Defaults: Olympic 20 kg bar / 1.25 kg plates (→ 2.5 kg granularity);
// standard 45 lb bar / 2.5 lb plates (→ 5 lb granularity).
// ============================================================================

export const UNIT_CONFIG: Record<
  UnitSystem,
  { barWeight: number; loadGranularity: number; label: string }
> = {
  kg: { barWeight: 20, loadGranularity: 2.5, label: "kg" },
  lb: { barWeight: 45, loadGranularity: 5, label: "lb" },
}

export const KG_PER_LB = 0.45359237

// ============================================================================
// Bridge defaults — values written to workout_logs when a program session is
// logged (so gym_sessions_weekly and linked goal metrics update unchanged).
// ============================================================================

export const BRIDGE_SESSION_TYPE = "weights" as const
export const BRIDGE_DEFAULT_DURATION_MIN = 45
export const BRIDGE_DEFAULT_INTENSITY = 3
