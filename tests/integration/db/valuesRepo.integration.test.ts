/**
 * WHAT THE DATABASE REFUSES ON `user_values`, the values a person picked.
 *
 * Raw SQL against production's schema on the test backend; no `valuesRepo`
 * function runs here (tests/integration/repos/valuesRepo.integration.test.ts
 * runs it). `upsertUserValues` writes with `ON CONFLICT (user_id, value_id)`, which
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

import { describe, test, expect } from "vitest"
import type { Client } from "pg"
import { randomUUID } from "node:crypto"
import { getClient, createTestUser } from "../setup"

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

/**
 * A catalogue value only this test knows, removed again afterwards. In
 * production a pick points at `core_values` (text ids, no default), not at
 * `values` as the old mirror had it; the catalogue is shared, so the id is
 * unique to this run and nothing is left behind.
 */
async function withCoreValue<T>(run: (client: Client, valueId: string) => Promise<T>): Promise<T> {
  const valueId = `test-value-${randomUUID()}`
  return withClient(async (client) => {
    await client.query(`INSERT INTO core_values (id, category) VALUES ($1, 'core')`, [valueId])
    try {
      return await run(client, valueId)
    } finally {
      await client.query(`DELETE FROM user_values WHERE value_id = $1`, [valueId])
      await client.query(`DELETE FROM core_values WHERE id = $1`, [valueId])
    }
  })
}

describe("user_values refusals", () => {
  test("a person picks a value once", async () => {
    const userId = await createTestUser()
    await withCoreValue(async (client, value) => {
      await client.query(`INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`, [userId, value])

      // Production's key is the pair itself (`user_values_pkey`); the old
      // mirror had a separate UNIQUE (`user_values_user_id_value_id_key`).
      await expect(
        client.query(`INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`, [userId, value])
      ).rejects.toMatchObject({ code: "23505", constraint: "user_values_pkey" })
    })
  })

  test("a pick must name a value that exists", async () => {
    const userId = await createTestUser()
    await withClient(async (client) => {
      await expect(
        client.query(`INSERT INTO user_values (user_id, value_id) VALUES ($1, $2)`, [
          userId,
          `no-such-value-${randomUUID()}`,
        ])
      ).rejects.toMatchObject({ code: "23503", constraint: "user_values_value_id_fkey" })
    })
  })
})
