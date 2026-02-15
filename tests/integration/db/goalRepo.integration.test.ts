/**
 * Integration tests for goalRepo — SCHEMA TESTS.
 * Tests database schema constraints, cascade behavior, and data consistency
 * for the user_goals table.
 *
 * NOTE: These tests validate DATABASE SCHEMA using raw SQL queries against
 * testcontainers PostgreSQL. They do NOT test production goalRepo.ts functions.
 * Production code paths are tested via E2E.
 *
 * Coverage areas:
 * 1. NOT NULL and FK constraints
 * 2. CASCADE delete behavior (parent→child, profile→goals)
 * 3. template_id consistency after delete-all + recreate
 * 4. Archive/active state defaults and transitions
 * 5. Position ordering
 * 6. Linked metric nullable columns
 */

import { describe, test, expect, beforeEach } from "vitest"
import {
  getClient,
  truncateAllTables,
  createTestUser,
  createTestGoal,
  createTestGoalTree,
} from "../setup"

describe("goalRepo Integration Tests", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  // ============================================
  // 2.1 Schema constraint tests
  // ============================================

  describe("user_goals schema constraints", () => {
    test("2.1a: should reject INSERT without title (NOT NULL)", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act & Assert
        await expect(
          client.query(
            `INSERT INTO user_goals (user_id, category) VALUES ($1, 'custom')`,
            [userId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("2.1b: should reject INSERT without category (NOT NULL)", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act & Assert
        await expect(
          client.query(
            `INSERT INTO user_goals (user_id, title) VALUES ($1, 'My Goal')`,
            [userId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("2.1c: should apply correct default values on INSERT", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `INSERT INTO user_goals (user_id, title, category)
           VALUES ($1, 'Default Test', 'custom')
           RETURNING current_value, is_active, is_archived, tracking_type, period`,
          [userId]
        )

        // Assert
        const row = result.rows[0]
        expect(row.current_value).toBe(0)
        expect(row.is_active).toBe(true)
        expect(row.is_archived).toBe(false)
        expect(row.tracking_type).toBe("counter")
        expect(row.period).toBe("weekly")
      } finally {
        await client.end()
      }
    })

    test("2.1d: should reject INSERT with non-existent user_id (FK violation)", async () => {
      // Arrange
      const fakeUserId = "00000000-0000-0000-0000-000000000000"
      const client = await getClient()

      try {
        // Act & Assert
        await expect(
          client.query(
            `INSERT INTO user_goals (user_id, title, category)
             VALUES ($1, 'Orphan Goal', 'custom')`,
            [fakeUserId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("2.1e: should enforce parent_goal_id self-referential FK", async () => {
      // Arrange
      const userId = await createTestUser()
      const parentId = await createTestGoal(userId, { title: "Parent Goal" })
      const fakeParentId = "00000000-0000-0000-0000-000000000000"
      const client = await getClient()

      try {
        // Act: Valid parent works
        const validResult = await client.query(
          `INSERT INTO user_goals (user_id, title, category, parent_goal_id)
           VALUES ($1, 'Child Goal', 'custom', $2)
           RETURNING id`,
          [userId, parentId]
        )

        // Assert: Valid parent inserts successfully
        expect(validResult.rows).toHaveLength(1)

        // Act & Assert: Non-existent parent throws
        await expect(
          client.query(
            `INSERT INTO user_goals (user_id, title, category, parent_goal_id)
             VALUES ($1, 'Orphan Child', 'custom', $2)`,
            [userId, fakeParentId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // 2.2 CASCADE behavior tests
  // ============================================

  describe("cascade and delete behavior", () => {
    test("2.2a: should delete all user goals when profile is deleted", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestGoal(userId, { title: "Goal 1" })
      await createTestGoal(userId, { title: "Goal 2" })
      const client = await getClient()

      try {
        // Act: Delete the user profile
        await client.query(`DELETE FROM profiles WHERE id = $1`, [userId])

        // Assert: All goals for that user are gone
        const result = await client.query(
          `SELECT COUNT(*)::int AS count FROM user_goals WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].count).toBe(0)
      } finally {
        await client.end()
      }
    })

    test("2.2b: should delete child goals when parent goal is deleted (CASCADE)", async () => {
      // Arrange
      const userId = await createTestUser()
      const { l1Id, l2Id, l3Id } = await createTestGoalTree(userId)
      const client = await getClient()

      try {
        // Act: Delete the L1 parent
        await client.query(`DELETE FROM user_goals WHERE id = $1`, [l1Id])

        // Assert: L2 and L3 children are also deleted
        const result = await client.query(
          `SELECT id FROM user_goals WHERE id = ANY($1)`,
          [[l1Id, l2Id, l3Id]]
        )
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("2.2c: should remove all goals with DELETE WHERE user_id", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestGoal(userId, { title: "Goal A" })
      await createTestGoal(userId, { title: "Goal B" })
      await createTestGoal(userId, { title: "Goal C" })
      const client = await getClient()

      try {
        // Act
        await client.query(`DELETE FROM user_goals WHERE user_id = $1`, [userId])

        // Assert
        const result = await client.query(
          `SELECT COUNT(*)::int AS count FROM user_goals WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].count).toBe(0)
      } finally {
        await client.end()
      }
    })

    test("2.2d: should leave zero orphan rows after deleting L1->L2->L3 tree", async () => {
      // Arrange
      const userId = await createTestUser()
      const { l1Id } = await createTestGoalTree(userId)
      const client = await getClient()

      try {
        // Act: Delete the root — cascade should remove all descendants
        await client.query(`DELETE FROM user_goals WHERE id = $1`, [l1Id])

        // Assert: No user_goals rows remain for this user
        const result = await client.query(
          `SELECT COUNT(*)::int AS count FROM user_goals WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].count).toBe(0)
      } finally {
        await client.end()
      }
    })

    test("2.2e: should delete both children when parent with 2 children is deleted", async () => {
      // Arrange
      const userId = await createTestUser()
      const parentId = await createTestGoal(userId, { title: "Parent" })
      const child1Id = await createTestGoal(userId, {
        title: "Child 1",
        parent_goal_id: parentId,
      })
      const child2Id = await createTestGoal(userId, {
        title: "Child 2",
        parent_goal_id: parentId,
      })
      const client = await getClient()

      try {
        // Act: Delete parent
        await client.query(`DELETE FROM user_goals WHERE id = $1`, [parentId])

        // Assert: Both children gone
        const result = await client.query(
          `SELECT id FROM user_goals WHERE id = ANY($1)`,
          [[parentId, child1Id, child2Id]]
        )
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("2.2f: should preserve parent and sibling when one child is deleted", async () => {
      // Arrange
      const userId = await createTestUser()
      const parentId = await createTestGoal(userId, { title: "Parent" })
      const child1Id = await createTestGoal(userId, {
        title: "Child 1",
        parent_goal_id: parentId,
      })
      const child2Id = await createTestGoal(userId, {
        title: "Child 2",
        parent_goal_id: parentId,
      })
      const client = await getClient()

      try {
        // Act: Delete only child 1
        await client.query(`DELETE FROM user_goals WHERE id = $1`, [child1Id])

        // Assert: Parent and child 2 still exist
        const result = await client.query(
          `SELECT id FROM user_goals WHERE id = ANY($1) ORDER BY title`,
          [[parentId, child1Id, child2Id]]
        )
        expect(result.rows).toHaveLength(2)
        const remainingIds = result.rows.map((r: { id: string }) => r.id)
        expect(remainingIds).toContain(parentId)
        expect(remainingIds).toContain(child2Id)
        expect(remainingIds).not.toContain(child1Id)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // 2.3 Template ID consistency
  // ============================================

  describe("template_id data consistency", () => {
    test("2.3a: should store and retrieve template_id", async () => {
      // Arrange
      const userId = await createTestUser()
      const goalId = await createTestGoal(userId, {
        title: "Templated Goal",
        template_id: "approach-3x-week",
      })
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `SELECT template_id FROM user_goals WHERE id = $1`,
          [goalId]
        )

        // Assert
        expect(result.rows[0].template_id).toBe("approach-3x-week")
      } finally {
        await client.end()
      }
    })

    test("2.3b: should return 0 rows for template_id after delete-all", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestGoal(userId, {
        title: "Template Goal 1",
        template_id: "approach-3x-week",
      })
      await createTestGoal(userId, {
        title: "Template Goal 2",
        template_id: "number-close-2x",
      })
      const client = await getClient()

      try {
        // Act: Delete all user goals
        await client.query(`DELETE FROM user_goals WHERE user_id = $1`, [userId])

        // Assert: No template_ids remain
        const result = await client.query(
          `SELECT template_id FROM user_goals WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("2.3c: should have exactly 1 row after delete-all + recreate with same template_id", async () => {
      // Arrange
      const userId = await createTestUser()
      const templateId = "approach-3x-week"
      await createTestGoal(userId, {
        title: "Original Goal",
        template_id: templateId,
      })
      const client = await getClient()

      try {
        // Act: Delete all, then recreate with same template_id
        await client.query(`DELETE FROM user_goals WHERE user_id = $1`, [userId])
        await client.query(
          `INSERT INTO user_goals (user_id, title, category, template_id)
           VALUES ($1, 'Recreated Goal', 'custom', $2)`,
          [userId, templateId]
        )

        // Assert: Exactly 1 row with this template_id
        const result = await client.query(
          `SELECT id, template_id FROM user_goals WHERE user_id = $1 AND template_id = $2`,
          [userId, templateId]
        )
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].template_id).toBe(templateId)
      } finally {
        await client.end()
      }
    })

    test("2.3d: should isolate goals between users — deleting User A's goals preserves User B's", async () => {
      // Arrange
      const userAId = await createTestUser("userA@test.com")
      const userBId = await createTestUser("userB@test.com")
      await createTestGoal(userAId, {
        title: "User A Goal",
        template_id: "shared-template",
      })
      await createTestGoal(userBId, {
        title: "User B Goal",
        template_id: "shared-template",
      })
      const client = await getClient()

      try {
        // Act: Delete only User A's goals
        await client.query(`DELETE FROM user_goals WHERE user_id = $1`, [userAId])

        // Assert: User B's goal is unaffected
        const resultA = await client.query(
          `SELECT COUNT(*)::int AS count FROM user_goals WHERE user_id = $1`,
          [userAId]
        )
        const resultB = await client.query(
          `SELECT COUNT(*)::int AS count FROM user_goals WHERE user_id = $1`,
          [userBId]
        )
        expect(resultA.rows[0].count).toBe(0)
        expect(resultB.rows[0].count).toBe(1)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // 2.4 Archive/active state
  // ============================================

  describe("archive and active state", () => {
    test("2.4a: should default to is_active=true, is_archived=false", async () => {
      // Arrange
      const userId = await createTestUser()
      const goalId = await createTestGoal(userId)
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `SELECT is_active, is_archived FROM user_goals WHERE id = $1`,
          [goalId]
        )

        // Assert
        expect(result.rows[0].is_active).toBe(true)
        expect(result.rows[0].is_archived).toBe(false)
      } finally {
        await client.end()
      }
    })

    test("2.4b: should set is_archived=true, is_active=false when archiving", async () => {
      // Arrange
      const userId = await createTestUser()
      const goalId = await createTestGoal(userId)
      const client = await getClient()

      try {
        // Act: Archive the goal
        await client.query(
          `UPDATE user_goals SET is_archived = true, is_active = false WHERE id = $1`,
          [goalId]
        )

        // Assert
        const result = await client.query(
          `SELECT is_active, is_archived FROM user_goals WHERE id = $1`,
          [goalId]
        )
        expect(result.rows[0].is_archived).toBe(true)
        expect(result.rows[0].is_active).toBe(false)
      } finally {
        await client.end()
      }
    })

    test("2.4c: should delete both active and archived goals with unfiltered delete", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestGoal(userId, { title: "Active Goal", is_active: true, is_archived: false })
      await createTestGoal(userId, { title: "Archived Goal", is_active: false, is_archived: true })
      const client = await getClient()

      try {
        // Act: Delete all (no filter on active/archived)
        await client.query(`DELETE FROM user_goals WHERE user_id = $1`, [userId])

        // Assert: Both are gone
        const result = await client.query(
          `SELECT COUNT(*)::int AS count FROM user_goals WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].count).toBe(0)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // 2.5 Position and ordering
  // ============================================

  describe("goal position and ordering", () => {
    test("2.5a: should return goals in correct order when ordered by position", async () => {
      // Arrange
      const userId = await createTestUser()
      await createTestGoal(userId, { title: "Third", position: 2 })
      await createTestGoal(userId, { title: "First", position: 0 })
      await createTestGoal(userId, { title: "Second", position: 1 })
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `SELECT title FROM user_goals WHERE user_id = $1 ORDER BY position ASC`,
          [userId]
        )

        // Assert
        expect(result.rows.map((r: { title: string }) => r.title)).toEqual([
          "First",
          "Second",
          "Third",
        ])
      } finally {
        await client.end()
      }
    })

    test("2.5b: should reflect updated order after position change", async () => {
      // Arrange
      const userId = await createTestUser()
      const goalAId = await createTestGoal(userId, { title: "Goal A", position: 0 })
      const goalBId = await createTestGoal(userId, { title: "Goal B", position: 1 })
      const client = await getClient()

      try {
        // Act: Swap positions
        await client.query(`UPDATE user_goals SET position = 1 WHERE id = $1`, [goalAId])
        await client.query(`UPDATE user_goals SET position = 0 WHERE id = $1`, [goalBId])

        // Assert
        const result = await client.query(
          `SELECT title FROM user_goals WHERE user_id = $1 ORDER BY position ASC`,
          [userId]
        )
        expect(result.rows.map((r: { title: string }) => r.title)).toEqual([
          "Goal B",
          "Goal A",
        ])
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // 2.6 Linked metric columns
  // ============================================

  describe("linked metrics", () => {
    test("2.6a: should accept NULL for linked_metric", async () => {
      // Arrange
      const userId = await createTestUser()
      const goalId = await createTestGoal(userId, { linked_metric: null })
      const client = await getClient()

      try {
        // Act
        const result = await client.query(
          `SELECT linked_metric FROM user_goals WHERE id = $1`,
          [goalId]
        )

        // Assert
        expect(result.rows[0].linked_metric).toBeNull()
      } finally {
        await client.end()
      }
    })

    test("2.6b: should have current_week_numbers and current_week_instadates columns in user_tracking_stats", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Insert a tracking stats row and read the columns
        await client.query(
          `INSERT INTO user_tracking_stats (user_id, current_week_numbers, current_week_instadates)
           VALUES ($1, 5, 3)`,
          [userId]
        )

        const result = await client.query(
          `SELECT current_week_numbers, current_week_instadates FROM user_tracking_stats WHERE user_id = $1`,
          [userId]
        )

        // Assert
        expect(result.rows[0].current_week_numbers).toBe(5)
        expect(result.rows[0].current_week_instadates).toBe(3)
      } finally {
        await client.end()
      }
    })
  })
})
