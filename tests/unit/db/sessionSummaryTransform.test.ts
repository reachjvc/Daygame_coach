import { describe, test, expect } from "vitest"
import {
  transformSessionToSummary,
  type RawSessionWithRelations,
} from "@/src/db/trackingRepo"

// ============================================================================
// transformSessionToSummary
// Tests the pure transformation logic extracted from getSessionSummaries.
// ============================================================================

describe("transformSessionToSummary", () => {
  const baseSession: RawSessionWithRelations = {
    id: "session-123",
    started_at: "2026-01-15T10:00:00Z",
    ended_at: "2026-01-15T11:30:00Z",
    is_active: false,
    duration_minutes: 90,
    goal: 3,
    goal_met: true,
    primary_location: "Downtown",
    end_reason: "goal_met",
    approaches: [],
    milestones: [],
  }

  describe("approach counting", () => {
    test("should count approaches correctly by outcome", () => {
      // Arrange
      const session: RawSessionWithRelations = {
        ...baseSession,
        approaches: [
          { outcome: "blowout" },
          { outcome: "blowout" },
          { outcome: "good" },
          { outcome: "number" },
          { outcome: "instadate" },
        ],
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.total_approaches).toBe(5)
      expect(result.outcomes).toEqual({
        blowout: 2,
        short: 0,
        good: 1,
        number: 1,
        instadate: 1,
      })
    })

    test("should handle null approaches array", () => {
      // Arrange
      const session: RawSessionWithRelations = {
        ...baseSession,
        approaches: null,
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.total_approaches).toBe(0)
      expect(result.outcomes).toEqual({
        blowout: 0,
        short: 0,
        good: 0,
        number: 0,
        instadate: 0,
      })
    })

    test("should ignore approaches with null outcome", () => {
      // Arrange
      const session: RawSessionWithRelations = {
        ...baseSession,
        approaches: [
          { outcome: "good" },
          { outcome: null },
          { outcome: "good" },
        ],
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.total_approaches).toBe(3)
      expect(result.outcomes.good).toBe(2)
    })

    test("should ignore unknown outcome types", () => {
      // Arrange
      const session: RawSessionWithRelations = {
        ...baseSession,
        approaches: [
          { outcome: "good" },
          { outcome: "unknown_outcome" },
          { outcome: "blowout" },
        ],
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.total_approaches).toBe(3)
      expect(result.outcomes.good).toBe(1)
      expect(result.outcomes.blowout).toBe(1)
      // Unknown outcome not counted in any category
    })
  })

  describe("milestone transformation", () => {
    test("should sort achievements by tier (rarest first)", () => {
      // Arrange: Add milestones from different tiers
      const session: RawSessionWithRelations = {
        ...baseSession,
        milestones: [
          { milestone_type: "first_approach" }, // bronze
          { milestone_type: "first_number" }, // silver
          { milestone_type: "ten_sessions" }, // gold
        ],
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert: Should be sorted by tier (rarest first)
      expect(result.achievements).toHaveLength(3)
      // Verify order: gold (rarer) should come before silver, silver before bronze
      const tiers = result.achievements.map(a => a.tier)
      const tierOrder = { diamond: 0, platinum: 1, gold: 2, silver: 3, bronze: 4 }
      for (let i = 1; i < tiers.length; i++) {
        expect(tierOrder[tiers[i]]).toBeGreaterThanOrEqual(tierOrder[tiers[i - 1]])
      }
    })

    test("should handle null milestones array", () => {
      // Arrange
      const session: RawSessionWithRelations = {
        ...baseSession,
        milestones: null,
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.achievements).toEqual([])
    })
  })
})
