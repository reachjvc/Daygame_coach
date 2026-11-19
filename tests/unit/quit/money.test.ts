import { describe, expect, it } from "vitest"
import { DAY_MS, amountPerDay, calPos, cleanMs, cleanIntervals, dayStartMs, fmtMoney, moneyKept, totalCleanMs, unitsNotUsed, windowFrom } from "@/src/quit/money"

const at = (day: string, h = 0, m = 0) => {
  const [y, mo, d] = day.split("-").map(Number)
  return new Date(y, mo - 1, d, h, m).getTime()
}

describe("clean time per run", () => {
  it("a living run counts from 00:00 of its first day to now", () => {
    expect(cleanMs({ start: "2026-11-12", end: null }, at("2026-11-12", 6))).toBe(6 * 3_600_000)
    expect(cleanMs({ start: "2026-11-12", end: null }, at("2026-11-19", 10)) / DAY_MS).toBeCloseTo(7 + 10 / 24, 6)
  })
  it("an ended run stops at 00:00 of its end day: the slip day is not counted", () => {
    const run = { start: "2026-10-20", end: "2026-10-28" }
    expect(cleanMs(run, at("2026-11-19", 10)) / DAY_MS).toBeCloseTo(8, 1)
    // while now is still before the end day, only the time so far
    expect(cleanMs(run, at("2026-10-22", 12)) / DAY_MS).toBeCloseTo(2.5, 6)
  })
  it("is never negative (a run that starts after now, or ends the day it starts)", () => {
    expect(cleanMs({ start: "2026-11-25", end: null }, at("2026-11-19"))).toBe(0)
    expect(cleanMs({ start: "2026-11-05", end: "2026-11-05" }, at("2026-11-19"))).toBe(0)
  })
  it("a window keeps only the clean time inside it", () => {
    const now = at("2026-11-19", 10)
    const run = { start: "2026-10-01", end: null }
    expect(cleanMs(run, now, windowFrom(7, now)) / DAY_MS).toBeCloseTo(7, 6)
    // a window older than the run's start is cut at the start
    expect(cleanMs({ start: "2026-11-17", end: null }, now, windowFrom(30, now)) / DAY_MS).toBeCloseTo(2 + 10 / 24, 6)
  })
  it("adds the runs", () => {
    const runs = [
      { start: "2026-10-20", end: "2026-10-28" },
      { start: "2026-10-29", end: null },
    ]
    expect(totalCleanMs(runs, at("2026-11-19")) / DAY_MS).toBeCloseTo(8 + 21, 1)
  })
  it("dayStartMs is local midnight", () => {
    expect(new Date(dayStartMs("2026-11-19")).getHours()).toBe(0)
  })
})

describe("money kept", () => {
  const runs = [{ start: "2026-10-30", end: null }]
  const now = at("2026-11-19") // exactly 20 days clean
  it("is clean time x count a day x price of one", () => {
    expect(moneyKept({ runs, nowMs: now, perDay: 10, priceUsd: 0.52 })).toBe(104)
    expect(amountPerDay(10, 0.52)).toBeCloseTo(5.2, 6)
  })
  it("takes spending off, and can go negative", () => {
    expect(moneyKept({ runs, nowMs: now, perDay: 10, priceUsd: 0.52, spent: 40 })).toBe(64)
    expect(moneyKept({ runs, nowMs: now, perDay: 10, priceUsd: 0.52, spent: 500 })).toBe(-396)
  })
  it("rounds to cents", () => {
    expect(moneyKept({ runs, nowMs: at("2026-10-30", 1), perDay: 7, priceUsd: 0.517 })).toBe(0.15)
  })
  it("is null without a count or a price", () => {
    expect(moneyKept({ runs, nowMs: now, perDay: null, priceUsd: 0.52 })).toBeNull()
    expect(moneyKept({ runs, nowMs: now, perDay: 10, priceUsd: null })).toBeNull()
    expect(moneyKept({ runs, nowMs: now, perDay: 0, priceUsd: 0.52 })).toBeNull()
  })
  it("a period window counts only its own clean time", () => {
    expect(moneyKept({ runs, nowMs: now, perDay: 10, priceUsd: 0.52, fromPos: windowFrom(7, now) })).toBe(36.4)
  })
  it("units not used are rounded down", () => {
    expect(unitsNotUsed(runs, now, 10)).toBe(200)
    expect(unitsNotUsed(runs, at("2026-10-30", 1), 7)).toBe(0)
    expect(unitsNotUsed(runs, now, null)).toBeNull()
  })
})

describe("fmtMoney", () => {
  it("puts the minus before the dollar sign", () => {
    expect(fmtMoney(-367.46)).toBe("−$367.46")
    expect(fmtMoney(1234.5)).toBe("$1,234.50")
    expect(fmtMoney(0)).toBe("$0.00")
    expect(fmtMoney(-0.001)).toBe("$0.00")
  })
})

describe("merged intervals", () => {
  it("a slip day and the new run starting that day count once", () => {
    const now = at("2026-11-19", 12)
    const runs = [
      { start: "2026-11-01", end: "2026-11-10" },
      { start: "2026-11-05", end: null }, // overlaps the first run
    ]
    expect(cleanIntervals(runs, now)).toHaveLength(1)
    expect(totalCleanMs(runs, now) / DAY_MS).toBeCloseTo(18.5, 1)
  })
  it("a run that ends the day another starts adds up without a gap or overlap", () => {
    const runs = [
      { start: "2026-11-01", end: "2026-11-10" },
      { start: "2026-11-10", end: null },
    ]
    expect(totalCleanMs(runs, at("2026-11-19")) / DAY_MS).toBeCloseTo(18, 1)
  })
})

describe("a clock change does not move clean time", () => {
  const was = process.env.TZ
  it("counts whole calendar days across the end of daylight time", () => {
    process.env.TZ = "Europe/Berlin"
    try {
      // 2026-10-25 has 25 hours in Berlin
      const now = new Date(2026, 10, 19, 10, 0, 1).getTime()
      const run = { start: "2026-10-20", end: null }
      expect(cleanMs(run, now)).toBe(30 * DAY_MS + 10 * 3_600_000 + 1000)
      expect(calPos(new Date(2026, 9, 26, 0, 0, 0).getTime()) - calPos(new Date(2026, 9, 24, 0, 0, 0).getTime())).toBe(2 * DAY_MS)
    } finally {
      if (was === undefined) delete process.env.TZ
      else process.env.TZ = was
    }
  })
  it("and across the start of daylight time", () => {
    process.env.TZ = "America/New_York"
    try {
      const now = new Date(2026, 2, 20, 6, 0, 0).getTime()
      expect(cleanMs({ start: "2026-03-01", end: null }, now)).toBe(19 * DAY_MS + 6 * 3_600_000)
    } finally {
      if (was === undefined) delete process.env.TZ
      else process.env.TZ = was
    }
  })
})
