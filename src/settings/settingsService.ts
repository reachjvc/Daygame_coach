/**
 * Settings service - Business logic for settings operations
 * All settings-related business logic goes through here.
 */

import { mergeSandboxSettings, type SandboxSettings } from "@/src/scenarios/config"
import { getStripe } from "./stripe"
import {
  updateSandboxSettings as repoUpdateSandboxSettings,
  resetSandboxSettings as repoResetSandboxSettings,
  updateDifficulty as repoUpdateDifficulty,
  updateVoiceLanguage as repoUpdateVoiceLanguage,
  updatePreferredLanguage as repoUpdatePreferredLanguage,
  updateTimezone as repoUpdateTimezone,
  updateWeekStartDay as repoUpdateWeekStartDay,
  getActiveSubscriptionPurchase,
  updateSubscriptionStatus,
  updateSubscriptionCancelledAt,
  getScenarioStats,
  getSettingsProfile,
} from "@/src/db/settingsRepo"
import {
  type SubscriptionInfo,
  type UserStats,
  type ProfileInfo,
  VALID_DIFFICULTIES,
  type DifficultyLevel,
} from "./types"
import { SETTINGS_CONFIG } from "./config"
import { VALID_VOICE_LANGUAGE_CODES } from "@/src/tracking/config"

export type SettingsErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "UNAUTHORIZED" | "STRIPE_ERROR"

export interface SettingsServiceError extends Error {
  code: SettingsErrorCode
}

export function createSettingsError(
  message: string,
  code: SettingsErrorCode
): SettingsServiceError {
  const error = new Error(message) as SettingsServiceError
  error.name = "SettingsServiceError"
  error.code = code
  return error
}

export function isSettingsError(error: unknown): error is SettingsServiceError {
  return (
    error instanceof Error &&
    error.name === "SettingsServiceError" &&
    "code" in error
  )
}

// ============================================
// Sandbox Settings
// ============================================

/**
 * Update sandbox settings for a user.
 */
export async function handleUpdateSandboxSettings(
  userId: string,
  settings: Partial<SandboxSettings>
): Promise<SandboxSettings> {
  return repoUpdateSandboxSettings(userId, settings)
}

/**
 * Reset sandbox settings to defaults.
 */
export async function handleResetSandboxSettings(userId: string): Promise<SandboxSettings> {
  return repoResetSandboxSettings(userId)
}

// ============================================
// Game Settings (Difficulty)
// ============================================

/**
 * Update difficulty level for a user.
 */
export async function handleUpdateDifficulty(
  userId: string,
  difficulty: string
): Promise<void> {
  if (!VALID_DIFFICULTIES.includes(difficulty as DifficultyLevel)) {
    throw createSettingsError("Invalid difficulty level", "INVALID_INPUT")
  }

  await repoUpdateDifficulty(userId, difficulty)
}

// ============================================
// Voice Language
// ============================================

/**
 * Update voice language for a user.
 */
export async function handleUpdateVoiceLanguage(
  userId: string,
  language: string
): Promise<void> {
  if (!VALID_VOICE_LANGUAGE_CODES.has(language)) {
    throw createSettingsError("Invalid voice language", "INVALID_INPUT")
  }

  await repoUpdateVoiceLanguage(userId, language)
}

// ============================================
// Timezone
// ============================================

/**
 * Validate that a string is a valid IANA timezone identifier.
 */
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * Update timezone for a user.
 */
export async function handleUpdateTimezone(
  userId: string,
  timezone: string
): Promise<void> {
  if (!isValidTimezone(timezone)) {
    throw createSettingsError("Invalid timezone", "INVALID_INPUT")
  }

  await repoUpdateTimezone(userId, timezone)
}

// ============================================
// Week Start Day
// ============================================

/**
 * Update week start day for a user.
 * Validates that the value is 0-6 (Sunday through Saturday).
 */
export async function handleUpdateWeekStartDay(
  userId: string,
  day: number
): Promise<void> {
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw createSettingsError("Invalid week start day (must be 0-6)", "INVALID_INPUT")
  }

  await repoUpdateWeekStartDay(userId, day)
}

// ============================================
// Preferred Language (Scenario Content)
// ============================================

const VALID_PREFERRED_LANGUAGES = new Set(["da", "en"])

/**
 * Update preferred language for scenario content.
 */
export async function handleUpdatePreferredLanguage(
  userId: string,
  language: string
): Promise<void> {
  if (!VALID_PREFERRED_LANGUAGES.has(language)) {
    throw createSettingsError("Invalid preferred language", "INVALID_INPUT")
  }

  await repoUpdatePreferredLanguage(userId, language)
}

// ============================================
// Subscription / Billing
// ============================================

/**
 * Get subscription details from Stripe.
 */
export async function getSubscriptionDetails(
  userId: string
): Promise<SubscriptionInfo | null> {
  const purchase = await getActiveSubscriptionPurchase(userId)

  if (!purchase?.stripe_subscription_id) {
    return null
  }

  try {
    const subscription = await getStripe().subscriptions.retrieve(
      purchase.stripe_subscription_id
    )

    // Type assertion for Stripe subscription object
    const sub = subscription as unknown as {
      id: string
      status: string
      current_period_end: number
      current_period_start: number
      cancel_at_period_end: boolean
      cancel_at: number | null
      customer: string
    }

    return {
      id: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
      productId: purchase.product_id || "",
      createdAt: new Date(purchase.created_at || Date.now()),
    }
  } catch (err) {
    console.error("Error fetching subscription from Stripe:", err)
    return null
  }
}

/**
 * Cancel subscription at period end.
 */
export async function handleCancelSubscription(userId: string): Promise<void> {
  const purchase = await getActiveSubscriptionPurchase(userId)

  if (!purchase?.stripe_subscription_id) {
    throw createSettingsError("No active subscription found", "NOT_FOUND")
  }

  try {
    // Cancel at period end (user keeps access until then)
    await getStripe().subscriptions.update(purchase.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // Update local records
    await updateSubscriptionStatus(purchase.stripe_subscription_id, "canceling")
    await updateSubscriptionCancelledAt(userId, new Date().toISOString())
  } catch (err) {
    console.error("Error canceling subscription:", err)
    throw createSettingsError("Failed to cancel subscription", "STRIPE_ERROR")
  }
}

/**
 * Reactivate a canceled subscription.
 */
export async function handleReactivateSubscription(userId: string): Promise<void> {
  const purchase = await getActiveSubscriptionPurchase(userId)

  if (!purchase?.stripe_subscription_id) {
    throw createSettingsError("No subscription found", "NOT_FOUND")
  }

  try {
    await getStripe().subscriptions.update(purchase.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    // Update local records
    await updateSubscriptionStatus(purchase.stripe_subscription_id, "active")
    await updateSubscriptionCancelledAt(userId, null)
  } catch (err) {
    console.error("Error reactivating subscription:", err)
    throw createSettingsError("Failed to reactivate subscription", "STRIPE_ERROR")
  }
}

/**
 * Create a Stripe billing portal session.
 */
export async function createBillingPortalSession(
  userId: string
): Promise<{ url: string }> {
  const purchase = await getActiveSubscriptionPurchase(userId)

  if (!purchase?.stripe_subscription_id) {
    throw createSettingsError("No active subscription found", "NOT_FOUND")
  }

  try {
    const subscription = await getStripe().subscriptions.retrieve(
      purchase.stripe_subscription_id
    )
    const customerId = subscription.customer as string

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: SETTINGS_CONFIG.billingPortalReturnUrl(),
    })

    return { url: session.url }
  } catch (err) {
    console.error("Error creating billing portal session:", err)
    throw createSettingsError("Failed to access billing portal", "STRIPE_ERROR")
  }
}

// ============================================
// Settings Page Data
// ============================================

/**
 * Get all data needed for the settings page.
 */
export async function getSettingsPageData(
  userId: string,
  userEmail: string,
  userCreatedAt: string
): Promise<{
  profile: ProfileInfo
  subscription: SubscriptionInfo | null
  stats: UserStats
}> {
  const [profile, subscription, scenarioStats] = await Promise.all([
    getSettingsProfile(userId),
    getSubscriptionDetails(userId),
    getScenarioStats(userId),
  ])

  const sandboxSettings = mergeSandboxSettings(profile?.sandbox_settings)

  const profileForClient: ProfileInfo = {
    id: profile?.id ?? userId,
    email: profile?.email ?? userEmail,
    full_name: profile?.full_name ?? null,
    has_purchased: profile?.has_purchased ?? null,
    created_at: profile?.created_at ?? userCreatedAt,
    difficulty: profile?.difficulty ?? null,
    level: profile?.level ?? 1,
    xp: profile?.xp ?? 0,
    scenarios_completed: profile?.scenarios_completed ?? 0,
    age_range_start: profile?.age_range_start ?? null,
    age_range_end: profile?.age_range_end ?? null,
    archetype: profile?.archetype ?? profile?.primary_archetype ?? null,
    secondary_archetype: profile?.secondary_archetype ?? null,
    tertiary_archetype: profile?.tertiary_archetype ?? null,
    dating_foreigners: profile?.dating_foreigners ?? null,
    user_is_foreign: profile?.user_is_foreign ?? null,
    preferred_region: profile?.preferred_region ?? profile?.region ?? null,
    secondary_region: profile?.secondary_region ?? null,
    experience_level: profile?.experience_level ?? null,
    primary_goal: profile?.primary_goal ?? null,
    sandbox_settings: sandboxSettings,
    voice_language: profile?.voice_language ?? null,
    timezone: profile?.timezone ?? null,
  }

  const stats: UserStats = {
    totalScenarios: scenarioStats.totalScenarios,
    averageScore: scenarioStats.averageScore,
    level: profile?.level ?? 1,
    xp: profile?.xp ?? 0,
    scenariosCompleted: profile?.scenarios_completed ?? 0,
  }

  return {
    profile: profileForClient,
    subscription,
    stats,
  }
}
