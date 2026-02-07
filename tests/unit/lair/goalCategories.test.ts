import { describe, test, expect } from "vitest"
import {
  getCategoryConfig,
  GOAL_CATEGORIES,
  GOAL_CATEGORY_MAP,
  DEFAULT_CATEGORY_CONFIG,
  type GoalSuggestion,
} from "@/src/lair/data/goalCategories"

// ============================================================================
// getCategoryConfig
// ============================================================================

describe("getCategoryConfig", () => {
  describe("known categories", () => {
    test("should return config for fitness category", () => {
      // Arrange
      const categoryId = "fitness"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result.id).toBe("fitness")
      expect(result.name).toBe("Fitness")
      expect(result.color).toBe("text-blue-500")
    })

    test("should return config for eating category", () => {
      // Arrange
      const categoryId = "eating"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result.id).toBe("eating")
      expect(result.name).toBe("Eating")
      expect(result.color).toBe("text-green-500")
    })

    test("should return config for cardio category", () => {
      // Arrange
      const categoryId = "cardio"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result.id).toBe("cardio")
      expect(result.name).toBe("Cardio")
      expect(result.color).toBe("text-red-500")
    })

    test("should return config for daygame category", () => {
      // Arrange
      const categoryId = "daygame"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result.id).toBe("daygame")
      expect(result.name).toBe("Daygame")
      expect(result.color).toBe("text-orange-500")
    })

    test("should return config for business category", () => {
      // Arrange
      const categoryId = "business"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result.id).toBe("business")
      expect(result.name).toBe("Business")
      expect(result.color).toBe("text-purple-500")
    })

    test("should return all defined properties for known category", () => {
      // Arrange
      const categoryId = "fitness"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result).toHaveProperty("id")
      expect(result).toHaveProperty("name")
      expect(result).toHaveProperty("icon")
      expect(result).toHaveProperty("color")
      expect(result).toHaveProperty("bgColor")
      expect(result).toHaveProperty("borderColor")
      expect(result).toHaveProperty("progressColor")
      expect(result).toHaveProperty("suggestions")
    })
  })

  describe("custom categories", () => {
    test("should return default config for custom category", () => {
      // Arrange
      const categoryId = "mycustomcategory"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result.id).toBe("mycustomcategory")
      expect(result.color).toBe(DEFAULT_CATEGORY_CONFIG.color)
      expect(result.bgColor).toBe(DEFAULT_CATEGORY_CONFIG.bgColor)
    })

    test("should capitalize custom category name", () => {
      // Arrange
      const categoryId = "meditation"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result.name).toBe("Meditation")
    })

    test("should capitalize only first letter for single word", () => {
      // Arrange
      const categoryId = "health"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result.name).toBe("Health")
    })

    test("should handle already capitalized custom category", () => {
      // Arrange
      const categoryId = "Yoga"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result.name).toBe("Yoga")
    })

    test("should have empty suggestions for custom category", () => {
      // Arrange
      const categoryId = "custom"

      // Act
      const result = getCategoryConfig(categoryId)

      // Assert
      expect(result.suggestions).toEqual([])
    })
  })
})

// ============================================================================
// GOAL_CATEGORIES array
// ============================================================================

describe("GOAL_CATEGORIES", () => {
  test("should have 5 predefined categories", () => {
    // Assert
    expect(GOAL_CATEGORIES.length).toBe(5)
  })

  test("should have unique IDs", () => {
    // Arrange
    const ids = GOAL_CATEGORIES.map(c => c.id)
    const uniqueIds = new Set(ids)

    // Assert
    expect(uniqueIds.size).toBe(ids.length)
  })

  test("each category should have suggestions array with valid structure", () => {
    // Assert
    for (const category of GOAL_CATEGORIES) {
      expect(Array.isArray(category.suggestions)).toBe(true)
      expect(category.suggestions.length).toBeGreaterThan(0)

      for (const suggestion of category.suggestions) {
        expect(suggestion).toHaveProperty("title")
        expect(suggestion).toHaveProperty("defaultTarget")
        expect(suggestion).toHaveProperty("defaultPeriod")
        expect(typeof suggestion.title).toBe("string")
        expect(typeof suggestion.defaultTarget).toBe("number")
        expect(["daily", "weekly", "monthly", "custom"]).toContain(suggestion.defaultPeriod)
      }
    }
  })
})

// ============================================================================
// GOAL_CATEGORY_MAP
// ============================================================================

describe("GOAL_CATEGORY_MAP", () => {
  test("should have all categories from GOAL_CATEGORIES", () => {
    // Assert
    for (const category of GOAL_CATEGORIES) {
      expect(GOAL_CATEGORY_MAP[category.id]).toBeDefined()
      expect(GOAL_CATEGORY_MAP[category.id].id).toBe(category.id)
    }
  })

  test("should provide O(1) lookup", () => {
    // Act
    const result = GOAL_CATEGORY_MAP["fitness"]

    // Assert
    expect(result.id).toBe("fitness")
  })
})
