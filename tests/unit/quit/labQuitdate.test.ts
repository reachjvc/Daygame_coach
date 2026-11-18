import { describe, expect, it } from "vitest"
import {
  TIME_GOALS,
  breakStreak,
  caloriesPerYear,
  changeChip,
  dayShade,
  daysUntil,
  goalCountdown,
  googleCalendarUrl,
  icsFor,
  longSpan,
  longestMs,
  monthGrid,
  nextTimeGoal,
  ninetyDayCalories,
  quitDateFor,
  recommendedApproach,
  reductionTarget,
  savingsFor,
  sortStreaks,
  spendPerMonth,
  spendPerYear,
  suggestedWeek,
  sum,
} from "@/src/quit/lab/quitdate/shared/logic"
import { LAB } from "@/src/quit/lab/registry"
import { isAddictionId } from "@/src/quit/menu"

const NOW = new Date(2026, 10, 18, 12, 0, 0).getTime()
const DAY = 86_400_000

describe("quit date choices", () => {
  it("maps each choice to a date or none", () => {
    expect(quitDateFor("today", "", NOW)).toBe("2026-11-18")
    expect(quitDateFor("tomorrow", "", NOW)).toBe("2026-11-19")
    expect(quitDateFor("pick", "2026-12-01", NOW)).toBe("2026-12-01")
    expect(quitDateFor("pick", "", NOW)).toBeNull()
    expect(quitDateFor("later", "2026-12-01", NOW)).toBeNull()
    expect(quitDateFor(null, "", NOW)).toBeNull()
  })
  it("counts days and builds calendar entries", () => {
    expect(daysUntil("2026-11-25", NOW)).toBe(7)
    expect(daysUntil("2026-11-17", NOW)).toBe(-1)
    expect(icsFor("2026-11-25", "x")).toContain("DTSTART;VALUE=DATE:20261125")
    expect(icsFor("2026-11-30", "x")).toContain("DTEND;VALUE=DATE:20261201")
    expect(googleCalendarUrl("2026-11-25", "a b")).toContain("dates=20261125/20261126")
  })
  it("derives savings from a pack of 20", () => {
    expect(savingsFor(20, 10)).toEqual({ week: 70, month: 304.17, year: 3650 })
    expect(savingsFor(0, 10).year).toBe(0)
  })
})

describe("drink plan numbers", () => {
  it("derives the yearly figures as the spec derives them", () => {
    expect(caloriesPerYear(12)).toBe(93_600)
    expect(spendPerYear(12)).toBe(4_992)
    expect(spendPerMonth(12)).toBe(416)
    expect(ninetyDayCalories(12)).toBe(23_400)
  })
  it("recommends only where the shots show it", () => {
    expect(recommendedApproach("cut")).toBe("gradual")
    expect(recommendedApproach("break")).toBe("reset")
    expect(recommendedApproach("stop")).toBeNull()
    expect(recommendedApproach(null)).toBeNull()
  })
})

describe("weekly table", () => {
  it("suggests one under the typical day, or zero", () => {
    expect(suggestedWeek("less", [0, 1, 3, 6])).toEqual([0, 0, 2, 5])
    expect(suggestedWeek("zero", [4, 5])).toEqual([0, 0])
    expect(sum([1, 2, Number.NaN, 3])).toBe(6)
  })
  it("shows the change chip", () => {
    expect(changeChip(null, 2)).toEqual({ kind: "equal", label: "-" })
    expect(changeChip(2, 2).kind).toBe("equal")
    expect(changeChip(0, 1)).toEqual({ kind: "lower", label: "-1" })
    expect(changeChip(3, 2)).toEqual({ kind: "higher", label: "+1" })
  })
  it("colours a day against its own plan", () => {
    expect(dayShade(6, 6)).toBe("green")
    expect(dayShade(6, 4)).toBe("amber")
    expect(dayShade(6, 1)).toBe("red")
    expect(dayShade(0, 0)).toBe("green")
  })
  it("builds a Monday-first month grid", () => {
    const g = monthGrid(2026, 10) // November 2026 starts on a Sunday
    expect(g.slice(0, 7)).toEqual([null, null, null, null, null, null, 1])
    expect(g.filter((x) => x !== null)).toHaveLength(30)
  })
})

describe("goal ladder and streaks", () => {
  it("picks the next goal and counts down", () => {
    expect(nextTimeGoal(0)?.key).toBe("m20")
    expect(nextTimeGoal(30 * DAY)?.key).toBe("mo2")
    expect(nextTimeGoal(61 * DAY)).toBeNull()
    expect(TIME_GOALS.map((g) => g.key)).toEqual(["m20", "d1", "d2", "mo2"])
    expect(goalCountdown(29 * DAY + 20 * 3_600_000 + 41 * 60_000 + 29_000)).toBe("29D 20H 41M & 29S")
    expect(longSpan(DAY + 61_000, { d: "days", h: "hours", m: "minutes", s: "seconds" })).toBe("1 days 0 hours 1 minutes 1 seconds")
  })
  it("sorts past streaks and breaks the current one", () => {
    const list = [
      { startMs: 5, lengthMs: 10 },
      { startMs: 9, lengthMs: 3 },
      { startMs: 1, lengthMs: 50 },
    ]
    expect(sortStreaks(list, "recent").map((s) => s.startMs)).toEqual([9, 5, 1])
    expect(sortStreaks(list, "oldest").map((s) => s.startMs)).toEqual([1, 5, 9])
    expect(sortStreaks(list, "best").map((s) => s.lengthMs)).toEqual([50, 10, 3])
    const r = breakStreak(list, 100, 400)
    expect(r.startMs).toBe(400)
    expect(r.past).toHaveLength(4)
    expect(r.past[3]).toEqual({ startMs: 100, lengthMs: 300 })
    expect(longestMs(list, 20)).toBe(50)
    expect(longestMs([], 20)).toBe(20)
  })
  it("lets a daily number fall to zero on the quit date", () => {
    const quit = NOW + 10 * DAY
    expect(reductionTarget(10, NOW, quit, NOW)).toBe(10)
    expect(reductionTarget(10, NOW, quit, NOW + 5 * DAY)).toBe(5)
    expect(reductionTarget(10, NOW, quit, quit)).toBe(0)
    expect(reductionTarget(10, NOW, NOW - 1, NOW)).toBe(0)
  })
})

describe("registry", () => {
  it("registers the four quit date copies with valid addictions", () => {
    expect(Object.keys(LAB.quitdate.variants).sort()).toEqual(["a", "b", "d", "e"])
    expect(LAB.quitdate.variants.a.addiction).toBe("alcohol")
    expect(LAB.quitdate.variants.b.addiction).toBe("alcohol")
    expect(LAB.quitdate.variants.d.addiction).toBe("nicotine")
    expect(LAB.quitdate.variants.e.addiction).toBe("nicotine")
    for (const v of Object.values(LAB.quitdate.variants)) {
      expect(isAddictionId(v.addiction)).toBe(true)
      expect(v.kind).toBe("copy")
      expect(v.label).toMatch(/^Copy [ABDE]$/)
    }
  })
})
