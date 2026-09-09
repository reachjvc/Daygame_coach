/**
 * What the dashboard says about training, and why it is in that order.
 *
 * A workout you are in the middle of beats everything: somebody standing in a
 * gym does not need to be told what today's session is, they need the way back
 * into it. A workout left open overnight is a different thing again — it is
 * forgotten rather than running, and "Resume · 431 min" is the app pretending
 * not to notice.
 */

import { describe, it, expect } from "vitest"
import { trainingCardState, STALE_WORKOUT_HOURS } from "@/src/programs/programsService"
import type { SessionPrescription } from "@/src/programs/types"

const NOW = new Date("2026-09-09T18:00:00Z")
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60000).toISOString()

const session = (over: Partial<SessionPrescription> = {}): SessionPrescription =>
  ({
    dayId: "A",
    dayLabel: "Upper",
    cycle: 1,
    week: 1,
    exercises: [{ exerciseId: "bench", name: "Bench", sets: [] }, { exerciseId: "row", name: "Row", sets: [] }],
    restDay: false,
    ...over,
  }) as unknown as SessionPrescription

describe("trainingCardState", () => {
  it("puts a running workout above everything else", () => {
    const state = trainingCardState({ id: "w1", startedAt: minutesAgo(23) }, session(), "e1", NOW)
    expect(state).toEqual({ kind: "live", workoutId: "w1", minutes: 23 })
  })

  it("calls a workout left open for hours forgotten, not running", () => {
    const state = trainingCardState(
      { id: "w1", startedAt: minutesAgo(STALE_WORKOUT_HOURS * 60 + 1) },
      session(),
      "e1",
      NOW
    )
    expect(state.kind).toBe("stale")
  })

  it("is still running right up to the cutoff", () => {
    const state = trainingCardState(
      { id: "w1", startedAt: minutesAgo(STALE_WORKOUT_HOURS * 60) },
      session(),
      "e1",
      NOW
    )
    expect(state.kind).toBe("live")
  })

  it("names today's session and how many lifts are in it", () => {
    expect(trainingCardState(null, session(), "e1", NOW)).toEqual({
      kind: "today",
      enrollmentId: "e1",
      dayLabel: "Upper",
      lifts: 2,
    })
  })

  it("says what is next on a rest day, rather than nothing", () => {
    const state = trainingCardState(
      null,
      session({ restDay: true, dayLabel: "Lower", scheduledWeekday: 4 }),
      "e1",
      NOW
    )
    expect(state).toEqual({ kind: "rest", enrollmentId: "e1", nextLabel: "Lower", nextWeekday: 4 })
  })

  it("leaves out a weekday the schedule does not pin", () => {
    const state = trainingCardState(null, session({ restDay: true, dayLabel: "Lower" }), "e1", NOW)
    expect(state).not.toHaveProperty("nextWeekday")
  })

  it("says nothing when no program is running", () => {
    expect(trainingCardState(null, null, null, NOW)).toEqual({ kind: "none" })
  })

  /** An endurance day prescribes blocks, not lifts. Zero is the honest count. */
  it("reports no lifts for a cardio day instead of inventing some", () => {
    const state = trainingCardState(null, session({ exercises: [], dayLabel: "Intervals" }), "e1", NOW)
    expect(state).toMatchObject({ kind: "today", dayLabel: "Intervals", lifts: 0 })
  })
})
