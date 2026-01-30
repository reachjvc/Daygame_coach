import {
  Zap,
  FileText,
  Microscope,
  Flame,
  Settings2,
} from "lucide-react"

/**
 * Tracking slice configuration
 *
 * Note: Some config-like constants (APPROACH_TAGS, OUTCOME_OPTIONS, MOOD_OPTIONS,
 * SET_TYPE_OPTIONS) are currently in types.ts. They remain there because they're
 * tightly coupled to type definitions. Consider consolidating in a future refactor.
 */

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
// Field Report Template Display
// ============================================

export const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  "quick-log": <Zap className="size-6" />,
  standard: <FileText className="size-6" />,
  "deep-dive": <Microscope className="size-6" />,
  blowout: <Flame className="size-6" />,
  custom: <Settings2 className="size-6" />,
}

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
}
