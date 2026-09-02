/**
 * Database types for the progress tracking system.
 * Tables: sessions, approaches, field_reports, reviews, etc.
 *
 * Enum types are defined in trackingEnums.ts (single source of truth)
 * and re-exported here for backwards compatibility.
 */

export type {
  ApproachOutcome,
  SetType,
  ReviewType,
  FieldType,
  StickingPointStatus,
  SessionEndReason,
  MilestoneType,
} from "./trackingEnums"

import type {
  ApproachOutcome,
  SetType,
  ReviewType,
  FieldType,
  StickingPointStatus,
  SessionEndReason,
  MilestoneType,
} from "./trackingEnums"

// ============================================
// Sessions
// ============================================

export interface SessionRow {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  goal: number | null
  goal_met: boolean
  total_approaches: number
  duration_minutes: number | null
  primary_location: string | null
  location_data: LocationPoint[] | null
  is_active: boolean
  with_wingman: boolean
  wingman_name: string | null
  // Pre-session intentions (for AAR comparison in field reports)
  session_focus: string | null
  technique_focus: string | null
  if_then_plan: string | null
  custom_intention: string | null
  pre_session_mood: number | null
  end_reason: SessionEndReason | null
  created_at: string
  updated_at: string
}

export interface SessionInsert {
  user_id: string
  started_at?: string
  goal?: number
  primary_location?: string
  with_wingman?: boolean
  wingman_name?: string
  // Pre-session intentions
  session_focus?: string
  technique_focus?: string
  if_then_plan?: string
  custom_intention?: string
  pre_session_mood?: number
}

export interface SessionUpdate {
  ended_at?: string | null
  goal?: number
  goal_met?: boolean
  total_approaches?: number
  duration_minutes?: number
  primary_location?: string
  location_data?: LocationPoint[]
  is_active?: boolean
  with_wingman?: boolean
  wingman_name?: string
  // Pre-session intentions
  session_focus?: string
  technique_focus?: string
  if_then_plan?: string
  custom_intention?: string
  pre_session_mood?: number
  // End reason
  end_reason?: SessionEndReason | null
}

export interface LocationPoint {
  latitude: number
  longitude: number
  timestamp: string
}

// ============================================
// Approaches
// ============================================

export interface ApproachRow {
  id: string
  user_id: string
  session_id: string | null
  timestamp: string
  outcome: ApproachOutcome | null
  set_type: SetType | null
  tags: string[] | null
  mood: number | null
  quality: number | null
  latitude: number | null
  longitude: number | null
  note: string | null
  voice_note_url: string | null
  created_at: string
}

export interface ApproachInsert {
  user_id: string
  session_id?: string
  timestamp?: string
  outcome?: ApproachOutcome
  set_type?: SetType
  tags?: string[]
  mood?: number
  quality?: number
  latitude?: number
  longitude?: number
  note?: string
  voice_note_url?: string
}

export interface ApproachUpdate {
  outcome?: ApproachOutcome
  set_type?: SetType
  tags?: string[]
  mood?: number
  quality?: number
  note?: string
  voice_note_url?: string
}

// ============================================
// Field Report Templates
// ============================================

export interface TemplateField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required?: boolean
  options?: string[]  // For select/multiselect
  allowCustom?: boolean // For multiselect - allow free-text entries
  min?: number        // For scale/number
  max?: number        // For scale/number
  rows?: number       // For textarea
  count?: number      // For list type
  multiple?: boolean  // For textarea - render as array of textareas with add/remove
  allowAudio?: boolean // For textarea - show audio recording/upload buttons
}

export interface FieldReportTemplateRow {
  id: string
  user_id: string | null
  name: string
  slug: string
  description: string | null
  icon: string | null
  estimated_minutes: number | null
  is_system: boolean
  base_template_id: string | null
  static_fields: TemplateField[]
  dynamic_fields: TemplateField[]
  active_dynamic_fields: string[]
  created_at: string
  updated_at: string
}

export interface FieldReportTemplateInsert {
  user_id: string
  name: string
  slug: string
  description?: string
  icon?: string
  estimated_minutes?: number
  is_system?: boolean
  base_template_id?: string
  static_fields: TemplateField[]
  dynamic_fields: TemplateField[]
  active_dynamic_fields?: string[]
}

export interface FieldReportTemplateUpdate {
  name?: string
  description?: string
  icon?: string
  estimated_minutes?: number
  static_fields?: TemplateField[]
  dynamic_fields?: TemplateField[]
  active_dynamic_fields?: string[]
}

// ============================================
// Field Reports
// ============================================

export interface FieldReportRow {
  id: string
  user_id: string
  session_id: string | null
  template_id: string | null
  system_template_slug: string | null  // For system templates (e.g., "quick-log")
  title: string | null
  fields: Record<string, unknown>
  approach_count: number | null
  location: string | null
  tags: string[] | null
  is_draft: boolean
  reported_at: string
  created_at: string
  updated_at: string
}

export interface FieldReportInsert {
  user_id: string
  session_id?: string
  template_id?: string              // UUID for custom templates
  system_template_slug?: string     // Slug for system templates (e.g., "quick-log")
  title?: string
  fields: Record<string, unknown>
  approach_count?: number
  location?: string
  tags?: string[]
  is_draft?: boolean
  reported_at?: string
}

export interface FieldReportUpdate {
  template_id?: string              // UUID for custom templates
  system_template_slug?: string     // Slug for system templates (e.g., "quick-log")
  title?: string
  fields?: Record<string, unknown>
  approach_count?: number
  location?: string
  tags?: string[]
  is_draft?: boolean
}

// ============================================
// Review Templates
// ============================================

export interface ReviewTemplateRow {
  id: string
  user_id: string | null
  name: string
  slug: string
  description: string | null
  icon: string | null
  estimated_minutes: number | null
  review_type: ReviewType
  is_system: boolean
  base_template_id: string | null
  static_fields: TemplateField[]
  dynamic_fields: TemplateField[]
  active_dynamic_fields: string[]
  created_at: string
  updated_at: string
}

export interface ReviewTemplateInsert {
  user_id: string
  name: string
  slug: string
  description?: string
  icon?: string
  estimated_minutes?: number
  review_type: ReviewType
  is_system?: boolean
  base_template_id?: string
  static_fields: TemplateField[]
  dynamic_fields: TemplateField[]
  active_dynamic_fields?: string[]
}

// ============================================
// Reviews
// ============================================

export interface ReviewRow {
  id: string
  user_id: string
  review_type: ReviewType
  template_id: string | null
  fields: Record<string, unknown>
  period_start: string
  period_end: string
  previous_commitment: string | null
  commitment_fulfilled: boolean | null
  new_commitment: string | null
  is_draft: boolean
  created_at: string
  updated_at: string
}

export interface ReviewInsert {
  user_id: string
  review_type: ReviewType
  template_id?: string
  fields: Record<string, unknown>
  period_start: string
  period_end: string
  previous_commitment?: string
  commitment_fulfilled?: boolean
  new_commitment?: string
  is_draft?: boolean
}

export interface ReviewUpdate {
  template_id?: string
  fields?: Record<string, unknown>
  previous_commitment?: string
  commitment_fulfilled?: boolean
  new_commitment?: string
  is_draft?: boolean
}

// ============================================
// User Tracking Stats
// ============================================

export interface UserTrackingStatsRow {
  user_id: string
  total_approaches: number
  total_sessions: number
  total_numbers: number
  total_instadates: number
  total_field_reports: number
  // Legacy daily streaks (kept for backward compatibility)
  current_streak: number
  longest_streak: number
  last_approach_date: string | null
  // Weekly activity tracking (for streak calculation)
  current_week_sessions: number         // Sessions in current week
  current_week_approaches: number       // Approaches in current week
  current_week_numbers: number          // Phone numbers in current week
  current_week_instadates: number       // Instadates in current week
  current_week_field_reports: number    // Field reports in current week
  // Weekly session streaks (2+ sessions OR 5+ approaches = active week)
  current_week_streak: number
  longest_week_streak: number
  // THE PERIOD EACH COUNTER BELONGS TO. Monday dates in the USER's timezone —
  // the same representation user_goals.period_start_date uses. A counter read
  // without its period is how the Week Streak tile showed February in August.
  week_start_date: string | null        // Monday the current_week_* counters are for
  last_active_week_start: string | null // Monday of the last week that qualified as active
  last_review_week_start: string | null // Monday the last weekly review was filed for
  // Variety tracking
  unique_locations: string[]
  // Reviews
  weekly_reviews_completed: number
  current_weekly_streak: number
  monthly_review_unlocked: boolean
  quarterly_review_unlocked: boolean
  // Favorite templates (max 3)
  favorite_template_ids: string[]
  updated_at: string
}

export interface UserTrackingStatsUpdate {
  total_approaches?: number
  total_sessions?: number
  total_numbers?: number
  total_instadates?: number
  total_field_reports?: number
  current_streak?: number
  longest_streak?: number
  last_approach_date?: string | null
  current_week_sessions?: number
  current_week_approaches?: number
  current_week_numbers?: number
  current_week_instadates?: number
  current_week_field_reports?: number
  current_week_streak?: number
  longest_week_streak?: number
  week_start_date?: string
  last_active_week_start?: string | null
  last_review_week_start?: string | null
  unique_locations?: string[]
  weekly_reviews_completed?: number
  current_weekly_streak?: number
  monthly_review_unlocked?: boolean
  quarterly_review_unlocked?: boolean
  favorite_template_ids?: string[]
}

// ============================================
// Milestones
// ============================================

export interface MilestoneRow {
  id: string
  user_id: string
  milestone_type: MilestoneType
  achieved_at: string
  value: number | null
  session_id: string | null
  created_at: string
}


// ============================================
// Sticking Points
// ============================================

export interface StickingPointRow {
  id: string
  user_id: string
  name: string
  description: string | null
  status: StickingPointStatus
  occurrence_count: number
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

export interface StickingPointInsert {
  user_id: string
  name: string
  description?: string
  status?: StickingPointStatus
}

export interface StickingPointUpdate {
  name?: string
  description?: string
  status?: StickingPointStatus
  occurrence_count?: number
  resolved_at?: string
  resolution_notes?: string
}

// ============================================
// Aggregated Types for UI
// ============================================

export interface SessionWithApproaches extends SessionRow {
  approaches: ApproachRow[]
}

export interface SessionAchievement {
  milestone_type: string
  emoji: string
  label: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
}

export interface SessionSummary {
  id: string
  started_at: string
  ended_at: string | null
  is_active: boolean
  total_approaches: number
  duration_minutes: number | null
  goal: number | null
  goal_met: boolean
  primary_location: string | null
  end_reason: SessionEndReason | null
  outcomes: {
    blowout: number
    short: number
    good: number
    number: number
    instadate: number
  }
  achievements: SessionAchievement[]
}

export interface DailyStats {
  date: string
  approaches: number
  sessions: number
  numbers: number
  instadates: number
}

export interface WeeklyStats {
  week_start: string
  week_end: string
  approaches: number
  sessions: number
  numbers: number
  instadates: number
  field_reports: number
  review_completed: boolean
}


