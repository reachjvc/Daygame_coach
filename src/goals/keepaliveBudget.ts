/**
 * THE BROWSER'S ONE BUDGET FOR REQUESTS THAT OUTLIVE THEIR PAGE.
 *
 * `fetch(..., { keepalive: true })` is capped at 64 KiB IN TOTAL across all of
 * a page's keepalive requests that are still in flight, not 64 KiB each; one
 * over the line is refused outright. A page that is being left sends the plan
 * and then the day's parts together, so they share this budget: each one
 * claims its size first, and one that does not fit goes as a plain request
 * (which a closing page may lose, but a hidden one finishes).
 *
 * A bit under the cap, leaving room for headers the browser also counts.
 */

export const KEEPALIVE_BUDGET_BYTES = 60_000

let inFlight = 0

/**
 * Claim `bytes` of the budget. Returns the release to call when the request
 * settles, or null when it does not fit and must not be sent keepalive.
 */
export function claimKeepalive(bytes: number): (() => void) | null {
  if (bytes > KEEPALIVE_BUDGET_BYTES - inFlight) return null
  inFlight += bytes
  let released = false
  return () => {
    if (released) return
    released = true
    inFlight -= bytes
  }
}

/** Bytes of the budget in use right now (for tests). */
export function keepaliveInUse(): number {
  return inFlight
}
