/**
 * WHAT A SESSION WAS, FOR A ROW WITH NO LIFTS TO NAME.
 *
 * History described every workout by its top sets. A run has none, so a
 * finished 5 km read as `running` — the raw database column, lower-cased, on
 * its own — and opening it said "No sets were recorded for this one", which
 * reads as something having gone wrong with a session that went fine.
 *
 * The rule that matters most here is the one about absent numbers: a distance
 * or a duration that is not there is NOT zero, and printing "0 km" would be
 * the app stating a fact nobody gave it.
 */

import { describe, it, expect } from "vitest"
import { describeSessionRow } from "@/src/health/healthService"

describe("describeSessionRow", () => {
  it("names a run in words, with its distance and its minutes", () => {
    expect(
      describeSessionRow({ session_type: "running", distance_km: 5, duration_min: 31 })
    ).toBe("Run · 5 km · 31 min")
  })

  it("prints no distance at all when there is none, never '0 km'", () => {
    expect(describeSessionRow({ session_type: "mobility", distance_km: null, duration_min: 20 })).toBe(
      "Mobility · 20 min"
    )
    // Absent is a third state, not zero. Zero itself is a real answer and prints.
    expect(describeSessionRow({ session_type: "running", distance_km: 0, duration_min: 31 })).toBe(
      "Run · 0 km · 31 min"
    )
  })

  it("prints no minutes when the duration is missing", () => {
    expect(describeSessionRow({ session_type: "cardio", distance_km: 12, duration_min: null })).toBe(
      "Cardio · 12 km"
    )
    expect(describeSessionRow({ session_type: "yoga" })).toBe("Yoga")
  })

  it("still says what a gym session was", () => {
    expect(describeSessionRow({ session_type: "weights", distance_km: null, duration_min: 45 })).toBe(
      "Weights · 45 min"
    )
  })

  /**
   * The caller with its own minutes column. History prints the duration in a
   * right-hand column so the numbers can be scanned down, and printed the whole
   * sentence beside it — so a run read "Run · 31 min" next to "31 min".
   */
  it("leaves the minutes out when the caller already has them", () => {
    expect(
      describeSessionRow({ session_type: "running", distance_km: 5, duration_min: 31 }, { minutes: false })
    ).toBe("Run · 5 km")
  })

  it("still leaves out a distance that is not there", () => {
    expect(
      describeSessionRow({ session_type: "running", distance_km: null, duration_min: 31 }, { minutes: false })
    ).toBe("Run")
  })
})
