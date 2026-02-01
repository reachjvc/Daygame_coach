import { describe, test, expect } from "vitest"
import {
  getDifficultyForLevel,
  getDifficultyPromptModifier,
  DIFFICULTY_LEVELS,
} from "@/src/scenarios/shared/difficulty"

// ============================================================================
// getDifficultyForLevel - BOUNDARY TESTS
// ============================================================================

describe("getDifficultyForLevel", () => {
  test("should return 'beginner' for level 0", () => {
    // Arrange & Act
    const result = getDifficultyForLevel(0)

    // Assert
    expect(result).toBe("beginner")
  })

  test("should return 'beginner' for level 4 (just below threshold)", () => {
    // Arrange & Act
    const result = getDifficultyForLevel(4)

    // Assert
    expect(result).toBe("beginner")
  })

  test("should return 'intermediate' for level 5 (at threshold)", () => {
    // Arrange & Act
    const result = getDifficultyForLevel(5)

    // Assert
    expect(result).toBe("intermediate")
  })

  test("should return 'intermediate' for level 9 (just below next threshold)", () => {
    // Arrange & Act
    const result = getDifficultyForLevel(9)

    // Assert
    expect(result).toBe("intermediate")
  })

  test("should return 'advanced' for level 10", () => {
    // Arrange & Act
    const result = getDifficultyForLevel(10)

    // Assert
    expect(result).toBe("advanced")
  })

  test("should return 'advanced' for level 14", () => {
    // Arrange & Act
    const result = getDifficultyForLevel(14)

    // Assert
    expect(result).toBe("advanced")
  })

  test("should return 'expert' for level 15", () => {
    // Arrange & Act
    const result = getDifficultyForLevel(15)

    // Assert
    expect(result).toBe("expert")
  })

  test("should return 'expert' for level 19", () => {
    // Arrange & Act
    const result = getDifficultyForLevel(19)

    // Assert
    expect(result).toBe("expert")
  })

  test("should return 'master' for level 20", () => {
    // Arrange & Act
    const result = getDifficultyForLevel(20)

    // Assert
    expect(result).toBe("master")
  })

  test("should return 'master' for very high levels (100)", () => {
    // Arrange & Act
    const result = getDifficultyForLevel(100)

    // Assert
    expect(result).toBe("master")
  })
})

// ============================================================================
// getDifficultyPromptModifier - STRUCTURAL TESTS ONLY
// Note: We don't test exact strings (change detector). Only test structure.
// ============================================================================

describe("getDifficultyPromptModifier", () => {
  test("should include difficulty name in output", () => {
    // Arrange
    const difficulties = ["beginner", "intermediate", "advanced", "expert", "master"] as const

    for (const difficulty of difficulties) {
      // Act
      const result = getDifficultyPromptModifier(difficulty)

      // Assert: Should include the config name (capitalized version)
      expect(result).toContain(DIFFICULTY_LEVELS[difficulty].name)
    }
  })

  test("should include receptiveness value in output", () => {
    // Arrange
    const difficulties = ["beginner", "intermediate", "advanced", "expert", "master"] as const

    for (const difficulty of difficulties) {
      // Act
      const result = getDifficultyPromptModifier(difficulty)

      // Assert: Should include receptiveness/10 pattern
      const config = DIFFICULTY_LEVELS[difficulty]
      expect(result).toContain(`${config.receptiveness}/10`)
    }
  })
})

// ============================================================================
// DIFFICULTY_LEVELS data integrity
// ============================================================================

describe("DIFFICULTY_LEVELS", () => {
  test("should have all 5 difficulty levels defined", () => {
    // Arrange & Act
    const levels = Object.keys(DIFFICULTY_LEVELS)

    // Assert
    expect(levels).toContain("beginner")
    expect(levels).toContain("intermediate")
    expect(levels).toContain("advanced")
    expect(levels).toContain("expert")
    expect(levels).toContain("master")
    expect(levels).toHaveLength(5)
  })

  test("should have receptiveness values in decreasing order", () => {
    // Arrange
    const beginner = DIFFICULTY_LEVELS.beginner.receptiveness
    const intermediate = DIFFICULTY_LEVELS.intermediate.receptiveness
    const advanced = DIFFICULTY_LEVELS.advanced.receptiveness
    const expert = DIFFICULTY_LEVELS.expert.receptiveness
    const master = DIFFICULTY_LEVELS.master.receptiveness

    // Assert: higher difficulty = lower receptiveness
    expect(beginner).toBeGreaterThan(intermediate)
    expect(intermediate).toBeGreaterThan(advanced)
    expect(advanced).toBeGreaterThan(expert)
    expect(expert).toBeGreaterThan(master)
  })

  test("should have required womanDescription fields for each level", () => {
    // Arrange
    const requiredFields = ["outfitStyle", "vibe", "context"]

    for (const [level, config] of Object.entries(DIFFICULTY_LEVELS)) {
      // Assert
      for (const field of requiredFields) {
        expect(config.womanDescription).toHaveProperty(field)
        expect((config.womanDescription as Record<string, string>)[field]).toBeTruthy()
      }
    }
  })
})
