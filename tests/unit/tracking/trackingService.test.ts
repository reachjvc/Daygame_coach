/**
 * Unit tests for trackingService.ts helper functions
 *
 * Tests pure functions: generateSlug, estimateMinutes
 * No mocking - these are deterministic functions (except timestamp suffix)
 */

import { describe, test, expect } from "vitest"
import { generateSlug, estimateMinutes, getConversationText, getConversationAudioUrl } from "@/src/tracking/trackingService"
import type { TemplateField } from "@/src/db/trackingTypes"

// Helper to create minimal TemplateField for testing
function createField(type: TemplateField["type"], id = "test-field"): TemplateField {
  return {
    id,
    type,
    label: "Test Field",
  }
}

describe("generateSlug", () => {
  test("converts name to lowercase kebab-case with timestamp suffix", () => {
    // Arrange
    const name = "My Test Report"

    // Act
    const slug = generateSlug(name)

    // Assert
    expect(slug).toMatch(/^my-test-report-[a-z0-9]+$/)
    expect(slug.startsWith("my-test-report-")).toBe(true)
  })

  test("strips special characters", () => {
    // Arrange
    const name = "Test!@#Report"

    // Act
    const slug = generateSlug(name)

    // Assert - special chars become single dash, result is "test-report-{timestamp}"
    expect(slug).toMatch(/^test-report-[a-z0-9]+$/)
  })

  test("truncates names longer than 50 chars before adding suffix", () => {
    // Arrange
    const longName = "A".repeat(60) + " Report"

    // Act
    const slug = generateSlug(longName)

    // Assert - base should be max 50 chars, plus dash and timestamp
    const [baseSlug] = slug.split(/-(?=[a-z0-9]+$)/) // Split at last dash before timestamp
    expect(baseSlug.length).toBeLessThanOrEqual(50)
  })

  test("handles all-special-character input", () => {
    // Arrange
    const name = "!!!"

    // Act
    const slug = generateSlug(name)

    // Assert - should produce just dash and timestamp (base is empty after stripping)
    expect(slug).toMatch(/^-[a-z0-9]+$/)
  })

  test("handles whitespace-only input", () => {
    // Arrange
    const name = "   "

    // Act
    const slug = generateSlug(name)

    // Assert - whitespace becomes dashes, then stripped, leaving just timestamp
    expect(slug).toMatch(/^-[a-z0-9]+$/)
  })

  test("removes leading and trailing dashes from base slug", () => {
    // Arrange
    const name = "---Test---"

    // Act
    const slug = generateSlug(name)

    // Assert - leading/trailing dashes stripped before timestamp added
    expect(slug).toMatch(/^test-[a-z0-9]+$/)
  })
})

describe("estimateMinutes", () => {
  test("textarea adds 3 minutes", () => {
    // Arrange
    const fields = [createField("textarea")]

    // Act
    const minutes = estimateMinutes(fields)

    // Assert
    expect(minutes).toBe(3)
  })

  test("text field adds 1 minute", () => {
    // Arrange
    const fields = [createField("text")]

    // Act
    const minutes = estimateMinutes(fields)

    // Assert
    expect(minutes).toBe(1)
  })

  test("select field adds 1 minute", () => {
    // Arrange
    const fields = [createField("select")]

    // Act
    const minutes = estimateMinutes(fields)

    // Assert
    expect(minutes).toBe(1)
  })

  test("multiselect field adds 1 minute", () => {
    // Arrange
    const fields = [createField("multiselect")]

    // Act
    const minutes = estimateMinutes(fields)

    // Assert
    expect(minutes).toBe(1)
  })

  test("scale field adds 0.5 minutes (rounds to 1)", () => {
    // Arrange
    const fields = [createField("scale")]

    // Act
    const minutes = estimateMinutes(fields)

    // Assert - 0.5 rounds to 1 (minimum)
    expect(minutes).toBe(1)
  })

  test("number field adds 0.5 minutes (rounds to 1)", () => {
    // Arrange
    const fields = [createField("number")]

    // Act
    const minutes = estimateMinutes(fields)

    // Assert - 0.5 rounds to 1 (minimum)
    expect(minutes).toBe(1)
  })

  test("unknown field types default to 1 minute", () => {
    // Arrange - datetime, list, tags, audio are not explicitly handled
    const fields = [createField("datetime")]

    // Act
    const minutes = estimateMinutes(fields)

    // Assert - falls through to default case
    expect(minutes).toBe(1)
  })

  test("returns minimum of 1 minute for empty array", () => {
    // Arrange
    const fields: TemplateField[] = []

    // Act
    const minutes = estimateMinutes(fields)

    // Assert - Math.max(1, 0) = 1
    expect(minutes).toBe(1)
  })

  test("correctly sums multiple fields", () => {
    // Arrange
    const fields = [
      createField("textarea", "f1"), // 3 min
      createField("text", "f2"), // 1 min
      createField("select", "f3"), // 1 min
      createField("scale", "f4"), // 0.5 min
      createField("number", "f5"), // 0.5 min
    ]

    // Act
    const minutes = estimateMinutes(fields)

    // Assert - 3 + 1 + 1 + 0.5 + 0.5 = 6
    expect(minutes).toBe(6)
  })

  test("rounds to nearest minute", () => {
    // Arrange - 2 scale fields = 1.0 minutes
    const fields = [createField("scale", "f1"), createField("scale", "f2")]

    // Act
    const minutes = estimateMinutes(fields)

    // Assert - 0.5 + 0.5 = 1.0, rounds to 1
    expect(minutes).toBe(1)
  })

  test("rounds up when above 0.5", () => {
    // Arrange - 3 scale fields = 1.5 minutes, rounds to 2
    const fields = [
      createField("scale", "f1"),
      createField("scale", "f2"),
      createField("scale", "f3"),
    ]

    // Act
    const minutes = estimateMinutes(fields)

    // Assert - 0.5 + 0.5 + 0.5 = 1.5, Math.round = 2
    expect(minutes).toBe(2)
  })
})

describe("getConversationText", () => {
  test("returns plain string as-is", () => {
    expect(getConversationText("Hello world")).toBe("Hello world")
  })

  test("extracts text from ConversationFieldValue object", () => {
    const value = { text: "Me: Hi\nHer: Hey", audioUrl: "blob:...", audioFileName: "rec.m4a", transcribedAt: "2026-01-01" }
    expect(getConversationText(value)).toBe("Me: Hi\nHer: Hey")
  })

  test("returns empty string for null", () => {
    expect(getConversationText(null)).toBe("")
  })

  test("returns empty string for undefined", () => {
    expect(getConversationText(undefined)).toBe("")
  })

  test("returns empty string for number", () => {
    expect(getConversationText(42)).toBe("")
  })

  test("returns empty string for object without text property", () => {
    expect(getConversationText({ foo: "bar" })).toBe("")
  })

  test("returns empty string from ConversationFieldValue with empty text", () => {
    const value = { text: "", audioUrl: null, audioFileName: null, transcribedAt: null }
    expect(getConversationText(value)).toBe("")
  })
})

describe("getConversationAudioUrl", () => {
  test("extracts audioUrl from ConversationFieldValue", () => {
    const value = { text: "transcript", audioUrl: "https://example.com/audio.m4a", audioFileName: "audio.m4a", transcribedAt: "2026-01-01" }
    expect(getConversationAudioUrl(value)).toBe("https://example.com/audio.m4a")
  })

  test("returns null when audioUrl is null", () => {
    const value = { text: "transcript", audioUrl: null, audioFileName: null, transcribedAt: null }
    expect(getConversationAudioUrl(value)).toBeNull()
  })

  test("returns null when audioUrl is empty string", () => {
    const value = { text: "transcript", audioUrl: "", audioFileName: null, transcribedAt: null }
    expect(getConversationAudioUrl(value)).toBeNull()
  })

  test("returns null for plain string input", () => {
    expect(getConversationAudioUrl("just text")).toBeNull()
  })

  test("returns null for null input", () => {
    expect(getConversationAudioUrl(null)).toBeNull()
  })

  test("returns null for undefined input", () => {
    expect(getConversationAudioUrl(undefined)).toBeNull()
  })

  test("returns null for object without audioUrl", () => {
    expect(getConversationAudioUrl({ text: "hello" })).toBeNull()
  })
})
