// @vitest-environment jsdom
/**
 * A CLICK ON A CALENDAR BLOCK OPENS IT AND CHANGES NOTHING; A DRAG BY ITS MIDDLE MOVES IT.
 *
 * On the PC calendar the bottom 8 px of a block was its resize edge, decided
 * where the mouse went DOWN, and mouse-up wrote the snapped pointer position as
 * the entry's end whether or not the mouse had moved. So:
 *
 *   - a plain click on the lower edge changed the end to the nearest 5 minutes,
 *     and on the running block it stopped the timer;
 *   - a block under ~15 minutes is drawn 14 px tall while its real height is
 *     about 9 px, so the "bottom 8 px" of the real height was nearly all of the
 *     drawn block: almost any click resized it, and the sheet never opened;
 *   - and a 10-minute entry dragged by its middle stretched to 70 minutes
 *     instead of moving an hour.
 *
 * Found by the edits audit (B2) and the heavy-use audit (D4) on 2026-11-04.
 *
 * Now nothing is moved or resized until the pointer has travelled a few pixels,
 * and the resize edge is measured on the block as drawn and never takes more
 * than a third of it.
 */

import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { CalendarView } from "@/src/timetrack/components/CalendarView"
import { CALENDAR_ZOOMS } from "@/src/timetrack/config"
import { blockGrabMode, drawnBlockHeight } from "@/src/timetrack/calendarService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (h: number, m = 0, s = 0) => new Date(2026, 10, 4, h, m, s, 0).toISOString()
const NOW = at(15, 0)
const NOW_SEC = epochSeconds(NOW)
const HOUR_PX = CALENDAR_ZOOMS.find((z) => z.id === "normal")!.hourHeight
const MINUTE_PX = HOUR_PX / 60

/**
 * jsdom lays nothing out. Give each block the box its own style draws it at,
 * inside a day column whose top is 0, and give mouse events the `offsetY` a
 * browser computes from that box — so the calendar's own arithmetic runs.
 */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
  // the range switch scrolls its active chip into view, which jsdom cannot do
  Element.prototype.scrollIntoView = vi.fn()
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const el = this as HTMLElement
    const top = el.hasAttribute("data-block") ? parseFloat(el.style.top) || 0 : 0
    const height = parseFloat(el.style.height) || 0
    return { top, bottom: top + height, height, left: 0, right: 100, width: 100, x: 0, y: top, toJSON: () => ({}) } as DOMRect
  })
  Object.defineProperty(MouseEvent.prototype, "offsetY", {
    configurable: true,
    get(this: MouseEvent) {
      const target = this.target as Element | null
      return target ? this.clientY - target.getBoundingClientRect().top : 0
    },
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  delete (MouseEvent.prototype as unknown as Record<string, unknown>).offsetY
  vi.useRealTimers()
})

function withStop(id: string, description: string, start: string, stop: string): TimeEntry {
  const made = entry(id, "2026-11-04", "00:00", "00:01", { description })
  return { ...made, start, stop, duration: epochSeconds(stop) - epochSeconds(start) }
}

function calendar(initial: TimetrackState) {
  let current = initial
  const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
    current = updater(current)
  })
  const onEditEntry = vi.fn()
  const view = render(
    <CalendarView
      state={initial}
      setState={setState}
      nowSec={NOW_SEC}
      pushToast={vi.fn()}
      onEditEntry={onEditEntry}
      onOpenIntegrations={vi.fn()}
    />,
  )
  const block = (description: string) => {
    const found = [...view.container.querySelectorAll<HTMLElement>("[data-block]")].find((el) => el.title.startsWith(`${description} `))
    expect(found, `no "${description}" block on the calendar`).toBeTruthy()
    const top = parseFloat(found!.style.top)
    const height = parseFloat(found!.style.height)
    return { el: found!, top, height }
  }
  // the calendar listens to pointer events (D13), which a browser sends before the mouse events
  const mouse = { pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0 }
  const click = (el: HTMLElement, clientY: number) => {
    fireEvent.pointerDown(el, { ...mouse, clientY })
    fireEvent.pointerUp(el, { ...mouse, clientY })
    fireEvent.click(el, { clientY })
  }
  const drag = (el: HTMLElement, fromY: number, dy: number, steps = 10) => {
    fireEvent.pointerDown(el, { ...mouse, clientY: fromY })
    for (let i = 1; i <= steps; i++) fireEvent.pointerMove(el, { ...mouse, clientY: fromY + (dy * i) / steps })
    fireEvent.pointerUp(el, { ...mouse, clientY: fromY + dy })
    fireEvent.click(el, { clientY: fromY + dy })
  }
  return { block, click, drag, onEditEntry, latest: () => current, setState }
}

const SHORT = () => withStop("short", "Short", at(10, 0), at(10, 10, 30))
const LONG = () => withStop("long", "Long", at(11, 0), at(12, 7, 30))
const STANDUP = () => withStop("standup", "Standup", at(9, 0), at(9, 10))

describe("the resize edge", () => {
  test("is measured on the block as drawn, and is never more than a third of it", () => {
    const drawn = drawnBlockHeight(10, MINUTE_PX)
    expect(drawn).toBe(14)
    expect(blockGrabMode(drawn / 2, drawn), "the middle of a short block resizes it").toBe("move")
    expect(blockGrabMode(drawn - 1, drawn)).toBe("resize-end")
    expect(blockGrabMode(drawn - 6, drawn), "the edge took more than a third").toBe("move")
  })

  test("is 8 px on a block tall enough to spare it", () => {
    expect(blockGrabMode(100 - 7, 100)).toBe("resize-end")
    expect(blockGrabMode(100 - 9, 100)).toBe("move")
  })
})

describe("a click on a block", () => {
  test("in the middle of a short block opens it and leaves its times alone", () => {
    const view = calendar(baseState({ entries: [SHORT(), LONG()] }))
    const short = view.block("Short")

    view.click(short.el, short.top + short.height / 2)

    expect(view.onEditEntry).toHaveBeenCalledTimes(1)
    expect(view.setState, "a click wrote to the entry").not.toHaveBeenCalled()
  })

  test("on the bottom edge of a long block opens it and leaves its end alone", () => {
    const view = calendar(baseState({ entries: [SHORT(), LONG()] }))
    const long = view.block("Long")

    view.click(long.el, long.top + long.height - 3)

    expect(view.setState, "a click on the edge moved the end").not.toHaveBeenCalled()
    expect(view.onEditEntry).toHaveBeenCalledTimes(1)
  })

  test("on the bottom edge of the running block does not stop the timer", () => {
    const running = startTimer(baseState({ entries: [] }), { description: "Live", projectId: null, taskId: null, tagIds: [], billable: false }, at(14, 10)).state
    const view = calendar(running)
    const live = view.block("Live")

    view.click(live.el, live.top + live.height - 4)

    expect(view.latest().entries[0].stop, "one click stopped the timer").toBeNull()
  })
})

describe("a drag", () => {
  test("of a 10-minute entry by its middle moves it an hour, and keeps its length", () => {
    const view = calendar(baseState({ entries: [STANDUP()] }))
    const standup = view.block("Standup")

    view.drag(standup.el, standup.top + standup.height / 2, HOUR_PX)

    const after = view.latest().entries[0]
    expect(after.start).toBe(at(10, 0))
    expect(after.stop).toBe(at(10, 10))
  })

  test("by the bottom edge still resizes", () => {
    const view = calendar(baseState({ entries: [LONG()] }))
    const long = view.block("Long")
    const fromY = long.top + long.height - 3

    view.drag(long.el, fromY, 30 * MINUTE_PX)

    const after = view.latest().entries[0]
    expect(after.start).toBe(at(11, 0))
    // the end moves as far as the pointer did, onto the 5-minute grid: 12:07:30 + 30 min is 12:37:30, so 12:40
    expect(after.stop).toBe(at(12, 40))
  })

  test("of less than the threshold is a click", () => {
    const view = calendar(baseState({ entries: [LONG()] }))
    const long = view.block("Long")

    view.drag(long.el, long.top + long.height - 3, 2, 2)

    expect(view.setState).not.toHaveBeenCalled()
    expect(view.onEditEntry).toHaveBeenCalledTimes(1)
  })
})
