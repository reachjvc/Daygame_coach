// @vitest-environment jsdom
/**
 * THE SHEET'S ONE-TAP FIXES NEED NO ARITHMETIC (Phase 4, item 4).
 *
 * Every time fix in the detail sheet was a typed clock time: "I started five
 * minutes earlier" meant reading 09:00, working out 08:55 and typing it, and
 * "this ended when the next one started" meant reading the next entry's start
 * off another row — with its seconds out of sight, which is how the owner's
 * hand fixes left overlaps of 33 and 41 seconds. Toggl's phone app has the
 * same buttons: ±5 minutes and "set start to last stop time".
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody } from "@/src/timetrack/components/EntryList"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import {
  endNow,
  endWhereNextStarts,
  entryAfter,
  entryBefore,
  shiftEdge,
  startWhereLastEnded,
} from "@/src/timetrack/timeFixService"
import { runningEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW = at(4, 12, 0)
const DAY = "2026-11-04"

/** an entry whose times carry seconds the helper cannot write */
function exact(id: string, start: string, stop: string, description: string): TimeEntry {
  return { ...entry(id, DAY, "00:00", "00:00", { description }), start, stop, duration: epochSeconds(stop) - epochSeconds(start) }
}

const find = (state: TimetrackState, id: string) => state.entries.find((e) => e.id === id)!

describe("±5 minutes", () => {
  const state = baseState({ entries: [entry("a", DAY, "09:00", "10:00")] })

  test("move the start and the end by five minutes either way", () => {
    expect(find(shiftEdge(state, "a", "start", -300, NOW).state, "a").start).toBe(at(4, 8, 55))
    expect(find(shiftEdge(state, "a", "start", 300, NOW).state, "a").start).toBe(at(4, 9, 5))
    expect(find(shiftEdge(state, "a", "stop", -300, NOW).state, "a").stop).toBe(at(4, 9, 55))
    const later = find(shiftEdge(state, "a", "stop", 300, NOW).state, "a")
    expect(later.stop).toBe(at(4, 10, 5))
    expect(later.duration).toBe(65 * 60)
  })

  test("never past the other end: a start moved after the end is refused, not turned into a moved entry", () => {
    const short = baseState({ entries: [entry("a", DAY, "09:00", "09:03")] })
    const result = shiftEdge(short, "a", "start", 300, NOW)

    expect(result.violations[0]?.message).toBe("An entry cannot end before it starts")
    expect(result.state).toBe(short)
  })

  test("a running timer's start cannot be moved past now", () => {
    const running = startTimer(baseState(), { description: "Deep work", projectId: null, taskId: null, tagIds: [], billable: false }, at(4, 11, 58)).state
    const id = runningEntry(running)!.id

    expect(shiftEdge(running, id, "start", 300, NOW).violations[0]?.message).toBe("A running timer cannot start in the future")
    expect(runningEntry(shiftEdge(running, id, "start", -300, NOW).state)!.start).toBe(at(4, 11, 53))
  })
})

describe("End now", () => {
  test("ends a finished entry now", () => {
    const state = baseState({ entries: [entry("a", DAY, "09:00", "10:00")] })
    expect(find(endNow(state, "a", NOW).state, "a").stop).toBe(NOW)
  })

  test("stops a running one now", () => {
    const running = startTimer(baseState(), { description: "Deep work", projectId: null, taskId: null, tagIds: [], billable: false }, at(4, 9, 0)).state
    const id = runningEntry(running)!.id
    const result = endNow(running, id, NOW)

    expect(runningEntry(result.state)).toBeNull()
    expect(find(result.state, id).stop).toBe(NOW)
  })
})

describe("the entries either side", () => {
  const state = baseState({
    entries: [
      exact("z", at(4, 8, 0), at(4, 8, 57, 20), "Email"),
      exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work"),
      exact("b", at(4, 10, 2, 10), at(4, 11, 0), "Call"),
      { ...exact("d", at(4, 9, 30), at(4, 9, 45), "Duration only"), duronly: true },
    ],
  })

  test("are the nearest before and after by start, never a duration-only entry", () => {
    expect(entryBefore(state, "a")?.id).toBe("z")
    expect(entryAfter(state, "a")?.id).toBe("b")
    expect(entryBefore(state, "z")).toBeNull()
    expect(entryAfter(state, "b")).toBeNull()
  })

  test("Start where the last one ended takes its end to the second", () => {
    const result = startWhereLastEnded(state, "a", NOW)
    expect(result.violations).toEqual([])
    expect(find(result.state, "a").start).toBe(at(4, 8, 57, 20))
    expect(find(result.state, "a").stop).toBe(at(4, 10, 0))
  })

  test("End where the next one starts takes its start to the second", () => {
    const result = endWhereNextStarts(state, "a", NOW)
    expect(find(result.state, "a").stop).toBe(at(4, 10, 2, 10))
  })

  test("with no entry before, there is nothing to start from, and it says so", () => {
    expect(startWhereLastEnded(state, "z", NOW).violations[0]?.message).toBe("There is no entry before this one")
    expect(endWhereNextStarts(state, "b", NOW).violations[0]?.message).toBe("There is no entry after this one")
  })

  test("a timer left running past an entry added by hand ends where that entry starts", () => {
    const running = startTimer(baseState(), { description: "Deep work", projectId: null, taskId: null, tagIds: [], billable: false }, at(4, 9, 0)).state
    const id = runningEntry(running)!.id
    const withCall = { ...running, entries: [...running.entries, exact("b", at(4, 10, 30), at(4, 11, 0), "Call")] }

    const result = endWhereNextStarts(withCall, id, NOW)

    expect(runningEntry(result.state)).toBeNull()
    expect(find(result.state, id).stop).toBe(at(4, 10, 30))
  })
})

// ---------------------------------------------------------------------------
// The buttons
// ---------------------------------------------------------------------------

function sheet(initial: TimetrackState, id: string) {
  let current = initial
  const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
    current = updater(current)
  })
  render(
    <EntryDetailModalBody
      entry={initial.entries.find((e) => e.id === id)!}
      state={initial}
      setState={setState}
      pushToast={vi.fn()}
      nowSec={epochSeconds(NOW)}
    />,
  )
  return { stored: () => find(current, id) }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("in the detail sheet", () => {
  const day = () =>
    baseState({
      entries: [exact("z", at(4, 8, 0), at(4, 8, 57, 20), "Email"), exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work"), exact("b", at(4, 10, 2, 10), at(4, 11, 0), "Call")],
    })

  test("−5 on the start is 08:55, with no time typed", () => {
    const { stored } = sheet(day(), "a")
    fireEvent.click(screen.getByRole("button", { name: "Start 5 minutes earlier" }))
    expect(stored().start).toBe(at(4, 8, 55))
  })

  test("+5 on the end is 10:05", () => {
    const { stored } = sheet(day(), "a")
    fireEvent.click(screen.getByRole("button", { name: "End 5 minutes later" }))
    expect(stored().stop).toBe(at(4, 10, 5))
  })

  test("Start where the last one ended, and End where the next one starts", () => {
    const first = sheet(day(), "a")
    fireEvent.click(screen.getByRole("button", { name: "Start where the last one ended" }))
    expect(first.stored().start).toBe(at(4, 8, 57, 20))
    cleanup()

    const second = sheet(day(), "a")
    fireEvent.click(screen.getByRole("button", { name: "End where the next one starts" }))
    expect(second.stored().stop).toBe(at(4, 10, 2, 10))
  })

  test("End now ends it now", () => {
    const { stored } = sheet(day(), "b")
    fireEvent.click(screen.getByRole("button", { name: "End now" }))
    expect(stored().stop).toBe(NOW)
  })

  test("a button with nothing to act on is not offered", () => {
    sheet(day(), "z")
    expect(screen.queryByRole("button", { name: "Start where the last one ended" })).toBeNull()
    expect(screen.getByRole("button", { name: "End where the next one starts" })).toBeInTheDocument()
  })

  test("a running entry has no end to nudge, and End now stops it", () => {
    const running = startTimer(day(), { description: "Writing", projectId: null, taskId: null, tagIds: [], billable: false }, at(4, 11, 30)).state
    const id = runningEntry(running)!.id
    const { stored } = sheet(running, id)

    expect(screen.queryByRole("button", { name: "End 5 minutes earlier" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "End now" }))
    expect(stored().stop).toBe(NOW)
  })
})
