// @vitest-environment node
/**
 * A BLOCK DRAGGED ACROSS THE CLOCK-CHANGE NIGHT LANDS UNDER THE FINGER.
 *
 * The calendar's grid is the clock on the wall: 03:00 is three hours of rows
 * below midnight, even on the night the clocks change. A whole-block move
 * shifted the entry by REAL minutes, so on 25 October (Europe/Copenhagen, the
 * zone the suite runs in) a 01:00–01:30 block dragged down 120 rows landed at
 * 02:00, an hour above the finger; on 29 March it landed an hour below. A
 * resize already read the grid as wall-clock time and was right. Found by the
 * code review of 2026-11-04. Now a move builds the new start from the grid
 * position on that day, as a resize does, and keeps the length in real time.
 */

import { describe, expect, test } from "vitest"

import { blockDragPatch } from "@/src/timetrack/calendarService"
import { epochMillis, epochSeconds } from "@/src/timetrack/timetrackFormatService"
import type { TimeEntry } from "@/src/timetrack/types"

import { entry } from "./helpers"

const local = (month: number, day: number, h: number, m = 0, s = 0) => new Date(2026, month - 1, day, h, m, s, 0).toISOString()

function exact(id: string, start: string, stop: string): TimeEntry {
  const made = entry(id, "2026-10-25", "00:00", "00:01", { description: "Gym" })
  return { ...made, start, stop, duration: epochSeconds(stop) - epochSeconds(start) }
}

/** a press on the block's body at its top + 10 minutes, let go `rows` minutes lower */
const moveDown = (topMinutes: number, rows: number) => ({ mode: "move" as const, topMinutes, grabMinutes: topMinutes + 10, pointerMinutes: topMinutes + 10 + rows })

describe("a move over the clock change", () => {
  test("on 25 October, 01:00–01:30 dragged down 120 rows starts at 03:00 on the wall, not 02:00", () => {
    // the zone this test means: one hour of the night happens twice
    expect(epochMillis(local(10, 26, 0)) - epochMillis(local(10, 25, 0)), "TZ is not Europe/Copenhagen").toBe(25 * 3600_000)
    const gym = exact("gym", local(10, 25, 1, 0), local(10, 25, 1, 30))

    const patch = blockDragPatch(gym, "2026-10-25", moveDown(60, 120), local(10, 25, 12))

    expect(patch && "start" in patch ? patch.start : null, "the block landed an hour above the finger").toBe(local(10, 25, 3, 0))
    expect(patch && "stop" in patch ? patch.stop : null).toBe(local(10, 25, 3, 30))
  })

  test("on 29 March, the same drag starts at 03:00, not an hour below the finger", () => {
    const gym = exact("gym", local(3, 29, 1, 0), local(3, 29, 1, 30))

    const patch = blockDragPatch(gym, "2026-03-29", moveDown(60, 120), local(3, 29, 12))

    expect(patch && "start" in patch ? patch.start : null).toBe(local(3, 29, 3, 0))
    expect(patch && "stop" in patch ? patch.stop : null).toBe(local(3, 29, 3, 30))
  })

  test("the length stays, to the second, and so do the start's seconds", () => {
    const gym = exact("gym", local(10, 25, 0, 40, 20), local(10, 25, 1, 15, 50))

    const patch = blockDragPatch(gym, "2026-10-25", moveDown(40, 180), local(10, 25, 12)) as { start: string; stop: string }

    expect(patch.start).toBe(local(10, 25, 3, 40, 20))
    expect(epochMillis(patch.stop) - epochMillis(patch.start)).toBe(epochMillis(gym.stop!) - epochMillis(gym.start))
  })

  test("on an ordinary day nothing changes: 10:00 dragged down 30 rows is 10:30", () => {
    const gym = exact("gym", local(11, 4, 10, 0), local(11, 4, 11, 0))
    const patch = blockDragPatch(gym, "2026-11-04", moveDown(600, 30), local(11, 4, 15)) as { start: string; stop: string }

    expect(patch).toEqual({ start: local(11, 4, 10, 30), stop: local(11, 4, 11, 30) })
  })
})
