/**
 * Unit tests for Custom Report Builder config validation.
 * Ensures FIELD_LIBRARY, CATEGORY_INFO and the reserved session-import ids
 * are consistent with each other.
 */

import { describe, test, expect } from "vitest"
import {
  FIELD_LIBRARY,
  CATEGORY_INFO,
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
