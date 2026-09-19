/**
 * WHAT A START AND A FINISH MAY SAY.
 *
 * `durationMin` was the fault worth naming. It was a second copy of a fact the
 * start and end instants already state, the caller sent it, and the server
 * CLAMPED it into range — so a mistyped end became a silent ten-hour workout
 * rather than a refusal, and every session written up after the fact claimed
 * "45 minutes at effort 3" because that was the form's default.
 *
 * It is gone. The server derives the minutes from the two instants and refuses
 * a span that cannot be right.
 */

import { describe, it, expect } from "vitest"
import { StartWorkoutSchema, FinishWorkoutSchema } from "@/src/programs/schemas"
import { MAX_DISTANCE_KM } from "@/src/shared/weight"

const start = (over: Record<string, unknown> = {}) => ({ clientKey: "w-abcd1234", ...over })
const finish = (over: Record<string, unknown> = {}) => ({ intensity: 3, ...over })

describe("starting a workout", () => {
  it("may name when it started, as an instant", () => {
    const parsed = StartWorkoutSchema.safeParse(start({ startedAt: "2026-09-15T10:00:00.000Z" }))
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.startedAt).toBe("2026-09-15T10:00:00.000Z")
  })

  it("refuses a start time that is not an instant", () => {
    // A wall-clock string has no zone, and reading one in the server's zone is
    // how a session lands on the wrong day.
    expect(StartWorkoutSchema.safeParse(start({ startedAt: "2026-09-15T10:00" })).success).toBe(false)
  })

  it("does not require one — every live workout starts now", () => {
    expect(StartWorkoutSchema.safeParse(start()).success).toBe(true)
  })
})

describe("finishing a workout", () => {
  it("no longer accepts durationMin", () => {
    const parsed = FinishWorkoutSchema.safeParse(finish({ durationMin: 45 }))
    expect(parsed.success).toBe(true)
    // The schema is not strict, so an extra key parses — what matters is that
    // it does not survive into the data the server acts on.
    expect(parsed.success && "durationMin" in parsed.data).toBe(false)
  })

  it("may move the start, but only together with an end", () => {
    const alone = FinishWorkoutSchema.safeParse(finish({ startedAt: "2026-09-15T10:00:00.000Z" }))
    expect(alone.success).toBe(false)
    expect(alone.success === false && alone.error.issues[0].path).toEqual(["endedAt"])

    const both = FinishWorkoutSchema.safeParse(
      finish({ startedAt: "2026-09-15T10:00:00.000Z", endedAt: "2026-09-15T11:00:00.000Z" })
    )
    expect(both.success).toBe(true)
  })

  it("may name the kind and the distance", () => {
    const parsed = FinishWorkoutSchema.safeParse(finish({ sessionType: "running", distanceKm: 5.2 }))
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.sessionType).toBe("running")
    expect(parsed.success && parsed.data.distanceKm).toBe(5.2)
  })

  it("refuses a kind that is not one of the five", () => {
    expect(FinishWorkoutSchema.safeParse(finish({ sessionType: "crossfit" })).success).toBe(false)
  })

  it("refuses a distance over the ceiling, and below zero", () => {
    expect(FinishWorkoutSchema.safeParse(finish({ distanceKm: MAX_DISTANCE_KM + 1 })).success).toBe(false)
    expect(FinishWorkoutSchema.safeParse(finish({ distanceKm: -1 })).success).toBe(false)
    expect(FinishWorkoutSchema.safeParse(finish({ distanceKm: MAX_DISTANCE_KM })).success).toBe(true)
  })

  it("takes null as 'clear the distance'", () => {
    const parsed = FinishWorkoutSchema.safeParse(finish({ distanceKm: null }))
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.distanceKm).toBeNull()
  })

  it("an end on its own is still fine — that is every live workout", () => {
    expect(FinishWorkoutSchema.safeParse(finish({ endedAt: "2026-09-15T11:00:00.000Z" })).success).toBe(
      true
    )
  })
})
