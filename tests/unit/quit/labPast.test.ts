import { describe, expect, it } from "vitest"
import { LAB } from "@/src/quit/lab/registry"
import { isAddictionId } from "@/src/quit/menu"
import { EMPTY_ANSWERS, barPercent, canContinue, sequence, validCount } from "@/src/quit/lab/past/a/logic"
import {
  EXAMPLE_CURRENT_MS,
  averageMs,
  avgShare,
  barShares,
  durationText,
  exampleData,
  goalShare,
  monthGrid,
  moneyFor,
  relapseDays,
  savings,
  stretches,
  type Entry,
} from "@/src/quit/lab/past/b/logic"

const NOW = new Date(2026, 10, 18, 12, 0, 0).getTime()
const DAY = 86_400_000
const rel = (t: number, amount = 0): Entry => ({ id: String(t), at: new Date(t).toISOString(), note: "", relapse: true, amount, unit: "money" })

describe("past registry", () => {
  it("registers copies a and b with valid addictions", () => {
    for (const k of ["a", "b"]) {
      const v = LAB.past.variants[k]
      expect(v.kind).toBe("copy")
      expect(v.label).toBe(`Copy ${k.toUpperCase()}`)
      expect(isAddictionId(v.addiction)).toBe(true)
    }
    expect(LAB.past.variants.current).toBeDefined()
    expect(LAB.past.variants.c).toBeUndefined()
  })
})

describe("copy A flow", () => {
  it("branches after the told question", () => {
    expect(sequence(EMPTY_ANSWERS)).toContain("who")
    const no = { ...EMPTY_ANSWERS, choice: { told: 1 } }
    expect(sequence(no)).toContain("consider")
    expect(sequence(no)).not.toContain("who")
  })
  it("starts every question inactive and activates on an answer", () => {
    expect(canContinue("howlong", EMPTY_ANSWERS)).toBe(false)
    expect(canContinue("howlong", { ...EMPTY_ANSWERS, choice: { howlong: 0 } })).toBe(true)
    expect(canContinue("freq", EMPTY_ANSWERS)).toBe(false)
    expect(canContinue("freq", { ...EMPTY_ANSWERS, freq: "36" })).toBe(true)
    expect(canContinue("last", EMPTY_ANSWERS)).toBe(true)
    expect(canContinue("name", EMPTY_ANSWERS)).toBe(false)
  })
  it("accepts any non-negative count, no cap", () => {
    expect(validCount("36")).toBe(true)
    expect(validCount("2.5")).toBe(true)
    expect(validCount("")).toBe(false)
    expect(validCount("-1")).toBe(false)
    expect(validCount("abc")).toBe(false)
  })
  it("grows the bar to 100 on the last screen", () => {
    const n = sequence(EMPTY_ANSWERS).length
    expect(barPercent(n - 1, n)).toBe(100)
    expect(barPercent(0, n)).toBeLessThan(barPercent(1, n))
  })
})

describe("copy B stretches", () => {
  it("one stretch before any relapse, split at each relapse entry", () => {
    const start = NOW - 20 * DAY
    expect(stretches(start, [], NOW)).toEqual([{ from: start, to: NOW, ms: 20 * DAY, current: true }])
    const list = stretches(start, [rel(NOW - 12 * DAY), rel(NOW - 5 * DAY)], NOW)
    expect(list.map((s) => s.ms / DAY)).toEqual([8, 7, 5])
    expect(list.map((s) => s.current)).toEqual([false, false, true])
  })
  it("ignores plain notes and entries outside the span", () => {
    const start = NOW - 10 * DAY
    const note: Entry = { ...rel(NOW - 3 * DAY), relapse: false }
    expect(stretches(start, [note, rel(NOW - 30 * DAY)], NOW)).toHaveLength(1)
  })
  it("averages finished stretches, else the running one", () => {
    const list = stretches(NOW - 20 * DAY, [rel(NOW - 12 * DAY), rel(NOW - 5 * DAY)], NOW)
    expect(averageMs(list)).toBe(7.5 * DAY)
    expect(averageMs(stretches(NOW - 4 * DAY, [], NOW))).toBe(4 * DAY)
  })
  it("formats length as days, hours, minutes", () => {
    expect(durationText(EXAMPLE_CURRENT_MS)).toBe("19 days, 18 hr, 23 min")
    expect(durationText(0)).toBe("0 days, 0 hr, 0 min")
  })
  it("the average line sits inside the chart and matches the bars", () => {
    expect(avgShare([])).toBeNull()
    const two = stretches(NOW - 20 * DAY, [rel(NOW - 1000)], NOW)
    expect(avgShare(two)).toBe(1)
    const list = stretches(NOW - 20 * DAY, [rel(NOW - 12 * DAY), rel(NOW - 5 * DAY)], NOW)
    expect(avgShare(list)).toBeCloseTo(7.5 / 8, 5)
    const bars = barShares(list)
    expect(avgShare(list)).toBeLessThanOrEqual(Math.max(...bars))
  })
  it("bar shares top out at 1", () => {
    const s = barShares(stretches(NOW - 20 * DAY, [rel(NOW - 12 * DAY)], NOW))
    expect(Math.max(...s)).toBe(1)
  })
  it("example data ends in the seen current length with 8 finished stretches", () => {
    const ex = exampleData(NOW)
    const list = stretches(ex.start, ex.entries, NOW)
    expect(list).toHaveLength(9)
    expect(Math.abs(list[8].ms - EXAMPLE_CURRENT_MS)).toBeLessThan(2000)
  })
  it("relapse spend comes off the balance but not off the total", () => {
    const start = NOW - 20 * DAY
    const entries = [rel(NOW - 10 * DAY, 20)]
    const list = stretches(start, entries, NOW)
    const s = savings(list, entries, 5, 0)
    expect(s.fromBeginning).toBe(100)
    expect(s.sinceBegan).toBe(50)
    expect(s.balance).toBe(80)
    expect(savings(list, entries, 5, 30).balance).toBe(50)
    expect(moneyFor(2 * DAY, 6)).toBe(12)
  })
  it("goal share is clamped", () => {
    expect(goalShare(45 * DAY, 90)).toBe(0.5)
    expect(goalShare(200 * DAY, 90)).toBe(1)
  })
  it("calendar grid and relapse days", () => {
    const grid = monthGrid(2026, 10)
    expect(grid.length % 7).toBe(0)
    expect(grid.filter((d) => d > 0)).toHaveLength(30)
    const days = relapseDays([rel(new Date(2026, 10, 9, 10).getTime()), rel(new Date(2026, 9, 9, 10).getTime())], 2026, 10)
    expect([...days]).toEqual([9])
  })
})
