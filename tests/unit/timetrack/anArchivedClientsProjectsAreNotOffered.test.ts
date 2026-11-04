/**
 * ARCHIVING A CLIENT TAKES ITS PROJECTS OUT OF THE PICKERS — AND OUT OF NOTHING ELSE.
 *
 * Found by the heavy-user audit of 2026-11-04 (D10): Manage → Clients → Archive turned
 * the button into "Restore" and changed nothing else. Every project picker went on
 * offering the archived client's projects, because nothing anywhere read the client's
 * `archived` flag. An archived client's projects now behave like archived projects in
 * a picker: not offered for new time. The time already tracked on them is untouched,
 * so reports and the entries themselves still name the project.
 */

import { describe, expect, test } from "vitest"

import { buildSummary, defaultReportConfig, emptyFilters } from "@/src/timetrack/reportsService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { projectLabel, projectsForDescription, searchProjects } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

// Alpha (30) belongs to the client Acme (20); Beta (31) has no client
function withAcmeArchived(): TimetrackState {
  const state = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { projectId: "30" })] })
  return { ...state, clients: state.clients.map((c) => ({ ...c, archived: true })) }
}

describe("an archived client", () => {
  test("its projects are not offered in the project picker, by name or by client", () => {
    const state = withAcmeArchived()
    expect(searchProjects(state, "").map((p) => p.name)).toEqual(["Beta"])
    expect(searchProjects(state, "Acme"), "found through the archived client's name").toEqual([])
    expect(searchProjects(state, "Alpha")).toEqual([])
  })

  test("nor suggested while typing a description", () => {
    expect(projectsForDescription(withAcmeArchived(), "Alpha")).toEqual([])
  })

  test("restoring the client offers them again", () => {
    const state = withAcmeArchived()
    const restored = { ...state, clients: state.clients.map((c) => ({ ...c, archived: false })) }
    expect(searchProjects(restored, "Alpha").map((p) => p.name)).toEqual(["Alpha"])
  })

  test("the time already on its projects keeps their names, in the list and in reports", () => {
    const state = withAcmeArchived()
    expect(projectLabel(state, state.entries[0])).toBe("Alpha")
    const config = {
      ...defaultReportConfig("2026-08-10", 1, state.workspace.rounding),
      filters: emptyFilters({ start: "2026-08-10", end: "2026-08-10" }),
    }
    const report = buildSummary(state, config, epochSeconds(NOW_ISO))
    expect(report.rows.map((r) => r.label)).toEqual(["Alpha"])
  })
})
