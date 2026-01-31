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

// ============================================================================
// Interactive World Map Configuration
// ============================================================================

export const MAP_CONFIG = {
  viewBox: "0 0 950 620",
  countryPreviewLimit: 6,
} as const

export const MAP_STYLES = {
  baseFill: "#cfe4ff",
  baseStroke: "rgba(17, 24, 39, 0.6)",
  hoverFill: "#fb923c",
  hoverStroke: "transparent",
  activeFill: "#f97316",
  activeStroke: "transparent",
  focusFill: "#ef4444",
  focusStroke: "#dc2626",
  primaryMutedFill: "#fa8f45",
  primaryMutedStroke: "#e0f2fe",
  secondaryFill: "#fa8f45",
  secondaryStroke: "#f5852f",
  secondaryFocusFill: "#f46969",
  secondaryFocusStroke: "#ef5252",
  arcticFill: "#93c5fd",
  arcticStroke: "#e0f2fe",
  arcticHoverFill: "#60a5fa",
  arcticHoverStroke: "#bae6fd",
} as const

export const MAP_MESSAGES = {
  locked: "Exotic - and very cold choice - not currently available as a dateable region.",
  lockedSmall: "Small or remote territory - not currently available as a dateable region.",
} as const
