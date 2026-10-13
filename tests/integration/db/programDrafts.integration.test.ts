/**
 * Saved training weeks, against a real Postgres.
 *
 * WHAT IS BEING PROVEN. Two things a policy file cannot promise on its own:
 * that the database itself refuses one person's draft to another (the anon key
 * is public, so the app is not the thing standing in the way), and that the
 * shape rules hold for writes that do not come through the app at all.
 *
 * The table owner bypasses RLS, so every denial test runs under the
 * `authenticated` role via `asUser` (tests/integration/setup.ts).
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { getClient, truncateAllTables, createTestUser, asUser } from "../setup"

const WEEK = JSON.stringify({
  kind: "linear_rotation",
  days: [
    {
      id: "day1",
      label: "Push",
      exercises: [
        {
          id: "bench",
          name: "Bench Press",
          metricType: "load",
          scheme: { kind: "linear", sets: 3, reps: 5 },
          progression: { kind: "none" },
        },
      ],
    },
  ],
})

/** One statement, one connection — the pattern the sibling files here use. */
async function sql<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getClient()
  try {
    const res = await client.query(text, params)
    return res.rows as T[]
  } finally {
    await client.end()
  }
}

describe("program_drafts", () => {
  let me = ""
  let someoneElse = ""

  beforeEach(async () => {
    await truncateAllTables()
    me = await createTestUser()
    someoneElse = await createTestUser()
  })

  afterAll(async () => {
    await truncateAllTables()
  })

  /**
   * A DRAFT MAY BE HALF-BUILT. Building a week over two sittings is the
   * ordinary case; refusing to SAVE one is how the builder came to lose
   * everything when the tab was closed. Being runnable is checked at start.
   */
  it("accepts a day with nothing in it yet", async () => {
    const empty = JSON.stringify({
      kind: "linear_rotation",
      days: [{ id: "day1", label: "Monday", exercises: [] }],
    })
    const rows = await sql(
      `INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Half done', $2) RETURNING id`,
      [me, empty]
    )
    expect(rows).toHaveLength(1)
  })

  it("refuses a schedule that is not an object with days", async () => {
    await expect(
      sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Broken', '[]'::jsonb)`, [me])
    ).rejects.toMatchObject({ code: "23514", constraint: "program_drafts_schedule_shape" })
  })

  it("refuses two weeks with the same name for one person", async () => {
    await sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Week A', $2)`, [me, WEEK])
    await expect(
      sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Week A', $2)`, [me, WEEK])
    ).rejects.toMatchObject({ code: "23505", constraint: "program_drafts_user_id_name_key" })
  })

  it("lets two different people each have a week called the same thing", async () => {
    await sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Week A', $2)`, [me, WEEK])
    const rows = await sql(
      `INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Week A', $2) RETURNING id`,
      [someoneElse, WEEK]
    )
    expect(rows).toHaveLength(1)
  })

  it("refuses a name that is only spaces", async () => {
    await expect(
      sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, '   ', $2)`, [me, WEEK])
    ).rejects.toMatchObject({ code: "23514", constraint: "program_drafts_name_check" })
  })

  /**
   * SEEDED FROM 2020, so "it moved" cannot pass by the update landing in the
   * same instant as the insert — which is all `>=` against the insert's own
   * timestamp could ever prove. And the update names an old value outright: a
   * client sending a stale `updated_at` must not be able to bury a week either.
   */
  it("moves updated_at itself, so a client that forgets cannot reorder the list", async () => {
    const [row] = await sql<{ id: string }>(
      `INSERT INTO program_drafts (user_id, name, schedule, updated_at)
       VALUES ($1, 'Week A', $2, '2020-01-01T00:00:00Z') RETURNING id`,
      [me, WEEK]
    )
    await sql(`UPDATE program_drafts SET name = 'Week B' WHERE id = $1`, [row!.id])
    const [renamed] = await sql<{ fresh: boolean }>(
      `SELECT updated_at > now() - interval '1 minute' AS fresh FROM program_drafts WHERE id = $1`,
      [row!.id]
    )
    expect(renamed!.fresh, "a rename moves the week to the top").toBe(true)

    await sql(`UPDATE program_drafts SET updated_at = '2020-01-01T00:00:00Z' WHERE id = $1`, [row!.id])
    const [stale] = await sql<{ fresh: boolean }>(
      `SELECT updated_at > now() - interval '1 minute' AS fresh FROM program_drafts WHERE id = $1`,
      [row!.id]
    )
    expect(stale!.fresh, "a stale timestamp from the client is overwritten").toBe(true)
  })

  // ---- the security property, exercised rather than asserted --------------

  it("does not show one person another person's saved week", async () => {
    await sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Mine', $2)`, [me, WEEK])
    const visible = await asUser(someoneElse, (q) =>
      q(`SELECT count(*) AS n FROM program_drafts`)
    )
    expect(Number(visible[0]!.n)).toBe(0)
  })

  it("lets a person read their own", async () => {
    await sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Mine', $2)`, [me, WEEK])
    const visible = await asUser(me, (q) => q(`SELECT count(*) AS n FROM program_drafts`))
    expect(Number(visible[0]!.n)).toBe(1)
  })

  it("refuses a week written under somebody else's name", async () => {
    await expect(
      asUser(me, (q) =>
        q(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Theirs', $2)`, [
          someoneElse,
          WEEK,
        ])
      )
    ).rejects.toThrow(/row-level security/i)
  })

  it("changes nothing when one person edits another's week", async () => {
    await sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Mine', $2)`, [me, WEEK])
    await asUser(someoneElse, (q) => q(`UPDATE program_drafts SET name = 'Stolen'`))
    const [row] = await sql<{ name: string }>(`SELECT name FROM program_drafts`)
    expect(row!.name).toBe("Mine")
  })

  it("deletes nothing when one person deletes another's week", async () => {
    await sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Mine', $2)`, [me, WEEK])
    await asUser(someoneElse, (q) => q(`DELETE FROM program_drafts`))
    const rows = await sql(`SELECT id FROM program_drafts`)
    expect(rows).toHaveLength(1)
  })

  /**
   * A DRAFT CANNOT BE HANDED TO ANOTHER ACCOUNT. Postgres uses an UPDATE
   * policy's USING clause as its WITH CHECK when none is given, so this holds
   * either way — checked by removing the explicit clause and re-running, which
   * still refused. The test is here because the guarantee matters, not because
   * one keyword provides it.
   */
  it("refuses to let a person give their week away to another account", async () => {
    await sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Mine', $2)`, [me, WEEK])
    await expect(
      asUser(me, (q) => q(`UPDATE program_drafts SET user_id = $1`, [someoneElse]))
    ).rejects.toThrow(/row-level security/i)
  })
})
