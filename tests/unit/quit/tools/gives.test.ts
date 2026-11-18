import { describe, expect, it } from "vitest"
import { cleanNeeds, needsRating, orderSwaps, preselectNeeds } from "@/src/quit/tools/gives/logic"
import { topBeliefs } from "@/src/quit/tools/beliefs/logic"
import { makeValid } from "../fixtures/valid"

const swap = (id: string) => ({ id, text: id, evidence: "none" as const, refs: [] })
const swaps = [swap("a"), swap("b"), swap("c")]
const order = (rated: Record<string, number>) => orderSwaps(swaps, rated).map((s) => s.id)

describe("gives preselection", () => {
  it("takes the needs of the top beliefs, at most 3", () => {
    expect(preselectNeeds(null, ["relief", "reward", "sleep", "focus"])).toEqual(["relief", "reward", "sleep"])
  })

  it("preselects from a belief rated high in the lies test", () => {
    const { beliefs } = makeValid()
    const ratings = { b3: 5 }
    const needs = topBeliefs(ratings, beliefs).map((b) => b.need)
    expect(preselectNeeds(null, needs)).toEqual([beliefs[2].need])
  })

  it("?need= wins over the beliefs", () => {
    expect(preselectNeeds("sleep", ["relief", "reward"])).toEqual(["sleep"])
  })

  it("ignores unknown need ids and repeats", () => {
    expect(preselectNeeds("nope,sleep,sleep", ["relief"])).toEqual(["sleep"])
    expect(preselectNeeds("nope", ["relief"])).toEqual(["relief"])
    expect(cleanNeeds(["x", "relief", "relief"])).toEqual(["relief"])
  })

  it("returns nothing when there is nothing to preselect", () => {
    expect(preselectNeeds(null, [])).toEqual([])
  })
})

describe("orderSwaps", () => {
  it("keeps data order with no ratings", () => {
    expect(order({})).toEqual(["a", "b", "c"])
  })

  it("puts 60 or more first, highest first", () => {
    expect(order({ c: 90, b: 60 })).toEqual(["c", "b", "a"])
  })

  it("puts unrated before 30 to 59, and under 30 last", () => {
    expect(order({ a: 40, b: 10 })).toEqual(["c", "a", "b"])
    expect(order({ a: 59, b: 29, c: 30 })).toEqual(["a", "c", "b"])
  })

  it("reorders when the slider is saved", () => {
    expect(order({})).toEqual(["a", "b", "c"])
    expect(order({ b: 100 })).toEqual(["b", "a", "c"])
  })

  it("does not change the list it was given", () => {
    orderSwaps(swaps, { c: 100 })
    expect(swaps.map((s) => s.id)).toEqual(["a", "b", "c"])
  })
})

describe("needsRating", () => {
  it("shows the slider only for a swap marked on an earlier day", () => {
    expect(needsRating("2026-11-17", "2026-11-18")).toBe(true)
    expect(needsRating("2026-11-18", "2026-11-18")).toBe(false)
    expect(needsRating(undefined, "2026-11-18")).toBe(false)
  })
})
