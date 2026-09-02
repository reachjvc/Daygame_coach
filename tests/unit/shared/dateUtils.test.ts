import { describe, it, expect, vi, afterEach } from "vitest"
import { getTodayInTimezone, getNowInTimezone, periodStartFor, periodStartInTimezone } from "@/src/shared/dateUtils"

describe("getTodayInTimezone", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns YYYY-MM-DD format", () => {
    const result = getTodayInTimezone("UTC")
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("cannot be asked what day it is without saying whose day", () => {
    // `getTodayInTimezone(null)` used to mean "fall back to UTC". It is now a
    // compile error, which is the point: a caller with no timezone was a caller
    // guessing, and the compiler lists them all. Asserted with @ts-expect-error
    // so the day someone re-adds the null overload, this test fails.
    // @ts-expect-error - null is not a timezone
    expect(() => getTodayInTimezone(null)).toBeDefined()
    expect(getTodayInTimezone("UTC")).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("falls back to UTC for invalid timezone", () => {
    const utcResult = getTodayInTimezone("UTC")
    const invalidResult = getTodayInTimezone("Invalid/Zone")
    expect(invalidResult).toBe(utcResult)
  })

  it("returns correct date for timezone ahead of UTC", () => {
    // 2026-02-15 23:30 UTC = 2026-02-16 12:30 in Auckland (UTC+13)
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-15T23:30:00Z"))

    const utcDate = getTodayInTimezone("UTC")
    const aucklandDate = getTodayInTimezone("Pacific/Auckland")

    expect(utcDate).toBe("2026-02-15")
    expect(aucklandDate).toBe("2026-02-16")
  })

  it("returns correct date for timezone behind UTC", () => {
    // 2026-02-16 03:00 UTC = 2026-02-15 22:00 in New York (UTC-5)
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-16T03:00:00Z"))

    const utcDate = getTodayInTimezone("UTC")
    const nyDate = getTodayInTimezone("America/New_York")

    expect(utcDate).toBe("2026-02-16")
    expect(nyDate).toBe("2026-02-15")
  })
})

describe("getNowInTimezone", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns a Date object", () => {
    const result = getNowInTimezone("UTC")
    expect(result).toBeInstanceOf(Date)
  })

  it("returns correct day-of-week for timezone", () => {
    // 2026-02-15 is a Sunday
    // At 23:30 UTC on Sunday Feb 15, it's Monday Feb 16 in Auckland
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-15T23:30:00Z"))

    const utcNow = getNowInTimezone("UTC")
    const aucklandNow = getNowInTimezone("Pacific/Auckland")

    expect(utcNow.getDay()).toBe(0) // Sunday
    expect(aucklandNow.getDay()).toBe(1) // Monday
  })

  it("cannot be asked for the time without saying whose clock", () => {
    // @ts-expect-error - null is not a timezone
    expect(() => getNowInTimezone(null)).toBeDefined()
    expect(getNowInTimezone("UTC")).toBeInstanceOf(Date)
  })

  it("falls back gracefully for invalid timezone", () => {
    const result = getNowInTimezone("Not/A/Timezone")
    expect(result).toBeInstanceOf(Date)
  })
})

/**
 * WEEK BOUNDARIES.
 *
 * The bug: the Today page showed last week's count as this week's, and the
 * boundary these tests pin is the one that decides when a count stops — Sunday
 * 23:59 is still last week, Monday 00:00 is not.
 *
 * The timezone cases are the second half of the same bug. The old code built
 * the Monday from wall-clock fields and then formatted it with
 * `toISOString()`, which converts to UTC first — so the boundary moved by the
 * process's offset and drifted with the time of day, resetting a week early
 * west of UTC and a day late east of it.
 */
describe("periodStartFor", () => {
  const originalTZ = process.env.TZ
  afterEach(() => {
    process.env.TZ = originalTZ
  })

  it("puts Monday's count on that Monday", () => {
    // 2026-08-24 is a Monday.
    expect(periodStartFor("weekly", new Date(2026, 7, 24, 0, 0, 0))).toBe("2026-08-24")
  })

  it("keeps Sunday 23:59 in the week that started six days earlier", () => {
    // 2026-08-30 is the Sunday of the week beginning 2026-08-24.
    expect(periodStartFor("weekly", new Date(2026, 7, 30, 23, 59, 59))).toBe("2026-08-24")
  })

  it("starts a new week the minute Monday does", () => {
    expect(periodStartFor("weekly", new Date(2026, 7, 31, 0, 0, 0))).toBe("2026-08-31")
  })

  it("crosses a month backwards to reach Monday", () => {
    // Wednesday 2026-09-02 belongs to the week that started 2026-08-31.
    expect(periodStartFor("weekly", new Date(2026, 8, 2, 12, 0, 0))).toBe("2026-08-31")
  })

  it.each(["UTC", "America/New_York", "Pacific/Auckland", "Europe/Berlin"])(
    "reads the boundary off the wall clock, not off UTC (TZ=%s)",
    (tz) => {
      process.env.TZ = tz
      // Every hour of the Monday and of the Sunday before it: the answer is a
      // property of the wall clock, so it cannot depend on the offset.
      for (let hour = 0; hour < 24; hour++) {
        expect(periodStartFor("weekly", new Date(2026, 7, 24, hour, 30, 0))).toBe("2026-08-24")
        expect(periodStartFor("weekly", new Date(2026, 7, 23, hour, 30, 0))).toBe("2026-08-17")
        expect(periodStartFor("daily", new Date(2026, 7, 24, hour, 30, 0))).toBe("2026-08-24")
        expect(periodStartFor("monthly", new Date(2026, 7, 24, hour, 30, 0))).toBe("2026-08-01")
        expect(periodStartFor("yearly", new Date(2026, 7, 24, hour, 30, 0))).toBe("2026-01-01")
      }
    }
  )

  it("gives the same Monday all week, so a mid-week read never re-rolls", () => {
    const week = new Set(
      Array.from({ length: 7 }, (_, i) => periodStartFor("weekly", new Date(2026, 7, 24 + i, 6 + i * 2, 0, 0)))
    )
    expect([...week]).toEqual(["2026-08-24"])
  })

  it("reads the boundary in the user's timezone, not the server's", () => {
    vi.useFakeTimers()
    // Monday 2026-08-31 09:00 in Auckland is still Sunday 2026-08-30 21:00 UTC:
    // the Aucklander's week has turned over, the UTC user's has not.
    vi.setSystemTime(new Date("2026-08-30T21:00:00Z"))

    expect(periodStartInTimezone("weekly", "Pacific/Auckland")).toBe("2026-08-31")
    expect(periodStartInTimezone("weekly", "UTC")).toBe("2026-08-24")
  })
})
