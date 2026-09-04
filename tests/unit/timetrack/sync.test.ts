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
import { countRows, diffRows, keysIn, mergeChangeSets, mergeIncoming, reattachToWorkspace, repairPending, rowKey, safeToSend, splitIntoBatches } from "@/src/timetrack/syncService"

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
  const live = withEntries(entryRow("e1", "a"), entryRow("e2", "b"), entryRow("e3", "c"), entryRow("e4", "d"), entryRow("e5", "e"))
  const wipeEverything = {
    timetrack_entries: live.timetrack_entries.map((e) => ({ ...e, deleted_at: DELETED_AT })),
  }

  test("a device that has not read the server yet may not delete anything", () => {
    const result = safeToSend({ timetrack_entries: [{ ...entryRow("e1", "a"), deleted_at: DELETED_AT }] }, live, false)
    expect(result.ok).toBe(false)
  })

  test("deleting every single thing at once is refused", () => {
    const result = safeToSend(wipeEverything, live, true)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.deletes).toBe(5)
  })

  test("deleting one entry among many is ordinary and allowed", () => {
    const result = safeToSend({ timetrack_entries: [{ ...entryRow("e1", "a"), deleted_at: DELETED_AT }] }, live, true)
    expect(result.ok).toBe(true)
  })

  test("a change set with no deletions is always fine", () => {
    expect(safeToSend({ timetrack_entries: [entryRow("e9", "new")] }, live, false).ok).toBe(true)
  })

  test("clearing a workspace of two is not treated as a catastrophe", () => {
    const small = withEntries(entryRow("e1", "a"), entryRow("e2", "b"))
    const both = { timetrack_entries: small.timetrack_entries.map((e) => ({ ...e, deleted_at: DELETED_AT })) }
    expect(safeToSend(both, small, true).ok).toBe(true)
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
