/**
 * Types for the Exercising slice — Google Sheets workout tracker
 * with rep-range double-progression (Starscream-style).
 */

// ============================================================================
// Tier & Progression
// ============================================================================

export type Tier = "T1" | "T2" | "T3"

export type ProgressionStatus = "ADVANCE" | "HOLD" | "DELOAD" | "PROGRAMMED_DELOAD"

export interface TierConfig {
  sets: number
  repMin: number
  repMax: number
  incrementKg: number
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  T1: { sets: 4, repMin: 3, repMax: 5, incrementKg: 2.5 },
  T2: { sets: 3, repMin: 8, repMax: 10, incrementKg: 2.5 },
  T3: { sets: 3, repMin: 12, repMax: 15, incrementKg: 1.25 },
}

// ============================================================================
// Programme
// ============================================================================

export type DayLabel = "A" | "B" | "C" | "D"

export interface ExerciseEntry {
  day: DayLabel
  exercise: string
  tier: Tier
  sets: number
  repMin: number
  repMax: number
  currentWeightKg: number
  incrementKg: number
  consecutiveFails: number
  status: ProgressionStatus | "IN_PROGRESS"
}

// ============================================================================
// Logging
// ============================================================================

export interface SetLog {
  date: string
  day: DayLabel
  exercise: string
  setNumber: number
  targetWeightKg: number
  targetRepMin: number
  targetRepMax: number
  actualReps: number
  hitTarget: boolean
}

export interface WorkoutLogInput {
  day: DayLabel
  exercises: {
    exercise: string
    sets: { reps: number }[]
  }[]
}

// ============================================================================
// Next Session
// ============================================================================

export interface NextSessionExercise {
  exercise: string
  sets: number
  targetReps: string // e.g. "3-5"
  weightKg: number
  notes: string
}

// ============================================================================
// Sheet Data (read from Google Sheets)
// ============================================================================

export interface SheetProgramme {
  exercises: ExerciseEntry[]
}

export interface SheetLog {
  entries: SetLog[]
}

export interface SheetNextSession {
  day: DayLabel
  exercises: NextSessionExercise[]
}

export interface SheetData {
  programme: SheetProgramme
  nextSession: SheetNextSession
  log: SheetLog
  weekNumber: number
}

// ============================================================================
// Progression Result (output of service logic)
// ============================================================================

export interface ProgressionResult {
  exercise: string
  previousWeight: number
  newWeight: number
  previousStatus: string
  newStatus: ProgressionStatus
  reason: string
}
