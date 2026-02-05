import { describe, test, expect } from "vitest"
import { qaRequestSchema } from "@/src/qa/schemas"
import { VALIDATION_LIMITS } from "@/src/qa/config"

describe("qaRequestSchema", () => {
  describe("question field", () => {
    test("should accept valid question", () => {
      // Arrange
      const input = { question: "How do I approach women?" }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should reject empty question", () => {
      // Arrange
      const input = { question: "" }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Question is required")
      }
    })

    test("should reject missing question", () => {
      // Arrange
      const input = {}

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should accept question at max length boundary", () => {
      // Arrange
      const input = { question: "a".repeat(VALIDATION_LIMITS.maxQuestionChars) }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should reject question exceeding max length", () => {
      // Arrange
      const input = { question: "a".repeat(VALIDATION_LIMITS.maxQuestionChars + 1) }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          `${VALIDATION_LIMITS.maxQuestionChars} characters or less`
        )
      }
    })

    test("should accept question with special characters", () => {
      // Arrange
      const input = { question: "How do I handle <script>alert('xss')</script> situations?" }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept question with unicode characters", () => {
      // Arrange
      const input = { question: "Hvordan griber jeg kvinder an? 🤔" }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept question with newlines", () => {
      // Arrange
      const input = { question: "Question line 1\nQuestion line 2" }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe("retrieval options", () => {
    test("should accept valid retrieval options", () => {
      // Arrange
      const input = {
        question: "Test question",
        retrieval: {
          topK: 5,
          minScore: 0.5,
          maxChunkChars: 5000,
        },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept empty retrieval object", () => {
      // Arrange
      const input = {
        question: "Test question",
        retrieval: {},
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should reject topK below minimum", () => {
      // Arrange
      const input = {
        question: "Test question",
        retrieval: { topK: 0 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject topK above maximum", () => {
      // Arrange
      const input = {
        question: "Test question",
        retrieval: { topK: VALIDATION_LIMITS.maxTopK + 1 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should accept topK at boundary values", () => {
      // Arrange
      const inputMin = { question: "Test", retrieval: { topK: 1 } }
      const inputMax = { question: "Test", retrieval: { topK: VALIDATION_LIMITS.maxTopK } }

      // Act
      const resultMin = qaRequestSchema.safeParse(inputMin)
      const resultMax = qaRequestSchema.safeParse(inputMax)

      // Assert
      expect(resultMin.success).toBe(true)
      expect(resultMax.success).toBe(true)
    })

    test("should reject non-integer topK", () => {
      // Arrange
      const input = {
        question: "Test question",
        retrieval: { topK: 5.5 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject minScore below 0", () => {
      // Arrange
      const input = {
        question: "Test question",
        retrieval: { minScore: -0.1 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject minScore above 1", () => {
      // Arrange
      const input = {
        question: "Test question",
        retrieval: { minScore: 1.1 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should accept minScore at boundary values", () => {
      // Arrange
      const inputMin = { question: "Test", retrieval: { minScore: 0 } }
      const inputMax = { question: "Test", retrieval: { minScore: 1 } }

      // Act
      const resultMin = qaRequestSchema.safeParse(inputMin)
      const resultMax = qaRequestSchema.safeParse(inputMax)

      // Assert
      expect(resultMin.success).toBe(true)
      expect(resultMax.success).toBe(true)
    })

    test("should reject maxChunkChars below 100", () => {
      // Arrange
      const input = {
        question: "Test question",
        retrieval: { maxChunkChars: 99 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject maxChunkChars above 10000", () => {
      // Arrange
      const input = {
        question: "Test question",
        retrieval: { maxChunkChars: 10001 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should accept maxChunkChars at boundary values", () => {
      // Arrange
      const inputMin = { question: "Test", retrieval: { maxChunkChars: 100 } }
      const inputMax = { question: "Test", retrieval: { maxChunkChars: 10000 } }

      // Act
      const resultMin = qaRequestSchema.safeParse(inputMin)
      const resultMax = qaRequestSchema.safeParse(inputMax)

      // Assert
      expect(resultMin.success).toBe(true)
      expect(resultMax.success).toBe(true)
    })
  })

  describe("generation options", () => {
    test("should accept valid generation options", () => {
      // Arrange
      const input = {
        question: "Test question",
        generation: {
          provider: "claude",
          model: "claude-3-5-haiku",
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept empty generation object", () => {
      // Arrange
      const input = {
        question: "Test question",
        generation: {},
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept all valid provider values", () => {
      // Arrange
      const providers = ["ollama", "claude"] as const

      for (const provider of providers) {
        // Act
        const result = qaRequestSchema.safeParse({
          question: "Test",
          generation: { provider },
        })

        // Assert
        expect(result.success).toBe(true)
      }
    })

    test("should reject invalid provider", () => {
      // Arrange
      const input = {
        question: "Test question",
        generation: { provider: "invalid-provider" },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should accept any string for model", () => {
      // Arrange
      const input = {
        question: "Test question",
        generation: { model: "any-model-name" },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should reject maxOutputTokens below 100", () => {
      // Arrange
      const input = {
        question: "Test question",
        generation: { maxOutputTokens: 99 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject maxOutputTokens above maximum", () => {
      // Arrange
      const input = {
        question: "Test question",
        generation: { maxOutputTokens: VALIDATION_LIMITS.maxOutputTokens + 1 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should accept maxOutputTokens at boundary values", () => {
      // Arrange
      const inputMin = { question: "Test", generation: { maxOutputTokens: 100 } }
      const inputMax = {
        question: "Test",
        generation: { maxOutputTokens: VALIDATION_LIMITS.maxOutputTokens },
      }

      // Act
      const resultMin = qaRequestSchema.safeParse(inputMin)
      const resultMax = qaRequestSchema.safeParse(inputMax)

      // Assert
      expect(resultMin.success).toBe(true)
      expect(resultMax.success).toBe(true)
    })

    test("should reject non-integer maxOutputTokens", () => {
      // Arrange
      const input = {
        question: "Test question",
        generation: { maxOutputTokens: 1000.5 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject temperature below 0", () => {
      // Arrange
      const input = {
        question: "Test question",
        generation: { temperature: -0.1 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject temperature above 1", () => {
      // Arrange
      const input = {
        question: "Test question",
        generation: { temperature: 1.1 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should accept temperature at boundary values", () => {
      // Arrange
      const inputMin = { question: "Test", generation: { temperature: 0 } }
      const inputMax = { question: "Test", generation: { temperature: 1 } }

      // Act
      const resultMin = qaRequestSchema.safeParse(inputMin)
      const resultMax = qaRequestSchema.safeParse(inputMax)

      // Assert
      expect(resultMin.success).toBe(true)
      expect(resultMax.success).toBe(true)
    })
  })

  describe("combined options", () => {
    test("should accept full valid request with all options", () => {
      // Arrange
      const input = {
        question: "How do I start a conversation with a stranger?",
        retrieval: {
          topK: 10,
          minScore: 0.6,
          maxChunkChars: 5000,
        },
        generation: {
          provider: "claude" as const,
          model: "claude-3-5-haiku",
          maxOutputTokens: 2000,
          temperature: 0.7,
        },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should work with partial options", () => {
      // Arrange
      const input = {
        question: "Test question",
        retrieval: { topK: 5 },
        generation: { temperature: 0.5 },
      }

      // Act
      const result = qaRequestSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })
})
