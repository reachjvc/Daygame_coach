/**
 * ONE INNER-GAME PROGRESS ROW PER PERSON, ENFORCED BY THE DATABASE.
 *
 * `innerGameProgressRepo` reads a person's progress as a single row and writes
 * it with an upsert on `user_id`. A second row would make "where am I?" have two
 * answers, and an upsert has nothing to conflict on without this key — it would
 * quietly insert instead. The key exists in production under the same name
 * (tests/db/baseline.sql).
 *
 * Removed 2026-10-13 (docs/plans/tests-worth-their-keep.md, Phase 2): fifteen
 * tests that wrote a row in SQL and read the same row back (D2/D4), restated a
 * column default (D1), or deleted a profile and counted rows — now one rule for
 * every table in `userDataCascades.integration.test.ts` (D5).
 */

import { describe, test, expect } from "vitest"
import { getClient, createTestUser } from "../setup"

describe("inner_game_progress", () => {
  test("a person has at most one progress row", async () => {
    const userId = await createTestUser()
    const client = await getClient()

    try {
      await client.query(`INSERT INTO inner_game_progress (user_id) VALUES ($1)`, [userId])

      await expect(
        client.query(`INSERT INTO inner_game_progress (user_id) VALUES ($1)`, [userId])
      ).rejects.toMatchObject({ code: "23505", constraint: "inner_game_progress_user_id_key" })
    } finally {
      await client.end()
    }
  })
})
