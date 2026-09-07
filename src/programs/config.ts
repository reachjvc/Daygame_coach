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

/**
 * The plates a normal gym actually has, heaviest first.
 *
 * Loading maths needs to know what exists, and "every gym has these" is the only
 * honest default — somebody with bumper-only or a short bar can be given a
 * setting later, but guessing a bespoke set for everybody would be worse than
 * guessing the common one.
 */
export const PLATES: Record<UnitSystem, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  // 1.25 lb microplates are what a halved Starting Strength jump is loaded with.
  lb: [45, 35, 25, 10, 5, 2.5, 1.25],
}

export const KG_PER_LB = 0.45359237

/**
 * The default bar and smallest plate, per unit — what an ordinary gym has.
 *
 * Now a DEFAULT rather than a law: `profiles.bar_weight_kg` /
 * `smallest_plate_kg` and the per-enrollment override replace these when the
 * person has said what their gym holds. See `PlateSetup`.
 */
export const DEFAULT_PLATES: Record<UnitSystem, { barWeight: number; smallestPlate: number }> = {
  kg: { barWeight: 20, smallestPlate: 1.25 },
  lb: { barWeight: 45, smallestPlate: 2.5 },
}

/**
 * The PRECISION a weight with no bar under it is rounded to. Not a step.
 *
 * These lifts used to be snapped to the barbell's 2.5 kg step, which is wrong
 * twice over: it turned a 6 kg dumbbell into 5 and a 12 kg one into 12.5, and
 * it made a 1 kg increment on a lateral raise move nothing at all, while the
 * app cheerfully said "+1 kg".
 *
 * Snapping them to a dumbbell rack's 2 kg instead would only move the error:
 * cable stacks go up in fives, plate-loaded machines in whatever they hold, and
 * a person who types 25 for a face pull means 25. We do not know their gym. So
 * this rounds to a number a human would write down and nothing more — the
 * increment decides the step, which is what the increment is for.
 */
export const FREE_PRECISION: Record<UnitSystem, number> = { kg: 0.5, lb: 1 }

/**
 * How close to the prescribed weight still counts as lifting it.
 *
 * Exists for the kg↔lb round trip: a weight stored in kg and shown in pounds
 * comes back a hair light, and a lifter who did exactly what was asked must
 * not be scored as having missed. It is deliberately far smaller than any
 * plate, so it can never absorb a real difference.
 */
export const LOAD_TOLERANCE = 0.05

/**
 * OUR suggested rest, in seconds, when the program does not say.
 *
 * No cited program in this catalogue specified rest until StrongLifts' own
 * numbers were encoded, so these are ours and every screen that shows them
 * says so. Picked by what the lift IS (a barbell compound vs an accessory),
 * never by how many sets it happens to have — that rule gave a 3×5 squat the
 * accessory timer and 4×12 curls the compound one.
 */
export const REST_SECONDS = { compound: 180, accessory: 90, warmup: 45 } as const

// ============================================================================
// Bridge defaults — values written to workout_logs when a program session is
// logged (so gym_sessions_weekly and linked goal metrics update unchanged).
//
// ⚠️ DUE TO BE DELETED. Writing "45 minutes at intensity 3" onto every session
// is why the dashboard's training-hours number is invented. The session screen
// now asks for the real duration and intensity; these remain only until the
// last caller stops needing a fallback (docs/plans/training-overhaul.md,
// Phase 1). Do not add a new reader.
// ============================================================================

export const BRIDGE_SESSION_TYPE = "weights" as const
export const BRIDGE_DEFAULT_DURATION_MIN = 45
export const BRIDGE_DEFAULT_INTENSITY = 3
