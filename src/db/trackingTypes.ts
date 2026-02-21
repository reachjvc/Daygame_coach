/**
 * Database types for the progress tracking system.
 * Tables: sessions, approaches, field_reports, reviews, etc.
 */

// ============================================
// Sessions
// ============================================

export type SessionEndReason = 'completed' | 'abandoned'

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
  end_reason?: SessionEndReason
}

export interface LocationPoint {
  latitude: number
  longitude: number
  timestamp: string
}

// ============================================
// Approaches
// ============================================

export type ApproachOutcome = 'blowout' | 'short' | 'good' | 'number' | 'instadate'

// Set types for tracking unique approach situations (unlocks achievements)
export type SetType =
  | 'solo'              // Standard 1-on-1
  | 'two_set'           // Two girls together
  | 'three_plus'        // Group of 3+
  | 'mixed_group'       // Group with guys and girls
  | 'mom_daughter'      // Mother-daughter pair
  | 'sisters'           // Sisters
  | 'tourist'           // Tourist/traveler
  | 'moving'            // Walking/jogging (had to stop them)
  | 'seated'            // Seated at cafe/bench
  | 'working'           // At work (barista, retail, etc.)
  | 'gym'               // At the gym
  | 'foreign_language'  // Different language
  | 'celebrity_vibes'   // Model/celebrity lookalike
  | 'double_set'        // With wingman (2v2)
  | 'triple_set'        // With wing (2v3+)

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

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'scale' | 'slider' | 'datetime' | 'list' | 'tags' | 'audio'

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

export type ReviewType = 'weekly' | 'monthly' | 'quarterly'

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
  current_week: string | null           // ISO week string e.g. "2026-W04"
  current_week_sessions: number         // Sessions in current week
  current_week_approaches: number       // Approaches in current week
  current_week_numbers: number          // Phone numbers in current week
  current_week_instadates: number       // Instadates in current week
  current_week_field_reports: number    // Field reports in current week
  // Weekly session streaks (2+ sessions OR 5+ approaches = active week)
  current_week_streak: number
  longest_week_streak: number
  last_active_week: string | null       // Last week that qualified as "active"
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
  last_approach_date?: string
  current_week?: string
  current_week_sessions?: number
  current_week_approaches?: number
  current_week_numbers?: number
  current_week_instadates?: number
  current_week_field_reports?: number
  current_week_streak?: number
  longest_week_streak?: number
  last_active_week?: string
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

export type MilestoneType =
  // Volume - Approaches
  | 'first_approach'
  | '5_approaches'
  | '10_approaches'
  | '25_approaches'
  | '50_approaches'
  | '100_approaches'
  | '250_approaches'
  | '500_approaches'
  | '1000_approaches'
  | '2000_approaches'
  | '5000_approaches'
  // Volume - Numbers
  | 'first_number'
  | '2_numbers'
  | '5_numbers'
  | '10_numbers'
  | '25_numbers'
  | '50_numbers'
  | '100_numbers'
  | '200_numbers'
  // Volume - Instadates
  | 'first_instadate'
  | '2_instadates'
  | '5_instadates'
  | '10_instadates'
  | '25_instadates'
  | '50_instadates'
  // Sessions
  | 'first_session'
  | '3_sessions'
  | '5_sessions'
  | '10_sessions'
  | '25_sessions'
  | '50_sessions'
  | '100_sessions'
  | 'first_5_approach_session'
  | 'first_10_approach_session'
  | 'first_goal_hit'
  // Weekly Streaks (2+ sessions OR 5+ approaches per week)
  | '2_week_streak'
  | '4_week_streak'
  | '8_week_streak'
  | '12_week_streak'
  | '26_week_streak'
  | '52_week_streak'
  // Reports & Reviews
  | 'first_field_report'
  | '5_field_reports'
  | '10_field_reports'
  | '25_field_reports'
  | '50_field_reports'
  | 'first_weekly_review'
  | 'monthly_unlocked'
  | 'quarterly_unlocked'
  // Fun/Variety
  | 'globetrotter'
  | 'consistent'
  | 'marathon'
  | 'weekend_warrior'
  // Comeback & Resilience
  | 'comeback_kid'
  | 'rejection_proof'
  | 'never_give_up'
  // Time-based
  | 'lunch_break_legend'
  | 'rush_hour_hero'
  | 'sunday_funday'
  | 'new_years_resolution'
  | 'valentines_warrior'
  // Efficiency
  | 'sniper'
  | 'hot_streak'
  | 'perfect_session'
  | 'instant_connection'
  | 'double_date'
  // Location variety
  | 'coffee_connoisseur'
  | 'bookworm'
  | 'street_smart'
  | 'mall_rat'
  | 'park_ranger'
  // Mindset & Growth
  | 'first_rejection'
  | '10_rejections'
  | '50_rejections'
  | '100_rejections'
  | 'first_blowout'
  | 'approach_anxiety_conquered'
  | 'zone_state'
  | 'flow_state'
  // Social (tracked via session with_wingman field)
  | 'wing_commander'        // First wingman session
  | '10_wingman_sessions'   // 10 wingman sessions
  | '25_wingman_sessions'   // 25 wingman sessions
  | 'first_double_set'      // First double set (2v2)
  | '10_double_sets'        // 10 double sets
  // Unique Set Types (tracked via approach set_type field)
  | 'first_two_set'         // First 2-set
  | 'first_group'           // First 3+ group
  | 'first_mixed_group'     // First mixed group
  | 'first_mom_daughter'    // First mom-daughter set
  | 'first_sisters'         // First sisters set
  | 'first_tourist'         // First tourist approach
  | 'first_moving_set'      // First moving set
  | 'first_seated'          // First seated set
  | '10_seated'             // 10 seated sets
  | 'first_foreign'         // First foreign language
  | 'polyglot'              // 5 different foreign language
  | 'seated_master'         // 25 seated sets
  | 'tourist_guide'         // 10 tourists
  | 'world_traveler'        // 25 tourists
  // Legacy (keep for backward compatibility)
  | 'first_date'
  | '7_day_streak'
  | '30_day_streak'
  | '100_day_streak'
  | 'mentor'

export interface MilestoneRow {
  id: string
  user_id: string
  milestone_type: MilestoneType
  achieved_at: string
  value: number | null
  session_id: string | null
  created_at: string
}

export interface MilestoneInsert {
  user_id: string
  milestone_type: MilestoneType
  value?: number
  session_id?: string
}

// ============================================
// Sticking Points
// ============================================

export type StickingPointStatus = 'active' | 'working_on' | 'resolved'

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

export interface ProgressSnapshot {
  stats: UserTrackingStatsRow
  recentSessions: SessionSummary[]
  recentMilestones: MilestoneRow[]
  weeklyStats: WeeklyStats[]
  dailyStats: DailyStats[]
}
