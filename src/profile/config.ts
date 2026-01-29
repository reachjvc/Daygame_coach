import { REGIONS } from "@/src/profile/data/regions"

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Profile preference keys that expect boolean values.
 */
export const BOOLEAN_PREFERENCE_KEYS = new Set([
  "user_is_foreign",
  "dating_foreigners",
])

/**
 * Valid experience level values for user profiles.
 */
export const EXPERIENCE_LEVELS = new Set([
  "complete-beginner",
  "newbie",
  "intermediate",
  "advanced",
  "expert",
])

/**
 * Valid primary goal values for user profiles.
 */
export const PRIMARY_GOALS = new Set([
  "get-numbers",
  "have-conversations",
  "build-confidence",
  "find-dates",
])

/**
 * Valid region IDs derived from regions data.
 */
export const VALID_REGION_IDS = new Set<string>(REGIONS.map((region) => region.id))

// ============================================================================
// Age Range Configuration
// ============================================================================

export const AGE_RANGE = {
  MIN: 18,
  MAX: 45,
} as const

// ============================================================================
// Level Mapping
// ============================================================================

/**
 * Maps experience levels to initial user levels.
 */
export const EXPERIENCE_TO_LEVEL: Record<string, number> = {
  "complete-beginner": 1,
  "newbie": 3,
  "intermediate": 7,
  "advanced": 12,
  "expert": 18,
}

export const DEFAULT_INITIAL_LEVEL = 1
