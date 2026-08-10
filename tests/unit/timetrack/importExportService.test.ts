import { describe, expect, test } from "vitest"

import { STATE_VERSION } from "@/src/timetrack/config"
import {
  exportStateJson,
  importEntriesCsv,
  importStateJson,
  parseCsvRows,
} from "@/src/timetrack/importExportService"
import { buildProjectDashboard, paceVerdict } from "@/src/timetrack/projectDashboardService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { entrySeconds } from "@/src/timetrack/timetrackService"

import { NOW_ISO, baseState, entry } from "./helpers"

const NOW_SEC = epochSeconds(NOW_ISO)

describe("CSV row parsing", () => {
  test("handles quoted fields, escaped quotes and CRLF", () => {
    const rows = parseCsvRows('a,b\r\n"x,1","he said ""hi"""\r\n')
    expect(rows).toEqual([
      ["a", "b"],
      ["x,1", 'he said "hi"'],
    ])
  })

  test("skips fully blank lines", () => {
    expect(parseCsvRows("a,b\n\n1,2\n")).toHaveLength(2)
  })
})

describe("time-entry CSV import", () => {
  const csv = [
    "Description,Project,Client,Task,Tags,Billable,Start date,Start time,Duration",
    'Kickoff call,New Project,New Client,Discovery,"meeting, deep",Yes,2026-08-10,09:00,1:30',
    "Second entry,New Project,New Client,,,No,2026-08-10,11:00,45m",
  ].join("\n")

  test("creates missing client, project, task and tags", () => {
    const result = importEntriesCsv(baseState(), csv, NOW_ISO)
    expect(result.imported).toBe(2)
    expect(result.skipped).toHaveLength(0)

    const project = result.state.projects.find((p) => p.name === "New Project")!
    const client = result.state.clients.find((c) => c.name === "New Client")!
    expect(project.clientId).toBe(client.id)
    expect(result.state.tasks.some((t) => t.name === "Discovery" && t.projectId === project.id)).toBe(true)
    expect(result.state.tags.map((t) => t.name)).toContain("meeting")
  })

  test("duration column drives the stop time", () => {
    const result = importEntriesCsv(baseState(), csv, NOW_ISO)
    const kickoff = result.state.entries.find((e) => e.description === "Kickoff call")!
    expect(kickoff.duration).toBe(5400)
    expect(kickoff.billable).toBe(true)
    const second = result.state.entries.find((e) => e.description === "Second entry")!
    expect(second.duration).toBe(2700)
    expect(second.billable).toBe(false)
  })

  test("existing entities are reused rather than duplicated", () => {
    const reuse = "Description,Project,Start date,Start time,Duration\nWork,Alpha,2026-08-10,09:00,1:00"
    const result = importEntriesCsv(baseState(), reuse, NOW_ISO)
    expect(result.state.projects).toHaveLength(2)
    expect(result.state.entries[0].projectId).toBe(30)
  })

  test("ISO start/stop columns are accepted", () => {
    const iso = "Description,Start,Stop\nISO entry,2026-08-10T09:00:00.000Z,2026-08-10T10:00:00.000Z"
    const result = importEntriesCsv(baseState(), iso, NOW_ISO)
    expect(result.imported).toBe(1)
    expect(result.state.entries[0].duration).toBe(3600)
  })

  test("rows without a usable start or duration are reported, not silently dropped", () => {
    const bad = "Description,Project,Start date,Start time,Duration\nBroken,Alpha,,,\nAlso broken,Alpha,2026-08-10,09:00,"
    const result = importEntriesCsv(baseState(), bad, NOW_ISO)
    expect(result.imported).toBe(0)
    expect(result.skipped.map((s) => s.line)).toEqual([2, 3])
  })

  test("required-field violations are reported per row", () => {
    const state = baseState()
    state.workspace.requiredFields = { project: true, task: false, tag: false, description: false }
    const noProject = "Description,Start date,Start time,Duration\nNo project,2026-08-10,09:00,1:00"
    const result = importEntriesCsv(state, noProject, NOW_ISO)
    expect(result.imported).toBe(0)
    expect(result.skipped[0].reason).toMatch(/Project is required/)
  })

  test("DD.MM.YYYY dates are understood", () => {
    const eu = "Description,Start date,Start time,Duration\nEuro date,10.08.2026,09:00,1:00"
    const result = importEntriesCsv(baseState(), eu, NOW_ISO)
    expect(result.imported).toBe(1)
    expect(new Date(result.state.entries[0].start).getMonth()).toBe(7)
  })
})

describe("JSON backup", () => {
  test("round trips", () => {
    const state = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00")] })
    const restored = importStateJson(exportStateJson(state))
    expect(restored.error).toBeNull()
    expect(restored.state?.entries).toHaveLength(1)
  })

  test("rejects a version mismatch", () => {
    const bad = JSON.stringify({ ...baseState(), version: STATE_VERSION + 99 })
    expect(importStateJson(bad).error).toMatch(/does not match/)
  })

  test("rejects malformed input", () => {
    expect(importStateJson("{not json").error).toMatch(/not valid JSON/)
    expect(importStateJson('{"version":1}').error).toMatch(/missing entries/)
  })
})

describe("project dashboard", () => {
  // Project 30: 10h estimate, period 2026-08-01 → 2026-08-31
  const state = baseState({
    entries: [
      entry(1, "2026-08-03", "09:00", "12:00"),
      entry(2, "2026-08-05", "09:00", "11:00"),
      entry(3, "2026-08-10", "09:00", "10:00"),
    ],
  })

  test("tracked totals and cumulative burn-up", () => {
    const dash = buildProjectDashboard(state, 30, "2026-08-10", NOW_SEC)!
    expect(dash.trackedSeconds).toBe(6 * 3600)
    expect(dash.periodStart).toBe("2026-08-01")
    expect(dash.periodEnd).toBe("2026-08-31")
    expect(dash.burnUp).toHaveLength(10)
    expect(dash.burnUp.at(-1)!.seconds).toBe(6 * 3600)
    // monotonically increasing
    expect(dash.burnUp.every((p, i, arr) => i === 0 || p.seconds >= arr[i - 1].seconds)).toBe(true)
  })

  test("completion percentage against the estimate", () => {
    const dash = buildProjectDashboard(state, 30, "2026-08-10", NOW_SEC)!
    expect(dash.completionPct).toBeCloseTo(60, 5)
  })

  test("forecast extends the pace to the period end", () => {
    const dash = buildProjectDashboard(state, 30, "2026-08-10", NOW_SEC)!
    expect(dash.forecast).toHaveLength(21)
    expect(dash.forecast.at(-1)!.seconds).toBeGreaterThan(dash.trackedSeconds)
  })

  test("projected end date comes from the observed pace", () => {
    const dash = buildProjectDashboard(state, 30, "2026-08-10", NOW_SEC)!
    // 6h over 10 days = 0.6h/day; 4h remaining ≈ 7 more days
    expect(dash.projectedEndDate).toBe("2026-08-17")
  })

  test("crossed alert thresholds are reported", () => {
    const dash = buildProjectDashboard(state, 30, "2026-08-10", NOW_SEC)!
    expect(dash.triggeredThresholds).toEqual([50])
  })

  test("task and member breakdowns are sorted by time", () => {
    const withTasks = baseState({
      entries: [
        entry(1, "2026-08-03", "09:00", "12:00", { taskId: 40 }),
        entry(2, "2026-08-05", "09:00", "10:00", { taskId: 41, userId: 11 }),
      ],
    })
    const dash = buildProjectDashboard(withTasks, 30, "2026-08-10", NOW_SEC)!
    expect(dash.taskBreakdown[0].label).toBe("Build")
    expect(dash.memberBreakdown.map((m) => m.label)).toEqual(["You", "Sam"])
  })

  test("pace verdict compares consumption to elapsed time", () => {
    const dash = buildProjectDashboard(state, 30, "2026-08-10", NOW_SEC)!
    // 60% of the estimate used, ~32% of the period elapsed
    expect(paceVerdict(dash, "2026-08-10").tone).toBe("warn")
  })

  test("a running entry counts toward the dashboard", () => {
    const running = baseState({
      entries: [
        {
          ...entry(9, "2026-08-10", "09:00", "10:00"),
          stop: null,
          duration: -epochSeconds(new Date(2026, 7, 10, 9, 0).toISOString()),
        },
      ],
    })
    const nowSec = epochSeconds(new Date(2026, 7, 10, 10, 0).toISOString())
    expect(entrySeconds(running.entries[0], nowSec)).toBe(3600)
    const dash = buildProjectDashboard(running, 30, "2026-08-10", nowSec)!
    expect(dash.trackedSeconds).toBe(3600)
  })

  test("unknown project returns null", () => {
    expect(buildProjectDashboard(state, 999, "2026-08-10", NOW_SEC)).toBeNull()
  })
})
