// @vitest-environment node
/**
 * THE CURSOR AND THE ROWS MUST COME FROM THE SAME CLOCK.
 *
 * `pullTimetrackRows` hands out a cursor taken from the server clock and then
 * asks for rows with `updated_at > since`. The rows it compares against arrive
 * from a browser: `stateToRows` writes the entity's own edit time, and the
 * `_touch` triggers in the migration are `before update` only, so the INSERT
 * half of an upsert kept whatever the browser said.
 *
 * Two silent consequences, which is why this is a test and not a comment:
 *
 *   - an entry created offline at 10:00 and uploaded at 10:10 arrives stamped
 *     10:00, so a device whose cursor is already 10:05 never receives it —
 *     "the same on a train" is exactly the promise that breaks;
 *   - a browser running a few minutes slow makes every row it creates
 *     invisible to every other device, for ever.
 *
 * The fix is one line at the write. This pins it.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "user-1"
const WORKSPACE = "11111111-1111-1111-1111-111111111111"

/**
 * Captures what each table was asked to upsert.
 *
 * The chain is self-returning and awaitable, matching what the repo actually
 * calls — `.select().eq().is().order().limit()` for the workspace lookup and
 * `.upsert()` for the writes. A fake shaped from memory rather than from the
 * call site is how the first version of this test failed on
 * `.limit is not a function`.
 */
function fakeSupabase() {
  const upserts: { table: string; rows: Record<string, unknown>[] }[] = []
  const client = {
    from(table: string) {
      const rowsBack = table === "timetrack_workspaces" ? [{ id: WORKSPACE }] : []
      const chain: Record<string, unknown> = {}
      for (const method of ["select", "eq", "is", "order", "gt", "in", "neq"]) {
        chain[method] = () => chain
      }
      chain.limit = async () => ({ data: rowsBack, error: null })
      chain.range = async () => ({ data: rowsBack, error: null })
      chain.maybeSingle = async () => ({ data: rowsBack[0] ?? null, error: null })
      chain.upsert = async (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        upserts.push({ table, rows: Array.isArray(rows) ? rows : [rows] })
        return { error: null }
      }
      return chain
    },
  }
  return { client, upserts }
}

async function pushWith(rows: Record<string, unknown[]>) {
  const fake = fakeSupabase()
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  const repo = await import("@/src/db/timetrackRepo")
  await repo.pushTimetrackRows(USER, rows as never)
  return fake
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
})

beforeEach(() => vi.resetModules())

describe("what the server stores as `updated_at`", () => {
  test("is the server's own clock, not whatever the browser sent", async () => {
    const startedAt = Date.now()
    const fake = await pushWith({
      timetrack_entries: [
        {
          id: "e1",
          workspace_id: WORKSPACE,
          started_at: "2026-09-20T10:00:00.000Z",
          stopped_at: "2026-09-20T11:00:00.000Z",
          duration_seconds: 3600,
          // what a browser that has been offline since ten o'clock sends
          updated_at: "2026-09-20T10:00:00.000Z",
        },
      ],
    })

    const entries = fake.upserts.find((u) => u.table === "timetrack_entries")
    expect(entries, "nothing was written at all").toBeTruthy()
    const stamped = entries!.rows[0].updated_at as string
    expect(stamped, "the browser's stale timestamp was stored as-is").not.toBe("2026-09-20T10:00:00.000Z")
    expect(new Date(stamped).getTime()).toBeGreaterThanOrEqual(startedAt)
  })

  test("is the same instant for every row in one push, so a cursor cannot land inside it", async () => {
    const fake = await pushWith({
      timetrack_entries: [
        { id: "e1", workspace_id: WORKSPACE, updated_at: "2026-01-01T00:00:00.000Z" },
        { id: "e2", workspace_id: WORKSPACE, updated_at: "2026-01-01T00:00:00.000Z" },
      ],
      timetrack_projects: [{ id: "p1", workspace_id: WORKSPACE, updated_at: "2026-01-01T00:00:00.000Z" }],
    })

    const stamps = fake.upserts.flatMap((u) => u.rows.map((r) => r.updated_at))
    expect(new Set(stamps).size, `rows were stamped at different moments: ${JSON.stringify(stamps)}`).toBe(1)
  })

  test("is not invented for the two tables that have no such column", async () => {
    const fake = await pushWith({
      timetrack_entry_tags: [{ entry_id: "e1", tag_id: "t1" }],
      timetrack_webhook_log: [{ id: "w1", workspace_id: WORKSPACE }],
    })

    for (const table of ["timetrack_entry_tags", "timetrack_webhook_log"]) {
      const written = fake.upserts.find((u) => u.table === table)
      // asserted, not skipped: `if (!written) continue` would let this pass by
      // doing nothing on the day the write stops happening at all
      expect(written, `${table} was never written, so this asserts nothing`).toBeTruthy()
      expect(
        "updated_at" in written!.rows[0],
        `${table} has no updated_at column, so writing one would fail the whole batch`,
      ).toBe(false)
    }
  })
})
