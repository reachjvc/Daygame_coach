/**
 * THE CLOCK'S SECRET, CHECKED.
 *
 * The secret lives in the vault (`notifications_clock_secret`), so the
 * database's clock that calls and the route that answers read the same value
 * and nobody pastes it anywhere. Read once per server instance; a failed or
 * empty read is not remembered, and with no secret every call is refused: a
 * missing secret must never mean "open".
 */

import { timingSafeEqual } from "node:crypto"
import { readNotificationSecret } from "@/src/db/notificationsRepo"

/**
 * Kept five minutes, so a rotated secret is taken up without a deploy; "none
 * stored" is kept one minute, so a stream of calls to an unconfigured server
 * is not a stream of vault reads.
 */
const KEEP_MS = 5 * 60_000
const KEEP_MISSING_MS = 60_000

let cached: { value: Promise<string | null>; at: number } | null = null

export async function clockSecret(now: number = Date.now()): Promise<string | null> {
  if (cached) {
    const value = await cached.value
    if (now - cached.at < (value === null ? KEEP_MISSING_MS : KEEP_MS)) return value
  }
  cached = { value: readNotificationSecret("notifications_clock_secret").catch(() => null), at: now }
  return cached.value
}

/** Constant-time comparison of a presented `Authorization: Bearer …` with the stored secret. */
export function bearerMatches(header: string | null, expected: string): boolean {
  if (!expected || !header?.startsWith("Bearer ")) return false
  const given = Buffer.from(header.slice("Bearer ".length))
  const want = Buffer.from(expected)
  return given.length === want.length && timingSafeEqual(given, want)
}
