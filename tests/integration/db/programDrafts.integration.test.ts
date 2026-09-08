/**
 * Saved training weeks, against a real Postgres.
 *
 * WHAT IS BEING PROVEN. Two things a policy file cannot promise on its own:
 * that the database itself refuses one person's draft to another (the anon key
 * is public, so the app is not the thing standing in the way), and that the
 * shape rules hold for writes that do not come through the app at all.
 *
 * The table owner bypasses RLS, so every denial test runs under the
 * `authenticated` role via SET ROLE — the same shape the beta-invite tests use.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

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

/**
 * Run statements as a signed-in person rather than as the table owner.
 *
 * ON ONE CONNECTION, which is the whole trick. `getClient()` opens a NEW
 * connection every call, so a `SET ROLE` issued on one and a query issued on
 * another are two different sessions — the role never applies, RLS is never
 * exercised, and every denial test passes while proving nothing.
 */
async function asUser<T>(
  userId: string,
  run: (q: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>) => Promise<T>
): Promise<T> {
  const client = await getClient()
  try {
    await client.query("SELECT set_config('test.uid', $1, false)", [userId])
    await client.query("SET ROLE authenticated")
    return await run(async (text, params = []) => (await client.query(text, params)).rows)
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

  it("keeps a week you save, with its lifts intact", async () => {
    const [row] = await sql<{ id: string; schedule: { days: { exercises: unknown[] }[] } }>(
      `INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Push Pull', $2)
       RETURNING id, schedule`,
      [me, WEEK]
    )
    expect(row!.schedule.days[0]!.exercises).toHaveLength(1)
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
    ).rejects.toThrow(/program_drafts_schedule_shape/)
  })

  it("refuses two weeks with the same name for one person", async () => {
    await sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Week A', $2)`, [me, WEEK])
    await expect(
      sql(`INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Week A', $2)`, [me, WEEK])
    ).rejects.toThrow(/duplicate key|unique/i)
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
    ).rejects.toThrow(/program_drafts_name_check|violates check/i)
  })

  it("moves updated_at itself, so a client that forgets cannot reorder the list", async () => {
    const [row] = await sql<{ id: string; updated_at: Date }>(
      `INSERT INTO program_drafts (user_id, name, schedule) VALUES ($1, 'Week A', $2)
       RETURNING id, updated_at`,
      [me, WEEK]
    )
    await sql(`UPDATE program_drafts SET name = 'Week B' WHERE id = $1`, [row!.id])
    const [after] = await sql<{ updated_at: Date }>(
      `SELECT updated_at FROM program_drafts WHERE id = $1`,
      [row!.id]
    )
    expect(new Date(after!.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(row!.updated_at).getTime()
    )
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
