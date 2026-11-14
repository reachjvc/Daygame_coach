// @vitest-environment jsdom
/**
 * TOUCHING NEIGHBOURS MOVE TOGETHER (design rule D12, Phase 4 item 5).
 *
 * The owner tracks back to back: one entry stops and the next starts seconds
 * later. So when he fixes one end of an entry by hand, the entry on the other
 * side of that end was almost always meant to move with it — and it did not,
 * which is where the gaps and overlaps in his own records came from. Now an
 * end that touched the next entry's start (within 60 seconds) takes that start
 * along, and a start takes the previous entry's end, with a one-tap way back:
 * "Keep ‘B’ as it was".
 *
 * The eleven cases are the plan's own (DECISIONS, Q3), in its order. Then the
 * three places it happens: the sheet, the list row and the calendar's resize.
 *
 * CHANGED ON PURPOSE 2026-11-14 (D3 in Plans/time-log-phone.md): an edge
 * pulled AWAY from its neighbour now leaves a gap; the owner found shortening
 * one entry silently stretched the next. Only an edge pushed INTO the
 * neighbour moves it, with the way back. The cases that pulled away now say
 * the neighbour stays, and each has a pushed-in twin that still moves it.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { shiftEntryBy } from "@/src/timetrack/calendarService"
import { CalendarView } from "@/src/timetrack/components/CalendarView"
import { EntryDetailModalBody, EntryList } from "@/src/timetrack/components/EntryList"
import { diffRows } from "@/src/timetrack/syncService"
import { jointsOf, keepNeighbour, withNeighbours } from "@/src/timetrack/timeFixService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { entrySeconds, liveEntries, runningEntry, setEntryStart, startTimer, updateEntry } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

// jsdom has no layout; the calendar's segmented control scrolls its choice into view
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW = at(4, 16, 0)

function exact(id: string, start: string, stop: string, description: string, extra: Partial<TimeEntry> = {}): TimeEntry {
  return { ...entry(id, "2026-11-04", "00:00", "00:00", { description }), start, stop, duration: epochSeconds(stop) - epochSeconds(start), ...extra }
}

const find = (state: TimetrackState, id: string) => state.entries.find((e) => e.id === id)!

const endTo = (state: TimetrackState, id: string, stop: string, now = NOW) =>
  withNeighbours(state, id, now, (base) => updateEntry(base, id, { stop }, now))
const startTo = (state: TimetrackState, id: string, start: string, now = NOW) =>
  withNeighbours(state, id, now, (base) => setEntryStart(base, id, start, now))

/** Deep work 09:00–14:30, then Email from 14:30 */
const forgotToSwitch = () =>
  baseState({ entries: [exact("a", at(4, 9, 0), at(4, 14, 30), "Deep work"), exact("b", at(4, 14, 30), at(4, 15, 0), "Email")] })

describe("the eleven cases (Q3)", () => {
  test("1. A's end pulled back to 11:55 leaves a gap: B stays where it started (D3)", () => {
    const result = endTo(forgotToSwitch(), "a", at(4, 11, 55))

    expect(result.violations).toEqual([])
    expect(find(result.state, "a").stop).toBe(at(4, 11, 55))
    expect(find(result.state, "b").start).toBe(at(4, 14, 30))
    expect(find(result.state, "b").duration).toBe(30 * 60)
    expect(result.moved).toEqual([])
  })

  test("1b. A's end pushed into B, to 14:45, takes B's start to 14:45", () => {
    const result = endTo(forgotToSwitch(), "a", at(4, 14, 45))

    expect(result.violations).toEqual([])
    expect(find(result.state, "a").stop).toBe(at(4, 14, 45))
    expect(find(result.state, "b").start).toBe(at(4, 14, 45))
    expect(result.moved).toEqual([{ entryId: "b", description: "Email", edge: "start", from: at(4, 14, 30), to: at(4, 14, 45) }])
  })

  test("1c. a start pulled away from the entry before leaves a gap too (D3)", () => {
    const state = baseState({ entries: [exact("z", at(4, 8, 0), at(4, 9, 0), "Email"), exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work")] })
    const result = startTo(state, "a", at(4, 9, 20))

    expect(find(result.state, "a").start).toBe(at(4, 9, 20))
    expect(find(result.state, "z").stop).toBe(at(4, 9, 0))
    expect(result.moved).toEqual([])
  })

  test("2. a lunch gap: entries that did not touch stay apart", () => {
    const state = baseState({ entries: [exact("a", at(4, 9, 0), at(4, 12, 0), "Deep work"), exact("b", at(4, 12, 30), at(4, 13, 0), "Email")] })
    const result = endTo(state, "a", at(4, 12, 10))

    expect(find(result.state, "b").start).toBe(at(4, 12, 30))
    expect(result.moved).toEqual([])
  })

  test("3. A ran ten minutes longer: B starts ten minutes later instead of overlapping", () => {
    const state = baseState({ entries: [exact("a", at(4, 9, 0), at(4, 11, 0), "Deep work"), exact("b", at(4, 11, 0), at(4, 12, 0), "Email")] })
    const result = endTo(state, "a", at(4, 11, 10))

    expect(find(result.state, "b").start).toBe(at(4, 11, 10))
    expect(jointsOf(liveEntries(result.state), NOW)).toEqual([])
  })

  test("4. never shrinks B to nothing: B stays, and the overlap is marked for a Fix", () => {
    const state = baseState({
      entries: [exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work"), exact("b", at(4, 10, 0), at(4, 10, 5), "Slip"), exact("c", at(4, 10, 5), at(4, 11, 0), "Email")],
    })
    const past = endTo(state, "a", at(4, 10, 10))

    expect(find(past.state, "a").stop, "A keeps the change you made").toBe(at(4, 10, 10))
    expect(find(past.state, "b").start).toBe(at(4, 10, 0))
    expect(past.moved).toEqual([])
    expect(past.held.map((h) => h.entryId)).toEqual(["b"])
    expect(jointsOf(liveEntries(past.state), NOW).some((j) => j.kind === "overlap" && j.earlierId === "a" && j.laterId === "b")).toBe(true)

    // under a minute is not kept either
    const almost = endTo(state, "a", at(4, 10, 4, 30))
    expect(find(almost.state, "b").start).toBe(at(4, 10, 0))
    expect(almost.held.map((h) => h.entryId)).toEqual(["b"])
  })

  test("5. B is running: pushed into, its start moves and it keeps running, twenty minutes long by now", () => {
    const finished = baseState({ entries: [exact("a", at(4, 9, 0), at(4, 14, 30), "Deep work")] })
    const running = startTimer(finished, { description: "Email", projectId: null, taskId: null, tagIds: [], billable: false }, at(4, 14, 30)).state
    const now = at(4, 15, 0)

    const result = endTo(running, "a", at(4, 14, 40), now)

    const email = runningEntry(result.state)!
    expect(email.start).toBe(at(4, 14, 40))
    expect(entrySeconds(email, epochSeconds(now))).toBe(20 * 60)

    // pulled away, the running one keeps its start (D3)
    expect(runningEntry(endTo(running, "a", at(4, 11, 55), now).state)!.start).toBe(at(4, 14, 30))
  })

  test("6. A's start moved earlier takes the end of Z, before it", () => {
    const state = baseState({ entries: [exact("z", at(4, 8, 0), at(4, 9, 0), "Email"), exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work")] })
    const result = startTo(state, "a", at(4, 8, 30))

    expect(find(result.state, "a").start).toBe(at(4, 8, 30))
    expect(find(result.state, "z").stop).toBe(at(4, 8, 30))
    expect(result.moved).toEqual([{ entryId: "z", description: "Email", edge: "stop", from: at(4, 9, 0), to: at(4, 8, 30) }])
  })

  test("7. moving a whole block is a different intent: neighbours stay where they are", () => {
    const state = forgotToSwitch()
    const a = find(state, "a")
    const moved = withNeighbours(state, "a", NOW, (base) => updateEntry(base, "a", shiftEntryBy(a, -30), NOW))

    expect(find(moved.state, "a").start).toBe(at(4, 8, 30))
    expect(find(moved.state, "b").start).toBe(at(4, 14, 30))
    expect(moved.moved).toEqual([])
  })

  test("8. two devices: stopped at 17:05:12 on the phone and started at 17:05:40 on the PC still touch", () => {
    const now = at(4, 18, 0)
    const state = baseState({ entries: [exact("a", at(4, 16, 0), at(4, 17, 5, 12), "Gym"), exact("b", at(4, 17, 5, 40), at(4, 17, 30), "Shower")] })
    expect(find(endTo(state, "a", at(4, 17, 10), now).state, "b").start).toBe(at(4, 17, 10))

    const apart = baseState({ entries: [exact("a", at(4, 16, 0), at(4, 17, 5, 12), "Gym"), exact("b", at(4, 17, 6, 13), at(4, 17, 30), "Shower")] })
    expect(find(endTo(apart, "a", at(4, 17, 6, 0), now).state, "b").start, "61 seconds apart is not touching").toBe(at(4, 17, 6, 13))
  })

  test("9. never across midnight, and never for a duration-only entry", () => {
    const midnight = baseState({
      entries: [exact("a", at(4, 23, 0), at(4, 23, 59, 30), "Reading"), exact("b", at(5, 0, 0), at(5, 1, 0), "Sleep")],
    })
    expect(find(endTo(midnight, "a", at(4, 23, 30), at(5, 9, 0)).state, "b").start).toBe(at(5, 0, 0))

    const quiet = forgotToSwitch()
    const durationOnly = { ...quiet, entries: quiet.entries.map((e) => (e.id === "b" ? { ...e, duronly: true } : e)) }
    expect(find(endTo(durationOnly, "a", at(4, 11, 55)).state, "b").start).toBe(at(4, 14, 30))
    const editedIsDurationOnly = { ...quiet, entries: quiet.entries.map((e) => (e.id === "a" ? { ...e, duronly: true } : e)) }
    expect(find(endTo(editedIsDurationOnly, "a", at(4, 11, 55)).state, "b").start).toBe(at(4, 14, 30))
  })

  test("10. Keep ‘B’ as it was puts B back and leaves A's change alone", () => {
    const result = endTo(forgotToSwitch(), "a", at(4, 14, 45))
    const kept = keepNeighbour(result.state, result.moved[0], NOW)

    expect(kept.violations).toEqual([])
    expect(find(kept.state, "b").start).toBe(at(4, 14, 30))
    expect(find(kept.state, "a").stop).toBe(at(4, 14, 45))
  })

  test("11. both rows go out as changes, each under its own version check", () => {
    const before = forgotToSwitch()
    const after = endTo(before, "a", at(4, 14, 45)).state

    const diff = diffRows(stateToRows(before, "user-1"), stateToRows(after, "user-1"), NOW)

    expect((diff.changed.timetrack_entries ?? []).map((row) => row.id).sort()).toEqual(["a", "b"])
  })

  test("a refused edit moves nobody", () => {
    const state = forgotToSwitch()
    const refused = endTo(state, "a", at(4, 8, 0))

    expect(refused.violations).not.toEqual([])
    expect(refused.state).toBe(state)
    expect(refused.moved).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Where it happens
// ---------------------------------------------------------------------------

function holder(initial: TimetrackState) {
  let current = initial
  const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
    current = updater(current)
  })
  return { setState, stored: (id: string) => find(current, id) }
}

function typeInto(input: HTMLElement, text: string) {
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: text } })
  fireEvent.blur(input)
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
  test("an end typed as 14:45 takes Email's start along, and says so with the way back", () => {
    const initial = forgotToSwitch()
    const { setState, stored } = holder(initial)
    const pushToast = vi.fn()
    const view = render(
      <EntryDetailModalBody entry={find(initial, "a")} state={initial} setState={setState} pushToast={pushToast} nowSec={epochSeconds(NOW)} />,
    )

    typeInto(view.container.querySelector('input[aria-label="End time"]')!, "1445")

    expect(stored("b").start).toBe(at(4, 14, 45))
    expect(pushToast).toHaveBeenCalledWith("Also moved ‘Email’ to start 14:45", "info", expect.any(Function), "Keep ‘Email’ as it was")
    const keep = pushToast.mock.calls.find((call) => String(call[0]).startsWith("Also moved"))![2] as () => void
    keep()
    expect(stored("b").start).toBe(at(4, 14, 30))
    expect(stored("a").stop).toBe(at(4, 14, 45))
  })

  test("a neighbour that would shrink under a minute is left, and the toast says where to fix it", () => {
    const initial = baseState({ entries: [exact("a", at(4, 9, 0), at(4, 10, 0), "Deep work"), exact("b", at(4, 10, 0), at(4, 10, 5), "Slip")] })
    const { setState, stored } = holder(initial)
    const pushToast = vi.fn()
    const view = render(
      <EntryDetailModalBody entry={find(initial, "a")} state={initial} setState={setState} pushToast={pushToast} nowSec={epochSeconds(NOW)} />,
    )

    typeInto(view.container.querySelector('input[aria-label="End time"]')!, "1010")

    expect(stored("b").start).toBe(at(4, 10, 0))
    expect(pushToast).toHaveBeenCalledWith("Left ‘Slip’ as it was: it would have been under a minute. The overlap is marked in the list.", "info")
  })

  test("the one-tap +5 on an end is an end edit too, and −5 leaves a gap (D3)", () => {
    const initial = forgotToSwitch()
    const { setState, stored } = holder(initial)
    const view = render(<EntryDetailModalBody entry={find(initial, "a")} state={initial} setState={setState} pushToast={vi.fn()} nowSec={epochSeconds(NOW)} />)

    fireEvent.click(screen.getByRole("button", { name: "End 5 minutes later" }))

    expect(stored("a").stop).toBe(at(4, 14, 35))
    expect(stored("b").start).toBe(at(4, 14, 35))

    view.unmount()
    const again = holder(initial)
    render(<EntryDetailModalBody entry={find(initial, "a")} state={initial} setState={again.setState} pushToast={vi.fn()} nowSec={epochSeconds(NOW)} />)
    fireEvent.click(screen.getByRole("button", { name: "End 5 minutes earlier" }))
    expect(again.stored("a").stop).toBe(at(4, 14, 25))
    expect(again.stored("b").start).toBe(at(4, 14, 30))
  })
})

describe("in the list", () => {
  test("an end typed into the row takes the next entry's start along", () => {
    const initial = forgotToSwitch()
    const { setState, stored } = holder(initial)
    const pushToast = vi.fn()
    render(<EntryList state={initial} setState={setState} nowSec={epochSeconds(NOW)} pushToast={pushToast} onEditEntry={() => {}} />)

    const end = screen.getAllByLabelText("End time").find((input) => (input as HTMLInputElement).value === "14:30")!
    typeInto(end, "1445")

    expect(stored("a").stop).toBe(at(4, 14, 45))
    expect(stored("b").start).toBe(at(4, 14, 45))
    expect(pushToast).toHaveBeenCalledWith("Also moved ‘Email’ to start 14:45", "info", expect.any(Function), "Keep ‘Email’ as it was")
  })
})

describe("in the calendar", () => {
  const minuteHeight = 56 / 60
  // the calendar listens to pointer events (D13), which a browser sends before the mouse events
  const mouse = { pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0 }

  function calendar(initial: TimetrackState) {
    const { setState, stored } = holder(initial)
    const pushToast = vi.fn()
    const view = render(
      <CalendarView state={initial} setState={setState} nowSec={epochSeconds(NOW)} pushToast={pushToast} onEditEntry={() => {}} onOpenIntegrations={() => {}} />,
    )
    const block = [...view.container.querySelectorAll<HTMLElement>("[data-block]")].find((el) => el.title.startsWith("Deep work"))!
    const column = block.closest<HTMLElement>("[data-day-column]")!
    return { block, column, stored, pushToast }
  }

  test("dragging Deep work's bottom edge down to 14:45 takes Email's start along", () => {
    const { block, column, stored, pushToast } = calendar(forgotToSwitch())

    // the bottom 8px of a 330-minute block is the resize handle; 15 min down takes 14:30 to 14:45
    fireEvent.pointerDown(block, { ...mouse, clientY: 305 })
    fireEvent.pointerMove(column, { ...mouse, clientY: 305 + 15 * minuteHeight })
    fireEvent.pointerUp(column, { ...mouse, clientY: 305 + 15 * minuteHeight })

    expect(stored("a").stop).toBe(at(4, 14, 45))
    expect(stored("b").start).toBe(at(4, 14, 45))
    expect(pushToast).toHaveBeenCalledWith("Also moved ‘Email’ to start 14:45", "info", expect.any(Function), "Keep ‘Email’ as it was")
  })

  test("dragging Deep work's bottom edge up to 11:55 leaves Email where it was (D3)", () => {
    const { block, column, stored } = calendar(forgotToSwitch())

    fireEvent.pointerDown(block, { ...mouse, clientY: 305 })
    fireEvent.pointerMove(column, { ...mouse, clientY: 305 - 155 * minuteHeight })
    fireEvent.pointerUp(column, { ...mouse, clientY: 305 - 155 * minuteHeight })

    expect(stored("a").stop).toBe(at(4, 11, 55))
    expect(stored("b").start).toBe(at(4, 14, 30))
  })

  test("dragging the whole block moves it alone", () => {
    const { block, column, stored } = calendar(forgotToSwitch())

    fireEvent.pointerDown(block, { ...mouse, clientY: 100 })
    fireEvent.pointerMove(column, { ...mouse, clientY: 135 * minuteHeight })
    fireEvent.pointerUp(column, { ...mouse, clientY: 135 * minuteHeight })

    expect(stored("a").start).toBe(at(4, 9, 30))
    expect(stored("b").start).toBe(at(4, 14, 30))
  })
})
