/**
 * THE PROJECT EDITOR SAVED SHAPES THE DATABASE REFUSES.
 *
 * Its whole validator was `if (!draft.name.trim())`. Everything else went up as a row
 * the server will not take: a Start date after an End date, a negative rate or fee or
 * budget, a recurring project with no period, and — from the one date field with no
 * `|| null` — the empty string a cleared `type="date"` sends, which is "invalid input
 * syntax for type date".
 *
 * WHY IT IS NOT COSMETIC. `timetrack_projects` is table 3 of 19 in the write order,
 * so a refusal there stops the tasks, tags and entries in the same batch. The browser
 * drops a refused row and records it as sent, which self-heals for an EXISTING project
 * on its next edit — but a NEW project is then marked synced while the server has no
 * such row, and every entry pointing at it fails `timetrack_entries_project_id_fkey`
 * at table 9 and is dropped the same way.
 *
 * Each case below is taken from a CHECK constraint in
 * `supabase/migrations/20260903120000_timetrack.sql`.
 */

import { describe, expect, test } from "vitest"

import { createProject, validateProject } from "@/src/timetrack/timetrackService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"

import { NOW_ISO, baseState } from "./helpers"

const ok = { name: "Alpha" }

describe("what the project editor is allowed to save", () => {
  test("an ordinary project is fine", () => {
    expect(validateProject({ name: "Alpha", startDate: "2026-01-01", endDate: "2026-12-31", rate: 100 })).toEqual([])
  })

  test("refuses a project that ends before it starts", () => {
    const violations = validateProject({ ...ok, startDate: "2026-06-01", endDate: "2026-01-01" })
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain("before it starts")
  })

  test.each([
    ["rate", { rate: -50 }],
    ["fixedFee", { fixedFee: -1 }],
    ["estimatedAmount", { estimatedAmount: -0.01 }],
    ["estimatedSeconds", { estimatedSeconds: -1 }],
  ])("refuses a negative %s", (_field, patch) => {
    expect(validateProject({ ...ok, ...patch })).toHaveLength(1)
  })

  test("refuses a recurring project with no period", () => {
    expect(validateProject({ ...ok, recurring: true, recurringStart: "2026-01-01" })).toHaveLength(1)
  })

  test("refuses a recurring project with no first-period date", () => {
    /**
     * Including the empty string, which is what a cleared `type="date"` sends and what
     * the one date field with no `|| null` used to pass straight through.
     */
    for (const recurringStart of [null, "" as never]) {
      expect(validateProject({ ...ok, recurring: true, recurringPeriod: "month", recurringStart })).toHaveLength(1)
    }
  })

  test("refuses a name cleared to nothing", () => {
    for (const name of ["", "   "]) expect(validateProject({ name })).toHaveLength(1)
  })
})

describe("and whatever the caller does", () => {
  test("an empty first-period date never reaches a date column", () => {
    /**
     * Belt as well as braces: the validator is at the editor, and this is at the
     * service, because `""` in a Postgres `date` column refuses the whole batch and no
     * user typed it — a cleared input did.
     */
    const { state, id } = createProject(baseState(), { name: "Recurring", recurring: true, recurringStart: "" as never }, NOW_ISO)
    expect(state.projects.find((p) => p.id === id)!.recurringStart).toBeNull()

    const row = stateToRows(state, "u1").timetrack_projects.find((r) => r.id === id)!
    expect(row.recurring_start, "an empty string in a `date` column is invalid input syntax").toBeNull()
  })
})
