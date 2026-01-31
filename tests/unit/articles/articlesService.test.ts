import { describe, test, expect } from "vitest"
import {
  buildSystemPrompt,
  buildUserPrompt,
  formatFeedbackForPrompt,
  buildRevisionSystemPrompt,
  PILLAR_TONE_GUIDANCE,
} from "@/src/articles/articlesService"
import type {
  ContentUnit,
  ArticlePillar,
  GenerateAlternativesRequest,
  ArticleSection,
  ArticleFeedbackFlag,
} from "@/src/articles/types"

// ============================================================================
// PILLAR_TONE_GUIDANCE
// ============================================================================

describe("PILLAR_TONE_GUIDANCE", () => {
  const pillars: ArticlePillar[] = ["learning", "inner-game", "action", "tactics"]

  test.each(pillars)('should have guidance for pillar "%s"', (pillar) => {
    // Arrange & Act
    const guidance = PILLAR_TONE_GUIDANCE[pillar]

    // Assert
    expect(guidance).toBeDefined()
    expect(typeof guidance).toBe("string")
    expect(guidance.length).toBeGreaterThan(10)
  })

  test("should have exactly 4 pillar entries", () => {
    // Arrange & Act
    const pillars = Object.keys(PILLAR_TONE_GUIDANCE)

    // Assert
    expect(pillars).toHaveLength(4)
  })
})

// ============================================================================
// buildSystemPrompt
// ============================================================================

describe("buildSystemPrompt", () => {
  const units: ContentUnit[] = ["sentence", "paragraph", "section"]

  describe("without pillar", () => {
    test.each(units)('should build prompt for unit "%s"', (unit) => {
      // Arrange & Act
      const prompt = buildSystemPrompt(unit)

      // Assert
      expect(prompt).toContain("expert content writer")
      expect(prompt).toContain("3 alternative")
      expect(prompt).toContain("clear, engaging style")
    })

    test("should include rhetorical strategies for sentence", () => {
      // Arrange & Act
      const prompt = buildSystemPrompt("sentence")

      // Assert
      expect(prompt).toContain("Research claim")
      expect(prompt).toContain("Domain analogy")
      expect(prompt).toContain("Concrete scene")
    })

    test("should include output format requirements", () => {
      // Arrange & Act
      const prompt = buildSystemPrompt("paragraph")

      // Assert
      expect(prompt).toContain('"content"')
      expect(prompt).toContain('"approach"')
      expect(prompt).toContain('"rationale"')
    })

    test("should include writing rules", () => {
      // Arrange & Act
      const prompt = buildSystemPrompt("section")

      // Assert
      expect(prompt).toContain("NEVER write in first person")
      expect(prompt).toContain("scientific third person")
      expect(prompt).toContain("No filler, no fluff")
    })
  })

  describe("with pillar", () => {
    test("should include learning pillar tone guidance", () => {
      // Arrange & Act
      const prompt = buildSystemPrompt("paragraph", "learning")

      // Assert
      expect(prompt).toContain("educational")
      expect(prompt).toContain("research-backed")
    })

    test("should include inner-game pillar tone guidance", () => {
      // Arrange & Act
      const prompt = buildSystemPrompt("paragraph", "inner-game")

      // Assert
      expect(prompt).toContain("depth and authenticity")
      expect(prompt).toContain("philosophical insight")
    })

    test("should include action pillar tone guidance", () => {
      // Arrange & Act
      const prompt = buildSystemPrompt("paragraph", "action")

      // Assert
      expect(prompt).toContain("energy and directness")
      expect(prompt).toContain("real-world applicability")
    })

    test("should include tactics pillar tone guidance", () => {
      // Arrange & Act
      const prompt = buildSystemPrompt("paragraph", "tactics")

      // Assert
      expect(prompt).toContain("precision and expertise")
      expect(prompt).toContain("techniques")
    })
  })
})

// ============================================================================
// buildUserPrompt
// ============================================================================

describe("buildUserPrompt", () => {
  test("should build prompt with minimal request", () => {
    // Arrange
    const request: GenerateAlternativesRequest = {
      originalContent: "Test content",
      unit: "sentence",
    }

    // Act
    const prompt = buildUserPrompt(request)

    // Assert
    expect(prompt).toContain("Original sentence:")
    expect(prompt).toContain("Test content")
  })

  test("should build prompt with paragraph unit", () => {
    // Arrange
    const request: GenerateAlternativesRequest = {
      originalContent: "This is a paragraph.",
      unit: "paragraph",
    }

    // Act
    const prompt = buildUserPrompt(request)

    // Assert
    expect(prompt).toContain("Original paragraph:")
  })

  test("should build prompt with section unit", () => {
    // Arrange
    const request: GenerateAlternativesRequest = {
      originalContent: "This is a section.",
      unit: "section",
    }

    // Act
    const prompt = buildUserPrompt(request)

    // Assert
    expect(prompt).toContain("Original section:")
  })

  test("should include article title context", () => {
    // Arrange
    const request: GenerateAlternativesRequest = {
      originalContent: "Test content",
      unit: "sentence",
      context: {
        articleTitle: "My Amazing Article",
      },
    }

    // Act
    const prompt = buildUserPrompt(request)

    // Assert
    expect(prompt).toContain("Context:")
    expect(prompt).toContain('Article title: "My Amazing Article"')
  })

  test("should include before context", () => {
    // Arrange
    const request: GenerateAlternativesRequest = {
      originalContent: "Test content",
      unit: "sentence",
      context: {
        before: "Previous content here",
      },
    }

    // Act
    const prompt = buildUserPrompt(request)

    // Assert
    expect(prompt).toContain("Content before:")
    expect(prompt).toContain("Previous content here")
  })

  test("should include after context", () => {
    // Arrange
    const request: GenerateAlternativesRequest = {
      originalContent: "Test content",
      unit: "sentence",
      context: {
        after: "Following content here",
      },
    }

    // Act
    const prompt = buildUserPrompt(request)

    // Assert
    expect(prompt).toContain("Content after:")
    expect(prompt).toContain("Following content here")
  })

  test("should include all context elements together", () => {
    // Arrange
    const request: GenerateAlternativesRequest = {
      originalContent: "Main content",
      unit: "paragraph",
      context: {
        articleTitle: "Test Article",
        before: "Before text",
        after: "After text",
        pillar: "learning",
      },
    }

    // Act
    const prompt = buildUserPrompt(request)

    // Assert
    expect(prompt).toContain("Context:")
    expect(prompt).toContain('Article title: "Test Article"')
    expect(prompt).toContain("Content before:")
    expect(prompt).toContain("Content after:")
    expect(prompt).toContain("Original paragraph:")
  })

  test("should not include context section when context is empty object", () => {
    // Arrange
    const request: GenerateAlternativesRequest = {
      originalContent: "Test content",
      unit: "sentence",
      context: {},
    }

    // Act
    const prompt = buildUserPrompt(request)

    // Assert
    expect(prompt).not.toContain("Context:")
    expect(prompt).toContain("Original sentence:")
  })
})

// ============================================================================
// formatFeedbackForPrompt
// ============================================================================

describe("formatFeedbackForPrompt", () => {
  test("should format section without feedback", () => {
    // Arrange
    const sections: ArticleSection[] = [{ id: "intro", content: "Introduction text" }]
    const feedback: ArticleFeedbackFlag[] = []

    // Act
    const result = formatFeedbackForPrompt(sections, feedback)

    // Assert
    expect(result).toContain("### Section: intro")
    expect(result).toContain("Introduction text")
    expect(result).toContain("**Feedback:** None (keep as-is)")
  })

  test("should format section with feedback", () => {
    // Arrange
    const sections: ArticleSection[] = [{ id: "intro", content: "Introduction text" }]
    const feedback: ArticleFeedbackFlag[] = [
      { type: "good", sectionId: "intro" },
    ]

    // Act
    const result = formatFeedbackForPrompt(sections, feedback)

    // Assert
    expect(result).toContain("### Section: intro")
    expect(result).toContain("**Feedback:**")
    expect(result).toContain("**GOOD**")
    expect(result).toContain("(whole section)")
  })

  test("should format feedback with quote", () => {
    // Arrange
    const sections: ArticleSection[] = [{ id: "body", content: "Body content" }]
    const feedback: ArticleFeedbackFlag[] = [
      { type: "ai", sectionId: "body", quote: "It's important to note that" },
    ]

    // Act
    const result = formatFeedbackForPrompt(sections, feedback)

    // Assert
    expect(result).toContain("**AI**")
    expect(result).toContain('on: "It\'s important to note that"')
  })

  test("should truncate long quotes to 100 chars", () => {
    // Arrange
    const sections: ArticleSection[] = [{ id: "body", content: "Body content" }]
    const longQuote = "a".repeat(150)
    const feedback: ArticleFeedbackFlag[] = [
      { type: "almost", sectionId: "body", quote: longQuote },
    ]

    // Act
    const result = formatFeedbackForPrompt(sections, feedback)

    // Assert
    expect(result).toContain("...")
    expect(result).not.toContain("a".repeat(150))
  })

  test("should include note in feedback", () => {
    // Arrange
    const sections: ArticleSection[] = [{ id: "intro", content: "Introduction" }]
    const feedback: ArticleFeedbackFlag[] = [
      { type: "note", sectionId: "intro", note: "Make this more engaging" },
    ]

    // Act
    const result = formatFeedbackForPrompt(sections, feedback)

    // Assert
    expect(result).toContain("**NOTE**")
    expect(result).toContain("Comment: Make this more engaging")
  })

  test("should format multiple sections", () => {
    // Arrange
    const sections: ArticleSection[] = [
      { id: "intro", content: "Introduction" },
      { id: "body", content: "Body content" },
      { id: "conclusion", content: "Conclusion" },
    ]
    const feedback: ArticleFeedbackFlag[] = [
      { type: "excellent", sectionId: "intro" },
      { type: "angle", sectionId: "body" },
    ]

    // Act
    const result = formatFeedbackForPrompt(sections, feedback)

    // Assert
    expect(result).toContain("### Section: intro")
    expect(result).toContain("### Section: body")
    expect(result).toContain("### Section: conclusion")
    expect(result).toContain("**EXCELLENT**")
    expect(result).toContain("**ANGLE**")
    expect(result).toContain("---")
  })

  test("should handle multiple feedback flags on same section", () => {
    // Arrange
    const sections: ArticleSection[] = [{ id: "body", content: "Body content" }]
    const feedback: ArticleFeedbackFlag[] = [
      { type: "ai", sectionId: "body", quote: "first issue" },
      { type: "note", sectionId: "body", note: "also fix this" },
    ]

    // Act
    const result = formatFeedbackForPrompt(sections, feedback)

    // Assert
    expect(result).toContain("**AI**")
    expect(result).toContain("**NOTE**")
    expect(result).toContain("first issue")
    expect(result).toContain("also fix this")
  })
})

// ============================================================================
// buildRevisionSystemPrompt
// ============================================================================

describe("buildRevisionSystemPrompt", () => {
  test("should build prompt without style guide", () => {
    // Arrange & Act
    const prompt = buildRevisionSystemPrompt()

    // Assert
    expect(prompt).toContain("expert editor")
    expect(prompt).toContain("FEEDBACK TYPE MEANINGS")
    expect(prompt).toContain("REVISION RULES")
    expect(prompt).toContain("QUALITY STANDARDS")
  })

  test("should include all feedback type explanations", () => {
    // Arrange & Act
    const prompt = buildRevisionSystemPrompt()

    // Assert
    expect(prompt).toContain("EXCELLENT")
    expect(prompt).toContain("GOOD")
    expect(prompt).toContain("ALMOST")
    expect(prompt).toContain("ANGLE")
    expect(prompt).toContain("AI")
    expect(prompt).toContain("NOTE")
  })

  test("should include quality standards", () => {
    // Arrange & Act
    const prompt = buildRevisionSystemPrompt()

    // Assert
    expect(prompt).toContain("writing must be ALIVE")
    expect(prompt).toContain("AI-isms")
    expect(prompt).toContain("surprising claims")
    expect(prompt).toContain("Vary sentence structure")
  })

  test("should include style guide when provided", () => {
    // Arrange
    const styleGuide = "Write in active voice. Use short sentences."

    // Act
    const prompt = buildRevisionSystemPrompt(styleGuide)

    // Assert
    expect(prompt).toContain("STYLE GUIDE:")
    expect(prompt).toContain("Write in active voice. Use short sentences.")
  })

  test("should not include style guide section when not provided", () => {
    // Arrange & Act
    const prompt = buildRevisionSystemPrompt()

    // Assert
    expect(prompt).not.toContain("STYLE GUIDE:")
  })

  test("should not include style guide section when empty string", () => {
    // Arrange & Act
    const prompt = buildRevisionSystemPrompt("")

    // Assert
    expect(prompt).not.toContain("STYLE GUIDE:")
  })
})
