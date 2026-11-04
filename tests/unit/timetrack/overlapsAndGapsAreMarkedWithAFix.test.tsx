// @vitest-environment jsdom
/**
 * OVERLAPS AND SMALL GAPS ARE MARKED IN THE LIST, EACH WITH ITS FIX (Phase 4, item 6).
 *
 * The owner's own records for 2 and 3 November held two gaps (1 min 29 s and
 * 1 min 6 s) and three overlaps (41 s, 33 s and 3 min 49 s), every one left by
 * a hand fix, and none of them visible anywhere: an overlap counts twice in a
 * day's total and looks like nothing in the list. Now the list draws a thin
 * mark between the two entries — red for an overlap, with "Fix", which ends
 * the earlier where the later starts; quiet for a gap under five minutes, with
 * "Close gap", which starts the later where the earlier ended.
 *
 * Under a minute apart counts as touching (D12), so that is not a gap: a
 * Stop and a Start a few seconds apart is how back-to-back tracking looks.
 * Five minutes or more is a break, not a slip.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import { jointsOf, mendJoint } from "@/src/timetrack/timeFixService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW = at(4, 16, 0)

function exact(id: string, start: string, stop: string, description: string, extra: Partial<TimeEntry> = {}): TimeEntry {
  return { ...entry(id, "2026-11-04", "00:00", "00:00", { description }), start, stop, duration: epochSeconds(stop) - epochSeconds(start), ...extra }
}

const find = (state: TimetrackState, id: string) => state.entries.find((e) => e.id === id)!

describe("which joints are marked", () => {
  test("an overlap, of any length, between neighbours in time", () => {
    const entries = [exact("a", at(4, 9, 0), at(4, 10, 3, 49), "Deep work"), exact("b", at(4, 10, 0), at(4, 11, 0), "Email")]
    expect(jointsOf(entries, NOW)).toEqual([{ kind: "overlap", earlierId: "a", laterId: "b", seconds: 229 }])

    const tiny = [exact("a", at(4, 9, 0), at(4, 10, 0, 33), "Deep work"), exact("b", at(4, 10, 0), at(4, 11, 0), "Email")]
    expect(jointsOf(tiny, NOW)).toEqual([{ kind: "overlap", earlierId: "a", laterId: "b", seconds: 33 }])
  })

  test("a gap of a minute up to five", () => {
    const entries = [exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work"), exact("b", at(4, 10, 1, 29), at(4, 11, 0), "Email")]
    expect(jointsOf(entries, NOW)).toEqual([{ kind: "gap", earlierId: "a", laterId: "b", seconds: 89 }])
  })

  test("not a gap under a minute, which is touching, nor five minutes or more, which is a break", () => {
    const touching = [exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work"), exact("b", at(4, 10, 0, 40), at(4, 11, 0), "Email")]
    const lunch = [exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work"), exact("b", at(4, 10, 5), at(4, 11, 0), "Email")]
    const exactTouch = [exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work"), exact("b", at(4, 10, 0), at(4, 11, 0), "Email")]
    expect(jointsOf(touching, NOW)).toEqual([])
    expect(jointsOf(lunch, NOW)).toEqual([])
    expect(jointsOf(exactTouch, NOW)).toEqual([])
  })

  /**
   * Changed on 2026-11-04 (code review): "never across days" left sleep to
   * 07:00:40 and an entry from 07:00 counting 40 seconds twice, unmarked. A
   * day's first entry is now compared with what ran into it from before
   * midnight (`anOverlapAfterMidnightIsMarked`).
   */
  test("across midnight too, and never a duration-only entry", () => {
    const night = [exact("a", at(3, 22, 0), at(4, 0, 2), "Reading"), exact("b", at(4, 0, 0), at(4, 1, 0), "Sleep")]
    expect(jointsOf(night, NOW)).toEqual([{ kind: "overlap", earlierId: "a", laterId: "b", seconds: 120 }])
    const durationOnly = [exact("a", at(4, 9, 0), at(4, 10, 3), "Deep work", { duronly: true }), exact("b", at(4, 10, 0), at(4, 11, 0), "Email")]
    expect(jointsOf(durationOnly, NOW)).toEqual([])
  })

  test("a running entry that began inside the one before overlaps it", () => {
    const finished = baseState({ entries: [exact("a", at(4, 9, 0), at(4, 15, 0), "Deep work")] })
    const running = startTimer(finished, { description: "Email", projectId: null, taskId: null, tagIds: [], billable: false }, at(4, 14, 58)).state
    const [joint] = jointsOf(running.entries, NOW)
    expect(joint).toMatchObject({ kind: "overlap", earlierId: "a", seconds: 120 })
  })
})

describe("the fixes", () => {
  test("Fix ends the earlier one where the later starts", () => {
    const state = baseState({ entries: [exact("a", at(4, 9, 0), at(4, 10, 3, 49), "Deep work"), exact("b", at(4, 10, 0), at(4, 11, 0), "Email")] })
    const result = mendJoint(state, jointsOf(state.entries, NOW)[0], NOW)

    expect(result.violations).toEqual([])
    expect(find(result.state, "a").stop).toBe(at(4, 10, 0))
    expect(find(result.state, "b").start).toBe(at(4, 10, 0))
    expect(jointsOf(result.state.entries, NOW)).toEqual([])
  })

  test("Close gap starts the later one where the earlier ended, seconds and all", () => {
    const state = baseState({ entries: [exact("a", at(4, 9, 0), at(4, 10, 0, 12), "Deep work"), exact("b", at(4, 10, 1, 41), at(4, 11, 0), "Email")] })
    const result = mendJoint(state, jointsOf(state.entries, NOW)[0], NOW)

    expect(find(result.state, "b").start).toBe(at(4, 10, 0, 12))
    expect(find(result.state, "a").stop).toBe(at(4, 10, 0, 12))
  })
})

describe("in the list", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(NOW))
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  function list(initial: TimetrackState) {
    let current = initial
    const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
      current = updater(current)
    })
    const pushToast = vi.fn()
    render(<EntryList state={initial} setState={setState} nowSec={epochSeconds(NOW)} pushToast={pushToast} onEditEntry={() => {}} />)
    return { stored: (id: string) => find(current, id), pushToast }
  }

  test("an overlap is marked between the two rows, and Fix ends the earlier where the later starts", () => {
    const { stored, pushToast } = list(
      baseState({ entries: [exact("a", at(4, 9, 0), at(4, 10, 3, 49), "Deep work"), exact("b", at(4, 10, 0), at(4, 11, 0), "Email")] }),
    )

    expect(screen.getByText("Overlap of 4 minutes")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Fix: end “Deep work” at 10:00" }))

    expect(stored("a").stop).toBe(at(4, 10, 0))
    expect(pushToast).toHaveBeenCalledWith("Ended “Deep work” at 10:00, where “Email” starts", "info", expect.any(Function))
    act(() => (pushToast.mock.calls.at(-1)![2] as () => void)())
    expect(stored("a").stop, "Undo did not put the end back").toBe(at(4, 10, 3, 49))
  })

  test("a small gap is marked, and Close gap starts the later where the earlier ended", () => {
    const { stored } = list(
      baseState({ entries: [exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work"), exact("b", at(4, 10, 1, 29), at(4, 11, 0), "Email")] }),
    )

    expect(screen.getByText("Gap of 1 minute")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Close gap: start “Email” at 10:00" }))

    expect(stored("b").start).toBe(at(4, 10, 0))
  })

  test("entries that touch are not marked at all", () => {
    list(baseState({ entries: [exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work"), exact("b", at(4, 10, 0), at(4, 11, 0), "Email")] }))
    expect(screen.queryByText(/^Overlap of|^Gap of/)).toBeNull()
  })
})
