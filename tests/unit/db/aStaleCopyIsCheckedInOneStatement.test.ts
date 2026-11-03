// @vitest-environment node
/**
 * THE VERSION CHECK HAPPENS IN THE DATABASE, IN ONE STATEMENT, FOR THE WHOLE BATCH.
 *
 * `pushTimetrackRows` used to upsert table by table: whatever a device sent
 * replaced the row, however old the copy it came from. The check that stops
 * that — "only if the stored version is the one you were based on" — has to sit
 * next to the row, in the same transaction as the write, or two devices can
 * both pass it. So the repo hands the batch to `timetrack_push`, one call, and
 * reports what it wrote and what it refused.
 *
 * What this pins is the repo's half of that contract. The function itself is
 * SQL, verified against Postgres (see the migration's header and
 * docs/runbooks/timetrack.md); a fake here could only say the fake agrees.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TIMETRACK_TABLES } from "@/src/db/timetrackTypes"

const USER = "user-1"
const WORKSPACE = "11111111-1111-1111-1111-111111111111"

interface RpcCall {
  name: string
  args: { p_batch: { table: string; rows: Record<string, unknown>[]; bases: Record<string, string | null> }[]; p_tag_sets: Record<string, string[]> }
}

function fakeSupabase(answer: (call: RpcCall) => { data?: unknown; error?: { code?: string; message: string } | null }) {
  const rpcs: RpcCall[] = []
  const upserts: { table: string; rows: Record<string, unknown>[] }[] = []
  const client = {
    from(table: string) {
      const chain: Record<string, unknown> = {}
      for (const method of ["select", "eq", "is", "order", "gt", "in", "neq"]) chain[method] = () => chain
      chain.limit = async () => ({ data: table === "timetrack_workspaces" ? [{ id: WORKSPACE }] : [], error: null })
      chain.upsert = async (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        upserts.push({ table, rows: Array.isArray(rows) ? rows : [rows] })
        return { error: null }
      }
      return chain
    },
    async rpc(name: string, args: RpcCall["args"]) {
      const call = { name, args }
      rpcs.push(call)
      const { data = null, error = null } = answer(call)
      return { data, error }
    },
  }
  return { client, rpcs, upserts }
}

async function repoWith(fake: ReturnType<typeof fakeSupabase>) {
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  return import("@/src/db/timetrackRepo")
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
})
beforeEach(() => vi.resetModules())

const rows = {
  timetrack_entries: [{ id: "e1", workspace_id: "stale-ws", description: "a" }],
  timetrack_projects: [{ id: "p1", workspace_id: "stale-ws", name: "P" }],
  timetrack_entry_tags: [{ entry_id: "e1", tag_id: "t1" }],
}
const bases = {
  timetrack_entries: { e1: "2026-11-03T10:00:00.123456+00:00" },
  timetrack_projects: { p1: null },
}

describe("a push that names the versions it was based on", () => {
  test("goes to the database function once, parents first, with the bases and the tag sets", async () => {
    const fake = fakeSupabase(() => ({
      data: {
        applied: 2,
        written: { timetrack_projects: { p1: "2026-11-03T10:00:01.000001+00:00" } },
        conflicts: { timetrack_entries: [{ id: "e1", description: "theirs", updated_at: "2026-11-03T10:00:00.999999+00:00" }] },
        conflict_tags: { e1: ["t2"] },
      },
    }))
    const repo = await repoWith(fake)

    const result = await repo.pushTimetrackRows(USER, rows as never, { bases: bases as never, tagSets: { e1: ["t1"] } })

    expect(fake.rpcs.map((c) => c.name), "the batch did not go through one versioned statement").toEqual(["timetrack_push"])
    expect(fake.upserts, "rows were also written around the version check").toEqual([])
    const batch = fake.rpcs[0].args.p_batch
    const order = batch.map((part) => TIMETRACK_TABLES.indexOf(part.table as never))
    expect(order, "a child table went before its parent").toEqual([...order].sort((a, b) => a - b))
    const entries = batch.find((part) => part.table === "timetrack_entries")!
    expect(entries.rows[0]).toMatchObject({ user_id: USER, workspace_id: WORKSPACE })
    expect(entries.bases).toEqual(bases.timetrack_entries)
    expect(fake.rpcs[0].args.p_tag_sets).toEqual({ e1: ["t1"] })

    expect(result.written).toEqual({ timetrack_projects: { p1: "2026-11-03T10:00:01.000001+00:00" } })
    expect(result.conflicts?.timetrack_entries?.[0]).toMatchObject({ id: "e1", description: "theirs" })
    expect(result.conflictTags).toEqual({ e1: ["t2"] })
  })

  test("a database that does not have the function yet still saves, the old way", async () => {
    const fake = fakeSupabase(() => ({
      error: { code: "PGRST202", message: "Could not find the function public.timetrack_push in the schema cache" },
    }))
    const repo = await repoWith(fake)

    const result = await repo.pushTimetrackRows(USER, rows as never, { bases: bases as never, tagSets: {} })

    expect(fake.upserts.map((u) => u.table)).toEqual(["timetrack_projects", "timetrack_entries", "timetrack_entry_tags"])
    expect(result.written, "a version was reported that nothing produced").toBeUndefined()
  })

  test("a caller that names no versions gets the old write, unchecked", async () => {
    const fake = fakeSupabase(() => {
      throw new Error("the database function was called for a caller that sent no bases")
    })
    const repo = await repoWith(fake)

    await repo.pushTimetrackRows(USER, rows as never)
    expect(fake.rpcs).toEqual([])
    expect(fake.upserts.length).toBeGreaterThan(0)
  })

  test("a base that is not a time goes as 'unknown', so it is merged rather than refused and dropped", async () => {
    /**
     * A string the database cannot read as a time fails the whole call, every
     * retry and every half of the search for the bad row — which then names the
     * row as refused, and the browser drops the edit from its queue. As null it
     * is refused as stale, merged, and sent again on the server's own version.
     */
    const fake = fakeSupabase(() => ({ data: { applied: 0, written: {}, conflicts: {}, conflict_tags: {} } }))
    const repo = await repoWith(fake)

    await repo.pushTimetrackRows(USER, { timetrack_entries: [{ id: "e1", workspace_id: WORKSPACE }, { id: "e2", workspace_id: WORKSPACE }] } as never, {
      bases: { timetrack_entries: { e1: "not a time", e2: "2026-13-45T00:00:00+00:00" } } as never,
      tagSets: {},
    })

    expect(fake.rpcs[0].args.p_batch[0].bases).toEqual({ e1: null, e2: null })
  })

  test("a row the database refuses is still named, so the browser can drop it", async () => {
    const fake = fakeSupabase((call) => {
      const poisoned = call.args.p_batch.some((part) => part.rows.some((row) => row.id === "bad"))
      return poisoned
        ? { error: { code: "23514", message: 'new row violates check constraint "timetrack_entries_stop_after_start"' } }
        : { data: { applied: 1, written: {}, conflicts: {}, conflict_tags: {} } }
    })
    const repo = await repoWith(fake)

    const refusal = await repo
      .pushTimetrackRows(
        USER,
        { timetrack_entries: [{ id: "good", workspace_id: WORKSPACE }, { id: "bad", workspace_id: WORKSPACE }] } as never,
        { bases: { timetrack_entries: { good: null, bad: null } } as never, tagSets: {} },
      )
      .catch((error: unknown) => error)

    expect(refusal).toBeInstanceOf(repo.TimetrackWriteRefused)
    expect((refusal as InstanceType<typeof repo.TimetrackWriteRefused>).table).toBe("timetrack_entries")
    expect((refusal as InstanceType<typeof repo.TimetrackWriteRefused>).ids).toEqual(["bad"])
  })
})
