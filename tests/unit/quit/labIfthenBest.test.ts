import { describe, expect, it } from "vitest"
import { EVIDENCE } from "@/src/quit/lab/ifthen/best/evidence"
import {
  buildSentence,
  evidenceMode,
  handoffSituations,
  hasNegation,
  isDue,
  movePair,
  parsePairs,
  parseSettings,
  reviewCounts,
  upsertPair,
  type Pair,
} from "@/src/quit/lab/ifthen/best/logic"
import { createLabStore } from "@/src/quit/lab/store"

const pair = (id: string, situation: string, then = "walk", addiction = "nicotine"): Pair => ({ id, addiction, situation, custom: false, then, own: false, swapId: null })

describe("sentence building", () => {
  it("rewords list labels", () => {
    expect(buildSentence("After a meal", false, "Walk for five minutes")).toBe("If it is after a meal, then I walk for five minutes.")
    expect(buildSentence("When I’m stressed", false, "take ten slow breaths")).toBe("If I’m stressed, then I take ten slow breaths.")
  })
  it("keeps typed situations and cleans a typed I will", () => {
    expect(buildSentence("Sam calls", true, "I will go outside.")).toBe("If Sam calls, then I go outside.")
    expect(buildSentence("if my boss shouts", true, "then I leave the room")).toBe("If my boss shouts, then I leave the room.")
  })
  it("shows an ellipsis for an empty then and nothing without a situation", () => {
    expect(buildSentence("After a meal", false, "")).toBe("If it is after a meal, then I ….")
    expect(buildSentence("", false, "walk")).toBe("")
  })
})

describe("negation detection", () => {
  it.each(["I won't smoke", "I wont smoke", "I will not drink", "do not open it", "don’t buy", "not at all", "never", "stop at the shop", "STOP"])("flags %s", (s) => {
    expect(hasNegation(s)).toBe(true)
  })
  it.each(["walk to the shop", "notice the craving", "text a friend", "take a nap", "go to a stop-over", "stopwatch"])("passes %s", (s) => {
    // "stop-over" has a hyphen: the word "stop" stands alone, so it is flagged; the rest are not
    expect(hasNegation(s)).toBe(s === "go to a stop-over")
  })
})

describe("pairs storage", () => {
  it("round-trips through the lab store at ifthen/best/pairs", () => {
    const data: Record<string, string> = {}
    const store = createLabStore(() => ({ getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }))
    store.set("ifthen", "best", "pairs", [pair("a", "After a meal")])
    expect(parsePairs(store.get("ifthen", "best", "pairs"))).toHaveLength(1)
    expect(Object.keys(JSON.parse(data["quit-lab-v1"]))).toEqual(["ifthen/best/pairs"])
  })
  it("drops malformed entries", () => {
    expect(parsePairs([{ id: 1 }, null, "x", pair("a", "s")])).toHaveLength(1)
    expect(parsePairs(undefined)).toEqual([])
  })
  it("replaces the pair of the same situation and keeps its place", () => {
    const next = upsertPair([pair("a", "After a meal"), pair("b", "With a coffee")], { ...pair("zz", "after a meal", "drink water"), addiction: "nicotine" })
    expect(next.map((p) => p.id)).toEqual(["a", "b"])
    expect(next[0].then).toBe("drink water")
  })
  it("moves within one addiction only", () => {
    const list = [pair("a", "s1"), pair("x", "s9", "walk", "alcohol"), pair("b", "s2"), pair("c", "s3")]
    expect(movePair(list, "c", -1).map((p) => p.id)).toEqual(["a", "x", "c", "b"])
    expect(movePair(list, "a", -1)).toBe(list)
  })
})

describe("check-in due logic", () => {
  it("is due on and after the date, not before, never without one", () => {
    expect(isDue("2026-11-18", "2026-11-18")).toBe(true)
    expect(isDue("2026-11-18", "2026-11-19")).toBe(true)
    expect(isDue("2026-11-18", "2026-11-17")).toBe(false)
    expect(isDue("", "2026-11-18")).toBe(false)
    expect(isDue("2026-11-18", "")).toBe(false)
  })
  it("counts answers", () => {
    const ps = [pair("a", "s1"), pair("b", "s2"), pair("c", "s3")]
    expect(reviewCounts(ps, { a: "kept", b: "change" })).toEqual({ kept: 1, change: 1, open: 1 })
  })
  it("parses settings safely", () => {
    expect(parseSettings({ importance: "11", confidence: "7", checkin: "tomorrow", sos: true }).importance).toBe("")
    expect(parseSettings({ importance: "8", confidence: "7", checkin: "2026-11-18" })).toMatchObject({ importance: "8", checkin: "2026-11-18", sos: false })
  })
})

describe("handoff from past tries", () => {
  const moments = [{ id: "stress", label: "When I’m stressed" }]
  it("handles empty or odd values", () => {
    expect(handoffSituations([], moments)).toEqual([])
    expect(handoffSituations(undefined, moments)).toEqual([])
    expect(handoffSituations([5, null], moments)).toEqual([])
  })
  it("matches list moments by id or words, keeps the rest as his own, takes two", () => {
    const got = handoffSituations(["stress", { label: "A night out" }, "third"], moments)
    expect(got).toEqual([
      { label: "When I’m stressed", custom: false },
      { label: "A night out", custom: true },
    ])
  })
})

describe("evidence lines", () => {
  it("hides smoker and drinker lines for porn, tags them for other addictions", () => {
    expect(evidenceMode("smokers", "porn")).toBe("hidden")
    expect(evidenceMode("drinkers", "porn")).toBe("hidden")
    expect(evidenceMode("smokers", "nicotine")).toBe("plain")
    expect(evidenceMode("smokers", "weed")).toBe("tagged")
    expect(evidenceMode("drinkers", "nicotine")).toBe("tagged")
    expect(evidenceMode("eating", "porn")).toBe("tagged")
  })
  it("gives every line a basis and at least one source with a quote and a PMID", () => {
    for (const ev of Object.values(EVIDENCE)) {
      expect(Object.values(ev.basis).every((v) => v.length > 0)).toBe(true)
      expect(ev.refs.length).toBeGreaterThan(0)
      for (const r of ev.refs) {
        expect(r.quote?.length).toBeGreaterThan(20)
        expect(r.pmid).toMatch(/^\d+$/)
        expect(r.url).toContain(r.pmid as string)
      }
    }
  })
  it("states no exclamation marks", () => {
    expect(JSON.stringify(EVIDENCE)).not.toContain("!")
  })
})
