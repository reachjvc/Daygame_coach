/**
 * EVERY ADDRESS THE TRAINING SURFACES LINK TO, IN ONE PLACE.
 *
 * Hand-written paths are how a route rename leaves dead links behind that
 * nothing catches — `/dashboard/goals/plan` is still in this codebase as a
 * redirect for exactly that reason. The Life Mastery address already lives in
 * one constant (`src/shared/lifeMasteryRoutes.ts`); these are the gym's.
 *
 * `?from` is read by `components/BackLink.tsx`, so a screen opened from
 * Tracking offers its way back to Tracking rather than to wherever the
 * browser happens to have been.
 */

export const TRACKING = "/dashboard/tracking"
export const PROGRAMS = "/programs"
export const LIVE_WORKOUT = "/programs/live"

/** The one request the Tracking card makes. */
export const TRAINING_DOOR_API = "/api/programs/today"

/** A finished workout's receipt. Built here so one rename moves every caller. */
export const workoutReceipt = (workoutId: string): string => `/programs/workout/${workoutId}`

/** Any of the above, told where it was opened from. */
export function withFrom(href: string, from: string): string {
  return `${href}${href.includes("?") ? "&" : "?"}from=${encodeURIComponent(from)}`
}
