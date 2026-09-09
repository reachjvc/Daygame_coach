/**
 * ONE CONVERSION BETWEEN KILOGRAMS AND POUNDS, AND ONE UPPER BOUND.
 *
 * WHAT WENT WRONG WITHOUT THIS. The app converted weights in nineteen places
 * using two different constants that disagree: `KG_PER_LB = 0.45359237` in the
 * programs slice and `KG_TO_LBS = 2.20462` in the health slice, whose reciprocal
 * is 0.45359290 — different in the sixth decimal, which is enough for a weight
 * to round differently depending on which screen you read it on. A third copy
 * was written out by hand mid-file (`item.weight * 0.45359237`).
 *
 * The two slices also spelled the unit differently — `"lb"` in programs,
 * `"lbs"` in health — so a value could not be passed between them without a
 * translation step that somebody had to remember.
 *
 * This file is the one owner. `src/programs/programsService.ts` and
 * `src/health/healthService.ts` re-export from here rather than keeping their
 * own, so the existing call sites did not all have to move at once and there is
 * still only one implementation.
 */

/** How the whole app spells the unit. `"lbs"` is gone. */
export type Unit = "kg" | "lb"

/**
 * The exact definition, not an approximation: one pound is 0.45359237 kg by
 * international agreement, and that figure is exact. Deriving the other
 * direction from it — rather than storing a second rounded constant — is what
 * keeps the two directions agreeing.
 */
export const KG_PER_LB = 0.45359237

/**
 * The largest weight the database can hold.
 *
 * `workout_sets.weight_kg` is `NUMERIC(5,2)`, so 999.99 is the true ceiling and
 * 1000 overflows. Three schemas in the programs slice said `max(1000)` and
 * accepted a value Postgres then refused with an error no user can act on —
 * after the program's weights had already been advanced.
 */
export const MAX_WEIGHT_KG = 999.99

/** A weight the user typed, in their unit, as kilograms for storage. */
export function toKg(value: number, unit: Unit): number {
  return unit === "lb" ? value * KG_PER_LB : value
}

/** A stored weight in kilograms, in the unit the user reads. */
export function fromKg(kg: number, unit: Unit): number {
  return unit === "lb" ? kg / KG_PER_LB : kg
}
