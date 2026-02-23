import { describe, test, expect } from "vitest"
import { getCategoryLabel, isUnknownCategory, getGoalTypeLabel, getGoalPhaseLabel, getGoalPhaseStyle, getPeriodLabel } from "@/src/goals/goalDisplayService"

describe("getCategoryLabel", () => {
  test("returns known label for known category", () => {
    expect(getCategoryLabel("field_work")).toBe("Field Work")
    expect(getCategoryLabel("nutrition")).toBe("Nutrition & Recovery")
  })
  test("returns formatted string for unknown category", () => {
    expect(getCategoryLabel("some_new_thing")).toBe("Some New Thing")
  })
})

describe("isUnknownCategory", () => {
  test("returns false for known categories", () => {
    expect(isUnknownCategory("field_work")).toBe(false)
  })
  test("returns true for unknown categories", () => {
    expect(isUnknownCategory("nonexistent")).toBe(true)
  })
  test("returns false for null", () => {
    expect(isUnknownCategory(null)).toBe(false)
  })
})

describe("getGoalTypeLabel", () => {
  test("returns label for known types", () => {
    expect(getGoalTypeLabel("recurring")).toBe("Recurring")
    expect(getGoalTypeLabel("milestone")).toBe("Milestone")
    expect(getGoalTypeLabel("habit_ramp")).toBe("Habit Ramp")
  })
  test("returns formatted string for unknown type", () => {
    expect(getGoalTypeLabel("future_type")).toBe("Future Type")
  })
})

describe("getGoalPhaseLabel", () => {
  test("returns label for known phases", () => {
    expect(getGoalPhaseLabel("acquisition")).toBe("Learning")
    expect(getGoalPhaseLabel("consolidation")).toBe("Consolidating")
    expect(getGoalPhaseLabel("graduated")).toBe("Graduated")
  })
  test("returns formatted string for unknown phase", () => {
    expect(getGoalPhaseLabel("mastered")).toBe("Mastered")
  })
})

describe("getGoalPhaseStyle", () => {
  test("returns correct style for known phases", () => {
    expect(getGoalPhaseStyle("graduated")).toContain("emerald")
    expect(getGoalPhaseStyle("consolidation")).toContain("blue")
    expect(getGoalPhaseStyle("acquisition")).toContain("muted")
  })
  test("returns amber warning style for unknown phase", () => {
    expect(getGoalPhaseStyle("unknown")).toContain("amber")
  })
})

describe("getPeriodLabel", () => {
  test("capitalizes period", () => {
    expect(getPeriodLabel("weekly")).toBe("Weekly")
    expect(getPeriodLabel("daily")).toBe("Daily")
  })
})
