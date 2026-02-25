/**
 * Tests for the hardened DifficultyLevel enum pattern.
 * Validates const array, type guard, Zod schema, and DIFFICULTY_OPTIONS exhaustiveness.
 */

import { describe, expect, test } from "vitest"
import {
  DIFFICULTY_LEVELS,
  VALID_DIFFICULTIES,
  isKnownDifficulty,
  DifficultyLevelSchema,
  DIFFICULTY_OPTIONS,
} from "@/src/settings/types"

describe("DIFFICULTY_LEVELS const array", () => {
  test("has exactly 5 values", () => {
    expect(DIFFICULTY_LEVELS).toHaveLength(5)
  })

  test("contains expected values in order", () => {
    expect(DIFFICULTY_LEVELS).toEqual([
      "beginner",
      "intermediate",
      "advanced",
      "expert",
      "master",
    ])
  })

  test("is readonly (frozen at type level)", () => {
    // The `as const` makes it readonly at the type level.
    // At runtime we verify it matches VALID_DIFFICULTIES.
    expect([...DIFFICULTY_LEVELS]).toEqual(VALID_DIFFICULTIES)
  })
})

describe("VALID_DIFFICULTIES backward-compat alias", () => {
  test("contains the same values as DIFFICULTY_LEVELS", () => {
    expect(VALID_DIFFICULTIES).toEqual([...DIFFICULTY_LEVELS])
  })
})

describe("isKnownDifficulty type guard", () => {
  test("returns true for every valid difficulty", () => {
    for (const level of DIFFICULTY_LEVELS) {
      expect(isKnownDifficulty(level)).toBe(true)
    }
  })

  test("returns false for unknown string", () => {
    expect(isKnownDifficulty("legendary")).toBe(false)
  })

  test("returns false for empty string", () => {
    expect(isKnownDifficulty("")).toBe(false)
  })

  test("returns false for substring of valid value", () => {
    expect(isKnownDifficulty("begin")).toBe(false)
  })

  test("returns false for case variation", () => {
    expect(isKnownDifficulty("Beginner")).toBe(false)
    expect(isKnownDifficulty("EXPERT")).toBe(false)
  })
})

describe("DifficultyLevelSchema (Zod)", () => {
  test("accepts every valid difficulty", () => {
    for (const level of DIFFICULTY_LEVELS) {
      const result = DifficultyLevelSchema.safeParse(level)
      expect(result.success).toBe(true)
    }
  })

  test("rejects unknown string", () => {
    const result = DifficultyLevelSchema.safeParse("legendary")
    expect(result.success).toBe(false)
  })

  test("rejects non-string input", () => {
    expect(DifficultyLevelSchema.safeParse(42).success).toBe(false)
    expect(DifficultyLevelSchema.safeParse(null).success).toBe(false)
    expect(DifficultyLevelSchema.safeParse(undefined).success).toBe(false)
  })
})

describe("DIFFICULTY_OPTIONS exhaustiveness", () => {
  test("covers every value in DIFFICULTY_LEVELS", () => {
    const optionIds = new Set(DIFFICULTY_OPTIONS.map(o => o.id))
    for (const level of DIFFICULTY_LEVELS) {
      expect(optionIds.has(level)).toBe(true)
    }
  })

  test("has same count as DIFFICULTY_LEVELS (no extras)", () => {
    expect(DIFFICULTY_OPTIONS).toHaveLength(DIFFICULTY_LEVELS.length)
  })
})
