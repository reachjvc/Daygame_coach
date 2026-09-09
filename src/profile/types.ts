/**
 * NOTE ON THE TWO ONBOARDING TYPES AT THE BOTTOM OF THIS FILE.
 *
 * They live here, and their companion constant lives in config.ts, because
 * `OnboardingFlow` is a client component and cannot import from
 * `profileService.ts` -- that module reaches `next/headers` through
 * `@/src/db/server`, and pulling it into the browser bundle breaks the build
 * with "You're importing a component that needs next/headers". A type-only
 * import would have been erased and been fine; the constant is a value, so it
 * could not be. This file has no imports at all, which is what makes it safe.
 */

export interface UserProfile {
  id: string
  age_range_start: number
  age_range_end: number
  archetype: string
  secondary_archetype?: string | null
  tertiary_archetype?: string | null
  dating_foreigners: boolean
  user_is_foreign?: boolean
  preferred_region?: string
  secondary_region?: string
  experience_level?: string
  primary_goal?: string
  has_purchased: boolean
  level: number
  xp: number
  scenarios_completed: number
}

export interface ProfileUpdates {
  age_range_start?: number
  age_range_end?: number
  archetype?: string
  secondary_archetype?: string | null
  tertiary_archetype?: string | null
  dating_foreigners?: boolean
  user_is_foreign?: boolean
  preferred_region?: string
  secondary_region?: string | null
  experience_level?: string
  primary_goal?: string
  level?: number
}

export interface Archetype {
  name: string
  vibe: string
  barrier: string
  image: string | null
}

export interface Region {
  id: string
  name: string
  description: string
}


/** What the onboarding flow starts from, and reads back for an existing user. */
export interface OnboardingInitialValues {
  ageRangeStart: number | null
  ageRangeEnd: number | null
  userIsForeign: boolean | null
  datingForeigners: boolean | null
  region: string | null
  /** Optional second region. scenariosService reads it when building a scenario. */
  secondaryRegion: string | null
  archetypes: string[]
  primaryGoal: string | null
}

/**
 * The profile columns the onboarding flow reads back. Structural, so any row
 * shape carrying these works and the service stays free of DB row types.
 */
export interface OnboardingProfileColumns {
  age_range_start?: number | null
  age_range_end?: number | null
  user_is_foreign?: boolean | null
  dating_foreigners?: boolean | null
  preferred_region?: string | null
  secondary_region?: string | null
  archetype?: string | null
  secondary_archetype?: string | null
  tertiary_archetype?: string | null
  primary_goal?: string | null
}
