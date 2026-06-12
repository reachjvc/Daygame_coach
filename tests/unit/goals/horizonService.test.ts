import { describe, test, expect } from "vitest"
import { classifyHorizon, HORIZON_META, HORIZONS_ORDERED, formatCountdown, addDaysISO, suggestedTargetDate, clampDateWithin, suggestChildWithin, interpolateDateISO } from "@/src/goals/horizonService"

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
  test("HORIZONS_ORDERED runs abstract→concrete and matches meta order", () => {
    expect(HORIZONS_ORDERED).toEqual(["vision", "year", "quarter", "now"])
    expect(HORIZONS_ORDERED.map((h) => HORIZON_META[h].order)).toEqual([0, 1, 2, 3])
  })
})

describe("addDaysISO / suggestedTargetDate", () => {
  test("addDaysISO advances the date", () => {
    expect(addDaysISO("2026-06-07", 90)).toBe("2026-09-05")
    expect(addDaysISO("2026-06-07", 365)).toBe("2027-06-07")
  })
  test("suggests start+365 for an undated metric, none for habits/journeys", () => {
    expect(suggestedTargetDate({ primitive: "target", role: "metric" }, "2026-06-07")).toBe("2027-06-07")
    expect(suggestedTargetDate({ primitive: "habit", role: "driver" }, "2026-06-07")).toBeNull()
    expect(suggestedTargetDate({ primitive: "stage", role: "metric" }, "2026-06-07")).toBeNull()
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

describe("interpolateDateISO (milestone checkpoint pacing)", () => {
  test("endpoints and midpoint", () => {
    expect(interpolateDateISO("2026-01-01", "2026-12-31", 0)).toBe("2026-01-01")
    expect(interpolateDateISO("2026-01-01", "2026-12-31", 1)).toBe("2026-12-31")
    expect(interpolateDateISO("2026-01-01", "2026-01-11", 0.5)).toBe("2026-01-06")
  })
  test("clamps fraction outside 0..1 and rejects bad input", () => {
    expect(interpolateDateISO("2026-01-01", "2026-12-31", -1)).toBe("2026-01-01")
    expect(interpolateDateISO("2026-01-01", "2026-12-31", 2)).toBe("2026-12-31")
    expect(interpolateDateISO("nope", "2026-12-31", 0.5)).toBeNull()
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
