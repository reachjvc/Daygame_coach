import { describe, expect, it } from "vitest"
import nicotine from "@/src/quit/data/nicotine.json"
import { LAB } from "@/src/quit/lab/registry"
import type { QuitBand, QuitBelief } from "@/src/quit/types"
import { addResult, fearCandidates, parseResults, summarize, wantsReply, type BeliefResult } from "@/src/quit/lab/beliefs/best/logic"

const beliefs = nicotine.beliefs as unknown as QuitBelief[]
const bands = nicotine.bands as unknown as QuitBand[]
const rate = (f: (i: number) => number) => Object.fromEntries(beliefs.map((b, i) => [b.id, f(i)]))

describe("beliefs best: registry", () => {
  it("is registered as the improved nicotine variant", () => {
    const v = LAB.beliefs.variants.best
    expect(v.kind).toBe("best")
    expect(v.label).toBe("Improved")
    expect(v.addiction).toBe("nicotine")
  })
})

describe("beliefs best: held count and band", () => {
  it("counts only 4 and 5", () => {
    expect(summarize(rate(() => 3), beliefs, bands).held).toBe(0)
    expect(summarize(rate((i) => (i < 4 ? 4 : 5)), beliefs, bands).held).toBe(12)
    expect(summarize(rate((i) => [1, 2, 3, 4, 5][i % 5]), beliefs, bands).held).toBe(4)
  })
  it("picks the band by count", () => {
    expect(summarize(rate(() => 1), beliefs, bands).band?.id).toBe("free")
    expect(summarize(rate((i) => (i < 3 ? 5 : 1)), beliefs, bands).band?.id).toBe("some")
    expect(summarize(rate(() => 5), beliefs, bands).band?.id).toBe("hooked")
  })
  it("replies only to 4 and 5", () => {
    expect([1, 2, 3, 4, 5].map(wantsReply)).toEqual([false, false, false, true, true])
  })
})

describe("beliefs best: top three", () => {
  it("highest first, ties by data order, at most three", () => {
    const r = { ...rate(() => 1), b5: 5, b2: 5, b9: 4, b3: 4, b7: 3 }
    expect(summarize(r, beliefs, bands).top.map((b) => b.id)).toEqual(["b2", "b5", "b3"])
  })
  it("is empty when nothing is rated 3 or more", () => {
    expect(summarize(rate(() => 2), beliefs, bands).top).toEqual([])
  })
})

describe("beliefs best: fears", () => {
  it("offers the hard and stuck beliefs", () => {
    expect(fearCandidates(beliefs).map((b) => b.id)).toEqual(["b1", "b2", "b11", "b12"])
  })
})

describe("beliefs best: keeping earlier results", () => {
  const r = (on: string, v: number): BeliefResult => ({ on, ratings: { b1: v }, fears: [], noneOfThese: false, canStop: "yes" })
  it("adds the new one last and keeps the old", () => {
    const out = addResult([r("2026-11-01", 5)], r("2026-11-18", 2))
    expect(out.map((x) => x.on)).toEqual(["2026-11-01", "2026-11-18"])
    expect(out[0].ratings.b1).toBe(5)
  })
  it("keeps at most ten, dropping the oldest", () => {
    let list: BeliefResult[] = []
    for (let i = 1; i <= 12; i++) list = addResult(list, r(`2026-11-${String(i).padStart(2, "0")}`, 3))
    expect(list).toHaveLength(10)
    expect(list[0].on).toBe("2026-11-03")
  })
  it("reads saved results with checks", () => {
    const parsed = parseResults([{ on: "2026-11-01", ratings: { b1: 9, b2: 4 }, fears: ["b1", 7], noneOfThese: true, canStop: "maybe" }, { on: "bad" }, 3])
    expect(parsed).toEqual([{ on: "2026-11-01", ratings: { b2: 4 }, fears: ["b1"], noneOfThese: true, canStop: null }])
    expect(parseResults("x")).toEqual([])
  })
})
