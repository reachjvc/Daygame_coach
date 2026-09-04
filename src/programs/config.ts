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


// ============================================================================
// Days of the week
//
// ISO-8601 numbering (1 = Monday … 7 = Sunday) rather than JavaScript's
// Sunday-first `getDay()`, because a training week starts on Monday for
// everyone who writes one down. Conversion from a Date happens in one place:
// `isoWeekday()` below.
// ============================================================================

export const WEEKDAYS: Array<{ value: number; short: string; long: string }> = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 7, short: "Sun", long: "Sunday" },
]

export const WEEKDAY_SHORT: Record<number, string> = Object.fromEntries(
  WEEKDAYS.map((d) => [d.value, d.short])
)

/** A Date to an ISO weekday. JS gives 0 for Sunday; ISO wants 7. */
export function isoWeekday(date: Date): number {
  const js = date.getDay()
  return js === 0 ? 7 : js
}

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
