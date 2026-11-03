// @vitest-environment node
/**
 * A ROW WRITTEN WHILE ANOTHER DEVICE IS MID-CHECK IS NOT MISSED.
 *
 * Sync defect #7 in Plans/time-tracker-like-toggl.md. A check hands out a
 * checkpoint taken BEFORE it reads, and the next check asks for rows changed
 * after that checkpoint. A write stamped just before the checkpoint but
 * committed just after the read — a transaction takes its time from when it
 * began, not from when it lands — falls in the gap: too late for this read, too
 * early for the next one. The row then stayed missing on that device until a
 * reload.
 *
 * So every check reaches five seconds further back than the checkpoint it was
 * given. Rows that come twice are harmless: they are the server's current copy
 * of something the device already holds, and the merge takes the same row
 * again (pinned in `aPullDoesNotUndoWhatYouJustDid`: "does not redraw the
 * workspace for an echo of your own writes").
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "user-1"

function fakeSupabase() {
  const asked: { table: string; column: string; value: string }[] = []
  const client = {
    from(table: string) {
      const chain: Record<string, unknown> = {}
      // the repo builds the query in this order: select, eq, range, then gt and order
      for (const method of ["select", "eq", "is", "order", "in", "neq", "range"]) chain[method] = () => chain
      chain.gt = (column: string, value: string) => {
        asked.push({ table, column, value })
        return chain
      }
      // awaited at the end, as a Supabase query is
      chain.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null })
      return chain
    },
  }
  return { client, asked }
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
})
beforeEach(() => vi.resetModules())

describe("what a check asks for", () => {
  test("reaches five seconds behind the checkpoint it was given", async () => {
    const fake = fakeSupabase()
    vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
    const repo = await import("@/src/db/timetrackRepo")

    await repo.pullTimetrackRows(USER, "2026-11-03T10:00:05.000Z")

    expect(fake.asked.length, "no table was asked by time at all, so this proves nothing").toBeGreaterThan(0)
    for (const { table, column, value } of fake.asked) {
      expect(column).toBe("updated_at")
      expect(value, `${table} was asked from the checkpoint itself, so a late commit falls in the gap`).toBe(
        "2026-11-03T10:00:00.000Z",
      )
    }
  })

  test("a full read is still a full read", async () => {
    const fake = fakeSupabase()
    vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
    const repo = await import("@/src/db/timetrackRepo")

    await repo.pullTimetrackRows(USER, null)
    expect(fake.asked).toEqual([])
  })
})
