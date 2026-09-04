/**
 * A per-user cap on how often one endpoint may be called.
 *
 * WHY: the calendar importer makes the server fetch a URL of the caller's
 * choosing. Even with the address guard in `networkGuardService`, an unlimited
 * endpoint is a free traffic amplifier and a way to time-probe the network.
 *
 * WHAT THIS IS NOT: this counter lives in the memory of one server process. If
 * the app is ever run as more than one instance, each instance counts its own
 * calls, so the real limit is the number of instances times this one. That is
 * a deliberate, stated limitation, not an oversight — a shared limit needs a
 * shared store (Postgres or Redis), which is the right change the day a second
 * instance exists. It is written down in docs/runbooks/timetrack.md.
 */

const buckets = new Map<string, number[]>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const hits = (buckets.get(key) ?? []).filter((at) => now - at < windowMs)

  if (hits.length >= limit) {
    const oldest = hits[0]
    buckets.set(key, hits)
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) }
  }

  hits.push(now)
  buckets.set(key, hits)

  // Keep the map from growing without bound on a long-lived server
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.every((at) => now - at >= windowMs)) buckets.delete(k)
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

/** Test-only: forget every counter */
export function resetRateLimits(): void {
  buckets.clear()
}
