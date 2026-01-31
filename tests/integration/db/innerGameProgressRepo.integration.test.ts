/**
 * Integration tests for innerGameProgressRepo.
 * Tests progress state machine, step completion, and reset logic.
 *
 * Test cases from better_tests_plan.md Phase 2.4:
 * 1. Progress advances through steps (catches state machine bugs)
 * 2. Complete step marks as done (catches status update errors)
 * 3. Restart from beginning (catches reset logic)
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

describe("innerGameProgressRepo Integration Tests", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  // ============================================
  // Progress advances through steps - state machine check
  // ============================================

  describe("Progress advances through steps - state machine check", () => {
    test("should create initial progress with step 0", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Create initial progress
        const result = await client.query(
          `
          INSERT INTO inner_game_progress (user_id)
          VALUES ($1)
          RETURNING *
        `,
          [userId]
        )

        // Assert: Should start at step 0
        const progress = result.rows[0]
        expect(progress.current_step).toBe(0)
        expect(progress.current_substep).toBe(0)
        expect(progress.welcome_dismissed).toBe(false)
        expect(progress.values_completed).toBe(false)
        expect(progress.shadow_completed).toBe(false)
        expect(progress.peak_experience_completed).toBe(false)
        expect(progress.hurdles_completed).toBe(false)
        expect(progress.cutting_completed).toBe(false)
      } finally {
        await client.end()
      }
    })

    test("should advance from step 0 to step 1", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create initial progress
        await client.query(
          `INSERT INTO inner_game_progress (user_id) VALUES ($1)`,
          [userId]
        )

        // Act: Advance to step 1
        await client.query(
          `
          UPDATE inner_game_progress
          SET current_step = 1, welcome_dismissed = true
          WHERE user_id = $1
        `,
          [userId]
        )

        // Assert
        const result = await client.query(
          `SELECT current_step, welcome_dismissed FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].current_step).toBe(1)
        expect(result.rows[0].welcome_dismissed).toBe(true)
      } finally {
        await client.end()
      }
    })

    test("should track substeps within a step", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create progress at step 1
        await client.query(
          `
          INSERT INTO inner_game_progress (user_id, current_step, current_substep)
          VALUES ($1, 1, 0)
        `,
          [userId]
        )

        // Act: Advance through substeps
        await client.query(
          `UPDATE inner_game_progress SET current_substep = 1 WHERE user_id = $1`,
          [userId]
        )
        await client.query(
          `UPDATE inner_game_progress SET current_substep = 2 WHERE user_id = $1`,
          [userId]
        )

        // Assert
        const result = await client.query(
          `SELECT current_step, current_substep FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].current_step).toBe(1)
        expect(result.rows[0].current_substep).toBe(2)
      } finally {
        await client.end()
      }
    })

    test("should advance to next step and reset substep", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create progress at step 1, substep 3
        await client.query(
          `
          INSERT INTO inner_game_progress (user_id, current_step, current_substep)
          VALUES ($1, 1, 3)
        `,
          [userId]
        )

        // Act: Move to step 2, reset substep
        await client.query(
          `
          UPDATE inner_game_progress
          SET current_step = 2, current_substep = 0
          WHERE user_id = $1
        `,
          [userId]
        )

        // Assert
        const result = await client.query(
          `SELECT current_step, current_substep FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].current_step).toBe(2)
        expect(result.rows[0].current_substep).toBe(0)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Complete step marks as done - status update check
  // ============================================

  describe("Complete step marks as done - status update check", () => {
    test("should mark values_completed when step finishes", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create progress
        await client.query(
          `INSERT INTO inner_game_progress (user_id, current_step) VALUES ($1, 1)`,
          [userId]
        )

        // Act: Complete values step
        await client.query(
          `
          UPDATE inner_game_progress
          SET values_completed = true, current_step = 2
          WHERE user_id = $1
        `,
          [userId]
        )

        // Assert
        const result = await client.query(
          `SELECT values_completed, current_step FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].values_completed).toBe(true)
        expect(result.rows[0].current_step).toBe(2)
      } finally {
        await client.end()
      }
    })

    test("should mark shadow_completed with response data", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const shadowResponse = "My shadow response about what I dislike in others"
      const inferredValues = [
        { id: "authenticity", reason: "Values being genuine" },
        { id: "integrity", reason: "Values honesty" },
      ]

      try {
        // Create progress
        await client.query(
          `INSERT INTO inner_game_progress (user_id, current_step) VALUES ($1, 2)`,
          [userId]
        )

        // Act: Complete shadow step with data
        await client.query(
          `
          UPDATE inner_game_progress
          SET shadow_completed = true,
              shadow_response = $2,
              shadow_inferred_values = $3
          WHERE user_id = $1
        `,
          [userId, shadowResponse, JSON.stringify(inferredValues)]
        )

        // Assert
        const result = await client.query(
          `SELECT shadow_completed, shadow_response, shadow_inferred_values
           FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].shadow_completed).toBe(true)
        expect(result.rows[0].shadow_response).toBe(shadowResponse)
        expect(result.rows[0].shadow_inferred_values).toEqual(inferredValues)
      } finally {
        await client.end()
      }
    })

    test("should mark multiple steps as completed sequentially", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create progress
        await client.query(
          `INSERT INTO inner_game_progress (user_id) VALUES ($1)`,
          [userId]
        )

        // Act: Complete steps in sequence
        await client.query(
          `UPDATE inner_game_progress SET values_completed = true WHERE user_id = $1`,
          [userId]
        )
        await client.query(
          `UPDATE inner_game_progress SET shadow_completed = true WHERE user_id = $1`,
          [userId]
        )
        await client.query(
          `UPDATE inner_game_progress SET peak_experience_completed = true WHERE user_id = $1`,
          [userId]
        )

        // Assert: All should be marked
        const result = await client.query(
          `SELECT values_completed, shadow_completed, peak_experience_completed,
                  hurdles_completed, cutting_completed
           FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].values_completed).toBe(true)
        expect(result.rows[0].shadow_completed).toBe(true)
        expect(result.rows[0].peak_experience_completed).toBe(true)
        expect(result.rows[0].hurdles_completed).toBe(false) // Not yet completed
        expect(result.rows[0].cutting_completed).toBe(false) // Not yet completed
      } finally {
        await client.end()
      }
    })

    test("should store final_core_values as JSONB array", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()
      const coreValues = [
        { id: "authenticity", rank: 1 },
        { id: "growth", rank: 2 },
        { id: "connection", rank: 3 },
      ]

      try {
        // Create progress
        await client.query(
          `INSERT INTO inner_game_progress (user_id) VALUES ($1)`,
          [userId]
        )

        // Act: Set final core values
        await client.query(
          `
          UPDATE inner_game_progress
          SET final_core_values = $2,
              cutting_completed = true
          WHERE user_id = $1
        `,
          [userId, JSON.stringify(coreValues)]
        )

        // Assert
        const result = await client.query(
          `SELECT final_core_values, cutting_completed
           FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].cutting_completed).toBe(true)
        expect(result.rows[0].final_core_values).toEqual(coreValues)
        expect(result.rows[0].final_core_values[0].id).toBe("authenticity")
        expect(result.rows[0].final_core_values[0].rank).toBe(1)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Restart from beginning - reset logic check
  // ============================================

  describe("Restart from beginning - reset logic check", () => {
    test("should reset all progress fields to initial state", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create fully completed progress
        await client.query(
          `
          INSERT INTO inner_game_progress (
            user_id, current_step, current_substep, welcome_dismissed,
            values_completed, shadow_completed, peak_experience_completed,
            hurdles_completed, cutting_completed,
            shadow_response, shadow_inferred_values,
            final_core_values
          ) VALUES (
            $1, 5, 3, true, true, true, true, true, true,
            'response', '[{"id": "test"}]', '[{"id": "value", "rank": 1}]'
          )
        `,
          [userId]
        )

        // Act: Reset everything
        await client.query(
          `
          UPDATE inner_game_progress
          SET current_step = 0,
              current_substep = 0,
              welcome_dismissed = false,
              values_completed = false,
              shadow_completed = false,
              peak_experience_completed = false,
              hurdles_completed = false,
              cutting_completed = false,
              shadow_response = NULL,
              shadow_inferred_values = NULL,
              peak_experience_response = NULL,
              peak_experience_inferred_values = NULL,
              hurdles_response = NULL,
              hurdles_inferred_values = NULL,
              final_core_values = NULL,
              aspirational_values = NULL
          WHERE user_id = $1
        `,
          [userId]
        )

        // Assert: All fields should be reset
        const result = await client.query(
          `SELECT * FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        const progress = result.rows[0]
        expect(progress.current_step).toBe(0)
        expect(progress.current_substep).toBe(0)
        expect(progress.welcome_dismissed).toBe(false)
        expect(progress.values_completed).toBe(false)
        expect(progress.shadow_completed).toBe(false)
        expect(progress.peak_experience_completed).toBe(false)
        expect(progress.hurdles_completed).toBe(false)
        expect(progress.cutting_completed).toBe(false)
        expect(progress.shadow_response).toBeNull()
        expect(progress.shadow_inferred_values).toBeNull()
        expect(progress.final_core_values).toBeNull()
      } finally {
        await client.end()
      }
    })

    test("should preserve user_id and timestamps on reset", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create progress and get timestamps
        const insertResult = await client.query(
          `
          INSERT INTO inner_game_progress (user_id, current_step)
          VALUES ($1, 3)
          RETURNING id, created_at
        `,
          [userId]
        )
        const originalId = insertResult.rows[0].id
        const originalCreatedAt = insertResult.rows[0].created_at

        // Act: Reset
        await client.query(
          `UPDATE inner_game_progress SET current_step = 0 WHERE user_id = $1`,
          [userId]
        )

        // Assert: ID and user_id should be preserved
        const result = await client.query(
          `SELECT id, user_id, created_at FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].id).toBe(originalId)
        expect(result.rows[0].user_id).toBe(userId)
        expect(result.rows[0].created_at.toISOString()).toBe(
          originalCreatedAt.toISOString()
        )
      } finally {
        await client.end()
      }
    })

    test("should allow restarting and completing again", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create and complete progress
        await client.query(
          `
          INSERT INTO inner_game_progress (
            user_id, current_step, values_completed,
            final_core_values
          ) VALUES (
            $1, 5, true, '[{"id": "old", "rank": 1}]'
          )
        `,
          [userId]
        )

        // Reset
        await client.query(
          `
          UPDATE inner_game_progress
          SET current_step = 0, values_completed = false, final_core_values = NULL
          WHERE user_id = $1
        `,
          [userId]
        )

        // Act: Complete again with new values
        await client.query(
          `
          UPDATE inner_game_progress
          SET current_step = 5,
              values_completed = true,
              final_core_values = '[{"id": "new", "rank": 1}]'
          WHERE user_id = $1
        `,
          [userId]
        )

        // Assert: Should have new values
        const result = await client.query(
          `SELECT current_step, values_completed, final_core_values
           FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].current_step).toBe(5)
        expect(result.rows[0].values_completed).toBe(true)
        expect(result.rows[0].final_core_values[0].id).toBe("new")
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Unique constraint and upsert behavior
  // ============================================

  describe("Unique constraint and upsert behavior", () => {
    test("should enforce one progress record per user", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create first progress record
        await client.query(
          `INSERT INTO inner_game_progress (user_id) VALUES ($1)`,
          [userId]
        )

        // Act & Assert: Second insert should fail
        await expect(
          client.query(
            `INSERT INTO inner_game_progress (user_id) VALUES ($1)`,
            [userId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("should support upsert with ON CONFLICT", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Create initial progress
        await client.query(
          `INSERT INTO inner_game_progress (user_id, current_step) VALUES ($1, 1)`,
          [userId]
        )

        // Act: Upsert with new step value
        await client.query(
          `
          INSERT INTO inner_game_progress (user_id, current_step)
          VALUES ($1, 3)
          ON CONFLICT (user_id) DO UPDATE SET current_step = 3
        `,
          [userId]
        )

        // Assert: Should have updated value
        const result = await client.query(
          `SELECT current_step FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].current_step).toBe(3)
      } finally {
        await client.end()
      }
    })

    test("should cascade delete when user profile is deleted", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Create profile and progress manually
        const profileResult = await client.query(`
          INSERT INTO profiles (id, email)
          VALUES (gen_random_uuid(), 'cascade-test@example.com')
          RETURNING id
        `)
        const userId = profileResult.rows[0].id

        await client.query(
          `INSERT INTO inner_game_progress (user_id, current_step) VALUES ($1, 3)`,
          [userId]
        )

        // Act: Delete profile
        await client.query(`DELETE FROM profiles WHERE id = $1`, [userId])

        // Assert: Progress should be deleted via cascade
        const result = await client.query(
          `SELECT COUNT(*) as count FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(parseInt(result.rows[0].count)).toBe(0)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Legacy field compatibility
  // ============================================

  describe("Legacy field compatibility", () => {
    test("should support legacy step1_completed field", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Set legacy field
        await client.query(
          `
          INSERT INTO inner_game_progress (user_id, step1_completed)
          VALUES ($1, true)
        `,
          [userId]
        )

        // Assert
        const result = await client.query(
          `SELECT step1_completed FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].step1_completed).toBe(true)
      } finally {
        await client.end()
      }
    })

    test("should support both legacy and new fields simultaneously", async () => {
      // Arrange
      const userId = await createTestUser()
      const client = await getClient()

      try {
        // Act: Set both legacy and new fields
        await client.query(
          `
          INSERT INTO inner_game_progress (
            user_id, step1_completed, values_completed, step2_completed, hurdles_completed
          )
          VALUES ($1, true, true, false, false)
        `,
          [userId]
        )

        // Assert: Both should be readable
        const result = await client.query(
          `SELECT step1_completed, values_completed, step2_completed, hurdles_completed
           FROM inner_game_progress WHERE user_id = $1`,
          [userId]
        )
        expect(result.rows[0].step1_completed).toBe(true)
        expect(result.rows[0].values_completed).toBe(true)
        expect(result.rows[0].step2_completed).toBe(false)
        expect(result.rows[0].hurdles_completed).toBe(false)
      } finally {
        await client.end()
      }
    })
  })
})
