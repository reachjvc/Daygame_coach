import { REGIONS } from "@/src/profile/data/regions"
import type { OnboardingInitialValues } from "@/src/profile/types"

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
// Onboarding Steps
// ============================================================================

// ============================================================================
// Dating preferences (the scenario gate)
// ============================================================================

/**
 * Does this profile carry the answers the scenario generator needs?
 *
 * THE ONE RULE, DERIVED FROM THE DATA -- deliberately NOT a stored flag.
 * `onboarding_completed` used to gate the dashboard, the Lair, Inner Game, the
 * post-login redirect AND scenarios, so a dating questionnaire blocked three
 * features that never read a single one of its answers. It is now legacy: only
 * `scenariosService` consumes these columns, so only scenarios asks for them,
 * and it asks by looking at the columns themselves. A separate boolean would be
 * a second copy of this fact, free to drift out of step with it.
 *
 * `user_is_foreign` IS NOT PART OF THE CHECK. It defaults to `false` in the
 * database, so on a row nobody has filled in it is indistinguishable from a real
 * "No, I'm local" -- it can never prove the question was asked. The other three
 * are null until answered.
 *
 * Verified against the live database 2026-09-08: all four real accounts carry
 * all three, so this fires for nobody who has already answered.
 */
export function hasDatingPreferences(
  profile:
    | {
        preferred_region?: string | null
        archetype?: string | null
        dating_foreigners?: boolean | null
      }
    | null
    | undefined
): boolean {
  if (!profile) return false
  return (
    typeof profile.preferred_region === "string" &&
    VALID_REGION_IDS.has(profile.preferred_region) &&
    typeof profile.archetype === "string" &&
    profile.archetype.length > 0 &&
    typeof profile.dating_foreigners === "boolean"
  )
}

export const ONBOARDING_STEPS = [1, 2, 3, 4, 5] as const
export const FIRST_ONBOARDING_STEP = ONBOARDING_STEPS[0]
export const LAST_ONBOARDING_STEP = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1]

/**
 * Turn anything at all -- a `?step=` query value, a stale link, a hand-typed
 * URL -- into a step that exists.
 *
 * ONE OWNER, BECAUSE THE OLD TWO DISAGREED. The page did
 * `Math.min(Math.max(Number(raw), 1), 5)` and the component did the same again.
 * Both are transparent to NaN: `Number("abc")` is NaN, every comparison with it
 * is false, so NaN came out of both clamps unchanged and rendered "Step NaN of
 * 5" -- a blank screen with a Back button that did nothing. Anything that is not
 * a whole number in range is the first step, which is always safe.
 */
export function parseOnboardingStep(raw: unknown): number {
  const value = typeof raw === "number" ? raw : Number(raw)
  if (!Number.isInteger(value)) return FIRST_ONBOARDING_STEP
  if (value < FIRST_ONBOARDING_STEP) return FIRST_ONBOARDING_STEP
  if (value > LAST_ONBOARDING_STEP) return LAST_ONBOARDING_STEP
  return value
}


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


/**
 * Nothing answered. What signup starts from, and what a half-built row falls
 * back to. Here rather than in profileService.ts because the browser needs it:
 * see the note at the top of types.ts.
 */
export const EMPTY_ONBOARDING_VALUES: OnboardingInitialValues = {
  ageRangeStart: null,
  ageRangeEnd: null,
  userIsForeign: null,
  datingForeigners: null,
  region: null,
  archetypes: [],
  primaryGoal: null,
}
