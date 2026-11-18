import { describe, expect, it } from "vitest"
import { DAY, addDays, bestStreak, billCount, cigMoney, cigsAvoided, currentStreak, dayKey, monthly, moneySaved, splitElapsed, unitsOf, wholeDays, yearly, ymdhms } from "@/src/quit/lab/progress/shared/calc"
import { daysBarFill, lastMilestone, pledgeStreak } from "@/src/quit/lab/progress/a/logic"
import { badges, diaryRows, periods, savedMoney } from "@/src/quit/lab/progress/b/logic"
import { allSavings, dayTags, nextGoal, pieSlices, seedHabits, stretchCount, totalDays } from "@/src/quit/lab/progress/c/logic"
import { achievements, overall, unlockedCount } from "@/src/quit/lab/progress/d/logic"
import { badgesOf, dash, periodStart, seedLog, dayUnits } from "@/src/quit/lab/progress/e/logic"
import { LAB } from "@/src/quit/lab/registry"
import { isAddictionId } from "@/src/quit/menu"

const NOW = new Date(2026, 10, 18, 12, 0, 0).getTime()

describe("counter and money maths", () => {
  it("splits elapsed time and counts whole days", () => {
    expect(splitElapsed(23 * DAY + 8 * 3600e3 + 29 * 60e3 + 51e3)).toEqual({ days: 23, hours: 8, minutes: 29, seconds: 51 })
    expect(wholeDays(NOW - (23 * DAY + 5e6), NOW)).toBe(23)
    expect(wholeDays(NOW + DAY, NOW)).toBe(0)
  })
  it("calendar years, months, days", () => {
    const start = new Date(2025, 7, 1, 9, 0, 0).getTime()
    expect(ymdhms(start, new Date(2026, 10, 18, 9, 0, 0).getTime())).toMatchObject({ years: 1, months: 3, days: 17 })
  })
  it("money is whole days times the per-day spend; the projections use 365 days", () => {
    expect(moneySaved(8, 23)).toBe(184)
    expect(monthly(8)).toBe(243.33)
    expect(yearly(8)).toBe(2920)
    expect(billCount(184)).toBe(9)
    expect(billCount(19.99)).toBe(0)
  })
  it("cigarettes avoided are floored; money follows pack price over pack size", () => {
    expect(cigsAvoided(15, 17.18)).toBe(257)
    expect(cigMoney(257, 6, 20)).toBe(77.1)
  })
  it("units follow the published definition (10 ml pure alcohol)", () => {
    expect(unitsOf(568, 5.5, 1)).toBe(3.1)
    expect(unitsOf(284, 5, 2)).toBe(2.8)
  })
})

describe("streaks", () => {
  const log = (dry: number[], today: string) => Object.fromEntries(dry.map((n) => [addDays(today, -n), "dry" as const]))
  const today = "2026-11-18"
  it("current streak ends yesterday while today is unlogged", () => {
    expect(currentStreak(log([1, 2, 3], today), today)).toBe(3)
    expect(currentStreak({ ...log([1, 2, 3], today), [today]: "drank" }, today)).toBe(0)
    expect(currentStreak({ ...log([1, 2], today), [today]: "dry" }, today)).toBe(3)
  })
  it("best streak is the longest run", () => {
    expect(bestStreak(log([1, 2, 3, 5, 6, 7, 8, 9], today))).toBe(5)
    expect(bestStreak({})).toBe(0)
  })
})

describe("copy A", () => {
  it("milestone and bar", () => {
    expect(lastMilestone(23)).toBe(4)
    expect(lastMilestone(0)).toBe(-1)
    expect(daysBarFill(400)).toBe(1)
    expect(daysBarFill(10)).toBeCloseTo((10 - 7) / 7)
  })
  it("pledge streak is capped at seven and needs consecutive days", () => {
    const prev = (k: string) => addDays(k, -1)
    const today = "2026-11-18"
    expect(pledgeStreak([1, 2, 3, 4, 5, 6].map((n) => addDays(today, -n)), today, prev)).toBe(6)
    expect(pledgeStreak([1, 3].map((n) => addDays(today, -n)), today, prev)).toBe(1)
  })
})

describe("copy B", () => {
  const s = { startMs: NOW - 10 * DAY, cigsPerDay: 20, packSize: 20, packPrice: 10, seeded: 0 }
  it("saved money subtracts replacement and cigarette spend", () => {
    expect(savedMoney(s, NOW, 0, 0)).toBe(100)
    expect(savedMoney(s, NOW, 5, 12)).toBe(83)
  })
  it("the total reconciles with the inputs: whole days x daily rate - spend", () => {
    const x = { startMs: NOW - (23 * DAY + 5 * 3600e3), cigsPerDay: 15, packSize: 20, packPrice: 5.76, seeded: 1 }
    expect(periods(x).day).toBe(4.32)
    expect(savedMoney(x, NOW, 0, 0)).toBe(99.36)
    expect(savedMoney(x, NOW, 1.5, 2)).toBe(95.86)
  })
  it("period rows share one daily rate", () => {
    expect(periods(s)).toEqual({ day: 10, week: 70, month: 304.17, year: 3650 })
  })
  it("badges unlock from time, money, count and diary use", () => {
    const b = badges({ days: 10, money: 100, cigs: 200, cravings: 1, wish: false, motive: true })
    const on = (id: string) => b.find((x) => x.id === id)?.earned
    expect(on("time-7")).toBe(true)
    expect(on("time-30")).toBe(false)
    expect(on("money-100")).toBe(true)
    expect(on("money-250")).toBe(false)
    expect(on("count-100")).toBe(true)
    expect(on("diary-1")).toBe(true)
    expect(on("diary-10")).toBe(false)
    expect(on("wish")).toBe(false)
  })
  it("a slip changes the diary, never the quit date", () => {
    const rows = diaryRows([
      { day: "2026-11-17", strength: 6, smoked: false },
      { day: "2026-11-17", strength: 8, smoked: true },
    ])
    expect(rows).toEqual([{ day: "2026-11-17", count: 2, avg: 7, smoked: true }])
  })
})

describe("copy C", () => {
  const names: [string, string, string] = ["x", "y", "z"]
  const habits = seedHabits(NOW, NOW - 23 * DAY, 8, names, ["n"])
  it("savings sum every stretch so a reset never erases money", () => {
    const alc = habits[1]
    expect(alc.stretches).toHaveLength(5)
    expect(totalDays(alc, NOW)).toBeCloseTo(19 + 27 + 42 + 7 + 23, 5)
    expect(allSavings(habits, NOW)).toBeCloseTo(8 * (118 + 35.23 + 34.64), 1)
    expect(stretchCount(habits)).toBe(7)
  })
  it("pie slices add up to one", () => {
    const s = pieSlices([1, 2, 1])
    expect(s.map((x) => x.frac)).toEqual([0.25, 0.5, 0.25])
    expect(s[2].start).toBe(0.75)
    expect(pieSlices([0, 0]).every((x) => x.frac === 0)).toBe(true)
  })
  it("tags put milestone names and resets on their days", () => {
    const tags = dayTags(habits[1], [{ name: "Day one", hours: 24 }], NOW, (n) => `Reset #${n}`)
    const resetDays = Object.values(tags).flat().filter((t) => t.startsWith("Reset"))
    expect(resetDays).toEqual(["Reset #1", "Reset #2", "Reset #3", "Reset #4"])
    expect(tags[dayKey(habits[1].stretches[4].startMs + DAY)]).toContain("Day one")
  })
  it("next goal is the first above the running hours", () => {
    expect(nextGoal([{ name: "a", hours: 5 }, { name: "b", hours: 24 }], 6)?.name).toBe("b")
    expect(nextGoal([{ name: "a", hours: 5 }], 6)).toBeNull()
  })
})

describe("copy D", () => {
  const s = { startMs: NOW - 17.18 * DAY, cigsPerDay: 15, packSize: 20, packPrice: 5.76, seeded: 1 }
  it("overall row and achievements", () => {
    const o = overall(s, NOW)
    expect(o.days).toBe(17)
    expect(o.cigs).toBe(257)
    expect(o.money).toBe(74.02)
    const a = achievements(o)
    expect(unlockedCount(a)).toBe(3)
    expect(a.find((x) => x.id === "life")?.state).toBe("unsourced")
    expect(achievements(overall({ ...s, startMs: NOW }, NOW)).every((x) => x.state !== "unlocked")).toBe(true)
  })
})

describe("copy E", () => {
  const today = "2026-11-18"
  const setup = { startMs: new Date(2026, 10, 1).getTime(), baseUnits: 14, baseCost: 20.16, seeded: 1 }
  const log = seedLog(today, "2026-11-01")
  it("period starts", () => {
    expect(periodStart(1, today, "2026-01-01")).toBe("2026-11-16")
    expect(periodStart(2, today, "2026-01-01")).toBe("2026-11-01")
    expect(periodStart(3, today, "2026-01-01")).toBe("2026-01-01")
    expect(periodStart(1, today, "2026-11-17")).toBe("2026-11-17")
  })
  it("dry days, streaks and savings against the baseline", () => {
    const d = dash(log, setup, 0, today, "2026-11-01")
    expect(d.dry).toBe(15)
    expect(d.best).toBe(8)
    expect(d.current).toBe(7)
    // 17 logged days: baseline 2 units and 2.88 money a day, minus two drinking days of 1.6 units and 2.30 money each
    expect(d.units).toBeCloseTo(17 * 2 - 2 * 1.6, 1)
    expect(d.money).toBeCloseTo(17 * 2.88 - 2 * 2.3, 2)
    expect(dash({}, setup, 0, today, "2026-11-01").money).toBe(0)
  })
  it("badges count total dry days; a slip keeps them", () => {
    const b = badgesOf(log, 0)
    expect(b.totalDry).toBe(15)
    expect(b.total).toBe(3)
    expect(b.mission).toBe(true)
    expect(dayUnits(log[addDays(today, -8)])).toBe(1.6)
  })
})

describe("registry", () => {
  it("registers copies a to e of progress with valid addictions", () => {
    expect(Object.keys(LAB.progress.variants)).toEqual(["a", "b", "c", "d", "e"])
    for (const v of Object.values(LAB.progress.variants)) {
      expect(v.kind).toBe("copy")
      expect(isAddictionId(v.addiction)).toBe(true)
    }
    expect(LAB.progress.variants.a.label).toBe("Copy A")
  })
})
