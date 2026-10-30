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

let secret: Promise<string | null> | null = null

export async function clockSecret(): Promise<string | null> {
  secret ??= readNotificationSecret("notifications_clock_secret").catch(() => null)
  const value = await secret
  if (value === null) secret = null
  return value
}

/** Constant-time comparison of a presented `Authorization: Bearer …` with the stored secret. */
export function bearerMatches(header: string | null, expected: string): boolean {
  if (!expected || !header?.startsWith("Bearer ")) return false
  const given = Buffer.from(header.slice("Bearer ".length))
  const want = Buffer.from(expected)
  return given.length === want.length && timingSafeEqual(given, want)
}
