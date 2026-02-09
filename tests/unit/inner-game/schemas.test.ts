import { describe, test, expect } from "vitest"
import { updateProgressSchema, inferValuesSchema } from "@/src/inner-game/schemas"
import { InnerGameStep } from "@/src/inner-game/types"

describe("updateProgressSchema", () => {
  describe("currentStep field", () => {
    test("should accept valid InnerGameStep values", () => {
      // Arrange
      const validSteps = [
        InnerGameStep.WELCOME,
        InnerGameStep.VALUES,
        InnerGameStep.SHADOW,
        InnerGameStep.PEAK_EXPERIENCE,
        InnerGameStep.HURDLES,
        InnerGameStep.CUTTING,
        InnerGameStep.COMPLETE,
      ]

      for (const step of validSteps) {
        // Act
        const result = updateProgressSchema.safeParse({ currentStep: step })

        // Assert
        expect(result.success).toBe(true)
      }
    })

    test("should reject invalid step number", () => {
      // Arrange
      const input = { currentStep: 99 }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject negative step number", () => {
      // Arrange
      const input = { currentStep: -1 }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should accept empty object (all fields optional)", () => {
      // Arrange
      const input = {}

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })

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

    test("should accept substep 10 (11th category)", () => {
      // Arrange - 11 categories exist, index 10 is valid
      const input = { currentSubstep: 10 }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
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

  describe("boolean fields", () => {
    test("should accept welcomeDismissed boolean", () => {
      // Arrange
      const inputTrue = { welcomeDismissed: true }
      const inputFalse = { welcomeDismissed: false }

      // Act
      const resultTrue = updateProgressSchema.safeParse(inputTrue)
      const resultFalse = updateProgressSchema.safeParse(inputFalse)

      // Assert
      expect(resultTrue.success).toBe(true)
      expect(resultFalse.success).toBe(true)
    })

    test("should accept step completion booleans", () => {
      // Arrange
      const input = {
        step1Completed: true,
        step2Completed: false,
        step3Completed: true,
        cuttingCompleted: false,
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should reject non-boolean for boolean fields", () => {
      // Arrange
      const input = { welcomeDismissed: "true" }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })

  describe("hurdlesResponse field", () => {
    test("should accept valid string response", () => {
      // Arrange
      const input = { hurdlesResponse: "My biggest hurdle is approaching anxiety." }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept empty string", () => {
      // Arrange
      const input = { hurdlesResponse: "" }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept long response", () => {
      // Arrange
      const input = { hurdlesResponse: "a".repeat(10000) }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe("hurdlesInferredValues field", () => {
    test("should accept valid inferred values array", () => {
      // Arrange
      const input = {
        hurdlesInferredValues: [
          { id: "courage", reason: "Facing fears" },
          { id: "growth", reason: "Learning from mistakes" },
        ],
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept empty inferred values array", () => {
      // Arrange
      const input = { hurdlesInferredValues: [] }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should reject inferred value without id", () => {
      // Arrange
      const input = {
        hurdlesInferredValues: [{ reason: "Missing id field" }],
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject inferred value without reason", () => {
      // Arrange
      const input = {
        hurdlesInferredValues: [{ id: "courage" }],
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })

  describe("deathbedResponse field (legacy)", () => {
    test("should accept valid deathbed response", () => {
      // Arrange
      const input = { deathbedResponse: "I want to be remembered for my courage." }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept deathbedInferredValues", () => {
      // Arrange
      const input = {
        deathbedInferredValues: [
          { id: "legacy", reason: "Wanting to leave a mark" },
        ],
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe("finalCoreValues field", () => {
    test("should accept valid core values with rank", () => {
      // Arrange
      const input = {
        finalCoreValues: [
          { id: "courage", rank: 1 },
          { id: "authenticity", rank: 2 },
          { id: "growth", rank: 3 },
        ],
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept empty core values array", () => {
      // Arrange
      const input = { finalCoreValues: [] }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should reject core value without id", () => {
      // Arrange
      const input = {
        finalCoreValues: [{ rank: 1 }],
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject core value without rank", () => {
      // Arrange
      const input = {
        finalCoreValues: [{ id: "courage" }],
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })

  describe("aspirationalValues field", () => {
    test("should accept valid aspirational values", () => {
      // Arrange
      const input = {
        aspirationalValues: [{ id: "courage" }, { id: "wisdom" }],
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept empty aspirational values array", () => {
      // Arrange
      const input = { aspirationalValues: [] }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should reject aspirational value without id", () => {
      // Arrange
      const input = {
        aspirationalValues: [{}],
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })

  describe("combined fields", () => {
    test("should accept full valid progress update", () => {
      // Arrange
      const input = {
        currentStep: InnerGameStep.HURDLES,
        currentSubstep: 5,
        welcomeDismissed: true,
        step1Completed: true,
        step2Completed: true,
        step3Completed: false,
        cuttingCompleted: false,
        hurdlesResponse: "Working through my anxiety.",
        hurdlesInferredValues: [
          { id: "courage", reason: "Facing fears" },
        ],
        finalCoreValues: [
          { id: "authenticity", rank: 1 },
        ],
        aspirationalValues: [
          { id: "wisdom" },
        ],
      }

      // Act
      const result = updateProgressSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })
})

describe("inferValuesSchema", () => {
  describe("context field", () => {
    test("should accept valid context values", () => {
      // Arrange
      const validContexts = ["shadow", "peak_experience", "hurdles"] as const

      for (const context of validContexts) {
        // Act
        const result = inferValuesSchema.safeParse({
          context,
          response: "This is a valid response text.",
        })

        // Assert
        expect(result.success).toBe(true)
      }
    })

    test("should reject invalid context", () => {
      // Arrange
      const input = {
        context: "invalid_context",
        response: "Valid response text here.",
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject missing context", () => {
      // Arrange
      const input = {
        response: "Valid response text here.",
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })

  describe("response field", () => {
    test("should accept valid response", () => {
      // Arrange
      const input = {
        context: "shadow" as const,
        response: "My shadow side is my fear of rejection.",
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

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
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Please provide a more detailed response"
        )
      }
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

    test("should reject missing response", () => {
      // Arrange
      const input = {
        context: "shadow" as const,
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should accept response with unicode characters", () => {
      // Arrange
      const input = {
        context: "peak_experience" as const,
        response: "Min bedste oplevelse var da jeg overvandt min frygt 🎯",
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept response with newlines", () => {
      // Arrange
      const input = {
        context: "hurdles" as const,
        response: "First hurdle\n\nSecond hurdle\n\nThird hurdle",
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept response with special characters", () => {
      // Arrange
      const input = {
        context: "shadow" as const,
        response: "My shadow: <fear>, [anxiety] & 'doubt'",
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe("edge cases", () => {
    test("should reject empty object", () => {
      // Arrange
      const input = {}

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject null", () => {
      // Arrange
      const input = null

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject undefined", () => {
      // Arrange
      const input = undefined

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should strip extra fields", () => {
      // Arrange
      const input = {
        context: "shadow" as const,
        response: "Valid response here",
        extraField: "should be stripped",
      }

      // Act
      const result = inferValuesSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty("extraField")
      }
    })
  })
})
