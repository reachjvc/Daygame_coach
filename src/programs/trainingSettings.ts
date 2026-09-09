/**
 * WHAT AN ACCOUNT TRAINS WITH — the shape, and the defaults, on their own.
 *
 * This exists so a client component does not have to import `src/db/workoutRepo`
 * to know the shape of a settings object. That module opens a server Supabase
 * client at import time; pulling it into a `"use client"` file drags server code
 * into the browser bundle, and the symptom is not a clear error — the login page
 * stopped settling long enough to click, everywhere in the app, until this was
 * split out.
 *
 * The numbers are not nullable, because the columns are not:
 * `profiles.bar_weight_kg` and `smallest_plate_kg` are `NUMERIC(5,2) NOT NULL`
 * with these defaults and CHECK constraints of 0–50 and 0.25–25.
 */

import type { UnitSystem } from "./types"

export interface TrainingSettings {
  unit: UnitSystem
  barWeightKg: number
  smallestPlateKg: number
}

/** The column defaults, so an empty box and a fresh account agree. */
export const DEFAULT_BAR_KG = 20
export const DEFAULT_PLATE_KG = 1.25

/** What the database will accept, said once so the UI and the server agree. */
export const BAR_RANGE_KG = { min: 0, max: 50 } as const
export const PLATE_RANGE_KG = { min: 0.25, max: 25 } as const
