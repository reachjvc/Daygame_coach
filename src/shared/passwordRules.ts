/**
 * What counts as an acceptable password, decided in one place.
 *
 * Signup and password-reset both need this answer, and if they disagree the
 * user meets the difference as a rejection after a round-trip to the server.
 * So neither page owns the rules -- this file does, and both import it.
 *
 * The messages are the feature. "Password does not meet requirements" tells
 * someone nothing; "Add a capital letter." tells them exactly what to type
 * next. Keep them imperative and specific.
 *
 * These must stay in step with the Supabase project's own policy
 * (Authentication -> Policies). The server is the real gate; this exists so the
 * user learns about a problem while typing rather than after submitting.
 */

export const PASSWORD_MIN_LENGTH = 8

/** Returns null when the password is acceptable, otherwise the reason. */
export function checkPassword(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (!/[a-z]/.test(value)) return "Add a lowercase letter."
  if (!/[A-Z]/.test(value)) return "Add a capital letter."
  if (!/[0-9]/.test(value)) return "Add a number."
  return null
}

/**
 * True when the server rejected a password for being too weak.
 *
 * Supabase's own wording is unusable -- it prints the entire alphabet three
 * times: "Password should contain at least one character of each:
 * abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789."
 * (verified against the live project 2026-09-04).
 *
 * checkPassword() should catch every such password before it is ever sent, so
 * this is a backstop for the case where the two drift apart -- a tightened
 * server policy, say. The user gets our wording either way; they should never
 * meet the alphabet.
 */
export function isWeakPasswordError(message: string): boolean {
  return /weak.?password|password should (be|contain)/i.test(message)
}
