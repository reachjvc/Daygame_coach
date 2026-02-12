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
  describe("known life areas (via adapter)", () => {
    test("should return config for daygame life area", () => {
      const result = getCategoryConfig("daygame")

      expect(result.id).toBe("daygame")
      expect(result.name).toBe("Daygame")
      expect(result.color).toBe("text-orange-500")
    })

    test("should return config for health_fitness life area", () => {
      const result = getCategoryConfig("health_fitness")

      expect(result.id).toBe("health_fitness")
      expect(result.name).toBe("Health & Fitness")
      expect(result.color).toBe("text-green-500")
    })

    test("should return config for career_business life area", () => {
      const result = getCategoryConfig("career_business")

      expect(result.id).toBe("career_business")
      expect(result.name).toBe("Career & Business")
      expect(result.color).toBe("text-purple-500")
    })

    test("should return config for dating life area", () => {
      const result = getCategoryConfig("dating")

      expect(result.id).toBe("dating")
      expect(result.name).toBe("Dating & Relationships")
      expect(result.color).toBe("text-pink-500")
    })

    test("should return config for social life area", () => {
      const result = getCategoryConfig("social")

      expect(result.id).toBe("social")
      expect(result.name).toBe("Social Life")
      expect(result.color).toBe("text-blue-500")
    })

    test("should return all defined properties for known life area", () => {
      const result = getCategoryConfig("daygame")

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

  describe("custom/unknown categories", () => {
    test("should return default config for unknown category", () => {
      const result = getCategoryConfig("mycustomcategory")

      expect(result.id).toBe("mycustomcategory")
      expect(result.color).toBe(DEFAULT_CATEGORY_CONFIG.color)
      expect(result.bgColor).toBe(DEFAULT_CATEGORY_CONFIG.bgColor)
    })

    test("should capitalize unknown category name", () => {
      const result = getCategoryConfig("meditation")

      expect(result.name).toBe("Meditation")
    })

    test("should replace underscores with spaces in unknown category name", () => {
      const result = getCategoryConfig("my_custom_area")

      expect(result.name).toBe("My custom area")
    })

    test("should handle already capitalized custom category", () => {
      const result = getCategoryConfig("Yoga")

      expect(result.name).toBe("Yoga")
    })

    test("should have empty suggestions for custom category", () => {
      const result = getCategoryConfig("custom")

      expect(result.suggestions).toEqual([])
    })
  })
})

// ============================================================================
// GOAL_CATEGORIES array
// ============================================================================

describe("GOAL_CATEGORIES", () => {
  test("should have 10 predefined categories (matching LIFE_AREAS)", () => {
    expect(GOAL_CATEGORIES.length).toBe(10)
  })

  test("should have unique IDs", () => {
    const ids = GOAL_CATEGORIES.map(c => c.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })

  test("should include daygame as a category", () => {
    const daygame = GOAL_CATEGORIES.find(c => c.id === "daygame")
    expect(daygame).toBeDefined()
    expect(daygame!.name).toBe("Daygame")
  })

  test("each category should have suggestions array with valid structure", () => {
    // Filter out "custom" which has empty suggestions
    const categoriesWithSuggestions = GOAL_CATEGORIES.filter(c => c.id !== "custom")

    for (const category of categoriesWithSuggestions) {
      expect(Array.isArray(category.suggestions)).toBe(true)
      expect(category.suggestions.length).toBeGreaterThan(0)

      for (const suggestion of category.suggestions) {
        expect(suggestion).toHaveProperty("title")
        expect(suggestion).toHaveProperty("defaultTarget")
        expect(suggestion).toHaveProperty("defaultPeriod")
        expect(typeof suggestion.title).toBe("string")
        expect(typeof suggestion.defaultTarget).toBe("number")
        expect(["daily", "weekly", "monthly", "quarterly", "yearly", "custom"]).toContain(suggestion.defaultPeriod)
      }
    }
  })
})

// ============================================================================
// GOAL_CATEGORY_MAP
// ============================================================================

describe("GOAL_CATEGORY_MAP", () => {
  test("should have all categories from GOAL_CATEGORIES", () => {
    for (const category of GOAL_CATEGORIES) {
      expect(GOAL_CATEGORY_MAP[category.id]).toBeDefined()
      expect(GOAL_CATEGORY_MAP[category.id].id).toBe(category.id)
    }
  })

  test("should provide O(1) lookup for daygame", () => {
    const result = GOAL_CATEGORY_MAP["daygame"]

    expect(result.id).toBe("daygame")
    expect(result.name).toBe("Daygame")
  })

  test("should provide O(1) lookup for health_fitness", () => {
    const result = GOAL_CATEGORY_MAP["health_fitness"]

    expect(result.id).toBe("health_fitness")
    expect(result.name).toBe("Health & Fitness")
  })
})
