/**
 * A full workspace must survive the trip to the database and back.
 *
 * This is the test that matters most in the whole slice: if it is wrong, the
 * user's history is quietly wrong, and they find out weeks later when a report
 * disagrees with what they remember doing.
 *
 * It deliberately builds a workspace with something in EVERY collection —
 * including the four features that are easy to forget (approvals, webhooks,
 * autotracker, timeline) — because "we mapped the ones we thought of" is how
 * half a feature ships.
 */

import { describe, expect, test } from "vitest"

import { rowsToState, stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const USER = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
const NOW = "2026-09-03T12:00:00.000Z"

/** A workspace with every collection populated */
function fullState(): TimetrackState {
  const base = baseState()
  return {
    ...base,
    workspace: {
      ...base.workspace,
      name: "Studio",
      defaultCurrency: "EUR",
      defaultHourlyRate: 95,
      defaultLabourCost: 40,
      projectsBillableByDefault: true,
      onlyAdminsSeeBillableRates: true,
      rounding: { enabled: true, mode: "up", minutes: 15 },
      requiredFields: { project: true, task: false, tag: false, description: true },
      lockEntriesBefore: "2026-01-01",
      timesheetApprovalsEnabled: true,
    },
    clients: [{ id: "c1", workspaceId: base.workspace.id, name: "Northwind", archived: false, at: NOW }],
    projects: [
      {
        id: "p1",
        workspaceId: base.workspace.id,
        clientId: "c1",
        name: "Coach App",
        color: "#e57cd8",
        active: true,
        isPrivate: false,
        billable: true,
        currency: "EUR",
        rate: 120,
        rateHistory: [
          { validFrom: "2026-01-01", rate: 90 },
          { validFrom: "2026-06-01", rate: 120 },
        ],
        estimateType: "hours",
        estimatedSeconds: 144000,
        estimatedAmount: null,
        autoEstimates: false,
        fixedFee: null,
        recurring: true,
        recurringPeriod: "monthly",
        recurringStart: "2026-01-01",
        startDate: "2026-01-01",
        endDate: null,
        template: false,
        alerts: [{ id: "al1", basis: "estimate", threshold: 80, enabled: true }],
        memberIds: ["10"],
        at: NOW,
        createdAt: "2025-12-01T00:00:00.000Z",
      },
    ],
    tasks: [
      { id: "t1", workspaceId: base.workspace.id, projectId: "p1", name: "Frontend", estimatedSeconds: 3600, assigneeId: "10", rate: 150, active: true, at: NOW },
    ],
    tags: [{ id: "g1", workspaceId: base.workspace.id, name: "deep work", at: NOW }],
    entries: [
      entry("e1", "2026-09-01", "09:00", "10:30", { projectId: "p1", taskId: "t1", tagIds: ["g1"], billable: true, description: "real work" }),
      entry("e2", "2026-09-02", "11:00", "11:20", { projectId: null, taskId: null, tagIds: [], description: "" }),
    ],
    favorites: [{ id: "f1", draft: { description: "standup", projectId: "p1", taskId: null, tagIds: ["g1"], billable: false }, at: NOW }],
    calendars: [
      { id: "cal1", name: "Work", source: "ics_url", ref: "", color: "#06a893", enabled: true, lastSyncedAt: NOW, eventCount: 4 },
    ],
    savedReports: [{ id: "r1", name: "Last week", config: { grouping: "project" } as never, at: NOW }],
    alerts: [{ id: "ae1", projectId: "p1", basis: "estimate", threshold: 80, at: NOW, periodStart: "2026-09-01", read: false }],
    approvals: [
      { id: "ap1", memberId: "10", weekStart: "2026-08-31", status: "submitted", submittedAt: NOW, decidedAt: null, note: "please check" },
    ],
    autotrackers: [{ id: "at1", keyword: "Figma", projectId: "p1", taskId: "t1", tagIds: ["g1"], enabled: true }],
    webhooks: [{ id: "w1", url: "https://hooks.example/x", events: ["time_entry.created"], enabled: true }],
    webhookLog: [{ id: "wl1", at: NOW, event: "time_entry.created", url: "https://hooks.example/x", payload: '{"a":1}', status: "sent" }],
    timeline: [{ id: "tl1", start: "2026-09-01T09:00:00.000Z", end: "2026-09-01T09:30:00.000Z", label: "Figma", converted: false }],
    pomodoro: { enabled: true, workMinutes: 25, breakMinutes: 5, autoContinue: true, notify: true },
    idle: { enabled: true, minutes: 10 },
    reminders: { enabled: true, days: [1, 2], fromHour: 9, toHour: 18, everyMinutes: 60 },
  }
}

describe("a whole workspace survives the round trip", () => {
  const before = fullState()
  const rows = stateToRows(before, USER)
  const after = rowsToState(rows, NOW)

  test("every collection comes back with the same number of things in it", () => {
    for (const key of [
      "clients", "projects", "tasks", "tags", "entries", "favorites", "calendars",
      "savedReports", "alerts", "approvals", "autotrackers", "webhooks", "webhookLog", "timeline",
    ] as const) {
      expect(after[key].length, `${key} changed size`).toBe(before[key].length)
    }
  })

  test("an entry keeps its project, task, tags, times and duration", () => {
    const original = before.entries.find((e) => e.id === "e1")!
    const restored = after.entries.find((e) => e.id === "e1")!
    expect(restored.description).toBe(original.description)
    expect(restored.projectId).toBe("p1")
    expect(restored.taskId).toBe("t1")
    expect(restored.tagIds).toEqual(["g1"])
    expect(restored.billable).toBe(true)
    expect(restored.start).toBe(original.start)
    expect(restored.stop).toBe(original.stop)
    expect(restored.duration).toBe(original.duration)
  })

  test("an entry with nothing attached keeps its nulls", () => {
    const restored = after.entries.find((e) => e.id === "e2")!
    expect(restored.projectId).toBeNull()
    expect(restored.taskId).toBeNull()
    expect(restored.tagIds).toEqual([])
  })

  test("rate history survives in order — this is what past invoices are worth", () => {
    const restored = after.projects[0]
    expect(restored.rateHistory).toEqual([
      { validFrom: "2026-01-01", rate: 90 },
      { validFrom: "2026-06-01", rate: 120 },
    ])
    expect(restored.rate).toBe(120)
  })

  test("a project keeps its budget, estimate, recurrence and alerts", () => {
    const p = after.projects[0]
    expect(p.estimatedSeconds).toBe(144000)
    expect(p.recurring).toBe(true)
    expect(p.recurringPeriod).toBe("monthly")
    expect(p.recurringStart).toBe("2026-01-01")
    expect(p.alerts).toEqual([{ id: "al1", basis: "estimate", threshold: 80, enabled: true }])
    expect(p.memberIds).toEqual(["10"])
    expect(p.createdAt).toBe("2025-12-01T00:00:00.000Z")
  })

  test("workspace rules survive: rounding, required fields, the lock date", () => {
    expect(after.workspace.rounding).toEqual({ enabled: true, mode: "up", minutes: 15 })
    expect(after.workspace.requiredFields).toEqual({ project: true, task: false, tag: false, description: true })
    expect(after.workspace.lockEntriesBefore).toBe("2026-01-01")
    expect(after.workspace.timesheetApprovalsEnabled).toBe(true)
    expect(after.workspace.defaultHourlyRate).toBe(95)
    expect(after.workspace.defaultLabourCost).toBe(40)
  })

  test("the four features that are easy to forget all come back whole", () => {
    expect(after.approvals[0]).toEqual(before.approvals[0])
    expect(after.webhooks[0]).toEqual(before.webhooks[0])
    expect(after.autotrackers[0]).toEqual(before.autotrackers[0])
    expect(after.timeline[0]).toEqual(before.timeline[0])
    expect(after.webhookLog[0]).toEqual(before.webhookLog[0])
  })

  test("your own settings come back", () => {
    expect(after.user).toEqual(before.user)
    expect(after.pomodoro).toEqual(before.pomodoro)
    expect(after.idle).toEqual(before.idle)
    expect(after.reminders).toEqual(before.reminders)
    expect(after.members).toEqual(before.members)
  })

  test("a favourite keeps the whole draft it stands for", () => {
    expect(after.favorites[0].draft).toEqual(before.favorites[0].draft)
  })

  test("a connected calendar comes back, and does not pretend to know its events", () => {
    expect(after.calendars[0].name).toBe("Work")
    expect(after.calendars[0].color).toBe("#06a893")
    expect(after.calendars[0].ref).toBe("")
    // the events themselves are re-fetched, never stored
    expect(after.events).toEqual([])
    expect(after.calendars[0].eventCount).toBe(0)
  })
})

describe("a running timer", () => {
  test("stays running, and its duration is worked out from the clock", () => {
    const startedAt = "2026-09-03T11:00:00.000Z"
    const state = baseState({
      entries: [
        {
          ...entry("run1", "2026-09-03", "11:00", "12:00"),
          stop: null,
          duration: -Math.floor(new Date(startedAt).getTime() / 1000),
          start: startedAt,
        },
      ],
    })
    const restored = rowsToState(stateToRows(state, USER), NOW)
    const running = restored.entries[0]
    expect(running.stop).toBeNull()
    expect(running.duration).toBe(-Math.floor(new Date(startedAt).getTime() / 1000))
  })
})

describe("an empty workspace", () => {
  test("makes no rows it cannot account for, and comes back empty", () => {
    const empty = baseState({ clients: [], projects: [], tasks: [], tags: [], entries: [] })
    const rows = stateToRows(empty, USER)
    expect(rows.timetrack_entries).toEqual([])
    expect(rows.timetrack_workspaces).toHaveLength(1)
    expect(rows.timetrack_settings).toHaveLength(1)
    expect(rowsToState(rows, NOW).entries).toEqual([])
  })
})

describe("a server payload with no usable workspace row", () => {
  test("keeps the entries instead of handing back an empty workspace", () => {
    // This exact shape deleted a real entry during testing: the mapper returned
    // a fresh empty workspace, and the next diff sent a tombstone for every row.
    const rows = stateToRows(fullState(), USER)
    const orphaned = {
      ...rows,
      timetrack_workspaces: rows.timetrack_workspaces.map((w) => ({ ...w, deleted_at: NOW })),
    }
    const restored = rowsToState(orphaned, NOW)
    expect(restored.entries.length).toBe(fullState().entries.length)
    expect(restored.projects.length).toBe(fullState().projects.length)
    expect(restored.workspace.id).toBe(rows.timetrack_workspaces[0].id)
  })

  test("a genuinely empty payload still gives an empty workspace", () => {
    const restored = rowsToState(stateToRows(baseState({ clients: [], projects: [], tasks: [], tags: [], entries: [] }), USER), NOW)
    expect(restored.entries).toEqual([])
  })
})
