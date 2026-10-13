import { describe, test, expect } from "vitest"
import {
  getCategoryConfig,
  GOAL_CATEGORIES,
  GOAL_CATEGORY_MAP,
  DEFAULT_CATEGORY_CONFIG,
  type GoalSuggestion,
} from "@/src/goals/data/goalCategories"

// ============================================================================
// getCategoryConfig
// ============================================================================

describe("getCategoryConfig", () => {
  describe("custom/unknown categories", () => {
    test("should return default config for unknown category", () => {
      const result = getCategoryConfig("mycustomcategory")

      expect(result.id).toBe("mycustomcategory")
      expect(result.color).toBe(DEFAULT_CATEGORY_CONFIG.color)
      expect(result.bgColor).toBe(DEFAULT_CATEGORY_CONFIG.bgColor)
    })

    test("should replace underscores with spaces in unknown category name", () => {
      const result = getCategoryConfig("my_custom_area")

      expect(result.name).toBe("My custom area")
    })
  })
})

// ============================================================================
// GOAL_CATEGORIES array
// ============================================================================

describe("GOAL_CATEGORIES", () => {
  test("should have 6 predefined categories (matching LIFE_AREAS)", () => {
    expect(GOAL_CATEGORIES.length).toBe(6)
  })

  test("should have unique IDs", () => {
    const ids = GOAL_CATEGORIES.map(c => c.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })

  test("should include daygame as a category", () => {
    const daygame = GOAL_CATEGORIES.find(c => c.id === "daygame")
    expect(daygame).toBeDefined()
    expect(daygame!.name).toBe("Dating & Daygame")
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
    expect(result.name).toBe("Dating & Daygame")
  })

  test("should provide O(1) lookup for health_fitness", () => {
    const result = GOAL_CATEGORY_MAP["health_fitness"]

    expect(result.id).toBe("health_fitness")
    expect(result.name).toBe("Health & Appearance")
  })
})
