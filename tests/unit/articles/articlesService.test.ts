import { describe, test, expect } from "vitest"
import {
  formatFeedbackForPrompt,
  buildRevisionSystemPrompt,
  PILLAR_TONE_GUIDANCE,
  insertLearningIntoStyleGuide,
  updateStyleGuideChangelog,
} from "@/src/articles/articlesService"
import type {
  ArticlePillar,
  ArticleSection,
  ArticleFeedbackFlag,
  LearningSuggestion,
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

// ============================================================================
// insertLearningIntoStyleGuide
// ============================================================================

describe("insertLearningIntoStyleGuide", () => {
  const createSuggestion = (
    type: "positive" | "anti-pattern",
    targetSection: string,
    suggestedText: string
  ): LearningSuggestion => ({
    type,
    targetSection,
    suggestedText,
    reasoning: "Test reasoning",
    confidence: "high",
    originalFlag: {
      type: "excellent",
      sectionId: "test",
      note: "Test note"
    }
  })

  test("should insert positive learning into What We Know section", () => {
    // Arrange
    const styleGuide = `# Writing Style Guide

## Changelog
- 01-02-2026 - Test entry

## What We Know

Existing content here.

## Anti-patterns

Other content.`
    const suggestion = createSuggestion("positive", "What We Know", "New learning about specificity.")

    // Act
    const result = insertLearningIntoStyleGuide(styleGuide, suggestion)

    // Assert
    expect(result).toContain("Existing content here.")
    expect(result).toContain("New learning about specificity.")
    // The new learning should come after "What We Know" but before "Anti-patterns"
    const whatWeKnowPos = result.indexOf("## What We Know")
    const newLearningPos = result.indexOf("New learning about specificity.")
    const antiPatternsPos = result.indexOf("## Anti-patterns")
    expect(newLearningPos).toBeGreaterThan(whatWeKnowPos)
    expect(newLearningPos).toBeLessThan(antiPatternsPos)
  })

  test("should insert anti-pattern into Anti-patterns section", () => {
    // Arrange
    const styleGuide = `# Writing Style Guide

## What We Know

Some content.

## Anti-patterns

Existing anti-patterns.

## Still Testing`
    const suggestion = createSuggestion("anti-pattern", "Anti-patterns", "Avoid 'Let's dive in'.")

    // Act
    const result = insertLearningIntoStyleGuide(styleGuide, suggestion)

    // Assert
    expect(result).toContain("Existing anti-patterns.")
    expect(result).toContain("Avoid 'Let's dive in'.")
    // Should be in Anti-patterns section
    const antiPatternsPos = result.indexOf("## Anti-patterns")
    const newLearningPos = result.indexOf("Avoid 'Let's dive in'.")
    const stillTestingPos = result.indexOf("## Still Testing")
    expect(newLearningPos).toBeGreaterThan(antiPatternsPos)
    expect(newLearningPos).toBeLessThan(stillTestingPos)
  })

  test("should append to end if target section not found", () => {
    // Arrange
    const styleGuide = `# Writing Style Guide

## What We Know

Some content.`
    const suggestion = createSuggestion("positive", "Nonexistent Section", "New content.")

    // Act
    const result = insertLearningIntoStyleGuide(styleGuide, suggestion)

    // Assert
    expect(result).toContain("## Nonexistent Section")
    expect(result).toContain("New content.")
    // Should be at the end
    expect(result.endsWith("New content.\n")).toBe(true)
  })

  test("should preserve existing content when inserting", () => {
    // Arrange
    const styleGuide = `## What We Know

Point 1.

Point 2.

## Other`
    const suggestion = createSuggestion("positive", "What We Know", "Point 3.")

    // Act
    const result = insertLearningIntoStyleGuide(styleGuide, suggestion)

    // Assert
    expect(result).toContain("Point 1.")
    expect(result).toContain("Point 2.")
    expect(result).toContain("Point 3.")
    expect(result).toContain("## Other")
  })
})

// ============================================================================
// updateStyleGuideChangelog
// ============================================================================

describe("updateStyleGuideChangelog", () => {
  test("should add changelog entry at the top of the changelog", () => {
    // Arrange
    const styleGuide = `# Writing Style Guide

## Changelog
- 31-01-2026 - Previous entry

## Content`
    const change = "Added new learning"

    // Act
    const result = updateStyleGuideChangelog(styleGuide, change)

    // Assert
    expect(result).toContain("Added new learning")
    // New entry should come before the old one
    const newEntryPos = result.indexOf("Added new learning")
    const oldEntryPos = result.indexOf("Previous entry")
    expect(newEntryPos).toBeLessThan(oldEntryPos)
  })

  test("should return unchanged if no changelog section", () => {
    // Arrange
    const styleGuide = `# Writing Style Guide

## Content

No changelog here.`
    const change = "Test change"

    // Act
    const result = updateStyleGuideChangelog(styleGuide, change)

    // Assert
    expect(result).toBe(styleGuide)
  })

  test("should format date in Danish format", () => {
    // Arrange
    const styleGuide = `## Changelog
- Old entry`
    const change = "Test"

    // Act
    const result = updateStyleGuideChangelog(styleGuide, change)

    // Assert - should contain a date pattern like DD-MM-YYYY
    expect(result).toMatch(/\d{2}-\d{2}-\d{4}/)
  })
})
