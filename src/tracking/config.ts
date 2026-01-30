import type { ApproachOutcome, SetType } from "@/src/db/trackingTypes"

/**
 * Tracking slice configuration
 *
 * Pure constants only - no JSX/React. Following QA slice pattern.
 * JSX components (like TEMPLATE_ICONS) are in components/templateIcons.tsx
 */

// ============================================
// Approach Tags
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
// Outcome Options
// ============================================

export const OUTCOME_OPTIONS: { value: ApproachOutcome; label: string; emoji: string; color: string }[] = [
  { value: "blowout", label: "Blowout", emoji: "💨", color: "bg-red-500/20 text-red-500 border-red-500/30" },
  { value: "short", label: "Short", emoji: "⏱️", color: "bg-orange-500/20 text-orange-500 border-orange-500/30" },
  { value: "good", label: "Good", emoji: "👍", color: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
  { value: "number", label: "Number", emoji: "📱", color: "bg-green-500/20 text-green-500 border-green-500/30" },
  { value: "instadate", label: "Instadate", emoji: "🎉", color: "bg-purple-500/20 text-purple-500 border-purple-500/30" },
]

// ============================================
// Mood Options
// ============================================

export const MOOD_OPTIONS = [
  { value: 1, emoji: "😫", label: "Rough" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "🔥", label: "On fire" },
]

// ============================================
// Set Type Options
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
// Session Settings
// ============================================

export const SESSION_CONFIG = {
  /** Minimum session duration in hours before calculating accurate approaches/hour */
  MIN_DURATION_FOR_RATE: 0.05, // 3 minutes

  /** Timer update interval in milliseconds */
  TIMER_INTERVAL_MS: 1000,

  /** Default session goal if not specified */
  DEFAULT_GOAL: 10,

  /** Goal presets for quick selection */
  GOAL_PRESETS: [5, 10, 15, 20, 30] as const,
} as const

// ============================================
// Stats & Milestones
// ============================================

export const MILESTONE_THRESHOLDS = {
  /** Total approach milestones */
  APPROACHES: [10, 25, 50, 100, 250, 500, 1000] as const,

  /** Session count milestones */
  SESSIONS: [5, 10, 25, 50, 100] as const,

  /** Streak milestones (consecutive days) */
  STREAKS: [3, 7, 14, 30, 60, 90] as const,

  /** Number close milestones */
  NUMBERS: [5, 10, 25, 50, 100] as const,
} as const

// ============================================
// Field Report Settings
// ============================================

export const FIELD_REPORT_CONFIG = {
  /** Maximum approaches to include in a single report */
  MAX_APPROACHES_PER_REPORT: 50,

  /** Minimum session duration to suggest field report (minutes) */
  MIN_SESSION_FOR_REPORT: 30,
} as const

// ============================================
// Review Settings
// ============================================

export const REVIEW_CONFIG = {
  /** Days to look back for weekly review */
  WEEKLY_LOOKBACK_DAYS: 7,

  /** Minimum sessions for meaningful weekly review */
  MIN_SESSIONS_FOR_REVIEW: 2,
} as const

// ============================================
// Field Report Template Display (pure data, no JSX)
// ============================================

export const TEMPLATE_COLORS: Record<string, { bg: string; icon: string; gradient: string }> = {
  "quick-log": {
    bg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: "bg-amber-500 text-white",
    gradient: "from-amber-500/30 via-amber-500/10 to-orange-500/20",
  },
  standard: {
    bg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: "bg-blue-500 text-white",
    gradient: "from-blue-500/30 via-blue-500/10 to-indigo-500/20",
  },
  "deep-dive": {
    bg: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    icon: "bg-purple-500 text-white",
    gradient: "from-purple-500/30 via-purple-500/10 to-pink-500/20",
  },
  blowout: {
    bg: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: "bg-red-500 text-white",
    gradient: "from-red-500/30 via-red-500/10 to-orange-500/20",
  },
  customizable: {
    bg: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    icon: "bg-cyan-500 text-white",
    gradient: "from-cyan-500/30 via-cyan-500/10 to-sky-500/20",
  },
  custom: {
    bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: "bg-emerald-500 text-white",
    gradient: "from-emerald-500/30 via-emerald-500/10 to-teal-500/20",
  },
}

export const TEMPLATE_TAGLINES: Record<string, string> = {
  "quick-log": "30 seconds. Just the essentials.",
  standard: "The sweet spot. Learn without overthinking.",
  "deep-dive": "When you got close. Extract every lesson.",
  blowout: "Rise from the ashes. Every master failed here first.",
  customizable: "Build your own. Pick the questions that matter to you.",
}

// ============================================
// Emoji Mood Options for Field Reports
// ============================================

export const MOOD_EMOJI_OPTIONS = [
  { value: 1, emoji: "😤", label: "Frustrated" },
  { value: 2, emoji: "😐", label: "Neutral" },
  { value: 3, emoji: "😊", label: "Good" },
  { value: 4, emoji: "🔥", label: "On Fire" },
] as const
