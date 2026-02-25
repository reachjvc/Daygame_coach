/**
 * Tests for the hardened FeedbackType enum pattern.
 * Validates const array, type guard, Zod schema, and FEEDBACK_TYPES exhaustiveness.
 */

import { describe, expect, test } from "vitest"
import {
  FEEDBACK_TYPE_VALUES,
  FEEDBACK_TYPES,
  isKnownFeedbackType,
} from "@/src/articles/types"
import { FeedbackTypeSchema } from "@/src/articles/schemas"

const EXPECTED_VALUES = [
  "excellent",
  "good",
  "almost",
  "angle",
  "ai",
  "note",
  "source",
  "alternatives",
  "negative",
] as const

describe("FEEDBACK_TYPE_VALUES const array", () => {
  test("has 9 values", () => {
    expect(FEEDBACK_TYPE_VALUES).toHaveLength(9)
  })

  test("contains expected values in order", () => {
    expect(FEEDBACK_TYPE_VALUES).toEqual(EXPECTED_VALUES)
  })
})

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

describe("FeedbackTypeSchema (Zod) uses const array", () => {
  test("accepts every valid feedback type", () => {
    for (const ft of FEEDBACK_TYPE_VALUES) {
      const result = FeedbackTypeSchema.safeParse(ft)
      expect(result.success).toBe(true)
    }
  })

  test("rejects unknown string", () => {
    const result = FeedbackTypeSchema.safeParse("amazing")
    expect(result.success).toBe(false)
  })

  test("rejects non-string input", () => {
    expect(FeedbackTypeSchema.safeParse(42).success).toBe(false)
    expect(FeedbackTypeSchema.safeParse(null).success).toBe(false)
  })
})

describe("FEEDBACK_TYPES config exhaustiveness", () => {
  test("has a config entry for every value in FEEDBACK_TYPE_VALUES", () => {
    const configKeys = new Set(Object.keys(FEEDBACK_TYPES))
    for (const ft of FEEDBACK_TYPE_VALUES) {
      expect(configKeys.has(ft)).toBe(true)
    }
  })

  test("has same count as FEEDBACK_TYPE_VALUES (no extras)", () => {
    expect(Object.keys(FEEDBACK_TYPES)).toHaveLength(FEEDBACK_TYPE_VALUES.length)
  })

  test("every config entry has required fields", () => {
    for (const [key, config] of Object.entries(FEEDBACK_TYPES)) {
      expect(config.label).toBeTruthy()
      expect(config.tooltip).toBeTruthy()
      expect(config.color).toBeTruthy()
      expect(config.bg).toBeTruthy()
    }
  })
})
