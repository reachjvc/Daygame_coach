// @vitest-environment node
/**
 * A REFUSED ROW MUST BE NAMED IN THE LANGUAGE THE BROWSER KEEPS ITS QUEUE IN.
 *
 * When the server refuses specific rows it reports which, so the browser can take
 * them out of the queue and stop offering them. It reported `String(row.id ?? "")`
 * — and three tables have no `id` column: `timetrack_entry_tags` is keyed by the
 * pair it joins, `timetrack_settings` by the person, and `timetrack_webhook_log`
 * has no identity the client tracks.
 *
 * So a refusal in any of those named NOTHING. The browser's drop branch is gated
 * on having at least one name, so it was skipped entirely: the row stayed queued,
 * the status went to error with no retry armed, and every later edit joined the
 * same all-or-nothing batch and was refused with it.
 *
 * The reachable version, start to finish: log a client call with a tag and mistype
 * the end time. The entry is refused by its check constraint, isolated, named and
 * correctly dropped. The orphan `(entry_id, tag_id)` link behind it then fails its
 * foreign key — named as `""` — and stays. Nothing this account writes ever
 * reaches the server again, and a reload cannot help because the queue is read
 * back from `localStorage`. The only thing the person is told is "Reload to
 * resync."
 *
 * The key is defined once now, in `src/db/timetrackTypes.ts`, and both sides ask
 * for it. This pins the server's half.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { rowKeyOf } from "@/src/db/timetrackTypes"

const USER = "user-1"
const WORKSPACE = "11111111-1111-1111-1111-111111111111"

/** A server that refuses any batch containing `poison`, and accepts the rest. */
function fakeSupabase(poison: (row: Record<string, unknown>) => boolean) {
  const client = {
    from(table: string) {
      const chain: Record<string, unknown> = {}
      for (const method of ["select", "eq", "is", "order", "gt", "in", "neq"]) chain[method] = () => chain
      chain.limit = async () => ({ data: table === "timetrack_workspaces" ? [{ id: WORKSPACE }] : [], error: null })
      chain.upsert = async (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        const batch = Array.isArray(rows) ? rows : [rows]
        return batch.some(poison) ? { error: { message: 'violates foreign key constraint "x_fkey"' } } : { error: null }
      }
      return chain
    },
  }
  return client
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
})
beforeEach(() => vi.resetModules())

async function pushExpectingRefusal(rows: Record<string, unknown[]>, poison: (row: Record<string, unknown>) => boolean) {
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fakeSupabase(poison) }))
  const repo = await import("@/src/db/timetrackRepo")
  try {
    await repo.pushTimetrackRows(USER, rows as never)
  } catch (error) {
    if (error instanceof repo.TimetrackWriteRefused) return error
    throw error
  }
  throw new Error("the push was expected to be refused and was not")
}

describe("the names the server reports for refused rows", () => {
  test("a tag link is named by the pair that identifies it, not by an empty string", async () => {
    const refusal = await pushExpectingRefusal(
      { timetrack_entry_tags: [{ entry_id: "e1", tag_id: "t1" }, { entry_id: "e2", tag_id: "t2" }] },
      (row) => row.entry_id === "e1",
    )

    expect(refusal.table).toBe("timetrack_entry_tags")
    expect(refusal.ids, "an unnamed refusal is one the browser can never drop").toEqual(["e1:t1"])
  })

  test("the name is exactly what the client's own key function produces", async () => {
    /**
     * The point of the whole change: the same string on both sides. Asserted
     * against `rowKeyOf` rather than against a literal, so the day somebody
     * changes the separator both halves move together or this fails.
     */
    const row = { entry_id: "e1", tag_id: "t1" }
    const refusal = await pushExpectingRefusal({ timetrack_entry_tags: [row] }, () => true)
    expect(refusal.ids).toEqual([rowKeyOf("timetrack_entry_tags", row)])
  })

  test("an entry is still named by its id, so the toast can still name the entry", async () => {
    const refusal = await pushExpectingRefusal(
      { timetrack_entries: [{ id: "99", workspace_id: WORKSPACE, description: "mistyped" }] },
      () => true,
    )
    expect(refusal.ids).toEqual(["99"])
  })

  test("settings are named by the person, which is how that row is keyed", async () => {
    const refusal = await pushExpectingRefusal({ timetrack_settings: [{ user_id: USER, prefs: {} }] }, () => true)
    expect(refusal.ids).toEqual([USER])
  })

  test("a duplicated key is reported in the same language as any other refusal", async () => {
    /**
     * The duplicate-key guard used to report the `onConflict` target joined with
     * commas — `"e1,t1"` — which is not what the browser matches on, so the drop
     * removed nothing and the immediate re-flush fired into the same refusal.
     */
    const refusal = await pushExpectingRefusal(
      { timetrack_entry_tags: [{ entry_id: "e1", tag_id: "t1" }, { entry_id: "e1", tag_id: "t1" }] },
      () => false,
    )
    expect(refusal.ids).toEqual([rowKeyOf("timetrack_entry_tags", { entry_id: "e1", tag_id: "t1" })])
  })
})
