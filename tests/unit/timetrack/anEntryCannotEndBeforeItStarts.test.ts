/**
 * AN ENTRY MAY NOT END BEFORE IT STARTS, AND A STOPPED ENTRY MAY NOT BE CLEARED
 * BACK INTO RUNNING.
 *
 * Both were reachable in the product on 2026-09-26 and both lose tracked time:
 *
 *   - Typing an end time before the start in the desktop inline row turned a
 *     24-minute entry into `21:36 – 20:00 · 0:00`. Nothing refused it, because
 *     `updateEntry` computed `Math.max(0, stop - start)` and stored zero. The
 *     database then refused the row on `timetrack_entries_stop_after_start`,
 *     and since the upload queue drains all or nothing, NOTHING reached the
 *     account again — a good entry created afterwards stayed in the browser
 *     behind it.
 *   - Clearing the end field in the detail sheet set `stop: null`, which every
 *     reader of this state takes to mean "running". A finished entry started
 *     counting again, and the field is `disabled` while an entry runs, so the
 *     control that broke it could not mend it.
 *
 * The rule therefore lives in `validateEntry`, beside required fields, locked
 * dates and approvals — not in the six fields that can write a time. These
 * tests drive it through every door that reaches it.
 *
 * WHAT THE RULE IS, EXACTLY: `stop >= start`, equal allowed. That is the
 * database's rule (see the last test), and the app creates zero-length entries
 * on its own — press `N` and `S`, or mis-tap Continue — so refusing them here
 * would refuse something the product does routinely.
 */

import { readFileSync } from "node:fs"

import { describe, expect, test } from "vitest"

import {
  canEditEntry,
  createManualEntry,
  isRunning,
  setRunningElapsed,
  startTimer,
  stopTimer,
  undoDisplacement,
  updateEntry,
  validateEntry,
} from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

/** A stopped, hour-long entry — the shape somebody would be repairing. */
function withAnHour(): { state: TimetrackState; id: string } {
  const state = baseState({
    entries: [entry(1, "2026-08-10", "09:00", "10:00", { description: "a real hour" })],
  })
  return { state, id: state.entries[0].id }
}

/**
 * Times are built RELATIVE to the entry's own start.
 *
 * `entry()` builds its times from a local clock, so this suite would pass in
 * UTC and fail two hours east of it if these were written as literal `Z`
 * strings — which is the "whose clock?" failure this project has recorded three
 * times.
 */
function secondsFromStart(state: TimetrackState, seconds: number): string {
  return new Date(new Date(state.entries[0].start).getTime() + seconds * 1000).toISOString()
}

describe("an end before the start is refused, not stored as zero", () => {
  test("updateEntry refuses it and changes nothing", () => {
    const { state, id } = withAnHour()
    const before = state.entries[0]

    const result = updateEntry(state, id, { stop: secondsFromStart(state, -3600) }, NOW_ISO)

    expect(result.violations.map((v) => v.message)).toContain("An entry cannot end before it starts")
    expect(result.state.entries[0]).toBe(before)
  })

  test("one second before the start is still before the start", () => {
    const { state, id } = withAnHour()

    const result = updateEntry(state, id, { stop: secondsFromStart(state, -1) }, NOW_ISO)

    expect(result.violations).toHaveLength(1)
    expect(result.state.entries[0].duration).toBe(3600)
  })

  test("an end EQUAL to the start is allowed, because the app makes those itself", () => {
    const { state, id } = withAnHour()

    const result = updateEntry(state, id, { stop: state.entries[0].start }, NOW_ISO)

    expect(result.violations).toEqual([])
    expect(result.state.entries[0].duration).toBe(0)
  })

  test("createManualEntry refuses it too, which is the door the CSV import uses", () => {
    const state = baseState()

    const result = createManualEntry(
      state,
      {
        draft: { description: "backwards", projectId: null, taskId: null, tagIds: [], billable: false },
        start: "2026-08-10T10:00:00.000Z",
        stop: "2026-08-10T09:00:00.000Z",
      },
      NOW_ISO,
    )

    expect(result.entry).toBeNull()
    expect(result.violations.map((v) => v.message)).toContain("An entry cannot end before it starts")
    expect(result.state.entries).toHaveLength(0)
  })

  test("the message is the same wherever the time was typed", () => {
    const { state, id } = withAnHour()
    const fromUpdate = updateEntry(state, id, { stop: secondsFromStart(state, -3600) }, NOW_ISO).violations[0]
    const fromCreate = createManualEntry(
      state,
      {
        draft: { description: "x", projectId: null, taskId: null, tagIds: [], billable: false },
        start: "2026-08-10T10:00:00.000Z",
        stop: "2026-08-10T09:00:00.000Z",
      },
      NOW_ISO,
    ).violations[0]

    // `toEqual` alone would pass today with both of them `undefined`, which is
    // a test that proves nothing — so require a message first.
    expect(fromUpdate?.message).toBe("An entry cannot end before it starts")
    expect(fromUpdate).toEqual(fromCreate)
  })
})

describe("a stopped entry cannot be cleared back into running", () => {
  test("clearing the end is refused and the entry stays stopped", () => {
    const { state, id } = withAnHour()

    const result = updateEntry(state, id, { stop: null }, NOW_ISO)

    expect(result.violations.map((v) => v.field)).toContain("time")
    expect(result.state.entries[0].stop).not.toBeNull()
    expect(isRunning(result.state.entries[0])).toBe(false)
  })

  test("undo of a displacement still resumes the entry it stopped", () => {
    // the one sanctioned door: `Undo` on the "stopped X and started Y" toast
    const state = baseState({
      entries: [entry(1, "2026-08-10", "09:00", "10:00", { description: "the displaced one" })],
    })
    const displacedId = state.entries[0].id
    const started = startTimer(state, { description: "the new one", projectId: null, taskId: null, tagIds: [], billable: false }, NOW_ISO)
    expect(started.violations).toEqual([])

    const undone = undoDisplacement(started.state, started.entry.id, displacedId, NOW_ISO)

    const displaced = undone.entries.find((e) => e.id === displacedId)!
    expect(isRunning(displaced)).toBe(true)
    expect(undone.entries.find((e) => e.id === started.entry.id)?.serverDeletedAt).not.toBeNull()
  })

  test("editing a RUNNING entry's elapsed time still works", () => {
    // `setRunningElapsed` passes `stop: null` too — but the entry is already
    // running, so it is not the transition the rule refuses.
    const state = baseState()
    const started = startTimer(state, { description: "running", projectId: null, taskId: null, tagIds: [], billable: false }, NOW_ISO)

    const moved = setRunningElapsed(started.state, 1800, NOW_ISO).state

    const running = moved.entries.find((e) => e.id === started.entry.id)!
    expect(isRunning(running)).toBe(true)
    expect(Math.round((new Date(NOW_ISO).getTime() - new Date(running.start).getTime()) / 1000)).toBe(1800)
  })
})

describe("the client's rule and the database's rule are the same rule", () => {
  test("validateEntry allows equal and refuses earlier, exactly as the migration does", () => {
    const state = baseState()
    const candidate = {
      description: "x",
      projectId: null,
      taskId: null,
      tagIds: [] as string[],
      start: "2026-08-10T10:00:00.000Z",
    }

    expect(validateEntry(state, { ...candidate, stop: "2026-08-10T10:00:00.000Z" })).toEqual([])
    expect(validateEntry(state, { ...candidate, stop: "2026-08-10T10:00:01.000Z" })).toEqual([])
    expect(validateEntry(state, { ...candidate, stop: "2026-08-10T09:59:59.000Z" })).toHaveLength(1)
    expect(validateEntry(state, { ...candidate, stop: null })).toEqual([])
  })

  test("the migration still says what this rule assumes it says", () => {
    /**
     * Two facts stored apart: the rule above, and the check constraint the
     * database enforces. If somebody tightens one, this points at the other.
     */
    const sql = readFileSync("supabase/migrations/20260903120000_timetrack.sql", "utf8")

    expect(sql).toContain(
      "constraint timetrack_entries_stop_after_start check (stopped_at is null or stopped_at >= started_at)",
    )
  })
})

describe("stopping means nothing is running afterwards", () => {
  test("one press stops every running entry, not just the first one found", () => {
    /**
     * `stopTimer` stopped exactly one — `runningEntry` returns the first match
     * in array order. Two running entries can appear when two devices each
     * start one, and `reconcileRunningEntries` only tidies that on a pull. In
     * between, pressing Stop stopped one of them and the bar still said Stop,
     * which is "I had to press Stop twice" from the other direction.
     */
    const state = baseState({
      entries: [
        { ...entry(1, "2026-08-10", "09:00", "10:00", { description: "started on the laptop" }), stop: null, duration: -1 },
        { ...entry(2, "2026-08-10", "09:30", "10:00", { description: "started on the phone" }), stop: null, duration: -2 },
      ],
    })
    expect(state.entries.filter(isRunning)).toHaveLength(2)

    const result = stopTimer(state, NOW_ISO)

    expect(result.state.entries.filter(isRunning), "a timer was still running after Stop").toHaveLength(0)
    expect(result.stopped, "the caller was told nothing was stopped").not.toBeNull()
  })

  test("stopping when nothing runs changes nothing and says so", () => {
    const state = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00")] })

    const result = stopTimer(state, NOW_ISO)

    expect(result.stopped).toBeNull()
    expect(result.state).toBe(state)
  })
})

describe("an entry that is already wrong is the one you most need to edit", () => {
  test("a reversed entry stays editable, so the row the message points at can be repaired", () => {
    /**
     * The rule was first raised as `field: "date"`, which `canEditEntry` reads
     * as "this entry is out of bounds" — the gate meant for locked periods and
     * approved timesheets. So every entry already stored reversed, which is
     * precisely the shape yesterday's defect wrote into the owner's workspace,
     * became the one row whose Start, End and Duration were disabled. The sync
     * message says "open it and check its times".
     */
    const state = baseState({
      entries: [
        { ...entry(1, "2026-08-10", "09:00", "10:00", { description: "already reversed" }), stop: entry(1, "2026-08-10", "08:00", "09:00").start, duration: 0 },
      ],
    })

    expect(canEditEntry(state, state.entries[0]), "the row that needs repairing cannot be edited").toBe(true)
  })

  test("a locked period still closes the row, which is what that gate is for", () => {
    const state = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00")] })
    state.workspace.lockEntriesBefore = "2026-08-11"

    expect(canEditEntry(state, state.entries[0])).toBe(false)
  })
})
