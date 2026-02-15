import { describe, it, expect, vi, afterEach } from "vitest"
import { getTodayInTimezone, getNowInTimezone } from "@/src/shared/dateUtils"

describe("getTodayInTimezone", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns YYYY-MM-DD format", () => {
    const result = getTodayInTimezone("UTC")
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("falls back to UTC for null timezone", () => {
    const utcResult = getTodayInTimezone("UTC")
    const nullResult = getTodayInTimezone(null)
    expect(nullResult).toBe(utcResult)
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

  it("falls back gracefully for null timezone", () => {
    const result = getNowInTimezone(null)
    expect(result).toBeInstanceOf(Date)
  })

  it("falls back gracefully for invalid timezone", () => {
    const result = getNowInTimezone("Not/A/Timezone")
    expect(result).toBeInstanceOf(Date)
  })
})
