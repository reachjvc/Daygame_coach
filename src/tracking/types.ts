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

// Re-export config-derived types (constants are in config.tsx)
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
  note?: string
  latitude?: number
  longitude?: number
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

export interface SessionSummaryData {
  approachCount: number
  duration: number | null
  location: string | null
  outcomes: Record<ApproachOutcome, number>
  averageMood: number | null
  tags: string[]
  startedAt: string
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
