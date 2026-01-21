import { createServerSupabaseClient } from "@/src/db/server"
import { REGIONS } from "@/src/profile/data/regions"

/**
 * Service layer for profile business logic.
 * Server actions call these functions; they contain pure business logic
 * without Next.js-specific concerns like redirect() or revalidatePath().
 */

// ============================================================================
// Types
// ============================================================================

export interface OnboardingData {
  ageRangeStart: number
  ageRangeEnd: number
  userIsForeign: boolean
  datingForeigners: boolean
  region: string
  archetype: string
  secondaryArchetype: string | null
  tertiaryArchetype: string | null
  experienceLevel: string
  primaryGoal: string
}

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
// Validation Sets
// ============================================================================

const BOOLEAN_PREFERENCE_KEYS = new Set(["user_is_foreign", "dating_foreigners"])

const EXPERIENCE_LEVELS = new Set([
  "complete-beginner",
  "newbie",
  "intermediate",
  "advanced",
  "expert",
])

const PRIMARY_GOALS = new Set([
  "get-numbers",
  "have-conversations",
  "build-confidence",
  "find-dates",
])

const VALID_REGION_IDS = new Set<string>(REGIONS.map((region) => region.id))

// ============================================================================
// Internal DB Helpers
// ============================================================================

interface ProfileRecord {
  preferred_region?: string | null
  secondary_region?: string | null
}

/**
 * Get a user's profile (partial fields needed for service logic).
 * Internal helper - matches original actions.ts behavior.
 */
async function getProfileFields(
  userId: string,
  fields: (keyof ProfileRecord)[]
): Promise<ProfileRecord | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("profiles")
    .select(fields.join(","))
    .eq("id", userId)
    .single()

  if (error) {
    console.error("Error loading profile:", error)
    throw new ProfileServiceError("Failed to load profile", "PROFILE_LOAD_FAILED")
  }

  return data as unknown as ProfileRecord | null
}

/**
 * Update a user's profile.
 * Internal helper - matches original actions.ts behavior with raw Supabase updates.
 */
async function updateProfileDb(
  userId: string,
  updates: ProfileDbUpdates
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)

  if (error) {
    console.error("Error updating profile:", error)
    throw new ProfileServiceError("Failed to update profile", "PROFILE_UPDATE_FAILED")
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map experience level to initial user level.
 */
export function getInitialLevelFromExperience(experienceLevel: string): number {
  switch (experienceLevel) {
    case "complete-beginner":
      return 1
    case "newbie":
      return 3
    case "intermediate":
      return 7
    case "advanced":
      return 12
    case "expert":
      return 18
    default:
      return 1
  }
}

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

  const clampedStart = Math.max(18, Math.min(start, 45))
  const clampedEnd = Math.max(18, Math.min(end, 45))

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
 * Complete the onboarding process for a user.
 * Sets all initial profile fields and marks onboarding as completed.
 */
export async function completeOnboardingForUser(
  userId: string,
  data: OnboardingData
): Promise<void> {
  const sanitized = sanitizeArchetypes({
    archetype: data.archetype,
    secondaryArchetype: data.secondaryArchetype,
    tertiaryArchetype: data.tertiaryArchetype,
  })

  const initialLevel = getInitialLevelFromExperience(data.experienceLevel)

  await updateProfileDb(userId, {
    age_range_start: data.ageRangeStart,
    age_range_end: data.ageRangeEnd,
    user_is_foreign: data.userIsForeign,
    dating_foreigners: data.datingForeigners,
    preferred_region: data.region,
    archetype: sanitized.archetype,
    secondary_archetype: sanitized.secondaryArchetype,
    tertiary_archetype: sanitized.tertiaryArchetype,
    experience_level: data.experienceLevel,
    primary_goal: data.primaryGoal,
    level: initialLevel,
    onboarding_completed: true,
  })
}

/**
 * Update secondary region for a user.
 * Ensures secondary region differs from primary region.
 */
export async function updateSecondaryRegionForUser(
  userId: string,
  secondaryRegion: string | null
): Promise<void> {
  const profile = await getProfileFields(userId, ["preferred_region"])
  if (!profile) {
    throw new ProfileServiceError("Profile not found", "PROFILE_NOT_FOUND")
  }

  const primaryRegion = profile.preferred_region || null
  const nextSecondary =
    secondaryRegion && secondaryRegion !== primaryRegion ? secondaryRegion : null

  await updateProfileDb(userId, { secondary_region: nextSecondary })
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

  const profile = await getProfileFields(userId, ["secondary_region"])
  if (!profile) {
    throw new ProfileServiceError("Profile not found", "PROFILE_NOT_FOUND")
  }

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

  const profile = await getProfileFields(userId, ["preferred_region"])
  if (!profile) {
    throw new ProfileServiceError("Profile not found", "PROFILE_NOT_FOUND")
  }

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
