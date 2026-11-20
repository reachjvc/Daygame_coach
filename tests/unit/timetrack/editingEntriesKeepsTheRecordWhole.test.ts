/**
 * SPLITTING, MOVING, COPYING, DELETING AND BULK-EDITING ENTRIES, asserted on the
 * entries a person ends with. Every case is a boundary where a rule changes its
 * answer: a length of exactly ten minutes, a split at the very start, a closed
 * day. Lengths must always add up, and a refusal must leave the entry as it was.
 */
import { describe, expect, test } from "vitest"

import {
  bulkEditEntries,
  deleteEntries,
  dropIdleTime,
  duplicateEntry,
  moveEntryToDay,
  setEntryDuration,
  splitEntry,
} from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = "2026-08-12T12:00:00.000Z"
const stateWith = (entries: TimeEntry[], lockBefore: string | null = null): TimetrackState => {
  const s = baseState()
  return { ...s, workspace: { ...s.workspace, lockEntriesBefore: lockBefore }, entries }
}
const hour = entry("1", "2026-08-10", "09:00", "10:00")
const live = (s: TimetrackState) => s.entries.filter((e) => !e.serverDeletedAt)

describe("splitting an entry", () => {
  test("a split is refused where it cannot be made and otherwise adds up to the original", () => {
    { // is refused for what cannot be split, leaving the entry as it was; only longer than ten minutes, only inside, only on an open day
      const refused = (s: TimetrackState, id: string, at: string | null) => splitEntry(s, id, at, NOW)
      const s = stateWith([hour, entry("short", "2026-08-10", "11:00", "11:10"), entry("ok", "2026-08-10", "13:00", "13:11"), { ...hour, id: "run", stop: null, duration: -1000 }])
      expect(refused(s, "nope", null).error).toBe("Entry not found")
      expect(refused(s, "run", null).error).toBe("Stop the entry before splitting it")
      expect(refused(s, "short", null).error).toMatch(/longer than 10 minutes/)
      expect(refused(s, "ok", null).error).toBeNull()
      expect(refused(s, "1", hour.start).error).toMatch(/inside the entry/)
      expect(refused(s, "1", hour.stop!).error).toMatch(/inside the entry/)
      expect(refused(s, "1", "2026-08-10T08:00:00.000Z").error).toMatch(/inside the entry/)
      expect(refused(s, "1", "2026-08-10T11:00:00.000Z").error).toMatch(/inside the entry/)
      const closed = stateWith([hour], hour.start.slice(0, 10))
      const out = refused(closed, "1", null)
      expect(out.error).toMatch(/locked/)
      expect(out.state).toBe(closed)
    }
    { // makes two entries that together are exactly the original: the middle by default, or the point given
      const s = stateWith([hour])
      const mid = splitEntry(s, "1", null, NOW)
      expect(mid.error).toBeNull()
      const [second, first] = mid.state.entries
      expect(first).toMatchObject({ id: "1", start: hour.start, duration: 1800, at: NOW })
      expect(second).toMatchObject({ stop: hour.stop, duration: 1800, start: first.stop, description: hour.description, projectId: hour.projectId })
      expect(second.id).not.toBe("1")

      const at = new Date(Date.parse(hour.start) + 15 * 60_000).toISOString()
      const point = splitEntry(s, "1", at, NOW).state.entries
      expect(point.map((e) => e.duration).sort((x, y) => x - y)).toEqual([900, 2700])
      expect(point[0].duration + point[1].duration).toBe(hour.duration)
      const odd = { ...hour, duration: 3601, stop: new Date(Date.parse(hour.start) + 3601_000).toISOString() }
      const halves = splitEntry(stateWith([odd]), "1", null, NOW).state.entries
      expect(halves[0].duration + halves[1].duration).toBe(3601)
    }
  })

})

describe("deleting and bulk-editing entries", () => {
  test("a delete and a bulk edit touch only what they are asked to, and never a closed day", () => {
    { // a delete removes the chosen entries except on a closed day, and says which stayed
      const closed = entry("old", "2026-08-01", "09:00", "10:00")
      const s = stateWith([hour, closed, entry("3", "2026-08-11", "09:00", "10:00")], "2026-08-05")
      const out = deleteEntries(s, ["1", "old", "ghost"], NOW)
      expect(out.removed.map((e) => e.id)).toEqual(["1"])
      expect(out.state.entries.map((e) => e.id)).toEqual(["old", "3"])
      expect(out.violations).toHaveLength(1)
      expect(out.violations[0].field).toBe("date")
      expect(deleteEntries(s, [], NOW).removed).toEqual([])
      const onTheLockDay = entry("edge", "2026-08-05", "09:00", "10:00")
      expect(deleteEntries(stateWith([onTheLockDay], "2026-08-05"), ["edge"], NOW).removed).toEqual([])
      const dayAfter = entry("after", "2026-08-06", "09:00", "10:00")
      expect(deleteEntries(stateWith([dayAfter], "2026-08-05"), ["after"], NOW).removed).toHaveLength(1)
    }
    { // a bulk edit changes only the chosen entries: a new project drops the old task, the same project keeps it, tags are added and removed as a set
      const a = entry("a", "2026-08-10", "09:00", "10:00", { projectId: "30", taskId: "40", tagIds: ["50"], billable: true, description: "one" })
      const b = entry("b", "2026-08-10", "10:00", "11:00", { projectId: "30", taskId: "41", tagIds: ["51"] })
      const c = entry("c", "2026-08-10", "11:00", "12:00", { projectId: "30", taskId: "40", tagIds: ["50"] })
      const s = stateWith([a, b, c])
      const get = (st: TimetrackState, id: string) => st.entries.find((e) => e.id === id)!

      const moved = bulkEditEntries(s, ["a", "b"], { projectId: "31" }, NOW)
      expect(moved.changed).toEqual(["a", "b"])
      expect(get(moved.state, "a")).toMatchObject({ projectId: "31", taskId: null, at: NOW })
      expect(get(moved.state, "c")).toBe(c)

      const same = bulkEditEntries(s, ["a"], { projectId: "30" }, NOW)
      expect(get(same.state, "a").taskId).toBe("40")
      const task = bulkEditEntries(s, ["a"], { taskId: "41" }, NOW)
      expect(get(task.state, "a").taskId).toBe("41")
      expect(get(bulkEditEntries(s, ["a"], { projectId: null }, NOW).state, "a")).toMatchObject({ projectId: null, taskId: null })

      expect(get(bulkEditEntries(s, ["a"], { addTagIds: ["51", "50"] }, NOW).state, "a").tagIds).toEqual(["50", "51"])
      expect(get(bulkEditEntries(s, ["a"], { removeTagIds: ["50"] }, NOW).state, "a").tagIds).toEqual([])
      expect(get(bulkEditEntries(s, ["a"], { tagIds: ["51"], addTagIds: ["50"], removeTagIds: ["51"] }, NOW).state, "a").tagIds).toEqual(["50"])
      expect(get(bulkEditEntries(s, ["a"], { removeTagIds: [] }, NOW).state, "a").tagIds).toEqual(["50"])
      const other = bulkEditEntries(s, ["a"], { billable: false, description: "" }, NOW)
      expect(get(other.state, "a")).toMatchObject({ billable: false, description: "" })
      expect(get(bulkEditEntries(s, ["a"], {}, NOW).state, "a")).toMatchObject({ billable: true, description: "one" })

      const nothing = bulkEditEntries(s, ["ghost"], { billable: false }, NOW)
      expect(nothing.state).toBe(s)
      expect(nothing.changed).toEqual([])
      const locked = stateWith([a], "2026-08-10")
      const refused = bulkEditEntries(locked, ["a"], { billable: false }, NOW)
      expect(refused.state).toBe(locked)
      expect(refused.violations).toHaveLength(1)
    }
  })

})

describe("copying, moving and trimming an entry", () => {
  test("copying, moving and trimming an entry keeps its length and its place", () => {
    { // a copy has the same times and fields as a new entry; a running or missing one is not copied
      const s = stateWith([hour, { ...hour, id: "run", stop: null, duration: -5 }])
      const out = duplicateEntry(s, "1", NOW)
      expect(out.state.entries).toHaveLength(3)
      const copy = out.state.entries.find((e) => e.id !== "1" && e.id !== "run")!
      expect(copy).toMatchObject({ start: hour.start, stop: hour.stop, duration: hour.duration, description: hour.description, projectId: hour.projectId })
      expect(duplicateEntry(s, "run", NOW).state).toBe(s)
      expect(duplicateEntry(s, "ghost", NOW).state).toBe(s)
    }
    { // moving to another day keeps the length; to the same day, or a missing entry, changes nothing
      const s = stateWith([hour])
      const moved = moveEntryToDay(s, "1", "2026-08-11", NOW).state.entries[0]
      expect(moved.duration).toBe(3600)
      expect(new Date(moved.start).getDate() - new Date(hour.start).getDate()).toBe(1)
      expect(new Date(moved.stop!).getTime() - new Date(moved.start).getTime()).toBe(3600_000)
      expect(moveEntryToDay(s, "1", "2026-08-10", NOW).state).toBe(s)
      expect(moveEntryToDay(s, "ghost", "2026-08-11", NOW).state).toBe(s)
      const timer = { ...hour, id: "run", stop: null, duration: -Math.floor(Date.parse(NOW) / 1000) + 60, start: "2026-08-12T11:00:00.000Z" }
      expect(moveEntryToDay(stateWith([timer]), "run", "2026-08-13", NOW).violations).toHaveLength(1)
    }
    { // a set length moves the end only on a stopped entry, never below zero; dropping idle time stops it where idleness began, no earlier than its start
      const s = stateWith([hour])
      expect(setEntryDuration(s, "1", 1800, NOW).state.entries[0]).toMatchObject({ duration: 1800 })
      expect(setEntryDuration(s, "1", -50, NOW).state.entries[0]).toMatchObject({ duration: 0 })
      expect(setEntryDuration(s, "ghost", 10, NOW).state).toBe(s)
      const timer = { ...hour, id: "run", stop: null, duration: -1 }
      expect(setEntryDuration(stateWith([timer]), "run", 10, NOW).state.entries[0].stop).toBeNull()

      const run = { ...hour, id: "run", start: "2026-08-12T10:00:00.000Z", stop: null, duration: -Math.floor(Date.parse("2026-08-12T10:00:00.000Z") / 1000) }
      const trimmed = dropIdleTime(stateWith([run]), "run", "2026-08-12T11:30:00.000Z", NOW)
      expect(trimmed.state.entries[0]).toMatchObject({ stop: "2026-08-12T11:30:00.000Z", duration: 5400 })
      expect(trimmed.droppedSeconds).toBe(1800)
      const before = dropIdleTime(stateWith([run]), "run", "2026-08-12T09:00:00.000Z", NOW)
      expect(before.state.entries[0]).toMatchObject({ stop: run.start, duration: 0 })
      expect(before.droppedSeconds).toBe(7200)
      expect(dropIdleTime(stateWith([run]), "ghost", NOW, NOW)).toMatchObject({ droppedSeconds: 0 })
      expect(live(trimmed.state)).toHaveLength(1)
    }
  })


})
