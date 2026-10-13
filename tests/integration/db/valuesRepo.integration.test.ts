/**
 * WHAT THE DATABASE REFUSES ON `user_values`, the values a person picked.
 *
 * Raw SQL against the testcontainers PostgreSQL; no `valuesRepo` function runs
 * here. `upsertUserValues` writes with `ON CONFLICT (user_id, value_id)`, which
 * needs the key below to conflict on — without it the upsert inserts a second
 * copy of the same pick.
 *
 * Removed 2026-10-13 (docs/plans/tests-worth-their-keep.md, Phase 2): ten tests
 * that inserted rows and read them back (D2/D4), or deleted a profile and
 * counted rows — now one rule for every table in
 * `userDataCascades.integration.test.ts` (D5). Also removed: "deleting a value
 * deletes everyone's pick of it". The mirror says CASCADE to `values`; in
 * production `user_values.value_id` references `core_values` with no ON DELETE
 * action (tests/db/baseline.sql), so the delete is refused instead. The test
 * pinned behaviour production does not have.
 */

import { describe, test, expect, beforeEach } from "vitest"
import type { Client } from "pg"
import { getClient, truncateAllTables, createTestUser } from "../setup"

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

describe("user_values refusals", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  test("a person picks a value once", async () => {
    const userId = await createTestUser()
    await withClient(async (client) => {
      const value = (await client.query(`INSERT INTO values (category) VALUES ('core') RETURNING id`)).rows[0].id
      await client.query(`INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`, [userId, value])

      // Production enforces the same pair as its primary key (`user_values_pkey`).
      await expect(
        client.query(`INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`, [userId, value])
      ).rejects.toMatchObject({ code: "23505", constraint: "user_values_user_id_value_id_key" })
    })
  })

  test("a pick must name a value that exists", async () => {
    const userId = await createTestUser()
    await withClient(async (client) => {
      await expect(
        client.query(`INSERT INTO user_values (user_id, value_id) VALUES ($1, '00000000-0000-0000-0000-000000000000')`, [
          userId,
        ])
      ).rejects.toMatchObject({ code: "23503", constraint: "user_values_value_id_fkey" })
    })
  })
})
