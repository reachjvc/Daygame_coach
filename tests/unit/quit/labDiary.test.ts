import { describe, expect, it } from "vitest"
import { LAB } from "@/src/quit/lab/registry"
import { isAddictionId } from "@/src/quit/menu"
import { lastDays, pct, pctText, ringArcs, tally, trailingZeroDays, weekOf } from "@/src/quit/lab/diary/shared/logic"
import { insightNumbers, meanIntensity, moodShares, mostCommonMood, seedCheckIns, upsert, urgesSeries, type CheckIn } from "@/src/quit/lab/diary/c/logic"
import { TRIGGER_CATEGORY, TRIGGER_COUNT, seedCravings, triggerShares } from "@/src/quit/lab/diary/e/logic"
import { seedLog } from "@/src/quit/lab/diary/d/logic"

const NOW = new Date(2026, 10, 18, 12, 0, 0).getTime()
const ci = (date: string, urges: number, intensity: number, mood: number | null, smoked = false): CheckIn => ({ date, urges, intensity, mood, smoked })

describe("diary shared maths", () => {
  it("percent is share of the total, whole, one or two decimals", () => {
    expect(pct(2, 9)).toBe(22)
    expect(pct(1, 9)).toBe(11)
    expect(pctText(3, 18, 1)).toBe("16.7")
    expect(pctText(3, 9, 2)).toBe("33.33")
    expect(pct(1, 0)).toBe(0)
  })
  it("tally sorts largest first and keeps first-seen order on ties", () => {
    expect(tally(["a", "b", "b", "c", "a", "b"])).toEqual([
      { key: "b", count: 3 },
      { key: "a", count: 2 },
      { key: "c", count: 1 },
    ])
  })
  it("a ring has one arc per non-zero count and none when empty", () => {
    expect(ringArcs([2, 0, 1], 50, 100).map((a) => a.index)).toEqual([0, 2])
    expect(ringArcs([0, 0], 50, 100)).toEqual([])
    expect(ringArcs([5], 50, 100)).toHaveLength(1)
  })
  it("days and weeks", () => {
    const d = lastDays(NOW, 14)
    expect(d).toHaveLength(14)
    expect(d[13]).toBe("2026-11-18")
    expect(weekOf(NOW)).toEqual(["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"])
    expect(trailingZeroDays([3, 0, 0])).toBe(2)
    expect(trailingZeroDays([0, 1])).toBe(0)
  })
})

describe("copy C aggregation", () => {
  const rows = [ci("2026-11-10", 4, 8, 1), ci("2026-11-11", 2, 6, 1), ci("2026-11-12", 0, 0, null), ci("2026-11-13", 3, 7, 0, true)]
  it("mood shares count check-ins with a mood, largest first", () => {
    expect(moodShares(rows).map((s) => [s.key, s.count])).toEqual([
      ["1", 2],
      ["0", 1],
    ])
    expect(moodShares(rows, 0)).toEqual([{ key: "0", count: 1 }])
    expect(mostCommonMood(rows)).toBe(1)
    expect(mostCommonMood([])).toBeNull()
  })
  it("urges per day are the typed numbers, in date order; intensity mean is over days", () => {
    expect(urgesSeries([...rows].reverse()).map((p) => p.value)).toEqual([4, 2, 0, 3])
    expect(meanIntensity(rows)).toBe(5.25)
    expect(meanIntensity([])).toBeNull()
  })
  it("one check-in per date: a save replaces", () => {
    const out = upsert(rows, ci("2026-11-13", 1, 2, null))
    expect(out).toHaveLength(4)
    expect(out[3].urges).toBe(1)
  })
  it("insight numbers", () => {
    expect(insightNumbers(rows)).toEqual({ days: 4, streak: 0, urgeDays: 3, smokedDays: 1, avg: 5.25 })
    expect(insightNumbers([ci("a", 2, 4, null), ci("b", 0, 0, null), ci("c", 0, 0, null)]).streak).toBe(2)
  })
  it("seed is 14 labelled days ending yesterday", () => {
    const s = seedCheckIns(NOW)
    expect(s).toHaveLength(14)
    expect(s.every((e) => e.ex)).toBe(true)
    expect(s[13].date).toBe("2026-11-17")
  })
})

describe("copy E aggregation", () => {
  const cr = (tags: number[]) => ({ at: 0, date: "2026-11-17", tags })
  it("slices are tag counts over all tags, per category when filtered", () => {
    const rows = [cr([0, 10]), cr([0]), cr([4]), cr([10, 11])]
    expect(triggerShares(rows, 0).map((s) => [s.key, s.count])).toEqual([
      ["0", 2],
      ["10", 2],
      ["4", 1],
      ["11", 1],
    ])
    expect(triggerShares(rows, 6).map((s) => s.key)).toEqual(["10", "11"])
    expect(triggerShares(rows, 4)).toEqual([])
  })
  it("every trigger has a category between 1 and 6", () => {
    expect(TRIGGER_CATEGORY).toHaveLength(TRIGGER_COUNT)
    expect(TRIGGER_CATEGORY.every((c) => c >= 1 && c <= 6)).toBe(true)
  })
  it("seeds are labelled", () => {
    expect(seedCravings(NOW).every((c) => c.ex)).toBe(true)
    expect(seedLog(NOW)).toHaveLength(14)
    expect(seedCravings(NOW).every((c) => Number.isFinite(c.at))).toBe(true)
    expect(seedLog(NOW).every((c) => Number.isFinite(c.at))).toBe(true)
    expect(new Set(seedCravings(NOW).map((c) => c.at)).size).toBe(seedCravings(NOW).length)
  })
})

describe("registry", () => {
  it("diary copies b c d e are registered as copies with valid addictions", () => {
    for (const l of ["b", "c", "d", "e"]) {
      const v = LAB.diary.variants[l]
      expect(v.kind).toBe("copy")
      expect(v.label).toBe(`Copy ${l.toUpperCase()}`)
      expect(isAddictionId(v.addiction)).toBe(true)
    }
    expect(LAB.diary.variants.a).toBeUndefined()
    expect(LAB.diary.variants.current).toBeDefined()
    expect(LAB.diary.variants.c.addiction).toBe("weed")
  })
})
