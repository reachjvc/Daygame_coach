/**
 * Tests for article API validation schemas.
 * Focus on security (path traversal) and data integrity.
 */

import { describe, expect, test } from "vitest"
import {
  SafeArticleIdSchema,
  FeedbackTypeSchema,
  PhaseActionSchema,
  ArticleContractSchema,
  OutlineSectionSchema,
  ArticleOutlineSchema,
  ArticleFeedbackFlagSchema,
  LearningSuggestionSchema,
  PhaseTransitionRequestSchema,
  UnlockStructureRequestSchema,
  AnalyzeCommentsRequestSchema,
  ApproveLearningsRequestSchema,
} from "@/src/articles/schemas"

describe("SafeArticleIdSchema - Path Traversal Prevention", () => {
  test("accepts valid alphanumeric ID with hyphens", () => {
    // Arrange
    const input = "01-8020-rule"

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("accepts valid ID with underscores", () => {
    // Arrange
    const input = "article_draft_v2"

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("accepts ID at exactly 100 characters (boundary)", () => {
    // Arrange
    const input = "a".repeat(100)

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects path traversal: ../", () => {
    // Arrange
    const input = "../../../etc/passwd"

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects path traversal: ..\\", () => {
    // Arrange
    const input = "..\\..\\windows\\system32"

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects forward slashes", () => {
    // Arrange
    const input = "articles/secret"

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects backslashes", () => {
    // Arrange
    const input = "articles\\secret"

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects dots in ID", () => {
    // Arrange
    const input = "article.json"

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects empty string", () => {
    // Arrange
    const input = ""

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects ID over 100 characters", () => {
    // Arrange
    const input = "a".repeat(101)

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects spaces", () => {
    // Arrange
    const input = "article name"

    // Act
    const result = SafeArticleIdSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("FeedbackTypeSchema", () => {
  test("accepts all valid feedback types", () => {
    // Arrange
    const validTypes = [
      "excellent",
      "good",
      "almost",
      "angle",
      "ai",
      "note",
      "source",
      "alternatives",
      "negative",
    ]

    // Act & Assert
    for (const type of validTypes) {
      expect(FeedbackTypeSchema.safeParse(type).success).toBe(true)
    }
  })

  test("rejects invalid feedback type", () => {
    // Arrange
    const input = "invalid"

    // Act
    const result = FeedbackTypeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("PhaseActionSchema", () => {
  test("accepts all valid phase actions", () => {
    // Arrange
    const validActions = ["lock-contract", "lock-outline", "lock-structure"]

    // Act & Assert
    for (const action of validActions) {
      expect(PhaseActionSchema.safeParse(action).success).toBe(true)
    }
  })

  test("rejects invalid action", () => {
    // Arrange
    const input = "delete-article"

    // Act
    const result = PhaseActionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects unlock-structure (handled by separate route)", () => {
    // Arrange
    const input = "unlock-structure"

    // Act
    const result = PhaseActionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("ArticleContractSchema", () => {
  const validContract = {
    title: "The 80/20 Rule",
    thesis: "Focus on what matters most",
    targetReader: "Beginners wanting to improve efficiency",
    mustInclude: ["Core principle", "Examples"],
    mustNotInclude: ["Advanced techniques"],
    tone: "Conversational but credible",
  }

  test("accepts valid contract", () => {
    // Arrange
    const input = validContract

    // Act
    const result = ArticleContractSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects contract with missing title", () => {
    // Arrange
    const { title, ...noTitle } = validContract

    // Act
    const result = ArticleContractSchema.safeParse(noTitle)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects contract with empty thesis", () => {
    // Arrange
    const input = { ...validContract, thesis: "" }

    // Act
    const result = ArticleContractSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects contract with too many mustInclude items", () => {
    // Arrange
    const input = {
      ...validContract,
      mustInclude: Array(21).fill("item"),
    }

    // Act
    const result = ArticleContractSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("OutlineSectionSchema", () => {
  test("accepts valid section", () => {
    // Arrange
    const input = {
      id: "intro",
      purpose: "Introduce the core concept",
    }

    // Act
    const result = OutlineSectionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("accepts section with notes", () => {
    // Arrange
    const input = {
      id: "conclusion",
      purpose: "Summarize key takeaways",
      notes: "Keep it actionable",
    }

    // Act
    const result = OutlineSectionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects section with invalid ID characters", () => {
    // Arrange
    const input = {
      id: "section/intro",
      purpose: "Test",
    }

    // Act
    const result = OutlineSectionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects section with empty purpose", () => {
    // Arrange
    const input = {
      id: "intro",
      purpose: "",
    }

    // Act
    const result = OutlineSectionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("ArticleOutlineSchema", () => {
  test("accepts valid outline", () => {
    // Arrange
    const input = {
      sections: [
        { id: "intro", purpose: "Introduce topic" },
        { id: "body", purpose: "Main content" },
      ],
    }

    // Act
    const result = ArticleOutlineSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects outline with no sections", () => {
    // Arrange
    const input = { sections: [] }

    // Act
    const result = ArticleOutlineSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects outline with too many sections", () => {
    // Arrange
    const sections = Array(21)
      .fill(null)
      .map((_, i) => ({ id: `section-${i}`, purpose: "Test" }))
    const input = { sections }

    // Act
    const result = ArticleOutlineSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("ArticleFeedbackFlagSchema", () => {
  test("accepts valid flag with quote and note", () => {
    // Arrange
    const input = {
      type: "excellent",
      sectionId: "intro",
      quote: "This is great",
      note: "Perfect example of the principle",
    }

    // Act
    const result = ArticleFeedbackFlagSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("accepts flag without optional fields", () => {
    // Arrange
    const input = {
      type: "good",
      sectionId: "body",
    }

    // Act
    const result = ArticleFeedbackFlagSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects flag with invalid type", () => {
    // Arrange
    const input = {
      type: "amazing",
      sectionId: "intro",
    }

    // Act
    const result = ArticleFeedbackFlagSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects flag with empty sectionId", () => {
    // Arrange
    const input = {
      type: "good",
      sectionId: "",
    }

    // Act
    const result = ArticleFeedbackFlagSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects flag with quote over 500 chars", () => {
    // Arrange
    const input = {
      type: "note",
      sectionId: "intro",
      quote: "x".repeat(501),
    }

    // Act
    const result = ArticleFeedbackFlagSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("LearningSuggestionSchema", () => {
  const validSuggestion = {
    type: "positive",
    originalFlag: {
      type: "excellent",
      sectionId: "intro",
      note: "Great example",
    },
    suggestedText: "Use concrete examples to illustrate abstract concepts",
    targetSection: "What We Know",
    reasoning: "This pattern consistently works well",
    confidence: "high",
  }

  test("accepts valid suggestion", () => {
    // Arrange
    const input = validSuggestion

    // Act
    const result = LearningSuggestionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects suggestion with invalid type", () => {
    // Arrange
    const input = {
      ...validSuggestion,
      type: "neutral",
    }

    // Act
    const result = LearningSuggestionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects suggestion with invalid confidence", () => {
    // Arrange
    const input = {
      ...validSuggestion,
      confidence: "very-high",
    }

    // Act
    const result = LearningSuggestionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects suggestion with invalid originalFlag", () => {
    // Arrange
    const input = {
      ...validSuggestion,
      originalFlag: { type: "invalid", sectionId: "" },
    }

    // Act
    const result = LearningSuggestionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("PhaseTransitionRequestSchema", () => {
  test("accepts lock-contract with contract", () => {
    // Arrange
    const input = {
      articleId: "01-8020-rule",
      action: "lock-contract",
      contract: {
        title: "Test",
        thesis: "Test thesis",
        targetReader: "Test reader",
        mustInclude: [],
        mustNotInclude: [],
        tone: "Test tone",
      },
    }

    // Act
    const result = PhaseTransitionRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects lock-contract without contract", () => {
    // Arrange
    const input = {
      articleId: "01-8020-rule",
      action: "lock-contract",
    }

    // Act
    const result = PhaseTransitionRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("accepts lock-outline with outline", () => {
    // Arrange
    const input = {
      articleId: "01-8020-rule",
      action: "lock-outline",
      outline: {
        sections: [{ id: "intro", purpose: "Introduce topic" }],
      },
    }

    // Act
    const result = PhaseTransitionRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects lock-outline without outline", () => {
    // Arrange
    const input = {
      articleId: "01-8020-rule",
      action: "lock-outline",
    }

    // Act
    const result = PhaseTransitionRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("accepts lock-structure without extra data", () => {
    // Arrange
    const input = {
      articleId: "01-8020-rule",
      action: "lock-structure",
    }

    // Act
    const result = PhaseTransitionRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects path traversal in articleId", () => {
    // Arrange
    const input = {
      articleId: "../secret",
      action: "lock-structure",
    }

    // Act
    const result = PhaseTransitionRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("UnlockStructureRequestSchema", () => {
  test("accepts valid unlock request", () => {
    // Arrange
    const input = {
      articleId: "01-8020-rule",
      reason: "Need to add a new section for better flow",
    }

    // Act
    const result = UnlockStructureRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("accepts reason at exactly 10 characters (boundary)", () => {
    // Arrange
    const input = {
      articleId: "01-8020-rule",
      reason: "1234567890", // exactly 10 chars
    }

    // Act
    const result = UnlockStructureRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects reason under 10 characters", () => {
    // Arrange
    const input = {
      articleId: "01-8020-rule",
      reason: "Too short", // 9 chars
    }

    // Act
    const result = UnlockStructureRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects reason over 1000 characters", () => {
    // Arrange
    const input = {
      articleId: "01-8020-rule",
      reason: "x".repeat(1001),
    }

    // Act
    const result = UnlockStructureRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects path traversal in articleId", () => {
    // Arrange
    const input = {
      articleId: "../../etc/passwd",
      reason: "This is a valid reason",
    }

    // Act
    const result = UnlockStructureRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("AnalyzeCommentsRequestSchema", () => {
  test("accepts valid flags array", () => {
    // Arrange
    const input = {
      flags: [
        { type: "excellent", sectionId: "intro", note: "Great intro" },
        { type: "note", sectionId: "body", note: "Consider rewording" },
      ],
    }

    // Act
    const result = AnalyzeCommentsRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects empty flags array", () => {
    // Arrange
    const input = { flags: [] }

    // Act
    const result = AnalyzeCommentsRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  test("rejects flags with invalid type", () => {
    // Arrange
    const input = {
      flags: [{ type: "invalid", sectionId: "intro" }],
    }

    // Act
    const result = AnalyzeCommentsRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("ApproveLearningsRequestSchema", () => {
  test("accepts valid approved suggestions", () => {
    // Arrange
    const input = {
      approvedSuggestions: [
        {
          type: "positive",
          originalFlag: { type: "excellent", sectionId: "intro", note: "Great" },
          suggestedText: "Use this pattern",
          targetSection: "What We Know",
          reasoning: "It works well",
          confidence: "high",
        },
      ],
    }

    // Act
    const result = ApproveLearningsRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("accepts empty approved suggestions (skip all)", () => {
    // Arrange
    const input = {
      approvedSuggestions: [],
    }

    // Act
    const result = ApproveLearningsRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("rejects malformed suggestion in array", () => {
    // Arrange
    const input = {
      approvedSuggestions: [{ type: "invalid" }],
    }

    // Act
    const result = ApproveLearningsRequestSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})
