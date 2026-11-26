// @vitest-environment jsdom
/**
 * A TIMER RUNNING FOR MORE THAN A DAY KEEPS ITS TRUE LENGTH EVERYWHERE.
 *
 * Clock trap 3 of the Time Log test plan. A timer forgotten over a weekend is
 * the commonest way to meet one. Nothing caps a length at 24 hours: the clock
 * on its row, each day's share, the week and the calendar must go on adding up,
 * and Stop must write the whole length.
 *
 * Already pinned elsewhere: a timer 16 hours old given the length actually
 * worked (`aForgottenTimerEndsWhereTheWorkDid`), a finished Friday-to-Sunday
 * entry's line in the drums (`theDrumsReadTheClockOnTheWall`), the question a
 * 23-hour typed entry asks (`aTwentyThreeHourEntryAsksFirst`).
 *
 * Fixed: Europe/Copenhagen, January 2027 (no clock change). Monday 11 Jan
 * 09:00, looked at on Wednesday 13 Jan 11:30: 50 h 30 min, over three days.
 */

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { dayColumnSeconds, entriesForDay, entryInterval } from "@/src/timetrack/calendarService"
import { EntryList } from "@/src/timetrack/components/EntryList"
import { FORGOTTEN_TIMER_HOURS } from "@/src/timetrack/config"
import { dateKey, formatClock } from "@/src/timetrack/timetrackFormatService"
import { buildDayGroups, daySeconds, entrySeconds, forgottenTimer, weekTotalSeconds } from "@/src/timetrack/timetrackService"

import { boxValues, dayHeaders, freezeClockAt, secondsOf, stoppedAt, wall, withTimerSince } from "./clockTraps"

const MONDAY_0900 = wall(2027, 1, 11, 9, 0)
const WEDNESDAY_1130 = wall(2027, 1, 13, 11, 30)
const NOW_SEC = secondsOf(WEDNESDAY_1130)
const HOUR = 3600
const LENGTH = 50.5 * HOUR

freezeClockAt(() => WEDNESDAY_1130)
afterEach(cleanup)

const state = () => withTimerSince(MONDAY_0900)

describe("a timer started on Monday 09:00, looked at on Wednesday 11:30", () => {
  test("has run fifty and a half hours", () => {
    expect(entrySeconds(state().entries[0], NOW_SEC)).toBe(LENGTH)
  })

  test("reads 50:30:00 on its row", () => {
    const view = render(<EntryList state={state()} setState={vi.fn()} nowSec={NOW_SEC} pushToast={vi.fn()} onEditEntry={vi.fn()} />)
    expect(boxValues(view.container)).toContain("50:30:00")
  })

  test("is written as a clock past 24 hours, not wrapped to the time of day", () => {
    expect(formatClock(LENGTH)).toBe("50:30:00")
    expect(formatClock(24 * HOUR)).toBe("24:00:00")
  })

  test("is counted as forgotten, at its full length", () => {
    expect(LENGTH / HOUR).toBeGreaterThan(FORGOTTEN_TIMER_HOURS)
    expect(forgottenTimer(state(), NOW_SEC)?.hours).toBe(50.5)
  })
})

describe("its days", () => {
  test("hold 15 hours on Monday, a full 24 on Tuesday and 11 and a half on Wednesday", () => {
    const entries = state().entries
    expect(["2027-01-11", "2027-01-12", "2027-01-13"].map((day) => daySeconds(entries, day, NOW_SEC))).toEqual([15 * HOUR, 24 * HOUR, 11.5 * HOUR])
  })

  test("have a header each in the list, Tuesday's too although nothing began on it", () => {
    const groups = buildDayGroups(state().entries, { groupSimilar: false, nowSec: NOW_SEC })
    expect(groups.map((g) => [g.date, g.totalSeconds])).toEqual([
      ["2027-01-13", 11.5 * HOUR],
      ["2027-01-12", 24 * HOUR],
      ["2027-01-11", 15 * HOUR],
    ])
  })

  test("are written on screen under Today, Yesterday and Monday", () => {
    const view = render(<EntryList state={state()} setState={vi.fn()} nowSec={NOW_SEC} pushToast={vi.fn()} onEditEntry={vi.fn()} />)
    const headers = dayHeaders(view.container)

    expect(headers.map((h) => h.title)).toEqual(["Today", "Yesterday", expect.stringMatching(/Mon/)])
    expect(headers[0].text).toMatch(/^Today\s*11:30/)
    expect(headers[1].text).toMatch(/^Yesterday\s*24:00/)
    expect(headers[2].text).toMatch(/15:00/)
  })

  test("fill Tuesday's calendar column from the top to the bottom, 24 hours", () => {
    const entries = state().entries
    expect(entriesForDay(entries, "2027-01-12", NOW_SEC)).toHaveLength(1)
    expect(entryInterval(entries[0], "2027-01-12", NOW_SEC)).toEqual({ startMin: 0, endMin: 24 * 60 })
    expect(dayColumnSeconds(entries, "2027-01-12", NOW_SEC)).toBe(24 * HOUR)
  })

  test("add up to the full length in the week", () => {
    expect(weekTotalSeconds(state().entries, "2027-01-13", 1, NOW_SEC)).toBe(LENGTH)
  })
})

describe("stopping it", () => {
  test("writes the whole fifty and a half hours as one entry", () => {
    const stopped = stoppedAt(state(), WEDNESDAY_1130)

    expect(stopped.state.entries).toHaveLength(1)
    expect(stopped.entry.duration).toBe(LENGTH)
    expect(dateKey(stopped.entry.stop!)).toBe("2027-01-13")
  })

  test("leaves every day's share as it was while it ran", () => {
    const entries = stoppedAt(state(), WEDNESDAY_1130).state.entries
    expect(["2027-01-11", "2027-01-12", "2027-01-13"].map((day) => daySeconds(entries, day, NOW_SEC))).toEqual([15 * HOUR, 24 * HOUR, 11.5 * HOUR])
  })

  test("shows 50:30 on the finished row", () => {
    const entries = stoppedAt(state(), WEDNESDAY_1130).state
    const view = render(<EntryList state={entries} setState={vi.fn()} nowSec={NOW_SEC} pushToast={vi.fn()} onEditEntry={vi.fn()} />)
    expect(boxValues(view.container)).toContain("50:30")
  })

  test("a day later still counts the same fifty and a half hours, not more", () => {
    const entries = stoppedAt(state(), WEDNESDAY_1130).state.entries
    const nextDay = NOW_SEC + 24 * HOUR
    expect(weekTotalSeconds(entries, "2027-01-13", 1, nextDay)).toBe(LENGTH)
  })
})
