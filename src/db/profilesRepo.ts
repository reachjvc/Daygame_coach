import { createServerSupabaseClient } from "./supabase"
import type { ProfileRow, ProfileUpdate } from "./types"

/**
 * Repository for profiles table (user data).
 * All user profile operations go through here.
 */

/**
 * Get a user's profile by their user ID.
 * Returns null if profile doesn't exist.
 */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned - profile doesn't exist
      return null
    }
    throw new Error(`Failed to get profile: ${error.message}`)
  }

  return data as ProfileRow
}

/**
 * Update a user's profile.
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<ProfileRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  return data as ProfileRow
}

/**
 * Check if a user has purchased (is premium).
 */
export async function hasPurchased(userId: string): Promise<boolean> {
  const profile = await getProfile(userId)
  return profile?.has_purchased ?? false
}

/**
 * Update a user's XP and level.
 */
export async function updateUserProgress(
  userId: string,
  xpToAdd: number
): Promise<{ xp: number; level: number }> {
  const profile = await getProfile(userId)
  if (!profile) {
    throw new Error("Profile not found")
  }

  const currentXp = profile.xp ?? 0
  const newXp = currentXp + xpToAdd
  const newLevel = calculateLevel(newXp)

  const updated = await updateProfile(userId, {
    xp: newXp,
    level: newLevel,
  })

  return {
    xp: updated.xp ?? 0,
    level: updated.level ?? 1,
  }
}

/**
 * Calculate level from XP.
 * Simple formula: level = floor(xp / 100) + 1
 */
function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1
}

/**
 * Get the currently authenticated user's profile.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getCurrentUserProfile(): Promise<ProfileRow | null> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  return getProfile(user.id)
}
