/**
 * Settings repository - Database operations for settings
 * All settings-related database operations go through here.
 */

import { createServerSupabaseClient } from "@/src/db/server"
import {
  DEFAULT_SANDBOX_SETTINGS,
  mergeSandboxSettings,
  type SandboxSettings,
} from "@/src/scenarios/config"
import type { ProfileRow, PurchaseRow } from "@/src/db"

/**
 * Get sandbox settings for a user.
 * Returns merged settings with defaults.
 */
export async function getSandboxSettings(userId: string): Promise<SandboxSettings> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("sandbox_settings")
    .eq("id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return DEFAULT_SANDBOX_SETTINGS
    }
    throw new Error(`Failed to get sandbox settings: ${error.message}`)
  }

  return mergeSandboxSettings(data?.sandbox_settings as SandboxSettings | null)
}

/**
 * Update sandbox settings for a user.
 * Merges with existing settings.
 */
export async function updateSandboxSettings(
  userId: string,
  settings: Partial<SandboxSettings>
): Promise<SandboxSettings> {
  const supabase = await createServerSupabaseClient()

  // Get current settings
  const currentSettings = await getSandboxSettings(userId)

  // Merge new settings with existing
  const newSettings: SandboxSettings = {
    weather: { ...currentSettings.weather, ...settings.weather },
    energy: { ...currentSettings.energy, ...settings.energy },
    movement: { ...currentSettings.movement, ...settings.movement },
    display: { ...currentSettings.display, ...settings.display },
    environments: { ...currentSettings.environments, ...settings.environments },
  }

  const { error } = await supabase
    .from("profiles")
    .update({ sandbox_settings: newSettings })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update sandbox settings: ${error.message}`)
  }

  return newSettings
}

/**
 * Reset sandbox settings to defaults.
 */
export async function resetSandboxSettings(userId: string): Promise<SandboxSettings> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("profiles")
    .update({ sandbox_settings: DEFAULT_SANDBOX_SETTINGS })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to reset sandbox settings: ${error.message}`)
  }

  return DEFAULT_SANDBOX_SETTINGS
}

/**
 * Update difficulty level for a user.
 */
export async function updateDifficulty(userId: string, difficulty: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("profiles")
    .update({ difficulty })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update difficulty: ${error.message}`)
  }
}

/**
 * Get voice language for a user.
 */
export async function getVoiceLanguage(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("voice_language")
    .eq("id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    throw new Error(`Failed to get voice language: ${error.message}`)
  }

  return data?.voice_language ?? null
}

/**
 * Update voice language for a user.
 */
export async function updateVoiceLanguage(userId: string, language: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("profiles")
    .update({ voice_language: language })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update voice language: ${error.message}`)
  }
}

/**
 * Get preferred language for scenarios (content language).
 */
export async function getPreferredLanguage(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    throw new Error(`Failed to get preferred language: ${error.message}`)
  }

  return data?.preferred_language ?? null
}

/**
 * Update preferred language for scenarios (content language).
 */
export async function updatePreferredLanguage(userId: string, language: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_language: language })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update preferred language: ${error.message}`)
  }
}

/**
 * Get the user's active subscription purchase.
 */
export async function getActiveSubscriptionPurchase(
  userId: string
): Promise<PurchaseRow | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    throw new Error(`Failed to get subscription: ${error.message}`)
  }

  return data as PurchaseRow
}

/**
 * Update subscription status in purchases table.
 */
export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: string
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("purchases")
    .update({ subscription_status: status })
    .eq("stripe_subscription_id", stripeSubscriptionId)

  if (error) {
    throw new Error(`Failed to update subscription status: ${error.message}`)
  }
}

/**
 * Update subscription cancelled timestamp.
 */
export async function updateSubscriptionCancelledAt(
  userId: string,
  cancelledAt: string | null
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("profiles")
    .update({ subscription_cancelled_at: cancelledAt })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update cancellation timestamp: ${error.message}`)
  }
}

/**
 * Get user's scenario stats.
 */
export async function getScenarioStats(userId: string): Promise<{
  totalScenarios: number
  averageScore: number
}> {
  const supabase = await createServerSupabaseClient()

  // Get total count
  const { count: totalScenarios } = await supabase
    .from("scenarios")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  // Get recent scenarios for average score
  const { data: recentScenarios } = await supabase
    .from("scenarios")
    .select("evaluation")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10)

  // Calculate average score from evaluation data
  let averageScore = 0
  if (recentScenarios && recentScenarios.length > 0) {
    const scores = recentScenarios
      .map((s) => {
        const evaluation = s.evaluation as Record<string, unknown> | null
        return typeof evaluation?.score === "number" ? evaluation.score : 0
      })
      .filter((score) => score > 0)

    if (scores.length > 0) {
      averageScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    }
  }

  return {
    totalScenarios: totalScenarios || 0,
    averageScore,
  }
}

/**
 * Get full profile for settings page.
 */
export async function getSettingsProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    throw new Error(`Failed to get profile: ${error.message}`)
  }

  return data as ProfileRow
}
