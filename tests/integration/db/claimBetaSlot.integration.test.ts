/**
 * A BETA SLOT IS EARNED THROUGH ONE DOOR, AND THE CAP HOLDS UNDER A RACE.
 *
 * `claimBetaSlot` (src/db/betaRepo.ts) calls `claim_beta_slot(code)` through the
 * person's own session and says so in its docblock: "Cap/race handling lives in
 * the DB." Nothing tested that until now — programDrafts' header cited
 * "beta-invite tests" that did not exist. The function body here is the
 * mirror's copy of 20260709_create_beta_tables.sql.
 *
 * What only a real Postgres can show:
 *   - the answers: granted once, then already_member; full; invalid
 *   - that membership has no other door: a signed-in person cannot write
 *     `beta_testers` or `beta_invites` themselves (no grant, no policy)
 *   - that two people racing for the last slot get one 'granted' and one
 *     'full'. The `FOR UPDATE` on the invite row is what makes the second
 *     caller wait and then read the spent count; without it, the second reads
 *     the stale count, passes the cap check, and dies on the CHECK instead.
 *
 * Every claim runs through `asUser`: `auth.uid()` is who is claiming, and an
 * owner connection would have no uid at all.
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

async function members(): Promise<{ user_id: string; invite_id: string }[]> {
  return withClient(async (db) => (await db.query(`SELECT user_id, invite_id FROM beta_testers`)).rows)
}

const claim = (userId: string, code: string) =>
  asUser(userId, async (q) => (await q(`SELECT claim_beta_slot($1) AS result`, [code]))[0]!.result as string)

describe("claim_beta_slot", () => {
  beforeEach(async () => {
    // truncateAllTables empties beta_testers (it cascades from profiles) but
    // not beta_invites, which nothing references from a truncated table.
    await truncateAllTables()
    await withClient((db) => db.query(`DELETE FROM beta_invites`))
  })

  test("a valid code grants one slot, once", async () => {
    const me = await createTestUser("me@example.com")
    const inviteId = await invite("SPRING-26")

    expect(await claim(me, "SPRING-26")).toBe("granted")
    expect(await members()).toEqual([{ user_id: me, invite_id: inviteId }])
    expect(await useCount("SPRING-26")).toBe(1)

    // A second press, a second tab, a retry: no second slot is spent.
    expect(await claim(me, "SPRING-26")).toBe("already_member")
    expect(await useCount("SPRING-26")).toBe(1)
  })

  test("a full, an unknown and a switched-off code are refused, and nothing is written", async () => {
    const me = await createTestUser("me@example.com")
    await invite("FULL", { maxUses: 1, useCount: 1 })
    await invite("OFF", { active: false })

    expect(await claim(me, "FULL")).toBe("full")
    expect(await claim(me, "NO-SUCH-CODE")).toBe("invalid")
    expect(await claim(me, "OFF")).toBe("invalid")

    expect(await members()).toEqual([])
    expect(await useCount("FULL")).toBe(1)
    expect(await useCount("OFF")).toBe(0)
  })

  test("nobody signed in gets nothing", async () => {
    await invite("SPRING-26")
    // `asUser` with an empty uid: the role is `authenticated`, but `auth.uid()`
    // is NULL — a request with no session behind it.
    const result = await asUser("", async (q) => (await q(`SELECT claim_beta_slot('SPRING-26') AS result`))[0]!.result)
    expect(result).toBe("invalid")
    expect(await useCount("SPRING-26")).toBe(0)
  })

  test("membership has no other door: a person cannot write themselves in", async () => {
    const me = await createTestUser("me@example.com")
    const inviteId = await invite("SPRING-26", { maxUses: 1, useCount: 1 })

    await expect(
      asUser(me, (q) => q(`INSERT INTO beta_testers (user_id, invite_id) VALUES ($1, $2)`, [me, inviteId]))
    ).rejects.toMatchObject({ code: "42501" })
    await expect(
      asUser(me, (q) => q(`UPDATE beta_invites SET use_count = 0 WHERE code = 'SPRING-26'`))
    ).rejects.toMatchObject({ code: "42501" })

    expect(await members()).toEqual([])
  })

  test("two people racing for the last slot: one is granted, the other is told it is full", async () => {
    const first = await createTestUser("first@example.com")
    const second = await createTestUser("second@example.com")
    await invite("LAST-ONE", { maxUses: 1 })

    const secondResult = await asUser(first, async (q) => {
      // The first claim is inside an open transaction, so it still holds the
      // invite row when the second caller arrives.
      await q("BEGIN")
      expect((await q(`SELECT claim_beta_slot('LAST-ONE') AS result`))[0]!.result).toBe("granted")

      const racing = claim(second, "LAST-ONE")
      // Do not commit until the second claim is actually waiting on the row.
      // Committing first would let it run afterwards and pass without any race.
      await waitUntilAClaimIsBlocked()
      await q("COMMIT")
      return racing
    })

    expect(secondResult).toBe("full")
    expect((await members()).map((m) => m.user_id)).toEqual([first])
    expect(await useCount("LAST-ONE")).toBe(1)
  })
})

/** Polls until some session is waiting on a lock inside claim_beta_slot; fails loudly if none ever is. */
async function waitUntilAClaimIsBlocked(): Promise<void> {
  await withClient(async (db) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const { rows } = await db.query(
        `SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE wait_event_type = 'Lock' AND query ILIKE '%claim_beta_slot%'`
      )
      if (rows[0].n > 0) return
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    throw new Error("The second claim never waited on the first: the race this test needs never happened.")
  })
}
