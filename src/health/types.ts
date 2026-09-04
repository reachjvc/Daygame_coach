/**
 * Types for the Health & Appearance tracking slice
 */

// ============================================================================
// Weight Tracking
// ============================================================================

export type WeightUnit = "kg" | "lbs"
export type TimeOfDay = "morning" | "post_workout" | "evening"

export interface WeightLogRow {
  id: string
  user_id: string
  weight_kg: number
  time_of_day: TimeOfDay
  photo_url: string | null
  logged_at: string
  created_at: string
}

export interface WeightLogInsert {
  weight_kg: number
  time_of_day: TimeOfDay
  photo_url?: string | null
  logged_at?: string
}

export interface WeightTrend {
  rollingAvg7d: number | null
  rawEntries: { date: string; weight_kg: number; time_of_day: TimeOfDay }[]
  velocityPerWeek: number | null
  projectedTargetDate: string | null
  trendDirection: "toward_goal" | "flat" | "reversing"
  plateauDays: number
}

// ============================================================================
// Sleep Tracking
// ============================================================================

export type SleepQuality = 1 | 2 | 3 | 4 | 5

export interface SleepLogRow {
  id: string
  user_id: string
  bedtime: string
  wake_time: string
  quality: SleepQuality
  logged_at: string
  created_at: string
}

export interface SleepLogInsert {
  bedtime: string
  wake_time: string
  quality?: SleepQuality
  logged_at?: string
}

export interface SleepStats {
  avgHoursWeekly: number | null
  sleepDebt: number
  bedtimeConsistency: { date: string; bedtimeMinutes: number }[]
  entries: { date: string; hours: number; quality: SleepQuality }[]
}

// ============================================================================
// Workout Tracking
// ============================================================================

export type SessionType = "weights" | "cardio" | "mobility" | "yoga" | "running"
export type WorkoutIntensity = 1 | 2 | 3 | 4 | 5

export interface WorkoutLogRow {
  id: string
  user_id: string
  session_type: SessionType
  duration_min: number
  intensity: WorkoutIntensity
  distance_km: number | null
  logged_at: string
  created_at: string
}

export interface WorkoutLogInsert {
  session_type: SessionType
  duration_min: number
  intensity: WorkoutIntensity
  distance_km?: number | null
  logged_at?: string
}

export interface WorkoutSetRow {
  id: string
  log_id: string
  exercise: string
  weight_kg: number
  reps: number
  set_number: number
  is_warmup: boolean
  notes: string | null
  // Exercise-level note, denormalized onto each of the exercise's set rows
  exercise_notes: string | null
}

export interface WorkoutSetInsert {
  exercise: string
  weight_kg: number
  reps: number
  set_number: number
  is_warmup?: boolean
  notes?: string | null
  exercise_notes?: string | null
}

// A workout log with its sets attached (GET /api/health/workout?include=sets)
export type WorkoutLogWithSets = WorkoutLogRow & { sets: WorkoutSetRow[] }

// One cell of the aligned weekly activity grid
export interface HeatmapDay {
  date: string
  count: number
  future: boolean
}

// Compact per-exercise summary of a workout's sets, for history rows and hints
export interface ExerciseSummary {
  exercise: string
  detail: string
  setCount: number
}

export interface PersonalRecord {
  exercise: string
  weight_kg: number
  reps: number
  date: string
  isNew: boolean
}

// Templates: user-saved presets that prefill the workout logger form.
// Sets are stored as a JSONB payload (no set_number — order is array order).
export interface WorkoutTemplateSet {
  exercise: string
  weight_kg: number
  reps: number
  is_warmup?: boolean
  notes?: string | null
  exercise_notes?: string | null
}

export interface WorkoutTemplateRow {
  id: string
  user_id: string
  name: string
  session_type: SessionType
  duration_min: number | null
  intensity: WorkoutIntensity
  distance_km: number | null
  sets: WorkoutTemplateSet[]
  created_at: string
  updated_at: string
}

export interface WorkoutTemplateInsert {
  name: string
  session_type: SessionType
  duration_min?: number | null
  intensity: WorkoutIntensity
  distance_km?: number | null
  sets?: WorkoutTemplateSet[]
}

// ============================================================================
// Nutrition Tracking
// ============================================================================

export type NutritionQuality = 1 | 2 | 3 | 4 | 5

export interface NutritionLogRow {
  id: string
  user_id: string
  quality_score: NutritionQuality
  note: string
  protein_g: number | null
  calories: number | null
  logged_at: string
  created_at: string
}

export interface NutritionLogInsert {
  quality_score: NutritionQuality
  note: string
  protein_g?: number | null
  calories?: number | null
  logged_at?: string
}

export interface NutritionStats {
  weeklyQualityAvg: number | null
  proteinHitRate: number | null
  entries: { date: string; quality: NutritionQuality; note: string; protein_g: number | null }[]
}

// ============================================================================
// Cross-Domain Correlation
// ============================================================================

export interface CorrelationInsight {
  metric: string
  correlation: string
  description: string
  strength: "strong" | "moderate" | "weak"
}

// ============================================================================
// Shared
// ============================================================================

// ============================================================================
// Body Measurements
// ============================================================================

export type MeasurementType = "chest" | "waist" | "hips" | "arms" | "thighs" | "neck" | "shoulders" | "calves"

export interface BodyMeasurementRow {
  id: string
  user_id: string
  measurement_type: MeasurementType
  value_cm: number
  logged_at: string
  created_at: string
}

export interface BodyMeasurementInsert {
  measurement_type: MeasurementType
  value_cm: number
  logged_at?: string
}

