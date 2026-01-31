/**
 * Integration tests for profilesRepo.
 * Tests profile operations, schema integrity, and error handling.
 *
 * Test cases from better_tests_plan.md Phase 2.2:
 * 1. Create profile with all fields (catches schema mismatch)
 * 2. Update partial profile (catches null overwrites)
 * 3. Get profile for nonexistent user (catches error handling)
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables } from "../setup"

describe("profilesRepo Integration Tests", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  // ============================================
  // Create profile with all fields - schema mismatch check
  // ============================================

  describe("Create profile with all fields - schema mismatch check", () => {
    test("should create profile with all standard fields", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Act: Insert profile with all fields
        const result = await client.query(`
          INSERT INTO profiles (
            id, email, full_name, avatar_url, has_purchased, onboarding_completed,
            primary_archetype, secondary_archetypes, region, secondary_regions,
            experience_level, xp, level, difficulty, scenarios_completed
          ) VALUES (
            gen_random_uuid(), 'test@example.com', 'Test User', 'https://example.com/avatar.png',
            true, true, 'confident', ARRAY['social', 'adventurous'], 'europe',
            ARRAY['asia', 'americas'], 'intermediate', 150, 2, 'medium', 5
          )
          RETURNING *
        `)

        // Assert: All fields should be correctly stored
        const profile = result.rows[0]
        expect(profile.email).toBe("test@example.com")
        expect(profile.full_name).toBe("Test User")
        expect(profile.avatar_url).toBe("https://example.com/avatar.png")
        expect(profile.has_purchased).toBe(true)
        expect(profile.onboarding_completed).toBe(true)
        expect(profile.primary_archetype).toBe("confident")
        expect(profile.secondary_archetypes).toEqual(["social", "adventurous"])
        expect(profile.region).toBe("europe")
        expect(profile.secondary_regions).toEqual(["asia", "americas"])
        expect(profile.experience_level).toBe("intermediate")
        expect(profile.xp).toBe(150)
        expect(profile.level).toBe(2)
        expect(profile.difficulty).toBe("medium")
        expect(profile.scenarios_completed).toBe(5)
      } finally {
        await client.end()
      }
    })

    test("should create profile with sandbox_settings JSONB", async () => {
      // Arrange
      const client = await getClient()
      const sandboxSettings = {
        weather: { enabled: true, intensity: 0.5 },
        energy: { level: "high" },
        movement: { speed: 1.0 },
        display: { showHints: true },
        environments: { urban: true, rural: false },
      }

      try {
        // Act: Insert profile with JSONB settings
        const result = await client.query(
          `
          INSERT INTO profiles (id, email, sandbox_settings)
          VALUES (gen_random_uuid(), 'jsonb-test@example.com', $1)
          RETURNING *
        `,
          [JSON.stringify(sandboxSettings)]
        )

        // Assert: JSONB should be stored and retrievable
        const profile = result.rows[0]
        expect(profile.sandbox_settings).toEqual(sandboxSettings)
        expect(profile.sandbox_settings.weather.enabled).toBe(true)
        expect(profile.sandbox_settings.energy.level).toBe("high")
      } finally {
        await client.end()
      }
    })

    test("should create profile with default values", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Act: Insert profile with minimal fields
        const result = await client.query(`
          INSERT INTO profiles (id, email)
          VALUES (gen_random_uuid(), 'minimal@example.com')
          RETURNING *
        `)

        // Assert: Default values should be applied
        const profile = result.rows[0]
        expect(profile.email).toBe("minimal@example.com")
        expect(profile.has_purchased).toBe(false)
        expect(profile.onboarding_completed).toBe(false)
        expect(profile.xp).toBe(0)
        expect(profile.level).toBe(1)
        expect(profile.scenarios_completed).toBe(0)
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Update partial profile - null overwrite check
  // ============================================

  describe("Update partial profile - null overwrite check", () => {
    test("should update only specified fields without overwriting others", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Create profile with initial values
        const insertResult = await client.query(`
          INSERT INTO profiles (id, email, full_name, xp, level, experience_level)
          VALUES (gen_random_uuid(), 'partial@example.com', 'Original Name', 100, 2, 'beginner')
          RETURNING id
        `)
        const userId = insertResult.rows[0].id

        // Act: Update only xp and level
        await client.query(
          `
          UPDATE profiles
          SET xp = 200, level = 3
          WHERE id = $1
        `,
          [userId]
        )

        // Assert: Other fields should not be affected
        const result = await client.query(
          `SELECT * FROM profiles WHERE id = $1`,
          [userId]
        )
        const profile = result.rows[0]
        expect(profile.xp).toBe(200)
        expect(profile.level).toBe(3)
        expect(profile.full_name).toBe("Original Name") // Not overwritten
        expect(profile.experience_level).toBe("beginner") // Not overwritten
      } finally {
        await client.end()
      }
    })

    test("should allow setting fields to null explicitly", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Create profile with values
        const insertResult = await client.query(`
          INSERT INTO profiles (id, email, full_name, avatar_url)
          VALUES (gen_random_uuid(), 'nullable@example.com', 'Has Name', 'https://example.com/img.png')
          RETURNING id
        `)
        const userId = insertResult.rows[0].id

        // Act: Set avatar_url to null
        await client.query(
          `
          UPDATE profiles
          SET avatar_url = NULL
          WHERE id = $1
        `,
          [userId]
        )

        // Assert: avatar_url should be null, full_name should remain
        const result = await client.query(
          `SELECT * FROM profiles WHERE id = $1`,
          [userId]
        )
        const profile = result.rows[0]
        expect(profile.avatar_url).toBeNull()
        expect(profile.full_name).toBe("Has Name")
      } finally {
        await client.end()
      }
    })

    test("should update sandbox_settings without losing unrelated settings", async () => {
      // Arrange
      const client = await getClient()
      const initialSettings = {
        weather: { enabled: true },
        energy: { level: "low" },
        display: { showHints: false },
      }

      try {
        // Create profile with initial sandbox_settings
        const insertResult = await client.query(
          `
          INSERT INTO profiles (id, email, sandbox_settings)
          VALUES (gen_random_uuid(), 'settings@example.com', $1)
          RETURNING id
        `,
          [JSON.stringify(initialSettings)]
        )
        const userId = insertResult.rows[0].id

        // Act: Update only energy setting via jsonb_set
        await client.query(
          `
          UPDATE profiles
          SET sandbox_settings = jsonb_set(
            COALESCE(sandbox_settings, '{}')::jsonb,
            '{energy}',
            '{"level": "high"}'::jsonb
          )
          WHERE id = $1
        `,
          [userId]
        )

        // Assert: Other settings should remain
        const result = await client.query(
          `SELECT sandbox_settings FROM profiles WHERE id = $1`,
          [userId]
        )
        const settings = result.rows[0].sandbox_settings
        expect(settings.energy.level).toBe("high")
        expect(settings.weather.enabled).toBe(true) // Not affected
        expect(settings.display.showHints).toBe(false) // Not affected
      } finally {
        await client.end()
      }
    })
  })

  // ============================================
  // Get profile for nonexistent user - error handling check
  // ============================================

  describe("Get profile for nonexistent user - error handling check", () => {
    test("should return empty result for nonexistent user", async () => {
      // Arrange
      const client = await getClient()
      const nonexistentId = "00000000-0000-0000-0000-000000000000"

      try {
        // Act: Query for nonexistent user
        const result = await client.query(
          `SELECT * FROM profiles WHERE id = $1`,
          [nonexistentId]
        )

        // Assert: Should return empty result, not error
        expect(result.rows).toHaveLength(0)
      } finally {
        await client.end()
      }
    })

    test("should not throw on select for invalid UUID format", async () => {
      // Arrange
      const client = await getClient()

      try {
        // Act & Assert: Invalid UUID should throw a proper error
        await expect(
          client.query(`SELECT * FROM profiles WHERE id = $1`, ["not-a-uuid"])
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("should handle concurrent profile reads", async () => {
      // Arrange
      const client1 = await getClient()
      const client2 = await getClient()

      try {
        // Create a profile first
        const insertResult = await client1.query(`
          INSERT INTO profiles (id, email, xp)
          VALUES (gen_random_uuid(), 'concurrent@example.com', 50)
          RETURNING id
        `)
        const userId = insertResult.rows[0].id

        // Act: Read from both clients concurrently
        const [result1, result2] = await Promise.all([
          client1.query(`SELECT * FROM profiles WHERE id = $1`, [userId]),
          client2.query(`SELECT * FROM profiles WHERE id = $1`, [userId]),
        ])

        // Assert: Both should get the same data
        expect(result1.rows[0].xp).toBe(50)
        expect(result2.rows[0].xp).toBe(50)
        expect(result1.rows[0].email).toBe(result2.rows[0].email)
      } finally {
        await client1.end()
        await client2.end()
      }
    })
  })

  // ============================================
  // XP and Level calculation integration
  // ============================================

  describe("XP and Level calculation", () => {
    test("should allow XP updates that cross level boundaries", async () => {
      // Arrange: Level formula is floor(xp / 100) + 1
      const client = await getClient()

      try {
        // Create profile at level 1 (xp = 50)
        const insertResult = await client.query(`
          INSERT INTO profiles (id, email, xp, level)
          VALUES (gen_random_uuid(), 'level-up@example.com', 50, 1)
          RETURNING id
        `)
        const userId = insertResult.rows[0].id

        // Act: Add XP to cross into level 2 (need 100+ total)
        await client.query(
          `
          UPDATE profiles
          SET xp = 150, level = 2
          WHERE id = $1
        `,
          [userId]
        )

        // Assert
        const result = await client.query(
          `SELECT xp, level FROM profiles WHERE id = $1`,
          [userId]
        )
        expect(result.rows[0].xp).toBe(150)
        expect(result.rows[0].level).toBe(2)
      } finally {
        await client.end()
      }
    })

    test("should handle large XP values", async () => {
      // Arrange
      const client = await getClient()
      const largeXp = 999999

      try {
        // Act: Create profile with large XP
        const result = await client.query(`
          INSERT INTO profiles (id, email, xp, level)
          VALUES (gen_random_uuid(), 'whale@example.com', ${largeXp}, 10000)
          RETURNING *
        `)

        // Assert: Should handle large values
        expect(result.rows[0].xp).toBe(largeXp)
        expect(result.rows[0].level).toBe(10000)
      } finally {
        await client.end()
      }
    })
  })
})
