/**
 * WHAT THE DATABASE REFUSES ON `user_goals`, WHOEVER IS WRITING.
 *
 * Raw SQL against the testcontainers PostgreSQL; no `goalRepo` function runs
 * here (the repo needs a Supabase client this container cannot answer). What
 * only this layer can prove is what the schema itself refuses.
 *
 * THE TWO PARTIAL UNIQUE INDEXES are what keeps a person from holding the same
 * goal twice. Re-pushing a plan, a double tap on "add", or two devices adding
 * the same template would otherwise write a second live copy, and every count
 * that goal feeds would then be split between them. Both are PARTIAL — an
 * archived copy does not count — which is what lets somebody drop a goal and
 * take it up again later. Drop the `WHERE` and re-adding an archived goal is
 * refused; drop the index and duplicates go through. Both indexes exist in
 * production (tests/db/baseline.sql) with the same names and predicates.
 *
 * Removed 2026-10-13 (docs/plans/tests-worth-their-keep.md, Phase 2): nineteen
 * tests that inserted rows and read them back (D2/D4), restated a declaration
 * (D1), or are now covered by `userDataCascades` (D5). Also removed: "deleting a
 * parent goal deletes its children". The mirror says CASCADE; production has
 * `fk_parent_goal ON DELETE SET NULL` beside a NO ACTION key, so in production
 * the children are un-parented, not deleted. That test pinned the opposite of
 * the real behaviour.
 */

import { describe, test, expect, beforeEach } from "vitest"
import type { Client } from "pg"
import { getClient, truncateAllTables, createTestUser, createTestGoal } from "../setup"

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

describe("user_goals refusals", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  test("a goal cannot hang off a parent that does not exist", async () => {
    const userId = await createTestUser()
    const parentId = await createTestGoal(userId, { title: "Parent Goal" })

    await withClient(async (client) => {
      const child = await client.query(
        `INSERT INTO user_goals (user_id, title, category, parent_goal_id)
         VALUES ($1, 'Child Goal', 'custom', $2) RETURNING id`,
        [userId, parentId]
      )
      expect(child.rows).toHaveLength(1)

      await expect(
        client.query(
          `INSERT INTO user_goals (user_id, title, category, parent_goal_id)
           VALUES ($1, 'Orphan Child', 'custom', '00000000-0000-0000-0000-000000000000')`,
          [userId]
        )
      ).rejects.toMatchObject({ code: "23503", constraint: "user_goals_parent_goal_id_fkey" })
    })
  })

  test("one live goal per template per person — an archived copy, another person and no template do not count", async () => {
    const me = await createTestUser("me@example.com")
    const someoneElse = await createTestUser("else@example.com")
    const first = await createTestGoal(me, { template_id: "approach-3x-week" })

    // The second live copy is the duplicate this index exists to refuse.
    await expect(createTestGoal(me, { template_id: "approach-3x-week" })).rejects.toMatchObject({
      code: "23505",
      constraint: "uq_user_goals_template",
    })

    // Archived, the first no longer counts: taking the goal up again works.
    await withClient((client) =>
      client.query(`UPDATE user_goals SET is_archived = true, is_active = false WHERE id = $1`, [first])
    )
    await expect(createTestGoal(me, { template_id: "approach-3x-week" })).resolves.toEqual(expect.any(String))

    // Per person, and a custom goal (no template) is never a duplicate.
    await expect(createTestGoal(someoneElse, { template_id: "approach-3x-week" })).resolves.toEqual(
      expect.any(String)
    )
    await createTestGoal(me, { template_id: null })
    await expect(createTestGoal(me, { template_id: null })).resolves.toEqual(expect.any(String))
  })

  test("one live goal per linked metric per person — an archived copy, another person and no metric do not count", async () => {
    const me = await createTestUser("me@example.com")
    const someoneElse = await createTestUser("else@example.com")
    const first = await createTestGoal(me, { linked_metric: "approaches_weekly" })

    // Two live goals fed by one counter would each get every approach.
    await expect(createTestGoal(me, { linked_metric: "approaches_weekly" })).rejects.toMatchObject({
      code: "23505",
      constraint: "uq_user_goals_linked_metric",
    })

    await withClient((client) =>
      client.query(`UPDATE user_goals SET is_archived = true, is_active = false WHERE id = $1`, [first])
    )
    await expect(createTestGoal(me, { linked_metric: "approaches_weekly" })).resolves.toEqual(expect.any(String))

    await expect(createTestGoal(someoneElse, { linked_metric: "approaches_weekly" })).resolves.toEqual(
      expect.any(String)
    )
    await createTestGoal(me, { linked_metric: null })
    await expect(createTestGoal(me, { linked_metric: null })).resolves.toEqual(expect.any(String))
  })
})
