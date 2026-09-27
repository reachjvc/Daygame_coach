// @vitest-environment node
/**
 * PAGING SORTS BY SOMETHING UNIQUE, AND UNTIL NOW NOTHING CHECKED THAT.
 *
 * `src/db/paging.ts` states the rule: "order by something unique — if rows tie on
 * the sort key, the database may put the same row in both pages and neither page
 * has the one it displaced." `timetrack_entry_tags` was ordered by `entry_id`
 * alone, and an entry with three tags is three rows sharing that value.
 *
 * The consequence was not a missing tag. The duplicate a page boundary can produce
 * became two identical `(entry_id, tag_id)` rows in one upsert, which Postgres
 * refuses every time it is offered — and `isolateRefusedRows` splits the pair into
 * halves that each write cleanly, so it names nothing, the browser drops nothing,
 * and the queue retries an impossible payload until the page is reloaded.
 *
 * WHY THIS FILE EXISTS AT ALL: the fix landed in two repos and neither had a test.
 * The only fake that drives `pullTimetrackRows` stubs `order: () => chain`, which
 * cannot see a wrong sort key by construction — it proves paging happens, not that
 * paging is correct — and `timetrackBackupRepo`'s copy, which is the one that
 * writes a backup FILE, had no caller in the suite at all. A reviewer found the
 * comment in a neighbouring test claiming this was "pinned"; it was not.
 *
 * So this fake records what it was asked to sort by, and the assertion is that every
 * table's sort is unique — checked against the row identity, not against a list of
 * table names typed out again here.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { rowKeyColumns, TIMETRACK_TABLES } from "@/src/db/timetrackTypes"

const USER = "11111111-1111-1111-1111-111111111111"

/** Records every `.order()` the code under test asks for, per table. */
function recordingSupabase() {
  const ordered: Record<string, string[]> = {}
  const make = (table: string) => {
    const chain: Record<string, unknown> = {}
    for (const method of ["select", "eq", "is", "gt", "in", "neq"]) chain[method] = () => chain
    chain.order = (column: string) => {
      ordered[table] = [...(ordered[table] ?? []), column]
      return chain
    }
    // `.range()` and `.gt()` come BEFORE `.order()` in the real code and the whole
    // chain is awaited at the end, so the chain has to be the thenable — a fake
    // whose `range` resolves immediately never reaches the `.order()` under test.
    chain.range = () => chain
    chain.limit = () => chain
    chain.upsert = () => chain
    chain.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null })
    return chain
  }
  return { ordered, client: { from: (table: string) => make(table) } }
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/admin")
})
beforeEach(() => vi.resetModules())

describe.each([
  ["pullTimetrackRows", "@/src/db/supabase", "createServerSupabaseClient", async (repo: Record<string, unknown>) => (repo.pullTimetrackRows as (u: string) => Promise<unknown>)(USER), "@/src/db/timetrackRepo"],
])("%s", (_name, moduleId, exportName, run, repoPath) => {
  test("sorts every table by a key that cannot tie", async () => {
    const fake = recordingSupabase()
    vi.doMock(moduleId, () => ({ [exportName]: async () => fake.client }))
    const repo = await import(repoPath)
    await run(repo as Record<string, unknown>)

    const wrong: string[] = []
    for (const table of TIMETRACK_TABLES) {
      const asked = fake.ordered[table]
      // asserted, not skipped: a table that was never read is a table whose rows
      // never arrive, and `if (!asked) continue` would let that pass silently
      expect(asked, `${table} was never read at all`).toBeDefined()
      const identity = [...rowKeyColumns(table)]
      if (asked!.join(",") !== identity.join(",")) wrong.push(`${table} sorted by [${asked!.join(", ")}], identity is [${identity.join(", ")}]`)
    }
    expect(wrong, `these tables can put one row in two pages:\n  ${wrong.join("\n  ")}`).toEqual([])
  })
})

describe("the fake itself", () => {
  test("would notice a single-column sort on a composite table", () => {
    /**
     * The guard on the guard. The existing paging fake returns `chain` from
     * `order` and therefore cannot fail this way, which is how the defect lived
     * in two repos with a green suite. This proves the recorder sees the argument.
     */
    const fake = recordingSupabase()
    const chain = fake.client.from("timetrack_entry_tags") as { order: (c: string) => unknown }
    chain.order("entry_id")
    expect(fake.ordered.timetrack_entry_tags).toEqual(["entry_id"])
    expect(rowKeyColumns("timetrack_entry_tags")).toEqual(["entry_id", "tag_id"])
  })
})
