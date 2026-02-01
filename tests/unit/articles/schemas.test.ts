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
    const result = SafeArticleIdSchema.safeParse("01-8020-rule")
    expect(result.success).toBe(true)
  })

  test("accepts valid ID with underscores", () => {
    const result = SafeArticleIdSchema.safeParse("article_draft_v2")
    expect(result.success).toBe(true)
  })

  test("rejects path traversal: ../", () => {
    const result = SafeArticleIdSchema.safeParse("../../../etc/passwd")
    expect(result.success).toBe(false)
  })

  test("rejects path traversal: ..\\", () => {
    const result = SafeArticleIdSchema.safeParse("..\\..\\windows\\system32")
    expect(result.success).toBe(false)
  })

  test("rejects forward slashes", () => {
    const result = SafeArticleIdSchema.safeParse("articles/secret")
    expect(result.success).toBe(false)
  })

  test("rejects backslashes", () => {
    const result = SafeArticleIdSchema.safeParse("articles\\secret")
    expect(result.success).toBe(false)
  })

  test("rejects dots in ID", () => {
    const result = SafeArticleIdSchema.safeParse("article.json")
    expect(result.success).toBe(false)
  })

  test("rejects empty string", () => {
    const result = SafeArticleIdSchema.safeParse("")
    expect(result.success).toBe(false)
  })

  test("rejects ID over 100 characters", () => {
    const result = SafeArticleIdSchema.safeParse("a".repeat(101))
    expect(result.success).toBe(false)
  })

  test("rejects spaces", () => {
    const result = SafeArticleIdSchema.safeParse("article name")
    expect(result.success).toBe(false)
  })
})

describe("FeedbackTypeSchema", () => {
  test("accepts all valid feedback types", () => {
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
    for (const type of validTypes) {
      expect(FeedbackTypeSchema.safeParse(type).success).toBe(true)
    }
  })

  test("rejects invalid feedback type", () => {
    const result = FeedbackTypeSchema.safeParse("invalid")
    expect(result.success).toBe(false)
  })
})

describe("PhaseActionSchema", () => {
  test("accepts all valid phase actions", () => {
    const validActions = ["lock-contract", "lock-outline", "lock-structure", "unlock-structure"]
    for (const action of validActions) {
      expect(PhaseActionSchema.safeParse(action).success).toBe(true)
    }
  })

  test("rejects invalid action", () => {
    const result = PhaseActionSchema.safeParse("delete-article")
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
    const result = ArticleContractSchema.safeParse(validContract)
    expect(result.success).toBe(true)
  })

  test("rejects contract with missing title", () => {
    const { title, ...noTitle } = validContract
    const result = ArticleContractSchema.safeParse(noTitle)
    expect(result.success).toBe(false)
  })

  test("rejects contract with empty thesis", () => {
    const result = ArticleContractSchema.safeParse({ ...validContract, thesis: "" })
    expect(result.success).toBe(false)
  })

  test("rejects contract with too many mustInclude items", () => {
    const result = ArticleContractSchema.safeParse({
      ...validContract,
      mustInclude: Array(21).fill("item"),
    })
    expect(result.success).toBe(false)
  })
})

describe("OutlineSectionSchema", () => {
  test("accepts valid section", () => {
    const result = OutlineSectionSchema.safeParse({
      id: "intro",
      purpose: "Introduce the core concept",
    })
    expect(result.success).toBe(true)
  })

  test("accepts section with notes", () => {
    const result = OutlineSectionSchema.safeParse({
      id: "conclusion",
      purpose: "Summarize key takeaways",
      notes: "Keep it actionable",
    })
    expect(result.success).toBe(true)
  })

  test("rejects section with invalid ID characters", () => {
    const result = OutlineSectionSchema.safeParse({
      id: "section/intro",
      purpose: "Test",
    })
    expect(result.success).toBe(false)
  })

  test("rejects section with empty purpose", () => {
    const result = OutlineSectionSchema.safeParse({
      id: "intro",
      purpose: "",
    })
    expect(result.success).toBe(false)
  })
})

describe("ArticleOutlineSchema", () => {
  test("accepts valid outline", () => {
    const result = ArticleOutlineSchema.safeParse({
      sections: [
        { id: "intro", purpose: "Introduce topic" },
        { id: "body", purpose: "Main content" },
      ],
    })
    expect(result.success).toBe(true)
  })

  test("rejects outline with no sections", () => {
    const result = ArticleOutlineSchema.safeParse({ sections: [] })
    expect(result.success).toBe(false)
  })

  test("rejects outline with too many sections", () => {
    const sections = Array(21)
      .fill(null)
      .map((_, i) => ({ id: `section-${i}`, purpose: "Test" }))
    const result = ArticleOutlineSchema.safeParse({ sections })
    expect(result.success).toBe(false)
  })
})

describe("ArticleFeedbackFlagSchema", () => {
  test("accepts valid flag with quote and note", () => {
    const result = ArticleFeedbackFlagSchema.safeParse({
      type: "excellent",
      sectionId: "intro",
      quote: "This is great",
      note: "Perfect example of the principle",
    })
    expect(result.success).toBe(true)
  })

  test("accepts flag without optional fields", () => {
    const result = ArticleFeedbackFlagSchema.safeParse({
      type: "good",
      sectionId: "body",
    })
    expect(result.success).toBe(true)
  })

  test("rejects flag with invalid type", () => {
    const result = ArticleFeedbackFlagSchema.safeParse({
      type: "amazing",
      sectionId: "intro",
    })
    expect(result.success).toBe(false)
  })

  test("rejects flag with empty sectionId", () => {
    const result = ArticleFeedbackFlagSchema.safeParse({
      type: "good",
      sectionId: "",
    })
    expect(result.success).toBe(false)
  })

  test("rejects flag with quote over 500 chars", () => {
    const result = ArticleFeedbackFlagSchema.safeParse({
      type: "note",
      sectionId: "intro",
      quote: "x".repeat(501),
    })
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
    const result = LearningSuggestionSchema.safeParse(validSuggestion)
    expect(result.success).toBe(true)
  })

  test("rejects suggestion with invalid type", () => {
    const result = LearningSuggestionSchema.safeParse({
      ...validSuggestion,
      type: "neutral",
    })
    expect(result.success).toBe(false)
  })

  test("rejects suggestion with invalid confidence", () => {
    const result = LearningSuggestionSchema.safeParse({
      ...validSuggestion,
      confidence: "very-high",
    })
    expect(result.success).toBe(false)
  })

  test("rejects suggestion with invalid originalFlag", () => {
    const result = LearningSuggestionSchema.safeParse({
      ...validSuggestion,
      originalFlag: { type: "invalid", sectionId: "" },
    })
    expect(result.success).toBe(false)
  })
})

describe("PhaseTransitionRequestSchema", () => {
  test("accepts lock-contract with contract", () => {
    const result = PhaseTransitionRequestSchema.safeParse({
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
    })
    expect(result.success).toBe(true)
  })

  test("rejects lock-contract without contract", () => {
    const result = PhaseTransitionRequestSchema.safeParse({
      articleId: "01-8020-rule",
      action: "lock-contract",
    })
    expect(result.success).toBe(false)
  })

  test("accepts lock-outline with outline", () => {
    const result = PhaseTransitionRequestSchema.safeParse({
      articleId: "01-8020-rule",
      action: "lock-outline",
      outline: {
        sections: [{ id: "intro", purpose: "Introduce topic" }],
      },
    })
    expect(result.success).toBe(true)
  })

  test("rejects lock-outline without outline", () => {
    const result = PhaseTransitionRequestSchema.safeParse({
      articleId: "01-8020-rule",
      action: "lock-outline",
    })
    expect(result.success).toBe(false)
  })

  test("accepts lock-structure without extra data", () => {
    const result = PhaseTransitionRequestSchema.safeParse({
      articleId: "01-8020-rule",
      action: "lock-structure",
    })
    expect(result.success).toBe(true)
  })

  test("rejects path traversal in articleId", () => {
    const result = PhaseTransitionRequestSchema.safeParse({
      articleId: "../secret",
      action: "lock-structure",
    })
    expect(result.success).toBe(false)
  })
})

describe("UnlockStructureRequestSchema", () => {
  test("accepts valid unlock request", () => {
    const result = UnlockStructureRequestSchema.safeParse({
      articleId: "01-8020-rule",
      reason: "Need to add a new section for better flow",
    })
    expect(result.success).toBe(true)
  })

  test("rejects reason under 10 characters", () => {
    const result = UnlockStructureRequestSchema.safeParse({
      articleId: "01-8020-rule",
      reason: "Too short",
    })
    expect(result.success).toBe(false)
  })

  test("rejects reason over 1000 characters", () => {
    const result = UnlockStructureRequestSchema.safeParse({
      articleId: "01-8020-rule",
      reason: "x".repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  test("rejects path traversal in articleId", () => {
    const result = UnlockStructureRequestSchema.safeParse({
      articleId: "../../etc/passwd",
      reason: "This is a valid reason",
    })
    expect(result.success).toBe(false)
  })
})

describe("AnalyzeCommentsRequestSchema", () => {
  test("accepts valid flags array", () => {
    const result = AnalyzeCommentsRequestSchema.safeParse({
      flags: [
        { type: "excellent", sectionId: "intro", note: "Great intro" },
        { type: "note", sectionId: "body", note: "Consider rewording" },
      ],
    })
    expect(result.success).toBe(true)
  })

  test("rejects empty flags array", () => {
    const result = AnalyzeCommentsRequestSchema.safeParse({ flags: [] })
    expect(result.success).toBe(false)
  })

  test("rejects flags with invalid type", () => {
    const result = AnalyzeCommentsRequestSchema.safeParse({
      flags: [{ type: "invalid", sectionId: "intro" }],
    })
    expect(result.success).toBe(false)
  })
})

describe("ApproveLearningsRequestSchema", () => {
  test("accepts valid approved suggestions", () => {
    const result = ApproveLearningsRequestSchema.safeParse({
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
    })
    expect(result.success).toBe(true)
  })

  test("accepts empty approved suggestions (skip all)", () => {
    const result = ApproveLearningsRequestSchema.safeParse({
      approvedSuggestions: [],
    })
    expect(result.success).toBe(true)
  })

  test("rejects malformed suggestion in array", () => {
    const result = ApproveLearningsRequestSchema.safeParse({
      approvedSuggestions: [{ type: "invalid" }],
    })
    expect(result.success).toBe(false)
  })
})
