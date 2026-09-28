/**
 * A CLONE DOES NOT TAKE ITS TEMPLATE'S IDS WITH IT.
 *
 * `createProjectFromTemplate` builds the new project from `{ ...template }`, and
 * `createProject` used to keep the caller's `alerts` array verbatim — so the clone
 * carried the template's alert ids. The tasks in that same function already got
 * fresh ids through `createTask`; the alerts were the one collection copied straight
 * across.
 *
 * WHY THAT IS NOT COSMETIC. `stateToRows` then emits two `timetrack_project_alerts`
 * rows sharing one primary key. `diffRows` indexes rows by key and keeps the last,
 * so the change set contains exactly one — the clone's — and upserting it
 * `on conflict (id)` REWRITES the server's row to point at the clone. The template's
 * alert is gone server-side. On the next pull the template has no alerts, and because
 * the local duplicate collapses to the same single row again, the diff sees nothing to
 * put back. Clone twice and two projects lose theirs.
 *
 * What that costs is a budget alarm — "tell me at 80% of the estimate" — that stops
 * existing without a word. "Create from template" is one click on every template row.
 *
 * The batch-level duplicate-key guard in `timetrackRepo` never sees this, because
 * `diffRows` has already thrown one of the pair away upstream. So the fix has to be
 * at the point the id is minted, and this test is on that point.
 */

import { describe, expect, test } from "vitest"

import { rowKeyOf } from "@/src/db/timetrackTypes"
import { createProject, createProjectFromTemplate } from "@/src/timetrack/timetrackService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"

import { NOW_ISO, baseState } from "./helpers"

/** The fixture's project 30 carries alert id "300"; make it a template. */
function withATemplate() {
  const base = baseState()
  return {
    ...base,
    projects: base.projects.map((p) => (p.id === "30" ? { ...p, template: true } : p)),
  }
}

describe("creating a project from a template", () => {
  test("gives the clone's alerts ids of their own", () => {
    const state = withATemplate()
    const templateAlertIds = state.projects.find((p) => p.id === "30")!.alerts.map((a) => a.id)
    expect(templateAlertIds.length, "the fixture's template has no alerts, so this asserts nothing").toBeGreaterThan(0)

    const { state: after, id } = createProjectFromTemplate(state, "30", "Alpha, again", NOW_ISO)
    const clone = after.projects.find((p) => p.id === id)!

    expect(clone.alerts.length, "the alerts were not carried over at all").toBe(templateAlertIds.length)
    for (const alert of clone.alerts) {
      expect(templateAlertIds, `alert ${alert.id} is the template's own row`).not.toContain(alert.id)
    }
  })

  test("so the rows that go up do not share a primary key", () => {
    /**
     * The assertion that matters, and it is on the ROWS rather than the state: the
     * damage happens in the upsert, where two rows with one key mean the second
     * silently rewrites the first.
     */
    const state = withATemplate()
    const { state: after } = createProjectFromTemplate(state, "30", "Alpha, again", NOW_ISO)
    const rows = stateToRows(after, "u1").timetrack_project_alerts
    const keys = rows.map((row) => rowKeyOf("timetrack_project_alerts", row as unknown as Record<string, unknown>))

    expect(rows.length, "no alert rows were produced, so this asserts nothing").toBeGreaterThan(1)
    expect(new Set(keys).size, `two alert rows share a key: ${keys.join(", ")}`).toBe(keys.length)
  })

  test("and cloning twice does not collide either", () => {
    const state = withATemplate()
    const once = createProjectFromTemplate(state, "30", "First", NOW_ISO)
    const twice = createProjectFromTemplate(once.state, "30", "Second", NOW_ISO)
    const rows = stateToRows(twice.state, "u1").timetrack_project_alerts
    const keys = rows.map((row) => rowKeyOf("timetrack_project_alerts", row as unknown as Record<string, unknown>))
    expect(new Set(keys).size).toBe(keys.length)
  })

  test("and an alert handed to createProject directly is re-minted too", () => {
    /**
     * Fixed at the class, not at the template path: any caller offering an alert is
     * creating a new row, whatever it thinks the id is.
     */
    const state = baseState()
    const { state: after, id } = createProject(
      state,
      { name: "Borrowed", alerts: [{ id: "300", basis: "estimate", threshold: 80, enabled: true }] },
      NOW_ISO,
    )
    expect(after.projects.find((p) => p.id === id)!.alerts[0].id).not.toBe("300")
  })
})
