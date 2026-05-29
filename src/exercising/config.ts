/**
 * Default programme and progression constants for the Exercising slice.
 */

import type { DayLabel, ExerciseEntry, Tier } from "./types"
import { TIER_CONFIGS } from "./types"

// ============================================================================
// Programmed Deload
// ============================================================================

/** Deload every Nth week */
export const DELOAD_WEEK_INTERVAL = 4

/** Deload weight multiplier (85% = 15% reduction) */
export const DELOAD_WEIGHT_MULTIPLIER = 0.85

/** Deload sets reduction */
export const DELOAD_SETS_REDUCTION = 1

/** Reactive deload weight multiplier (90% = 10% reduction) */
export const REACTIVE_DELOAD_MULTIPLIER = 0.9

/** Consecutive fail threshold before reactive deload */
export const CONSECUTIVE_FAIL_THRESHOLD = 2

// ============================================================================
// Default Programme (Upper/Lower 4-day)
// ============================================================================

interface ExerciseTemplate {
  day: DayLabel
  exercise: string
  tier: Tier
  startingWeightKg: number
}

const PROGRAMME_TEMPLATE: ExerciseTemplate[] = [
  // Day A — Upper 1
  { day: "A", exercise: "Bench Press", tier: "T1", startingWeightKg: 60 },
  { day: "A", exercise: "OHP", tier: "T2", startingWeightKg: 30 },
  { day: "A", exercise: "Barbell Row", tier: "T2", startingWeightKg: 50 },
  { day: "A", exercise: "Lateral Raise", tier: "T3", startingWeightKg: 7.5 },
  { day: "A", exercise: "Barbell Curl", tier: "T3", startingWeightKg: 20 },
  { day: "A", exercise: "Tricep Pushdown", tier: "T3", startingWeightKg: 15 },

  // Day B — Lower 1
  { day: "B", exercise: "Squat", tier: "T1", startingWeightKg: 80 },
  { day: "B", exercise: "RDL", tier: "T2", startingWeightKg: 60 },
  { day: "B", exercise: "Leg Press", tier: "T2", startingWeightKg: 100 },
  { day: "B", exercise: "Leg Curl", tier: "T3", startingWeightKg: 25 },
  { day: "B", exercise: "Calf Raise", tier: "T3", startingWeightKg: 40 },

  // Day C — Upper 2
  { day: "C", exercise: "OHP", tier: "T1", startingWeightKg: 40 },
  { day: "C", exercise: "Incline Bench", tier: "T2", startingWeightKg: 45 },
  { day: "C", exercise: "Chin-up", tier: "T2", startingWeightKg: 0 },
  { day: "C", exercise: "Face Pull", tier: "T3", startingWeightKg: 12.5 },
  { day: "C", exercise: "Hammer Curl", tier: "T3", startingWeightKg: 12.5 },
  { day: "C", exercise: "Overhead Tricep", tier: "T3", startingWeightKg: 15 },

  // Day D — Lower 2
  { day: "D", exercise: "Deadlift", tier: "T1", startingWeightKg: 100 },
  { day: "D", exercise: "Front Squat", tier: "T2", startingWeightKg: 50 },
  { day: "D", exercise: "Leg Extension", tier: "T2", startingWeightKg: 30 },
  { day: "D", exercise: "Hip Thrust", tier: "T3", startingWeightKg: 60 },
  { day: "D", exercise: "Calf Raise", tier: "T3", startingWeightKg: 45 },
]

export function buildDefaultProgramme(): ExerciseEntry[] {
  return PROGRAMME_TEMPLATE.map((t) => {
    const tier = TIER_CONFIGS[t.tier]
    return {
      day: t.day,
      exercise: t.exercise,
      tier: t.tier,
      sets: tier.sets,
      repMin: tier.repMin,
      repMax: tier.repMax,
      currentWeightKg: t.startingWeightKg,
      incrementKg: tier.incrementKg,
      consecutiveFails: 0,
      status: "IN_PROGRESS" as const,
    }
  })
}

// ============================================================================
// Rules text (written to the "Rules" sheet tab for user verification)
// ============================================================================

export const RULES_TEXT: string[][] = [
  ["STARSCREAM-STYLE PROGRESSION RULES"],
  [""],
  ["=== TIER SYSTEM ==="],
  ["Tier", "Role", "Sets × Rep Range", "Weight Increment"],
  ["T1", "Main Compound", "4 × 3-5 reps", "+2.5 kg"],
  ["T2", "Secondary Compound", "3 × 8-10 reps", "+2.5 kg"],
  ["T3", "Accessory", "3 × 12-15 reps", "+1.25 kg"],
  [""],
  ["=== PROGRESSION LOGIC ==="],
  ["Rule", "Condition", "Action"],
  [
    "ADVANCE",
    "All sets hit TOP of rep range",
    "Increase weight by increment, reps reset to bottom of range",
  ],
  [
    "HOLD",
    "Mixed results (some sets hit target, some didn't)",
    "Keep same weight next session, try again",
  ],
  [
    "DELOAD",
    "Failed to hit BOTTOM of rep range on 2+ sets, for 2 consecutive sessions",
    "Reduce weight by 10%, reset reps to bottom, reset fail counter",
  ],
  [""],
  ["=== PROGRAMMED DELOAD ==="],
  [
    "Every 4th week",
    "All weights reduced by 15%",
    "Sets reduced by 1 for each exercise",
  ],
  [""],
  ["=== TRAINING SPLIT (Upper/Lower 4-Day Rotation) ==="],
  ["Day A (Upper 1)", "Bench T1, OHP T2, Row T2, Lat Raise T3, Curl T3, Tri Pushdown T3"],
  ["Day B (Lower 1)", "Squat T1, RDL T2, Leg Press T2, Leg Curl T3, Calf Raise T3"],
  ["Day C (Upper 2)", "OHP T1, Incline Bench T2, Chin-up T2, Face Pull T3, Hammer Curl T3, OH Tri T3"],
  ["Day D (Lower 2)", "Deadlift T1, Front Squat T2, Leg Ext T2, Hip Thrust T3, Calf Raise T3"],
  [""],
  ["=== HOW TO READ THE SHEET ==="],
  ["Programme tab", "Current state of every exercise — weights, sets, reps, fail count, status"],
  ["Log tab", "Every set you've logged, with target vs actual reps"],
  ["Next Session tab", "What to do in your next workout — auto-updated after each log"],
]

// ============================================================================
// Sheet tab names
// ============================================================================

export const SHEET_TABS = {
  RULES: "Rules",
  PROGRAMME: "Programme",
  LOG: "Log",
  NEXT_SESSION: "Next Session",
} as const

// ============================================================================
// Programme sheet headers
// ============================================================================

export const PROGRAMME_HEADERS = [
  "Day",
  "Exercise",
  "Tier",
  "Sets",
  "Rep Min",
  "Rep Max",
  "Current Weight (kg)",
  "Increment (kg)",
  "Consecutive Fails",
  "Status",
]

export const LOG_HEADERS = [
  "Date",
  "Day",
  "Exercise",
  "Set#",
  "Target Weight",
  "Target Rep Min",
  "Target Rep Max",
  "Actual Reps",
  "Hit Target",
]

export const NEXT_SESSION_HEADERS = [
  "Exercise",
  "Sets",
  "Target Reps",
  "Weight (kg)",
  "Notes",
]
