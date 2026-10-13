/**
 * DIFFICULTY_OPTIONS — the list the settings picker renders — offers every
 * DifficultyLevel and nothing else. It is an array, not a Record keyed by the
 * level, so a missing or extra entry is a runtime fact this file checks.
 */

import { describe, expect, test } from "vitest"
import { DIFFICULTY_LEVELS, DIFFICULTY_OPTIONS } from "@/src/settings/types"

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
