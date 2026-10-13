import { describe, test, expect } from "vitest"
import { getCategoryLabel, getGoalPhaseLabel, getPeriodLabel, getPeriodAbbrev } from "@/src/goals/goalDisplayService"

describe("getCategoryLabel", () => {
  test("returns formatted string for unknown category", () => {
    expect(getCategoryLabel("some_new_thing")).toBe("Some New Thing")
  })
})

describe("getGoalPhaseLabel", () => {
  test("returns formatted string for unknown phase", () => {
    expect(getGoalPhaseLabel("mastered")).toBe("Mastered")
  })
})

describe("getPeriodLabel", () => {
  test("capitalizes period", () => {
    expect(getPeriodLabel("weekly")).toBe("Weekly")
    expect(getPeriodLabel("daily")).toBe("Daily")
  })
})

describe("getPeriodAbbrev", () => {
  test("returns raw string for unknown period", () => {
    expect(getPeriodAbbrev("custom")).toBe("custom")
  })
})
