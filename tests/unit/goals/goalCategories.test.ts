import { describe, test, expect } from "vitest"
import {
  getCategoryConfig,
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
