import { describe, expect, it } from "vitest"
import { addDays } from "@/src/quit/lab/checkin/shared/logic"
import { MIN_CHECKINS, cellLevel, lookBack, monthCounts, pairing, pairingCounts, patternsOf, seedBest, splitFeelings, type BestDays } from "@/src/quit/lab/checkin/best/logic"
import { bestText as t } from "@/src/quit/lab/checkin/best/text"

const TODAY = "2026-11-18"

/** `n` days ending yesterday, each built from its index (1 = yesterday). */
const make = (n: number, f: (i: number) => BestDays[string]): BestDays => {
  const out: BestDays = {}
  for (let i = 1; i <= n; i++) out[addDays(TODAY, -i)] = f(i)
  return out
}

describe("checkin best: month counts", () => {
  const days: BestDays = {
    "2026-11-03": { slipped: false },
    "2026-11-04": { slipped: true },
    "2026-11-05": { pledge: "Stay clear." },
    "2026-11-06": {},
    "2026-10-30": { slipped: false },
  }
  it("counts days with anything saved and clear days, per month", () => {
    expect(monthCounts(days, "2026-11")).toEqual({ checkedIn: 3, clear: 1 })
    expect(monthCounts(days, "2026-10")).toEqual({ checkedIn: 1, clear: 1 })
    expect(monthCounts(days, "2026-09")).toEqual({ checkedIn: 0, clear: 0 })
  })
  it("a slip in one month does not change another month", () => {
    expect(monthCounts({ ...days, "2026-11-07": { slipped: true } }, "2026-10")).toEqual({ checkedIn: 1, clear: 1 })
  })
})

describe("checkin best: forecast against result", () => {
  it("pairs only when both exist and gives the difference", () => {
    expect(pairing({ forecast: 4, hard: 2 })).toEqual({ forecast: 4, hard: 2, diff: -2 })
    expect(pairing({ forecast: 2 })).toBeNull()
    expect(pairing({ hard: 2 })).toBeNull()
    expect(pairing(undefined)).toBeNull()
  })
  it("counts harder, easier and same", () => {
    const d: BestDays = { a: { forecast: 2, hard: 4 }, b: { forecast: 3, hard: 3 }, c: { forecast: 4, hard: 1 }, d: { forecast: 4 }, e: { forecast: 1, hard: 2 } }
    expect(pairingCounts(d)).toEqual({ n: 4, harder: 2, easier: 1, same: 1 })
  })
})

describe("checkin best: look back for yesterday", () => {
  it("offers yesterday only while it has no evening answer", () => {
    expect(lookBack({}, TODAY)).toBe("2026-11-17")
    expect(lookBack({ "2026-11-17": { pledge: "x" } }, TODAY)).toBe("2026-11-17")
    expect(lookBack({ "2026-11-17": { slipped: true } }, TODAY)).toBeNull()
    expect(lookBack({ "2026-11-17": { slipped: false } }, TODAY)).toBeNull()
  })
  it("the example leaves yesterday open", () => {
    expect(lookBack(seedBest(TODAY), TODAY)).toBe("2026-11-17")
  })
})

describe("checkin best: pattern lines", () => {
  it("shows nothing below 14 check-ins", () => {
    const p = patternsOf(make(MIN_CHECKINS - 1, (i) => ({ slipped: i % 2 === 0, forecast: i % 2 === 0 ? 5 : 1 })))
    expect(p.ready).toBe(false)
    expect(p.count).toBe(13)
    expect(p.lines).toEqual([])
  })
  it("counts only days with a result", () => {
    const d = make(14, () => ({ slipped: false }))
    d["2026-01-01"] = { pledge: "x" }
    expect(patternsOf(d).count).toBe(14)
  })
  it("the forecast line carries both day counts and the slips on each side", () => {
    const days = make(14, (i) => ({ forecast: i <= 5 ? 5 : 2, slipped: i <= 2 || i === 9 }))
    const p = patternsOf(days)
    expect(p.ready).toBe(true)
    const l = p.lines.find((x) => x.kind === "forecast")
    expect(l).toMatchObject({ withDays: 5, withSlips: 2, otherDays: 9, otherSlips: 1 })
    const text = t.forecastPattern(l!.withDays, l!.withSlips, l!.otherDays, l!.otherSlips)
    expect(text).toBe("On the 5 days you expected it to be hard, you slipped on 2; on the other 9 days, on 1.")
    expect(text).not.toMatch(/%|percent|likely|!/)
  })
  it("no line when a side has fewer than 3 days", () => {
    const days = make(14, (i) => ({ forecast: i <= 2 ? 5 : 2, slipped: i <= 2 }))
    expect(patternsOf(days).lines.find((x) => x.kind === "forecast")).toBeUndefined()
  })
  it("no line when both sides slip at the same share (4 of 4... 2 of 4 and 5 of 10)", () => {
    const tie = make(14, (i) => ({ forecast: i <= 4 ? 5 : 1, slipped: i <= 2 || (i >= 5 && i <= 9) }))
    expect(patternsOf(tie).lines.find((x) => x.kind === "forecast")).toBeUndefined()
  })
  it("says no pattern when there are no lines", () => {
    const p = patternsOf(make(14, () => ({ slipped: false })))
    expect(p.ready).toBe(true)
    expect(p.lines).toEqual([])
    expect(t.patternNone(p.count)).toContain("No pattern")
  })
  it("the example gives forecast, urges and at most two feelings, each with counts", () => {
    const p = patternsOf(seedBest(TODAY))
    expect(p.count).toBe(20)
    const kinds = p.lines.map((l) => l.kind)
    expect(kinds[0]).toBe("forecast")
    expect(kinds).toContain("urges")
    expect(p.lines.find((l) => l.key === "bored")).toMatchObject({ withDays: 4, withSlips: 3, otherDays: 16, otherSlips: 1 })
    expect(p.lines.filter((l) => l.kind === "feeling").length).toBeLessThanOrEqual(2)
    expect(p.lines.every((l) => l.withDays >= 3 && l.otherDays >= 3)).toBe(true)
    expect(p.pairs.n).toBe(20)
  })
  it("a feeling marked on 2 days is never compared", () => {
    const days = make(14, (i) => ({ slipped: i <= 2, feelings: i <= 2 ? ["bored"] : [] }))
    expect(patternsOf(days).lines).toEqual([])
  })
})

describe("checkin best: calendar modes, feelings, example", () => {
  it("cell levels per mode", () => {
    expect(cellLevel({ slipped: true }, "clear").state).toBe("slip")
    expect(cellLevel({ slipped: false }, "clear").state).toBe("clear")
    expect(cellLevel({ hard: 3 }, "hard")).toEqual({ state: "set", level: 3 })
    expect(cellLevel({ feelings: ["a", "b"] }, "feelings").level).toBe(2)
    expect(cellLevel({ note: " " }, "notes").state).toBe("none")
    expect(cellLevel(undefined, "hard").state).toBe("none")
  })
  it("splits feeling words, and falls back to a neutral set", () => {
    const s = splitFeelings({ craving: "Cravings", proud: "Feeling proud" })
    expect(s.hard.map(([k]) => k)).toEqual(["craving"])
    expect(s.good.map(([k]) => k)).toEqual(["proud"])
    expect(splitFeelings(undefined).hard.length).toBeGreaterThan(0)
    expect(splitFeelings({}).good.length).toBeGreaterThan(0)
  })
  it("has 20 labelled days and wording per addiction", () => {
    expect(Object.keys(seedBest(TODAY))).toHaveLength(20)
    expect(t.outcomeSlip("nicotine")).toBe("Yes, I smoked")
    expect(t.outcomeSlip("weed")).toBe("Yes, I used")
    expect(t.outcomeSlip("alcohol")).toBe("Yes, I drank")
    expect(t.outcomeSlip("porn")).toBe("Yes, I watched")
  })
})
