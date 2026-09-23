/**
 * "WHAT DID I DO LAST TIME" — one question, one matching rule.
 *
 * It used to have two answers on one screen. The PREVIOUS column matched on
 * the program's private `exercise_id` and could only see that program's own
 * session logs; the lift history sheet matched on the exercise NAME and read
 * every workout. So a self-built week calling it "Back Squat" never counted
 * towards Squat, a lift added on the day had no history at all, and a workout
 * started off a program had an empty column throughout.
 */

import { describe, it, expect } from "vitest"
import { pickLastSets, setMatchesLift } from "@/src/programs/programsService"

const set = (
  exercise: string,
  setNumber: number,
  opts: { libraryId?: string | null; weight?: number; reps?: number; kind?: string } = {}
) => ({
  exercise,
  libraryId: opts.libraryId ?? null,
  setNumber,
  weight: opts.weight ?? 100,
  reps: opts.reps ?? 5,
  kind: opts.kind ?? "working",
})

describe("setMatchesLift", () => {
  it("matches on the library id when both sides have one", () => {
    expect(
      setMatchesLift(
        { exercise: "Back Squat", libraryId: "squat" },
        { name: "Squat", libraryId: "squat" }
      )
    ).toBe(true)
  })

  it("matches on the name when the stored row has no library id", () => {
    // Rows written by `logProgramSession` carry no `library_id` at all, so the
    // name is the only key they have. Matching on the id alone would make
    // every program-logged session invisible.
    expect(
      setMatchesLift({ exercise: "Squat", libraryId: null }, { name: " squat ", libraryId: "squat" })
    ).toBe(true)
  })

  it("matches on the name when the lift on screen has no library id", () => {
    expect(
      setMatchesLift({ exercise: "Squat", libraryId: "squat" }, { name: "SQUAT" })
    ).toBe(true)
  })

  it("is not fooled by a different lift under a different id", () => {
    expect(
      setMatchesLift(
        { exercise: "Front Squat", libraryId: "front_squat" },
        { name: "Squat", libraryId: "squat" }
      )
    ).toBe(false)
  })

  it("neither an id nor a name in common is not a match", () => {
    expect(setMatchesLift({ exercise: "Bench Press" }, { name: "Squat" })).toBe(false)
  })
})

describe("pickLastSets", () => {
  const workouts = [
    { at: "2026-09-20T10:00:00Z", sets: [set("Bench Press", 1, { weight: 80 })] },
    {
      at: "2026-09-18T10:00:00Z",
      sets: [set("Squat", 2, { weight: 102.5 }), set("Squat", 1, { weight: 102.5 })],
    },
    { at: "2026-09-15T10:00:00Z", sets: [set("Squat", 1, { weight: 100 })] },
  ]

  it("takes the newest session that contains the lift, not the newest workout", () => {
    // The newest workout has no squats in it. "Last time" means the last time
    // you squatted, not the last time you were in the gym.
    const [last, ...rest] = pickLastSets(workouts, { name: "Squat" })
    expect(rest).toHaveLength(0)
    expect(last.at).toBe("2026-09-18T10:00:00Z")
    expect(last.sets.map((s) => s.weight)).toEqual([102.5, 102.5])
  })

  it("returns the sets in set order, whatever order they were read in", () => {
    const [last] = pickLastSets(workouts, { name: "Squat" })
    expect(last.sets.map((s) => s.setNumber)).toEqual([1, 2])
  })

  it("keeps the order it was given rather than re-deriving it from the date", () => {
    // Two workouts on one day: the read's tie-break decided which is newer,
    // and re-sorting here on a date they share would flip a coin.
    const sameDay = [
      { at: "2026-09-18T10:00:00Z", sets: [set("Squat", 1, { weight: 110 })] },
      { at: "2026-09-18T10:00:00Z", sets: [set("Squat", 1, { weight: 90 })] },
    ]
    expect(pickLastSets(sameDay, { name: "Squat" })[0].sets[0].weight).toBe(110)
  })

  it("gives several sessions when asked, newest first, skipping the ones without it", () => {
    const got = pickLastSets(workouts, { name: "Squat" }, 5)
    expect(got.map((s) => s.at)).toEqual(["2026-09-18T10:00:00Z", "2026-09-15T10:00:00Z"])
  })

  it("is empty for a lift never done — and empty is not a zero", () => {
    expect(pickLastSets(workouts, { name: "Deadlift" })).toEqual([])
  })

  it("finds a lift logged under its other name", () => {
    const logged = [
      { at: "2026-09-18T10:00:00Z", sets: [set("Back Squat", 1, { libraryId: "squat" })] },
    ]
    expect(pickLastSets(logged, { name: "Squat", libraryId: "squat" })).toHaveLength(1)
  })
})
