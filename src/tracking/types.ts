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
// Quick Tags for approaches
// ============================================

export const APPROACH_TAGS = {
  time: ["day", "night"],
  social: ["solo", "with-wing"],
  movement: ["walking", "stationary"],
  location: ["street", "cafe", "store", "park", "transit"],
} as const

export type ApproachTagCategory = keyof typeof APPROACH_TAGS
export type ApproachTag = typeof APPROACH_TAGS[ApproachTagCategory][number]

// ============================================
// Outcome options
// ============================================

export const OUTCOME_OPTIONS: { value: ApproachOutcome; label: string; emoji: string; color: string }[] = [
  { value: "blowout", label: "Blowout", emoji: "💨", color: "bg-red-500/20 text-red-500 border-red-500/30" },
  { value: "short", label: "Short", emoji: "⏱️", color: "bg-orange-500/20 text-orange-500 border-orange-500/30" },
  { value: "good", label: "Good", emoji: "👍", color: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
  { value: "number", label: "Number", emoji: "📱", color: "bg-green-500/20 text-green-500 border-green-500/30" },
  { value: "instadate", label: "Instadate", emoji: "🎉", color: "bg-purple-500/20 text-purple-500 border-purple-500/30" },
]

// ============================================
// Mood options
// ============================================

export const MOOD_OPTIONS = [
  { value: 1, emoji: "😫", label: "Rough" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "🔥", label: "On fire" },
]

// ============================================
// Set Type options (for unique achievements)
// ============================================

export const SET_TYPE_OPTIONS: { value: SetType; label: string; emoji: string; description: string }[] = [
  { value: "solo", label: "Solo", emoji: "👤", description: "Standard 1-on-1 approach" },
  { value: "two_set", label: "2-Set", emoji: "👭", description: "Two girls together" },
  { value: "three_plus", label: "Group (3+)", emoji: "👥", description: "Group of three or more" },
  { value: "mixed_group", label: "Mixed Group", emoji: "🎭", description: "Group with guys and girls" },
  { value: "mom_daughter", label: "Mom & Daughter", emoji: "👩‍👧", description: "Mother-daughter pair" },
  { value: "sisters", label: "Sisters", emoji: "👯‍♀️", description: "Sisters together" },
  { value: "tourist", label: "Tourist", emoji: "🗺️", description: "Tourist or traveler" },
  { value: "moving", label: "Moving Set", emoji: "🏃‍♀️", description: "Walking/jogging - had to stop them" },
  { value: "seated", label: "Seated", emoji: "🪑", description: "Seated at cafe, bench, etc." },
  { value: "working", label: "Working", emoji: "👔", description: "At work (barista, retail, etc.)" },
  { value: "gym", label: "Gym", emoji: "🏋️", description: "At the gym" },
  { value: "foreign_language", label: "Foreign Language", emoji: "🗣️", description: "Different language spoken" },
  { value: "celebrity_vibes", label: "Model/Celebrity", emoji: "⭐", description: "Model or celebrity lookalike" },
  { value: "double_set", label: "Double Set", emoji: "👯", description: "With wingman (2v2)" },
  { value: "triple_set", label: "Triple Set", emoji: "🎯", description: "With wing (2v3+)" },
]

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
