import { describe, expect, test } from "vitest"

import {
  addDays,
  dateKey,
  daysBetween,
  eachDay,
  formatClock,
  formatCompact,
  formatDate,
  formatDayHeader,
  formatDuration,
  formatIdleSpan,
  formatTimeOfDay,
  parseDurationInput,
  parseTimeInput,
  roundSeconds,
  weekStartOf,
} from "@/src/timetrack/timetrackFormatService"

describe("duration formatting", () => {
  test("the three Toggl display formats", () => {
    expect(formatDuration(5400, "classic")).toBe("1:30:00")
    expect(formatDuration(5400, "improved")).toBe("1:30")
    expect(formatDuration(5400, "decimal")).toBe("1.50")
    expect(formatDuration(5415, "classic")).toBe("1:30:15")
  })

  test("zero and negative values", () => {
    expect(formatDuration(0, "improved")).toBe("0:00")
    expect(formatDuration(-90, "classic")).toBe("-0:01:30")
  })

  test("clock always shows seconds", () => {
    expect(formatClock(59)).toBe("0:00:59")
    expect(formatClock(3661)).toBe("1:01:01")
  })

  test("compact labels", () => {
    expect(formatCompact(600)).toBe("10m")
    expect(formatCompact(3900)).toBe("1h 05m")
  })
})

describe("duration input parsing", () => {
  test("h:mm and h:mm:ss", () => {
    expect(parseDurationInput("1:30")).toBe(5400)
    expect(parseDurationInput("0:45")).toBe(2700)
    expect(parseDurationInput("2:05:30")).toBe(7530)
  })

  test("decimal hours with dot or comma", () => {
    expect(parseDurationInput("1.5")).toBe(5400)
    expect(parseDurationInput("1,25")).toBe(4500)
  })

  test("a bare number means minutes", () => {
    expect(parseDurationInput("90")).toBe(5400)
    expect(parseDurationInput("30")).toBe(1800)
  })

  test("unit suffixes", () => {
    expect(parseDurationInput("1h30m")).toBe(5400)
    expect(parseDurationInput("45m")).toBe(2700)
    expect(parseDurationInput("90s")).toBe(90)
    expect(parseDurationInput("2h")).toBe(7200)
  })

  test("rejects nonsense and impossible values", () => {
    expect(parseDurationInput("")).toBeNull()
    expect(parseDurationInput("abc")).toBeNull()
    expect(parseDurationInput("1:75")).toBeNull()
  })
})

describe("time input parsing", () => {
  test("24-hour, compact and 12-hour forms", () => {
    const day = "2026-08-10"
    expect(new Date(parseTimeInput("13:45", day)!).getHours()).toBe(13)
    expect(new Date(parseTimeInput("1345", day)!).getMinutes()).toBe(45)
    expect(new Date(parseTimeInput("1:45 pm", day)!).getHours()).toBe(13)
    expect(new Date(parseTimeInput("9", day)!).getHours()).toBe(9)
    expect(new Date(parseTimeInput("12:30 am", day)!).getHours()).toBe(0)
  })

  test("rejects invalid clock values", () => {
    expect(parseTimeInput("25:00", "2026-08-10")).toBeNull()
    expect(parseTimeInput("12:99", "2026-08-10")).toBeNull()
  })
})

describe("rounding", () => {
  test("disabled rounding is a no-op", () => {
    expect(roundSeconds(1000, { enabled: false, mode: "up", minutes: 15 })).toBe(1000)
  })

  test("nearest / up / down at 15 minutes", () => {
    expect(roundSeconds(400, { enabled: true, mode: "nearest", minutes: 15 })).toBe(0)
    expect(roundSeconds(500, { enabled: true, mode: "nearest", minutes: 15 })).toBe(900)
    expect(roundSeconds(60, { enabled: true, mode: "up", minutes: 15 })).toBe(900)
    expect(roundSeconds(1000, { enabled: true, mode: "down", minutes: 15 })).toBe(900)
  })

  test("zero stays zero", () => {
    expect(roundSeconds(0, { enabled: true, mode: "up", minutes: 30 })).toBe(0)
  })
})

describe("date helpers", () => {
  test("week start honours the configured first day", () => {
    expect(weekStartOf("2026-08-12", 1)).toBe("2026-08-10")
    expect(weekStartOf("2026-08-12", 0)).toBe("2026-08-09")
    expect(weekStartOf("2026-08-12", 6)).toBe("2026-08-08")
  })

  test("addDays crosses month boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01")
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31")
  })

  test("daysBetween and eachDay", () => {
    expect(daysBetween("2026-08-01", "2026-08-10")).toBe(9)
    expect(eachDay("2026-08-01", "2026-08-03")).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"])
  })

  test("dateKey uses local time, not UTC", () => {
    const local = new Date(2026, 7, 10, 1, 30)
    expect(dateKey(local)).toBe("2026-08-10")
  })

  test("day headers label today and yesterday", () => {
    expect(formatDayHeader("2026-08-10", "2026-08-10")).toBe("Today")
    expect(formatDayHeader("2026-08-09", "2026-08-10")).toBe("Yesterday")
    expect(formatDayHeader("2026-08-05", "2026-08-10")).toBe("Wed, 5 Aug")
  })

  test("date formats", () => {
    expect(formatDate("2026-08-10", "DD.MM.YYYY")).toBe("10.08.2026")
    expect(formatDate("2026-08-10", "MM/DD/YYYY")).toBe("08/10/2026")
    expect(formatDate("2026-08-10", "YYYY-MM-DD")).toBe("2026-08-10")
  })

  test("time of day in both formats", () => {
    const iso = new Date(2026, 7, 10, 15, 5).toISOString()
    expect(formatTimeOfDay(iso, "h24")).toBe("15:05")
    expect(formatTimeOfDay(iso, "h12")).toBe("3:05 PM")
  })
})

describe("idle spans read as plain language", () => {
  test("seconds", () => {
    expect(formatIdleSpan(1)).toBe("1 second")
    expect(formatIdleSpan(45)).toBe("45 seconds")
  })

  test("minutes — never 0.05 or 0:03", () => {
    expect(formatIdleSpan(180)).toBe("3 minutes")
    expect(formatIdleSpan(300)).toBe("5 minutes")
    expect(formatIdleSpan(60)).toBe("1 minute")
  })

  test("hours, with minutes only when there are some", () => {
    expect(formatIdleSpan(3600)).toBe("1 hour")
    expect(formatIdleSpan(3900)).toBe("1 hour 5 minutes")
    expect(formatIdleSpan(7200)).toBe("2 hours")
  })

  test("never negative", () => {
    expect(formatIdleSpan(-10)).toBe("0 seconds")
  })
})
