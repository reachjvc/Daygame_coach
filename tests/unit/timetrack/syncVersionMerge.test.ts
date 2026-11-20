import { describe, expect, it } from "vitest"

import {
  isBackToBase,
  mergeRow,
  mergeTags,
  mergeValue,
  olderThan,
  overruledColumns,
  rebase,
  sameRow,
  sameValue,
  versionOf,
} from "@/src/timetrack/syncVersionService"

/**
 * The merge of a queued change onto a newer server copy, asserted on rows
 * directly. The page-level specs reach it through a screen; these say what a
 * person keeps, and a slip here is lost or resurrected time.
 */

const T = (hhmm: string) => `2026-11-19T${hhmm}:00.000Z`
const running = { id: "e1", description: "Gym", started_at: T("09:00"), stopped_at: null, duration_seconds: null, deleted_at: null, running_device_id: "phone" }
const finished = { ...running, stopped_at: T("10:00"), duration_seconds: 3600, running_device_id: null }
const proj = (name: string, extra: Record<string, unknown> = {}) => ({ id: "p1", name, updated_at: "v1", deleted_at: null, ...extra })
const none = () => undefined

describe("comparing versions and values", () => {
  it("versions and values compare as instants, and a row is the server's once nothing of ours is left", () => {
    { // two spellings of one instant are one value, stamps order as instants, a row says its version
      expect(sameValue("2026-11-19T09:00:00+00:00", "2026-11-19T09:00:00.000Z")).toBe(true)
      expect(sameValue("2026-11-19T09:00:00.000Z", "2026-11-19T09:01:00.000Z")).toBe(false)
      expect(sameValue("2026-11-19", "2026-11-19T00:00:00.000Z")).toBe(false)
      expect(olderThan("2026-11-19T09:00:00+00:00", "2026-11-19T09:00:01.000Z")).toBe(true)
      expect(olderThan("2026-11-19T09:00:01.000Z", "2026-11-19T09:00:00+00:00")).toBe(false)
      expect(olderThan("2026-11-19T09:00:00.000001+00:00", "2026-11-19T09:00:00.000002+00:00")).toBe(true)
      expect(olderThan("2026-11-19T09:00:00.000002+00:00", "2026-11-19T09:00:00.000001+00:00")).toBe(false)
      expect(olderThan("nonsense", "2026-11-19T09:00:00Z")).toBe(false)
      expect(versionOf({ updated_at: "v1" })).toBe("v1")
      expect(versionOf({ updated_at: 5 })).toBeNull()
      expect(versionOf(null)).toBeNull()
    }
    { // a row is the server's once nothing of ours is left, ignoring version and running device
      expect(sameRow({ name: "a", updated_at: "v1", running_device_id: "x" }, { name: "a", updated_at: "v2", running_device_id: "y" })).toBe(true)
      expect(sameRow({ name: "a" }, { name: "b" })).toBe(false)
    }
  })

})

describe("mergeValue", () => {
  it("mergeValue: the other device's value for what we left alone, ours otherwise, settings key by key", () => {
    { // takes the other device's value for what we left alone, ours for what only we changed, ours when both changed
      expect(mergeValue("a", "a", "b")).toBe("b")
      expect(mergeValue("a", "c", "a")).toBe("c")
      expect(mergeValue("a", "c", "b")).toBe("c")
    }
    { // merges settings key by key (a key the other device removed stays removed) and never mixes two lists
      const merged = mergeValue({ sound: "on", theme: "dark", week: "mon" }, { sound: "off", theme: "dark", week: "mon" }, { sound: "on", week: "mon" })
      expect(merged).toEqual({ sound: "off", week: "mon" })
      expect(mergeValue(["a"], ["a", "b"], ["a", "c"])).toEqual(["a", "b"])
    }
  })

})

describe("mergeRow", () => {
  it("mergeRow: our change on top of the server's row; a stale copy never undoes a stop or a deletion; two stops keep the first", () => {
    { // lays our change on top of everything else as the server has it, keeping our version stamp
      const merged = mergeRow("timetrack_projects", proj("Gym", { color: "red" }), proj("Gym 2", { color: "red" }), proj("Gym", { color: "blue", updated_at: "v2" }))
      expect(merged).toMatchObject({ name: "Gym 2", color: "blue", updated_at: "v1" })
    }
    { // a stale copy never brings back a stopped timer or a deleted row, base known or not; clearing it ourselves is allowed
      const stoppedThere = mergeRow("timetrack_entries", null, { ...running, description: "Gym!" }, finished)
      expect(stoppedThere).toMatchObject({ stopped_at: T("10:00"), duration_seconds: 3600 })

      const gone = { id: "p1", name: "Gym", deleted_at: T("10:00") }
      const alive = { id: "p1", name: "Gym 2", deleted_at: null }
      expect(mergeRow("timetrack_projects", null, alive, gone).deleted_at).toBe(T("10:00"))
      expect(mergeRow("timetrack_projects", { id: "p1", name: "Gym", deleted_at: null }, alive, gone).deleted_at).toBe(T("10:00"))
      expect(mergeRow("timetrack_projects", gone, { ...alive, name: "Gym" }, gone).deleted_at).toBeNull()
    }
    { // two stops of one running timer: the first stop is when it ended; two edits of a finished end go to the later sender
      const early = { ...finished }
      const late = { ...running, stopped_at: T("10:20"), duration_seconds: 4800 }
      expect(mergeRow("timetrack_entries", running, late, early)).toMatchObject({ stopped_at: T("10:00"), duration_seconds: 3600 })

      const mine = { ...finished, stopped_at: T("10:20"), duration_seconds: 4800 }
      const theirs = { ...finished, stopped_at: T("10:10"), duration_seconds: 4200 }
      expect(mergeRow("timetrack_entries", finished, mine, theirs)).toMatchObject({ stopped_at: T("10:20"), duration_seconds: 4800 })
    }
  })



  it("mergeRow keeps an entry's times consistent and its running device the server's", () => {
    { // an entry's times stay consistent: a mixed start and stop gets the length that fits, a stop before the start gives the server's times
      const earlierStart = { ...finished, started_at: T("08:30"), duration_seconds: 5400 }
      const laterStop = { ...finished, stopped_at: T("10:30"), duration_seconds: 5400 }
      expect(mergeRow("timetrack_entries", finished, earlierStart, laterStop)).toMatchObject({
        started_at: T("08:30"),
        stopped_at: T("10:30"),
        duration_seconds: 7200,
      })

      const startedAfterTheStop = { ...finished, started_at: T("11:00"), duration_seconds: 0 }
      expect(mergeRow("timetrack_entries", finished, startedAfterTheStop, finished)).toMatchObject({
        started_at: T("09:00"),
        stopped_at: T("10:00"),
        duration_seconds: 3600,
      })
    }
    { // a running entry has no length and the server says which device holds it; a stopped entry belongs to no device
      const merged = mergeRow("timetrack_entries", running, { ...running, description: "Gym!", duration_seconds: 5 }, { ...running, running_device_id: "pc" })
      expect(merged).toMatchObject({ duration_seconds: null, running_device_id: "pc" })
      expect(mergeRow("timetrack_entries", running, { ...finished, running_device_id: "phone" }, running).running_device_id).toBeNull()
    }
  })

})

describe("tags and what was changed here", () => {
  it("tags merge as sets and overruled columns are named", () => {
    { // merge as sets: the server's, plus what we added, minus what we took off; with no base the server's stand
      expect(mergeTags(["a", "b"], ["a", "c"], ["a", "b", "d"])).toEqual(["a", "c", "d"])
      expect(mergeTags(undefined, ["z"], ["b", "a"])).toEqual(["a", "b"])
    }
    { // overruled columns are the ones we changed that the result does not carry, not the ones that follow from them
      const base = { name: "a", color: "red", duration_seconds: 1 }
      const mine = { name: "b", color: "blue", duration_seconds: 2 }
      expect(overruledColumns(base, mine, { name: "b", color: "green", duration_seconds: 9 })).toEqual(["color"])
      expect(overruledColumns(null, mine, { name: "x" })).toEqual([])
    }
  })

})

describe("isBackToBase", () => {
  const base = { v: "v1", row: proj("Gym") }

  it("isBackToBase: a change put back by hand, created and taken back, deleted, and an entry with its tags", () => {
    { // a change put back by hand is back, a different value is not
      expect(isBackToBase("timetrack_projects", proj("Gym", { updated_at: "v3" }), base)).toBe(true)
      expect(isBackToBase("timetrack_projects", proj("Gym 2"), base)).toBe(false)
    }
    { // created and taken back is back, unless the account may hold it; deleted is back only against a deleted base
      expect(isBackToBase("timetrack_projects", undefined, { v: null, row: null })).toBe(true)
      expect(isBackToBase("timetrack_projects", proj("Gym"), { v: null, row: null })).toBe(false)
      expect(isBackToBase("timetrack_projects", undefined, { v: null, row: null, sent: true })).toBe(false)
      expect(isBackToBase("timetrack_projects", proj("Gym"), { v: "v1", row: null })).toBe(false)
      const deleted = { v: "v1", row: proj("Gym", { deleted_at: T("10:00") }) }
      expect(isBackToBase("timetrack_projects", undefined, deleted)).toBe(true)
      expect(isBackToBase("timetrack_projects", proj("Gym", { deleted_at: T("10:00") }), base)).toBe(false)
      expect(isBackToBase("timetrack_projects", proj("Gym"), deleted)).toBe(false)
    }
    { // an entry is back only with its tags back too
      const entryBase = { v: "v1", row: { id: "e1", description: "Gym" }, tags: ["a"] }
      const row = { id: "e1", description: "Gym" }
      expect(isBackToBase("timetrack_entries", row, entryBase, ["a"])).toBe(true)
      expect(isBackToBase("timetrack_entries", row, entryBase, ["a", "b"])).toBe(false)
      expect(isBackToBase("timetrack_entries", row, entryBase)).toBe(false)
      expect(isBackToBase("timetrack_entries", row, { v: "v1", row }, ["a"])).toBe(false)
    }
  })


})

describe("rebase", () => {
  it("rebase lays the queue onto the server: sends, drops, tells what was lost, mixes start and stop", () => {
    { // sends our change on the server's copy, based on it; drops it when the server already holds the same; sends a new row as queued
      const sent = rebase(
        { timetrack_projects: [proj("Gym 2")] } as never,
        { "timetrack_projects/p1": { v: "v1", row: proj("Gym") } },
        {},
        { timetrack_projects: [proj("Gym", { updated_at: "v2", color: "blue" })] } as never,
        none,
      )
      expect(sent.send.timetrack_projects).toEqual([expect.objectContaining({ name: "Gym 2" })])
      expect(sent.bases["timetrack_projects/p1"].v).toBe("v2")
      expect(sent.overruled).toEqual([])

      const theirs = proj("Gym 2", { updated_at: "v2" })
      const same = rebase(
        { timetrack_projects: [proj("Gym 2")] } as never,
        { "timetrack_projects/p1": { v: "v1", row: proj("Gym") } },
        {},
        { timetrack_projects: [theirs] } as never,
        none,
      )
      expect(same.send.timetrack_projects).toBeUndefined()
      expect(same.hold.timetrack_projects).toEqual([theirs])

      const fresh = rebase({ timetrack_projects: [proj("New")] } as never, {}, {}, {}, none)
      expect(fresh.send.timetrack_projects).toEqual([proj("New")])
      expect(fresh.bases["timetrack_projects/p1"]).toEqual({ v: null, row: null })
    }
    { // an entry the other device deleted is not written to and the person is told what was lost; deleting it twice loses nothing
      const base = { id: "e1", description: "Gym", deleted_at: null, updated_at: "v1" }
      const bases = { "timetrack_entries/e1": { v: "v1", row: base } }
      const stored = { timetrack_entries: [{ ...base, deleted_at: T("10:00"), updated_at: "v2" }] } as never

      const lost = rebase({ timetrack_entries: [{ ...base, description: "Gym!" }] } as never, bases, {}, stored, () => [])
      expect(lost.send.timetrack_entries).toBeUndefined()
      expect(lost.overruled).toEqual([{ table: "timetrack_entries", key: "e1", columns: ["description"], deleted: true }])

      const twice = rebase({ timetrack_entries: [{ ...base, deleted_at: T("10:05") }] } as never, bases, {}, stored, () => [])
      expect(twice.overruled).toEqual([])
      expect(twice.send.timetrack_entries).toBeUndefined()
    }
    { // a start edited on the other device and a stop edited here both survive, with the length that fits
      const base = { ...finished, updated_at: "v1" }
      const out = rebase(
        { timetrack_entries: [{ ...base, description: "Mine", stopped_at: T("10:30"), duration_seconds: 5400 }] } as never,
        { "timetrack_entries/e1": { v: "v1", row: base, tags: [] } },
        {},
        { timetrack_entries: [{ ...base, started_at: T("09:30"), duration_seconds: 1800, updated_at: "v2" }] } as never,
        () => [],
      )
      expect(out.send.timetrack_entries).toEqual([
        expect.objectContaining({ description: "Mine", started_at: T("09:30"), stopped_at: T("10:30"), duration_seconds: 3600 }),
      ])
    }
  })



  it("rebase sends tag sets with their entry, and none for an unchanged set or a deleted entry", () => {
    { // a tag set with no server copy is sent as is; a tag added here is merged with the server's and the entry travels with it
      const entry = { id: "e1", description: "Gym", deleted_at: null, updated_at: "v1" }
      const theirsEntry = { ...entry, updated_at: "v2" }

      const unknown = rebase({}, {}, { e1: ["a"] }, {}, none)
      expect(unknown.tagSets).toEqual({ e1: ["a"] })
      expect(unknown.holdTags).toEqual({ e1: ["a"] })

      const out = rebase({}, { "timetrack_entries/e1": { v: "v1", row: entry, tags: ["a"] } }, { e1: ["a", "b"] }, { timetrack_entries: [theirsEntry] } as never, () => ["a", "c"])
      expect(out.tagSets).toEqual({ e1: ["a", "b", "c"] })
      expect(out.send.timetrack_entries).toEqual([theirsEntry])
      expect(out.bases["timetrack_entries/e1"]).toMatchObject({ v: "v2", tags: ["a", "c"] })
    }
    { // sends no tags when the merged set is the server's, and none to an entry the other device deleted
      const entry = { id: "e1", description: "Gym", deleted_at: null, updated_at: "v1" }
      const bases = { "timetrack_entries/e1": { v: "v1", row: entry, tags: ["a"] } }
      const theirsEntry = { ...entry, updated_at: "v2" }

      const same = rebase({}, bases, { e1: ["a"] }, { timetrack_entries: [theirsEntry] } as never, () => ["a", "c"])
      expect(same.tagSets).toEqual({})
      expect(same.send.timetrack_entries).toBeUndefined()
      expect(same.holdTags).toEqual({ e1: ["a", "c"] })

      const deleted = rebase({}, bases, { e1: ["b"] }, { timetrack_entries: [{ ...theirsEntry, deleted_at: T("10:00") }] } as never, () => ["a"])
      expect(deleted.tagSets).toEqual({})
      expect(deleted.send.timetrack_entries).toBeUndefined()
    }
  })

})
