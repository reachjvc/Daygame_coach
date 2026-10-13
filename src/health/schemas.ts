/**
 * Zod validation schemas for the health API routes.
 *
 * Same convention as `src/tracking/schemas.ts`: the shape a request must have
 * lives beside the slice it belongs to, not inside the route, so the route stays
 * a thin wrapper and the rules are readable on their own.
 */

import { z } from "zod"

/**
 * WHEN IT HAPPENED — the same two optional fields on every health entry.
 *
 * Leave both out and the entry is stamped the moment it was saved. Give a date
 * and it counts towards that day's week. Give a time as well and it is that
 * exact moment, which matters when there are two in a day.
 *
 * These replaced `logged_at: z.string().optional()` on the sleep, weight and
 * nutrition routes: an unvalidated string that went straight into a weekly
 * counter. Nothing sent it, so nothing was wrong yet — but any signed-in user
 * could have posted `logged_at: "2030-01-01"` and moved their own counts.
 */
export const entryWhenFields = {
  entry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date like 2026-08-20")
    .optional(),
  entry_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected a time like 07:30")
    .optional(),
}

/** A time with no day is not a fact about anything. */
export function hasDateIfTime(v: { entry_date?: string; entry_time?: string }): boolean {
  return !v.entry_time || !!v.entry_date
}

export const NEEDS_DATE_FOR_TIME = {
  message: "A time needs a date to go with it",
  path: ["entry_date"],
}

/**
 * `CreateWorkoutSchema` was here — the body of `POST /api/health/workout`,
 * which wrote a finished workout and all its sets in one call. That route no
 * longer has a POST. `WorkoutSetSchema` went later: nothing imported it, and
 * History edits sets through `src/programs/schemas.ts`.
 */
