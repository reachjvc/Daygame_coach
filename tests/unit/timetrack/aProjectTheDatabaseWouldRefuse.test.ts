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
 * `supabase/migrations/20260903120000_timetrack.sql`, and the last test reads them out
 * of the migration so this list cannot drift from the database's.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

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

describe("the list of rules", () => {
  test("is the database's, not a remembered version of it", () => {
    /**
     * Read out of the migration so the two cannot drift. If a constraint is added to
     * `timetrack_projects` and nothing here covers it, that is worth knowing — the
     * assertion names the ones this file accounts for.
     */
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260903120000_timetrack.sql"), "utf8")
    const projectBlock = /create table (?:if not exists )?public\.timetrack_projects\s*\(([\s\S]*?)\n\);/.exec(sql)?.[1]
    expect(projectBlock, "the timetrack_projects block was not found, so this asserts nothing").toBeTruthy()

    const constraints = [...projectBlock!.matchAll(/check \(([^)]*(?:\([^)]*\))?[^)]*)\)/g)].map((m) => m[1])
    expect(constraints.length, "no CHECK constraints parsed").toBeGreaterThan(2)

    /**
     * Two of this table's constraints need no client-side check and are named here
     * with the reason, rather than left to look like an oversight:
     * `estimate_type in ('hours','monetary')` and `status in (…)` are produced by a
     * picker and a boolean respectively, so no input can reach them out of range.
     * Everything else has a rule in `validateProject`.
     */
    const checkedInCode = ["name", "end_date", "estimated_amount", "fixed_fee", "recurring", "estimated_seconds"]
    const safeByConstruction = ["estimate_type in", "status in"]
    const unaccounted = constraints.filter(
      (c) => !checkedInCode.some((word) => c.includes(word)) && !safeByConstruction.some((word) => c.includes(word)),
    )
    expect(unaccounted, `these CHECK constraints have no client-side check:\n  ${unaccounted.join("\n  ")}`).toEqual([])
  })
})
