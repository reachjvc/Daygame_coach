/**
 * HOW LONG THE REST CLOCK COUNTS FOR.
 *
 * Three things can decide it, in this order: what you edited on this workout,
 * what the program's author asked for, then our own guess.
 *
 * The screen asked `restSecondsFor({ name })` — dropping the first two — so a
 * program that specifies three minutes got our ninety seconds, under a caption
 * reading "our suggestion". The author's number existed on the catalogue's
 * exercise the whole time and was thrown away on the way to the prescription.
 */

import { describe, it, expect } from "vitest"
import {
  restTargetFor,
  withRest,
  MIN_REST_SEC,
  MAX_REST_SEC,
  computePrescription,
  seedEnrollment,
  groupOrdinal,
} from "@/src/programs/programsService"
import { requireProgram } from "@/src/programs/data/catalog"
import type { PrescribedExercise } from "@/src/programs/types"

const lift = (over: Partial<PrescribedExercise> = {}): PrescribedExercise =>
  ({ exerciseId: "squat", name: "Squat", sets: [], ...over }) as PrescribedExercise

describe("where the rest target comes from", () => {
  it("uses the author's rest, and does not call it ours", () => {
    const target = restTargetFor(lift({ restSec: 180 }), null)
    expect(target.seconds).toBe(180)
    expect(target.ours, "it is the program's number, not ours").toBe(false)
    expect(target.edited).toBe(false)
  })

  it("falls back to our own guess, and says so", () => {
    const target = restTargetFor(lift({ name: "Squat" }), null)
    expect(target.ours).toBe(true)
    expect(target.edited).toBe(false)
  })

  it("what you edited beats both", () => {
    const target = restTargetFor(lift({ restSec: 180 }), { rest: { squat: 45 } })
    expect(target.seconds).toBe(45)
    expect(target.edited).toBe(true)
    expect(target.ours).toBe(false)
  })

  it("an edit beats the warm-up default too", () => {
    // You changed it on this lift, on this workout. That is as specific as an
    // instruction gets, and a warm-up is still that lift.
    expect(restTargetFor(lift(), { rest: { squat: 120 } }, { warmup: true }).seconds).toBe(120)
    // Unedited, a warm-up tick rests the short warm-up rest.
    expect(restTargetFor(lift(), null, { warmup: true }).seconds).toBeLessThan(90)
  })

  it("another lift's edit does not leak into this one", () => {
    const target = restTargetFor(lift({ exerciseId: "bench" }), { rest: { squat: 45 } })
    expect(target.edited).toBe(false)
  })
})

describe("the author's rest reaches the prescription", () => {
  it("survives the trip from the catalogue to the screen", () => {
    /**
     * The real chain, not a fixture: `carried()` dropped `restSec`, so this
     * is the assertion that would have caught it.
     */
    const program = requireProgram("bodyweight-foundations")
    const { exerciseState, cursor } = seedEnrollment(program, "beginner", "kg")
    const prescription = computePrescription(program, {
      exerciseState,
      cursor,
      unitSystem: "kg",
    } as never)

    const withRestSec = prescription.exercises.filter((ex) => ex.restSec != null)
    expect(
      withRestSec.length,
      "this program specifies its own rest; none of it arrived"
    ).toBeGreaterThan(0)
    // And it is then treated as the author's, not as ours.
    expect(restTargetFor(withRestSec[0], null).ours).toBe(false)
  })
})

describe("editing a rest", () => {
  it("keeps every other lift's, and replaces the one", () => {
    // Built at the call site, one lift's edit wipes another's — the write is
    // a whole-map PATCH.
    const next = withRest({ rest: { squat: 180, bench: 90 } }, "bench", 120)
    expect(next).toEqual({ squat: 180, bench: 120 })
  })

  it("clamps to what a rest can be, rather than refusing", () => {
    expect(withRest(null, "squat", 5).squat).toBe(MIN_REST_SEC)
    expect(withRest(null, "squat", 9999).squat).toBe(MAX_REST_SEC)
    // A half-second from a −15 tap is a whole number of seconds.
    expect(withRest(null, "squat", 92.4).squat).toBe(92)
  })

  it("starts a map when the workout has none", () => {
    expect(withRest(undefined, "squat", 120)).toEqual({ squat: 120 })
  })
})

describe("numbering a superset pair", () => {
  it("numbers within the pair, not the day", () => {
    /**
     * The screen printed the lift's position in the whole list, so a Push day
     * with two pairs read A1, A2, B3, B4 — or worse, A4/A5. A tag whose
     * number is not the number within the superset reads as a set count.
     */
    const day = [
      { supersetGroup: "A" },
      { supersetGroup: "A" },
      { supersetGroup: "B" },
      { supersetGroup: "B" },
    ]
    expect(day.map((_, i) => groupOrdinal(day, i))).toEqual([1, 2, 1, 2])
  })

  it("counts only its own group, even when pairs are interleaved", () => {
    const day = [
      { supersetGroup: "A" },
      { supersetGroup: "B" },
      { supersetGroup: "A" },
      { supersetGroup: "B" },
    ]
    expect(day.map((_, i) => groupOrdinal(day, i))).toEqual([1, 1, 2, 2])
  })

  it("a lift in no pair keeps its place in the day", () => {
    const day = [{ supersetGroup: "A" }, {}, { supersetGroup: "A" }]
    expect(groupOrdinal(day, 1)).toBe(2)
  })

  it("a day with no pairs at all is unchanged", () => {
    const day = [{}, {}, {}]
    expect(day.map((_, i) => groupOrdinal(day, i))).toEqual([1, 2, 3])
  })
})
