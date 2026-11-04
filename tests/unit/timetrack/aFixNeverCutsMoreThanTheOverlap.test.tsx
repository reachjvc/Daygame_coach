// @vitest-environment jsdom
/**
 * FIX NEVER CUTS MORE THAN THE OVERLAP, AND NEVER STOPS A RUNNING TIMER.
 *
 * Fix on an overlap ends the earlier entry where the later one starts (Phase 4,
 * item 6). That removes exactly the overlap when the later entry runs on past
 * the earlier one's end — the 33-second and 4-minute overlaps hand fixes leave.
 * It removes far more when the later entry sits INSIDE the earlier one:
 *   - a timer running since 10:00, and a call added by hand for 10:30–10:45:
 *     the mark read "Overlap of 15 minutes · Fix", and Fix stopped the timer at
 *     10:30 and threw away everything from 10:45 to now;
 *   - a finished 10:00–12:00, with the same call inside it: Fix cut 1:30 to
 *     remove 15 minutes of overlap.
 * Found by the code review of 2026-11-04. Now the mark says plainly what is
 * wrong there and offers no one-tap that destroys time; Fix stays where it
 * removes only the overlap.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import { jointsOf, mendJoint } from "@/src/timetrack/timeFixService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { createManualEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW = at(4, 11, 0)

const draft = (description: string): EntryDraft => ({ description, projectId: null, taskId: null, tagIds: [], billable: false })

function exact(id: string, start: string, stop: string, description: string): TimeEntry {
  return { ...entry(id, "2026-11-04", "00:00", "00:00", { description }), start, stop, duration: epochSeconds(stop) - epochSeconds(start) }
}

const find = (state: TimetrackState, id: string) => state.entries.find((e) => e.id === id)!

/** "Deep work" running since 10:00, and "Call" added by hand for 10:30–10:45 */
function callDuringATimer(): { state: TimetrackState; runningId: string; callId: string } {
  const running = startTimer(baseState(), draft("Deep work"), at(4, 10, 0))
  const added = createManualEntry(running.state, { draft: draft("Call"), start: at(4, 10, 30), stop: at(4, 10, 45) }, NOW)
  if (added.violations.length > 0 || !added.entry) throw new Error("could not add the call")
  return { state: added.state, runningId: running.entry.id, callId: added.entry.id }
}

/** "Deep work" 10:00–12:00, finished, with "Call" 10:30–10:45 inside it */
const callInsideAFinishedEntry = () =>
  baseState({ entries: [exact("a", at(4, 10, 0), at(4, 12, 0), "Deep work"), exact("b", at(4, 10, 30), at(4, 10, 45), "Call")] })

describe("what Fix may do", () => {
  test("on a call inside a running timer, Fix is refused with words and the timer keeps running", () => {
    const { state, runningId } = callDuringATimer()
    const [joint] = jointsOf(state.entries, NOW)
    expect(joint).toMatchObject({ kind: "overlap", earlierId: runningId, seconds: 15 * 60 })

    const result = mendJoint(state, joint, NOW)

    expect(result.violations[0]?.message, "Fix stopped the running timer").toMatch(/inside/)
    expect(find(result.state, runningId).stop).toBeNull()
  })

  test("on a call inside a finished 10:00–12:00, Fix is refused: it would cut 1:30 to remove 15 minutes", () => {
    const state = callInsideAFinishedEntry()
    const [joint] = jointsOf(state.entries, NOW)
    expect(joint).toMatchObject({ kind: "overlap", earlierId: "a", laterId: "b", seconds: 15 * 60 })

    const result = mendJoint(state, joint, NOW)

    expect(result.violations[0]?.message, "Fix cut the earlier entry to 10:30").toMatch(/inside/)
    expect(find(result.state, "a").stop).toBe(at(4, 12, 0))
  })

  test("a later entry that ends exactly where the earlier ends is still fixed: that is only the overlap", () => {
    const state = baseState({ entries: [exact("a", at(4, 9, 0), at(4, 10, 30), "Deep work"), exact("b", at(4, 10, 15), at(4, 10, 30), "Email")] })
    const result = mendJoint(state, jointsOf(state.entries, NOW)[0], NOW)

    expect(result.violations).toEqual([])
    expect(find(result.state, "a").stop).toBe(at(4, 10, 15))
  })

  test("an earlier entry still running is never ended by Fix, even when the later one runs past now", () => {
    const running = startTimer(baseState(), draft("Deep work"), at(4, 10, 0))
    const added = createManualEntry(running.state, { draft: draft("Planned call"), start: at(4, 10, 50), stop: at(4, 11, 30) }, NOW)
    const [joint] = jointsOf(added.state.entries, NOW)

    const result = mendJoint(added.state, joint, NOW)

    expect(result.violations[0]?.message).toMatch(/still running/)
    expect(find(result.state, running.entry.id).stop).toBeNull()
  })
})

describe("the mark in the list", () => {
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
    render(<EntryList state={initial} setState={setState} nowSec={epochSeconds(NOW)} pushToast={vi.fn()} onEditEntry={() => {}} />)
    return { stored: (id: string) => find(current, id), setState }
  }

  test("a call inside a running timer is named as inside it, with no Fix to tap", () => {
    const { state } = callDuringATimer()
    const { setState } = list(state)

    expect(screen.getByText("Overlap of 15 minutes · “Call” is inside “Deep work”")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Fix/ }), "Fix is offered and would stop the timer").toBeNull()
    expect(setState).not.toHaveBeenCalled()
  })

  test("a call inside a finished entry is named as inside it, with no Fix to tap", () => {
    list(callInsideAFinishedEntry())

    expect(screen.getByText("Overlap of 15 minutes · “Call” is inside “Deep work”")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Fix/ }), "Fix is offered and would cut 1:30").toBeNull()
  })

  test("an overlap at the edge keeps its Fix", () => {
    const { stored } = list(
      baseState({ entries: [exact("a", at(4, 9, 0), at(4, 10, 3, 49), "Deep work"), exact("b", at(4, 10, 0), at(4, 10, 45), "Email")] }),
    )

    fireEvent.click(screen.getByRole("button", { name: "Fix: end “Deep work” at 10:00" }))
    expect(stored("a").stop).toBe(at(4, 10, 0))
  })
})
