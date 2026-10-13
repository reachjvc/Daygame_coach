import { describe, test, expect } from "vitest"
import { classifyHorizon, formatCountdown, addDaysISO, clampDateWithin, suggestChildWithin } from "@/src/goals/horizonService"

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

describe("clampDateWithin (tier date nesting)", () => {
  test("flags a child date later than its parent", () => {
    expect(clampDateWithin("2026-12-01", "2026-06-07", "2026-09-01").violatesParent).toBe(true)
    expect(clampDateWithin("2026-08-01", "2026-06-07", "2026-09-01").violatesParent).toBe(false)
  })
  test("flags a child date before the plan start", () => {
    expect(clampDateWithin("2026-05-01", "2026-06-07", "2026-09-01").beforeStart).toBe(true)
    expect(clampDateWithin("2026-07-01", "2026-06-07", "2026-09-01").beforeStart).toBe(false)
  })
  test("equal dates are allowed (not a violation)", () => {
    expect(clampDateWithin("2026-09-01", "2026-06-07", "2026-09-01").violatesParent).toBe(false)
  })
  test("missing dates impose no constraint", () => {
    expect(clampDateWithin("2026-12-01", undefined, undefined)).toEqual({ violatesParent: false, beforeStart: false })
    expect(clampDateWithin(undefined, "2026-06-07", "2026-09-01")).toEqual({ violatesParent: false, beforeStart: false })
  })
  test("suggestChildWithin returns the parent date when set", () => {
    expect(suggestChildWithin("2026-06-07", "2026-09-01")).toBe("2026-09-01")
    expect(suggestChildWithin("2026-06-07", undefined)).toBeNull()
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
