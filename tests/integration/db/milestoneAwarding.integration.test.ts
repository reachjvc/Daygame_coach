/**
 * WHAT THE DATABASE ITSELF GUARANTEES ABOUT A BADGE.
 *
 * `insertMilestones` leans on two properties of the `milestones` table, and if
 * either is not true the reconciler is unsafe: awarding on every write would
 * either duplicate badges or, worse, keep resetting the date on a badge the user
 * earned months ago.
 *
 * The repo function itself talks to Supabase over HTTP and cannot run here, so
 * what is exercised is the SQL it issues — the same `ON CONFLICT
 * (user_id, milestone_type) DO NOTHING`, against production's own constraint
 * (tests/db/baseline.sql). The repo itself runs in
 * tests/integration/repos/trackingRepo.integration.test.ts.
 *
 * "Re-awarding never rewrites the day it was earned" was removed 2026-10-13
 * (D5): with `DO NOTHING` the second award writes no row, which the first test
 * already asserts — a `DO UPDATE` would return the row and fail it there.
 */

import { describe, test, expect } from "vitest"
import { getClient, createTestUser } from "../setup"

/** The statement `insertMilestones` issues, as PostgREST renders an ignoring upsert. */
const AWARD = `
  INSERT INTO milestones (user_id, milestone_type, achieved_at, session_id)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (user_id, milestone_type) DO NOTHING
  RETURNING id, achieved_at
`

describe("milestone awarding — the database's half of the promise", () => {
  test("a badge can only be held once", async () => {
    // Arrange
    const userId = await createTestUser()
    const client = await getClient()

    try {
      // Act
      const first = await client.query(AWARD, [userId, "5_approaches", "2026-01-28T10:13:03Z", null])
      const second = await client.query(AWARD, [userId, "5_approaches", "2026-08-27T09:00:00Z", null])

      const rows = await client.query(
        `SELECT count(*)::int AS n FROM milestones WHERE user_id = $1 AND milestone_type = $2`,
        [userId, "5_approaches"]
      )

      // Assert
      expect(first.rowCount).toBe(1)
      expect(second.rowCount).toBe(0)
      expect(rows.rows[0].n).toBe(1)
    } finally {
      await client.end()
    }
  })

  test("two users can hold the same badge", async () => {
    // Arrange
    const one = await createTestUser("one@example.com")
    const two = await createTestUser("two@example.com")
    const client = await getClient()

    try {
      // Act
      await client.query(AWARD, [one, "first_approach", "2026-01-01T10:00:00Z", null])
      await client.query(AWARD, [two, "first_approach", "2026-02-01T10:00:00Z", null])

      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM milestones WHERE milestone_type = 'first_approach' AND user_id = ANY($1::uuid[])`,
        [[one, two]]
      )

      // Assert: the constraint is per user, not global.
      expect(rows[0].n).toBe(2)
    } finally {
      await client.end()
    }
  })

  test("deleting a session leaves the badges and clears their session link", async () => {
    // Arrange: badges are insert-only. A user who tidies up their history keeps
    // everything they earned.
    const userId = await createTestUser()
    const client = await getClient()

    try {
      const session = await client.query(
        `INSERT INTO sessions (user_id, started_at, ended_at, is_active, end_reason)
         VALUES ($1, NOW(), NOW(), false, 'completed') RETURNING id`,
        [userId]
      )
      const sessionId = session.rows[0].id
      await client.query(AWARD, [userId, "first_approach", "2026-01-28T10:10:36Z", sessionId])

      // Act
      await client.query(`DELETE FROM sessions WHERE id = $1`, [sessionId])
      const { rows } = await client.query(
        `SELECT milestone_type, session_id FROM milestones WHERE user_id = $1`,
        [userId]
      )

      // Assert
      expect(rows).toHaveLength(1)
      expect(rows[0].milestone_type).toBe("first_approach")
      expect(rows[0].session_id).toBeNull()
    } finally {
      await client.end()
    }
  })

  test("deleting a session takes its approaches with it", async () => {
    // Arrange: this cascade is why the counters have to be recomputed rather
    // than adjusted — nothing tells the stats row that rows disappeared.
    const userId = await createTestUser()
    const client = await getClient()

    try {
      const session = await client.query(
        `INSERT INTO sessions (user_id, started_at, is_active) VALUES ($1, NOW(), true) RETURNING id`,
        [userId]
      )
      const sessionId = session.rows[0].id
      await client.query(
        `INSERT INTO approaches (user_id, session_id, timestamp) VALUES ($1, $2, NOW()), ($1, $2, NOW())`,
        [userId, sessionId]
      )

      // Act
      await client.query(`DELETE FROM sessions WHERE id = $1`, [sessionId])
      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM approaches WHERE user_id = $1`,
        [userId]
      )

      // Assert
      expect(rows[0].n).toBe(0)
    } finally {
      await client.end()
    }
  })
})
