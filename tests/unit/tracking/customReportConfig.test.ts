/**
 * Unit tests for Custom Report Builder config validation.
 * Ensures FIELD_LIBRARY, CATEGORY_INFO, and SUGGESTED_FIELD_IDS are consistent.
 */

import { describe, test, expect } from "vitest"
import {
  FIELD_LIBRARY,
  CATEGORY_INFO,
  SUGGESTED_FIELD_IDS,
  SESSION_IMPORT_FIELD_IDS,
} from "@/src/tracking/config"
import type { FieldCategory, FieldDefinition } from "@/src/tracking/types"

describe("Custom Report Builder Config", () => {
  describe("FIELD_LIBRARY", () => {
    test("should have at least 50 fields", () => {
      // Arrange & Act
      const fieldCount = FIELD_LIBRARY.length

      // Assert
      expect(fieldCount).toBeGreaterThanOrEqual(50)
    })

    test("all fields should have required properties", () => {
      // Arrange
      const requiredProps: (keyof FieldDefinition)[] = [
        "id",
        "type",
        "label",
        "category",
        "description",
        "usedIn",
      ]

      // Act & Assert
      for (const field of FIELD_LIBRARY) {
        for (const prop of requiredProps) {
          expect(field[prop], `Field "${field.id}" missing property "${prop}"`).toBeDefined()
        }
      }
    })

    test("all field IDs should be unique", () => {
      // Arrange
      const ids = FIELD_LIBRARY.map((f) => f.id)
      const uniqueIds = new Set(ids)

      // Assert
      expect(uniqueIds.size).toBe(ids.length)
    })

    test("all field categories should be valid", () => {
      // Arrange
      const validCategories: FieldCategory[] = [
        "quick_capture",
        "emotional",
        "analysis",
        "action",
        "context",
        "skill",
        "cognitive",
      ]

      // Act & Assert
      for (const field of FIELD_LIBRARY) {
        expect(
          validCategories,
          `Field "${field.id}" has invalid category "${field.category}"`
        ).toContain(field.category)
      }
    })

    test("all field types should be valid", () => {
      // Arrange
      const validTypes = [
        "text",
        "textarea",
        "number",
        "select",
        "multiselect",
        "scale",
        "datetime",
        "list",
        "tags",
        "audio",
      ]

      // Act & Assert
      for (const field of FIELD_LIBRARY) {
        expect(
          validTypes,
          `Field "${field.id}" has invalid type "${field.type}"`
        ).toContain(field.type)
      }
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

    test("usedIn should be an array with at least one template", () => {
      // Act & Assert
      for (const field of FIELD_LIBRARY) {
        expect(
          Array.isArray(field.usedIn),
          `Field "${field.id}" usedIn should be an array`
        ).toBe(true)
        expect(
          field.usedIn.length,
          `Field "${field.id}" should be used in at least one template`
        ).toBeGreaterThan(0)
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

  describe("CATEGORY_INFO", () => {
    test("should have info for all categories", () => {
      // Arrange
      const expectedCategories: FieldCategory[] = [
        "quick_capture",
        "emotional",
        "analysis",
        "action",
        "context",
        "skill",
        "cognitive",
      ]

      // Act & Assert
      for (const category of expectedCategories) {
        expect(
          CATEGORY_INFO[category],
          `Missing CATEGORY_INFO for "${category}"`
        ).toBeDefined()
      }
    })

    test("all categories should have required properties", () => {
      // Arrange
      const requiredProps = ["label", "color", "description"]

      // Act & Assert
      for (const [category, info] of Object.entries(CATEGORY_INFO)) {
        for (const prop of requiredProps) {
          expect(
            (info as Record<string, unknown>)[prop],
            `Category "${category}" missing property "${prop}"`
          ).toBeDefined()
        }
      }
    })

    test("all category colors should be valid Tailwind color names", () => {
      // Arrange
      const validColors = [
        "amber",
        "pink",
        "indigo",
        "green",
        "orange",
        "slate",
        "violet",
        "red",
        "blue",
        "purple",
        "emerald",
        "teal",
        "cyan",
        "sky",
        "lime",
        "yellow",
        "rose",
      ]

      // Act & Assert
      for (const [category, info] of Object.entries(CATEGORY_INFO)) {
        expect(
          validColors,
          `Category "${category}" has invalid color "${info.color}"`
        ).toContain(info.color)
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
    test("all FIELD_LIBRARY categories should have CATEGORY_INFO", () => {
      // Arrange
      const categoriesInLibrary = new Set(FIELD_LIBRARY.map((f) => f.category))
      const categoriesInInfo = new Set(Object.keys(CATEGORY_INFO))

      // Act & Assert
      for (const category of categoriesInLibrary) {
        expect(
          categoriesInInfo.has(category),
          `Category "${category}" used in FIELD_LIBRARY but missing from CATEGORY_INFO`
        ).toBe(true)
      }
    })

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
    test("should have POST_SESSION_MOOD defined", () => {
      // Assert
      expect(SESSION_IMPORT_FIELD_IDS.POST_SESSION_MOOD).toBeDefined()
      expect(typeof SESSION_IMPORT_FIELD_IDS.POST_SESSION_MOOD).toBe("string")
    })

    test("POST_SESSION_MOOD should use reserved prefix", () => {
      // Arrange: Reserved IDs should start with underscore to avoid collisions
      const reservedPrefix = "_"

      // Assert
      expect(
        SESSION_IMPORT_FIELD_IDS.POST_SESSION_MOOD.startsWith(reservedPrefix),
        `Reserved field ID should start with "${reservedPrefix}" to avoid collisions with FIELD_LIBRARY`
      ).toBe(true)
    })

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

    test("all SESSION_IMPORT_FIELD_IDS should be unique", () => {
      // Arrange
      const ids = Object.values(SESSION_IMPORT_FIELD_IDS)
      const uniqueIds = new Set(ids)

      // Assert
      expect(uniqueIds.size).toBe(ids.length)
    })
  })
})
