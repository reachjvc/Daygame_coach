/**
 * AT5 — the constraints on `life_answers`, against a real Postgres.
 *
 * Every one of these was also run against the live project on 2026-08-27, and
 * the last one is here because it did NOT hold the first time: the table has no
 * UPDATE policy, which stops the app's client and does nothing at all to the
 * service-role key. An `update` probe went through and destroyed a real answer.
 * The trigger is what makes append-only true rather than merely intended.
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

describe("life_answers constraints", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  const insert = async (userId: string, over: Record<string, unknown> = {}) => {
    const row = { answer_key: "one_thing", body: "Quit weed for 100 days", due_on: "2026-12-01", ...over }
    return (await getClient()).query(
      `INSERT INTO life_answers (user_id, answer_key, body, due_on) VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, row.answer_key, row.body, row.due_on]
    )
  }

  test("accepts an ordinary answer", async () => {
    const userId = await createTestUser()
    const res = await insert(userId)
    expect(res.rows).toHaveLength(1)
  })

  test("rejects a blank answer", async () => {
    const userId = await createTestUser()
    await expect(insert(userId, { body: "   " })).rejects.toThrow(/life_answers_body_check/)
  })

  test("rejects an answer longer than 2000 characters", async () => {
    const userId = await createTestUser()
    await expect(insert(userId, { body: "a".repeat(2001) })).rejects.toThrow(/life_answers_body_check/)
  })

  test("rejects a key that is not in the namespace", async () => {
    const userId = await createTestUser()
    await expect(insert(userId, { answer_key: "north_star" })).rejects.toThrow(/answer_key_check/)
  })

  test("rejects a row with no deadline — the database must not guess one", async () => {
    const userId = await createTestUser()
    await expect(
      (await getClient()).query(`INSERT INTO life_answers (user_id, answer_key, body) VALUES ($1, 'one_thing', 'x')`, [userId])
    ).rejects.toThrow(/due_on/)
  })

  test("refuses an update, even from a connection that bypasses RLS", async () => {
    const userId = await createTestUser()
    await insert(userId)
    await expect((await getClient()).query(`UPDATE life_answers SET body = 'rewritten'`)).rejects.toThrow(/append-only/)
  })

  test("allows deleting any of your own rows, current or historical", async () => {
    const userId = await createTestUser()
    const { rows } = await insert(userId)
    await (await getClient()).query(`DELETE FROM life_answers WHERE id = $1`, [rows[0].id])
    const left = await (await getClient()).query(`SELECT id FROM life_answers WHERE user_id = $1`, [userId])
    expect(left.rows).toHaveLength(0)
  })

  test("goes away with the account", async () => {
    const userId = await createTestUser()
    await insert(userId)
    await (await getClient()).query(`DELETE FROM profiles WHERE id = $1`, [userId])
    const left = await (await getClient()).query(`SELECT id FROM life_answers WHERE user_id = $1`, [userId])
    expect(left.rows).toHaveLength(0)
  })
})
