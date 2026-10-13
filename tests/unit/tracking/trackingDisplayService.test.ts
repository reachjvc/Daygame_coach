import { describe, test, expect } from "vitest"
import {
  getOutcomeLabel,
  getOutcomeEmoji,
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
