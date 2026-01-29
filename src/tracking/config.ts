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
