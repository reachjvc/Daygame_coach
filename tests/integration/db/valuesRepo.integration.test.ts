/**
 * Integration tests for valuesRepo.
 * Tests database operations for values reference data and user value selections.
 *
 * NOTE: These tests validate DATABASE SCHEMA only (constraints, FKs, cascades).
 * They use raw SQL queries against testcontainers PostgreSQL.
 * Production code (valuesRepo.ts functions) is tested via E2E tests which
 * exercise the full stack including Supabase client wrappers.
 *
 * Created 02-02-2026 as part of integration test coverage expansion.
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

describe("valuesRepo Integration Tests", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  // Helper to create test values
  async function createTestValues(client: ReturnType<typeof getClient> extends Promise<infer T> ? T : never) {
    const result = await client.query(
      `INSERT INTO values (category, display_name, description) VALUES
       ('core', 'Honesty', 'Being truthful and transparent'),
       ('core', 'Courage', 'Facing fears with bravery'),
       ('aspirational', 'Freedom', 'Living without constraints'),
       ('aspirational', 'Adventure', 'Seeking new experiences')
       RETURNING id, category, display_name`
    )
    return result.rows as Array<{ id: string; category: string; display_name: string }>
  }

  // ============================================
  // listValues Tests
  // ============================================

  describe("listValues", () => {
    test("should return all values with id, category, display_name", async () => {
      // Arrange
      const client = await getClient()

      try {
        await createTestValues(client)

        // Act
        const result = await client.query(
          `SELECT id, category, display_name FROM values`
        )

        // Assert
        expect(result.rows).toHaveLength(4)
        result.rows.forEach((row) => {
          expect(row.id).toBeDefined()
          expect(row.category).toBeDefined()
          expect(["core", "aspirational"]).toContain(row.category)
        })
      } finally {
        await client.end()
      }
    })

    test("should handle null display_name (backward compat)", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Insert value with null display_name
        await client.query(
          `INSERT INTO values (category, display_name) VALUES ('core', NULL)`
        )

        // Act
        const result = await client.query(
          `SELECT id, category, display_name FROM values`
        )

        // Assert
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].display_name).toBeNull()
      } finally {
        await client.end()
      }
    })

    test("should return empty array when no values exist", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `SELECT id, category, display_name FROM values`
        )

        // Assert
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // getUserValueIds Tests
  // ============================================

  describe("getUserValueIds", () => {
    test("should return value IDs for user", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        const values = await createTestValues(client)
        const valueIds = values.slice(0, 2).map((v) => v.id) // Select first 2 values

        // Insert user_values
        for (const valueId of valueIds) {
          await client.query(
            `INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`,
            [userId, valueId]
          )
        }

        // Act
        const result = await client.query(
          `SELECT value_id FROM user_values WHERE user_id = $1`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(2)
        const returnedIds = result.rows.map((r) => r.value_id)
        expect(returnedIds).toContain(valueIds[0])
        expect(returnedIds).toContain(valueIds[1])
      } finally {
        await client.end()
      }
    })

    test("should return empty array when user has no values", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `SELECT value_id FROM user_values WHERE user_id = $1`,
          [userId]
        )

        // Assert
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("should only return values for specified user", async () => {
      // Arrange
      const userId1 = await createTestUser("user1@test.com")
      const userId2 = await createTestUser("user2@test.com")
      const client = await getClient()

      try {
        const values = await createTestValues(client)

        // User1 gets first 2 values
        await client.query(
          `INSERT INTO user_values (user_id, value_id) VALUES ($1, $2), ($1, $3)`,
          [userId1, values[0].id, values[1].id]
        )
        // User2 gets last 2 values
        await client.query(
          `INSERT INTO user_values (user_id, value_id) VALUES ($1, $2), ($1, $3)`,
          [userId2, values[2].id, values[3].id]
        )

        // Act: Get user1's values only
        const result = await client.query(
          `SELECT value_id FROM user_values WHERE user_id = $1`,
          [userId1]
        )

        // Assert
        expect(result.rows).toHaveLength(2)
        const returnedIds = result.rows.map((r) => r.value_id)
        expect(returnedIds).toContain(values[0].id)
        expect(returnedIds).toContain(values[1].id)
        expect(returnedIds).not.toContain(values[2].id)
        expect(returnedIds).not.toContain(values[3].id)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // upsertUserValues Tests
  // ============================================

  describe("upsertUserValues", () => {
    test("should insert new value associations", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        const values = await createTestValues(client)
        const valueIds = values.slice(0, 3).map((v) => v.id)

        // Act: Insert 3 associations
        for (const valueId of valueIds) {
          await client.query(
            `INSERT INTO user_values (user_id, value_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, value_id) DO NOTHING`,
            [userId, valueId]
          )
        }

        // Assert
        const result = await client.query(
          `SELECT COUNT(*) as count FROM user_values WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(result.rows[0].count)).toBe(3)
      } finally {
        await client.end()
      }
    })

    test("should not duplicate on re-insert (upsert)", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        const values = await createTestValues(client)
        const valueId = values[0].id

        // Insert first time
        await client.query(
          `INSERT INTO user_values (user_id, value_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, value_id) DO NOTHING`,
          [userId, valueId]
        )

        // Act: Insert again (should be no-op)
        await client.query(
          `INSERT INTO user_values (user_id, value_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, value_id) DO NOTHING`,
          [userId, valueId]
        )

        // Assert: Still only 1 record
        const result = await client.query(
          `SELECT COUNT(*) as count FROM user_values WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(result.rows[0].count)).toBe(1)
      } finally {
        await client.end()
      }
    })

    test("should enforce unique constraint on user_id + value_id", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        const values = await createTestValues(client)
        const valueId = values[0].id

        // Insert first time
        await client.query(
          `INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`,
          [userId, valueId]
        )

        // Act & Assert: Second insert without ON CONFLICT should fail
        await expect(
          client.query(
            `INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`,
            [userId, valueId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Cascade Delete Tests
  // ============================================

  describe("Cascade Delete", () => {
    test("should cascade delete user_values when profile is deleted", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        const values = await createTestValues(client)

        // Add user values
        await client.query(
          `INSERT INTO user_values (user_id, value_id) VALUES ($1, $2), ($1, $3)`,
          [userId, values[0].id, values[1].id]
        )

        // Verify they exist
        const beforeResult = await client.query(
          `SELECT COUNT(*) as count FROM user_values WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(beforeResult.rows[0].count)).toBe(2)

        // Act: Delete user profile
        await client.query(`DELETE FROM profiles WHERE id = $1`, [userId])

        // Assert: User values should be deleted
        const afterResult = await client.query(
          `SELECT COUNT(*) as count FROM user_values WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(afterResult.rows[0].count)).toBe(0)
      } finally {
        await client.end()
      }
    })

    test("should cascade delete user_values when value is deleted", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        const values = await createTestValues(client)
        const valueToDelete = values[0].id

        // Add user value
        await client.query(
          `INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`,
          [userId, valueToDelete]
        )

        // Act: Delete the value from values table
        await client.query(`DELETE FROM values WHERE id = $1`, [valueToDelete])

        // Assert: User value should be deleted
        const result = await client.query(
          `SELECT COUNT(*) as count FROM user_values WHERE value_id = $1`,
          [valueToDelete]
        )
        expect(parseInt(result.rows[0].count)).toBe(0)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // FK Constraint Tests
  // ============================================

  describe("FK Constraints", () => {
    test("should reject user_values with non-existent user_id", async () => {
      // Arrange
      const client = await getClient()
      const nonExistentUserId = "00000000-0000-0000-0000-000000000000"

      try {
        const values = await createTestValues(client)

        // Act & Assert
        await expect(
          client.query(
            `INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`,
            [nonExistentUserId, values[0].id]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("should reject user_values with non-existent value_id", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const nonExistentValueId = "00000000-0000-0000-0000-000000000000"

      try {
        // Act & Assert
        await expect(
          client.query(
            `INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`,
            [userId, nonExistentValueId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })
  })
})
