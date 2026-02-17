"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import type { SandboxSettings } from "@/src/scenarios/config"
import {
  handleUpdateSandboxSettings,
  handleResetSandboxSettings,
  handleUpdateDifficulty,
  handleUpdateVoiceLanguage,
  handleUpdatePreferredLanguage,
  handleUpdateTimezone,
  handleUpdateCurveStyle,
  handleCancelSubscription,
  handleReactivateSubscription,
  createBillingPortalSession,
} from "./settingsService"
import { SETTINGS_CONFIG } from "./config"

/**
 * Helper to get authenticated user ID
 */
async function requireAuth(): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return user.id
}

/**
 * Update sandbox settings
 */
export async function updateSandboxSettings(
  settings: Partial<SandboxSettings>
): Promise<void> {
  const userId = await requireAuth()
  await handleUpdateSandboxSettings(userId, settings)
  revalidatePath(SETTINGS_CONFIG.paths.settings)
  revalidatePath(SETTINGS_CONFIG.paths.dashboard)
}

/**
 * Reset sandbox settings to defaults
 */
export async function resetSandboxSettings(): Promise<void> {
  const userId = await requireAuth()
  await handleResetSandboxSettings(userId)
  revalidatePath(SETTINGS_CONFIG.paths.settings)
  revalidatePath(SETTINGS_CONFIG.paths.dashboard)
}

/**
 * Update difficulty level
 */
export async function updateDifficulty(difficulty: string): Promise<void> {
  const userId = await requireAuth()
  await handleUpdateDifficulty(userId, difficulty)
  revalidatePath(SETTINGS_CONFIG.paths.settings)
  revalidatePath(SETTINGS_CONFIG.paths.dashboard)
}

/**
 * Update voice language
 */
export async function updateVoiceLanguage(language: string): Promise<void> {
  const userId = await requireAuth()
  await handleUpdateVoiceLanguage(userId, language)
  revalidatePath(SETTINGS_CONFIG.paths.settings)
  revalidatePath(SETTINGS_CONFIG.paths.dashboard)
}

/**
 * Update timezone
 */
export async function updateTimezone(timezone: string): Promise<void> {
  const userId = await requireAuth()
  await handleUpdateTimezone(userId, timezone)
  revalidatePath(SETTINGS_CONFIG.paths.settings)
  revalidatePath(SETTINGS_CONFIG.paths.dashboard)
}

/**
 * Update preferred language for scenario content
 */
export async function updatePreferredLanguage(language: string): Promise<void> {
  const userId = await requireAuth()
  await handleUpdatePreferredLanguage(userId, language)
  revalidatePath(SETTINGS_CONFIG.paths.settings)
  revalidatePath("/scenarios")
}

/**
 * Update curve style preference
 */
export async function updateCurveStyle(style: string): Promise<void> {
  const userId = await requireAuth()
  await handleUpdateCurveStyle(userId, style)
  revalidatePath("/dashboard/goals")
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(): Promise<{ success: boolean }> {
  const userId = await requireAuth()
  await handleCancelSubscription(userId)
  revalidatePath(SETTINGS_CONFIG.paths.settings)
  return { success: true }
}

/**
 * Reactivate canceled subscription
 */
export async function reactivateSubscription(): Promise<{ success: boolean }> {
  const userId = await requireAuth()
  await handleReactivateSubscription(userId)
  revalidatePath(SETTINGS_CONFIG.paths.settings)
  return { success: true }
}

/**
 * Open Stripe billing portal
 */
export async function openBillingPortal(): Promise<{ url: string } | null> {
  const userId = await requireAuth()
  try {
    return await createBillingPortalSession(userId)
  } catch {
    return null
  }
}
