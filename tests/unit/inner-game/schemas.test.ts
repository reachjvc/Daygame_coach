import { describe, test, expect } from "vitest"
import { updateProgressSchema, inferValuesSchema } from "@/src/inner-game/schemas"

describe("updateProgressSchema", () => {
  describe("currentSubstep field", () => {
    test("should accept valid substep values 0-10", () => {
      // Arrange - 11 categories (indices 0-10)
      for (let i = 0; i <= 10; i++) {
        // Act
        const result = updateProgressSchema.safeParse({ currentSubstep: i })

        // Assert
        expect(result.success).toBe(true)
      }
    })

    test("should reject substep below 0", () => {
      // Arrange
      const input = { currentSubstep: -1 }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject substep above 10", () => {
      // Arrange - 11 categories (0-10), so 11 should be invalid
      const input = { currentSubstep: 11 }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject non-integer substep", () => {
      // Arrange
      const input = { currentSubstep: 2.5 }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })
})

describe("inferValuesSchema", () => {
  describe("response field", () => {
    test("should reject response shorter than 10 characters", () => {
      // Arrange
      const input = {
        context: "shadow" as const,
        response: "Too short",
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe("Please provide a more detailed response")
    })

    test("should accept response at minimum length (10 chars)", () => {
      // Arrange
      const input = {
        context: "shadow" as const,
        response: "1234567890",
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should reject response longer than 5000 characters", () => {
      // Arrange
      const input = {
        context: "shadow" as const,
        response: "a".repeat(5001),
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should accept response at maximum length (5000 chars)", () => {
      // Arrange
      const input = {
        context: "shadow" as const,
        response: "a".repeat(5000),
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })
})
