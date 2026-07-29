import { createAdminSupabaseClient, createServerSupabaseClient } from "./supabase"
import type { ClaimResult, InviteStatus, WaitlistSource } from "./betaTypes"

/**
 * Repository for beta invite / beta tester / waitlist tables.
 *
 * Security model: beta membership is system-granted (earned), so these tables
 * have NO user write policies. Reads/writes here use either:
 * - the admin client (service role, trusted server-side only), or
 * - the claim_beta_slot() SECURITY DEFINER function via the user's session
 *   (so auth.uid() identifies the claimant server-side).
 */

/**
 * Get the public-facing status of an invite code (for the /beta landing page).
 * Uses the admin client because beta_invites has no anon read policy.
 */
export async function getInviteStatus(code: string): Promise<InviteStatus> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from("beta_invites")
    .select("max_uses, use_count, active")
    .eq("code", code)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to get invite status: ${error.message}`)
  }

  if (!data || !data.active) {
    return { valid: false, slotsRemaining: 0 }
  }

  return {
    valid: true,
    slotsRemaining: Math.max(0, data.max_uses - data.use_count),
  }
}

/**
 * Atomically claim a beta slot for the currently authenticated user.
 * Runs the claim_beta_slot() definer function through the user's session
 * client so auth.uid() is the claimant. Cap/race handling lives in the DB.
 */
export async function claimBetaSlot(code: string): Promise<ClaimResult> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.rpc("claim_beta_slot", {
    p_code: code,
  })

  if (error) {
    throw new Error(`Failed to claim beta slot: ${error.message}`)
  }

  return data as ClaimResult
}

/**
 * Check if a user is a beta tester.
 */
export async function isBetaTester(userId: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from("beta_testers")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to check beta tester status: ${error.message}`)
  }

  return data !== null
}

/**
 * Add an email to the waitlist (premium teaser or beta-full capture).
 * Duplicate (email, source) pairs are treated as success (idempotent).
 */
export async function addWaitlistEmail(
  email: string,
  source: WaitlistSource
): Promise<void> {
  const supabase = createAdminSupabaseClient()

  const { error } = await supabase
    .from("waitlist_emails")
    .insert({ email, source })

  // 23505 = unique_violation: already on the list, treat as success
  if (error && error.code !== "23505") {
    throw new Error(`Failed to add waitlist email: ${error.message}`)
  }
}
