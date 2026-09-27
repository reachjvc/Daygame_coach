/**
 * The rules that decide what gets sent, and who wins when two sides disagree.
 *
 * The two cases worth writing down, because both silently lose work if wrong:
 *  - a deleted entry must travel as a note saying it was deleted, or a device
 *    that was offline at the time uploads it again on reconnect
 *  - a change this device has not yet managed to send must not be overwritten
 *    by the older version the server still has
 */

import { describe, expect, test } from "vitest"

import { emptyRows } from "@/src/db/timetrackTypes"
import { countRows, diffRows, keysIn, mergeChangeSets, mergeIncoming, reattachToWorkspace, repairPending, rowKey, safeToSend, splitIntoBatches, withoutSentRows } from "@/src/timetrack/syncService"

const DELETED_AT = "2026-09-03T12:00:00.000Z"

const entryRow = (id: string, description: string, updated = "2026-09-03T10:00:00.000Z") => ({
  id,
  user_id: "u1",
  updated_at: updated,
  deleted_at: null as string | null,
  workspace_id: "w1",
  project_id: null,
  task_id: null,
  description,
  billable: false,
  started_at: "2026-09-03T09:00:00.000Z",
  stopped_at: "2026-09-03T10:00:00.000Z",
  duration_seconds: 3600,
  duration_only: false,
  created_with: "web",
  source_event_id: null,
  running_device_id: null,
  shared_with: [],
})

function withEntries(...entries: ReturnType<typeof entryRow>[]) {
  return { ...emptyRows(), timetrack_entries: entries }
}

describe("what gets sent", () => {
  test("the first upload sends everything", () => {
    const { changed, count } = diffRows(null, withEntries(entryRow("e1", "work")), DELETED_AT)
    expect(count).toBe(1)
    expect(changed.timetrack_entries).toHaveLength(1)
  })

  test("nothing changed means nothing is sent", () => {
    const rows = withEntries(entryRow("e1", "work"))
    expect(diffRows(rows, rows, DELETED_AT).count).toBe(0)
  })

  test("an edit sends just that row", () => {
    const before = withEntries(entryRow("e1", "work"), entryRow("e2", "other"))
    const after = withEntries(entryRow("e1", "work, renamed"), entryRow("e2", "other"))
    const { changed, count } = diffRows(before, after, DELETED_AT)
    expect(count).toBe(1)
    expect(changed.timetrack_entries?.[0].id).toBe("e1")
  })

  test("a touched-but-identical row is not sent just because its timestamp moved", () => {
    const before = withEntries(entryRow("e1", "work", "2026-09-03T10:00:00.000Z"))
    const after = withEntries(entryRow("e1", "work", "2026-09-03T11:59:00.000Z"))
    expect(diffRows(before, after, DELETED_AT).count).toBe(0)
  })

  test("a deleted entry travels as a note, not as silence", () => {
    const before = withEntries(entryRow("e1", "work"))
    const { changed, count } = diffRows(before, withEntries(), DELETED_AT)
    expect(count).toBe(1)
    expect(changed.timetrack_entries?.[0]).toMatchObject({ id: "e1", deleted_at: DELETED_AT })
  })

  test("an already-deleted row is not announced twice", () => {
    const before = withEntries({ ...entryRow("e1", "work"), deleted_at: DELETED_AT })
    expect(diffRows(before, withEntries(), DELETED_AT).count).toBe(0)
  })
})

describe("who wins when both sides changed", () => {
  test("the server's version is taken for a row we are not holding", () => {
    const local = withEntries(entryRow("e1", "old name"))
    const incoming = { timetrack_entries: [entryRow("e1", "new name", "2026-09-03T11:00:00.000Z")] }
    const merged = mergeIncoming(local, incoming, new Set())
    expect(merged.timetrack_entries[0].description).toBe("new name")
  })

  test("a change we have not managed to send yet is never overwritten", () => {
    const local = withEntries(entryRow("e1", "my unsent edit"))
    const incoming = { timetrack_entries: [entryRow("e1", "what the server still has")] }
    const dirty = new Set(["timetrack_entries/e1"])
    const merged = mergeIncoming(local, incoming, dirty)
    expect(merged.timetrack_entries[0].description).toBe("my unsent edit")
  })

  test("a row deleted elsewhere disappears here too", () => {
    const local = withEntries(entryRow("e1", "work"), entryRow("e2", "keep"))
    const incoming = { timetrack_entries: [{ ...entryRow("e1", "work"), deleted_at: DELETED_AT }] }
    const merged = mergeIncoming(local, incoming, new Set())
    expect(merged.timetrack_entries.map((e) => e.id)).toEqual(["e2"])
  })

  test("but not if we were in the middle of un-deleting it", () => {
    const local = withEntries(entryRow("e1", "restored"))
    const incoming = { timetrack_entries: [{ ...entryRow("e1", "work"), deleted_at: DELETED_AT }] }
    const merged = mergeIncoming(local, incoming, new Set(["timetrack_entries/e1"]))
    expect(merged.timetrack_entries).toHaveLength(1)
  })
})

describe("the queue", () => {
  test("two pending change sets combine, the later one winning per row", () => {
    const first = { timetrack_entries: [entryRow("e1", "first")] }
    const second = { timetrack_entries: [entryRow("e1", "second"), entryRow("e2", "new")] }
    const merged = mergeChangeSets(first, second)
    expect(countRows(merged)).toBe(2)
    expect(merged.timetrack_entries?.find((e) => e.id === "e1")?.description).toBe("second")
  })

  test("the keys in flight are reported so they can be protected", () => {
    const keys = keysIn({ timetrack_entries: [entryRow("e1", "x")] })
    expect(keys.has("timetrack_entries/e1")).toBe(true)
  })

  test("a tag link is identified by both of its halves", () => {
    expect(rowKey("timetrack_entry_tags", { entry_id: "e1", tag_id: "t1" })).toBe("e1:t1")
  })

  test("settings are identified by the user, since there is one row per person", () => {
    expect(rowKey("timetrack_settings", { user_id: "u1" })).toBe("u1")
  })
})

describe("the guard that stops a bad read becoming a mass deletion", () => {
  /**
   * THE SHAPE THE SERVER IS ACTUALLY IN.
   *
   * The fixture here used to be `emptyRows()` plus entries — no workspace row,
   * no settings row, no tag links — and the product is never in that shape.
   * `stateToRows` emits a workspace row and a settings row for every state that
   * exists. Counting those as "live on the server" while no tombstone can ever
   * travel for them is what made `deletes >= liveOnServer` unreachable: measured
   * on five entries and one tag, a change set deleting all seven deletable rows
   * scored 7 against a live total of 9, and the guard answered `{ok: true}` to
   * the exact catastrophe it exists to refuse.
   */
  const workspaceRow = (id: string) => ({ id, user_id: "u1", updated_at: "2026-09-03T10:00:00.000Z", deleted_at: null as string | null, name: "My Workspace", currency: "EUR", config: {} })
  const tagRow = (id: string) => ({ id, user_id: "u1", updated_at: "2026-09-03T10:00:00.000Z", deleted_at: null as string | null, workspace_id: "w1", name: id, color: "#ffffff" })

  const live = {
    ...emptyRows(),
    timetrack_workspaces: [workspaceRow("w1")],
    timetrack_settings: [{ user_id: "u1", updated_at: "2026-09-03T10:00:00.000Z" }],
    timetrack_tags: [tagRow("t1")],
    timetrack_entry_tags: [{ entry_id: "e1", tag_id: "t1" }],
    timetrack_entries: [entryRow("e1", "a"), entryRow("e2", "b"), entryRow("e3", "c"), entryRow("e4", "d"), entryRow("e5", "e")],
  } as never as ReturnType<typeof emptyRows>

  const allTombstoned = {
    timetrack_tags: live.timetrack_tags.map((t) => ({ ...t, deleted_at: DELETED_AT })),
    timetrack_entries: live.timetrack_entries.map((e) => ({ ...e, deleted_at: DELETED_AT })),
  }

  test("a device that has not read the server yet may not delete anything", () => {
    const result = safeToSend({ timetrack_entries: [{ ...entryRow("e1", "a"), deleted_at: DELETED_AT }] }, live, false)
    expect(result.ok).toBe(false)
  })

  test("emptying the account while pointing at a workspace the server has never seen is refused", () => {
    /**
     * The incident, exactly: the mapper read a half-arrived response as "there is
     * nothing here" and handed back a brand-new workspace, so the next diff
     * offered a fresh workspace id beside a tombstone for everything the real one
     * held. A real entry was deleted before this guard existed.
     */
    const result = safeToSend(
      { ...allTombstoned, timetrack_workspaces: [workspaceRow("a-workspace-the-server-never-had")] },
      live,
      true,
    )
    expect(result.ok, "the guard passed a change set that empties the account").toBe(false)
    if (!result.ok) expect(result.deletes).toBe(6)
  })

  test("deleting one entry among many is ordinary and allowed", () => {
    const result = safeToSend({ timetrack_entries: [{ ...entryRow("e1", "a"), deleted_at: DELETED_AT }] }, live, true)
    expect(result.ok).toBe(true)
  })

  test("select-all-and-delete is a thing people do, and it is allowed", () => {
    /**
     * The entry list has a select-all and a delete-this-whole-day, both with an
     * undo toast. A guard on the count alone refuses them, the badge goes red,
     * and a reload brings back the entries the person deleted on purpose — a
     * worse bug than the one being guarded against, and one that fires on a real
     * action rather than on a rare fault. What tells them apart is the workspace:
     * deleting entries keeps the one you are in.
     */
    expect(safeToSend(allTombstoned, live, true).ok).toBe(true)
  })

  test("clearing the workspace on purpose still sends, because it keeps its own workspace", () => {
    /**
     * `resetWorkspace` empties the workspace and keeps its record. If it swapped
     * in a fresh one — as it did until 2026-09-27 — it would look identical to
     * the incident above and this guard would refuse the person's own deliberate,
     * confirmed action.
     */
    const cleared = { ...allTombstoned, timetrack_workspaces: [{ ...workspaceRow("w1"), name: "My Workspace" }] }
    expect(safeToSend(cleared, live, true).ok).toBe(true)
  })

  test("a change set with no deletions is always fine", () => {
    expect(safeToSend({ timetrack_entries: [entryRow("e9", "new")] }, live, false).ok).toBe(true)
  })

  test("clearing a workspace of two is not treated as a catastrophe", () => {
    const small = { ...emptyRows(), timetrack_workspaces: [workspaceRow("w1")], timetrack_entries: [entryRow("e1", "a"), entryRow("e2", "b")] } as never as ReturnType<typeof emptyRows>
    const both = { timetrack_entries: small.timetrack_entries.map((e) => ({ ...e, deleted_at: DELETED_AT })), timetrack_workspaces: [workspaceRow("brand-new")] }
    expect(safeToSend(both, small, true).ok).toBe(true)
  })
})

describe("a workspace tombstone never travels beside its replacement", () => {
  /**
   * `pushTimetrackRows` rewrites every workspace id to the one the person owns,
   * and `reattachToWorkspace` does it first. So a change set holding both a
   * tombstone for the old workspace and a live row for the new one arrives as two
   * rows with the SAME primary key: "ON CONFLICT DO UPDATE command cannot affect
   * row a second time", the whole batch refused, for ever. `isolateRefusedRows`
   * then names nothing, because each half writes cleanly on its own — so the
   * browser drops nothing and retries the impossible payload until a reload.
   *
   * And if the halves did land, the tombstone is emitted second, so it would
   * soft-delete the person's only workspace.
   */
  const ws = (id: string, deleted: string | null = null) => ({ id, user_id: "u1", updated_at: "2026-09-03T10:00:00.000Z", deleted_at: deleted, name: "My Workspace", currency: "EUR", config: {} })

  test("reattaching drops the tombstone rather than duplicating the key", () => {
    const out = reattachToWorkspace({ timetrack_workspaces: [ws("new"), ws("old", DELETED_AT)] } as never, "server-id")
    const rows = out.timetrack_workspaces ?? []
    expect(rows).toHaveLength(1)
    expect(rows[0].deleted_at).toBeNull()
    expect(new Set(rows.map((r) => r.id)).size, "two rows with one id is a batch that can never be accepted").toBe(rows.length)
  })

  test("a clear that keeps its workspace produces no second workspace row at all", () => {
    const before = { ...emptyRows(), timetrack_workspaces: [ws("w1")], timetrack_entries: [entryRow("e1", "a")] } as never as ReturnType<typeof emptyRows>
    const after = { ...emptyRows(), timetrack_workspaces: [ws("w1")] } as never as ReturnType<typeof emptyRows>
    const { changed } = diffRows(before, after, DELETED_AT)
    expect(changed.timetrack_workspaces ?? []).toHaveLength(0)
    expect(changed.timetrack_entries).toHaveLength(1)
  })
})

describe("a big first upload is broken into sendable pieces", () => {
  const many = (n: number) => ({
    ...emptyRows(),
    timetrack_entries: Array.from({ length: n }, (_, i) => entryRow(`e${i}`, `entry ${i}`)),
  })

  test("a small change set is sent as one request", () => {
    expect(splitIntoBatches(many(10), 400)).toHaveLength(1)
  })

  test("a year of tracked time is split rather than refused whole", () => {
    const batches = splitIntoBatches(many(1000), 400)
    expect(batches.length).toBeGreaterThan(1)
    expect(batches.reduce((sum, b) => sum + countRows(b), 0)).toBe(1000)
  })

  test("no batch is bigger than the limit", () => {
    for (const batch of splitIntoBatches(many(1000), 400)) {
      expect(countRows(batch)).toBeLessThanOrEqual(400)
    }
  })

  test("every row survives the split, none twice", () => {
    const ids = splitIntoBatches(many(950), 400).flatMap((b) => (b.timetrack_entries ?? []).map((e) => e.id))
    expect(new Set(ids).size).toBe(950)
  })

  test("a workspace is sent before the entries that point at it", () => {
    const rows = {
      ...many(500),
      timetrack_workspaces: [
        { id: "w1", user_id: "u1", updated_at: "x", deleted_at: null, name: "W", currency: "EUR", config: {} },
      ],
    }
    const batches = splitIntoBatches(rows, 400)
    // the workspace must not land in a later batch than the rows referring to it
    const workspaceBatch = batches.findIndex((b) => (b.timetrack_workspaces ?? []).length > 0)
    const firstEntryBatch = batches.findIndex((b) => (b.timetrack_entries ?? []).length > 0)
    expect(workspaceBatch).toBeLessThanOrEqual(firstEntryBatch)
  })
})

describe("a queue poisoned by an older version repairs itself", () => {
  /**
   * The incident: a tombstone was queued for the settings row, which has no
   * `deleted_at` column. The database refused the row, the batch failed, and
   * since a queue drains all or nothing, that browser never saved again.
   */
  test("a settings tombstone is dropped rather than retried forever", () => {
    const poisoned = {
      timetrack_settings: [{ user_id: "u1", prefs: {}, updated_at: "x", deleted_at: "2026-09-03T00:00:00.000Z" }],
      timetrack_entries: [entryRow("e1", "real work")],
    } as never
    const repaired = repairPending(poisoned)
    expect(repaired.timetrack_settings).toEqual([])
    // and the real work behind it is untouched
    expect(repaired.timetrack_entries).toHaveLength(1)
  })

  test("columns the settings table does not have are stripped", () => {
    const repaired = repairPending({
      timetrack_settings: [{ user_id: "u1", prefs: { a: 1 }, updated_at: "x", created_at: "y" }],
    } as never)
    expect(Object.keys(repaired.timetrack_settings![0]).sort()).toEqual(["prefs", "updated_at", "user_id"])
  })

  test("a healthy queue passes through unchanged", () => {
    const healthy = { timetrack_entries: [entryRow("e1", "work")] }
    expect(repairPending(healthy)).toEqual(healthy)
  })
})

describe("settings are never announced as deleted", () => {
  test("a settings row that disappears produces no tombstone", () => {
    const before = { ...emptyRows(), timetrack_settings: [{ user_id: "u1", prefs: {}, updated_at: "x" }] } as never
    const { changed } = diffRows(before, emptyRows(), DELETED_AT)
    expect(changed.timetrack_settings ?? []).toEqual([])
  })
})

describe("every row goes to the one workspace the app is showing", () => {
  /**
   * A browser with nothing saved invents a workspace before it hears from the
   * server. Anything created in that moment points at an id the server has
   * never seen, the database rejects it, and the batch — which drains all or
   * nothing — never drains. Verified against the live database.
   */
  test("entries are pointed at the current workspace", () => {
    const rows = {
      timetrack_entries: [{ ...entryRow("e1", "work"), workspace_id: "invented-locally" }],
    } as never
    const fixed = reattachToWorkspace(rows, "the-real-one")
    expect(fixed.timetrack_entries![0].workspace_id).toBe("the-real-one")
  })

  test("the workspace row itself takes the real id", () => {
    const rows = {
      timetrack_workspaces: [
        { id: "invented-locally", user_id: "u1", updated_at: "x", deleted_at: null, name: "W", currency: "EUR", config: {} },
      ],
    } as never
    expect(reattachToWorkspace(rows, "the-real-one").timetrack_workspaces![0].id).toBe("the-real-one")
  })

  test("rows with no workspace of their own are left alone", () => {
    const rows = { timetrack_settings: [{ user_id: "u1", prefs: {}, updated_at: "x" }] } as never
    expect(reattachToWorkspace(rows, "the-real-one").timetrack_settings![0]).toEqual({
      user_id: "u1",
      prefs: {},
      updated_at: "x",
    })
  })

  test("it returns a new object, so the queue can still tell what it sent", () => {
    const rows = { timetrack_entries: [entryRow("e1", "work")] }
    expect(reattachToWorkspace(rows, "w")).not.toBe(rows)
  })
})

describe("taking the accepted rows out of the queue", () => {
  /**
   * The success path used to compare object identity: if the queue was still the
   * very object that went up, clear it, otherwise keep all of it. Any edit during
   * the request replaces that object, so every row the server had just taken was
   * kept and sent again.
   *
   * Filtering by key instead LOSES WORK, and that is the whole reason this is a
   * function with its own tests: a row edited while its own upload is in the air
   * has the same key as the row that was sent, and the queued copy is the newer
   * one. The first attempt at this filtered by key and was caught by "a change
   * made while a request is in the air is sent when it lands" in `syncRetry`.
   */
  const sentVersion = entryRow("e1", "as sent")

  test("a row that was accepted unchanged is taken out", () => {
    const left = withoutSentRows({ timetrack_entries: [sentVersion] }, { timetrack_entries: [sentVersion] })
    expect(countRows(left)).toBe(0)
  })

  test("but the same row re-queued with a NEWER value stays", () => {
    const edited = entryRow("e1", "edited while it was uploading")
    const left = withoutSentRows({ timetrack_entries: [edited] }, { timetrack_entries: [sentVersion] })
    expect(left.timetrack_entries?.[0].description, "the edit made during the request was thrown away").toBe(
      "edited while it was uploading",
    )
  })

  test("a row queued while the request was in the air stays", () => {
    const other = entryRow("e2", "queued during the flight")
    const left = withoutSentRows({ timetrack_entries: [sentVersion, other] }, { timetrack_entries: [sentVersion] })
    expect(left.timetrack_entries?.map((e) => e.id)).toEqual(["e2"])
  })

  test("a re-queue that changed nothing but its timestamp is still redundant", () => {
    const touched = { ...sentVersion, updated_at: "2027-01-01T00:00:00.000Z" }
    expect(countRows(withoutSentRows({ timetrack_entries: [touched] }, { timetrack_entries: [sentVersion] }))).toBe(0)
  })

  test("and a tombstone is not confused with the live row it replaces", () => {
    const tombstone = { ...sentVersion, deleted_at: DELETED_AT }
    const left = withoutSentRows({ timetrack_entries: [tombstone] }, { timetrack_entries: [sentVersion] })
    expect(left.timetrack_entries, "the deletion was dropped because the live row had just been accepted").toHaveLength(1)
  })
})
