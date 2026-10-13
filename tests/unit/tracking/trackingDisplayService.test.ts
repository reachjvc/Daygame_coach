import { describe, test, expect } from "vitest"
import {
  getOutcomeLabel,
  getOutcomeEmoji,
  getSetTypeLabel,
  getSetTypeEmoji,
  isUnknownOutcome,
  isUnknownSetType,
} from "@/src/tracking/trackingDisplayService"

describe("getOutcomeLabel", () => {
  test("returns formatted string for unknown outcome", () => {
    expect(getOutcomeLabel("future_outcome")).toBe("Future Outcome")
  })
})

describe("getOutcomeEmoji", () => {
  test("returns ❓ for unknown outcome", () => {
    expect(getOutcomeEmoji("unknown")).toBe("❓")
  })
})

describe("getSetTypeLabel", () => {
  test("returns formatted string for unknown set type", () => {
    expect(getSetTypeLabel("quad_set")).toBe("Quad Set")
  })
})

describe("getSetTypeEmoji", () => {
  test("returns ❓ for unknown set type", () => {
    expect(getSetTypeEmoji("unknown_set")).toBe("❓")
  })
})

describe("isUnknownOutcome", () => {
  test("returns false for known", () => expect(isUnknownOutcome("good")).toBe(false))
  test("returns true for unknown", () => expect(isUnknownOutcome("xxx")).toBe(true))
  test("returns false for null", () => expect(isUnknownOutcome(null)).toBe(false))
})

describe("isUnknownSetType", () => {
  test("returns false for known", () => expect(isUnknownSetType("solo")).toBe(false))
  test("returns true for unknown", () => expect(isUnknownSetType("xxx")).toBe(true))
  test("returns false for null", () => expect(isUnknownSetType(null)).toBe(false))
})
