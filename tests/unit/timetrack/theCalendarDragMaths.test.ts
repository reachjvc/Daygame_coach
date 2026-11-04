// @vitest-environment node
/**
 * THE CALENDAR'S DRAG ARITHMETIC (Plans/time-tracker-like-toggl.md, Phase 6).
 *
 * The calendar on the phone and on the PC share one code path (D13): a press
 * grabs a block by its top edge, its bottom edge or its body; the drag moves
 * in 5-minute steps; a sideways flick on the day view turns the page. These
 * are the sums behind it, so the component only has to measure pixels.
 *
 * The rules they keep, from the rest of the app:
 *   - nothing ever ends before it starts, to the millisecond;
 *   - a whole-block move keeps the entry's length, seconds included;
 *   - an edge that is not the entry's own (a night drawn on its second day)
 *     cannot be pulled, because pulling it would move the entry across days.
 */

import { describe, expect, test } from "vitest"

import {
  LONG_PRESS_MS,
  MOUSE_EDGE_PX,
  SWIPE_MIN_PX,
  TOUCH_EDGE_PX,
  blockDragPatch,
  blockGrabMode,
  blockLabel,
  swipeDirection,
} from "@/src/timetrack/calendarService"
import { epochMillis, epochSeconds } from "@/src/timetrack/timetrackFormatService"
import type { TimeEntry } from "@/src/timetrack/types"

import { entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const DAY = "2026-11-04"
const NOW = at(4, 15, 0)
const NOW_SEC = epochSeconds(NOW)

function exact(id: string, start: string, stop: string | null, description = "Gym"): TimeEntry {
  const made = entry(id, DAY, "00:00", "00:01", { description })
  return { ...made, start, stop, duration: stop ? epochSeconds(stop) - epochSeconds(start) : -epochSeconds(start) }
}

describe("where a press on a block grabs it", () => {
  test("the top edge takes the start, the bottom edge the end, and the rest the whole block", () => {
    expect(blockGrabMode(2, 100)).toBe("resize-start")
    expect(blockGrabMode(98, 100)).toBe("resize-end")
    expect(blockGrabMode(50, 100)).toBe("move")
    // 8 px each, on a block tall enough to spare them
    expect(blockGrabMode(MOUSE_EDGE_PX - 1, 100)).toBe("resize-start")
    expect(blockGrabMode(MOUSE_EDGE_PX + 1, 100)).toBe("move")
  })

  test("a fingertip gets a taller edge than a cursor, and neither edge is ever more than a third", () => {
    expect(blockGrabMode(12, 120, { edgePx: TOUCH_EDGE_PX })).toBe("resize-start")
    expect(blockGrabMode(12, 120)).toBe("move")
    // a 14 px block: each edge is under 5 px, so its middle still moves it
    expect(blockGrabMode(7, 14, { edgePx: TOUCH_EDGE_PX })).toBe("move")
    expect(blockGrabMode(1, 14, { edgePx: TOUCH_EDGE_PX })).toBe("resize-start")
    expect(blockGrabMode(13, 14, { edgePx: TOUCH_EDGE_PX })).toBe("resize-end")
  })

  test("an edge that is not the entry's own moves the block instead", () => {
    // a night shift drawn on its second day: its top is midnight, not its start
    expect(blockGrabMode(2, 100, { start: false })).toBe("move")
    // and on its first day, its bottom is midnight, not its end
    expect(blockGrabMode(98, 100, { end: false })).toBe("move")
  })
})

describe("what a drag writes", () => {
  const gym = () => exact("gym", at(4, 10, 2, 30), at(4, 11, 30, 15))
  const TOP = 10 * 60 + 2.5

  test("a move shifts both ends by the snapped steps the pointer travelled, and keeps the seconds", () => {
    const patch = blockDragPatch(gym(), DAY, { mode: "move", topMinutes: TOP, grabMinutes: 640, pointerMinutes: 700 }, NOW)

    expect(patch).toEqual({ start: at(4, 11, 2, 30), stop: at(4, 12, 30, 15) })
  })

  test("a move above midnight stops at midnight, and never onto the day before", () => {
    const early = exact("early", at(4, 0, 30), at(4, 1, 0))
    const patch = blockDragPatch(early, DAY, { mode: "move", topMinutes: 30, grabMinutes: 45, pointerMinutes: 0 }, NOW)

    expect(patch).toEqual({ start: at(4, 0, 0), stop: at(4, 0, 30) })
  })

  test("the top edge moves the start by the steps the pointer travelled, onto the grid, and leaves the end", () => {
    const onGrid = exact("g", at(4, 10, 0), at(4, 11, 30))
    expect(blockDragPatch(onGrid, DAY, { mode: "resize-start", topMinutes: 600, grabMinutes: 605, pointerMinutes: 575 }, NOW)).toEqual({ start: at(4, 9, 30) })
    // 10:02:30 up 30 minutes is 09:32:30, which the grid takes to 09:35
    expect(blockDragPatch(gym(), DAY, { mode: "resize-start", topMinutes: TOP, grabMinutes: 605, pointerMinutes: 575 }, NOW)).toEqual({ start: at(4, 9, 35) })
  })

  test("an edge goes the way the pointer goes, wherever on the edge it was pressed", () => {
    const onGrid = exact("g", at(4, 10, 0), at(4, 11, 30))
    // pressed 11 minutes below the top (a fingertip's edge), then up one step
    const patch = blockDragPatch(onGrid, DAY, { mode: "resize-start", topMinutes: 600, grabMinutes: 610, pointerMinutes: 605 }, NOW)

    expect(patch).toEqual({ start: at(4, 9, 55) })
  })

  test("the top edge pulled past the end stops five minutes before it: never an end before its start", () => {
    const patch = blockDragPatch(gym(), DAY, { mode: "resize-start", topMinutes: TOP, grabMinutes: 600, pointerMinutes: 800 }, NOW)

    expect(patch).toEqual({ start: at(4, 11, 25, 15) })
    expect(epochMillis(at(4, 11, 30, 15)) - epochMillis((patch as { start: string }).start)).toBe(5 * 60_000)
  })

  test("the bottom edge moves the end the same way; pulled above the start it stops five minutes after it", () => {
    expect(blockDragPatch(gym(), DAY, { mode: "resize-end", topMinutes: TOP, grabMinutes: 690, pointerMinutes: 720 }, NOW)).toEqual({ stop: at(4, 12, 0) })
    expect(blockDragPatch(gym(), DAY, { mode: "resize-end", topMinutes: TOP, grabMinutes: 690, pointerMinutes: 300 }, NOW)).toEqual({ stop: at(4, 10, 7, 30) })
  })

  test("a running entry's top edge stops five minutes before now, so its start cannot pass the clock", () => {
    const running = exact("live", at(4, 14, 0), null)
    const patch = blockDragPatch(running, DAY, { mode: "resize-start", topMinutes: 840, grabMinutes: 840, pointerMinutes: 960 }, NOW)

    expect(patch).toEqual({ start: at(4, 14, 55) })
  })

  test("a pointer back where it went down writes nothing, whatever the grab", () => {
    for (const mode of ["move", "resize-start", "resize-end"] as const) {
      expect(blockDragPatch(gym(), DAY, { mode, topMinutes: TOP, grabMinutes: 650, pointerMinutes: 650 }, NOW), mode).toBeNull()
    }
  })
})

describe("a sideways flick on the day view", () => {
  test("to the left is the next day, to the right the day before", () => {
    expect(swipeDirection(-SWIPE_MIN_PX, 0)).toBe(1)
    expect(swipeDirection(SWIPE_MIN_PX + 20, 10)).toBe(-1)
  })

  test("too short, or more up-and-down than sideways, is not a swipe", () => {
    expect(swipeDirection(-(SWIPE_MIN_PX - 1), 0)).toBe(0)
    expect(swipeDirection(-80, 70)).toBe(0)
  })

  test("the hold that starts a drag is long enough not to be a pause in a scroll", () => {
    expect(LONG_PRESS_MS).toBe(400)
  })
})

describe("a block's name, for a screen reader and the keyboard", () => {
  test("is its description and its times", () => {
    const done = exact("done", at(4, 10, 0), at(4, 11, 30))
    expect(blockLabel(done, NOW_SEC, "h24")).toBe("Gym, 10:00 to 11:30")
    expect(blockLabel(done, NOW_SEC, "h12")).toBe("Gym, 10:00 AM to 11:30 AM")
  })

  test("says when it is planned, running, or has no description", () => {
    expect(blockLabel(exact("plan", at(5, 10, 0), at(5, 11, 30)), NOW_SEC, "h24")).toBe("Gym, 10:00 to 11:30, planned")
    expect(blockLabel(exact("live", at(4, 14, 0), null), NOW_SEC, "h24")).toBe("Gym, 14:00 to now, running")
    expect(blockLabel(exact("blank", at(4, 9, 0), at(4, 9, 30), "  "), NOW_SEC, "h24")).toBe("(no description), 09:00 to 09:30")
  })
})
