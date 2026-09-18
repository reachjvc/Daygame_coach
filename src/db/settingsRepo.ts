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

/** Where `profiles.timezone` came from. See the 20260917110000 migration. */
export type TimezoneSource = "signup_default" | "detected" | "chosen"

/**
 * The account's timezone, AND whether anybody actually set it.
 *
 * THE FACT THAT WAS MISSING. `timezone` is NOT NULL DEFAULT 'UTC', so it can
 * never tell you the difference between somebody who lives on UTC and somebody
 * the app has simply never asked. Every screen that files a workout by date was
 * treating the second as the first: a new account in Copenhagen logs a session
 * at half eleven at night and it lands on tomorrow, with nothing on screen
 * saying why.
 *
 * `known` is that difference, and it has exactly one owner — here. Screens read
 * it off the prescription rather than deciding for themselves, because "is UTC
 * a real answer" is not a judgement a card should be making.
 */
export async function getUserClock(userId: string): Promise<{ timezone: string; known: boolean }> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("timezone, timezone_source")
    .eq("id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      console.error(`[settingsRepo] no profile row for ${userId} — periods will be computed in UTC`)
      return { timezone: "UTC", known: false }
    }
    throw new Error(`Failed to get timezone: ${error.message}`)
  }

  if (!data?.timezone) {
    console.error(`[settingsRepo] profile ${userId} has no timezone despite NOT NULL — periods in UTC`)
    return { timezone: "UTC", known: false }
  }

  return { timezone: data.timezone, known: data.timezone_source !== "signup_default" }
}

/**
 * A user's timezone. Never null.
 *
 * Twenty-six callers only need the zone itself, and they are unchanged. The
 * one question this cannot answer — "did anybody set it?" — is `getUserClock`.
 */
export async function getUserTimezone(userId: string): Promise<string> {
  return (await getUserClock(userId)).timezone
}

/**
 * Update timezone for a user.
 *
 * `source` is written in the SAME statement as the zone, never after it: two
 * writes could leave a zone somebody typed still labelled as never-set, and the
 * one-time browser sync would then overwrite their choice.
 */
export async function updateTimezone(
  userId: string,
  timezone: string,
  source: TimezoneSource = "chosen"
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("profiles")
    .update({ timezone, timezone_source: source })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update timezone: ${error.message}`)
  }
}

/*
 * `getWeekStartDay` and `updateWeekStartDay` lived here and were removed.
 *
 * Nothing ever read the value to compute a boundary — every period in the app is
 * Monday-based via `periodStartFor` — so the setting wrote a number that changed
 * nothing while the settings dialog told users it had changed their reset day.
 * The column stays (it holds what people chose) and `getTimePreferences` still
 * reports it; the write path is gone until something honours it.
 */

/**
 * Get time preferences (timezone + week start day) in a single query.
 */
export async function getTimePreferences(userId: string): Promise<{
  timezone: string | null
  timezone_source: TimezoneSource
  week_start_day: number
}> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("timezone, week_start_day, timezone_source")
    .eq("id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return { timezone: null, timezone_source: "signup_default", week_start_day: 0 }
    }
    throw new Error(`Failed to get time preferences: ${error.message}`)
  }

  return {
    timezone: data?.timezone ?? null,
    // The one-time browser sync reads this to decide whether to offer the
    // browser's zone at all, so a missing value must read as never-set.
    timezone_source: (data?.timezone_source as TimezoneSource) ?? "signup_default",
    week_start_day: data?.week_start_day ?? 0,
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
 * Get curve style preference for a user. Returns 'zen' if not set.
 */
export async function getCurveStyle(userId: string): Promise<string> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("curve_style")
    .eq("id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return "zen"
    }
    throw new Error(`Failed to get curve style: ${error.message}`)
  }

  return data?.curve_style ?? "zen"
}

/**
 * Update curve style preference for a user.
 */
export async function updateCurveStyle(userId: string, style: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("profiles")
    .update({ curve_style: style })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update curve style: ${error.message}`)
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
