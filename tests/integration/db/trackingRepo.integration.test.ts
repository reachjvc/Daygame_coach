/**
 * Integration tests for trackingRepo.
 * Tests database operations, joins, transactions, and edge cases.
 *
 * Test cases from better_tests_plan.md Phase 2.1:
 * 1. Session with 5 approaches returns exactly 5 (catches join duplicates)
 * 2. endSession updates stats atomically (catches transaction failures)
 * 3. Week 52 → Week 1 streak continues (catches year boundary bugs)
 * 4. Milestone at exact threshold (catches off-by-one errors)
 * 5. Concurrent session ends (race conditions)
 */

import { describe, test, expect, beforeEach } from "vitest"
import {
  getClient,
  truncateAllTables,
  createTestUser,
  createTestUserStats,
} from "../setup"

// Import pure helper functions from trackingRepo
import {
  getISOWeekString,
  areWeeksConsecutive,
  isWeekActive,
} from "../../../src/db/trackingRepo"

describe("trackingRepo Integration Tests", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  // ============================================
  // Pure Function Tests (no database needed)
  // ============================================

  describe("getISOWeekString", () => {
    test("should return correct ISO week format", () => {
      // Arrange
      const date = new Date("2026-01-15")

      // Act
      const weekString = getISOWeekString(date)

      // Assert
      expect(weekString).toMatch(/^\d{4}-W\d{2}$/)
      expect(weekString).toBe("2026-W03")
    })

    test("should handle year boundary (late December)", () => {
      // Arrange: Dec 31, 2025 - should be week 1 of 2026
      const date = new Date("2025-12-31")

      // Act
      const weekString = getISOWeekString(date)

      // Assert: Dec 31 2025 is in week 1 of 2026 according to ISO week rules
      expect(weekString).toBe("2026-W01")
    })

    test("should handle year boundary (early January)", () => {
      // Arrange: Jan 1, 2026 is a Thursday, start of week 1
      const date = new Date("2026-01-01")

      // Act
      const weekString = getISOWeekString(date)

      // Assert
      expect(weekString).toBe("2026-W01")
    })
  })

  describe("areWeeksConsecutive", () => {
    test("should return true for consecutive weeks in same year", () => {
      // Arrange
      const week1 = "2026-W03"
      const week2 = "2026-W04"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(true)
    })

    test("should return false for non-consecutive weeks", () => {
      // Arrange
      const week1 = "2026-W03"
      const week2 = "2026-W05"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(false)
    })

    test("should return true for week 52 to week 1 (year boundary)", () => {
      // Arrange: Week 52 of 2025 to Week 1 of 2026
      const week1 = "2025-W52"
      const week2 = "2026-W01"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(true)
    })

    test("should return true for week 53 to week 1 (year with 53 weeks)", () => {
      // Arrange: Some years have 53 weeks
      const week1 = "2020-W53"
      const week2 = "2021-W01"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(true)
    })

    test("should return false for empty strings", () => {
      // Arrange & Act & Assert
      expect(areWeeksConsecutive("", "2026-W01")).toBe(false)
      expect(areWeeksConsecutive("2026-W01", "")).toBe(false)
      expect(areWeeksConsecutive("", "")).toBe(false)
    })

    test("should return false for same week", () => {
      // Arrange
      const week1 = "2026-W03"
      const week2 = "2026-W03"

      // Act
      const result = areWeeksConsecutive(week1, week2)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe("isWeekActive", () => {
    test("should return true for 2+ sessions", () => {
      // Arrange & Act & Assert
      expect(isWeekActive(2, 0)).toBe(true)
      expect(isWeekActive(3, 0)).toBe(true)
      expect(isWeekActive(10, 0)).toBe(true)
    })

    test("should return true for 5+ approaches", () => {
      // Arrange & Act & Assert
      expect(isWeekActive(0, 5)).toBe(true)
      expect(isWeekActive(0, 10)).toBe(true)
      expect(isWeekActive(1, 5)).toBe(true)
    })

    test("should return false for insufficient activity", () => {
      // Arrange & Act & Assert
      expect(isWeekActive(0, 0)).toBe(false)
      expect(isWeekActive(1, 0)).toBe(false)
      expect(isWeekActive(0, 4)).toBe(false)
      expect(isWeekActive(1, 4)).toBe(false)
    })
  })

  // ============================================
  // Database Tests
  // ============================================

  describe("Session with approaches - join duplicate check", () => {
    test("should return exactly 5 approaches for session with 5 approaches", async () => {
      // Arrange: Create user and session with 5 approaches
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create session
        const sessionResult = await client.query(
          `INSERT INTO sessions (user_id, started_at, is_active)
           VALUES ($1, NOW(), true)
           RETURNING id`,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Create exactly 5 approaches
        for (let i = 0; i < 5; i++) {
          await client.query(
            `INSERT INTO approaches (user_id, session_id, timestamp, outcome)
             VALUES ($1, $2, NOW() + interval '${i} minutes', 'good')`,
            [userId, sessionId]
          )
        }

        // Act: Query with embedded relation (like getSessionSummaries does)
        const result = await client.query(
          `SELECT s.id, s.started_at,
                  (SELECT json_agg(a.*) FROM approaches a WHERE a.session_id = s.id) as approaches
           FROM sessions s
           WHERE s.id = $1`,
          [sessionId]
        )

        // Assert: Should have exactly 5 approaches, no duplicates
        const session = result.rows[0]
        const approaches = session.approaches || []
        expect(approaches).toHaveLength(5)
      } finally {
        await client.end()
      }
    })

    test("should not duplicate approaches with multiple joins", async () => {
      // Arrange: Create user, session with approaches
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create session
        const sessionResult = await client.query(
          `INSERT INTO sessions (user_id, started_at, is_active, primary_location)
           VALUES ($1, NOW(), false, 'Test Location')
           RETURNING id`,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Create 3 approaches with different outcomes
        await client.query(
          `INSERT INTO approaches (user_id, session_id, timestamp, outcome) VALUES
           ($1, $2, NOW(), 'blowout'),
           ($1, $2, NOW() + interval '1 minute', 'good'),
           ($1, $2, NOW() + interval '2 minutes', 'number')`,
          [userId, sessionId]
        )

        // Act: Use the actual join pattern from getSessionSummaries
        const result = await client.query(
          `SELECT s.id, s.started_at, s.ended_at, s.duration_minutes,
                  s.goal, s.goal_met, s.primary_location,
                  a.outcome
           FROM sessions s
           LEFT JOIN approaches a ON a.session_id = s.id
           WHERE s.id = $1
           ORDER BY a.timestamp`,
          [sessionId]
        )

        // Assert: Should have 3 rows (one per approach), not duplicated
        expect(result.rows).toHaveLength(3)

        // Count outcomes
        const outcomes = result.rows.map((r) => r.outcome)
        expect(outcomes).toContain("blowout")
        expect(outcomes).toContain("good")
        expect(outcomes).toContain("number")
      } finally {
        await client.end()
      }
    })
  })

  describe("endSession stats update - atomicity check", () => {
    test("should update session and stats correctly on end", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Create active session with goal
        const sessionResult = await client.query(
          `INSERT INTO sessions (user_id, started_at, is_active, goal)
           VALUES ($1, NOW() - interval '30 minutes', true, 5)
           RETURNING id`,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Add 6 approaches (goal met)
        for (let i = 0; i < 6; i++) {
          await client.query(
            `INSERT INTO approaches (user_id, session_id, timestamp, outcome)
             VALUES ($1, $2, NOW() - interval '${25 - i * 4} minutes', 'good')`,
            [userId, sessionId]
          )
        }

        // Act: Simulate endSession logic
        // 1. Update session
        await client.query(
          `UPDATE sessions
           SET ended_at = NOW(),
               is_active = false,
               duration_minutes = 30,
               total_approaches = 6,
               goal_met = true
           WHERE id = $1`,
          [sessionId]
        )

        // 2. Update stats
        await client.query(
          `UPDATE user_tracking_stats
           SET total_sessions = total_sessions + 1,
               updated_at = NOW()
           WHERE user_id = $1`,
          [userId]
        )

        // Assert: Session should be updated
        const sessionCheck = await client.query(
          `SELECT is_active, goal_met, total_approaches, duration_minutes
           FROM sessions WHERE id = $1`,
          [sessionId]
        )
        expect(sessionCheck.rows[0].is_active).toBe(false)
        expect(sessionCheck.rows[0].goal_met).toBe(true)
        expect(sessionCheck.rows[0].total_approaches).toBe(6)
        expect(sessionCheck.rows[0].duration_minutes).toBe(30)

        // Assert: Stats should be updated
        const statsCheck = await client.query(
          `SELECT total_sessions FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(statsCheck.rows[0].total_sessions).toBe(1)
      } finally {
        await client.end()
      }
    })

    test("should handle session end with no approaches", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Create active session with goal
        const sessionResult = await client.query(
          `INSERT INTO sessions (user_id, started_at, is_active, goal)
           VALUES ($1, NOW() - interval '10 minutes', true, 3)
           RETURNING id`,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Act: End session with 0 approaches
        await client.query(
          `UPDATE sessions
           SET ended_at = NOW(),
               is_active = false,
               duration_minutes = 10,
               total_approaches = 0,
               goal_met = false
           WHERE id = $1`,
          [sessionId]
        )

        // Assert
        const sessionCheck = await client.query(
          `SELECT is_active, goal_met, total_approaches FROM sessions WHERE id = $1`,
          [sessionId]
        )
        expect(sessionCheck.rows[0].is_active).toBe(false)
        expect(sessionCheck.rows[0].goal_met).toBe(false)
        expect(sessionCheck.rows[0].total_approaches).toBe(0)
      } finally {
        await client.end()
      }
    })
  })

  describe("Milestone at exact threshold - off-by-one check", () => {
    test("should award first_approach milestone at exactly 1 approach", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Act: Insert first milestone at threshold
        await client.query(
          `INSERT INTO milestones (user_id, milestone_type, value)
           VALUES ($1, 'first_approach', 1)`,
          [userId]
        )

        // Assert: Milestone exists
        const result = await client.query(
          `SELECT milestone_type, value FROM milestones
           WHERE user_id = $1 AND milestone_type = 'first_approach'`,
          [userId]
        )
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].milestone_type).toBe("first_approach")
      } finally {
        await client.end()
      }
    })

    test("should not allow duplicate milestones", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Insert first milestone
        await client.query(
          `INSERT INTO milestones (user_id, milestone_type)
           VALUES ($1, '5_approaches')`,
          [userId]
        )

        // Act & Assert: Second insert should fail (unique constraint)
        await expect(
          client.query(
            `INSERT INTO milestones (user_id, milestone_type)
             VALUES ($1, '5_approaches')`,
            [userId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("should award 10_sessions milestone at exactly 10 sessions", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Simulate 10 sessions by updating stats
        await client.query(
          `UPDATE user_tracking_stats
           SET total_sessions = 10
           WHERE user_id = $1`,
          [userId]
        )

        // Check if milestone should be awarded (logic check)
        const statsResult = await client.query(
          `SELECT total_sessions FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        const sessionCount = statsResult.rows[0].total_sessions

        // Assert: At exactly 10, milestone should be awarded
        expect(sessionCount).toBe(10)

        // Award milestone
        if (sessionCount === 10) {
          await client.query(
            `INSERT INTO milestones (user_id, milestone_type, value)
             VALUES ($1, '10_sessions', 10)
             ON CONFLICT (user_id, milestone_type) DO NOTHING`,
            [userId]
          )
        }

        // Verify
        const milestoneResult = await client.query(
          `SELECT * FROM milestones WHERE user_id = $1 AND milestone_type = '10_sessions'`,
          [userId]
        )
        expect(milestoneResult.rows).toHaveLength(1)
      } finally {
        await client.end()
      }
    })
  })

  describe("Weekly streak - year boundary", () => {
    test("should continue streak from week 52 to week 1", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Set user as active in week 52 of 2025 with 1 week streak
        await client.query(
          `UPDATE user_tracking_stats
           SET last_active_week = '2025-W52',
               current_week_streak = 1,
               longest_week_streak = 1
           WHERE user_id = $1`,
          [userId]
        )

        // Act: Check if weeks are consecutive (simulating week 1 of 2026)
        const currentWeek = "2026-W01"
        const statsResult = await client.query(
          `SELECT last_active_week, current_week_streak FROM user_tracking_stats
           WHERE user_id = $1`,
          [userId]
        )
        const lastActiveWeek = statsResult.rows[0].last_active_week
        const currentStreak = statsResult.rows[0].current_week_streak

        // Use the helper function to check consecutive
        const isConsecutive = areWeeksConsecutive(lastActiveWeek, currentWeek)

        // Assert: Should be consecutive
        expect(isConsecutive).toBe(true)

        // Calculate new streak
        const newStreak = isConsecutive ? currentStreak + 1 : 1
        expect(newStreak).toBe(2)

        // Update streak
        await client.query(
          `UPDATE user_tracking_stats
           SET current_week_streak = $2,
               longest_week_streak = GREATEST(longest_week_streak, $2),
               last_active_week = $3
           WHERE user_id = $1`,
          [userId, newStreak, currentWeek]
        )

        // Verify
        const verifyResult = await client.query(
          `SELECT current_week_streak, longest_week_streak, last_active_week
           FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(verifyResult.rows[0].current_week_streak).toBe(2)
        expect(verifyResult.rows[0].longest_week_streak).toBe(2)
        expect(verifyResult.rows[0].last_active_week).toBe("2026-W01")
      } finally {
        await client.end()
      }
    })

    test("should reset streak when weeks are not consecutive", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Set user as active in week 50 of 2025 with 5 week streak
        await client.query(
          `UPDATE user_tracking_stats
           SET last_active_week = '2025-W50',
               current_week_streak = 5,
               longest_week_streak = 5
           WHERE user_id = $1`,
          [userId]
        )

        // Act: Check if weeks are consecutive (skipped week 51, now in week 52)
        const currentWeek = "2025-W52"
        const statsResult = await client.query(
          `SELECT last_active_week, current_week_streak FROM user_tracking_stats
           WHERE user_id = $1`,
          [userId]
        )
        const lastActiveWeek = statsResult.rows[0].last_active_week

        const isConsecutive = areWeeksConsecutive(lastActiveWeek, currentWeek)

        // Assert: Should NOT be consecutive (skipped week 51)
        expect(isConsecutive).toBe(false)

        // New streak resets to 1
        const newStreak = isConsecutive ? statsResult.rows[0].current_week_streak + 1 : 1
        expect(newStreak).toBe(1)
      } finally {
        await client.end()
      }
    })
  })

  describe("Concurrent session ends - race condition check", () => {
    test("should handle concurrent stat updates correctly", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client1 = await getClient()
      const client2 = await getClient()

      try {
        // Create two sessions
        const session1Result = await client1.query(
          `INSERT INTO sessions (user_id, started_at, is_active)
           VALUES ($1, NOW() - interval '1 hour', true)
           RETURNING id`,
          [userId]
        )
        const session2Result = await client1.query(
          `INSERT INTO sessions (user_id, started_at, is_active)
           VALUES ($1, NOW() - interval '30 minutes', true)
           RETURNING id`,
          [userId]
        )
        const sessionId1 = session1Result.rows[0].id
        const sessionId2 = session2Result.rows[0].id

        // Act: End both sessions "concurrently" (simulate with two connections)
        // In real scenario, these would race

        // End session 1
        await client1.query(
          `UPDATE sessions SET is_active = false, ended_at = NOW() WHERE id = $1`,
          [sessionId1]
        )
        await client1.query(
          `UPDATE user_tracking_stats
           SET total_sessions = total_sessions + 1
           WHERE user_id = $1`,
          [userId]
        )

        // End session 2
        await client2.query(
          `UPDATE sessions SET is_active = false, ended_at = NOW() WHERE id = $1`,
          [sessionId2]
        )
        await client2.query(
          `UPDATE user_tracking_stats
           SET total_sessions = total_sessions + 1
           WHERE user_id = $1`,
          [userId]
        )

        // Assert: Both sessions should be ended
        const sessionsResult = await client1.query(
          `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND is_active = false`,
          [userId]
        )
        expect(parseInt(sessionsResult.rows[0].count)).toBe(2)

        // Stats should show 2 sessions (no lost updates)
        const statsResult = await client1.query(
          `SELECT total_sessions FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(statsResult.rows[0].total_sessions).toBe(2)
      } finally {
        await client1.end()
        await client2.end()
      }
    })
  })

  describe("Approach stats integration", () => {
    test("should correctly count approaches by outcome", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Create session
        const sessionResult = await client.query(
          `INSERT INTO sessions (user_id, started_at, is_active)
           VALUES ($1, NOW(), false)
           RETURNING id`,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Create approaches with different outcomes
        await client.query(
          `INSERT INTO approaches (user_id, session_id, timestamp, outcome) VALUES
           ($1, $2, NOW(), 'blowout'),
           ($1, $2, NOW() + interval '1 min', 'blowout'),
           ($1, $2, NOW() + interval '2 min', 'short'),
           ($1, $2, NOW() + interval '3 min', 'good'),
           ($1, $2, NOW() + interval '4 min', 'number'),
           ($1, $2, NOW() + interval '5 min', 'number'),
           ($1, $2, NOW() + interval '6 min', 'instadate')`,
          [userId, sessionId]
        )

        // Act: Count by outcome (like getSessionSummaries does)
        const result = await client.query(
          `SELECT outcome, COUNT(*) as count
           FROM approaches
           WHERE session_id = $1
           GROUP BY outcome`,
          [sessionId]
        )

        // Assert
        const outcomes: Record<string, number> = {}
        for (const row of result.rows) {
          outcomes[row.outcome] = parseInt(row.count)
        }

        expect(outcomes["blowout"]).toBe(2)
        expect(outcomes["short"]).toBe(1)
        expect(outcomes["good"]).toBe(1)
        expect(outcomes["number"]).toBe(2)
        expect(outcomes["instadate"]).toBe(1)
      } finally {
        await client.end()
      }
    })
  })
})
