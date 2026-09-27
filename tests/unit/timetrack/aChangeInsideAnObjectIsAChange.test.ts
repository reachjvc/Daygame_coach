/**
 * A CHANGE INSIDE AN OBJECT IS A CHANGE.
 *
 * `diffRows` decides what gets sent by comparing each row against the last one
 * the server acknowledged. That comparison ended with
 * `JSON.stringify(rest, Object.keys(rest).sort())`, which reads as "the keys,
 * sorted". `JSON.stringify`'s second argument is not an ordering — it is a
 * property ALLOWLIST, and it applies at every depth. Every nested object was
 * therefore replaced by `{}` before the comparison, so two rows differing only
 * inside an object were equal and nothing was sent.
 *
 * Measured in the product on 2026-09-27, signed in, badge reading "Saved":
 * changing the time format updated the browser and produced NO request at all —
 * 0 POSTs in five seconds — while editing an entry description in the same
 * session produced one immediately. Clearing local storage and reloading brought
 * the old setting back, because the server had never been told.
 *
 * The tables that hold their real content in a nested object are exactly the ones
 * nobody watches: `timetrack_settings.prefs` is every preference, the member list,
 * groups, pomodoro, idle and reminders; `timetrack_workspaces.config` is rounding,
 * required fields and the lock-entries date; a project's `rate_history` is how much
 * the work was worth. Entries, which people do watch, are almost all top-level
 * scalars — which is why this was invisible.
 *
 * The cases below are per-table rather than one generic assertion, because the
 * generic version of this test is what passed for months.
 */

import { describe, expect, test } from "vitest"

import { emptyRows } from "@/src/db/timetrackTypes"
import { createEmptyWorkspace } from "@/src/timetrack/data/emptyWorkspace"
import { diffRows } from "@/src/timetrack/syncService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

const NOW = "2026-09-20T10:00:00.000Z"
const DELETED_AT = "2026-09-20T12:00:00.000Z"

/** The rows for a state, the way the uploader sees them */
const rowsFor = (state: TimetrackState) => stateToRows(state, "u1")

/** Which tables a change would be sent for, going from one state to another */
function tablesChanged(before: TimetrackState, after: TimetrackState): string[] {
  const { changed } = diffRows(rowsFor(before), rowsFor(after), DELETED_AT)
  return Object.entries(changed)
    .filter(([, rows]) => (rows as unknown[]).length > 0)
    .map(([table]) => table)
}

describe("a preference the person changed", () => {
  const base = createEmptyWorkspace(NOW)

  test("the time format is sent", () => {
    const after = { ...base, user: { ...base.user, timeFormat: "h12" as const } }
    expect(tablesChanged(base, after), "0 POSTs in five seconds, in the product").toContain("timetrack_settings")
  })

  test.each([
    ["the name", (s: TimetrackState) => ({ ...s, user: { ...s.user, name: "Jonas" } })],
    ["the date format", (s: TimetrackState) => ({ ...s, user: { ...s.user, dateFormat: "DD.MM.YYYY" as const } })],
    ["the first day of the week", (s: TimetrackState) => ({ ...s, user: { ...s.user, weekStart: 0 as const } })],
    ["the duration format", (s: TimetrackState) => ({ ...s, user: { ...s.user, durationFormat: "decimal" as const } })],
    ["the pomodoro length", (s: TimetrackState) => ({ ...s, pomodoro: { ...s.pomodoro, workMinutes: 50 } })],
    ["the idle threshold", (s: TimetrackState) => ({ ...s, idle: { ...s.idle, minutes: 20 } })],
    ["a reminder day", (s: TimetrackState) => ({ ...s, reminders: { ...s.reminders, days: [1, 2, 3] } })],
    ["your own name in the member list", (s: TimetrackState) => ({ ...s, members: s.members.map((m) => ({ ...m, name: "Jonas" })) })],
  ])("%s is sent", (_label, change) => {
    expect(tablesChanged(base, change(base))).toContain("timetrack_settings")
  })

  test("and an unchanged workspace still sends nothing", () => {
    /**
     * The other half. A fix that makes everything look changed would pass every
     * test above while uploading the whole workspace on every keystroke.
     */
    expect(diffRows(rowsFor(base), rowsFor(base), DELETED_AT).count).toBe(0)
  })
})

describe("a workspace setting the person changed", () => {
  const base = createEmptyWorkspace(NOW)

  test.each([
    ["rounding", (s: TimetrackState) => ({ ...s, workspace: { ...s.workspace, rounding: { enabled: true, mode: "up" as const, minutes: 30 } } })],
    ["a required field", (s: TimetrackState) => ({ ...s, workspace: { ...s.workspace, requiredFields: { ...s.workspace.requiredFields, project: true } } })],
    ["the date before which entries are locked", (s: TimetrackState) => ({ ...s, workspace: { ...s.workspace, lockEntriesBefore: "2026-09-01" } })],
  ])("%s is sent", (_label, change) => {
    expect(tablesChanged(base, change(base))).toContain("timetrack_workspaces")
  })
})

describe("a saved report's definition", () => {
  test("is sent when it changes", () => {
    /**
     * The third and last place in this slice that keeps its real content in a
     * nested column: `timetrack_saved_reports.config` is the whole report — its
     * range, its filters, its grouping. Renaming it synced, because the name is a
     * top-level string; changing what it actually reports did not.
     *
     * A project's rate history is NOT in this list, though it looked like it
     * should be: `stateToRows` gives it a table of its own, one row per rate with
     * the values at the top level, so a rate change was always detected. Checked
     * rather than assumed — the first version of this test asserted the wrong
     * table and failed, which is how the difference came to light.
     */
    const base = createEmptyWorkspace(NOW)
    const report = { id: "r1", name: "Last week", config: { grouping: "project" }, at: NOW }
    const before = { ...base, savedReports: [report] } as never as TimetrackState
    const after = { ...base, savedReports: [{ ...report, config: { grouping: "client" } }] } as never as TimetrackState

    expect(tablesChanged(before, after)).toContain("timetrack_saved_reports")
  })

  test("and a project's rate history is sent through its own table", () => {
    const base = createEmptyWorkspace(NOW)
    const project = {
      id: "p1", workspaceId: base.workspace.id, clientId: null, name: "Alpha", color: "#000", active: true,
      isPrivate: false, billable: true, currency: "EUR", rate: 90,
      rateHistory: [{ validFrom: "2026-01-01", rate: 90 }],
      estimateType: "hours" as const, estimatedSeconds: null, estimatedAmount: null, autoEstimates: false,
      fixedFee: null, recurring: false, recurringPeriod: null, recurringStart: null, startDate: null, endDate: null,
      template: false, alerts: [], memberIds: [], at: NOW, createdAt: NOW,
    }
    const before = { ...base, projects: [project] } as TimetrackState
    const after = { ...base, projects: [{ ...project, rateHistory: [{ validFrom: "2026-01-01", rate: 150 }] }] } as TimetrackState

    expect(tablesChanged(before, after)).toContain("timetrack_project_rates")
  })
})

describe("the comparison itself", () => {
  test("does not care what order the keys arrived in", () => {
    /**
     * The original intent, which the allowlist was reaching for. A row read back
     * from the database can have its columns in a different order than the mapper
     * wrote them, and that must not read as a change.
     */
    const a = { ...emptyRows(), timetrack_settings: [{ user_id: "u1", prefs: { b: 2, a: 1 }, updated_at: NOW }] }
    const b = { ...emptyRows(), timetrack_settings: [{ prefs: { a: 1, b: 2 }, user_id: "u1", updated_at: "2026-09-21T00:00:00.000Z" }] }
    expect(diffRows(a as never, b as never, DELETED_AT).count).toBe(0)
  })

  test("still ignores updated_at, which is bookkeeping", () => {
    const a = { ...emptyRows(), timetrack_settings: [{ user_id: "u1", prefs: { a: 1 }, updated_at: NOW }] }
    const b = { ...emptyRows(), timetrack_settings: [{ user_id: "u1", prefs: { a: 1 }, updated_at: "2027-01-01T00:00:00.000Z" }] }
    expect(diffRows(a as never, b as never, DELETED_AT).count).toBe(0)
  })
})
