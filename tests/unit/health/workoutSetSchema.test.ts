/**
 * What the save path for a written-up workout will and will not accept.
 *
 * THE FAILURE THIS PINS. The 2026-09-07 migration replaced the `is_warmup`
 * boolean with `set_kind` and dropped the column, and this schema was never
 * updated. A validator deletes fields it was not told about, so the form's
 * `set_kind: "warmup"` was silently thrown away and every warm-up single was
 * stored as ordinary work — counted in the volume total, and able to be
 * announced as a personal best. Nothing failed; the switch simply did nothing.
 */

import { describe, it, expect } from "vitest"
import { WorkoutSetSchema } from "@/src/health/schemas"

const base = { exercise: "Bench Press", weight_kg: 60, reps: 5, set_number: 1 }

describe("WorkoutSetSchema", () => {
  it("keeps the kind of set, so a warm-up stays a warm-up", () => {
    const parsed = WorkoutSetSchema.parse({ ...base, set_kind: "warmup" })
    expect(parsed.set_kind).toBe("warmup")
  })

  it("keeps every kind the database knows about", () => {
    for (const kind of ["warmup", "working", "amrap", "backoff", "drop"] as const) {
      expect(WorkoutSetSchema.parse({ ...base, set_kind: kind }).set_kind).toBe(kind)
    }
  })

  it("throws away the column that no longer exists", () => {
    // Sending it used to reach the insert and fail against the real database,
    // leaving the workout row behind with no sets under it.
    const parsed = WorkoutSetSchema.parse({ ...base, is_warmup: true })
    expect(parsed).not.toHaveProperty("is_warmup")
  })

  it("refuses a kind of set that is not one of the five", () => {
    expect(() => WorkoutSetSchema.parse({ ...base, set_kind: "cooldown" })).toThrow()
  })

  /**
   * The column is NUMERIC(5,2), so 999.99 is the most it can hold. The schema
   * said 1000, which meant a 1000 kg entry passed validation and then failed in
   * Postgres with a numeric-overflow message nobody could act on.
   */
  it("stops at the heaviest weight the database can actually store", () => {
    expect(WorkoutSetSchema.parse({ ...base, weight_kg: 999.99 }).weight_kg).toBe(999.99)
    expect(() => WorkoutSetSchema.parse({ ...base, weight_kg: 1000 })).toThrow()
  })

  it("allows zero reps, which is a set attempted and failed", () => {
    expect(WorkoutSetSchema.parse({ ...base, reps: 0 }).reps).toBe(0)
  })

  it("allows a bodyweight set at no added weight", () => {
    expect(WorkoutSetSchema.parse({ ...base, weight_kg: 0 }).weight_kg).toBe(0)
  })
})
