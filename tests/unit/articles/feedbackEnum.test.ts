/**
 * Tests for the FeedbackType type guard.
 *
 * `isKnownFeedbackType` has no caller outside tests (D9, dead). These tests
 * wait for the dead-code wave, which deletes the function and this file
 * together.
 */

import { describe, expect, test } from "vitest"
import { FEEDBACK_TYPE_VALUES, isKnownFeedbackType } from "@/src/articles/types"

describe("isKnownFeedbackType type guard", () => {
  test("returns true for every valid feedback type", () => {
    for (const ft of FEEDBACK_TYPE_VALUES) {
      expect(isKnownFeedbackType(ft)).toBe(true)
    }
  })

  test("returns false for unknown string", () => {
    expect(isKnownFeedbackType("amazing")).toBe(false)
  })

  test("returns false for empty string", () => {
    expect(isKnownFeedbackType("")).toBe(false)
  })

  test("returns false for case variation", () => {
    expect(isKnownFeedbackType("Excellent")).toBe(false)
    expect(isKnownFeedbackType("AI")).toBe(false)
  })
})
