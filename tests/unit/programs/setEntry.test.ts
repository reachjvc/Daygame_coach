/**
 * ONE RULE FOR WHAT A SET MAY CONTAIN, CHECKED FROM BOTH ENDS.
 *
 * The row and the server each carried their own copy of the bounds, and the
 * row carried its own conversion of an empty box. That is two ways to
 * disagree, and both of them only show up in the gym: the row lets the tick go
 * green and the 400 arrives afterwards, or the row sends 0 kg for a bench
 * press and nothing downstream can ever tell that from a pull-up.
 *
 * So this file pins the two halves TOGETHER — `readSetEntry` decides, and the
 * sentence it shows is the sentence `CompleteSetSchema` returns.
 */

import { describe, it, expect } from "vitest"
import { readSetEntry } from "@/src/programs/programsService"
import { CompleteSetSchema, SET_LIMITS, setLimitSentence } from "@/src/programs/schemas"
import { MAX_WEIGHT_KG } from "@/src/shared/weight"

const entry = (weight: string, reps: string, opts: { bodyweight?: boolean; unweightedOk?: boolean } = {}) =>
  readSetEntry({ weight, reps, ...opts })

describe("an empty weight is not zero", () => {
  it("refuses a barbell lift with the weight box empty, and names the box", () => {
    const { problem } = entry("", "5")
    expect(problem).toEqual({ field: "weight", reason: "missing" })
  })

  it("is 0 on purpose on a lift you can do with nothing added", () => {
    const read = entry("", "12", { unweightedOk: true })
    expect(read.problem).toBeNull()
    expect(read.weight).toBe(0)
    expect(read.reps).toBe(12)
  })

  it("is 0 on purpose on a lift with no weight box at all", () => {
    const read = entry("", "45", { bodyweight: true })
    expect(read.problem).toBeNull()
    expect(read.weight).toBe(0)
  })

  it("sends what was typed on a weighted pull-up", () => {
    expect(entry("20", "5", { unweightedOk: true })).toMatchObject({ problem: null, weight: 20, reps: 5 })
  })

  it("refuses an empty reps box on every kind of lift", () => {
    for (const opts of [{}, { unweightedOk: true }, { bodyweight: true }]) {
      expect(entry("100", "", opts).problem).toEqual({ field: "reps", reason: "missing" })
    }
  })

  it("a weight that is not a number at all is a missing weight, not NaN", () => {
    const read = entry("abc", "5")
    expect(read.problem).toEqual({ field: "weight", reason: "missing" })
    expect(Number.isNaN(read.weight)).toBe(false)
  })
})

describe("a number the database cannot hold", () => {
  it("names the weight, even while the reps box is still empty", () => {
    // The out-of-range number is the one that needs a sentence: an empty box is
    // visibly empty, but 5000 looks like a good answer until something says no.
    expect(entry("5000", "").problem).toEqual({ field: "weight", reason: "out-of-range" })
  })

  it("refuses reps past the ceiling, and a fraction of a rep", () => {
    expect(entry("100", "1001").problem).toEqual({ field: "reps", reason: "out-of-range" })
    expect(entry("100", "5.5").problem).toEqual({ field: "reps", reason: "out-of-range" })
  })

  it("accepts the ceiling itself, in both boxes", () => {
    expect(entry(String(SET_LIMITS.weightMax), String(SET_LIMITS.repsMax)).problem).toBeNull()
  })

  it("refuses a negative weight or negative reps", () => {
    expect(entry("-1", "5").problem).toEqual({ field: "weight", reason: "out-of-range" })
    expect(entry("100", "-1").problem).toEqual({ field: "reps", reason: "out-of-range" })
  })

  it("a plank held for 0 seconds is a fact, not a refusal", () => {
    // 0 reps means attempted and failed, which the database stores on purpose.
    expect(entry("100", "0").problem).toBeNull()
  })
})

describe("the row and the server quote the same numbers", () => {
  it("SET_LIMITS' weight ceiling is the column's ceiling", () => {
    expect(SET_LIMITS.weightMax).toBe(MAX_WEIGHT_KG)
  })

  it("the server's first issue for 1000 kg is the sentence the row shows", () => {
    const parsed = CompleteSetSchema.safeParse({
      exerciseId: "squat",
      exercise: "Squat",
      weight: 1000,
      reps: 5,
      setNumber: 1,
    })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe(setLimitSentence("weight"))
    // And the row's version of it is the same sentence with the box's own unit.
    expect(setLimitSentence("weight", { unitLabel: "lb" })).toBe(
      `Weight must be between 0 and ${SET_LIMITS.weightMax} lb.`
    )
  })

  it("the server's first issue for 1001 reps and for half a rep is the reps sentence", () => {
    for (const reps of [1001, 5.5]) {
      const parsed = CompleteSetSchema.safeParse({
        exerciseId: "squat",
        exercise: "Squat",
        weight: 100,
        reps,
        setNumber: 1,
      })
      expect(parsed.success, `reps ${reps} should be refused`).toBe(false)
      expect(parsed.error?.issues[0]?.message).toBe(setLimitSentence("reps"))
    }
    // The plank row says "Seconds", because that is what its box is labelled.
    expect(setLimitSentence("reps", { repWord: "Seconds" })).toBe(
      `Seconds must be a whole number between 0 and ${SET_LIMITS.repsMax}.`
    )
  })

  it("the set number is bounded too, and says so in words", () => {
    const parsed = CompleteSetSchema.safeParse({
      exerciseId: "squat",
      exercise: "Squat",
      weight: 100,
      reps: 5,
      setNumber: SET_LIMITS.setMax + 1,
    })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe(setLimitSentence("setNumber"))
  })

  it("nothing outside SET_LIMITS is refused: the ceiling in every box is accepted", () => {
    const parsed = CompleteSetSchema.safeParse({
      exerciseId: "squat",
      exercise: "Squat",
      weight: SET_LIMITS.weightMax,
      reps: SET_LIMITS.repsMax,
      setNumber: SET_LIMITS.setMax,
    })
    expect(parsed.success).toBe(true)
  })
})
