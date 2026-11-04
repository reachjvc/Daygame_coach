/**
 * AN END IS NEVER STORED BEFORE ITS START, NOT EVEN BY A FRACTION OF A SECOND.
 *
 * Every start a timer makes is stamped to the millisecond (`serverNowIso`), and
 * the rules compared whole seconds. So an end built from the start rounded down,
 * or checked against it rounded down, could land up to 999 ms BEFORE it:
 *
 *   - "Drop them and stop" right after Start, with nothing touched: the last
 *     touch was the click on Start, a few ms before the start's stamp.
 *   - "0" or "0:00" typed as the length of a timer-made entry, or of a running
 *     timer: the end was `floor(start) + 0`.
 *
 * The account refuses that row (`timetrack_entries_stop_after_start`), so the
 * edit never left the browser, the badge said "Not saved", and a running timer
 * kept running on every other device. Found by the edits audit on 2026-11-04,
 * twice each in a real browser.
 */

import { describe, expect, test } from "vitest"

import {
  dropIdleTime,
  moveEntryToDay,
  setEntryDuration,
  setEntryStart,
  setRunningElapsed,
  startTimer,
  stopTimer,
  validateEntry,
} from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

/** local wall-clock times, with milliseconds, so the suite reads the same in any zone */
const at = (h: number, m = 0, s = 0, ms = 0) => new Date(2026, 10, 4, h, m, s, ms).toISOString()
const ms = (iso: string) => new Date(iso).getTime()

const draft: EntryDraft = { description: "walked away", projectId: null, taskId: null, tagIds: [], billable: false }

/** a timer started at 10:00:00.640, the way `serverNowIso` stamps one */
const START = at(10, 0, 0, 640)

function running(): TimetrackState {
  return startTimer(baseState({ entries: [] }), draft, START).state
}

/** a finished 45-minute entry that a timer made, so its start has milliseconds */
function timerMade(): TimetrackState {
  const made = entry(1, "2026-11-04", "10:00", "10:45")
  const withMs: TimeEntry = { ...made, start: START, stop: at(10, 45, 0, 640), duration: 45 * 60 }
  return baseState({ entries: [withMs] })
}

function expectInOrder(e: TimeEntry | undefined) {
  expect(e, "the entry is gone").toBeTruthy()
  expect(e!.stop, "the entry is still running").not.toBeNull()
  expect(ms(e!.stop!) - ms(e!.start), `stored ${e!.start} -> ${e!.stop}`).toBeGreaterThanOrEqual(0)
}

describe("the rule counts milliseconds", () => {
  test("an end one millisecond before the start is refused", () => {
    const violations = validateEntry(baseState(), { ...draft, start: START, stop: at(10, 0, 0, 639) })
    expect(violations.map((v) => v.message)).toContain("An entry cannot end before it starts")
  })

  test("an end equal to the start is allowed, as the database allows it", () => {
    expect(validateEntry(baseState(), { ...draft, start: START, stop: START })).toEqual([])
  })
})

describe("a length of zero", () => {
  test("on a finished entry ends it at its start, not before", () => {
    const state = timerMade()
    const result = setEntryDuration(state, "1", 0, at(12))

    expect(result.violations).toEqual([])
    expectInOrder(result.state.entries[0])
    expect(result.state.entries[0].duration).toBe(0)
  })

  test("on a running timer stops it at its start, not before", () => {
    const result = setRunningElapsed(running(), 0, at(10, 5))

    expect(result.violations).toEqual([])
    expect(result.stopped, "the timer was not stopped").not.toBeNull()
    expectInOrder(result.state.entries[0])
  })

  test("and a length keeps the start's milliseconds", () => {
    const result = setEntryDuration(timerMade(), "1", 30 * 60, at(12))
    expect(result.state.entries[0].stop).toBe(at(10, 30, 0, 640))
  })
})

describe("dropping idle time", () => {
  test("when the last touch was the click on Start, the entry ends at its start", () => {
    const state = running()
    const id = state.entries[0].id
    // the click landed 5 ms before the start was stamped
    const result = dropIdleTime(state, id, at(10, 0, 0, 635), at(10, 0, 30))

    expect(result.violations).toEqual([])
    expectInOrder(result.state.entries[0])
    expect(result.state.entries[0].stop).toBe(START)
  })

  test("says how much it dropped, counted to now", () => {
    const state = running()
    const result = dropIdleTime(state, state.entries[0].id, at(10, 20), at(10, 48))
    expect(result.state.entries[0].stop).toBe(at(10, 20))
    expect(result.droppedSeconds).toBe(28 * 60)
  })
})

describe("the other paths that write an end", () => {
  test("Stop pressed a fraction of a second before the start stops it at the start", () => {
    const result = stopTimer(running(), at(10, 0, 0, 200))
    expectInOrder(result.stopped ?? undefined)
  })

  test("moving a zero-length entry to another day keeps it in order", () => {
    const state = timerMade()
    const zero = setEntryDuration(state, "1", 0, at(12)).state
    const moved = moveEntryToDay(zero, "1", "2026-11-03", at(12))

    expect(moved.violations).toEqual([])
    expectInOrder(moved.state.entries[0])
  })

  test("a start typed a moment after a zero-length end moves the entry, and is not refused", () => {
    const state = timerMade()
    const zero = setEntryDuration(state, "1", 0, at(12)).state
    const result = setEntryStart(zero, "1", at(10, 0, 0, 900), at(12))

    expect(result.violations).toEqual([])
    expectInOrder(result.state.entries[0])
  })
})
