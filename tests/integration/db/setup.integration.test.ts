/**
 * Verification test for testcontainers setup.
 * Ensures the database container is running and schema is loaded.
 */

import { describe, test, expect, beforeEach } from "vitest"
import {
  getClient,
  truncateAllTables,
} from "../setup"

describe("Testcontainers Setup", () => {
  beforeEach(async () => {
    // Arrange: Clean slate for each test
    await truncateAllTables()
  })

  test("should connect to database and run simple query", async () => {
    // Arrange
    const client = await getClient()

    try {
      // Act
      const result = await client.query("SELECT 1 as value")

      // Assert
      expect(result.rows[0].value).toBe(1)
    } finally {
      await client.end()
    }
  })

  test("should have all required tables", async () => {
    // Arrange
    const client = await getClient()
    const expectedTables = [
      "profiles",
      "purchases",
      "scenarios",
      "value_comparisons",
      "inner_game_progress",
      "sessions",
      "approaches",
      "field_report_templates",
      "field_reports",
      "review_templates",
      "reviews",
      "user_tracking_stats",
      "milestones",
      "sticking_points",
    ]

    try {
      // Act
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `)
      const tableNames = result.rows.map((row) => row.table_name)

      // Assert
      for (const table of expectedTables) {
        expect(tableNames).toContain(table)
      }
    } finally {
      await client.end()
    }
  })

  test("should create test user", async () => {
    // Arrange
    const client = await getClient()

    try {
      // Act: Create user directly with client
      const result = await client.query(`
        INSERT INTO profiles (id, email, has_purchased, onboarding_completed)
        VALUES (gen_random_uuid(), 'test@example.com', false, false)
        RETURNING id, email
      `)
      const userId = result.rows[0].id

      // Assert
      expect(userId).toBeDefined()
      expect(typeof userId).toBe("string")
      expect(result.rows[0].email).toBe("test@example.com")
    } finally {
      await client.end()
    }
  })

  test("should create user tracking stats", async () => {
    // Arrange & Act: Use single client for all operations
    const client = await getClient()

    try {
      // Create user
      const userResult = await client.query(`
        INSERT INTO profiles (id, email, has_purchased, onboarding_completed)
        VALUES (gen_random_uuid(), 'test@example.com', false, false)
        RETURNING id
      `)
      const userId = userResult.rows[0].id

      // Create stats
      await client.query(`
        INSERT INTO user_tracking_stats (user_id)
        VALUES ($1)
      `, [userId])

      // Assert: Query stats
      const statsResult = await client.query(
        "SELECT total_approaches FROM user_tracking_stats WHERE user_id = $1",
        [userId]
      )
      expect(statsResult.rows).toHaveLength(1)
      expect(statsResult.rows[0].total_approaches).toBe(0)
    } finally {
      await client.end()
    }
  })

  test("should truncate all tables correctly", async () => {
    // Arrange: Use single client for all operations
    const client = await getClient()

    try {
      // Create some data
      const userResult = await client.query(`
        INSERT INTO profiles (id, email, has_purchased, onboarding_completed)
        VALUES (gen_random_uuid(), 'test@example.com', false, false)
        RETURNING id
      `)
      const userId = userResult.rows[0].id

      await client.query(`
        INSERT INTO user_tracking_stats (user_id)
        VALUES ($1)
      `, [userId])

      await client.query(
        `INSERT INTO sessions (user_id, started_at) VALUES ($1, NOW())`,
        [userId]
      )

      // Verify data exists
      const beforeCount = await client.query("SELECT COUNT(*) FROM sessions")
      expect(parseInt(beforeCount.rows[0].count)).toBe(1)
    } finally {
      await client.end()
    }

    // Act: Truncate all tables
    await truncateAllTables()

    // Assert: All tables should be empty
    const verifyClient = await getClient()
    try {
      const profilesResult = await verifyClient.query("SELECT COUNT(*) FROM profiles")
      const sessionsResult = await verifyClient.query("SELECT COUNT(*) FROM sessions")
      const statsResult = await verifyClient.query("SELECT COUNT(*) FROM user_tracking_stats")

      expect(parseInt(profilesResult.rows[0].count)).toBe(0)
      expect(parseInt(sessionsResult.rows[0].count)).toBe(0)
      expect(parseInt(statsResult.rows[0].count)).toBe(0)
    } finally {
      await verifyClient.end()
    }
  })
})
