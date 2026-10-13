/**
 * AT5 — the constraints on `life_answers`, against a real Postgres.
 *
 * Every one of these was also run against the live project on 2026-08-27, and
 * the update refusal is here because it did NOT hold the first time: the table
 * has no UPDATE policy, which stops the app's client and does nothing at all to
 * the service-role key. An `update` probe went through and destroyed a real
 * answer. The trigger is what makes append-only true rather than merely intended.
 *
 * Every connection opened here is closed: these used to call
 * `(await getClient()).query(...)` inline, which leaked one connection per
 * statement for the rest of the run.
 */

import { describe, test, expect, beforeEach } from "vitest"
import type { Client } from "pg"
import { getClient, truncateAllTables, createTestUser, asUser } from "../setup"

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

const insert = (userId: string, over: Record<string, unknown> = {}) => {
  const row = { answer_key: "one_thing", body: "Quit weed for 100 days", due_on: "2026-12-01", ...over }
  return withClient((client) =>
    client.query(
      `INSERT INTO life_answers (user_id, answer_key, body, due_on) VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, row.answer_key, row.body, row.due_on]
    )
  )
}

describe("life_answers constraints", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  test("rejects a blank answer", async () => {
    const userId = await createTestUser()
    await expect(insert(userId, { body: "   " })).rejects.toMatchObject({
      code: "23514",
      constraint: "life_answers_body_check",
    })
  })

  test("rejects an answer longer than 2000 characters", async () => {
    const userId = await createTestUser()
    await expect(insert(userId, { body: "a".repeat(2001) })).rejects.toMatchObject({
      code: "23514",
      constraint: "life_answers_body_check",
    })
  })

  test("rejects a key that is not in the namespace", async () => {
    const userId = await createTestUser()
    await expect(insert(userId, { answer_key: "north_star" })).rejects.toMatchObject({
      code: "23514",
      constraint: "life_answers_answer_key_check",
    })
  })

  test("rejects a row with no deadline — the database must not guess one", async () => {
    const userId = await createTestUser()
    await expect(
      withClient((client) =>
        client.query(`INSERT INTO life_answers (user_id, answer_key, body) VALUES ($1, 'one_thing', 'x')`, [userId])
      )
    ).rejects.toMatchObject({ code: "23502", column: "due_on" })
  })

  test("refuses an update, even from a connection that bypasses RLS", async () => {
    const userId = await createTestUser()
    await insert(userId)
    await expect(
      withClient((client) => client.query(`UPDATE life_answers SET body = 'rewritten'`))
    ).rejects.toMatchObject({ code: "23001", message: expect.stringMatching(/append-only/) })
  })

  /**
   * THROUGH THE ROW RULES, NOT AROUND THEM. This used to delete as the table
   * owner, who is exempt from row security, so the DELETE policy was never
   * consulted and the test passed whatever it said. As a signed-in person: your
   * own rows go, current and historical alike, and somebody else's do not.
   */
  test("a person may delete any of their own answers, and nobody else's", async () => {
    const me = await createTestUser("me@example.com")
    const someoneElse = await createTestUser("else@example.com")
    const historical = (await insert(me, { body: "Run a marathon" })).rows[0].id as string
    const current = (await insert(me, { body: "Quit weed for 100 days" })).rows[0].id as string

    const theirAttempt = await asUser(someoneElse, (q) =>
      q(`DELETE FROM life_answers WHERE id = ANY($1::uuid[]) RETURNING id`, [[historical, current]])
    )
    expect(theirAttempt, "another account's delete removed nothing").toEqual([])

    const mine = await asUser(me, (q) =>
      q(`DELETE FROM life_answers WHERE id = ANY($1::uuid[]) RETURNING id`, [[historical, current]])
    )
    expect(mine.map((r) => r.id).sort()).toEqual([historical, current].sort())

    const left = await withClient((client) => client.query(`SELECT id FROM life_answers WHERE user_id = $1`, [me]))
    expect(left.rows).toHaveLength(0)
  })
})
