import { describe, expect, it } from "vitest"
import { LAB } from "@/src/quit/lab/registry"
import { isAddictionId } from "@/src/quit/menu"
import { bestRun, breatheIn, dateToMs, DAY_MS, dayNumber, journeyDayOpen, moduleOpen, msToDate, perItem, savedAmount, splitHours, streakEnding, streakHours, taskOpen, weekOf } from "@/src/quit/lab/lessons/shared/logic"
import { countEarned, earnedBadges, money, monthCells } from "@/src/quit/lab/lessons/d/logic"

describe("lessons registry", () => {
  it("registers copies b to e (not a) with valid addictions", () => {
    expect(Object.keys(LAB.lessons.variants).sort()).toEqual(["b", "c", "d", "e"])
    for (const v of Object.values(LAB.lessons.variants)) {
      expect(v.kind).toBe("copy")
      expect(isAddictionId(v.addiction)).toBe(true)
    }
    expect(LAB.lessons.variants.b.addiction).toBe("alcohol")
    expect(LAB.lessons.variants.c.addiction).toBe("porn")
    expect(LAB.lessons.variants.d.addiction).toBe("nicotine")
    expect(LAB.lessons.variants.e.addiction).toBe("porn")
  })
})

describe("unlock logic", () => {
  it("counts days from the start plus lab skips", () => {
    expect(dayNumber(0, 5 * DAY_MS, 0)).toBe(1)
    expect(dayNumber(1000, 1000 + 2.5 * DAY_MS, 0)).toBe(3)
    expect(dayNumber(1000, 1000, 3)).toBe(4)
  })
  it("opens a task only when every task above is done", () => {
    expect(taskOpen([false, false, false], 0)).toBe(true)
    expect(taskOpen([false, false, false], 1)).toBe(false)
    expect(taskOpen([true, false, false], 1)).toBe(true)
    expect(taskOpen([true, false, false], 2)).toBe(false)
    expect(taskOpen([true, true, false], 2)).toBe(true)
  })
  it("opens a course module one a day after the one before", () => {
    expect(moduleOpen(1, 1, 1, [])).toBe(true)
    expect(moduleOpen(2, 1, 1, [1])).toBe(false)
    expect(moduleOpen(2, 1, 2, [1])).toBe(true)
    expect(moduleOpen(2, 1, 5, [])).toBe(false)
    expect(moduleOpen(3, 4, 6, [2])).toBe(true)
  })
  it("opens a journey day one a day after the one before", () => {
    expect(journeyDayOpen(1, 1, [])).toBe(true)
    expect(journeyDayOpen(2, 1, [1])).toBe(false)
    expect(journeyDayOpen(2, 2, [1])).toBe(true)
    expect(journeyDayOpen(3, 9, [1])).toBe(false)
  })
  it("gives weeks 1 to 4", () => {
    expect([1, 7, 8, 14, 15, 22, 28, 40].map(weekOf)).toEqual([1, 1, 2, 2, 3, 4, 4, 4])
  })
  it("counts the run that ends today or yesterday", () => {
    expect(streakEnding([1, 2, 3], 3)).toBe(3)
    expect(streakEnding([1, 2, 3], 4)).toBe(3)
    expect(streakEnding([1, 2, 3], 5)).toBe(0)
    expect(streakEnding([], 1)).toBe(0)
    expect(bestRun([1, 2, 4, 5, 6, 9])).toBe(3)
  })
})

describe("numbers come only from what the user typed", () => {
  it("saves nothing without both inputs", () => {
    expect(savedAmount(null, 12, 3)).toBeNull()
    expect(savedAmount(20, null, 3)).toBeNull()
    expect(perItem(null)).toBeNull()
  })
  it("multiplies pack cost, items a day and whole days", () => {
    expect(savedAmount(20, 12, 1)).toBeCloseTo(12)
    expect(savedAmount(10, 12, 7)).toBeCloseTo(42)
    expect(perItem(12)).toBeCloseTo(0.6)
    expect(money(12)).toBe("$12")
    expect(money(0.6)).toBe("$0.60")
    expect(money(null)).toBeNull()
  })
  it("splits streak hours and counts skips as days", () => {
    expect(splitHours(53)).toEqual({ days: 2, hours: 5 })
    expect(streakHours(0, 10, 2)).toBe(48)
  })
})

describe("small helpers", () => {
  it("alternates the breath", () => {
    expect([0, 3, 4, 7, 8].map((t) => breatheIn(t, 8))).toEqual([true, true, false, false, true])
  })
  it("round-trips dates", () => {
    expect(msToDate(dateToMs("2026-03-09"))).toBe("2026-03-09")
    expect(dateToMs("")).toBe(0)
    expect(dateToMs("nope")).toBe(0)
  })
  it("builds a month grid of full weeks, Monday first", () => {
    const rows = monthCells(2026, 10)
    expect(rows.every((r) => r.length === 7)).toBe(true)
    expect(rows.flat().filter((x) => x !== null)).toHaveLength(30)
    expect(rows[0][6]).toBe(1)
  })
  it("earns only what a name or screen states", () => {
    const base = { day: 1, saved: null, buddy: false, reminders: false, reasons: false, played: false }
    const e1 = earnedBadges(base)
    expect(e1.stay.slice(0, 3)).toEqual([true, true, false])
    expect(e1.money.some(Boolean)).toBe(false)
    const e8 = earnedBadges({ ...base, day: 8, saved: 250, buddy: true })
    expect(e8.stay[2]).toBe(true)
    expect(e8.money.slice(0, 2)).toEqual([true, true])
    expect(e8.money[2]).toBe(false)
    expect(countEarned(e8)).toBeGreaterThan(countEarned(e1))
  })
})
