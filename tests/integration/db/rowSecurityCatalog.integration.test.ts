/**
 * EVERY TABLE IS FENCED, AND EVERY FENCE IS DRAWN AROUND ITS OWNER — READ FROM
 * THE CATALOG OF PRODUCTION'S OWN SCHEMA.
 *
 * The old test schema was a hand-written copy with 24 policies on 52 tables;
 * production has 320 on 84, and 29 tables had never been checked by anything.
 * This reads every table and every policy the test backend was built with
 * (tests/db/baseline.sql plus newer migrations), so a table added tomorrow is
 * covered the day it exists, with nobody editing a list.
 *
 * Three rules:
 *   1. row security is on for every public table — no exceptions;
 *   2. every policy ties a row to the signed-in person (it compares `user_id`,
 *      `id` or `owner_id` with `auth.uid()`), or is on SHARED_READS with a
 *      reason;
 *   3. a table with no policy at all (clients refused outright; only server
 *      code with the service role touches it) is on SERVER_ONLY with a reason.
 * Both lists may only shrink, and a stale entry fails.
 */

import { describe, test, expect } from "vitest"
import type { Client } from "pg"
import { getClient } from "../setup"

/** Policies that deliberately let more than the owner read. `table:command` → why. */
const SHARED_READS: Record<string, string> = {
  "core_values:SELECT": "the values catalogue everyone picks from; holds no one's data",
  "values:SELECT": "the same catalogue, read by listValues",
  "embeddings:SELECT": "the coach's research corpus, shared content for Ask Coach; holds no one's data",
}

/** Tables with no client policy at all: only the service role writes or reads them. */
const SERVER_ONLY: Record<string, string> = {
  beta_invites: "invite codes; claimed only through the claim_beta_slot function",
  embeddings_test: "pipeline scratch table for embedding experiments",
  error_reports: "crash reports, written by the server's error route",
  push_devices:
    "notification addresses the server POSTs to; a client-written row would let anyone make the server call any URL (20261030120000_thought_frequencies.sql)",
  thought_prompt_schedule: "when the next thoughts reminder is due; computed and claimed only by the server's clock",
  waitlist_emails: "sign-ups for the waitlist, written by the server",
}

const OWNER_SHAPED =
  /(\(\s*)*(SELECT\s+)?auth\.uid\(\)(\s+AS\s+uid)?(\s*\))*\s*=\s*(\(\s*)*\w*\.?(user_id|id|owner_id)\b|\b(user_id|id|owner_id)\s*=\s*(\(\s*)*(SELECT\s+)?auth\.uid\(\)/i

async function withClient<T>(run: (db: Client) => Promise<T>): Promise<T> {
  const db = await getClient()
  try {
    return await run(db)
  } finally {
    await db.end()
  }
}

async function tables(db: Client): Promise<{ name: string; rls: boolean }[]> {
  const { rows } = await db.query(
    `SELECT relname AS name, relrowsecurity AS rls
       FROM pg_class
      WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'p')
      ORDER BY 1`
  )
  return rows as { name: string; rls: boolean }[]
}

async function policies(db: Client): Promise<{ table: string; cmd: string; name: string; expr: string }[]> {
  const { rows } = await db.query(
    `SELECT tablename AS table, cmd, policyname AS name,
            coalesce(qual, '') || ' ' || coalesce(with_check, '') AS expr
       FROM pg_policies
      WHERE schemaname = 'public'`
  )
  return rows as { table: string; cmd: string; name: string; expr: string }[]
}

/** Every rule broken, as readable lines. */
async function violations(db: Client): Promise<string[]> {
  const all = await tables(db)
  const pols = await policies(db)
  const out: string[] = []
  for (const t of all) if (!t.rls) out.push(`${t.name}: row security is off`)
  for (const p of pols) {
    if (OWNER_SHAPED.test(p.expr) || `${p.table}:${p.cmd}` in SHARED_READS) continue
    out.push(`${p.table}:${p.cmd} "${p.name}" is not tied to its owner: ${p.expr.trim().slice(0, 120)}`)
  }
  for (const t of all) {
    if (!pols.some((p) => p.table === t.name) && !(t.name in SERVER_ONLY)) {
      out.push(`${t.name}: no policy at all — name it in SERVER_ONLY with a reason, or give it one`)
    }
  }
  return out
}

describe("row security across every public table", () => {
  test("is on everywhere, and every policy is owner-shaped or named with a reason", async () => {
    await withClient(async (db) => {
      const all = await tables(db)
      const pols = await policies(db)
      // the scan saw the schema at all, before its empty answer means anything
      expect(all.length, "public tables").toBeGreaterThan(80)
      expect(pols.length, "policies").toBeGreaterThan(300)

      expect(await violations(db)).toEqual([])
    })
  })

  test("names nothing that is no longer true", async () => {
    await withClient(async (db) => {
      const pols = await policies(db)
      const all = await tables(db)
      const staleShared = Object.keys(SHARED_READS).filter(
        (k) => !pols.some((p) => `${p.table}:${p.cmd}` === k && !OWNER_SHAPED.test(p.expr))
      )
      const staleServer = Object.keys(SERVER_ONLY).filter(
        (t) => !all.some((x) => x.name === t) || pols.some((p) => p.table === t)
      )
      expect([...staleShared, ...staleServer]).toEqual([])
    })
  })

  /**
   * THE GUARD PROVES ITSELF: each kind of hole, planted inside a transaction
   * that is always rolled back, so nothing outside this connection ever sees it.
   */
  test("a policy open to every signed-in person, and a table left unfenced, are both caught", async () => {
    await withClient(async (db) => {
      await db.query("BEGIN")
      try {
        await db.query(
          `CREATE POLICY planted_open ON public.life_plan_days FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)`
        )
        await db.query("ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY")
        const found = await violations(db)
        expect(found.some((v) => v.startsWith('life_plan_days:SELECT "planted_open"'))).toBe(true)
        expect(found).toContain("sessions: row security is off")
      } finally {
        await db.query("ROLLBACK")
      }
    })
  })
})
