/**
 * A RUNNING TIMER CANNOT START IN THE FUTURE — ON EVERY PATH, IN THE SAME WORDS.
 *
 * The detail sheet's day picker refused it ("A running timer cannot start in the
 * future"). The row's start box, the sheet's start box and a calendar drag below
 * the now-line did not: the timer read 0:00:00, the hours it had tracked left the
 * week total, and Stop then wrote a zero-length entry later that night. Found by
 * the edits audit on 2026-11-04 in all three places.
 *
 * All three reach `updateEntry` (the boxes through `setEntryStart`, the drag
 * through `shiftEntryBy`), so the rule lives there.
 */

import { describe, expect, test } from "vitest"

import { shiftEntryBy } from "@/src/timetrack/calendarService"
import { setEntryStart, startTimer, updateEntry } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m, 0, 0).toISOString()
const NOW = at(14, 0)

const draft: EntryDraft = { description: "running", projectId: null, taskId: null, tagIds: [], billable: false }

function runningSinceEleven(): { state: TimetrackState; id: string } {
  const state = startTimer(baseState({ entries: [] }), draft, at(11, 0)).state
  return { state, id: state.entries[0].id }
}

const REFUSAL = "A running timer cannot start in the future"

describe("a running timer's start", () => {
  test("typed later than now is refused, and the timer keeps its start", () => {
    const { state, id } = runningSinceEleven()
    const result = setEntryStart(state, id, at(16, 0), NOW)

    expect(result.violations.map((v) => v.message)).toEqual([REFUSAL])
    expect(result.state).toBe(state)
  })

  test("dragged on the calendar to below the now-line is refused", () => {
    const { state, id } = runningSinceEleven()
    const result = updateEntry(state, id, shiftEntryBy(state.entries[0], 4 * 60), NOW)

    expect(result.violations.map((v) => v.message)).toEqual([REFUSAL])
    expect(result.state).toBe(state)
  })

  test("typed earlier than now is written, as before", () => {
    const { state, id } = runningSinceEleven()
    const result = setEntryStart(state, id, at(9, 30), NOW)

    expect(result.violations).toEqual([])
    expect(result.state.entries[0].start).toBe(at(9, 30))
  })

  test("set to now itself is allowed", () => {
    const { state, id } = runningSinceEleven()
    expect(setEntryStart(state, id, NOW, NOW).violations).toEqual([])
  })

  test("an edit that leaves the start alone is not refused, even if another device put it ahead of this clock", () => {
    // a start a few seconds ahead of this device: two clocks, not a typed future
    const ahead = startTimer(baseState({ entries: [] }), draft, at(14, 1)).state
    const result = updateEntry(ahead, ahead.entries[0].id, { description: "renamed" }, NOW)

    expect(result.violations).toEqual([])
    expect(result.state.entries[0].description).toBe("renamed")
  })
})

describe("a finished entry", () => {
  test("may still be planned ahead (plan Q2)", () => {
    const { state, id } = runningSinceEleven()
    const stopped = updateEntry(state, id, { stop: at(12, 0) }, NOW).state
    const result = updateEntry(stopped, id, shiftEntryBy(stopped.entries[0], 6 * 60), NOW)

    expect(result.violations).toEqual([])
    expect(result.state.entries[0].start).toBe(at(17, 0))
  })
})
