/**
 * Unit tests for Custom Report Builder config validation.
 * Ensures FIELD_LIBRARY, CATEGORY_INFO, SUGGESTED_FIELD_IDS and the reserved
 * session-import ids are consistent with each other.
 */

import { describe, test, expect } from "vitest"
import {
  FIELD_LIBRARY,
  CATEGORY_INFO,
  SUGGESTED_FIELD_IDS,
  SESSION_IMPORT_FIELD_IDS,
} from "@/src/tracking/config"
import type { FieldCategory } from "@/src/tracking/types"

describe("Custom Report Builder Config", () => {
  describe("FIELD_LIBRARY", () => {
    test("all field IDs should be unique", () => {
      // Arrange
      const ids = FIELD_LIBRARY.map((f) => f.id)
      const uniqueIds = new Set(ids)

      // Assert
      expect(uniqueIds.size).toBe(ids.length)
    })

    test("select and multiselect fields should have options", () => {
      // Arrange
      const selectFields = FIELD_LIBRARY.filter(
        (f) => f.type === "select" || f.type === "multiselect"
      )

      // Act & Assert
      for (const field of selectFields) {
        expect(
          field.options,
          `Field "${field.id}" (${field.type}) should have options`
        ).toBeDefined()
        expect(field.options!.length).toBeGreaterThan(0)
      }
    })

    test("description should not be empty", () => {
      // Act & Assert
      for (const field of FIELD_LIBRARY) {
        expect(
          field.description.trim().length,
          `Field "${field.id}" should have a non-empty description`
        ).toBeGreaterThan(0)
      }
    })
  })

  describe("SUGGESTED_FIELD_IDS", () => {
    test("should have at least 3 suggested fields", () => {
      // Assert
      expect(SUGGESTED_FIELD_IDS.length).toBeGreaterThanOrEqual(3)
    })

    test("all suggested IDs should exist in FIELD_LIBRARY", () => {
      // Arrange
      const fieldIds = new Set(FIELD_LIBRARY.map((f) => f.id))

      // Act & Assert
      for (const suggestedId of SUGGESTED_FIELD_IDS) {
        expect(
          fieldIds.has(suggestedId),
          `Suggested field ID "${suggestedId}" not found in FIELD_LIBRARY`
        ).toBe(true)
      }
    })

    test("suggested IDs should be unique", () => {
      // Arrange
      const uniqueIds = new Set(SUGGESTED_FIELD_IDS)

      // Assert
      expect(uniqueIds.size).toBe(SUGGESTED_FIELD_IDS.length)
    })

    test("should include essential fields", () => {
      // Arrange: Fields that should be suggested for new users
      // Note: "mood" removed - post-session mood is now handled by SessionImportSection
      const essentialFields = ["approaches", "best_moment"]

      // Act & Assert
      for (const essential of essentialFields) {
        expect(
          SUGGESTED_FIELD_IDS,
          `Suggested fields should include "${essential}"`
        ).toContain(essential)
      }
    })
  })

  describe("Cross-validation", () => {
    test("each category should have at least one field", () => {
      // Arrange
      const fieldsByCategory = new Map<FieldCategory, number>()
      for (const field of FIELD_LIBRARY) {
        fieldsByCategory.set(
          field.category,
          (fieldsByCategory.get(field.category) || 0) + 1
        )
      }

      // Act & Assert
      for (const category of Object.keys(CATEGORY_INFO) as FieldCategory[]) {
        const count = fieldsByCategory.get(category) || 0
        expect(
          count,
          `Category "${category}" should have at least one field`
        ).toBeGreaterThan(0)
      }
    })
  })

  describe("SESSION_IMPORT_FIELD_IDS", () => {
    test("SESSION_IMPORT_FIELD_IDS should not collide with FIELD_LIBRARY", () => {
      // Arrange
      const fieldLibraryIds = new Set(FIELD_LIBRARY.map((f) => f.id))
      const sessionImportIds = Object.values(SESSION_IMPORT_FIELD_IDS)

      // Act & Assert
      for (const reservedId of sessionImportIds) {
        expect(
          fieldLibraryIds.has(reservedId),
          `Reserved field ID "${reservedId}" collides with FIELD_LIBRARY`
        ).toBe(false)
      }
    })
  })
})
