// @vitest-environment node
/**
 * AN ENTRY THAT ENDS AT MIDNIGHT HAS NO BLOCK ON THE NEXT DAY.
 *
 * The calendar drew every entry whose end fell on a day, so one ending at
 * exactly 00:00 also got a block on the next day: from minute 0 to minute 0,
 * drawn one minute tall at 00:00. A drag to the bottom of the grid makes such
 * entries (a create, a resize), and the phantom's bottom edge could pull the
 * entry into the next day. Found by the code review of 2026-11-04. Now an
 * entry belongs to a day only if it has time inside it.
 */

import { describe, expect, test } from "vitest"

import { dayColumnSeconds, entriesForDay } from "@/src/timetrack/calendarService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimeEntry } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW_SEC = epochSeconds(at(6, 12, 0))

function exact(id: string, start: string, stop: string): TimeEntry {
  return { ...entry(id, "2026-11-04", "00:00", "00:01"), start, stop, duration: epochSeconds(stop) - epochSeconds(start) }
}

describe("which days an entry is drawn on", () => {
  test("22:00 to midnight is drawn on its own day only", () => {
    const evening = exact("evening", at(4, 22, 0), at(5, 0, 0))

    expect(entriesForDay([evening], "2026-11-04", NOW_SEC)).toEqual([evening])
    expect(entriesForDay([evening], "2026-11-05", NOW_SEC), "a one-minute phantom at 00:00").toEqual([])
    expect(dayColumnSeconds([evening], "2026-11-05", NOW_SEC)).toBe(0)
  })

  test("one second past midnight is still drawn on the next day", () => {
    const evening = exact("evening", at(4, 22, 0), at(5, 0, 0, 1))
    expect(entriesForDay([evening], "2026-11-05", NOW_SEC)).toEqual([evening])
  })

  test("a timer running since yesterday is drawn today", () => {
    const running = startTimer(baseState(), { description: "Night", projectId: null, taskId: null, tagIds: [], billable: false }, at(5, 22, 0)).entry
    expect(entriesForDay([running], "2026-11-06", NOW_SEC)).toEqual([running])
  })
})
