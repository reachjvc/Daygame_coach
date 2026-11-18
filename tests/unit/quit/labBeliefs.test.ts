import { describe, expect, it } from "vitest"
import { DIMS, dimensions, radarPoint, scenarioPool, standout, totalScore } from "@/src/quit/lab/beliefs/a/logic"
import { AMOUNT_MIDPOINTS, barPercent, knowMark, stepComplete, yearCostUsd } from "@/src/quit/lab/beliefs/b/logic"
import { PRESETS, clampStep, clock, insightKey, persona, presetStep, tally } from "@/src/quit/lab/beliefs/c/logic"

const none = { triggers: [], scenarios: [], areas: [], fears: [] }

describe("copy A score (inferred formula)", () => {
  it("starts every dimension at 60 with no answers", () => {
    const d = dimensions(none)
    for (const k of DIMS) expect(d[k]).toBe(60)
    expect(totalScore(d)).toBe(60)
  })
  it("stays in 20..95 and is deterministic", () => {
    const all = { triggers: ["longday", "social", "stress", "dinner", "kids"], scenarios: ["s1", "s2", "s3", "s4", "s5", "s6"], areas: ["sleep", "weight", "energy", "mood", "relationships", "work"], fears: ["judged", "fun", "social", "thatperson", "failing", "partner", "ritual"] }
    const d = dimensions(all)
    for (const k of DIMS) {
      expect(d[k]).toBeGreaterThanOrEqual(20)
      expect(d[k]).toBeLessThanOrEqual(95)
    }
    expect(dimensions(all)).toEqual(d)
    expect(totalScore(d)).toBeGreaterThanOrEqual(20)
    expect(totalScore(d)).toBeLessThanOrEqual(95)
  })
  it("fears lower social confidence; body areas raise body readiness", () => {
    expect(dimensions({ ...none, fears: ["judged"] }).confidence).toBeLessThan(60)
    expect(dimensions({ ...none, areas: ["sleep"] }).body).toBeGreaterThan(60)
    expect(standout(dimensions({ ...none, areas: ["sleep", "weight"] }))).toBe("body")
  })
  it("rotates the 6 scenario cards by first trigger", () => {
    expect(scenarioPool([])).toEqual(["s1", "s2", "s3", "s4", "s5", "s6"])
    expect(scenarioPool(["social"])).toEqual(["s3", "s4", "s5", "s6", "s7", "s8"])
    expect(scenarioPool(["stress"]).length).toBe(6)
  })
  it("puts radar axis 0 at the top", () => {
    const [x, y] = radarPoint(0, 100, 150, 130, 80)
    expect(Math.round(x)).toBe(150)
    expect(Math.round(y)).toBe(50)
  })
})

describe("copy B", () => {
  it("fills the bar 11 per step", () => {
    expect([1, 3, 4, 5, 6, 7, 8, 9].map(barPercent)).toEqual([11, 33, 44, 55, 66, 77, 88, 100])
  })
  it("requires every statement on a belief page", () => {
    const f = { ratings: { relax: 2, concentrate: 2 }, know: {} }
    expect(stepComplete(4, f)).toBe(false)
    expect(stepComplete(4, { ...f, ratings: { ...f.ratings, boredom: 3 } })).toBe(true)
    expect(stepComplete(3, { ratings: {}, know: {}, amount: 0 })).toBe(false)
    expect(stepComplete(3, { ratings: {}, know: {}, amount: 0, tried: false })).toBe(true)
  })
  it("marks only the one answer with a shown key", () => {
    expect(knowMark("when", 1)).toBe("right")
    expect(knowMark("when", 0)).toBe("wrong")
    expect(knowMark("sixh", 4)).toBe("unmarked")
    expect(knowMark("when", undefined)).toBe("unmarked")
  })
  it("costs a year from the band midpoint and the data price", () => {
    expect(yearCostUsd(undefined, 0.52)).toBeUndefined()
    expect(yearCostUsd(1, 0.5)).toBe(Math.round(AMOUNT_MIDPOINTS[1] * 0.5 * 365))
  })
})

describe("copy C", () => {
  it("picks the persona with most answers; a tie goes to the middle", () => {
    expect(tally([0, 0, 1, 2, undefined])).toEqual([2, 1, 1])
    expect(persona([0, 0, 0, 1, 2])).toBe(0)
    expect(persona([2, 2, 2, 1, 0])).toBe(2)
    expect(persona([0, 1, 2])).toBe(1)
    expect(persona([0, 0, 1, 1, 2])).toBe(1)
  })
  it("formats slider times from 6 AM to 2 AM next day", () => {
    expect(clock(0)).toBe("6 AM")
    expect(clock(48)).toBe("6 PM")
    expect(clock(47)).toBe("5:45 PM")
    expect(clock(80)).toBe("2 AM")
    expect(clock(clampStep(99))).toBe("2 AM")
    expect(clampStep(-3)).toBe(0)
  })
  it("puts presets on the slider and keeps the 6 PM line apart", () => {
    expect(PRESETS.map((p) => clock(presetStep(p.at)))).toEqual(["9 AM", "12:30 PM", "3 PM", "5:30 PM", "6:30 PM", "8:30 PM", "10:30 PM"])
    expect(insightKey(48)).toBe("six")
    expect(insightKey(presetStep("17:30"))).toBe("afterWork")
  })
})
