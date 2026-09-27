/**
 * THE ORDER ROWS ARE WRITTEN IN IS A CLAIM ABOUT THE SCHEMA, SO CHECK IT
 * AGAINST THE SCHEMA.
 *
 * `pushTimetrackRows` writes nineteen tables in nineteen separate statements,
 * in the order `TIMETRACK_TABLES` declares. A child written before its parent
 * raises a foreign key violation that fails its whole batch — and the browser
 * treats a refusal as permanent: it drops those rows from the queue and records
 * them as sent, so the row is never offered again.
 *
 * Found on 2026-09-27: the repo re-sorted the list by a hand-written rank that
 * put `timetrack_projects` at 1 and left `timetrack_clients` in the catch-all at
 * 4, while `timetrack_projects.client_id references timetrack_clients(id)`. Every
 * project created with a client attached — the dropdown on the project form, and
 * every project in a Toggl CSV import — was refused and silently dropped, and
 * its tasks and entries went the same way on the next push.
 *
 * The rank was one name short of correct, and would have been again the next time
 * a table was added. This reads the foreign keys out of the migration instead, so
 * the check knows what the database knows.
 */

// @vitest-environment node
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TIMETRACK_TABLES } from "@/src/db/timetrackTypes"

const MIGRATION = join(process.cwd(), "supabase/migrations/20260903120000_timetrack.sql")

/** Every `child -> parent` pair the migration declares, read from the SQL. */
function foreignKeys(): { child: string; parent: string; column: string }[] {
  const sql = readFileSync(MIGRATION, "utf8")
  const pairs: { child: string; parent: string; column: string }[] = []

  // `create table public.timetrack_x (` … up to the closing `);` at line start
  const tableBlocks = sql.matchAll(/create table (?:if not exists )?public\.(timetrack_\w+)\s*\(([\s\S]*?)\n\);/g)
  for (const [, child, body] of tableBlocks) {
    for (const [, column, parent] of body.matchAll(/^\s*(\w+)[^,\n]*?references public\.(timetrack_\w+)\s*\(/gm)) {
      pairs.push({ child, parent, column })
    }
  }
  return pairs
}

const USER = "user-1"
const WORKSPACE = "11111111-1111-1111-1111-111111111111"

/**
 * The tables `pushTimetrackRows` upserts, in the order it upserts them, with one
 * row handed to every table so none can be skipped for being empty.
 */
async function observeWriteOrder(): Promise<string[]> {
  const order: string[] = []
  const client = {
    from(table: string) {
      const chain: Record<string, unknown> = {}
      for (const method of ["select", "eq", "is", "order", "gt", "in", "neq"]) chain[method] = () => chain
      chain.limit = async () => ({ data: table === "timetrack_workspaces" ? [{ id: WORKSPACE }] : [], error: null })
      chain.upsert = async () => {
        order.push(table)
        return { error: null }
      }
      return chain
    },
  }
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => client }))
  vi.doMock("@/src/db/server", () => ({ createServerSupabaseClient: async () => client }))
  const repo = await import("@/src/db/timetrackRepo")

  // one row per table, keyed the way each table is keyed
  const rows: Record<string, unknown[]> = {}
  for (const table of TIMETRACK_TABLES) {
    rows[table] =
      table === "timetrack_entry_tags"
        ? [{ entry_id: "e1", tag_id: "t1" }]
        : table === "timetrack_settings"
          ? [{ user_id: USER }]
          : [{ id: `${table}-1`, workspace_id: WORKSPACE }]
  }
  await repo.pushTimetrackRows(USER, rows as never)
  return order
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/server")
})

describe("the order the tables are written in", () => {
  const keys = foreignKeys()

  test("the migration really was parsed, so the rest of this asserts something", () => {
    /**
     * Asserted, not assumed. A regex that silently matched nothing would leave
     * every test below passing over an empty list — the failure mode this file
     * exists to catch, one level up.
     */
    expect(keys.length, `no foreign keys parsed out of ${MIGRATION}`).toBeGreaterThan(20)
    expect(keys).toEqual(
      expect.arrayContaining([{ child: "timetrack_projects", parent: "timetrack_clients", column: "client_id" }]),
    )
  })

  test("every table comes after the tables it points at, in the order actually written", async () => {
    /**
     * THE ORDER IS TAKEN FROM THE FUNCTION, NOT FROM THE LIST IT READS.
     *
     * The first version of this test compared the foreign keys against
     * `TIMETRACK_TABLES` and passed the moment it was written — because the list
     * was never the broken part. `pushTimetrackRows` re-sorted it on the way
     * past, so a test on the declared order would have been green throughout the
     * bug it was written for, and green again the next time someone re-sorted it.
     * So this drives the real function and records what it asks the database for.
     */
    const written = await observeWriteOrder()
    const position = new Map<string, number>(written.map((table, index) => [table, index]))
    const wrong: string[] = []

    for (const { child, parent, column } of keys) {
      if (child === parent) continue // a self-reference cannot be ordered
      const childAt = position.get(child)
      const parentAt = position.get(parent)
      expect(childAt, `${child} was never written, so its position is unknown`).toBeDefined()
      expect(parentAt, `${parent} was never written, so its position is unknown`).toBeDefined()
      if (childAt! < parentAt!) wrong.push(`${child}.${column} -> ${parent} (written ${parentAt! - childAt!} statements too late)`)
    }

    expect(wrong, `these rows are written before the rows they reference:\n  ${wrong.join("\n  ")}`).toEqual([])
  })

  test("no table in the schema is missing from the write order", () => {
    /**
     * A table the app never writes is a table whose rows never leave the
     * browser. Reading it from the migration means adding a table cannot quietly
     * skip this.
     */
    const declared = new Set<string>(TIMETRACK_TABLES)
    const inSchema = new Set(
      [...readFileSync(MIGRATION, "utf8").matchAll(/create table (?:if not exists )?public\.(timetrack_\w+)/g)].map((m) => m[1]),
    )
    expect(inSchema.size).toBeGreaterThan(15)
    expect([...inSchema].filter((table) => !declared.has(table))).toEqual([])
  })
})
