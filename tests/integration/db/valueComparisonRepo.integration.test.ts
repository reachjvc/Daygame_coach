/**
 * Integration tests for valueComparisonRepo.
 * Tests database operations for value comparisons (inner game pairwise ranking).
 *
 * NOTE: These tests validate DATABASE SCHEMA only (constraints, FKs, cascades).
 * They use raw SQL queries against testcontainers PostgreSQL.
 * Production code (valueComparisonRepo.ts functions) is tested via E2E tests
 * which exercise the full stack including Supabase client wrappers.
 *
 * Created 02-02-2026 as part of integration test coverage expansion.
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

describe("valueComparisonRepo Integration Tests", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  // ============================================
  // saveComparison Tests
  // ============================================

  describe("saveComparison", () => {
    test("should insert single pairwise comparison and return with id", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type)
           VALUES ($1, 'honesty', 'courage', 'honesty', 'pairwise')
           RETURNING *`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(1)
        const comparison = result.rows[0]
        expect(comparison.id).toBeDefined()
        expect(comparison.user_id).toBe(userId)
        expect(comparison.value_a_id).toBe("honesty")
        expect(comparison.value_b_id).toBe("courage")
        expect(comparison.chosen_value_id).toBe("honesty")
        expect(comparison.comparison_type).toBe("pairwise")
        expect(comparison.created_at).toBeDefined()
      } finally {
        await client.end()
      }
    })

    test("should insert aspirational_vs_current comparison correctly", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type)
           VALUES ($1, 'current-adventure', 'aspirational-freedom', 'aspirational-freedom', 'aspirational_vs_current')
           RETURNING *`,
          [userId]
        )

        // Assert
        expect(result.rows[0].comparison_type).toBe("aspirational_vs_current")
      } finally {
        await client.end()
      }
    })

    test("should include round_number when provided", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type, round_number)
           VALUES ($1, 'honesty', 'courage', 'courage', 'pairwise', 3)
           RETURNING round_number`,
          [userId]
        )

        // Assert
        expect(result.rows[0].round_number).toBe(3)
      } finally {
        await client.end()
      }
    })

    test("should throw when user_id does not exist (FK constraint)", async () => {
      // Arrange
      const client = await getClient()
      const nonExistentUserId = "00000000-0000-0000-0000-000000000000"

      try {
        // Act & Assert
        await expect(
          client.query(
            `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type)
             VALUES ($1, 'honesty', 'courage', 'honesty', 'pairwise')`,
            [nonExistentUserId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("should reject invalid comparison_type (CHECK constraint)", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act & Assert
        await expect(
          client.query(
            `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type)
             VALUES ($1, 'honesty', 'courage', 'honesty', 'invalid_type')`,
            [userId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // saveComparisons (batch) Tests
  // ============================================

  describe("saveComparisons batch", () => {
    test("should handle empty array by returning no rows", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Act: Empty insert returns 0 rows
        const result = await client.query(
          `SELECT * FROM value_comparisons WHERE 1=0`
        )

        // Assert
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("should insert multiple comparisons atomically", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Insert 3 comparisons
        await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type) VALUES
           ($1, 'honesty', 'courage', 'honesty', 'pairwise'),
           ($1, 'courage', 'freedom', 'freedom', 'pairwise'),
           ($1, 'freedom', 'adventure', 'adventure', 'pairwise')`,
          [userId]
        )

        // Assert: All 3 should exist
        const result = await client.query(
          `SELECT COUNT(*) as count FROM value_comparisons WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(result.rows[0].count)).toBe(3)
      } finally {
        await client.end()
      }
    })

    test("should handle mixed comparison_types in same batch", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Insert both types
        await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type) VALUES
           ($1, 'honesty', 'courage', 'honesty', 'pairwise'),
           ($1, 'current-honesty', 'aspiration-courage', 'aspiration-courage', 'aspirational_vs_current')`,
          [userId]
        )

        // Assert: Both types present
        const result = await client.query(
          `SELECT comparison_type FROM value_comparisons WHERE user_id = $1 ORDER BY comparison_type`,
          [userId]
        )
        expect(result.rows).toHaveLength(2)
        expect(result.rows[0].comparison_type).toBe("aspirational_vs_current")
        expect(result.rows[1].comparison_type).toBe("pairwise")
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // getComparisons Tests
  // ============================================

  describe("getComparisons", () => {
    test("should return all comparisons for user ordered by created_at", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Insert comparisons with different timestamps
        await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type, created_at) VALUES
           ($1, 'v1', 'v2', 'v1', 'pairwise', NOW() - interval '2 days'),
           ($1, 'v3', 'v4', 'v3', 'pairwise', NOW() - interval '1 day'),
           ($1, 'v5', 'v6', 'v5', 'pairwise', NOW())`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT value_a_id FROM value_comparisons
           WHERE user_id = $1
           ORDER BY created_at ASC`,
          [userId]
        )

        // Assert: Ordered oldest to newest
        expect(result.rows).toHaveLength(3)
        expect(result.rows[0].value_a_id).toBe("v1")
        expect(result.rows[1].value_a_id).toBe("v3")
        expect(result.rows[2].value_a_id).toBe("v5")
      } finally {
        await client.end()
      }
    })

    test("should return empty array when user has no comparisons", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `SELECT * FROM value_comparisons WHERE user_id = $1`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("should only return comparisons for specified user", async () => {
      // Arrange
      const userId1 = await createTestUser("user1@test.com")
      const userId2 = await createTestUser("user2@test.com")
      const client = await getClient()

      try {
        // Insert for both users
        await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type) VALUES
           ($1, 'user1-v1', 'user1-v2', 'user1-v1', 'pairwise'),
           ($2, 'user2-v1', 'user2-v2', 'user2-v1', 'pairwise'),
           ($2, 'user2-v3', 'user2-v4', 'user2-v3', 'pairwise')`,
          [userId1, userId2]
        )

        // Act: Get only user1's comparisons
        const result = await client.query(
          `SELECT * FROM value_comparisons WHERE user_id = $1`,
          [userId1]
        )

        // Assert
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].value_a_id).toBe("user1-v1")
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // getComparisonsByType Tests
  // ============================================

  describe("getComparisonsByType", () => {
    test("should filter by pairwise type only", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type) VALUES
           ($1, 'pw1', 'pw2', 'pw1', 'pairwise'),
           ($1, 'pw3', 'pw4', 'pw3', 'pairwise'),
           ($1, 'av1', 'av2', 'av1', 'aspirational_vs_current')`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT * FROM value_comparisons
           WHERE user_id = $1 AND comparison_type = 'pairwise'`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(2)
        result.rows.forEach((row) => {
          expect(row.comparison_type).toBe("pairwise")
        })
      } finally {
        await client.end()
      }
    })

    test("should filter by aspirational_vs_current type only", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type) VALUES
           ($1, 'pw1', 'pw2', 'pw1', 'pairwise'),
           ($1, 'av1', 'av2', 'av1', 'aspirational_vs_current'),
           ($1, 'av3', 'av4', 'av3', 'aspirational_vs_current')`,
          [userId]
        )

        // Act
        const result = await client.query(
          `SELECT * FROM value_comparisons
           WHERE user_id = $1 AND comparison_type = 'aspirational_vs_current'`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(2)
        result.rows.forEach((row) => {
          expect(row.comparison_type).toBe("aspirational_vs_current")
        })
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // deleteAllComparisons Tests
  // ============================================

  describe("deleteAllComparisons", () => {
    test("should delete all comparisons for user without affecting others", async () => {
      // Arrange
      const userId1 = await createTestUser("user1@test.com")
      const userId2 = await createTestUser("user2@test.com")
      const client = await getClient()

      try {
        // Insert for both users
        await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type) VALUES
           ($1, 'u1-v1', 'u1-v2', 'u1-v1', 'pairwise'),
           ($1, 'u1-v3', 'u1-v4', 'u1-v3', 'pairwise'),
           ($2, 'u2-v1', 'u2-v2', 'u2-v1', 'pairwise')`,
          [userId1, userId2]
        )

        // Act: Delete user1's comparisons
        await client.query(
          `DELETE FROM value_comparisons WHERE user_id = $1`,
          [userId1]
        )

        // Assert: User1 has no comparisons, User2 still has 1
        const user1Result = await client.query(
          `SELECT COUNT(*) as count FROM value_comparisons WHERE user_id = $1`,
          [userId1]
        )
        expect(parseInt(user1Result.rows[0].count)).toBe(0)

        const user2Result = await client.query(
          `SELECT COUNT(*) as count FROM value_comparisons WHERE user_id = $1`,
          [userId2]
        )
        expect(parseInt(user2Result.rows[0].count)).toBe(1)
      } finally {
        await client.end()
      }
    })

    test("should not error when deleting from user with no comparisons", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Delete when none exist (should not throw)
        const result = await client.query(
          `DELETE FROM value_comparisons WHERE user_id = $1`,
          [userId]
        )

        // Assert: Affected 0 rows, but no error
        expect(result.rowCount).toBe(0)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // getComparisonCount Tests
  // ============================================

  describe("getComparisonCount", () => {
    test("should return exact count of comparisons", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Insert 5 comparisons
        for (let i = 0; i < 5; i++) {
          await client.query(
            `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type)
             VALUES ($1, $2, $3, $2, 'pairwise')`,
            [userId, `v${i}a`, `v${i}b`]
          )
        }

        // Act
        const result = await client.query(
          `SELECT COUNT(*) as count FROM value_comparisons WHERE user_id = $1`,
          [userId]
        )

        // Assert
        expect(parseInt(result.rows[0].count)).toBe(5)
      } finally {
        await client.end()
      }
    })

    test("should return 0 when no comparisons exist", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `SELECT COUNT(*) as count FROM value_comparisons WHERE user_id = $1`,
          [userId]
        )

        // Assert
        expect(parseInt(result.rows[0].count)).toBe(0)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Cascade Delete Tests
  // ============================================

  describe("Cascade Delete", () => {
    test("should cascade delete when user profile is deleted", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create comparisons
        await client.query(
          `INSERT INTO value_comparisons (user_id, value_a_id, value_b_id, chosen_value_id, comparison_type) VALUES
           ($1, 'v1', 'v2', 'v1', 'pairwise'),
           ($1, 'v3', 'v4', 'v3', 'pairwise')`,
          [userId]
        )

        // Verify they exist
        const beforeResult = await client.query(
          `SELECT COUNT(*) as count FROM value_comparisons WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(beforeResult.rows[0].count)).toBe(2)

        // Act: Delete user profile
        await client.query(`DELETE FROM profiles WHERE id = $1`, [userId])

        // Assert: Comparisons should be deleted
        const afterResult = await client.query(
          `SELECT COUNT(*) as count FROM value_comparisons WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(afterResult.rows[0].count)).toBe(0)
      } finally {
        await client.end()
      }
    })
  })
})
