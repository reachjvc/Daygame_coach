import { describe, test, expect } from "vitest"
import {
  getOutcomeLabel,
  getOutcomeEmoji,
  getOutcomeColor,
  getSetTypeLabel,
  getSetTypeEmoji,
  isUnknownOutcome,
  isUnknownSetType,
} from "@/src/tracking/trackingDisplayService"

describe("getOutcomeLabel", () => {
  test("returns label for known outcomes", () => {
    expect(getOutcomeLabel("blowout")).toBe("Blowout")
    expect(getOutcomeLabel("instadate")).toBe("Instadate")
  })
  test("returns formatted string for unknown outcome", () => {
    expect(getOutcomeLabel("future_outcome")).toBe("Future Outcome")
  })
})

describe("getOutcomeEmoji", () => {
  test("returns emoji for known outcomes", () => {
    expect(getOutcomeEmoji("good")).toBe("👍")
  })
  test("returns ❓ for unknown outcome", () => {
    expect(getOutcomeEmoji("unknown")).toBe("❓")
  })
})

describe("getOutcomeColor", () => {
  test("returns color for known outcomes", () => {
    expect(getOutcomeColor("blowout")).toContain("red")
  })
  test("returns amber warning for unknown outcome", () => {
    expect(getOutcomeColor("unknown")).toContain("amber")
  })
})

describe("getSetTypeLabel", () => {
  test("returns label for known set types", () => {
    expect(getSetTypeLabel("solo")).toBe("Solo")
    expect(getSetTypeLabel("two_set")).toBe("2-Set")
  })
  test("returns formatted string for unknown set type", () => {
    expect(getSetTypeLabel("quad_set")).toBe("Quad Set")
  })
})

describe("getSetTypeEmoji", () => {
  test("returns emoji for known set types", () => {
    expect(getSetTypeEmoji("solo")).toBe("👤")
  })
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
