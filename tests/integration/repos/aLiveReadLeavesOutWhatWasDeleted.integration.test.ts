/**
 * THE OPENING'S LIVE READ, AGAINST THE REAL ROWS: what was deleted stays on the server.
 *
 * `pullTimetrackRows(user, null, { live: true })` is what an opening asks for
 * first (heavy-history audit, Phase 8 of Plans/toggl-parity.md): every row that
 * is not deleted, and the tag links of entries that are not — the links have no
 * `deleted_at` of their own, so they are left out with their entry. A read with
 * `since` is not changed by `live`: a check after the opening must still hear of
 * a deletion. The client half is `anOpeningDoesNotDownloadWhatWasDeleted`.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { pullTimetrackRows } from "@/src/db/timetrackRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

/** One workspace, one tag, a live entry and a deleted one, each tagged */
async function anAccountWithADeletedEntry(label: string) {
  const user = await newUser(label)
  actAs(user)
  const ws = randomUUID()
  const tag = randomUUID()
  const kept = randomUUID()
  const gone = randomUUID()
  await asOwner(async (q) => {
    await q("insert into timetrack_workspaces (id, user_id, name) values ($1, $2, 'W')", [ws, user.id])
    await q("insert into timetrack_tags (id, user_id, workspace_id, name) values ($1, $2, $3, 'admin')", [tag, user.id, ws])
    for (const [id, deleted] of [[kept, null], [gone, "2026-11-01T10:00:00.000Z"]] as const) {
      await q(
        "insert into timetrack_entries (id, user_id, workspace_id, description, started_at, stopped_at, duration_seconds, deleted_at) values ($1, $2, $3, $4, '2026-11-01T09:00:00Z', '2026-11-01T10:00:00Z', 3600, $5)",
        [id, user.id, ws, deleted ? "Deleted" : "Kept", deleted],
      )
      await q("insert into timetrack_entry_tags (entry_id, tag_id, user_id) values ($1, $2, $3)", [id, tag, user.id])
    }
  })
  return { user, kept, gone }
}

describe("the opening's live read", () => {
  it("leaves out a deleted entry and its tag links, and says it did", async () => {
    const { user, kept, gone } = await anAccountWithADeletedEntry("live-read")

    const live = await pullTimetrackRows(user.id, null, { live: true })

    expect(live.live).toBe(true)
    expect(live.rows.timetrack_entries.map((e) => e.id)).toEqual([kept])
    expect(live.rows.timetrack_entry_tags.map((link) => link.entry_id)).toEqual([kept])
    // the link row is the table's own columns, nothing the server joined to filter it
    expect(Object.keys(live.rows.timetrack_entry_tags[0]).sort()).toEqual(["created_at", "entry_id", "tag_id", "user_id"])
    expect(live.rows.timetrack_workspaces).toHaveLength(1)
    expect(live.rows.timetrack_tags).toHaveLength(1)

    const whole = await pullTimetrackRows(user.id, null)
    expect(whole.live, "a read without `live` says nothing of it").toBeUndefined()
    expect(whole.rows.timetrack_entries.map((e) => e.id).sort()).toEqual([kept, gone].sort())
    expect(whole.rows.timetrack_entry_tags).toHaveLength(2)
  })

  it("does not change a read with `since`: a deletion still reaches a device that checks", async () => {
    const { user, gone } = await anAccountWithADeletedEntry("live-since")

    const check = await pullTimetrackRows(user.id, "2000-01-01T00:00:00.000Z", { live: true })

    expect(check.live).toBeUndefined()
    expect(check.rows.timetrack_entries.find((e) => e.id === gone)?.deleted_at).not.toBeNull()
  })
})
