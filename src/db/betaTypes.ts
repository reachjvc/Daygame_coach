/**
 * Database types for the beta tester invite flow.
 */

// ============================================
// Database Rows
// ============================================

export interface BetaInviteRow {
  id: string
  code: string
  max_uses: number
  use_count: number
  active: boolean
  created_at: string
}

export interface BetaTesterRow {
  user_id: string
  invite_id: string
  granted_at: string
}

export interface WaitlistEmailRow {
  id: string
  email: string
  source: WaitlistSource
  created_at: string
}

// ============================================
// Domain values
// ============================================

export type WaitlistSource = "beta_full" | "premium_teaser"

/** Result of claim_beta_slot() DB function. */
export type ClaimResult = "granted" | "already_member" | "full" | "invalid"

/** Landing-page view of an invite (never exposes internals like id). */
export interface InviteStatus {
  valid: boolean
  slotsRemaining: number
}
