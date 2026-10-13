/**
 * NO CLIENT MAY TRUNCATE A TABLE — READ FROM THE CATALOG.
 *
 * TRUNCATE ignores row security entirely: one `truncate profiles` from a
 * signed-in session would empty the table for everybody, whatever the policies
 * say. Production took it away from the client roles in
 * 20260908120000_revoke_truncate_from_clients.sql, and its default privileges
 * (the end of tests/db/baseline.sql) no longer grant it to new tables.
 *
 * WHY THIS EXISTS. Until 2026-10-13 the test backend handed anon and
 * authenticated TRUNCATE on all 84 tables — the local stack's own defaults
 * applied as the baseline was restored, and pg_dump never writes the REVOKE
 * that would narrow them (tests/db/before-baseline.sql). Nothing noticed,
 * because nothing asked. This asks, so the backend cannot silently drift wider
 * than production again, and a migration that grants it back fails here.
 */

import { describe, test, expect } from "vitest"
import type { Client } from "pg"
import { getClient } from "../setup"

async function withClient<T>(run: (db: Client) => Promise<T>): Promise<T> {
  const db = await getClient()
  try {
    return await run(db)
  } finally {
    await db.end()
  }
}

const CLIENT_ROLES = ["anon", "authenticated"]

/** Every public table either client role may TRUNCATE, as `role: table`. */
async function truncatableByClients(db: Client): Promise<string[]> {
  const { rows } = await db.query(
    `SELECT r.role || ': ' || c.relname AS grant
       FROM pg_class c, unnest($1::text[]) AS r(role)
      WHERE c.relnamespace = 'public'::regnamespace
        AND c.relkind IN ('r', 'p')
        AND has_table_privilege(r.role, c.oid, 'TRUNCATE')
      ORDER BY 1`,
    [CLIENT_ROLES]
  )
  return rows.map((r) => r.grant as string)
}

describe("what the client roles may do to a whole table", () => {
  test("neither anon nor authenticated may TRUNCATE any public table", async () => {
    await withClient(async (db) => {
      const { rows } = await db.query(
        `SELECT count(*)::int AS n FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'p')`
      )
      // The scan saw the schema at all, before its empty answer means anything.
      expect(rows[0].n, "public tables — the catalog query found too few").toBeGreaterThan(80)

      expect(
        await truncatableByClients(db),
        "TRUNCATE bypasses row security — revoke it, as 20260908120000_revoke_truncate_from_clients.sql did"
      ).toEqual([])
    })
  })

  /**
   * THE GUARD PROVES ITSELF: the grant this file exists to catch, planted and
   * seen, inside a transaction that is always rolled back — so nothing outside
   * this connection ever holds it.
   */
  test("a planted TRUNCATE grant is caught", async () => {
    await withClient(async (db) => {
      await db.query("BEGIN")
      try {
        await db.query("GRANT TRUNCATE ON public.error_reports TO authenticated")
        expect(await truncatableByClients(db)).toContain("authenticated: error_reports")
      } finally {
        await db.query("ROLLBACK")
      }
    })
  })
})
