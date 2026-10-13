/**
 * A BETA SLOT IS EARNED THROUGH ONE DOOR, AND THE CAP HOLDS UNDER A RACE.
 *
 * `claimBetaSlot` (src/db/betaRepo.ts) calls `claim_beta_slot(code)` through the
 * person's own session and says so in its docblock: "Cap/race handling lives in
 * the DB." Nothing tested that until now — programDrafts' header cited
 * "beta-invite tests" that did not exist. The function body is production's
 * (tests/db/baseline.sql).
 *
 * What only a real Postgres can show:
 *   - the answers: granted once, then already_member; full; invalid
 *   - that membership has no other door: a signed-in person cannot write
 *     `beta_testers` or change `beta_invites` themselves
 *   - that two people racing for the last slot get one 'granted' and one
 *     'full'. The `FOR UPDATE` on the invite row is what makes the second
 *     caller wait and then read the spent count; without it, the second reads
 *     the stale count, passes the cap check, and dies on the CHECK instead.
 *
 * Every claim runs through `asUser`: `auth.uid()` is who is claiming, and an
 * owner connection would have no uid at all.
 *
 * NOTHING IS WIPED. `beta_invites` is not anybody's table, so each test makes
 * its own codes with a random suffix and reads back only its own users' rows.
 */

import { describe, test, expect } from "vitest"
import type { Client } from "pg"
import { randomUUID } from "node:crypto"
import { getClient, createTestUser, asUser } from "../setup"

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

/** A code nobody else's test can have made. */
const code = (name: string) => `${name}-${randomUUID()}`

async function invite(code: string, over: { maxUses?: number; useCount?: number; active?: boolean } = {}) {
  return withClient(async (db) =>
    (
      await db.query(
        `INSERT INTO beta_invites (code, max_uses, use_count, active) VALUES ($1, $2, $3, $4) RETURNING id`,
        [code, over.maxUses ?? 60, over.useCount ?? 0, over.active ?? true]
      )
    ).rows[0].id as string
  )
}

async function useCount(code: string): Promise<number> {
  return withClient(async (db) =>
    Number((await db.query(`SELECT use_count FROM beta_invites WHERE code = $1`, [code])).rows[0].use_count)
  )
}

/** The memberships these users hold — and only theirs. */
async function members(...userIds: string[]): Promise<{ user_id: string; invite_id: string }[]> {
  return withClient(
    async (db) =>
      (
        await db.query(`SELECT user_id, invite_id FROM beta_testers WHERE user_id = ANY($1::uuid[]) ORDER BY user_id`, [
          userIds,
        ])
      ).rows
  )
}

const claim = (userId: string, code: string) =>
  asUser(userId, async (q) => (await q(`SELECT claim_beta_slot($1) AS result`, [code]))[0]!.result as string)

describe("claim_beta_slot", () => {
  test("a valid code grants one slot, once", async () => {
    const me = await createTestUser("me")
    const spring = code("SPRING")
    const inviteId = await invite(spring)

    expect(await claim(me, spring)).toBe("granted")
    expect(await members(me)).toEqual([{ user_id: me, invite_id: inviteId }])
    expect(await useCount(spring)).toBe(1)

    // A second press, a second tab, a retry: no second slot is spent.
    expect(await claim(me, spring)).toBe("already_member")
    expect(await useCount(spring)).toBe(1)
  })

  test("a full, an unknown and a switched-off code are refused, and nothing is written", async () => {
    const me = await createTestUser("me")
    const full = code("FULL")
    const off = code("OFF")
    await invite(full, { maxUses: 1, useCount: 1 })
    await invite(off, { active: false })

    expect(await claim(me, full)).toBe("full")
    expect(await claim(me, code("NO-SUCH-CODE"))).toBe("invalid")
    expect(await claim(me, off)).toBe("invalid")

    expect(await members(me)).toEqual([])
    expect(await useCount(full)).toBe(1)
    expect(await useCount(off)).toBe(0)
  })

  test("nobody signed in gets nothing", async () => {
    const spring = code("SPRING")
    await invite(spring)

    // A request with no session at all arrives as `anon`, which may not call it.
    await expect(
      withClient(async (db) => {
        await db.query("SET ROLE anon")
        return db.query(`SELECT claim_beta_slot($1) AS result`, [spring])
      })
    ).rejects.toMatchObject({ code: "42501" })

    // And the function's own guard: signed in as a role, with no person behind it.
    const result = await withClient(async (db) => {
      await db.query(`SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', false)`)
      await db.query("SET ROLE authenticated")
      return (await db.query(`SELECT claim_beta_slot($1) AS result`, [spring])).rows[0].result
    })
    expect(result).toBe("invalid")
    expect(await useCount(spring)).toBe(0)
  })

  /**
   * NOT A MISSING GRANT, IN PRODUCTION. The hand-written test schema gave the
   * signed-in role no privilege on either table, so both writes failed with
   * "permission denied". Production grants SELECT/INSERT/UPDATE/DELETE on both
   * to `authenticated` and leans on row security alone: no INSERT policy on
   * `beta_testers` (refused, 42501) and no UPDATE policy on `beta_invites`
   * (the update matches no rows). Same rule, different mechanism — so the
   * update is asserted by what it changed, not by an error it never raises.
   */
  test("membership has no other door: a person cannot write themselves in", async () => {
    const me = await createTestUser("me")
    const spring = code("SPRING")
    const inviteId = await invite(spring, { maxUses: 1, useCount: 1 })

    await expect(
      asUser(me, (q) => q(`INSERT INTO beta_testers (user_id, invite_id) VALUES ($1, $2)`, [me, inviteId]))
    ).rejects.toMatchObject({ code: "42501" })
    const touched = await asUser(me, (q) =>
      q(`UPDATE beta_invites SET use_count = 0 WHERE code = $1 RETURNING id`, [spring])
    )
    expect(touched, "a signed-in person reset an invite's count").toEqual([])

    expect(await useCount(spring)).toBe(1)
    expect(await members(me)).toEqual([])
  })

  test("two people racing for the last slot: one is granted, the other is told it is full", async () => {
    const first = await createTestUser("first")
    const second = await createTestUser("second")
    const lastOne = code("LAST-ONE")
    await invite(lastOne, { maxUses: 1 })

    const secondResult = await asUser(first, async (q) => {
      // The first claim is inside an open transaction, so it still holds the
      // invite row when the second caller arrives.
      await q("BEGIN")
      expect((await q(`SELECT claim_beta_slot($1) AS result`, [lastOne]))[0]!.result).toBe("granted")
      const holder = Number((await q(`SELECT pg_backend_pid() AS pid`))[0]!.pid)

      const racing = claim(second, lastOne)
      // Do not commit until the second claim is actually waiting on THIS
      // transaction. Committing first would let it run afterwards and pass
      // without any race.
      await waitUntilSomethingWaitsOn(holder)
      await q("COMMIT")
      return racing
    })

    expect(secondResult).toBe("full")
    expect((await members(first, second)).map((m) => m.user_id)).toEqual([first])
    expect(await useCount(lastOne)).toBe(1)
  })
})

/**
 * Polls until some session is blocked by `holder`; fails loudly if none ever is.
 * By the holder's pid, not by the query's text, so another run on the same
 * backend cannot satisfy it.
 */
async function waitUntilSomethingWaitsOn(holder: number): Promise<void> {
  await withClient(async (db) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const { rows } = await db.query(
        `SELECT count(*)::int AS n FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))`,
        [holder]
      )
      if (rows[0].n > 0) return
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    throw new Error("The second claim never waited on the first: the race this test needs never happened.")
  })
}
