import { getProfile, updateProfile } from "@/src/db/server"
// Re-exported, not redefined. The gate is a client component and cannot import
// from this module -- it reaches next/headers through @/src/db/server -- so the
// type lives in types.ts and the constant in config.ts, both server-free.
import { EMPTY_ONBOARDING_VALUES } from "@/src/profile/config"
import type {
  OnboardingInitialValues,
  OnboardingProfileColumns,
} from "@/src/profile/types"

export {
  EMPTY_ONBOARDING_VALUES,
  type OnboardingInitialValues,
  type OnboardingProfileColumns,
}
import {
  hasDatingPreferences,
  BOOLEAN_PREFERENCE_KEYS,
  EXPERIENCE_LEVELS,
  PRIMARY_GOALS,
  VALID_REGION_IDS,
  AGE_RANGE,
} from "@/src/profile/config"

/**
 * Service layer for profile business logic.
 * Server actions call these functions; they contain pure business logic
 * without Next.js-specific concerns like redirect() or revalidatePath().
 */

// ============================================================================
// Types
// ============================================================================

export interface ArchetypeData {
  archetype: string
  secondaryArchetype: string | null
  tertiaryArchetype: string | null
}

export interface PreferenceUpdate {
  key: string
  value: string
}

/** Internal type for profile updates matching the database schema */
type ProfileDbUpdates = Record<string, unknown>

// ============================================================================
// Internal DB Helpers (using profilesRepo)
// ============================================================================

/**
 * Get a user's profile.
 * Wraps repo function with service-specific error handling.
 */
async function getProfileForService(userId: string) {
  try {
    const profile = await getProfile(userId)
    if (!profile) {
      throw new ProfileServiceError("Profile not found", "PROFILE_NOT_FOUND")
    }
    return profile
  } catch (error) {
    if (error instanceof ProfileServiceError) throw error
    console.error("Error loading profile:", error)
    throw new ProfileServiceError("Failed to load profile", "PROFILE_LOAD_FAILED")
  }
}

/**
 * Update a user's profile.
 * Wraps repo function with service-specific error handling.
 */
async function updateProfileDb(
  userId: string,
  updates: ProfileDbUpdates
): Promise<void> {
  try {
    await updateProfile(userId, updates)
  } catch (error) {
    console.error("Error updating profile:", error)
    throw new ProfileServiceError("Failed to update profile", "PROFILE_UPDATE_FAILED")
  }
}

// ============================================================================
// Helper Functions
// ============================================================================


/**
 * Sanitize archetype selections to prevent duplicates.
 * Returns null for secondary/tertiary if they match primary or each other.
 */
export function sanitizeArchetypes(data: ArchetypeData): ArchetypeData {
  const { archetype, secondaryArchetype: secRaw, tertiaryArchetype: tertRaw } = data

  const secondaryArchetype =
    secRaw && secRaw !== archetype ? secRaw : null

  const tertiaryArchetype =
    tertRaw && tertRaw !== archetype && tertRaw !== secondaryArchetype
      ? tertRaw
      : null

  return { archetype, secondaryArchetype, tertiaryArchetype }
}

/**
 * Validate and clamp age range values.
 */
export function validateAgeRange(start: number, end: number): { start: number; end: number } {
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new ProfileServiceError("Invalid age range", "INVALID_AGE_RANGE")
  }

  const clampedStart = Math.max(AGE_RANGE.MIN, Math.min(start, AGE_RANGE.MAX))
  const clampedEnd = Math.max(AGE_RANGE.MIN, Math.min(end, AGE_RANGE.MAX))

  return {
    start: Math.min(clampedStart, clampedEnd),
    end: Math.max(clampedStart, clampedEnd),
  }
}

/**
 * Validate region ID.
 */
export function validateRegion(regionId: string): void {
  if (!VALID_REGION_IDS.has(regionId)) {
    throw new ProfileServiceError("Invalid region", "INVALID_REGION")
  }
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Read a saved profile back into the answers the dating-preferences gate holds.
 *
 * ONLY FOR A PROFILE THAT ACTUALLY CARRIES THEM, and that question has exactly
 * one owner: `hasDatingPreferences`. It used to key off `onboarding_completed`,
 * which is now legacy -- see the note on that function. The trap it guards is
 * unchanged: `user_is_foreign` defaults to `false` in the database, so on a row
 * nobody has filled in it is indistinguishable from a real "No, I'm local", and
 * prefilling from it would pre-answer a question the user has never seen.
 */
export function toOnboardingInitialValues(
  profile: OnboardingProfileColumns | null | undefined
): OnboardingInitialValues {
  // The `!profile` half is what lets TypeScript narrow below; the predicate
  // returns a plain boolean, so on its own it proves nothing to the compiler.
  if (!profile || !hasDatingPreferences(profile)) {
    return EMPTY_ONBOARDING_VALUES
  }

  const text = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : null
  const flag = (value: unknown) => (typeof value === "boolean" ? value : null)
  const count = (value: unknown) => (typeof value === "number" ? value : null)

  return {
    ageRangeStart: count(profile.age_range_start),
    ageRangeEnd: count(profile.age_range_end),
    userIsForeign: flag(profile.user_is_foreign),
    datingForeigners: flag(profile.dating_foreigners),
    region: text(profile.preferred_region),
    secondaryRegion: profile.secondary_region ?? null,
    // Order is the priority the user chose; gaps are dropped, never padded.
    archetypes: [
      text(profile.archetype),
      text(profile.secondary_archetype),
      text(profile.tertiary_archetype),
    ].filter((name): name is string => name !== null),
    primaryGoal: text(profile.primary_goal),
  }
}

export interface DatingPreferences {
  region: string
  archetypes: string[]
  userIsForeign: boolean
  datingForeigners: boolean
  /** Decides which archetype photographs are shown. The gate used to READ this
   *  and never ask for it, so a new account was shown a default set. */
  ageRangeStart: number
  ageRangeEnd: number
  /** Optional second region. `scenariosService` reads `secondary_region`
   *  (line 141) and nothing in the app ever asked for it. */
  secondaryRegion: string | null
}

/**
 * Save the four answers the scenario generator needs, and nothing else.
 *
 * WRITES ONLY WHAT IT WAS GIVEN. The five-step wizard this replaces wrote every
 * field it held on submit, so editing one thing reset the rest to the form's
 * hardcoded defaults -- a saved 20-25 age range became 22-25 and the second and
 * third archetypes were erased, measured on a real account 2026-09-07. Age range,
 * primary goal, level and timezone are not this function's business, so they are
 * not in the update at all and cannot be clobbered by it.
 */
export async function saveDatingPreferencesForUser(
  userId: string,
  data: DatingPreferences
): Promise<void> {
  validateRegion(data.region)
  if (data.secondaryRegion) validateRegion(data.secondaryRegion)
  const age = validateAgeRange(data.ageRangeStart, data.ageRangeEnd)

  if (data.archetypes.length === 0) {
    throw new ProfileServiceError("Archetype is required", "ARCHETYPE_REQUIRED")
  }

  const sanitized = sanitizeArchetypes({
    archetype: data.archetypes[0],
    secondaryArchetype: data.archetypes[1] ?? null,
    tertiaryArchetype: data.archetypes[2] ?? null,
  })

  await updateProfileDb(userId, {
    preferred_region: data.region,
    archetype: sanitized.archetype,
    secondary_archetype: sanitized.secondaryArchetype,
    tertiary_archetype: sanitized.tertiaryArchetype,
    user_is_foreign: data.userIsForeign,
    dating_foreigners: data.datingForeigners,
    age_range_start: age.start,
    age_range_end: age.end,
    /* Cleared when it matches the primary: the same region twice is not a
       second preference, and updateSecondaryRegionDirectForUser already treats
       that pair as "none". One rule, one behaviour. */
    secondary_region:
      data.secondaryRegion && data.secondaryRegion !== data.region
        ? data.secondaryRegion
        : null,
  })
}

/**
 * Update a single preference field.
 * Validates the preference key and value.
 */
export async function updatePreferenceForUser(
  userId: string,
  preference: PreferenceUpdate
): Promise<void> {
  const { key, value } = preference
  const updates: ProfileDbUpdates = {}

  if (BOOLEAN_PREFERENCE_KEYS.has(key)) {
    updates[key] = value === "true"
  } else if (key === "experience_level") {
    if (!EXPERIENCE_LEVELS.has(value)) {
      throw new ProfileServiceError("Invalid experience level", "INVALID_EXPERIENCE_LEVEL")
    }
    updates[key] = value
  } else if (key === "primary_goal") {
    if (!PRIMARY_GOALS.has(value)) {
      throw new ProfileServiceError("Invalid primary goal", "INVALID_PRIMARY_GOAL")
    }
    updates[key] = value
  } else {
    throw new ProfileServiceError("Invalid preference key", "INVALID_PREFERENCE_KEY")
  }

  await updateProfileDb(userId, updates)
}

/**
 * Update preferred (primary) region for a user.
 * Clears secondary region if it matches the new primary.
 */
export async function updatePreferredRegionForUser(
  userId: string,
  regionId: string
): Promise<void> {
  validateRegion(regionId)

  const profile = await getProfileForService(userId)

  const updates: ProfileDbUpdates = { preferred_region: regionId }
  if (profile.secondary_region === regionId) {
    updates.secondary_region = null
  }

  await updateProfileDb(userId, updates)
}

/**
 * Update secondary region directly (from map selection).
 * Validates region and ensures it differs from primary.
 */
export async function updateSecondaryRegionDirectForUser(
  userId: string,
  regionId: string | null
): Promise<void> {
  if (regionId) {
    validateRegion(regionId)
  }

  const profile = await getProfileForService(userId)

  const nextSecondary =
    regionId && regionId !== profile.preferred_region ? regionId : null

  await updateProfileDb(userId, { secondary_region: nextSecondary })
}

/**
 * Update age range for a user.
 * Validates and clamps values to 18-45 range.
 */
export async function updateAgeRangeForUser(
  userId: string,
  ageRangeStart: number,
  ageRangeEnd: number
): Promise<void> {
  const { start, end } = validateAgeRange(ageRangeStart, ageRangeEnd)
  await updateProfileDb(userId, { age_range_start: start, age_range_end: end })
}

/**
 * Update archetypes for a user.
 * Sanitizes to prevent duplicate selections.
 */
export async function updateArchetypesForUser(
  userId: string,
  data: ArchetypeData
): Promise<void> {
  if (!data.archetype) {
    throw new ProfileServiceError("Archetype is required", "ARCHETYPE_REQUIRED")
  }

  const sanitized = sanitizeArchetypes(data)

  await updateProfileDb(userId, {
    archetype: sanitized.archetype,
    secondary_archetype: sanitized.secondaryArchetype,
    tertiary_archetype: sanitized.tertiaryArchetype,
  })
}

// ============================================================================
// Error Class
// ============================================================================

/**
 * Custom error class for profile service errors.
 */
export class ProfileServiceError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "ProfileServiceError"
    this.code = code
  }
}
