// @vitest-environment node
/**
 * Reading a table has to page, or a long history quietly stops.
 *
 * An unpaged query comes back capped at 1,000 rows and says nothing about it —
 * no error, no flag, just fewer rows. Measured against the live database: a
 * table holding 32,126 rows returned exactly 1,000. For a tracker used daily
 * that cap is somewhere around a year and a half of entries, after which
 * someone opening the app on a new phone would find their history simply stops.
 */

import { afterEach, describe, expect, test, vi } from "vitest"

/** Records how a table was read, and hands back pages of a chosen size */
function fakeSupabase(rowsPerTable: Record<string, number>) {
  const ranges: Record<string, [number, number][]> = {}

  const builder = (table: string) => {
    let from = 0
    let to = 999
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      gt: () => chain,
      is: () => chain,
      limit: () => chain,
      order: () => chain,
      range: (a: number, b: number) => {
        from = a
        to = b
        return chain
      },
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => {
        ranges[table] = [...(ranges[table] ?? []), [from, to]]
        const total = rowsPerTable[table] ?? 0
        const slice = Array.from({ length: Math.max(0, Math.min(to + 1, total) - from) }, (_, i) => ({
          id: `${table}-${from + i}`,
          user_id: "u1",
        }))
        return resolve({ data: slice, error: null })
      },
    }
    return chain
  }

  return { client: { from: (table: string) => builder(table) }, ranges }
}

afterEach(() => vi.resetModules())

async function pullWith(rowsPerTable: Record<string, number>) {
  const { client, ranges } = fakeSupabase(rowsPerTable)
  vi.doMock("@/src/db/server", () => ({ createServerSupabaseClient: async () => client }))
  const { pullTimetrackRows } = await import("@/src/db/timetrackRepo")
  const result = await pullTimetrackRows("u1")
  return { result, ranges }
}

describe("reading a workspace", () => {
  test("a table larger than one page is read in full, not truncated", async () => {
    const { result, ranges } = await pullWith({ timetrack_entries: 2500 })
    expect(result.rows.timetrack_entries).toHaveLength(2500)
    // 1000 + 1000 + 500: the short page is what says "that was the end"
    expect(ranges.timetrack_entries).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  test("a table that exactly fills a page still asks once more", async () => {
    // otherwise the row after a perfectly-full page is invisible forever
    const { result, ranges } = await pullWith({ timetrack_entries: 1000 })
    expect(result.rows.timetrack_entries).toHaveLength(1000)
    expect(ranges.timetrack_entries).toHaveLength(2)
  })

  test("a small table is read in a single request", async () => {
    const { ranges } = await pullWith({ timetrack_entries: 12 })
    expect(ranges.timetrack_entries).toHaveLength(1)
  })

  test("an empty table costs one request and returns nothing", async () => {
    const { result, ranges } = await pullWith({})
    expect(result.rows.timetrack_entries).toEqual([])
    expect(ranges.timetrack_entries).toHaveLength(1)
  })

  test("every table is read, not just the obvious ones", async () => {
    const { ranges } = await pullWith({})
    for (const table of ["timetrack_entries", "timetrack_projects", "timetrack_settings", "timetrack_entry_tags", "timetrack_webhook_log"]) {
      expect(ranges[table], `${table} was never read`).toBeTruthy()
    }
  })
})
