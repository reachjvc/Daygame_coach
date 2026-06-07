import { describe, test, expect } from "vitest"
import { classifyHorizon, HORIZON_META, HORIZONS_ORDERED } from "@/src/goals/horizonService"

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
