import { describe, test, expect } from "vitest"
import { classifyHorizon, formatCountdown, addDaysISO } from "@/src/goals/horizonService"

const NOW = new Date("2026-06-07T00:00:00")

describe("classifyHorizon", () => {
  test("ongoing drivers / habits → now", () => {
    expect(classifyHorizon({ primitive: "volume", role: "driver" }, NOW)).toBe("now")
    expect(classifyHorizon({ primitive: "habit", role: "driver" }, NOW)).toBe("now")
  })
  test("stage journeys → vision", () => {
    expect(classifyHorizon({ primitive: "stage", role: "metric" }, NOW)).toBe("vision")
  })
  test("dated metric buckets by days-to-date", () => {
    expect(classifyHorizon({ primitive: "target", role: "metric", targetDate: "2026-08-01" }, NOW)).toBe("quarter") // ~55d
    expect(classifyHorizon({ primitive: "target", role: "metric", targetDate: "2027-01-01" }, NOW)).toBe("year")    // ~208d
    expect(classifyHorizon({ primitive: "target", role: "metric", targetDate: "2030-01-01" }, NOW)).toBe("vision")  // far
  })
  test("undated metric → year (medium default)", () => {
    expect(classifyHorizon({ primitive: "target", role: "metric" }, NOW)).toBe("year")
  })
})

describe("addDaysISO", () => {
  test("addDaysISO advances the date", () => {
    expect(addDaysISO("2026-06-07", 90)).toBe("2026-09-05")
    expect(addDaysISO("2026-06-07", 365)).toBe("2027-06-07")
  })
})

describe("formatCountdown", () => {
  test("days / months / years / overdue / today", () => {
    expect(formatCountdown("2026-06-19", NOW)).toBe("in 12d")
    expect(formatCountdown("2026-09-05", NOW)).toBe("in 3mo")
    expect(formatCountdown("2028-07-07", NOW)).toMatch(/in 2y/)
    expect(formatCountdown("2026-06-02", NOW)).toBe("5d overdue")
    expect(formatCountdown("2026-06-07", NOW)).toBe("today")
    expect(formatCountdown("not-a-date", NOW)).toBeNull()
  })
})
