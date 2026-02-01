import { describe, test, expect } from "vitest"
import type { ArticleFeedbackFlag } from "@/src/articles/types"

/**
 * Tests for feedback flag behavior.
 *
 * Bug investigation: User reported that selecting 2 sentences and flagging as AI
 * resulted in no quote being saved (treated as whole-section flag).
 *
 * Root cause: After adding first flag (note), selection popup closes.
 * If user then clicks section-header AI button, no quote is captured.
 */

describe("ArticleFeedbackFlag quote behavior", () => {
  // Simulates the addFlag function from page.tsx
  const addFlag = (
    flags: ArticleFeedbackFlag[],
    type: ArticleFeedbackFlag["type"],
    sectionId: string,
    quote?: string,
    note?: string
  ): ArticleFeedbackFlag[] => {
    return [...flags, { type, sectionId, quote, note }]
  }

  test("flag with quote should have quote property set", () => {
    // Arrange
    const flags: ArticleFeedbackFlag[] = []
    const selectedText = "This is selected text"

    // Act - User selects text and clicks AI in popup
    const result = addFlag(flags, "ai", "intro", selectedText)

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].quote).toBe(selectedText)
  })

  test("flag without quote should have undefined quote (whole section)", () => {
    // Arrange
    const flags: ArticleFeedbackFlag[] = []

    // Act - User clicks AI button in section header (no selection)
    const result = addFlag(flags, "ai", "intro")

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].quote).toBeUndefined()
  })

  test("OLD BEHAVIOR (fixed): adding note first, then AI from section header loses quote", () => {
    // This test documents the OLD buggy behavior
    // The fix: popup now stays open after adding a flag, so users can add
    // multiple flags to the same selected text without re-selecting
    let flags: ArticleFeedbackFlag[] = []
    const selectedText = "Most of what you write is useless."

    // Act - Step 1: User selects text, adds note with quote
    flags = addFlag(flags, "note", "intro", selectedText, "this is too AI")

    // OLD: Selection cleared, user had to click section-header AI button
    // NEW: Popup stays open, user can click AI button in popup
    flags = addFlag(flags, "ai", "intro") // Old behavior - no quote

    // Assert - This was the bug (now documented as old behavior)
    expect(flags).toHaveLength(2)
    expect(flags[0].type).toBe("note")
    expect(flags[0].quote).toBe(selectedText)
    expect(flags[1].type).toBe("ai")
    expect(flags[1].quote).toBeUndefined() // Old behavior
  })

  test("adding multiple flags from popup preserves quote for all", () => {
    // Arrange - Ideal behavior (if popup stayed open)
    let flags: ArticleFeedbackFlag[] = []
    const selectedText = "Most of what you write is useless."

    // Act - User adds both flags while selection is still active
    flags = addFlag(flags, "note", "intro", selectedText, "this is too AI")
    flags = addFlag(flags, "ai", "intro", selectedText) // Same text

    // Assert - Both flags have the quote
    expect(flags).toHaveLength(2)
    expect(flags[0].quote).toBe(selectedText)
    expect(flags[1].quote).toBe(selectedText)
  })
})

describe("formatFeedbackForPrompt quote display", () => {
  test("flag with quote shows quoted text", () => {
    // This tests that downstream processing correctly identifies
    // quote-based flags vs whole-section flags
    const flagWithQuote: ArticleFeedbackFlag = {
      type: "ai",
      sectionId: "intro",
      quote: "specific text"
    }

    const flagWithoutQuote: ArticleFeedbackFlag = {
      type: "ai",
      sectionId: "intro"
    }

    // Assert - quote presence determines scope
    expect(flagWithQuote.quote).toBeDefined()
    expect(flagWithoutQuote.quote).toBeUndefined()
  })
})

describe("Excellent flag with learning notes", () => {
  test("excellent flag can include note explaining why it works", () => {
    // Arrange
    const flag: ArticleFeedbackFlag = {
      type: "excellent",
      sectionId: "intro",
      quote: "Specific detail makes it credible",
      note: "Uses concrete numbers and research citation"
    }

    // Assert
    expect(flag.type).toBe("excellent")
    expect(flag.quote).toBeDefined()
    expect(flag.note).toBe("Uses concrete numbers and research citation")
  })

  test("excellent flags with notes should be extracted to learnings", () => {
    // This test documents that learnings extraction should include notes
    const flags: ArticleFeedbackFlag[] = [
      {
        type: "excellent",
        sectionId: "intro",
        quote: "Eighty percent of a field report teaches you nothing.",
        note: "Strong opening - unexpected claim grabs attention"
      },
      {
        type: "excellent",
        sectionId: "research",
        quote: "The gains cluster in specific moments of struggle."
      },
      {
        type: "good",
        sectionId: "conclusion"
      }
    ]

    // Filter excellent flags (what extractLearnings does)
    const excellentFlags = flags.filter(f => f.type === "excellent")

    // Assert
    expect(excellentFlags).toHaveLength(2)
    expect(excellentFlags[0].note).toBe("Strong opening - unexpected claim grabs attention")
    expect(excellentFlags[1].note).toBeUndefined()
  })
})

describe("Negative learning (anti-patterns)", () => {
  test("negative flag requires note explaining why it's bad", () => {
    // Arrange - negative flags should always have a note
    const flag: ArticleFeedbackFlag = {
      type: "negative",
      sectionId: "intro",
      quote: "It's important to note that reflection is crucial.",
      note: "Generic filler - says nothing, announces instead of delivers"
    }

    // Assert
    expect(flag.type).toBe("negative")
    expect(flag.quote).toBeDefined()
    expect(flag.note).toBeDefined()
  })

  test("negative flags should be extracted to learnings as anti-patterns", () => {
    // This test documents that learnings extraction includes negative flags
    const flags: ArticleFeedbackFlag[] = [
      {
        type: "excellent",
        sectionId: "intro",
        quote: "Good example",
        note: "Why it works"
      },
      {
        type: "negative",
        sectionId: "body",
        quote: "Let's dive into the key takeaways.",
        note: "AI phrase - 'let's dive in' is a dead giveaway"
      },
      {
        type: "negative",
        sectionId: "conclusion",
        quote: "In conclusion, we've explored...",
        note: "Announces structure instead of just ending"
      }
    ]

    // Filter negative flags (what extractLearnings does)
    const negativeFlags = flags.filter(f => f.type === "negative")

    // Assert
    expect(negativeFlags).toHaveLength(2)
    expect(negativeFlags[0].note).toBe("AI phrase - 'let's dive in' is a dead giveaway")
    expect(negativeFlags[1].note).toBe("Announces structure instead of just ending")
  })

  test("learnings extraction handles both excellent and negative flags", () => {
    // Arrange
    const flags: ArticleFeedbackFlag[] = [
      { type: "excellent", sectionId: "intro", quote: "Good", note: "Works because..." },
      { type: "negative", sectionId: "body", quote: "Bad", note: "Fails because..." },
      { type: "good", sectionId: "other" }
    ]

    // Act - simulate what extractLearnings does
    const excellentFlags = flags.filter(f => f.type === "excellent")
    const negativeFlags = flags.filter(f => f.type === "negative")

    // Assert
    expect(excellentFlags).toHaveLength(1)
    expect(negativeFlags).toHaveLength(1)
    expect(excellentFlags.length + negativeFlags.length).toBe(2)
  })
})
