/**
 * THE SAME TAG LINK TWICE IS A PAYLOAD THE DATABASE REFUSES FOR EVER.
 *
 * `timetrack_entry_tags` is keyed by the pair `(entry_id, tag_id)`. Two identical
 * rows in one upsert make Postgres answer "ON CONFLICT DO UPDATE command cannot
 * affect row a second time" and refuse the whole batch — and this is the shape
 * that cannot recover on its own: `isolateRefusedRows` bisects the batch, each
 * half contains one of the pair and writes cleanly, so it comes back having found
 * nothing. The response names no ids, the browser drops nothing, and the queue
 * offers the same impossible payload again. That is a stuck badge with no way out
 * but a reload, and it was reachable three ways:
 *
 *   - a page boundary in `pullTimetrackRows`, which sorted this table by
 *     `entry_id` alone. An entry with three tags is three rows sharing that
 *     value, and the repo's own paging rule says a non-unique sort key may put a
 *     row in two pages;
 *   - the Toggl CSV import, where a tags cell reading `admin, admin` asked
 *     `createTag` twice and got the same id back twice;
 *   - `rowsToState`, which appended every link it read without checking.
 *
 * Each is pinned below. The push-side check that names a duplicate rather than
 * jamming on it is in `tests/unit/db/isolatingARefusedRow.test.ts`.
 */

import { describe, expect, test } from "vitest"

import { createEmptyWorkspace } from "@/src/timetrack/data/emptyWorkspace"
import { importEntriesCsv } from "@/src/timetrack/importExportService"
import { rowsToState, stateToRows } from "@/src/timetrack/timetrackMapperService"
import { emptyRows } from "@/src/db/timetrackTypes"

const NOW = "2026-09-20T10:00:00.000Z"

/** Every `(entry_id, tag_id)` key a state would send, so a repeat is visible */
function linkKeys(state: Parameters<typeof stateToRows>[0]): string[] {
  return stateToRows(state, "u1").timetrack_entry_tags.map((row) => `${row.entry_id}:${row.tag_id}`)
}

describe("reading links back from the server", () => {
  test("a link that arrives twice is stored once", () => {
    const rows = {
      ...emptyRows(),
      timetrack_workspaces: [{ id: "w1", user_id: "u1", updated_at: NOW, deleted_at: null, name: "W", currency: "EUR", config: {} }],
      timetrack_tags: [{ id: "t1", user_id: "u1", updated_at: NOW, deleted_at: null, workspace_id: "w1", name: "deep", color: "#fff" }],
      timetrack_entries: [
        {
          id: "e1", user_id: "u1", updated_at: NOW, deleted_at: null, workspace_id: "w1", project_id: null, task_id: null,
          description: "work", billable: false, started_at: NOW, stopped_at: NOW, duration_seconds: 0, duration_only: false,
          created_with: "web", source_event_id: null, running_device_id: null, shared_with: [],
        },
      ],
      // what a page boundary could hand back: the same link in both pages
      timetrack_entry_tags: [
        { entry_id: "e1", tag_id: "t1" },
        { entry_id: "e1", tag_id: "t1" },
      ],
    } as never as ReturnType<typeof emptyRows>

    const state = rowsToState(rows, NOW)
    expect(state.entries[0].tagIds).toEqual(["t1"])
    expect(linkKeys(state), "the same pair twice in one upsert is refused every time it is sent").toEqual(["e1:t1"])
  })
})

describe("importing a CSV whose tags cell repeats a name", () => {
  test("gives the entry that tag once", () => {
    const csv = [
      "Email,Client,Project,Task,Description,Billable,Start date,Start time,End date,End time,Duration,Tags",
      "a@b.c,,,,Wrote the thing,No,2026-09-20,09:00:00,2026-09-20,09:30:00,00:30:00,\"admin, admin; admin\"",
    ].join("\n")

    const result = importEntriesCsv(createEmptyWorkspace(NOW), csv, NOW)
    expect(result.imported, JSON.stringify(result.skipped)).toBe(1)
    expect(result.state.entries[0].tagIds).toHaveLength(1)
    expect(linkKeys(result.state)).toHaveLength(1)
  })
})

describe("a CSV row with a date and no time", () => {
  /**
   * `T00:00:00.000Z` is UTC midnight, and every date in this slice is a local
   * wall-clock day. Anywhere west of Greenwich those are different days: in New
   * York, a row dated 2026-09-20 with no start time landed on the 19th — in the
   * entry list, in the calendar and in every report. East of Greenwich it
   * happened to look right, which is why it lasted.
   *
   * `vitest.config.ts` pins TZ to Europe/Copenhagen, which is east of Greenwich,
   * so asserting the day string alone would pass against the old code too. The
   * assertion is therefore on the instant: local midnight of the day asked for.
   */
  test("starts at midnight where the person is, not in Greenwich", () => {
    const csv = [
      "Description,Start date,Start time,End date,End time,Duration,Tags",
      "A whole day,2026-09-20,,2026-09-20,,08:00:00,",
    ].join("\n")

    const result = importEntriesCsv(createEmptyWorkspace(NOW), csv, NOW)
    expect(result.imported, JSON.stringify(result.skipped)).toBe(1)

    const start = new Date(result.state.entries[0].start)
    expect(start.getTime(), "the entry starts at a different instant than local midnight").toBe(
      new Date(2026, 8, 20, 0, 0, 0, 0).getTime(),
    )
    expect(start.getHours(), "a date-only row must not land in the small hours or the previous evening").toBe(0)
  })
})
