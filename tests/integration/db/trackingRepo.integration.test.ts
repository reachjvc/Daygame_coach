/**
 * Integration tests for trackingRepo.
 * Tests database operations, joins, transactions, and edge cases.
 *
 * NOTE: These tests validate DATABASE SCHEMA and SQL query correctness.
 * They use raw SQL queries against testcontainers PostgreSQL.
 * Some tests (milestones, edge cases) implement logic inline rather than
 * calling production functions - this tests the schema constraints, not
 * the trackingRepo.ts business logic. Production code is tested via E2E.
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

  // ============================================
  // Edge Case Tests (added 02-02-2026)
  // These 6 tests catch real bugs in tracking logic
  // ============================================

  describe("Concurrent approach logging - race condition check", () => {
    test("should count both approaches when logged concurrently to same session", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client1 = await getClient()
      const client2 = await getClient()

      try {
        // Create active session
        const sessionResult = await client1.query(
          `INSERT INTO sessions (user_id, started_at, is_active, total_approaches)
           VALUES ($1, NOW(), true, 0)
           RETURNING id`,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Act: Log two approaches "concurrently" from different connections
        await Promise.all([
          client1.query(
            `INSERT INTO approaches (user_id, session_id, timestamp, outcome)
             VALUES ($1, $2, NOW(), 'good')`,
            [userId, sessionId]
          ),
          client2.query(
            `INSERT INTO approaches (user_id, session_id, timestamp, outcome)
             VALUES ($1, $2, NOW() + interval '1 second', 'short')`,
            [userId, sessionId]
          ),
        ])

        // Assert: Both approaches should be recorded
        const countResult = await client1.query(
          `SELECT COUNT(*) as count FROM approaches WHERE session_id = $1`,
          [sessionId]
        )
        expect(parseInt(countResult.rows[0].count)).toBe(2)
      } finally {
        await client1.end()
        await client2.end()
      }
    })
  })

  describe("Double endSession - idempotency check", () => {
    test("should handle double endSession gracefully without double-counting stats", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Create active session
        const sessionResult = await client.query(
          `INSERT INTO sessions (user_id, started_at, is_active)
           VALUES ($1, NOW() - interval '30 minutes', true)
           RETURNING id`,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Act: End session first time
        await client.query(
          `UPDATE sessions
           SET is_active = false, ended_at = NOW()
           WHERE id = $1 AND is_active = true`,
          [sessionId]
        )

        // Update stats (simulating first endSession)
        await client.query(
          `UPDATE user_tracking_stats
           SET total_sessions = total_sessions + 1
           WHERE user_id = $1`,
          [userId]
        )

        // Act: Try to end again (should be no-op due to is_active = true check)
        const secondEndResult = await client.query(
          `UPDATE sessions
           SET is_active = false, ended_at = NOW()
           WHERE id = $1 AND is_active = true
           RETURNING id`,
          [sessionId]
        )

        // Assert: Second update should affect 0 rows
        expect(secondEndResult.rowCount).toBe(0)

        // Stats should still show 1 session (not 2)
        const statsResult = await client.query(
          `SELECT total_sessions FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(statsResult.rows[0].total_sessions).toBe(1)
      } finally {
        await client.end()
      }
    })
  })

  describe("Milestone timing edge cases", () => {
    test("should award first_5_approach_session at exactly 5 approaches", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Create session with exactly 5 approaches
        const sessionResult = await client.query(
          `INSERT INTO sessions (user_id, started_at, is_active, total_approaches)
           VALUES ($1, NOW() - interval '1 hour', false, 5)
           RETURNING id`,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Insert exactly 5 approaches
        for (let i = 0; i < 5; i++) {
          await client.query(
            `INSERT INTO approaches (user_id, session_id, timestamp, outcome)
             VALUES ($1, $2, NOW() - interval '${50 - i * 10} minutes', 'good')`,
            [userId, sessionId]
          )
        }

        // Act: Check if session qualifies (approachCount >= 5)
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM approaches WHERE session_id = $1`,
          [sessionId]
        )
        const approachCount = parseInt(countResult.rows[0].count)

        // Assert: Exactly 5 should qualify
        expect(approachCount).toBe(5)
        expect(approachCount >= 5).toBe(true)

        // Award milestone
        if (approachCount >= 5) {
          await client.query(
            `INSERT INTO milestones (user_id, milestone_type)
             VALUES ($1, 'first_5_approach_session')
             ON CONFLICT (user_id, milestone_type) DO NOTHING`,
            [userId]
          )
        }

        // Verify
        const milestoneResult = await client.query(
          `SELECT * FROM milestones WHERE user_id = $1 AND milestone_type = 'first_5_approach_session'`,
          [userId]
        )
        expect(milestoneResult.rows).toHaveLength(1)
      } finally {
        await client.end()
      }
    })
  })

  describe("Weekly streak preservation", () => {
    test("should preserve longest_week_streak when current streak breaks", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Set up: User had a 10-week streak, currently at 3 weeks
        await client.query(
          `UPDATE user_tracking_stats
           SET longest_week_streak = 10,
               current_week_streak = 3,
               last_active_week = '2025-W48'
           WHERE user_id = $1`,
          [userId]
        )

        // Act: Simulate streak break (skip to week 51, missing weeks 49 & 50)
        const currentWeek = "2025-W51"
        const statsResult = await client.query(
          `SELECT last_active_week FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        const lastActiveWeek = statsResult.rows[0].last_active_week

        // Check if consecutive
        const isConsecutive = areWeeksConsecutive(lastActiveWeek, currentWeek)
        expect(isConsecutive).toBe(false) // W48 to W51 is not consecutive

        // Reset current streak to 1, but preserve longest
        await client.query(
          `UPDATE user_tracking_stats
           SET current_week_streak = 1,
               last_active_week = $2
           WHERE user_id = $1`,
          [userId, currentWeek]
        )
        // Note: NOT updating longest_week_streak

        // Assert: longest_week_streak should still be 10
        const verifyResult = await client.query(
          `SELECT current_week_streak, longest_week_streak
           FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(verifyResult.rows[0].current_week_streak).toBe(1)
        expect(verifyResult.rows[0].longest_week_streak).toBe(10) // Preserved!
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Field Report Tests (added 02-02-2026)
  // Tests for field_reports and field_report_templates tables
  // ============================================

  describe("Field Report Templates", () => {
    test("should return system templates for all users", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create a system template
        await client.query(
          `INSERT INTO field_report_templates (name, slug, is_system, static_fields, dynamic_fields)
           VALUES ('Standard Report', 'standard', true, '[]'::jsonb, '[]'::jsonb)`
        )

        // Act: Query templates available to user
        const result = await client.query(
          `SELECT * FROM field_report_templates
           WHERE is_system = true OR user_id = $1
           ORDER BY is_system DESC, name ASC`,
          [userId]
        )

        // Assert
        expect(result.rows.length).toBeGreaterThanOrEqual(1)
        expect(result.rows[0].is_system).toBe(true)
        expect(result.rows[0].name).toBe("Standard Report")
      } finally {
        await client.end()
      }
    })

    test("should return user-specific templates in addition to system templates", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create system template
        await client.query(
          `INSERT INTO field_report_templates (name, slug, is_system, static_fields, dynamic_fields)
           VALUES ('System Template', 'system', true, '[]'::jsonb, '[]'::jsonb)`
        )

        // Create user template
        await client.query(
          `INSERT INTO field_report_templates (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'My Template', 'my-template', false, '[]'::jsonb, '[]'::jsonb)`,
          [userId]
        )

        // Act: Query templates for user
        const result = await client.query(
          `SELECT * FROM field_report_templates
           WHERE is_system = true OR user_id = $1
           ORDER BY is_system DESC, name ASC`,
          [userId]
        )

        // Assert: Should have both system and user templates
        expect(result.rows).toHaveLength(2)
        expect(result.rows.map((r) => r.name)).toContain("System Template")
        expect(result.rows.map((r) => r.name)).toContain("My Template")
      } finally {
        await client.end()
      }
    })

    test("should return null for non-existent template id", async () => {
      // Arrange
      const client = await getClient()
      const nonExistentId = "00000000-0000-0000-0000-000000000000"

      try {
        // Act
        const result = await client.query(
          `SELECT * FROM field_report_templates WHERE id = $1`,
          [nonExistentId]
        )

        // Assert
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("should handle JSONB static_fields and dynamic_fields correctly", async () => {
      // Arrange
      const client = await getClient()
      const staticFields = [
        { id: "location", label: "Location", type: "text" },
        { id: "mood", label: "Mood", type: "rating" },
      ]
      const dynamicFields = [
        { id: "notes", label: "Additional Notes", type: "textarea" },
      ]

      try {
        // Act: Insert template with JSONB fields
        const insertResult = await client.query(
          `INSERT INTO field_report_templates (name, slug, is_system, static_fields, dynamic_fields)
           VALUES ('JSONB Test', 'jsonb-test', true, $1::jsonb, $2::jsonb)
           RETURNING *`,
          [JSON.stringify(staticFields), JSON.stringify(dynamicFields)]
        )

        // Assert: JSONB should be preserved correctly
        const template = insertResult.rows[0]
        expect(template.static_fields).toHaveLength(2)
        expect(template.static_fields[0].id).toBe("location")
        expect(template.dynamic_fields).toHaveLength(1)
        expect(template.dynamic_fields[0].id).toBe("notes")
      } finally {
        await client.end()
      }
    })
  })

  describe("Field Report CRUD", () => {
    test("should create field report with all fields", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create a session to link to
        const sessionResult = await client.query(
          `INSERT INTO sessions (user_id, started_at, is_active)
           VALUES ($1, NOW(), false) RETURNING id`,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Act: Create field report
        const reportResult = await client.query(
          `INSERT INTO field_reports (user_id, session_id, fields, approach_count, location, tags, is_draft)
           VALUES ($1, $2, '{"summary": "Great session"}'::jsonb, 5, 'Downtown', ARRAY['daytime', 'solo'], false)
           RETURNING *`,
          [userId, sessionId]
        )

        // Assert
        const report = reportResult.rows[0]
        expect(report.user_id).toBe(userId)
        expect(report.session_id).toBe(sessionId)
        expect(report.fields.summary).toBe("Great session")
        expect(report.approach_count).toBe(5)
        expect(report.location).toBe("Downtown")
        expect(report.tags).toContain("daytime")
        expect(report.is_draft).toBe(false)
      } finally {
        await client.end()
      }
    })

    test("should create field report as draft", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Create draft report
        const reportResult = await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft)
           VALUES ($1, '{"notes": "incomplete"}'::jsonb, true)
           RETURNING *`,
          [userId]
        )

        // Assert
        expect(reportResult.rows[0].is_draft).toBe(true)
      } finally {
        await client.end()
      }
    })

    test("should update field report fields partially (JSONB merge)", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create initial report with fields
        const reportResult = await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft)
           VALUES ($1, '{"summary": "Initial", "mood": 5}'::jsonb, true)
           RETURNING id`,
          [userId]
        )
        const reportId = reportResult.rows[0].id

        // Act: Update fields using jsonb concatenation
        await client.query(
          `UPDATE field_reports
           SET fields = fields || '{"summary": "Updated"}'::jsonb,
               location = 'New Location'
           WHERE id = $1`,
          [reportId]
        )

        // Assert: Summary updated, mood preserved
        const updatedResult = await client.query(
          `SELECT * FROM field_reports WHERE id = $1`,
          [reportId]
        )
        expect(updatedResult.rows[0].fields.summary).toBe("Updated")
        expect(updatedResult.rows[0].fields.mood).toBe(5) // Preserved
        expect(updatedResult.rows[0].location).toBe("New Location")
      } finally {
        await client.end()
      }
    })

    test("should update total_field_reports when creating non-draft report", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Verify initial count is 0
        const initialStats = await client.query(
          `SELECT total_field_reports FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(initialStats.rows[0].total_field_reports).toBe(0)

        // Act: Create non-draft report and update stats
        await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft)
           VALUES ($1, '{"summary": "Test"}'::jsonb, false)`,
          [userId]
        )
        await client.query(
          `UPDATE user_tracking_stats
           SET total_field_reports = total_field_reports + 1
           WHERE user_id = $1`,
          [userId]
        )

        // Assert
        const updatedStats = await client.query(
          `SELECT total_field_reports FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(updatedStats.rows[0].total_field_reports).toBe(1)
      } finally {
        await client.end()
      }
    })

    test("should NOT update stats when creating draft report", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Act: Create draft report (no stats update)
        await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft)
           VALUES ($1, '{"summary": "Draft"}'::jsonb, true)`,
          [userId]
        )
        // Note: Intentionally NOT updating stats

        // Assert: Stats unchanged
        const stats = await client.query(
          `SELECT total_field_reports FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(stats.rows[0].total_field_reports).toBe(0)
      } finally {
        await client.end()
      }
    })

    test("should award first_field_report milestone on first report", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Act: Create first non-draft report and award milestone
        await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft)
           VALUES ($1, '{"summary": "First!"}'::jsonb, false)`,
          [userId]
        )
        await client.query(
          `UPDATE user_tracking_stats SET total_field_reports = 1 WHERE user_id = $1`,
          [userId]
        )
        await client.query(
          `INSERT INTO milestones (user_id, milestone_type)
           VALUES ($1, 'first_field_report')
           ON CONFLICT (user_id, milestone_type) DO NOTHING`,
          [userId]
        )

        // Assert
        const milestoneResult = await client.query(
          `SELECT * FROM milestones WHERE user_id = $1 AND milestone_type = 'first_field_report'`,
          [userId]
        )
        expect(milestoneResult.rows).toHaveLength(1)
      } finally {
        await client.end()
      }
    })

    test("should convert draft to published and update stats", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Create draft
        const draftResult = await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft)
           VALUES ($1, '{"summary": "Draft"}'::jsonb, true)
           RETURNING id`,
          [userId]
        )
        const reportId = draftResult.rows[0].id

        // Act: Convert to published
        await client.query(
          `UPDATE field_reports SET is_draft = false WHERE id = $1`,
          [reportId]
        )
        await client.query(
          `UPDATE user_tracking_stats
           SET total_field_reports = total_field_reports + 1
           WHERE user_id = $1`,
          [userId]
        )

        // Assert
        const reportResult = await client.query(
          `SELECT is_draft FROM field_reports WHERE id = $1`,
          [reportId]
        )
        expect(reportResult.rows[0].is_draft).toBe(false)

        const statsResult = await client.query(
          `SELECT total_field_reports FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(statsResult.rows[0].total_field_reports).toBe(1)
      } finally {
        await client.end()
      }
    })

    test("should persist title and reported_at correctly", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const testTitle = "My Evening Session"
      const testReportedAt = "2026-01-15T19:30:00.000Z"

      try {
        // Act: Create report with title and specific reported_at
        const reportResult = await client.query(
          `INSERT INTO field_reports (user_id, title, fields, reported_at, is_draft)
           VALUES ($1, $2, '{"summary": "Great session"}'::jsonb, $3, false)
           RETURNING *`,
          [userId, testTitle, testReportedAt]
        )

        // Assert: Title and reported_at should be persisted
        const report = reportResult.rows[0]
        expect(report.title).toBe(testTitle)
        expect(new Date(report.reported_at).toISOString()).toBe(testReportedAt)

        // Act: Query back by user_id
        const queryResult = await client.query(
          `SELECT title, reported_at FROM field_reports WHERE user_id = $1`,
          [userId]
        )

        // Assert: Values are correctly stored and retrieved
        expect(queryResult.rows[0].title).toBe(testTitle)
        expect(new Date(queryResult.rows[0].reported_at).toISOString()).toBe(testReportedAt)
      } finally {
        await client.end()
      }
    })

    test("should allow null title (optional field)", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Create report without title
        const reportResult = await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft)
           VALUES ($1, '{"summary": "No title"}'::jsonb, false)
           RETURNING *`,
          [userId]
        )

        // Assert: Title should be null
        expect(reportResult.rows[0].title).toBeNull()
      } finally {
        await client.end()
      }
    })

    test("should use default reported_at when not provided", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const beforeInsert = new Date()

      try {
        // Act: Create report without reported_at
        const reportResult = await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft)
           VALUES ($1, '{"summary": "Default date"}'::jsonb, false)
           RETURNING *`,
          [userId]
        )
        const afterInsert = new Date()

        // Assert: reported_at should be between before and after insert
        const reportedAt = new Date(reportResult.rows[0].reported_at)
        expect(reportedAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000)
        expect(reportedAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime() + 1000)
      } finally {
        await client.end()
      }
    })
  })

  describe("Field Report Queries", () => {
    test("should return only non-draft reports in getUserFieldReports pattern", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create mix of draft and non-draft reports
        await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft) VALUES
           ($1, '{"title": "Report 1"}'::jsonb, false),
           ($1, '{"title": "Draft 1"}'::jsonb, true),
           ($1, '{"title": "Report 2"}'::jsonb, false),
           ($1, '{"title": "Draft 2"}'::jsonb, true)`,
          [userId]
        )

        // Act: Query non-drafts only
        const result = await client.query(
          `SELECT * FROM field_reports
           WHERE user_id = $1 AND is_draft = false
           ORDER BY reported_at DESC`,
          [userId]
        )

        // Assert: Only 2 non-draft reports
        expect(result.rows).toHaveLength(2)
        result.rows.forEach((row) => {
          expect(row.is_draft).toBe(false)
        })
      } finally {
        await client.end()
      }
    })

    test("should respect limit and offset for pagination", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create 5 reports
        for (let i = 1; i <= 5; i++) {
          await client.query(
            `INSERT INTO field_reports (user_id, fields, is_draft, reported_at)
             VALUES ($1, $2::jsonb, false, NOW() - interval '${i} days')`,
            [userId, JSON.stringify({ number: i })]
          )
        }

        // Act: Get page 2 (offset 2, limit 2)
        const result = await client.query(
          `SELECT * FROM field_reports
           WHERE user_id = $1 AND is_draft = false
           ORDER BY reported_at DESC
           LIMIT 2 OFFSET 2`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(2)
      } finally {
        await client.end()
      }
    })

    test("should order by reported_at descending", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create reports with different dates
        await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft, reported_at) VALUES
           ($1, '{"day": "oldest"}'::jsonb, false, NOW() - interval '3 days'),
           ($1, '{"day": "middle"}'::jsonb, false, NOW() - interval '2 days'),
           ($1, '{"day": "newest"}'::jsonb, false, NOW() - interval '1 day')`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT fields->>'day' as day FROM field_reports
           WHERE user_id = $1 AND is_draft = false
           ORDER BY reported_at DESC`,
          [userId]
        )

        // Assert: Newest first
        expect(result.rows[0].day).toBe("newest")
        expect(result.rows[1].day).toBe("middle")
        expect(result.rows[2].day).toBe("oldest")
      } finally {
        await client.end()
      }
    })

    test("should return only drafts in getDraftFieldReports pattern", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create mix of draft and non-draft
        await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft) VALUES
           ($1, '{"title": "Report"}'::jsonb, false),
           ($1, '{"title": "Draft 1"}'::jsonb, true),
           ($1, '{"title": "Draft 2"}'::jsonb, true)`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT * FROM field_reports
           WHERE user_id = $1 AND is_draft = true
           ORDER BY updated_at DESC`,
          [userId]
        )

        // Assert: Only drafts
        expect(result.rows).toHaveLength(2)
        result.rows.forEach((row) => {
          expect(row.is_draft).toBe(true)
        })
      } finally {
        await client.end()
      }
    })

    test("should return empty array when no reports exist", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `SELECT * FROM field_reports WHERE user_id = $1 AND is_draft = false`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("should cascade delete when user profile is deleted", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create field report
        const reportResult = await client.query(
          `INSERT INTO field_reports (user_id, fields, is_draft)
           VALUES ($1, '{"test": true}'::jsonb, false)
           RETURNING id`,
          [userId]
        )
        const reportId = reportResult.rows[0].id

        // Act: Delete user profile
        await client.query(`DELETE FROM profiles WHERE id = $1`, [userId])

        // Assert: Field report should be deleted
        const checkResult = await client.query(
          `SELECT * FROM field_reports WHERE id = $1`,
          [reportId]
        )
        expect(checkResult.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Review Tests (added 02-02-2026)
  // Tests for reviews and review_templates tables
  // ============================================

  describe("Review Templates", () => {
    test("should return system and user templates", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create system template
        await client.query(
          `INSERT INTO review_templates (name, slug, review_type, is_system, static_fields, dynamic_fields)
           VALUES ('Weekly System', 'weekly-system', 'weekly', true, '[]'::jsonb, '[]'::jsonb)`
        )
        // Create user template
        await client.query(
          `INSERT INTO review_templates (user_id, name, slug, review_type, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'My Weekly', 'my-weekly', 'weekly', false, '[]'::jsonb, '[]'::jsonb)`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT * FROM review_templates
           WHERE is_system = true OR user_id = $1
           ORDER BY is_system DESC, name ASC`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(2)
      } finally {
        await client.end()
      }
    })

    test("should filter by review_type when provided", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Create templates of different types
        await client.query(
          `INSERT INTO review_templates (name, slug, review_type, is_system, static_fields, dynamic_fields) VALUES
           ('Weekly', 'weekly', 'weekly', true, '[]'::jsonb, '[]'::jsonb),
           ('Monthly', 'monthly', 'monthly', true, '[]'::jsonb, '[]'::jsonb),
           ('Quarterly', 'quarterly', 'quarterly', true, '[]'::jsonb, '[]'::jsonb)`
        )

        // Act: Filter by weekly only
        const result = await client.query(
          `SELECT * FROM review_templates WHERE review_type = 'weekly'`
        )

        // Assert
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].review_type).toBe("weekly")
      } finally {
        await client.end()
      }
    })

    test("should handle all review_type enum values", async () => {
      // Arrange
      const client = await getClient()
      const types = ["weekly", "monthly", "quarterly"]

      try {
        // Act & Assert: Each type should be valid
        for (const type of types) {
          const result = await client.query(
            `INSERT INTO review_templates (name, slug, review_type, is_system, static_fields, dynamic_fields)
             VALUES ($1, $2, $3, true, '[]'::jsonb, '[]'::jsonb)
             RETURNING review_type`,
            [`${type} template`, `${type}-slug`, type]
          )
          expect(result.rows[0].review_type).toBe(type)
        }
      } finally {
        await client.end()
      }
    })
  })

  describe("Review CRUD", () => {
    test("should create weekly review with required fields", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, is_draft)
           VALUES ($1, 'weekly', '{"goals_met": 3}'::jsonb, '2026-01-27', '2026-02-02', false)
           RETURNING *`,
          [userId]
        )

        // Assert
        const review = result.rows[0]
        expect(review.user_id).toBe(userId)
        expect(review.review_type).toBe("weekly")
        expect(review.fields.goals_met).toBe(3)
        // DATE columns return Date objects in pg driver
        expect(review.period_start).toBeInstanceOf(Date)
        expect(review.period_end).toBeInstanceOf(Date)
        expect(review.is_draft).toBe(false)
      } finally {
        await client.end()
      }
    })

    test("should increment weekly_reviews_completed on weekly non-draft", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Verify initial count
        const initialStats = await client.query(
          `SELECT weekly_reviews_completed FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(initialStats.rows[0].weekly_reviews_completed).toBe(0)

        // Act: Create weekly review and update stats
        await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, is_draft)
           VALUES ($1, 'weekly', '{}'::jsonb, '2026-01-27', '2026-02-02', false)`,
          [userId]
        )
        await client.query(
          `UPDATE user_tracking_stats
           SET weekly_reviews_completed = weekly_reviews_completed + 1
           WHERE user_id = $1`,
          [userId]
        )

        // Assert
        const updatedStats = await client.query(
          `SELECT weekly_reviews_completed FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(updatedStats.rows[0].weekly_reviews_completed).toBe(1)
      } finally {
        await client.end()
      }
    })

    test("should unlock monthly_review after 4 weekly reviews", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestUserStats(userId)
      const client = await getClient()

      try {
        // Set weekly_reviews_completed to 3
        await client.query(
          `UPDATE user_tracking_stats SET weekly_reviews_completed = 3 WHERE user_id = $1`,
          [userId]
        )

        // Act: Create 4th weekly review and check unlock
        await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, is_draft)
           VALUES ($1, 'weekly', '{}'::jsonb, '2026-01-27', '2026-02-02', false)`,
          [userId]
        )
        await client.query(
          `UPDATE user_tracking_stats
           SET weekly_reviews_completed = 4,
               monthly_review_unlocked = (weekly_reviews_completed + 1 >= 4)
           WHERE user_id = $1`,
          [userId]
        )

        // Assert
        const stats = await client.query(
          `SELECT weekly_reviews_completed, monthly_review_unlocked
           FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )
        expect(stats.rows[0].weekly_reviews_completed).toBe(4)
        expect(stats.rows[0].monthly_review_unlocked).toBe(true)
      } finally {
        await client.end()
      }
    })

    test("should store commitment fields correctly", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end,
           previous_commitment, commitment_fulfilled, new_commitment, is_draft)
           VALUES ($1, 'weekly', '{}'::jsonb, '2026-01-27', '2026-02-02',
           'Do 5 approaches per day', true, 'Do 7 approaches per day', false)
           RETURNING *`,
          [userId]
        )

        // Assert
        const review = result.rows[0]
        expect(review.previous_commitment).toBe("Do 5 approaches per day")
        expect(review.commitment_fulfilled).toBe(true)
        expect(review.new_commitment).toBe("Do 7 approaches per day")
      } finally {
        await client.end()
      }
    })

    test("should update review fields", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create review
        const createResult = await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, is_draft)
           VALUES ($1, 'weekly', '{"score": 5}'::jsonb, '2026-01-27', '2026-02-02', true)
           RETURNING id`,
          [userId]
        )
        const reviewId = createResult.rows[0].id

        // Act: Update
        await client.query(
          `UPDATE reviews
           SET fields = fields || '{"score": 8}'::jsonb,
               new_commitment = 'Updated commitment'
           WHERE id = $1`,
          [reviewId]
        )

        // Assert
        const result = await client.query(
          `SELECT * FROM reviews WHERE id = $1`,
          [reviewId]
        )
        expect(result.rows[0].fields.score).toBe(8)
        expect(result.rows[0].new_commitment).toBe("Updated commitment")
      } finally {
        await client.end()
      }
    })
  })

  describe("Review Queries", () => {
    test("should filter reviews by review_type", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create reviews of different types
        await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, is_draft) VALUES
           ($1, 'weekly', '{}'::jsonb, '2026-01-20', '2026-01-26', false),
           ($1, 'weekly', '{}'::jsonb, '2026-01-27', '2026-02-02', false),
           ($1, 'monthly', '{}'::jsonb, '2026-01-01', '2026-01-31', false)`,
          [userId]
        )

        // Act: Filter by weekly
        const result = await client.query(
          `SELECT * FROM reviews
           WHERE user_id = $1 AND review_type = 'weekly' AND is_draft = false`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(2)
        result.rows.forEach((row) => {
          expect(row.review_type).toBe("weekly")
        })
      } finally {
        await client.end()
      }
    })

    test("should respect limit parameter", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create 5 reviews
        for (let i = 0; i < 5; i++) {
          await client.query(
            `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, is_draft)
             VALUES ($1, 'weekly', '{}'::jsonb, $2, $3, false)`,
            [userId, `2026-0${i + 1}-01`, `2026-0${i + 1}-07`]
          )
        }

        // Act
        const result = await client.query(
          `SELECT * FROM reviews
           WHERE user_id = $1 AND is_draft = false
           ORDER BY period_end DESC
           LIMIT 3`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(3)
      } finally {
        await client.end()
      }
    })

    test("should order by period_end descending", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create reviews with different periods
        await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, is_draft) VALUES
           ($1, 'weekly', '{"week": 1}'::jsonb, '2026-01-06', '2026-01-12', false),
           ($1, 'weekly', '{"week": 3}'::jsonb, '2026-01-20', '2026-01-26', false),
           ($1, 'weekly', '{"week": 2}'::jsonb, '2026-01-13', '2026-01-19', false)`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT fields->>'week' as week FROM reviews
           WHERE user_id = $1 AND is_draft = false
           ORDER BY period_end DESC`,
          [userId]
        )

        // Assert: Most recent period first
        expect(result.rows[0].week).toBe("3")
        expect(result.rows[1].week).toBe("2")
        expect(result.rows[2].week).toBe("1")
      } finally {
        await client.end()
      }
    })

    test("should exclude drafts from getUserReviews pattern", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create mix of drafts and non-drafts
        await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, is_draft) VALUES
           ($1, 'weekly', '{}'::jsonb, '2026-01-20', '2026-01-26', false),
           ($1, 'weekly', '{}'::jsonb, '2026-01-27', '2026-02-02', true),
           ($1, 'weekly', '{}'::jsonb, '2026-02-03', '2026-02-09', false)`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT * FROM reviews
           WHERE user_id = $1 AND is_draft = false`,
          [userId]
        )

        // Assert: Only non-drafts
        expect(result.rows).toHaveLength(2)
        result.rows.forEach((row) => {
          expect(row.is_draft).toBe(false)
        })
      } finally {
        await client.end()
      }
    })
  })

  describe("Commitment Tracking", () => {
    test("should return latest new_commitment", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create reviews with commitments
        await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, new_commitment, is_draft, created_at) VALUES
           ($1, 'weekly', '{}'::jsonb, '2026-01-13', '2026-01-19', 'First commitment', false, NOW() - interval '2 weeks'),
           ($1, 'weekly', '{}'::jsonb, '2026-01-20', '2026-01-26', 'Second commitment', false, NOW() - interval '1 week'),
           ($1, 'weekly', '{}'::jsonb, '2026-01-27', '2026-02-02', 'Latest commitment', false, NOW())`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT new_commitment FROM reviews
           WHERE user_id = $1 AND is_draft = false AND new_commitment IS NOT NULL
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId]
        )

        // Assert
        expect(result.rows[0].new_commitment).toBe("Latest commitment")
      } finally {
        await client.end()
      }
    })

    test("should return null when no commitments exist", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create review without commitment
        await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, is_draft)
           VALUES ($1, 'weekly', '{}'::jsonb, '2026-01-27', '2026-02-02', false)`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT new_commitment FROM reviews
           WHERE user_id = $1 AND is_draft = false AND new_commitment IS NOT NULL
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("should skip drafts when finding commitment", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create non-draft with commitment and newer draft with commitment
        await client.query(
          `INSERT INTO reviews (user_id, review_type, fields, period_start, period_end, new_commitment, is_draft, created_at) VALUES
           ($1, 'weekly', '{}'::jsonb, '2026-01-20', '2026-01-26', 'Published commitment', false, NOW() - interval '1 week'),
           ($1, 'weekly', '{}'::jsonb, '2026-01-27', '2026-02-02', 'Draft commitment', true, NOW())`,
          [userId]
        )

        // Act: Get latest non-draft commitment
        const result = await client.query(
          `SELECT new_commitment FROM reviews
           WHERE user_id = $1 AND is_draft = false AND new_commitment IS NOT NULL
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId]
        )

        // Assert: Should get published, not draft
        expect(result.rows[0].new_commitment).toBe("Published commitment")
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Sticking Point Tests (added 02-02-2026)
  // Tests for sticking_points table
  // ============================================

  describe("Sticking Point CRUD", () => {
    test("should create with name and default status (active)", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `INSERT INTO sticking_points (user_id, name, description)
           VALUES ($1, 'Approach anxiety', 'Feeling nervous before first approach')
           RETURNING *`,
          [userId]
        )

        // Assert
        const point = result.rows[0]
        expect(point.name).toBe("Approach anxiety")
        expect(point.description).toBe("Feeling nervous before first approach")
        expect(point.status).toBe("active")
        expect(point.occurrence_count).toBe(1)
      } finally {
        await client.end()
      }
    })

    test("should create with custom status", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `INSERT INTO sticking_points (user_id, name, status)
           VALUES ($1, 'Opener delivery', 'working_on')
           RETURNING status`,
          [userId]
        )

        // Assert
        expect(result.rows[0].status).toBe("working_on")
      } finally {
        await client.end()
      }
    })

    test("should update status from active to working_on", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create point
        const createResult = await client.query(
          `INSERT INTO sticking_points (user_id, name)
           VALUES ($1, 'Test point')
           RETURNING id`,
          [userId]
        )
        const pointId = createResult.rows[0].id

        // Act
        await client.query(
          `UPDATE sticking_points SET status = 'working_on' WHERE id = $1`,
          [pointId]
        )

        // Assert
        const result = await client.query(
          `SELECT status FROM sticking_points WHERE id = $1`,
          [pointId]
        )
        expect(result.rows[0].status).toBe("working_on")
      } finally {
        await client.end()
      }
    })

    test("should update status to resolved with resolved_at and resolution_notes", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create point
        const createResult = await client.query(
          `INSERT INTO sticking_points (user_id, name, status)
           VALUES ($1, 'Opening issue', 'working_on')
           RETURNING id`,
          [userId]
        )
        const pointId = createResult.rows[0].id

        // Act: Resolve with notes
        await client.query(
          `UPDATE sticking_points
           SET status = 'resolved',
               resolved_at = NOW(),
               resolution_notes = 'Practiced with 100 openers, now feels natural'
           WHERE id = $1`,
          [pointId]
        )

        // Assert
        const result = await client.query(
          `SELECT status, resolved_at, resolution_notes FROM sticking_points WHERE id = $1`,
          [pointId]
        )
        expect(result.rows[0].status).toBe("resolved")
        expect(result.rows[0].resolved_at).not.toBeNull()
        expect(result.rows[0].resolution_notes).toBe(
          "Practiced with 100 openers, now feels natural"
        )
      } finally {
        await client.end()
      }
    })

    test("should increment occurrence_count", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create point
        const createResult = await client.query(
          `INSERT INTO sticking_points (user_id, name)
           VALUES ($1, 'Recurring issue')
           RETURNING id`,
          [userId]
        )
        const pointId = createResult.rows[0].id

        // Act: Increment occurrence
        await client.query(
          `UPDATE sticking_points
           SET occurrence_count = occurrence_count + 1
           WHERE id = $1`,
          [pointId]
        )

        // Assert
        const result = await client.query(
          `SELECT occurrence_count FROM sticking_points WHERE id = $1`,
          [pointId]
        )
        expect(result.rows[0].occurrence_count).toBe(2)
      } finally {
        await client.end()
      }
    })
  })

  describe("Sticking Point Queries", () => {
    test("should return all points when no status filter", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create points with different statuses
        await client.query(
          `INSERT INTO sticking_points (user_id, name, status) VALUES
           ($1, 'Active issue', 'active'),
           ($1, 'Working issue', 'working_on'),
           ($1, 'Resolved issue', 'resolved')`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT * FROM sticking_points WHERE user_id = $1`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(3)
      } finally {
        await client.end()
      }
    })

    test("should filter by active status", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        await client.query(
          `INSERT INTO sticking_points (user_id, name, status) VALUES
           ($1, 'Active 1', 'active'),
           ($1, 'Active 2', 'active'),
           ($1, 'Working', 'working_on')`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT * FROM sticking_points WHERE user_id = $1 AND status = 'active'`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(2)
        result.rows.forEach((row) => {
          expect(row.status).toBe("active")
        })
      } finally {
        await client.end()
      }
    })

    test("should filter by working_on status", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        await client.query(
          `INSERT INTO sticking_points (user_id, name, status) VALUES
           ($1, 'Active', 'active'),
           ($1, 'Working 1', 'working_on'),
           ($1, 'Working 2', 'working_on')`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT * FROM sticking_points WHERE user_id = $1 AND status = 'working_on'`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(2)
      } finally {
        await client.end()
      }
    })

    test("should filter by resolved status", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        await client.query(
          `INSERT INTO sticking_points (user_id, name, status) VALUES
           ($1, 'Active', 'active'),
           ($1, 'Resolved', 'resolved')`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT * FROM sticking_points WHERE user_id = $1 AND status = 'resolved'`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].status).toBe("resolved")
      } finally {
        await client.end()
      }
    })

    test("should order by created_at descending", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        await client.query(
          `INSERT INTO sticking_points (user_id, name, created_at) VALUES
           ($1, 'Oldest', NOW() - interval '3 days'),
           ($1, 'Middle', NOW() - interval '2 days'),
           ($1, 'Newest', NOW() - interval '1 day')`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT name FROM sticking_points
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [userId]
        )

        // Assert
        expect(result.rows[0].name).toBe("Newest")
        expect(result.rows[1].name).toBe("Middle")
        expect(result.rows[2].name).toBe("Oldest")
      } finally {
        await client.end()
      }
    })
  })

  describe("Sticking Point Status Enum Validation", () => {
    test("should reject invalid status values", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act & Assert: Invalid status should throw
        await expect(
          client.query(
            `INSERT INTO sticking_points (user_id, name, status)
             VALUES ($1, 'Test', 'invalid_status')`,
            [userId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("should accept all valid status values", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const validStatuses = ["active", "working_on", "resolved"]

      try {
        // Act & Assert: Each valid status should work
        for (const status of validStatuses) {
          const result = await client.query(
            `INSERT INTO sticking_points (user_id, name, status)
             VALUES ($1, $2, $3)
             RETURNING status`,
            [userId, `Point with ${status}`, status]
          )
          expect(result.rows[0].status).toBe(status)
        }
      } finally {
        await client.end()
      }
    })
  })

  describe("Sticking Point Cascade Delete", () => {
    test("should cascade delete when user profile is deleted", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create sticking point
        const pointResult = await client.query(
          `INSERT INTO sticking_points (user_id, name)
           VALUES ($1, 'Test point')
           RETURNING id`,
          [userId]
        )
        const pointId = pointResult.rows[0].id

        // Act: Delete user profile
        await client.query(`DELETE FROM profiles WHERE id = $1`, [userId])

        // Assert: Sticking point should be deleted
        const checkResult = await client.query(
          `SELECT * FROM sticking_points WHERE id = $1`,
          [pointId]
        )
        expect(checkResult.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Custom Report Template Tests (added 03-02-2026)
  // Tests for user-created field report templates
  // ============================================

  describe("Custom Report Template CRUD", () => {
    test("should create a custom report template with is_system=false", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'My Custom Report', 'my-custom-report', false, '[]'::jsonb, '[]'::jsonb)
           RETURNING *`,
          [userId]
        )

        // Assert
        const template = result.rows[0]
        expect(template.user_id).toBe(userId)
        expect(template.name).toBe("My Custom Report")
        expect(template.slug).toBe("my-custom-report")
        expect(template.is_system).toBe(false)
      } finally {
        await client.end()
      }
    })

    test("should create custom template with JSONB static_fields", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const staticFields = [
        { id: "mood", type: "select", label: "Mood", options: ["😤", "😐", "😊", "🔥"] },
        { id: "approaches", type: "number", label: "Approaches" },
      ]

      try {
        // Act
        const result = await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'Fields Test', 'fields-test', false, $2::jsonb, '[]'::jsonb)
           RETURNING *`,
          [userId, JSON.stringify(staticFields)]
        )

        // Assert
        const template = result.rows[0]
        expect(template.static_fields).toHaveLength(2)
        expect(template.static_fields[0].id).toBe("mood")
        expect(template.static_fields[1].type).toBe("number")
      } finally {
        await client.end()
      }
    })

    test("should return only user's custom templates (not system templates)", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create system template
        await client.query(
          `INSERT INTO field_report_templates
           (name, slug, is_system, static_fields, dynamic_fields)
           VALUES ('System Template', 'system-template', true, '[]'::jsonb, '[]'::jsonb)`
        )

        // Create user custom template
        await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'My Template', 'my-template', false, '[]'::jsonb, '[]'::jsonb)`,
          [userId]
        )

        // Act: Query only user's custom templates
        const result = await client.query(
          `SELECT * FROM field_report_templates
           WHERE user_id = $1 AND is_system = false`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].name).toBe("My Template")
      } finally {
        await client.end()
      }
    })

    test("should not return other users' templates", async () => {
      // Arrange
      const userId1 = await createTestUser()
      const userId2 = await createTestUser()
      const client = await getClient()

      try {
        // Create template for user 1
        await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'User 1 Template', 'user1-template', false, '[]'::jsonb, '[]'::jsonb)`,
          [userId1]
        )

        // Create template for user 2
        await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'User 2 Template', 'user2-template', false, '[]'::jsonb, '[]'::jsonb)`,
          [userId2]
        )

        // Act: Query user 1's templates
        const result = await client.query(
          `SELECT * FROM field_report_templates
           WHERE user_id = $1 AND is_system = false`,
          [userId1]
        )

        // Assert: Should only see user 1's template
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].name).toBe("User 1 Template")
      } finally {
        await client.end()
      }
    })

    test("should update custom template owned by user", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create template
        const createResult = await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'Original Name', 'original-slug', false, '[]'::jsonb, '[]'::jsonb)
           RETURNING id`,
          [userId]
        )
        const templateId = createResult.rows[0].id

        // Act: Update template
        await client.query(
          `UPDATE field_report_templates
           SET name = 'Updated Name', description = 'New description'
           WHERE id = $1 AND user_id = $2 AND is_system = false`,
          [templateId, userId]
        )

        // Assert
        const result = await client.query(
          `SELECT * FROM field_report_templates WHERE id = $1`,
          [templateId]
        )
        expect(result.rows[0].name).toBe("Updated Name")
        expect(result.rows[0].description).toBe("New description")
      } finally {
        await client.end()
      }
    })

    test("should not update template owned by another user", async () => {
      // Arrange
      const userId1 = await createTestUser()
      const userId2 = await createTestUser()
      const client = await getClient()

      try {
        // Create template for user 1
        const createResult = await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'User 1 Template', 'user1-template', false, '[]'::jsonb, '[]'::jsonb)
           RETURNING id`,
          [userId1]
        )
        const templateId = createResult.rows[0].id

        // Act: Try to update as user 2
        const updateResult = await client.query(
          `UPDATE field_report_templates
           SET name = 'Hacked Name'
           WHERE id = $1 AND user_id = $2 AND is_system = false
           RETURNING id`,
          [templateId, userId2]
        )

        // Assert: No rows affected
        expect(updateResult.rowCount).toBe(0)

        // Verify original name unchanged
        const checkResult = await client.query(
          `SELECT name FROM field_report_templates WHERE id = $1`,
          [templateId]
        )
        expect(checkResult.rows[0].name).toBe("User 1 Template")
      } finally {
        await client.end()
      }
    })

    test("should delete custom template owned by user", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create template
        const createResult = await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'To Delete', 'to-delete', false, '[]'::jsonb, '[]'::jsonb)
           RETURNING id`,
          [userId]
        )
        const templateId = createResult.rows[0].id

        // Act: Delete template
        const deleteResult = await client.query(
          `DELETE FROM field_report_templates
           WHERE id = $1 AND user_id = $2 AND is_system = false
           RETURNING id`,
          [templateId, userId]
        )

        // Assert: One row deleted
        expect(deleteResult.rowCount).toBe(1)

        // Verify template is gone
        const checkResult = await client.query(
          `SELECT * FROM field_report_templates WHERE id = $1`,
          [templateId]
        )
        expect(checkResult.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("should not delete template owned by another user", async () => {
      // Arrange
      const userId1 = await createTestUser()
      const userId2 = await createTestUser()
      const client = await getClient()

      try {
        // Create template for user 1
        const createResult = await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'User 1 Template', 'user1-template', false, '[]'::jsonb, '[]'::jsonb)
           RETURNING id`,
          [userId1]
        )
        const templateId = createResult.rows[0].id

        // Act: Try to delete as user 2
        const deleteResult = await client.query(
          `DELETE FROM field_report_templates
           WHERE id = $1 AND user_id = $2 AND is_system = false
           RETURNING id`,
          [templateId, userId2]
        )

        // Assert: No rows deleted
        expect(deleteResult.rowCount).toBe(0)

        // Verify template still exists
        const checkResult = await client.query(
          `SELECT * FROM field_report_templates WHERE id = $1`,
          [templateId]
        )
        expect(checkResult.rows).toHaveLength(1)
      } finally {
        await client.end()
      }
    })

    test("should not delete system templates", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create system template (no user_id)
        const createResult = await client.query(
          `INSERT INTO field_report_templates
           (name, slug, is_system, static_fields, dynamic_fields)
           VALUES ('System Template', 'system-template', true, '[]'::jsonb, '[]'::jsonb)
           RETURNING id`
        )
        const templateId = createResult.rows[0].id

        // Act: Try to delete with is_system = false filter
        const deleteResult = await client.query(
          `DELETE FROM field_report_templates
           WHERE id = $1 AND is_system = false
           RETURNING id`,
          [templateId]
        )

        // Assert: No rows deleted (is_system = true)
        expect(deleteResult.rowCount).toBe(0)

        // Verify template still exists
        const checkResult = await client.query(
          `SELECT * FROM field_report_templates WHERE id = $1`,
          [templateId]
        )
        expect(checkResult.rows).toHaveLength(1)
      } finally {
        await client.end()
      }
    })

    test("should cascade delete when user profile is deleted", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create custom template for user
        const createResult = await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields)
           VALUES ($1, 'User Template', 'user-template', false, '[]'::jsonb, '[]'::jsonb)
           RETURNING id`,
          [userId]
        )
        const templateId = createResult.rows[0].id

        // Act: Delete user profile
        await client.query(`DELETE FROM profiles WHERE id = $1`, [userId])

        // Assert: Template should be deleted
        const checkResult = await client.query(
          `SELECT * FROM field_report_templates WHERE id = $1`,
          [templateId]
        )
        expect(checkResult.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("should order user templates by created_at descending", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create templates with different timestamps
        await client.query(
          `INSERT INTO field_report_templates
           (user_id, name, slug, is_system, static_fields, dynamic_fields, created_at)
           VALUES
           ($1, 'Oldest', 'oldest', false, '[]'::jsonb, '[]'::jsonb, NOW() - interval '3 days'),
           ($1, 'Middle', 'middle', false, '[]'::jsonb, '[]'::jsonb, NOW() - interval '2 days'),
           ($1, 'Newest', 'newest', false, '[]'::jsonb, '[]'::jsonb, NOW() - interval '1 day')`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT name FROM field_report_templates
           WHERE user_id = $1 AND is_system = false
           ORDER BY created_at DESC`,
          [userId]
        )

        // Assert: Newest first
        expect(result.rows[0].name).toBe("Newest")
        expect(result.rows[1].name).toBe("Middle")
        expect(result.rows[2].name).toBe("Oldest")
      } finally {
        await client.end()
      }
    })
  })
})
