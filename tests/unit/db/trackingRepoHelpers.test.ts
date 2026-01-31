import { describe, test, expect } from "vitest"
import {
  getISOWeekString,
  areWeeksConsecutive,
  isWeekActive,
} from "@/src/db/trackingRepo"

// ============================================================================
// getISOWeekString
// ============================================================================

describe("getISOWeekString", () => {
  describe("basic week calculation", () => {
    test("should return correct week for January 1, 2026 (Thursday)", () => {
      // Arrange
      const date = new Date("2026-01-01")

      // Act
      const result = getISOWeekString(date)

      // Assert
      expect(result).toBe("2026-W01")
    })

    test("should return correct week for mid-year date", () => {
      // Arrange
      const date = new Date("2026-06-15")

      // Act
      const result = getISOWeekString(date)

      // Assert
      expect(result).toBe("2026-W25")
    })

    test("should return correct week for end of year", () => {
      // Arrange - December 31, 2026 is a Thursday, part of week 53 of 2026
      const date = new Date("2026-12-31")

      // Act
      const result = getISOWeekString(date)

      // Assert - ISO 8601: week containing Dec 31 2026 (Thursday) is W53
      expect(result).toBe("2026-W53")
    })
  })

  describe("year boundary handling", () => {
    test("should handle January 1st that belongs to previous year's week", () => {
      // Arrange - January 1, 2027 is a Friday, part of week 53 of 2026 or week 1 of 2027
      const date = new Date("2027-01-01")

      // Act
      const result = getISOWeekString(date)

      // Assert - ISO 8601 week numbering
      expect(result).toBe("2026-W53")
    })

    test("should handle late December that belongs to same year's final week", () => {
      // Arrange - December 31, 2026 is a Thursday in week 53
      const date = new Date("2026-12-31")

      // Act
      const result = getISOWeekString(date)

      // Assert - Thursday Dec 31 2026 is in week 53 of 2026
      expect(result).toBe("2026-W53")
    })

    test("should handle week 52 correctly", () => {
      // Arrange - December 24, 2026 is a Thursday in week 52
      const date = new Date("2026-12-24")

      // Act
      const result = getISOWeekString(date)

      // Assert
      expect(result).toBe("2026-W52")
    })
  })

  describe("week padding", () => {
    test("should pad single digit weeks with zero", () => {
      // Arrange
      const date = new Date("2026-02-01")

      // Act
      const result = getISOWeekString(date)

      // Assert
      expect(result).toMatch(/^\d{4}-W\d{2}$/)
      expect(result).toBe("2026-W05")
    })

    test("should not pad double digit weeks", () => {
      // Arrange
      const date = new Date("2026-03-15")

      // Act
      const result = getISOWeekString(date)

      // Assert
      expect(result).toBe("2026-W11")
    })
  })

  describe("format consistency", () => {
    test("should always return format YYYY-WXX", () => {
      // Arrange
      const dates = [
        new Date("2026-01-01"),
        new Date("2026-06-15"),
        new Date("2026-12-15"),
      ]

      // Act & Assert
      for (const date of dates) {
        const result = getISOWeekString(date)
        expect(result).toMatch(/^\d{4}-W\d{2}$/)
      }
    })
  })
})

// ============================================================================
// areWeeksConsecutive
// ============================================================================

describe("areWeeksConsecutive", () => {
  describe("consecutive weeks same year", () => {
    test("should return true for weeks 1 and 2", () => {
      // Arrange
      const week1 = "2026-W01"
      const week2 = "2026-W02"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true for weeks 25 and 26", () => {
      // Arrange
      const week1 = "2026-W25"
      const week2 = "2026-W26"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true for weeks 51 and 52", () => {
      // Arrange
      const week1 = "2026-W51"
      const week2 = "2026-W52"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(true)
    })
  })

  describe("non-consecutive weeks same year", () => {
    test("should return false for weeks 1 and 3", () => {
      // Arrange
      const week1 = "2026-W01"
      const week2 = "2026-W03"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(false)
    })

    test("should return false for same week", () => {
      // Arrange
      const week1 = "2026-W05"
      const week2 = "2026-W05"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(false)
    })

    test("should return false for reversed order", () => {
      // Arrange
      const week1 = "2026-W10"
      const week2 = "2026-W09"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe("year boundary handling", () => {
    test("should return true for week 52 to week 1 of next year", () => {
      // Arrange
      const week1 = "2026-W52"
      const week2 = "2027-W01"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true for week 53 to week 1 of next year", () => {
      // Arrange
      const week1 = "2026-W53"
      const week2 = "2027-W01"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(true)
    })

    test("should return false for week 51 to week 1 of next year (gap)", () => {
      // Arrange
      const week1 = "2026-W51"
      const week2 = "2027-W01"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(false)
    })

    test("should return false for different years non-boundary", () => {
      // Arrange
      const week1 = "2026-W30"
      const week2 = "2027-W31"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe("edge cases", () => {
    test("should return false for empty strings", () => {
      // Arrange
      const week1 = ""
      const week2 = ""

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(false)
    })

    test("should return false when first week is empty", () => {
      // Arrange
      const week1 = ""
      const week2 = "2026-W02"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(false)
    })

    test("should return false when second week is empty", () => {
      // Arrange
      const week1 = "2026-W01"
      const week2 = ""

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(false)
    })
  })
})

// ============================================================================
// isWeekActive
// ============================================================================

describe("isWeekActive", () => {
  describe("session-based activation", () => {
    test("should return true for 2 sessions with 0 approaches", () => {
      // Arrange
      const sessions = 2
      const approaches = 0

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true for 3 sessions with 0 approaches", () => {
      // Arrange
      const sessions = 3
      const approaches = 0

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(true)
    })

    test("should return false for 1 session with 0 approaches", () => {
      // Arrange
      const sessions = 1
      const approaches = 0

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe("approach-based activation", () => {
    test("should return true for 5 approaches with 0 sessions", () => {
      // Arrange
      const sessions = 0
      const approaches = 5

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true for 10 approaches with 0 sessions", () => {
      // Arrange
      const sessions = 0
      const approaches = 10

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(true)
    })

    test("should return false for 4 approaches with 0 sessions", () => {
      // Arrange
      const sessions = 0
      const approaches = 4

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe("combined criteria", () => {
    test("should return true when both criteria met", () => {
      // Arrange
      const sessions = 3
      const approaches = 10

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true when only session criteria met", () => {
      // Arrange
      const sessions = 2
      const approaches = 3

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true when only approach criteria met", () => {
      // Arrange
      const sessions = 1
      const approaches = 5

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(true)
    })

    test("should return false when neither criteria met", () => {
      // Arrange
      const sessions = 1
      const approaches = 4

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe("boundary values", () => {
    test("should return false for 0 sessions and 0 approaches", () => {
      // Arrange
      const sessions = 0
      const approaches = 0

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(false)
    })

    test("should return true for exactly 2 sessions (minimum)", () => {
      // Arrange
      const sessions = 2
      const approaches = 0

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true for exactly 5 approaches (minimum)", () => {
      // Arrange
      const sessions = 0
      const approaches = 5

      // Act
      const result = isWeekActive(sessions, approaches)

      // Assert
      expect(result).toBe(true)
    })
  })
})
