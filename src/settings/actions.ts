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
import { ROUTES } from "@/src/shared/routes"
import { saveTrainingSettings } from "@/src/db/workoutRepo"

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
  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.dashboard)
}

/**
 * Reset sandbox settings to defaults
 */
export async function resetSandboxSettings(): Promise<void> {
  const userId = await requireAuth()
  await handleResetSandboxSettings(userId)
  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.dashboard)
}

/**
 * Update difficulty level
 */
export async function updateDifficulty(difficulty: string): Promise<void> {
  const userId = await requireAuth()
  await handleUpdateDifficulty(userId, difficulty)
  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.dashboard)
}

/**
 * Update voice language
 */
export async function updateVoiceLanguage(language: string): Promise<void> {
  const userId = await requireAuth()
  await handleUpdateVoiceLanguage(userId, language)
  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.dashboard)
}

/**
 * Update timezone
 */
export async function updateTimezone(timezone: string): Promise<void> {
  const userId = await requireAuth()
  await handleUpdateTimezone(userId, timezone)
  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.dashboard)
}

/**
 * Update preferred language for scenario content
 */
export async function updatePreferredLanguage(language: string): Promise<void> {
  const userId = await requireAuth()
  await handleUpdatePreferredLanguage(userId, language)
  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.scenarios)
}

/**
 * Update curve style preference
 */
export async function updateCurveStyle(style: string): Promise<void> {
  const userId = await requireAuth()
  await handleUpdateCurveStyle(userId, style)
  revalidatePath(ROUTES.plan)
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(): Promise<{ success: boolean }> {
  const userId = await requireAuth()
  await handleCancelSubscription(userId)
  revalidatePath(ROUTES.settings)
  return { success: true }
}

/**
 * Reactivate canceled subscription
 */
export async function reactivateSubscription(): Promise<{ success: boolean }> {
  const userId = await requireAuth()
  await handleReactivateSubscription(userId)
  revalidatePath(ROUTES.settings)
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

/**
 * Save what this account trains with: unit, bar weight, smallest plate.
 *
 * Revalidates the training routes as well as settings, because every
 * prescription on them is rounded to the bar and plate this sets.
 */
export async function updateTrainingSettings(settings: {
  unit: "kg" | "lb"
  barWeightKg: number
  smallestPlateKg: number
}): Promise<void> {
  const userId = await requireAuth()
  await saveTrainingSettings(userId, settings)
  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.training)
}
