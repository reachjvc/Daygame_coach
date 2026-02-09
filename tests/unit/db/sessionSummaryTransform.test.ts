import { describe, test, expect } from "vitest"
import {
  transformSessionToSummary,
  type RawSessionWithRelations,
} from "@/src/db/trackingRepo"

// ============================================================================
// transformSessionToSummary
// Tests the pure transformation logic extracted from getSessionSummaries.
// This validates the N+1 fix by testing the single-query result transformation.
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

  describe("basic transformation", () => {
    test("should transform session with all fields", () => {
      // Arrange
      const session: RawSessionWithRelations = { ...baseSession }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.id).toBe("session-123")
      expect(result.started_at).toBe("2026-01-15T10:00:00Z")
      expect(result.ended_at).toBe("2026-01-15T11:30:00Z")
      expect(result.is_active).toBe(false)
      expect(result.duration_minutes).toBe(90)
      expect(result.goal).toBe(3)
      expect(result.goal_met).toBe(true)
      expect(result.primary_location).toBe("Downtown")
      expect(result.end_reason).toBe("goal_met")
    })

    test("should handle null fields", () => {
      // Arrange
      const session: RawSessionWithRelations = {
        ...baseSession,
        ended_at: null,
        duration_minutes: null,
        goal: null,
        goal_met: false,
        end_reason: null,
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.ended_at).toBeNull()
      expect(result.duration_minutes).toBeNull()
      expect(result.goal).toBeNull()
      expect(result.goal_met).toBe(false)
      expect(result.end_reason).toBeNull()
    })
  })

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

    test("should handle empty approaches array", () => {
      // Arrange
      const session: RawSessionWithRelations = {
        ...baseSession,
        approaches: [],
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.total_approaches).toBe(0)
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
    test("should transform milestones to achievements with full info", () => {
      // Arrange
      const session: RawSessionWithRelations = {
        ...baseSession,
        milestones: [
          { milestone_type: "first_approach" },
        ],
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.achievements).toHaveLength(1)
      expect(result.achievements[0].milestone_type).toBe("first_approach")
      expect(result.achievements[0].emoji).toBeDefined()
      expect(result.achievements[0].label).toBeDefined()
      expect(result.achievements[0].tier).toBeDefined()
    })

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

    test("should handle empty milestones array", () => {
      // Arrange
      const session: RawSessionWithRelations = {
        ...baseSession,
        milestones: [],
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.achievements).toEqual([])
    })
  })

  describe("N+1 query fix validation", () => {
    test("should transform multiple approaches without additional queries", () => {
      // This test validates that the transformation handles embedded relations
      // correctly - the data structure matches what Supabase returns from a
      // single query with embedded relations

      // Arrange: Simulate data from single Supabase query with embedded approaches
      const session: RawSessionWithRelations = {
        ...baseSession,
        approaches: Array.from({ length: 10 }, (_, i) => ({
          outcome: ["blowout", "short", "good", "number", "instadate"][i % 5],
        })),
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert: All approaches counted correctly from single data structure
      expect(result.total_approaches).toBe(10)
      expect(result.outcomes.blowout).toBe(2)
      expect(result.outcomes.short).toBe(2)
      expect(result.outcomes.good).toBe(2)
      expect(result.outcomes.number).toBe(2)
      expect(result.outcomes.instadate).toBe(2)
    })

    test("should handle session with both approaches and milestones embedded", () => {
      // Validates that both embedded relations are processed from single query result

      // Arrange
      const session: RawSessionWithRelations = {
        ...baseSession,
        approaches: [
          { outcome: "good" },
          { outcome: "number" },
        ],
        milestones: [
          { milestone_type: "first_approach" },
          { milestone_type: "first_number" },
        ],
      }

      // Act
      const result = transformSessionToSummary(session)

      // Assert
      expect(result.total_approaches).toBe(2)
      expect(result.outcomes.good).toBe(1)
      expect(result.outcomes.number).toBe(1)
      expect(result.achievements).toHaveLength(2)
    })
  })
})
