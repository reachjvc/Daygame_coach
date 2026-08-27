import type { ReactNode } from "react"
import type {
  SessionRow,
  ApproachRow,
  ApproachOutcome,
  SetType,
  UserTrackingStatsRow,
  SessionSummary,
} from "@/src/db/trackingTypes"

// Re-export database types that UI needs
export type { SessionRow, ApproachRow, ApproachOutcome, SetType, UserTrackingStatsRow, SessionSummary }

// Re-export const arrays and type guards from canonical enum source
export {
  APPROACH_OUTCOMES, SET_TYPES, REVIEW_TYPES, FIELD_TYPES,
  STICKING_POINT_STATUSES, SESSION_END_REASONS,
  isKnownOutcome, isKnownSetType, isKnownReviewType,
  isKnownFieldType, isKnownStickingPointStatus, isKnownSessionEndReason,
} from "@/src/db/trackingEnums"
export type { ReviewType, FieldType, StickingPointStatus, SessionEndReason } from "@/src/db/trackingEnums"

// Re-export config-derived types (constants are in config.ts)
export type { ApproachTagCategory, ApproachTag } from "./config"

// ============================================
// Session Tracker State
// ============================================

export interface SessionState {
  session: SessionRow | null
  approaches: ApproachRow[]
  isActive: boolean
  isLoading: boolean
  error: string | null
}

export interface ApproachFormData {
  outcome?: ApproachOutcome
  set_type?: SetType
  tags?: string[]
  mood?: number
  quality?: number
  note?: string
  latitude?: number
  longitude?: number
  voice_note_url?: string
}

// ============================================
// Live Stats Display
// ============================================

export interface LiveStats {
  totalApproaches: number
  sessionDuration: string
  approachesPerHour: number
  timeSinceLastApproach: string | null
  outcomeBreakdown: Record<ApproachOutcome, number>
  goalProgress: {
    current: number
    target: number | null
    percentage: number
  }
  comparisonToAverage: {
    difference: number
    direction: "ahead" | "behind" | "on-pace"
  } | null
}

// ============================================
// Session Goal
// ============================================

export interface SessionGoal {
  target: number
  type: "approaches" | "time"
}

// ============================================
// Field Report Types
// ============================================

export interface ApproachMoodEntry {
  approachNumber: number
  mood: number | null
  timestamp: string
}

export interface ApproachNoteEntry {
  approachNumber: number
  note: string
}

export interface SessionSummaryData {
  // Basic stats
  approachCount: number
  duration: number | null
  location: string | null
  outcomes: Record<ApproachOutcome, number>
  averageMood: number | null
  tags: string[]
  startedAt: string
  // Pre-session intentions
  goal: number | null
  preSessionMood: number | null
  sessionFocus: string | null
  techniqueFocus: string | null
  ifThenPlan: string | null
  customIntention: string | null
  // Per-approach mood timeline
  approachMoods: ApproachMoodEntry[]
  // Per-approach notes (voice transcriptions)
  approachNotes: ApproachNoteEntry[]
}

// ============================================
// Principles (Research-backed reflection)
// ============================================

export interface PrincipleCategory {
  id: string
  name: string
  description: string
}

export interface Principle {
  id: string
  number: number
  title: string
  description: string
  source: string
  category: string
  icon: ReactNode
  insight?: string
  stat?: string
  /** Goal categories this principle applies to (for showing tips during goal creation) */
  goalCategories?: string[]
}

// ============================================
// Key Stats (Research stats display)
// ============================================

export interface KeyStatNerdBox {
  primaryStudy: string
  keyQuote?: string
  whyItWorks: string[]
  alsoSupportedBy: string[]
  topPerformers?: string
}

export interface KeyStat {
  id: string
  value: string
  label: string
  detail: string
  hoverPreview: string
  fullDescription: string
  icon: ReactNode
  nerdBox: KeyStatNerdBox
}

// ============================================
// Custom Report Builder Types
// ============================================

/**
 * Field categories for organizing the field library.
 * Used in the custom report builder to group fields.
 */
export type FieldCategory =
  | "quick_capture"     // Fast fields for quick logs
  | "emotional"         // Mood, feelings, emotional processing
  | "analysis"          // Deep thinking, patterns, insights
  | "action"            // What to do next, changes, plans
  | "context"           // Location, time, energy, external factors
  | "skill"             // Technique, deliberate practice
  | "cognitive"         // CBT, reframes, thought patterns

/**
 * Extended field definition with category and metadata.
 * Used in the custom report builder's field library.
 */
export interface FieldDefinition {
  id: string
  type: "text" | "textarea" | "number" | "select" | "multiselect" | "scale" | "datetime" | "list" | "tags" | "audio"
  label: string
  placeholder?: string
  required?: boolean
  options?: string[]  // For select/multiselect
  min?: number        // For scale/number
  max?: number        // For scale/number
  rows?: number       // For textarea
  count?: number      // For list type
  category: FieldCategory
  description: string
  usedIn: string[]    // Template names that use this field
}

/**
 * Category metadata for display in the field library.
 * Icons are handled separately in categoryIcons.tsx
 */
export interface CategoryInfo {
  label: string
  color: string
  description: string
}

/**
 * Configuration for a custom report template.
 * Used when saving/loading user's custom report configurations.
 */
export interface CustomReportConfig {
  name: string
  description?: string
  fields: FieldDefinition[]
  estimatedMinutes?: number
}

// ============================================
// Conversation Audio Upload Types
// ============================================

/** Value for a conversation field that has an audio attachment */
export interface ConversationFieldValue {
  text: string
  audioUrl: string | null
  audioFileName: string | null
  transcribedAt: string | null
}

/** Result from uploading and transcribing an audio file */
export interface AudioUploadResult {
  transcription: string
  audioBlobUrl: string
}

// ============================================
// Voice Recorder Types
// ============================================

export interface VoiceRecorderResult {
  audioBlob: Blob
  transcription: string
}

export interface UseVoiceRecorderReturn {
  isRecording: boolean
  isTranscribing: boolean
  duration: number
  error: string | null
  transcription: string
  startRecording: () => Promise<void>
  stopRecording: () => Promise<VoiceRecorderResult | null>
  cancelRecording: () => void
  clearError: () => void
  isSupported: boolean
  isTranscriptionSupported: boolean
}

// ============================================
// Daily-to-Weekly Aggregation
// ============================================

export interface DailyWeekSummary {
  count: number
  avgEnergy: number | null
  avgDayRating: number | null
  avgProcessRating: number | null
  processOutcomeGap: number | null
  blockers: string[]
  valuesAlignment: { toward: number; neutral: number; away: number }
  gladMoments: string[]
  lowDays: number
}

// FireStreakBadge
export interface FireStreakBadgeProps {
  /** Current consecutive-week streak */
  streak: number
  /** Personal best streak (optional, shown when provided) */
  bestStreak?: number
  /** "pill" = compact inline, "card" = full-width milestone-style card */
  variant?: "pill" | "card"
}

// ============================================
// Metric catalogue & dashboard widgets
// ============================================

/**
 * What span of time a metric answers for.
 * - `weekly` / `monthly` reset with the period
 * - `cumulative` is lifetime
 * - `current` is a latest-reading (body weight)
 * - `streak` counts consecutive periods
 */
export type MetricWindow = "daily" | "weekly" | "monthly" | "cumulative" | "current" | "streak"

/** How a raw number is rendered. Drives the unit suffix and rounding. */
export type MetricFormat =
  | "count" | "hours" | "minutes" | "kg" | "km"
  | "percent" | "rating" | "weeks" | "days" | "reps"

/** Where the number comes from. Each source has one fetch path in metricsRepo. */
export type MetricSource = "tracking_stats" | "approaches" | "health" | "scenarios" | "goal"

/**
 * One trackable thing, described well enough to put in a picker.
 *
 * Every value in LINKED_METRICS has an entry here, so a goal's `linked_metric`
 * always names a catalogue entry. The reverse does not hold: entries with
 * `linkedMetric: null` (week streak, unique locations) can be shown on the
 * dashboard but cannot back a goal, because nothing syncs them to goal progress.
 */
export interface MetricDef {
  id: string
  /** Full sentence-ish name for the picker: "Approaches this week". */
  label: string
  /** Short name for a tile, where the window is implied by context. */
  tileLabel: string
  /** LifeAreaId — which area's section of the picker this shows under. */
  area: string
  /** Sub-heading inside the area, e.g. "Field work", "Strength". */
  group: string
  window: MetricWindow
  format: MetricFormat
  /** One line explaining what is counted, shown under the label in the picker. */
  description: string
  source: MetricSource
  /** The goal-sync metric this is the same number as, or null if none exists. */
  linkedMetric: import("@/src/db/goalTypes").LinkedMetric
  icon: import("lucide-react").LucideIcon
  /** Tailwind text colour class for the icon, matching the life area. */
  accent: string
}

/** The five ways a goal can be read as a metric when it has no backend of its own. */
export type GoalMetricView = "period" | "streak" | "percent" | "total" | "best"

/**
 * A resolved reading. `value: null` means the source produced nothing — a tile
 * renders "—" and `reason`, never a zero it made up.
 */
export interface MetricValue {
  id: string
  value: number | null
  /** Why the value is null. Required whenever value is null. */
  reason?: string
  /** Goal target, for goal-derived metrics that have one. */
  target?: number | null
  /** Overrides the catalogue label — carries the goal's own title. */
  label?: string
  format?: MetricFormat
}

export type DashboardWidgetType = "metric_tile"

/** One widget in one slot of one dashboard. Mirrors a dashboard_widgets row. */
export interface DashboardWidget {
  id: string
  dashboard_key: string
  position: number
  widget_type: DashboardWidgetType
  metric_id: string | null
  config: Record<string, unknown>
}

/** What the client sends to replace a layout. Position is the array index. */
export interface DashboardWidgetInput {
  widget_type: DashboardWidgetType
  metric_id: string | null
  config?: Record<string, unknown>
}

/** GET /api/tracking/dashboard — the layout plus a reading for each widget. */
export interface DashboardLayoutResponse {
  widgets: DashboardWidget[]
  values: MetricValue[]
}
