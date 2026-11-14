// @vitest-environment jsdom
/**
 * THE CALENDAR FOLLOWS A FINGER (Plans/time-tracker-like-toggl.md, Phase 6).
 *
 * On the phone the calendar was look-only: every drag was switched off below
 * 640 px ("Use the timer to start new entries"), so planning "Gym tomorrow
 * 10:00–11:30" (scenario S6) meant typing it into the sheet. Now one pointer
 * code path serves mouse, touch and pen (D13):
 *
 *   - a finger held still for 400 ms on empty space starts a block, and the
 *     drag sets its length; held on a block, it moves it, or by its top or
 *     bottom edge, resizes it;
 *   - until the hold has taken, the finger belongs to the page: a flick up or
 *     down scrolls and creates nothing, a flick sideways turns the day;
 *   - every 5-minute step ticks the vibration on Android;
 *   - a block that is planned (starts after now, Q2) stays striped while it is
 *     drawn and dragged;
 *   - and a block can be reached with Tab, is named "Gym, 10:00 to 11:30",
 *     and opens with Enter.
 *
 * jsdom lays nothing out. Each block reports the box its own style draws, in
 * a day column whose top is 0, so the calendar's own arithmetic runs; the
 * hold is the real 400 ms timer, on a fake clock.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { LONG_PRESS_MS } from "@/src/timetrack/calendarService"
import { CalendarView } from "@/src/timetrack/components/CalendarView"
import { CALENDAR_ZOOMS } from "@/src/timetrack/config"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW = at(4, 15, 0)
const NOW_SEC = epochSeconds(NOW)
/** A phone opens the calendar one zoom step taller */
const HOUR_PX = CALENDAR_ZOOMS.find((z) => z.id === "comfortable")!.hourHeight
const MINUTE_PX = HOUR_PX / 60
const y = (h: number, m = 0) => (h * 60 + m) * MINUTE_PX

let vibrate: ReturnType<typeof vi.fn>
let released: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] })
  vi.setSystemTime(new Date(NOW))
  // a phone-wide window: the calendar opens on one day
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  Element.prototype.scrollIntoView = vi.fn()
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const el = this as HTMLElement
    const top = el.hasAttribute("data-block") ? parseFloat(el.style.top) || 0 : 0
    const height = parseFloat(el.style.height) || 0
    return { top, bottom: top + height, height, left: 0, right: 300, width: 300, x: 0, y: top, toJSON: () => ({}) } as DOMRect
  })
  vibrate = vi.fn(() => true)
  Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate })
  // pointer capture as a browser keeps it: one element per pointer, until let go
  const captured = new Map<number, Element>()
  released = vi.fn(function (this: Element, id: number) {
    if (captured.get(id) === this) captured.delete(id)
  })
  Element.prototype.setPointerCapture = vi.fn(function (this: Element, id: number) {
    captured.set(id, this)
  })
  Element.prototype.releasePointerCapture = released as unknown as Element["releasePointerCapture"]
  Element.prototype.hasPointerCapture = vi.fn(function (this: Element, id: number) {
    return captured.get(id) === this
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  delete (navigator as unknown as Record<string, unknown>).vibrate
  delete (window as unknown as Record<string, unknown>).matchMedia
  vi.useRealTimers()
})

function exact(id: string, start: string, stop: string | null, description: string): TimeEntry {
  const made = entry(id, "2026-11-04", "00:00", "00:01", { description })
  return { ...made, start, stop, duration: stop ? epochSeconds(stop) - epochSeconds(start) : -epochSeconds(start) }
}

/**
 * The calendar with its state held the way the tracker holds it, so a write
 * re-renders it: the day's total and the block's new place are read off the
 * screen, not off the state handed in.
 */
function calendar(initial: TimetrackState) {
  let current = initial
  const setState = vi.fn()
  const onEditEntry = vi.fn()
  const pushToast = vi.fn()
  function Tracker() {
    const [state, set] = useState(initial)
    const write = (updater: (s: TimetrackState) => TimetrackState) => {
      setState(updater)
      current = updater(current)
      set(current)
    }
    return <CalendarView state={state} setState={write} nowSec={NOW_SEC} pushToast={pushToast} onEditEntry={onEditEntry} onOpenIntegrations={vi.fn()} />
  }
  const view = render(<Tracker />)
  const column = () => view.container.querySelector<HTMLElement>("[data-day-column]")!
  const block = (description: string) => {
    const found = [...view.container.querySelectorAll<HTMLElement>("[data-block]")].find((el) => el.title.startsWith(`${description} `))
    expect(found, `no "${description}" block on the calendar`).toBeTruthy()
    return { el: found!, top: parseFloat(found!.style.top), height: parseFloat(found!.style.height) }
  }
  const touch = { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 150 }
  const finger = {
    down: (el: HTMLElement, clientY: number, clientX = 150) => fireEvent.pointerDown(el, { ...touch, clientX, clientY, button: 0, buttons: 1 }),
    hold: (ms = LONG_PRESS_MS) => act(() => vi.advanceTimersByTime(ms)),
    move: (clientY: number, clientX = 150) => fireEvent.pointerMove(column(), { ...touch, clientX, clientY, buttons: 1 }),
    /** in steps, as a real finger reports */
    slide: (fromY: number, toY: number, steps = 12) => {
      for (let i = 1; i <= steps; i++) finger.move(fromY + ((toY - fromY) * i) / steps)
    },
    up: (clientY: number, clientX = 150) => {
      fireEvent.pointerUp(column(), { ...touch, clientX, clientY })
    },
    /** what the browser sends when it takes the finger for a scroll */
    cancel: () => fireEvent.pointerCancel(column(), { ...touch }),
  }
  /** The day header's two lines: the day, and what it has tracked */
  const header = () => [...view.container.querySelector("[data-day-column]")!.closest(".rounded-lg")!.querySelectorAll("p")].slice(0, 2)
  const heading = () => header()[0].textContent
  const dayTotal = () => header()[1].textContent
  return { view, column, block, finger, heading, dayTotal, onEditEntry, pushToast, setState, latest: () => current }
}

const live = (state: TimetrackState) => state.entries.filter((e) => !e.serverDeletedAt)

describe("a finger held on empty space", () => {
  test("plans Gym tomorrow 10:00–11:30: striped while drawn, planned once dropped, out of the day's total", () => {
    const view = calendar(baseState({ entries: [] }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(view.heading()).toBe("Thu, 5 Nov")

    view.finger.down(view.column(), y(10, 1))
    view.finger.hold()
    view.finger.slide(y(10, 1), y(11, 31), 18)

    const preview = view.view.container.querySelector<HTMLElement>("[data-preview]")
    expect(preview, "nothing is drawn under the finger").toBeTruthy()
    expect(preview!.style.backgroundImage, "a planned block lost its stripes while drawn").toContain("repeating-linear-gradient")

    view.finger.up(y(11, 31))

    const made = live(view.latest())
    expect(made).toHaveLength(1)
    expect(made[0].start).toBe(at(5, 10, 0))
    expect(made[0].stop).toBe(at(5, 11, 30))
    // drawn striped where it was dropped, and its day says it has tracked nothing yet
    expect(view.block("(no description)").el.style.backgroundImage).toContain("repeating-linear-gradient")
    expect(view.dayTotal()).toBe("0:00")
    // one tick when the hold took, and one per 5-minute step after it
    expect(vibrate).toHaveBeenCalledWith(5)
    expect(vibrate.mock.calls.length).toBe(1 + 18)
    expect(released, "the finger was never let go").toHaveBeenCalledWith(7)
  })

  test("a block made later today is planned, and today's total stays what was tracked", () => {
    const view = calendar(baseState({ entries: [exact("done", at(4, 9, 0), at(4, 10, 0), "Deep work")] }))
    expect(view.dayTotal()).toBe("1:00")

    view.finger.down(view.column(), y(17))
    view.finger.hold()
    view.finger.slide(y(17), y(18), 12)
    view.finger.up(y(18))

    expect(live(view.latest())).toHaveLength(2)
    expect(view.block("(no description)").el).toHaveAttribute("data-planned")
    expect(view.dayTotal()).toBe("1:00")
  })

  test("held just under a block, which Chrome hands to the block, makes a new block straight after it", () => {
    const view = calendar(baseState({ entries: [exact("a", at(4, 10, 0), at(4, 11, 0), "Deep work")] }))
    const deep = view.block("Deep work")

    // Chrome's touch adjustment: the finger is 4 px below the block, the event's target is the block
    view.finger.down(deep.el, deep.top + deep.height + 4)
    view.finger.hold()
    view.finger.slide(deep.top + deep.height + 4, y(11, 30), 6)
    view.finger.up(y(11, 30))

    const entries = live(view.latest())
    expect(entries.find((e) => e.id === "a")!.stop, "the block it landed beside was resized").toBe(at(4, 11, 0))
    expect(entries.filter((e) => e.id !== "a").map((e) => [e.start, e.stop])).toEqual([[at(4, 11, 0), at(4, 11, 30)]])
  })

  test("a quick flick up scrolls: the browser takes the finger, and nothing is made", () => {
    const view = calendar(baseState({ entries: [] }))

    view.finger.down(view.column(), y(12))
    view.finger.hold(80)
    view.finger.move(y(12) - 30)
    // the browser starts scrolling and tells the page it has the finger now
    view.finger.cancel()
    view.finger.hold(LONG_PRESS_MS)

    expect(view.setState, "a scroll created an entry").not.toHaveBeenCalled()
    expect(view.view.container.querySelector("[data-preview]")).toBeNull()
    expect(vibrate).not.toHaveBeenCalled()
  })

  test("a finger that moves before the hold takes is a scroll, even if the browser never says so", () => {
    const view = calendar(baseState({ entries: [] }))

    view.finger.down(view.column(), y(12))
    view.finger.hold(150)
    view.finger.slide(y(12), y(12) + 60, 4)
    view.finger.hold(LONG_PRESS_MS)
    view.finger.slide(y(12) + 60, y(14), 6)
    view.finger.up(y(14))

    expect(view.setState).not.toHaveBeenCalled()
  })

  test("the day view leaves up-and-down to the browser, and keeps sideways for the swipe", () => {
    const view = calendar(baseState({ entries: [] }))
    const scroller = view.column().closest<HTMLElement>("[data-calendar-scroll]")!

    expect(scroller.style.touchAction).toBe("pan-y pinch-zoom")
  })
})

describe("a finger held on a block", () => {
  // Deep work 09:00–11:00, then Email from 11:00 (touching), then Gym 12:00–13:00 alone
  const day = () =>
    baseState({
      entries: [
        exact("a", at(4, 9, 0), at(4, 11, 0), "Deep work"),
        exact("b", at(4, 11, 0), at(4, 11, 45), "Email"),
        exact("c", at(4, 12, 0), at(4, 13, 0), "Gym"),
      ],
    })
  const find = (state: TimetrackState, id: string) => state.entries.find((e) => e.id === id)!

  test("by its body moves it in 5-minute steps, and its touching neighbour stays where it was", () => {
    const view = calendar(day())
    const email = view.block("Email")

    view.finger.down(email.el, email.top + email.height / 2)
    view.finger.hold()
    view.finger.slide(email.top + email.height / 2, email.top + email.height / 2 + 30 * MINUTE_PX, 6)
    view.finger.up(email.top + email.height / 2 + 30 * MINUTE_PX)

    expect(find(view.latest(), "b").start).toBe(at(4, 11, 30))
    expect(find(view.latest(), "b").stop).toBe(at(4, 12, 15))
    expect(find(view.latest(), "a").stop, "a whole-block move dragged its neighbour along").toBe(at(4, 11, 0))
    expect(vibrate.mock.calls.length).toBe(1 + 6)
  })

  test("by its top edge moves its start, and the entry that ended there ends there too (D12)", () => {
    const view = calendar(day())
    const email = view.block("Email")

    // 30 minutes up from wherever on the edge the finger landed
    const fromY = email.top + 3
    view.finger.down(email.el, fromY)
    view.finger.hold()
    view.finger.slide(fromY, fromY - 30 * MINUTE_PX, 6)
    view.finger.up(fromY - 30 * MINUTE_PX)

    expect(find(view.latest(), "b").start).toBe(at(4, 10, 30))
    expect(find(view.latest(), "b").stop).toBe(at(4, 11, 45))
    expect(find(view.latest(), "a").stop).toBe(at(4, 10, 30))
    expect(view.pushToast).toHaveBeenCalledWith("Also moved ‘Deep work’ to end 10:30", "info", expect.any(Function), "Keep ‘Deep work’ as it was")
  })

  test("by its bottom edge moves its end, and the entry that started there starts there too (D12)", () => {
    const view = calendar(day())
    const deep = view.block("Deep work")

    // 15 minutes down, into Email, from wherever on the edge the finger landed
    const fromY = deep.top + deep.height - 3
    view.finger.down(deep.el, fromY)
    view.finger.hold()
    view.finger.slide(fromY, fromY + 15 * MINUTE_PX, 9)
    view.finger.up(fromY + 15 * MINUTE_PX)

    expect(find(view.latest(), "a").stop).toBe(at(4, 11, 15))
    expect(find(view.latest(), "b").start).toBe(at(4, 11, 15))
  })

  test("by its bottom edge pulled up, leaves a gap: the next entry keeps its start (D3)", () => {
    const view = calendar(day())
    const deep = view.block("Deep work")

    const fromY = deep.top + deep.height - 3
    view.finger.down(deep.el, fromY)
    view.finger.hold()
    view.finger.slide(fromY, fromY - 45 * MINUTE_PX, 9)
    view.finger.up(fromY - 45 * MINUTE_PX)

    expect(find(view.latest(), "a").stop).toBe(at(4, 10, 15))
    expect(find(view.latest(), "b").start).toBe(at(4, 11, 0))
  })

  test("is drawn where the finger has taken it before it is dropped, and a planned one stays striped", () => {
    const plan = exact("p", at(4, 17, 0), at(4, 18, 0), "Gym later")
    const view = calendar(baseState({ entries: [plan] }))
    const gym = view.block("Gym later")
    expect(gym.el.style.backgroundImage).toContain("repeating-linear-gradient")

    view.finger.down(gym.el, gym.top + gym.height / 2)
    view.finger.hold()
    view.finger.slide(gym.top + gym.height / 2, gym.top + gym.height / 2 + 60 * MINUTE_PX, 6)

    const dragged = view.block("Gym later")
    expect(dragged.top).toBeCloseTo(y(18), 5)
    expect(dragged.el.style.backgroundImage, "a planned block lost its stripes while dragged").toContain("repeating-linear-gradient")
  })

  test("a tap opens it and changes nothing; a hold that never moves changes nothing and opens nothing", () => {
    const view = calendar(day())
    const gym = view.block("Gym")

    view.finger.down(gym.el, gym.top + 20)
    view.finger.hold(120)
    view.finger.up(gym.top + 20)
    fireEvent.click(gym.el)
    expect(view.onEditEntry).toHaveBeenCalledTimes(1)

    view.finger.down(gym.el, gym.top + 20)
    view.finger.hold()
    view.finger.up(gym.top + 20)
    fireEvent.click(gym.el)

    expect(view.onEditEntry).toHaveBeenCalledTimes(1)
    expect(view.setState).not.toHaveBeenCalled()
  })

  test("a finger that drifts a little while it holds does not move the block when the hold takes", () => {
    const view = calendar(day())
    const gym = view.block("Gym")
    // a hair above a snap step: 6 px of drift and 1 px more would cross it
    const fromY = y(12, 30) + 3

    view.finger.down(gym.el, fromY)
    view.finger.move(fromY + 6)
    view.finger.hold()
    view.finger.move(fromY + 7)
    view.finger.up(fromY + 7)

    expect(view.setState, "the drift during the hold was taken for a drag").not.toHaveBeenCalled()
  })

  test("a press whose release never came does not swallow the next one", () => {
    const view = calendar(baseState({ entries: [] }))

    // a finger down whose up went somewhere else
    fireEvent.pointerDown(view.column(), { pointerId: 3, pointerType: "touch", isPrimary: true, clientX: 150, clientY: y(8), button: 0 })
    view.finger.down(view.column(), y(10))
    view.finger.hold()
    view.finger.slide(y(10), y(11), 12)
    view.finger.up(y(11))

    expect(live(view.latest()).map((e) => [e.start, e.stop])).toEqual([[at(4, 10, 0), at(4, 11, 0)]])
  })

  test("a second finger is a pinch: the first one's hold is let go, and nothing is made", () => {
    const view = calendar(baseState({ entries: [] }))

    view.finger.down(view.column(), y(10))
    fireEvent.pointerDown(view.column(), { pointerId: 8, pointerType: "touch", isPrimary: false, clientX: 200, clientY: y(11), button: 0 })
    view.finger.hold()
    view.finger.slide(y(10), y(11), 12)
    view.finger.up(y(11))

    expect(view.setState).not.toHaveBeenCalled()
  })

  test("the running timer cannot be dragged to start in the future, and says so", () => {
    const running = startTimer(baseState({ entries: [] }), { description: "Live", projectId: null, taskId: null, tagIds: [], billable: false }, at(4, 14, 0)).state
    const view = calendar(running)
    const block = view.block("Live")

    view.finger.down(block.el, block.top + block.height / 2)
    view.finger.hold()
    view.finger.slide(block.top + block.height / 2, block.top + block.height / 2 + 2 * HOUR_PX, 6)
    view.finger.up(block.top + block.height / 2 + 2 * HOUR_PX)

    expect(view.pushToast).toHaveBeenCalledWith("A running timer cannot start in the future", "error")
    expect(view.latest().entries[0].start).toBe(at(4, 14, 0))
  })

  test("on a locked day refuses, in the lock's own words", () => {
    const locked = { ...day(), workspace: { ...day().workspace, lockEntriesBefore: "2026-11-04" } }
    const view = calendar(locked)
    const gym = view.block("Gym")

    view.finger.down(gym.el, gym.top + gym.height / 2)
    view.finger.hold()
    view.finger.slide(gym.top + gym.height / 2, gym.top + gym.height / 2 + 30 * MINUTE_PX, 6)
    view.finger.up(gym.top + gym.height / 2 + 30 * MINUTE_PX)

    expect(view.pushToast).toHaveBeenCalledWith("Time entries on or before 2026-11-04 are locked", "error")
    expect(view.setState).not.toHaveBeenCalled()
  })
})

describe("a sideways swipe on the day view", () => {
  test("to the left shows the next day, and to the right the day before", () => {
    const view = calendar(baseState({ entries: [] }))
    expect(view.heading()).toBe("Today")

    view.finger.down(view.column(), y(12), 250)
    view.finger.move(y(12), 200)
    view.finger.move(y(12) + 5, 120)
    view.finger.up(y(12) + 5, 120)
    expect(view.heading()).toBe("Thu, 5 Nov")

    view.finger.down(view.column(), y(12), 50)
    view.finger.move(y(12), 140)
    view.finger.up(y(12), 140)
    view.finger.down(view.column(), y(12), 50)
    view.finger.move(y(12), 140)
    view.finger.up(y(12), 140)
    expect(view.heading()).toBe("Yesterday")
    expect(view.setState).not.toHaveBeenCalled()
  })

  test("turns the day from the hour ruler too, where a thumb often lands", () => {
    const view = calendar(baseState({ entries: [] }))
    const ruler = view.view.container.querySelector<HTMLElement>("[data-hour-ruler]")!
    const touch = { pointerId: 9, pointerType: "touch", isPrimary: true }

    fireEvent.pointerDown(ruler, { ...touch, clientX: 20, clientY: y(12), button: 0 })
    fireEvent.pointerMove(ruler, { ...touch, clientX: 120, clientY: y(12) })
    fireEvent.pointerUp(ruler, { ...touch, clientX: 120, clientY: y(12) })

    expect(view.heading()).toBe("Yesterday")
  })

  test("does not turn the day while a drag is in progress", () => {
    const view = calendar(baseState({ entries: [] }))

    view.finger.down(view.column(), y(12), 250)
    view.finger.hold()
    view.finger.move(y(12, 30), 100)
    view.finger.up(y(12, 30), 100)

    expect(view.heading()).toBe("Today")
  })
})

describe("with a mouse", () => {
  const mouse = { pointerId: 1, pointerType: "mouse", isPrimary: true, clientX: 150, button: 0 }

  test("a press on a block is captured by the block itself, so the browser's click still lands on it", () => {
    const view = calendar(baseState({ entries: [exact("g", at(4, 12, 0), at(4, 13, 0), "Gym")] }))
    const gym = view.block("Gym")

    fireEvent.pointerDown(gym.el, { ...mouse, clientY: gym.top + 20 })

    // a captured pointer sends its click to whatever captured it: captured by the column, the sheet never opened
    const capture = Element.prototype.setPointerCapture as unknown as ReturnType<typeof vi.fn>
    expect(capture.mock.contexts).toEqual([gym.el])
    fireEvent.pointerUp(gym.el, { ...mouse, clientY: gym.top + 20 })
    fireEvent.click(gym.el)
    expect(view.onEditEntry).toHaveBeenCalledTimes(1)
    expect(released).toHaveBeenCalledWith(1)
  })

  test("a drag on empty space creates at once, with no hold", () => {
    const view = calendar(baseState({ entries: [] }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    fireEvent.pointerDown(view.column(), { ...mouse, clientY: y(10) })
    fireEvent.pointerMove(view.column(), { ...mouse, clientY: y(11, 30) })
    fireEvent.pointerUp(view.column(), { ...mouse, clientY: y(11, 30) })

    expect(live(view.latest()).map((e) => [e.start, e.stop])).toEqual([[at(5, 10, 0), at(5, 11, 30)]])
  })

  test("the top edge resizes too, which it never did", () => {
    const view = calendar(baseState({ entries: [exact("g", at(4, 12, 0), at(4, 13, 0), "Gym")] }))
    const gym = view.block("Gym")

    fireEvent.pointerDown(gym.el, { ...mouse, clientY: gym.top + 2 })
    fireEvent.pointerMove(view.column(), { ...mouse, clientY: gym.top + 2 - 45 * MINUTE_PX })
    fireEvent.pointerUp(view.column(), { ...mouse, clientY: gym.top + 2 - 45 * MINUTE_PX })

    expect(view.latest().entries[0].start).toBe(at(4, 11, 15))
    expect(view.latest().entries[0].stop).toBe(at(4, 13, 0))
  })
})

describe("from the keyboard", () => {
  test("Tab reaches a block, its name is what it is and when, and Enter opens it", () => {
    const view = calendar(baseState({ entries: [exact("g", at(4, 10, 0), at(4, 11, 30), "Gym")] }))

    const gym = screen.getByRole("button", { name: "Gym, 10:00 to 11:30" })
    expect(gym.tabIndex).toBe(0)
    gym.focus()
    fireEvent.keyDown(gym, { key: "Enter" })

    expect(view.onEditEntry).toHaveBeenCalledTimes(1)
    expect(view.onEditEntry.mock.calls[0][0].id).toBe("g")
  })

  test("the arrow keys move a focused block by 5 minutes, and its neighbours stay", () => {
    const view = calendar(baseState({ entries: [exact("g", at(4, 10, 0), at(4, 11, 30), "Gym"), exact("h", at(4, 11, 30), at(4, 12, 0), "Shower")] }))

    fireEvent.keyDown(screen.getByRole("button", { name: "Gym, 10:00 to 11:30" }), { key: "ArrowDown" })

    const after = view.latest().entries
    expect(after.find((e) => e.id === "g")!.start).toBe(at(4, 10, 5))
    expect(after.find((e) => e.id === "g")!.stop).toBe(at(4, 11, 35))
    expect(after.find((e) => e.id === "h")!.start).toBe(at(4, 11, 30))
  })
})
