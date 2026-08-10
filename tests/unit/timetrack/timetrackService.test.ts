import { describe, expect, test } from "vitest"

import { MIN_SPLIT_SECONDS } from "@/src/timetrack/config"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import {
  activeToken,
  applyAutotracker,
  buildDayGroups,
  bulkEditEntries,
  continueEntry,
  createManualEntry,
  deleteEntries,
  duplicateEntry,
  entrySeconds,
  evaluateAlerts,
  isRunning,
  matchAutotracker,
  projectPeriod,
  projectRateAt,
  removeToken,
  resolveBillableRate,
  restoreEntries,
  runningEntry,
  setRunningElapsed,
  splitEntry,
  startLinkFor,
  startTimer,
  stopTimer,
  toggleFavorite,
  validateEntry,
  weekTotalSeconds,
} from "@/src/timetrack/timetrackService"
import type { EntryDraft } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

const draft: EntryDraft = { description: "write tests", projectId: 30, taskId: null, tagIds: [50], billable: true }

describe("running entries use Toggl's negative-duration encoding", () => {
  test("startTimer stores -startEpoch and no stop", () => {
    const { state, entry: created } = startTimer(baseState(), draft, NOW_ISO)
    expect(created.stop).toBeNull()
    expect(created.duration).toBe(-epochSeconds(NOW_ISO))
    expect(isRunning(created)).toBe(true)
    expect(runningEntry(state)?.id).toBe(created.id)
  })

  test("entrySeconds of a running entry is now + duration", () => {
    const { entry: created } = startTimer(baseState(), draft, NOW_ISO)
    const nowSec = epochSeconds(NOW_ISO) + 90
    expect(entrySeconds(created, nowSec)).toBe(90)
  })

  test("stopTimer converts to a positive duration", () => {
    const started = startTimer(baseState(), draft, NOW_ISO)
    const stopIso = new Date(epochSeconds(NOW_ISO) * 1000 + 3600_000).toISOString()
    const { state, stopped } = stopTimer(started.state, stopIso)
    expect(stopped?.duration).toBe(3600)
    expect(runningEntry(state)).toBeNull()
  })

  test("starting a second timer stops the first at the same instant", () => {
    const first = startTimer(baseState(), draft, NOW_ISO)
    const laterIso = new Date(epochSeconds(NOW_ISO) * 1000 + 600_000).toISOString()
    const second = startTimer(first.state, { ...draft, description: "next" }, laterIso)

    const previous = second.state.entries.find((e) => e.id === first.entry.id)!
    expect(previous.stop).toBe(laterIso)
    expect(previous.duration).toBe(600)
    expect(second.state.entries.filter(isRunning)).toHaveLength(1)
  })

  test("editing elapsed time moves the start of a running entry", () => {
    const started = startTimer(baseState(), draft, NOW_ISO)
    const state = setRunningElapsed(started.state, 7200, NOW_ISO)
    const running = runningEntry(state)!
    expect(entrySeconds(running, epochSeconds(NOW_ISO))).toBe(7200)
  })
})

describe("continue / duplicate", () => {
  test("continue starts a new entry with the same draft", () => {
    const state = baseState({ entries: [entry(1, "2026-08-09", "09:00", "10:00", { description: "old", tagIds: [50] })] })
    const { state: next } = continueEntry(state, 1, NOW_ISO)
    const running = runningEntry(next)!
    expect(running.id).not.toBe(1)
    expect(running.description).toBe("old")
    expect(running.tagIds).toEqual([50])
  })

  test("duplicate copies the original times", () => {
    const original = entry(1, "2026-08-09", "09:00", "10:30")
    const next = duplicateEntry(baseState({ entries: [original] }), 1, NOW_ISO)
    expect(next.entries).toHaveLength(2)
    const copy = next.entries.find((e) => e.id !== 1)!
    expect(copy.start).toBe(original.start)
    expect(copy.duration).toBe(original.duration)
  })
})

describe("split (Toggl allows it above 10 minutes only)", () => {
  test("rejects entries at or below 10 minutes", () => {
    const short = entry(1, "2026-08-09", "09:00", "09:10")
    expect(short.duration).toBe(MIN_SPLIT_SECONDS)
    const result = splitEntry(baseState({ entries: [short] }), 1, null, NOW_ISO)
    expect(result.error).toMatch(/longer than 10 minutes/)
    expect(result.state.entries).toHaveLength(1)
  })

  test("splits at the midpoint and preserves total duration", () => {
    const long = entry(1, "2026-08-09", "09:00", "11:00")
    const result = splitEntry(baseState({ entries: [long] }), 1, null, NOW_ISO)
    expect(result.error).toBeNull()
    expect(result.state.entries).toHaveLength(2)
    const total = result.state.entries.reduce((sum, e) => sum + e.duration, 0)
    expect(total).toBe(long.duration)
    const [a, b] = [...result.state.entries].sort((x, y) => epochSeconds(x.start) - epochSeconds(y.start))
    expect(a.stop).toBe(b.start)
  })

  test("rejects a split point outside the entry", () => {
    const long = entry(1, "2026-08-09", "09:00", "11:00")
    const outside = new Date(new Date(long.stop!).getTime() + 60_000).toISOString()
    const result = splitEntry(baseState({ entries: [long] }), 1, outside, NOW_ISO)
    expect(result.error).toMatch(/inside the entry/)
  })
})

describe("bulk edit", () => {
  test("adds and removes tags and clears the task when the project changes", () => {
    const state = baseState({
      entries: [
        entry(1, "2026-08-09", "09:00", "10:00", { tagIds: [50], taskId: 40 }),
        entry(2, "2026-08-09", "10:00", "11:00", { tagIds: [51], taskId: 41 }),
      ],
    })
    const next = bulkEditEntries(state, [1, 2], { projectId: 31, addTagIds: [51], removeTagIds: [50], billable: false }, NOW_ISO)
    for (const e of next.entries) {
      expect(e.projectId).toBe(31)
      expect(e.taskId).toBeNull()
      expect(e.tagIds).toEqual([51])
      expect(e.billable).toBe(false)
    }
  })
})

describe("delete + undo", () => {
  test("restoreEntries puts deleted entries back", () => {
    const state = baseState({ entries: [entry(1, "2026-08-09", "09:00", "10:00"), entry(2, "2026-08-09", "10:00", "11:00")] })
    const { state: afterDelete, removed } = deleteEntries(state, [1], NOW_ISO)
    expect(afterDelete.entries).toHaveLength(1)
    const restored = restoreEntries(afterDelete, removed)
    expect(restored.entries.map((e) => e.id).sort()).toEqual([1, 2])
  })
})

describe("timer list grouping", () => {
  const state = baseState({
    entries: [
      entry(1, "2026-08-10", "09:00", "10:00", { description: "same" }),
      entry(2, "2026-08-10", "11:00", "11:30", { description: "same" }),
      entry(3, "2026-08-10", "12:00", "12:30", { description: "different" }),
      entry(4, "2026-08-09", "09:00", "09:45", { description: "yesterday" }),
    ],
  })
  const nowSec = epochSeconds(NOW_ISO)

  test("collapses identical entries and totals the day", () => {
    const groups = buildDayGroups(state.entries, { groupSimilar: true, nowSec })
    expect(groups[0].date).toBe("2026-08-10")
    expect(groups[0].rows).toHaveLength(2)
    const groupedRow = groups[0].rows.find((r) => r.grouped)!
    expect(groupedRow.entries).toHaveLength(2)
    expect(groupedRow.totalSeconds).toBe(5400)
    expect(groups[0].totalSeconds).toBe(3600 + 1800 + 1800)
  })

  test("ungrouped mode keeps one row per entry, newest first", () => {
    const groups = buildDayGroups(state.entries, { groupSimilar: false, nowSec })
    expect(groups[0].rows).toHaveLength(3)
    expect(groups[0].rows[0].entries[0].id).toBe(3)
  })

  test("days are ordered newest first", () => {
    const groups = buildDayGroups(state.entries, { groupSimilar: true, nowSec })
    expect(groups.map((g) => g.date)).toEqual(["2026-08-10", "2026-08-09"])
  })

  test("week total respects the first day of week", () => {
    // 2026-08-10 is a Monday: a Sunday entry falls in the previous week
    const withSunday = baseState({ entries: [...state.entries, entry(5, "2026-08-09", "20:00", "21:00")] })
    const mondayWeek = weekTotalSeconds(withSunday.entries, "2026-08-10", 1, nowSec)
    expect(mondayWeek).toBe(3600 + 1800 + 1800)
    const sundayWeek = weekTotalSeconds(withSunday.entries, "2026-08-10", 0, nowSec)
    expect(sundayWeek).toBe(3600 + 1800 + 1800 + 2700 + 3600)
  })
})

describe("validation: required fields, locked entries, approvals", () => {
  test("required fields block a save", () => {
    const state = baseState()
    state.workspace.requiredFields = { project: true, task: false, tag: true, description: true }
    const violations = validateEntry(state, { description: "", projectId: null, taskId: null, tagIds: [], start: NOW_ISO })
    expect(violations.map((v) => v.field).sort()).toEqual(["description", "project", "tag"])
  })

  test("entries on or before the lock date are rejected", () => {
    const state = baseState()
    state.workspace.lockEntriesBefore = "2026-08-10"
    const violations = validateEntry(state, { description: "x", projectId: 30, taskId: null, tagIds: [], start: NOW_ISO })
    expect(violations[0].field).toBe("date")
  })

  test("a submitted timesheet blocks changes in that week", () => {
    const state = baseState()
    state.workspace.timesheetApprovalsEnabled = true
    state.approvals = [
      { id: 1, memberId: 10, weekStart: "2026-08-10", status: "submitted", submittedAt: NOW_ISO, decidedAt: null, note: "" },
    ]
    const violations = validateEntry(state, { description: "x", projectId: 30, taskId: null, tagIds: [], start: NOW_ISO })
    expect(violations[0].field).toBe("approval")
  })

  test("startTimer refuses to create an entry that violates the rules", () => {
    const state = baseState()
    state.workspace.requiredFields = { project: true, task: false, tag: false, description: false }
    const result = startTimer(state, { ...draft, projectId: null }, NOW_ISO)
    expect(result.violations).toHaveLength(1)
    expect(result.state.entries).toHaveLength(0)
  })
})

describe("billable rate hierarchy: task → project(historical) → member → workspace", () => {
  const state = baseState()

  test("task rate wins", () => {
    const e = entry(1, "2026-08-05", "09:00", "10:00", { taskId: 40 })
    expect(resolveBillableRate(state, e)).toBe(150)
  })

  test("project historical rate applies by entry date", () => {
    const older = entry(1, "2026-07-05", "09:00", "10:00")
    const newer = entry(2, "2026-08-05", "09:00", "10:00")
    expect(resolveBillableRate(state, older)).toBe(90)
    expect(resolveBillableRate(state, newer)).toBe(100)
    expect(projectRateAt(state.projects[0], older.start)).toBe(90)
  })

  test("member rate applies when the project has none", () => {
    const e = entry(1, "2026-08-05", "09:00", "10:00", { projectId: 31 })
    expect(resolveBillableRate(state, e)).toBe(80)
  })

  test("workspace default applies when nothing else does", () => {
    const stripped = baseState()
    stripped.members = stripped.members.map((m) => ({ ...m, hourlyRate: null }))
    const e = entry(1, "2026-08-05", "09:00", "10:00", { projectId: 31 })
    expect(resolveBillableRate(stripped, e)).toBe(50)
  })

  test("non-billable entries have no rate", () => {
    const e = entry(1, "2026-08-05", "09:00", "10:00", { billable: false, taskId: 40 })
    expect(resolveBillableRate(state, e)).toBe(0)
  })
})

describe("description tokens", () => {
  test("detects @ and # tokens at the caret", () => {
    const project = activeToken("build @alp", 10)
    expect(project).toMatchObject({ kind: "project", query: "alp" })
    const tag = activeToken("build #dee", 10)
    expect(tag).toMatchObject({ kind: "tag", query: "dee" })
    expect(activeToken("plain text", 10)).toBeNull()
  })

  test("removes the token once the entity is picked", () => {
    const token = activeToken("build @alp", 10)!
    expect(removeToken("build @alp", token)).toBe("build")
  })
})

describe("favorites", () => {
  test("toggle adds then removes an identical draft", () => {
    const added = toggleFavorite(baseState(), draft, NOW_ISO)
    expect(added.favorites).toHaveLength(1)
    const removed = toggleFavorite(added, { ...draft, tagIds: [50] }, NOW_ISO)
    expect(removed.favorites).toHaveLength(0)
  })
})

describe("autotracker", () => {
  test("keyword match applies the rule's project and tags", () => {
    const state = baseState({
      autotrackers: [{ id: 1, keyword: "invoice", projectId: 31, taskId: null, tagIds: [51], enabled: true }],
    })
    const rule = matchAutotracker(state, "send Invoice to Acme")!
    expect(rule.projectId).toBe(31)
    const applied = applyAutotracker({ description: "x", projectId: null, taskId: null, tagIds: [50], billable: false }, rule)
    expect(applied.projectId).toBe(31)
    expect(applied.tagIds.sort()).toEqual([50, 51])
    expect(matchAutotracker(state, "unrelated work")).toBeNull()
  })
})

describe("project periods", () => {
  test("weekly recurrence rolls forward from the anchor", () => {
    const project = { ...baseState().projects[0], recurring: true, recurringPeriod: "weekly" as const, recurringStart: "2026-08-03" }
    expect(projectPeriod(project, "2026-08-10")).toEqual({ start: "2026-08-10", end: "2026-08-16" })
    expect(projectPeriod(project, "2026-08-09")).toEqual({ start: "2026-08-03", end: "2026-08-09" })
  })

  test("monthly recurrence uses calendar months", () => {
    const project = { ...baseState().projects[0], recurring: true, recurringPeriod: "monthly" as const, recurringStart: "2026-05-01" }
    expect(projectPeriod(project, "2026-08-10")).toEqual({ start: "2026-08-01", end: "2026-08-31" })
  })

  test("non-recurring projects use their start/end dates", () => {
    expect(projectPeriod(baseState().projects[0], "2026-08-10")).toEqual({ start: "2026-08-01", end: "2026-08-31" })
  })
})

describe("alerts", () => {
  test("fire once per period when the threshold is crossed", () => {
    // Project 30: 10h estimate, 50% alert → 6h tracked crosses it
    const state = baseState({
      entries: [entry(1, "2026-08-05", "09:00", "15:00")],
    })
    const fired = evaluateAlerts(state, "2026-08-10", NOW_ISO)
    expect(fired.alerts).toHaveLength(1)
    expect(fired.alerts[0]).toMatchObject({ projectId: 30, threshold: 50, periodStart: "2026-08-01" })

    const again = evaluateAlerts(fired, "2026-08-10", NOW_ISO)
    expect(again.alerts).toHaveLength(1)
  })

  test("no alert below the threshold", () => {
    const state = baseState({ entries: [entry(1, "2026-08-05", "09:00", "10:00")] })
    expect(evaluateAlerts(state, "2026-08-10", NOW_ISO).alerts).toHaveLength(0)
  })
})

describe("manual entries and start links", () => {
  test("manual entry stores a positive duration", () => {
    const start = new Date(2026, 7, 9, 9, 0, 0).toISOString()
    const stop = new Date(2026, 7, 9, 10, 30, 0).toISOString()
    const { state, entry: created } = createManualEntry(baseState(), { draft, start, stop }, NOW_ISO)
    expect(created?.duration).toBe(5400)
    expect(state.entries).toHaveLength(1)
  })

  test("start link round-trips the draft", () => {
    const e = entry(1, "2026-08-09", "09:00", "10:00", { description: "ship it", tagIds: [50, 51], taskId: 40 })
    const link = startLinkFor(e, "https://app.test")
    const params = new URLSearchParams(link.split("?")[1])
    expect(params.get("description")).toBe("ship it")
    expect(params.get("tags")).toBe("50,51")
    expect(params.get("task")).toBe("40")
    expect(params.get("billable")).toBe("1")
  })
})
