/**
 * Integration tests for scenario persistence.
 * Tests the `scenarios` table schema, constraints, and aggregate queries.
 *
 * These tests verify the DB contract that the badge engine L3s depend on:
 *   l3_scenario_sessions → total rows per user
 *   l3_scenario_types_tried → distinct scenario_type per user
 *   l3_scenario_high_scores → rows with evaluation.score >= 7 per user
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

describe("scenarioRepo Integration Tests", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  // ============================================
  // Insert and Read Back
  // ============================================

  test("insert scenario attempt persists all columns", async () => {
    const userId = await createTestUser("scenario-test@test.com")
    const client = await getClient()

    try {
      const result = await client.query(`
        INSERT INTO scenarios (user_id, scenario_type, user_response, scenario_data, evaluation)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        userId,
        "practice-openers",
        "Hey, I noticed your book — are you into sci-fi?",
        JSON.stringify({ environment: "bookstore", difficulty: "beginner" }),
        JSON.stringify({ score: 8, feedback: "Good situational opener", strengths: ["observational"] }),
      ])

      const row = result.rows[0]
      expect(row.user_id).toBe(userId)
      expect(row.scenario_type).toBe("practice-openers")
      expect(row.user_response).toBe("Hey, I noticed your book — are you into sci-fi?")
      expect(row.scenario_data).toEqual({ environment: "bookstore", difficulty: "beginner" })
      expect(row.evaluation.score).toBe(8)
      expect(row.evaluation.feedback).toBe("Good situational opener")
      expect(row.created_at).toBeTruthy()
    } finally {
      await client.end()
    }
  })

  // ============================================
  // Score Extraction from JSONB
  // ============================================

  test("evaluation JSONB score is queryable", async () => {
    const userId = await createTestUser("score-test@test.com")
    const client = await getClient()

    try {
      await client.query(`
        INSERT INTO scenarios (user_id, scenario_type, evaluation)
        VALUES ($1, 'practice-openers', '{"score": 9, "feedback": "great"}')
      `, [userId])

      const result = await client.query(`
        SELECT (evaluation->>'score')::int AS score
        FROM scenarios
        WHERE user_id = $1
      `, [userId])

      expect(result.rows[0].score).toBe(9)
    } finally {
      await client.end()
    }
  })

  // ============================================
  // Aggregate: totalSessions
  // ============================================

  test("total sessions counts all rows for user", async () => {
    const userId = await createTestUser("sessions-test@test.com")
    const client = await getClient()

    try {
      // Insert 5 scenario attempts
      for (let i = 0; i < 5; i++) {
        await client.query(`
          INSERT INTO scenarios (user_id, scenario_type, evaluation)
          VALUES ($1, $2, $3)
        `, [userId, "practice-openers", JSON.stringify({ score: 5 + i })])
      }

      const result = await client.query(`
        SELECT COUNT(*)::int AS total FROM scenarios WHERE user_id = $1
      `, [userId])

      expect(result.rows[0].total).toBe(5)
    } finally {
      await client.end()
    }
  })

  // ============================================
  // Aggregate: uniqueTypes
  // ============================================

  test("unique types counts distinct scenario_type values", async () => {
    const userId = await createTestUser("types-test@test.com")
    const client = await getClient()

    try {
      const types = ["practice-openers", "keep-it-going", "practice-shittests", "practice-openers"]
      for (const type of types) {
        await client.query(`
          INSERT INTO scenarios (user_id, scenario_type, evaluation)
          VALUES ($1, $2, '{"score": 5}')
        `, [userId, type])
      }

      const result = await client.query(`
        SELECT COUNT(DISTINCT scenario_type)::int AS unique_types
        FROM scenarios
        WHERE user_id = $1
      `, [userId])

      expect(result.rows[0].unique_types).toBe(3) // 4 rows but only 3 distinct types
    } finally {
      await client.end()
    }
  })

  // ============================================
  // Aggregate: highScoreCount
  // ============================================

  test("high score count only includes evaluation.score >= 7", async () => {
    const userId = await createTestUser("highscore-test@test.com")
    const client = await getClient()

    try {
      const scores = [3, 7, 9, null] // null = no evaluation
      for (const score of scores) {
        const evalJson = score !== null ? JSON.stringify({ score }) : null
        await client.query(`
          INSERT INTO scenarios (user_id, scenario_type, evaluation)
          VALUES ($1, 'practice-openers', $2)
        `, [userId, evalJson])
      }

      const result = await client.query(`
        SELECT COUNT(*)::int AS high_scores
        FROM scenarios
        WHERE user_id = $1
          AND (evaluation->>'score')::numeric >= 7
      `, [userId])

      expect(result.rows[0].high_scores).toBe(2) // 7 and 9
    } finally {
      await client.end()
    }
  })

  // ============================================
  // Constraint: user_id FK
  // ============================================

  test("insert with nonexistent user_id fails FK constraint", async () => {
    const client = await getClient()

    try {
      await expect(
        client.query(`
          INSERT INTO scenarios (user_id, scenario_type)
          VALUES ('00000000-0000-0000-0000-000000000000', 'practice-openers')
        `)
      ).rejects.toThrow()
    } finally {
      await client.end()
    }
  })

  // ============================================
  // User Isolation
  // ============================================

  test("aggregates are isolated per user", async () => {
    const userA = await createTestUser("user-a@test.com")
    const userB = await createTestUser("user-b@test.com")
    const client = await getClient()

    try {
      // User A: 3 attempts
      for (let i = 0; i < 3; i++) {
        await client.query(`
          INSERT INTO scenarios (user_id, scenario_type, evaluation)
          VALUES ($1, 'practice-openers', '{"score": 8}')
        `, [userA])
      }

      // User B: 1 attempt
      await client.query(`
        INSERT INTO scenarios (user_id, scenario_type, evaluation)
        VALUES ($1, 'keep-it-going', '{"score": 5}')
      `, [userB])

      // User A should see 3 total, 1 type, 3 high scores
      const resultA = await client.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(DISTINCT scenario_type)::int AS unique_types,
          COUNT(*) FILTER (WHERE (evaluation->>'score')::numeric >= 7)::int AS high_scores
        FROM scenarios WHERE user_id = $1
      `, [userA])

      expect(resultA.rows[0].total).toBe(3)
      expect(resultA.rows[0].unique_types).toBe(1)
      expect(resultA.rows[0].high_scores).toBe(3)

      // User B should see 1 total, 1 type, 0 high scores
      const resultB = await client.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(DISTINCT scenario_type)::int AS unique_types,
          COUNT(*) FILTER (WHERE (evaluation->>'score')::numeric >= 7)::int AS high_scores
        FROM scenarios WHERE user_id = $1
      `, [userB])

      expect(resultB.rows[0].total).toBe(1)
      expect(resultB.rows[0].unique_types).toBe(1)
      expect(resultB.rows[0].high_scores).toBe(0)
    } finally {
      await client.end()
    }
  })
})
