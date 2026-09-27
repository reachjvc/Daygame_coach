/**
 * THE TRIPWIRE IS A NUMBER WITH A REASON, AND THIS IS THE REASON.
 *
 * `WORKSPACE_SIZE_TRIPWIRE` exists because the whole account lives in one
 * localStorage key. The measurements behind it, taken on a real account on
 * 2026-09-26: 496 bytes per entry, a 5MB origin budget shared with the app's
 * other slices, and a whole-account map-and-diff on every change that takes
 * 12ms at 700 entries and 145ms at 10,000.
 *
 * A constant with a comment drifts. This asserts the arithmetic, so raising the
 * number without redoing the measurement fails here rather than in somebody's
 * browser three years from now.
 */

import { describe, expect, test } from "vitest"

import { WORKSPACE_SIZE_TRIPWIRE } from "@/src/timetrack/config"

/** Measured: `JSON.stringify(state).length / entries` on an account of 690. */
const BYTES_PER_ENTRY = 496
/** The per-origin budget browsers give localStorage, shared with other slices. */
const ORIGIN_BUDGET_BYTES = 5 * 1024 * 1024

describe("the size tripwire", () => {
  test("fires with room to act, not at the wall", () => {
    const wall = ORIGIN_BUDGET_BYTES / BYTES_PER_ENTRY // ~10,500 entries

    expect(WORKSPACE_SIZE_TRIPWIRE).toBeLessThan(wall / 2)
  })

  test("is not so low that an ordinary year of tracking trips it", () => {
    // ten entries a working day is a heavy but believable year
    const aBusyYear = 10 * 250

    expect(WORKSPACE_SIZE_TRIPWIRE).toBeGreaterThan(aBusyYear)
  })
})
