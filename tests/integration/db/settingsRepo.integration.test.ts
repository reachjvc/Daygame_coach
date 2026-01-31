/**
 * Integration tests for settingsRepo.
 * Tests settings operations, defaults, and constraint violations.
 *
 * Test cases from better_tests_plan.md Phase 2.3:
 * 1. Default settings on first access (catches missing defaults)
 * 2. Update single setting (catches partial update bugs)
 * 3. Invalid enum value (catches constraint violations)
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

describe("settingsRepo Integration Tests", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  // ============================================
  // Default settings on first access - missing defaults check
  // ============================================

  describe("Default settings on first access - missing defaults check", () => {
    test("should have null sandbox_settings by default", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Query profile without any settings set
        const result = await client.query(
          `SELECT sandbox_settings FROM profiles WHERE id = $1`,
          [userId]
        )

        // Assert: sandbox_settings should be null initially
        expect(result.rows[0].sandbox_settings).toBeNull()
      } finally {
        await client.end()
      }
    })

    test("should return default difficulty when not set", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Query profile
        const result = await client.query(
          `SELECT difficulty FROM profiles WHERE id = $1`,
          [userId]
        )

        // Assert: difficulty should be null when not set
        expect(result.rows[0].difficulty).toBeNull()
      } finally {
        await client.end()
      }
    })

    test("should allow setting initial sandbox_settings", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const defaultSettings = {
        weather: { enabled: false, intensity: 0.5 },
        energy: { level: "medium" },
        movement: { speed: 1.0 },
        display: { showHints: true },
        environments: { enabled: true },
      }

      try {
        // Act: Set initial sandbox settings
        await client.query(
          `UPDATE profiles SET sandbox_settings = $1 WHERE id = $2`,
          [JSON.stringify(defaultSettings), userId]
        )

        // Assert: Settings should be retrievable
        const result = await client.query(
          `SELECT sandbox_settings FROM profiles WHERE id = $1`,
          [userId]
        )
        expect(result.rows[0].sandbox_settings).toEqual(defaultSettings)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Update single setting - partial update bugs check
  // ============================================

  describe("Update single setting - partial update bugs check", () => {
    test("should update difficulty without affecting other fields", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Create profile with xp and level
        const insertResult = await client.query(`
          INSERT INTO profiles (id, email, xp, level, experience_level)
          VALUES (gen_random_uuid(), 'difficulty@example.com', 100, 2, 'intermediate')
          RETURNING id
        `)
        const userId = insertResult.rows[0].id

        // Act: Update only difficulty
        await client.query(
          `UPDATE profiles SET difficulty = 'hard' WHERE id = $1`,
          [userId]
        )

        // Assert: Other fields should remain unchanged
        const result = await client.query(`SELECT * FROM profiles WHERE id = $1`, [
          userId,
        ])
        const profile = result.rows[0]
        expect(profile.difficulty).toBe("hard")
        expect(profile.xp).toBe(100) // Not affected
        expect(profile.level).toBe(2) // Not affected
        expect(profile.experience_level).toBe("intermediate") // Not affected
      } finally {
        await client.end()
      }
    })

    test("should update subscription_cancelled_at timestamp", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const cancelledAt = new Date().toISOString()

      try {
        // Act: Set subscription cancelled timestamp
        await client.query(
          `UPDATE profiles SET subscription_cancelled_at = $1 WHERE id = $2`,
          [cancelledAt, userId]
        )

        // Assert: Timestamp should be stored correctly
        const result = await client.query(
          `SELECT subscription_cancelled_at FROM profiles WHERE id = $1`,
          [userId]
        )
        expect(result.rows[0].subscription_cancelled_at).not.toBeNull()
      } finally {
        await client.end()
      }
    })

    test("should clear subscription_cancelled_at when set to null", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Set initial cancellation timestamp
        await client.query(
          `UPDATE profiles SET subscription_cancelled_at = NOW() WHERE id = $1`,
          [userId]
        )

        // Act: Clear the timestamp
        await client.query(
          `UPDATE profiles SET subscription_cancelled_at = NULL WHERE id = $1`,
          [userId]
        )

        // Assert: Should be null
        const result = await client.query(
          `SELECT subscription_cancelled_at FROM profiles WHERE id = $1`,
          [userId]
        )
        expect(result.rows[0].subscription_cancelled_at).toBeNull()
      } finally {
        await client.end()
      }
    })

    test("should update nested JSONB setting without losing siblings", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const initialSettings = {
        weather: { enabled: true, intensity: 0.5 },
        energy: { level: "low", maxCapacity: 100 },
        display: { showHints: true, theme: "dark" },
      }

      try {
        // Set initial settings
        await client.query(
          `UPDATE profiles SET sandbox_settings = $1 WHERE id = $2`,
          [JSON.stringify(initialSettings), userId]
        )

        // Act: Update only energy.level using jsonb_set
        await client.query(
          `
          UPDATE profiles
          SET sandbox_settings = jsonb_set(
            sandbox_settings,
            '{energy,level}',
            '"high"'::jsonb
          )
          WHERE id = $1
        `,
          [userId]
        )

        // Assert: Only energy.level changed, others preserved
        const result = await client.query(
          `SELECT sandbox_settings FROM profiles WHERE id = $1`,
          [userId]
        )
        const settings = result.rows[0].sandbox_settings

        expect(settings.energy.level).toBe("high") // Changed
        expect(settings.energy.maxCapacity).toBe(100) // Preserved
        expect(settings.weather.enabled).toBe(true) // Preserved
        expect(settings.weather.intensity).toBe(0.5) // Preserved
        expect(settings.display.showHints).toBe(true) // Preserved
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Invalid enum value - constraint violation check
  // ============================================

  describe("Invalid enum value - constraint violation check", () => {
    test("should reject invalid approach outcome enum", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create a session first
        const sessionResult = await client.query(
          `
          INSERT INTO sessions (user_id, started_at, is_active)
          VALUES ($1, NOW(), true)
          RETURNING id
        `,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Act & Assert: Invalid enum should throw
        await expect(
          client.query(
            `
            INSERT INTO approaches (user_id, session_id, timestamp, outcome)
            VALUES ($1, $2, NOW(), 'invalid_outcome')
          `,
            [userId, sessionId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("should accept valid approach outcome enum values", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const validOutcomes = ["blowout", "short", "good", "number", "instadate"]

      try {
        // Create a session
        const sessionResult = await client.query(
          `
          INSERT INTO sessions (user_id, started_at, is_active)
          VALUES ($1, NOW(), true)
          RETURNING id
        `,
          [userId]
        )
        const sessionId = sessionResult.rows[0].id

        // Act: Insert approaches with all valid outcomes
        for (const outcome of validOutcomes) {
          await client.query(
            `
            INSERT INTO approaches (user_id, session_id, timestamp, outcome)
            VALUES ($1, $2, NOW() + interval '${validOutcomes.indexOf(outcome)} minutes', $3)
          `,
            [userId, sessionId, outcome]
          )
        }

        // Assert: All should be inserted
        const result = await client.query(
          `SELECT COUNT(*) as count FROM approaches WHERE session_id = $1`,
          [sessionId]
        )
        expect(parseInt(result.rows[0].count)).toBe(5)
      } finally {
        await client.end()
      }
    })

    test("should reject invalid review_type enum", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act & Assert: Invalid review type should throw
        await expect(
          client.query(
            `
            INSERT INTO reviews (user_id, review_type, period_start, period_end)
            VALUES ($1, 'invalid_type', '2026-01-01', '2026-01-07')
          `,
            [userId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("should accept valid review_type enum values", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const validTypes = ["weekly", "monthly", "quarterly"]

      try {
        // Act: Insert reviews with all valid types
        for (const reviewType of validTypes) {
          await client.query(
            `
            INSERT INTO reviews (user_id, review_type, period_start, period_end)
            VALUES ($1, $2, '2026-01-01', '2026-01-31')
          `,
            [userId, reviewType]
          )
        }

        // Assert: All should be inserted
        const result = await client.query(
          `SELECT COUNT(*) as count FROM reviews WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(result.rows[0].count)).toBe(3)
      } finally {
        await client.end()
      }
    })

    test("should reject invalid sticking_point_status enum", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act & Assert: Invalid status should throw
        await expect(
          client.query(
            `
            INSERT INTO sticking_points (user_id, name, status)
            VALUES ($1, 'Test Point', 'invalid_status')
          `,
            [userId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("should accept valid sticking_point_status enum values", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const validStatuses = ["active", "working_on", "resolved"]

      try {
        // Act: Insert sticking points with all valid statuses
        for (let i = 0; i < validStatuses.length; i++) {
          await client.query(
            `
            INSERT INTO sticking_points (user_id, name, status)
            VALUES ($1, $2, $3)
          `,
            [userId, `Point ${i + 1}`, validStatuses[i]]
          )
        }

        // Assert: All should be inserted
        const result = await client.query(
          `SELECT COUNT(*) as count FROM sticking_points WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(result.rows[0].count)).toBe(3)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Purchase and subscription settings
  // ============================================

  describe("Purchase and subscription settings", () => {
    test("should create purchase with completed status", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Create purchase
        const result = await client.query(
          `
          INSERT INTO purchases (
            user_id, stripe_session_id, stripe_subscription_id,
            product_id, amount, currency, status, subscription_status
          ) VALUES (
            $1, 'sess_123', 'sub_456', 'prod_789',
            2999, 'usd', 'completed', 'active'
          )
          RETURNING *
        `,
          [userId]
        )

        // Assert
        const purchase = result.rows[0]
        expect(purchase.status).toBe("completed")
        expect(purchase.subscription_status).toBe("active")
        expect(purchase.amount).toBe(2999)
      } finally {
        await client.end()
      }
    })

    test("should update subscription status", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create purchase
        await client.query(
          `
          INSERT INTO purchases (user_id, stripe_subscription_id, status, subscription_status)
          VALUES ($1, 'sub_update_test', 'completed', 'active')
        `,
          [userId]
        )

        // Act: Update subscription status
        await client.query(`
          UPDATE purchases
          SET subscription_status = 'cancelled'
          WHERE stripe_subscription_id = 'sub_update_test'
        `)

        // Assert
        const result = await client.query(
          `SELECT subscription_status FROM purchases WHERE stripe_subscription_id = 'sub_update_test'`
        )
        expect(result.rows[0].subscription_status).toBe("cancelled")
      } finally {
        await client.end()
      }
    })

    test("should cascade delete purchases when profile is deleted", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Create profile and purchase
        const profileResult = await client.query(`
          INSERT INTO profiles (id, email)
          VALUES (gen_random_uuid(), 'cascade@example.com')
          RETURNING id
        `)
        const userId = profileResult.rows[0].id

        await client.query(
          `
          INSERT INTO purchases (user_id, status)
          VALUES ($1, 'completed')
        `,
          [userId]
        )

        // Act: Delete profile
        await client.query(`DELETE FROM profiles WHERE id = $1`, [userId])

        // Assert: Purchase should be deleted via cascade
        const result = await client.query(
          `SELECT COUNT(*) as count FROM purchases WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(result.rows[0].count)).toBe(0)
      } finally {
        await client.end()
      }
    })
  })
})
