/**
 * Unit tests for SessionImportSection helper functions.
 * Tests pure functions extracted for testability.
 */

import { describe, test, expect } from "vitest"
import {
  getMoodEmoji,
  hasSessionContext,
  getDefaultExpanded,
  COLLAPSE_THRESHOLD,
} from "@/src/tracking/sessionImportHelpers"
import type { SessionSummaryData } from "@/src/tracking/types"

// ============================================================================
// getMoodEmoji
// ============================================================================

describe("getMoodEmoji", () => {
  describe("valid mood values", () => {
    test("should return correct emoji for mood 1 (Frustrated)", () => {
      // Act
      const result = getMoodEmoji(1)

      // Assert
      expect(result).toBe("😤")
    })

    test("should return correct emoji for mood 2 (Meh)", () => {
      // Act
      const result = getMoodEmoji(2)

      // Assert
      expect(result).toBe("🙄")
    })

    test("should return correct emoji for mood 3 (Neutral)", () => {
      // Act
      const result = getMoodEmoji(3)

      // Assert
      expect(result).toBe("😐")
    })

    test("should return correct emoji for mood 4 (Good)", () => {
      // Act
      const result = getMoodEmoji(4)

      // Assert
      expect(result).toBe("😊")
    })

    test("should return correct emoji for mood 5 (On fire)", () => {
      // Act
      const result = getMoodEmoji(5)

      // Assert
      expect(result).toBe("🔥")
    })
  })

  describe("null and invalid values", () => {
    test("should return dash for null (no mood selected)", () => {
      // Act
      const result = getMoodEmoji(null)

      // Assert
      expect(result).toBe("-")
    })

    test("should return neutral emoji for mood 0 (out of range)", () => {
      // Act
      const result = getMoodEmoji(0)

      // Assert
      expect(result).toBe("😶")
    })

    test("should return neutral emoji for mood 6 (out of range)", () => {
      // Act
      const result = getMoodEmoji(6)

      // Assert
      expect(result).toBe("😶")
    })

    test("should return neutral emoji for negative value", () => {
      // Act
      const result = getMoodEmoji(-1)

      // Assert
      expect(result).toBe("😶")
    })
  })
})

// ============================================================================
// hasSessionContext
// ============================================================================

describe("hasSessionContext", () => {
  const emptySessionData: SessionSummaryData = {
    approachCount: 0,
    duration: null,
    location: null,
    outcomes: { blowout: 0, short: 0, good: 0, number: 0, instadate: 0 },
    averageMood: null,
    tags: [],
    startedAt: "2024-01-15T14:00:00Z",
    goal: null,
    preSessionMood: null,
    sessionFocus: null,
    techniqueFocus: null,
    ifThenPlan: null,
    customIntention: null,
    approachMoods: [],
    approachNotes: [],
  }

  test("should return false for null sessionData", () => {
    // Act
    const result = hasSessionContext(null)

    // Assert
    expect(result).toBe(false)
  })

  test("should return false for session with all null/empty context fields", () => {
    // Act
    const result = hasSessionContext(emptySessionData)

    // Assert
    expect(result).toBe(false)
  })

  describe("individual context fields", () => {
    test("should return true when goal is set", () => {
      // Arrange
      const session = { ...emptySessionData, goal: 10 }

      // Act
      const result = hasSessionContext(session)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true when preSessionMood is set", () => {
      // Arrange
      const session = { ...emptySessionData, preSessionMood: 4 }

      // Act
      const result = hasSessionContext(session)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true when sessionFocus is set", () => {
      // Arrange
      const session = { ...emptySessionData, sessionFocus: "Be more playful" }

      // Act
      const result = hasSessionContext(session)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true when techniqueFocus is set", () => {
      // Arrange
      const session = { ...emptySessionData, techniqueFocus: "Cold reads" }

      // Act
      const result = hasSessionContext(session)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true when ifThenPlan is set", () => {
      // Arrange
      const session = { ...emptySessionData, ifThenPlan: "If nervous, then breathe" }

      // Act
      const result = hasSessionContext(session)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true when customIntention is set", () => {
      // Arrange
      const session = { ...emptySessionData, customIntention: "Have fun" }

      // Act
      const result = hasSessionContext(session)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true when approachMoods has entries", () => {
      // Arrange
      const session = {
        ...emptySessionData,
        approachMoods: [
          { approachNumber: 1, mood: 3, timestamp: "2024-01-15T14:10:00Z" },
        ],
      }

      // Act
      const result = hasSessionContext(session)

      // Assert
      expect(result).toBe(true)
    })
  })

  describe("edge cases", () => {
    test("should return false for empty string sessionFocus", () => {
      // Arrange
      const session = { ...emptySessionData, sessionFocus: "" }

      // Act
      const result = hasSessionContext(session)

      // Assert
      expect(result).toBe(false)
    })

    test("should return true for goal of 0 (valid goal)", () => {
      // Arrange: Goal of 0 is technically "set" but meaningless
      // However, our logic checks !== null, so 0 counts as set
      const session = { ...emptySessionData, goal: 0 }

      // Act
      const result = hasSessionContext(session)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true when multiple context fields are set", () => {
      // Arrange
      const session = {
        ...emptySessionData,
        goal: 15,
        preSessionMood: 4,
        sessionFocus: "Be confident",
        approachMoods: [
          { approachNumber: 1, mood: 4, timestamp: "2024-01-15T14:10:00Z" },
        ],
      }

      // Act
      const result = hasSessionContext(session)

      // Assert
      expect(result).toBe(true)
    })
  })
})

// ============================================================================
// getDefaultExpanded
// ============================================================================

describe("getDefaultExpanded", () => {
  const baseSessionData: SessionSummaryData = {
    approachCount: 0,
    duration: null,
    location: null,
    outcomes: { blowout: 0, short: 0, good: 0, number: 0, instadate: 0 },
    averageMood: null,
    tags: [],
    startedAt: "2024-01-15T14:00:00Z",
    goal: null,
    preSessionMood: null,
    sessionFocus: null,
    techniqueFocus: null,
    ifThenPlan: null,
    customIntention: null,
    approachMoods: [],
    approachNotes: [],
  }

  test("should return false for null sessionData", () => {
    // Act
    const result = getDefaultExpanded(null)

    // Assert
    expect(result).toBe(false)
  })

  test("should return true when approachCount is 0", () => {
    // Arrange
    const session = { ...baseSessionData, approachCount: 0 }

    // Act
    const result = getDefaultExpanded(session)

    // Assert
    expect(result).toBe(true)
  })

  test("should return true when approachCount equals threshold (5)", () => {
    // Arrange
    const session = { ...baseSessionData, approachCount: COLLAPSE_THRESHOLD }

    // Act
    const result = getDefaultExpanded(session)

    // Assert
    expect(result).toBe(true)
  })

  test("should return false when approachCount exceeds threshold (6)", () => {
    // Arrange
    const session = { ...baseSessionData, approachCount: COLLAPSE_THRESHOLD + 1 }

    // Act
    const result = getDefaultExpanded(session)

    // Assert
    expect(result).toBe(false)
  })

  test("should return false for large approach count (50)", () => {
    // Arrange
    const session = { ...baseSessionData, approachCount: 50 }

    // Act
    const result = getDefaultExpanded(session)

    // Assert
    expect(result).toBe(false)
  })
})

// ============================================================================
// COLLAPSE_THRESHOLD constant
// ============================================================================

describe("COLLAPSE_THRESHOLD", () => {
  test("should be defined as 5", () => {
    // Assert
    expect(COLLAPSE_THRESHOLD).toBe(5)
  })
})
