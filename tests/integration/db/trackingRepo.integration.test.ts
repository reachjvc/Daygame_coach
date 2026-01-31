/**
 * Integration tests for trackingRepo database operations.
 * Uses testcontainers to run against a real PostgreSQL database.
 *
 * Note: These tests directly test SQL operations, not the Supabase client wrapper.
 * This validates the business logic and SQL correctness independently.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest"
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestData,
  getTestClient,
} from "../setup"

// Increase timeout for container startup
const TEST_TIMEOUT = 60000

describe("trackingRepo integration tests", () => {
  beforeAll(async () => {
    await setupTestDatabase()
  }, TEST_TIMEOUT)

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestData()
  })

  // ============================================
  // Sessions
  // ============================================

  describe("sessions", () => {
    const testUserId = "550e8400-e29b-41d4-a716-446655440000"

    test("should create a session", async () => {
      // Arrange
      const client = getTestClient()

      // Act
      const result = await client.query(
        `INSERT INTO sessions (user_id, goal, primary_location)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [testUserId, 10, "Copenhagen"]
      )

      // Assert
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].user_id).toBe(testUserId)
      expect(result.rows[0].goal).toBe(10)
      expect(result.rows[0].primary_location).toBe("Copenhagen")
      expect(result.rows[0].is_active).toBe(true)
      expect(result.rows[0].total_approaches).toBe(0)
    })

    test("should get session by id", async () => {
      // Arrange
      const client = getTestClient()
      const insertResult = await client.query(
        `INSERT INTO sessions (user_id, goal) VALUES ($1, $2) RETURNING id`,
        [testUserId, 5]
      )
      const sessionId = insertResult.rows[0].id

      // Act
      const result = await client.query(
        `SELECT * FROM sessions WHERE id = $1`,
        [sessionId]
      )

      // Assert
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].id).toBe(sessionId)
    })

    test("should get active session for user", async () => {
      // Arrange
      const client = getTestClient()
      // Create inactive session
      await client.query(
        `INSERT INTO sessions (user_id, is_active) VALUES ($1, false)`,
        [testUserId]
      )
      // Create active session
      const activeResult = await client.query(
        `INSERT INTO sessions (user_id, is_active) VALUES ($1, true) RETURNING id`,
        [testUserId]
      )

      // Act
      const result = await client.query(
        `SELECT * FROM sessions
         WHERE user_id = $1 AND is_active = true
         ORDER BY started_at DESC
         LIMIT 1`,
        [testUserId]
      )

      // Assert
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].id).toBe(activeResult.rows[0].id)
    })

    test("should update session", async () => {
      // Arrange
      const client = getTestClient()
      const insertResult = await client.query(
        `INSERT INTO sessions (user_id) VALUES ($1) RETURNING id`,
        [testUserId]
      )
      const sessionId = insertResult.rows[0].id

      // Act
      const result = await client.query(
        `UPDATE sessions
         SET goal = $2, total_approaches = $3, is_active = $4
         WHERE id = $1
         RETURNING *`,
        [sessionId, 15, 8, false]
      )

      // Assert
      expect(result.rows[0].goal).toBe(15)
      expect(result.rows[0].total_approaches).toBe(8)
      expect(result.rows[0].is_active).toBe(false)
    })

    test("should end session with duration calculation", async () => {
      // Arrange
      const client = getTestClient()
      const startTime = new Date()
      startTime.setMinutes(startTime.getMinutes() - 60) // 1 hour ago

      const insertResult = await client.query(
        `INSERT INTO sessions (user_id, started_at, is_active)
         VALUES ($1, $2, true)
         RETURNING id`,
        [testUserId, startTime.toISOString()]
      )
      const sessionId = insertResult.rows[0].id

      // Act
      const endTime = new Date()
      const result = await client.query(
        `UPDATE sessions
         SET ended_at = $2, is_active = false,
             duration_minutes = EXTRACT(EPOCH FROM ($2::timestamptz - started_at)) / 60
         WHERE id = $1
         RETURNING *`,
        [sessionId, endTime.toISOString()]
      )

      // Assert
      expect(result.rows[0].is_active).toBe(false)
      expect(result.rows[0].ended_at).not.toBeNull()
      expect(result.rows[0].duration_minutes).toBeGreaterThan(55)
      expect(result.rows[0].duration_minutes).toBeLessThan(65)
    })

    test("should delete session and cascade to approaches", async () => {
      // Arrange
      const client = getTestClient()
      const sessionResult = await client.query(
        `INSERT INTO sessions (user_id) VALUES ($1) RETURNING id`,
        [testUserId]
      )
      const sessionId = sessionResult.rows[0].id

      await client.query(
        `INSERT INTO approaches (user_id, session_id) VALUES ($1, $2)`,
        [testUserId, sessionId]
      )

      // Act
      await client.query(`DELETE FROM sessions WHERE id = $1`, [sessionId])

      // Assert
      const sessionCheck = await client.query(
        `SELECT * FROM sessions WHERE id = $1`,
        [sessionId]
      )
      const approachCheck = await client.query(
        `SELECT * FROM approaches WHERE session_id = $1`,
        [sessionId]
      )

      expect(sessionCheck.rows).toHaveLength(0)
      expect(approachCheck.rows).toHaveLength(0)
    })
  })

  // ============================================
  // Approaches
  // ============================================

  describe("approaches", () => {
    const testUserId = "550e8400-e29b-41d4-a716-446655440001"

    test("should create an approach without session", async () => {
      // Arrange
      const client = getTestClient()

      // Act
      const result = await client.query(
        `INSERT INTO approaches (user_id, outcome, mood, note)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [testUserId, "good", 4, "Great conversation"]
      )

      // Assert
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].outcome).toBe("good")
      expect(result.rows[0].mood).toBe(4)
      expect(result.rows[0].note).toBe("Great conversation")
      expect(result.rows[0].session_id).toBeNull()
    })

    test("should create an approach with session", async () => {
      // Arrange
      const client = getTestClient()
      const sessionResult = await client.query(
        `INSERT INTO sessions (user_id) VALUES ($1) RETURNING id`,
        [testUserId]
      )
      const sessionId = sessionResult.rows[0].id

      // Act
      const result = await client.query(
        `INSERT INTO approaches (user_id, session_id, outcome)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [testUserId, sessionId, "number"]
      )

      // Assert
      expect(result.rows[0].session_id).toBe(sessionId)
      expect(result.rows[0].outcome).toBe("number")
    })

    test("should update approach outcome", async () => {
      // Arrange
      const client = getTestClient()
      const insertResult = await client.query(
        `INSERT INTO approaches (user_id, outcome) VALUES ($1, $2) RETURNING id`,
        [testUserId, "short"]
      )
      const approachId = insertResult.rows[0].id

      // Act
      const result = await client.query(
        `UPDATE approaches SET outcome = $2 WHERE id = $1 RETURNING *`,
        [approachId, "good"]
      )

      // Assert
      expect(result.rows[0].outcome).toBe("good")
    })

    test("should get approaches for session ordered by timestamp", async () => {
      // Arrange
      const client = getTestClient()
      const sessionResult = await client.query(
        `INSERT INTO sessions (user_id) VALUES ($1) RETURNING id`,
        [testUserId]
      )
      const sessionId = sessionResult.rows[0].id

      // Insert approaches with different timestamps
      await client.query(
        `INSERT INTO approaches (user_id, session_id, timestamp, outcome)
         VALUES
           ($1, $2, NOW() - INTERVAL '30 minutes', 'blowout'),
           ($1, $2, NOW() - INTERVAL '20 minutes', 'short'),
           ($1, $2, NOW() - INTERVAL '10 minutes', 'good')`,
        [testUserId, sessionId]
      )

      // Act
      const result = await client.query(
        `SELECT * FROM approaches
         WHERE session_id = $1
         ORDER BY timestamp ASC`,
        [sessionId]
      )

      // Assert
      expect(result.rows).toHaveLength(3)
      expect(result.rows[0].outcome).toBe("blowout")
      expect(result.rows[1].outcome).toBe("short")
      expect(result.rows[2].outcome).toBe("good")
    })

    test("should store and retrieve tags array", async () => {
      // Arrange
      const client = getTestClient()
      const tags = ["blonde", "tall", "tourist"]

      // Act
      const result = await client.query(
        `INSERT INTO approaches (user_id, tags)
         VALUES ($1, $2)
         RETURNING *`,
        [testUserId, tags]
      )

      // Assert
      expect(result.rows[0].tags).toEqual(tags)
    })

    test("should store coordinates", async () => {
      // Arrange
      const client = getTestClient()
      const lat = 55.6761
      const lng = 12.5683

      // Act
      const result = await client.query(
        `INSERT INTO approaches (user_id, latitude, longitude)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [testUserId, lat, lng]
      )

      // Assert
      expect(result.rows[0].latitude).toBeCloseTo(lat, 4)
      expect(result.rows[0].longitude).toBeCloseTo(lng, 4)
    })

    test("should enforce mood range constraint", async () => {
      // Arrange
      const client = getTestClient()

      // Act & Assert
      await expect(
        client.query(
          `INSERT INTO approaches (user_id, mood) VALUES ($1, $2)`,
          [testUserId, 6]
        )
      ).rejects.toThrow()
    })
  })

  // ============================================
  // User Tracking Stats
  // ============================================

  describe("user_tracking_stats", () => {
    const testUserId = "550e8400-e29b-41d4-a716-446655440002"

    test("should create stats for new user", async () => {
      // Arrange
      const client = getTestClient()

      // Act
      const result = await client.query(
        `INSERT INTO user_tracking_stats (user_id)
         VALUES ($1)
         RETURNING *`,
        [testUserId]
      )

      // Assert
      expect(result.rows[0].user_id).toBe(testUserId)
      expect(result.rows[0].total_approaches).toBe(0)
      expect(result.rows[0].total_sessions).toBe(0)
      expect(result.rows[0].current_streak).toBe(0)
    })

    test("should update stats atomically", async () => {
      // Arrange
      const client = getTestClient()
      await client.query(
        `INSERT INTO user_tracking_stats (user_id, total_approaches, total_numbers)
         VALUES ($1, 10, 2)`,
        [testUserId]
      )

      // Act
      const result = await client.query(
        `UPDATE user_tracking_stats
         SET total_approaches = total_approaches + 1,
             total_numbers = total_numbers + 1
         WHERE user_id = $1
         RETURNING *`,
        [testUserId]
      )

      // Assert
      expect(result.rows[0].total_approaches).toBe(11)
      expect(result.rows[0].total_numbers).toBe(3)
    })

    test("should track weekly stats", async () => {
      // Arrange
      const client = getTestClient()

      // Act
      const result = await client.query(
        `INSERT INTO user_tracking_stats
           (user_id, current_week, current_week_sessions, current_week_approaches)
         VALUES ($1, '2026-W05', 3, 15)
         RETURNING *`,
        [testUserId]
      )

      // Assert
      expect(result.rows[0].current_week).toBe("2026-W05")
      expect(result.rows[0].current_week_sessions).toBe(3)
      expect(result.rows[0].current_week_approaches).toBe(15)
    })

    test("should track unique locations as array", async () => {
      // Arrange
      const client = getTestClient()
      await client.query(
        `INSERT INTO user_tracking_stats (user_id) VALUES ($1)`,
        [testUserId]
      )

      // Act
      const result = await client.query(
        `UPDATE user_tracking_stats
         SET unique_locations = array_append(unique_locations, $2)
         WHERE user_id = $1
         RETURNING *`,
        [testUserId, "Copenhagen"]
      )

      // Assert
      expect(result.rows[0].unique_locations).toContain("Copenhagen")
    })
  })

  // ============================================
  // Milestones
  // ============================================

  describe("milestones", () => {
    const testUserId = "550e8400-e29b-41d4-a716-446655440003"

    test("should create milestone", async () => {
      // Arrange
      const client = getTestClient()

      // Act
      const result = await client.query(
        `INSERT INTO milestones (user_id, milestone_type)
         VALUES ($1, $2)
         RETURNING *`,
        [testUserId, "first_approach"]
      )

      // Assert
      expect(result.rows[0].user_id).toBe(testUserId)
      expect(result.rows[0].milestone_type).toBe("first_approach")
      expect(result.rows[0].achieved_at).not.toBeNull()
    })

    test("should enforce unique constraint on user+milestone_type", async () => {
      // Arrange
      const client = getTestClient()
      await client.query(
        `INSERT INTO milestones (user_id, milestone_type) VALUES ($1, $2)`,
        [testUserId, "first_number"]
      )

      // Act & Assert
      await expect(
        client.query(
          `INSERT INTO milestones (user_id, milestone_type) VALUES ($1, $2)`,
          [testUserId, "first_number"]
        )
      ).rejects.toThrow()
    })

    test("should get milestones ordered by achieved_at", async () => {
      // Arrange
      const client = getTestClient()
      await client.query(
        `INSERT INTO milestones (user_id, milestone_type, achieved_at)
         VALUES
           ($1, 'first_approach', NOW() - INTERVAL '3 days'),
           ($1, '5_approaches', NOW() - INTERVAL '2 days'),
           ($1, '10_approaches', NOW() - INTERVAL '1 day')`,
        [testUserId]
      )

      // Act
      const result = await client.query(
        `SELECT * FROM milestones
         WHERE user_id = $1
         ORDER BY achieved_at DESC`,
        [testUserId]
      )

      // Assert
      expect(result.rows).toHaveLength(3)
      expect(result.rows[0].milestone_type).toBe("10_approaches")
      expect(result.rows[2].milestone_type).toBe("first_approach")
    })
  })

  // ============================================
  // Field Reports
  // ============================================

  describe("field_reports", () => {
    const testUserId = "550e8400-e29b-41d4-a716-446655440004"

    test("should create field report with JSON fields", async () => {
      // Arrange
      const client = getTestClient()
      const fields = {
        title: "Great Session",
        highlights: ["Got a number", "Good vibe"],
        rating: 8,
      }

      // Act
      const result = await client.query(
        `INSERT INTO field_reports (user_id, fields, approach_count, location)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [testUserId, JSON.stringify(fields), 5, "Copenhagen"]
      )

      // Assert
      expect(result.rows[0].fields).toEqual(fields)
      expect(result.rows[0].approach_count).toBe(5)
      expect(result.rows[0].is_draft).toBe(false)
    })

    test("should get non-draft reports for user", async () => {
      // Arrange
      const client = getTestClient()
      await client.query(
        `INSERT INTO field_reports (user_id, fields, is_draft)
         VALUES
           ($1, '{}', false),
           ($1, '{}', true),
           ($1, '{}', false)`,
        [testUserId]
      )

      // Act
      const result = await client.query(
        `SELECT * FROM field_reports
         WHERE user_id = $1 AND is_draft = false`,
        [testUserId]
      )

      // Assert
      expect(result.rows).toHaveLength(2)
    })
  })

  // ============================================
  // Reviews
  // ============================================

  describe("reviews", () => {
    const testUserId = "550e8400-e29b-41d4-a716-446655440005"

    test("should create weekly review", async () => {
      // Arrange
      const client = getTestClient()
      const fields = { wins: ["Got 2 numbers"], areas_to_improve: ["Open faster"] }

      // Act
      const result = await client.query(
        `INSERT INTO reviews
           (user_id, review_type, fields, period_start, period_end, new_commitment)
         VALUES ($1, 'weekly', $2, $3, $4, $5)
         RETURNING *`,
        [
          testUserId,
          JSON.stringify(fields),
          "2026-01-20T00:00:00Z",
          "2026-01-26T23:59:59Z",
          "Approach 10 women this week",
        ]
      )

      // Assert
      expect(result.rows[0].review_type).toBe("weekly")
      expect(result.rows[0].fields).toEqual(fields)
      expect(result.rows[0].new_commitment).toBe("Approach 10 women this week")
    })

    test("should get latest commitment", async () => {
      // Arrange
      const client = getTestClient()
      await client.query(
        `INSERT INTO reviews
           (user_id, review_type, fields, period_start, period_end, new_commitment, created_at)
         VALUES
           ($1, 'weekly', '{}', '2026-01-13', '2026-01-19', 'Old commitment', NOW() - INTERVAL '2 weeks'),
           ($1, 'weekly', '{}', '2026-01-20', '2026-01-26', 'New commitment', NOW() - INTERVAL '1 week')`,
        [testUserId]
      )

      // Act
      const result = await client.query(
        `SELECT new_commitment FROM reviews
         WHERE user_id = $1 AND is_draft = false AND new_commitment IS NOT NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [testUserId]
      )

      // Assert
      expect(result.rows[0].new_commitment).toBe("New commitment")
    })
  })
})
