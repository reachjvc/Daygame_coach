/**
 * THE TIMER'S RULES AT THEIR EDGES, asserted on the entries a person ends with:
 * what a workspace may require, which timer a stop ends and where, and which
 * project is offered first. A slip here is a wrong length on the record, so each
 * case sits on the boundary where the rule changes its answer.
 */
import { describe, expect, test } from "vitest"

import {
  projectLabel,
  projectLastUsed,
  reconcileRunningEntries,
  runningEntry,
  searchProjects,
  stopTimer,
  tagNames,
  validateEntry,
} from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const running = (id: string, start: string, extra: Partial<TimeEntry> = {}): TimeEntry => ({
  ...entry(id, "2026-08-10", "09:00", "10:00"),
  start,
  stop: null,
  duration: -Math.floor(Date.parse(start) / 1000),
  ...extra,
})
const withEntries = (...entries: TimeEntry[]): TimetrackState => ({ ...baseState(), entries })
const required = (over: Partial<TimetrackState["workspace"]["requiredFields"]>) => {
  const s = baseState()
  return { ...s, workspace: { ...s.workspace, requiredFields: { ...s.workspace.requiredFields, ...over } } }
}
const candidate = { description: "work", projectId: "30", taskId: "40", tagIds: ["50"], start: "2026-08-10T09:00:00.000Z", stop: "2026-08-10T10:00:00.000Z" }

describe("what a workspace may require", () => {
  test("an entry may end the moment it starts, never before, and each required field is refused only where the workspace requires it", () => {
    { // an entry may end the moment it starts, never a millisecond before, and a running one has no end to check
      const s = baseState()
      expect(validateEntry(s, { ...candidate, stop: candidate.start })).toEqual([])
      expect(validateEntry(s, { ...candidate, stop: "2026-08-10T08:59:59.999Z" }).map((v) => v.field)).toEqual(["time"])
      expect(validateEntry(s, { ...candidate, stop: null })).toEqual([])
    }
    { // each required field is refused when empty, and only when the workspace requires it
      const empty = { ...candidate, description: "   ", projectId: null, taskId: null, tagIds: [] }
      expect(validateEntry(baseState(), empty)).toEqual([])
      expect(validateEntry(required({ description: true }), empty).map((v) => v.field)).toEqual(["description"])
      expect(validateEntry(required({ project: true }), empty).map((v) => v.field)).toEqual(["project"])
      expect(validateEntry(required({ task: true }), empty).map((v) => v.field)).toEqual(["task"])
      expect(validateEntry(required({ tag: true }), empty).map((v) => v.field)).toEqual(["tag"])
      expect(validateEntry(required({ description: true, project: true, task: true, tag: true }), candidate)).toEqual([])
    }
  })

})

describe("which timer a stop ends, and where", () => {
  test("two timers at once: the older ends where the newer began; a stop gives the length, never a negative one", () => {
    { // two timers running at once: the older one ends where the newer began, the newer one keeps running
      const older = running("1", "2026-08-10T09:00:00.000Z")
      const newer = running("2", "2026-08-10T09:30:00.000Z")
      for (const order of [[older, newer], [newer, older]]) {
        const out = reconcileRunningEntries(withEntries(...order))
        const byId = Object.fromEntries(out.state.entries.map((e) => [e.id, e]))
        expect(byId["1"]).toMatchObject({ stop: "2026-08-10T09:30:00.000Z", duration: 1800 })
        expect(byId["2"].stop).toBeNull()
        expect(out.stopped.map((e) => e.id)).toEqual(["1"])
      }
      const one = withEntries(older)
      expect(reconcileRunningEntries(one).state).toBe(one)
      const gone = withEntries(older, { ...newer, serverDeletedAt: "2026-08-10T09:31:00.000Z" })
      expect(reconcileRunningEntries(gone).stopped).toEqual([])
      expect(runningEntry(gone)?.id).toBe("1")
    }
    { // stopping gives the length from the start, and a clock before the start gives a zero-length entry, never a negative one
      const timer = running("1", "2026-08-10T09:00:00.000Z")
      const stopped = stopTimer(withEntries(timer), "2026-08-10T09:45:30.000Z").stopped!
      expect(stopped).toMatchObject({ stop: "2026-08-10T09:45:30.000Z", duration: 2730 })
      const early = stopTimer(withEntries(timer), "2026-08-10T08:00:00.000Z").stopped!
      expect(early).toMatchObject({ stop: timer.start, duration: 0 })
      const same = stopTimer(withEntries(timer), timer.start).stopped!
      expect(same).toMatchObject({ stop: timer.start, duration: 0 })
      expect(stopTimer(withEntries(entry("9", "2026-08-10", "09:00", "10:00")), "2026-08-10T11:00:00.000Z").stopped).toBeNull()
    }
  })

})

describe("naming and offering projects", () => {
  test("labels, tags and which project is offered first", () => {
    { // an entry is labelled with its project and task; tags by name, unknown ones skipped
      const s = baseState()
      expect(projectLabel(s, entry("1", "2026-08-10", "09:00", "10:00", { taskId: "40" }))).toBe("Alpha · Build")
      expect(projectLabel(s, entry("1", "2026-08-10", "09:00", "10:00", { taskId: null }))).toBe("Alpha")
      expect(projectLabel(s, entry("1", "2026-08-10", "09:00", "10:00", { projectId: null }))).toBeNull()
      expect(projectLabel(s, entry("1", "2026-08-10", "09:00", "10:00", { projectId: "nope" }))).toBeNull()
      expect(tagNames(s, ["51", "gone", "50"])).toEqual(["meeting", "deep"])
    }
    { // the project used most recently is offered first, then the unused by name; a deleted entry counts for nothing; a limit cuts the list
      const beta = baseState().projects[1].id
      const s = withEntries(
        entry("1", "2026-08-01", "09:00", "10:00", { projectId: "30" }),
        entry("2", "2026-08-05", "09:00", "10:00", { projectId: beta }),
        entry("3", "2026-08-09", "09:00", "10:00", { projectId: "30", serverDeletedAt: "2026-08-09T11:00:00.000Z" }),
        entry("4", "2026-08-03", "09:00", "10:00", { projectId: null }),
      )
      const used = projectLastUsed(s)
      expect(used.get("30")).toBe(entry("1", "2026-08-01", "09:00", "10:00").start)
      expect(used.size).toBe(2)
      expect(searchProjects(s, "").map((p) => p.id)).toEqual([beta, "30"])
      expect(searchProjects(s, "", 1).map((p) => p.id)).toEqual([beta])
      expect(searchProjects(s, "", 0)).toEqual([])
      const tie = withEntries(entry("1", "2026-08-01", "09:00", "10:00", { projectId: "30" }), entry("2", "2026-08-01", "09:00", "10:00", { projectId: beta }))
      expect(searchProjects(tie, "").map((p) => p.name)).toEqual(["Alpha", "Beta"])
      const lastWins = withEntries(entry("1", "2026-08-01", "09:00", "10:00", { projectId: beta }), entry("2", "2026-08-09", "09:00", "10:00", { projectId: beta }), entry("3", "2026-08-05", "09:00", "10:00", { projectId: "30" }))
      expect(searchProjects(lastWins, "").map((p) => p.id)).toEqual([beta, "30"])
    }
  })

})
