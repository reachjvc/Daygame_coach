// @vitest-environment jsdom
/**
 * A TIMER RUNNING PAST MIDNIGHT KEEPS COUNTING, AND EVERY SCREEN SPLITS IT BY DAY.
 *
 * Clock trap 1 of the Time Log test plan. What was already pinned elsewhere:
 * a finished night split in the list (`aNightIsSplitAtMidnightInTheList`), the
 * list's headers for a timer begun at 23:00 (`aDayReachedOnlyAfterMidnightHasItsHeader`),
 * the calendar's two halves (`aDayTotalsTheSecondsItTracked`), typed ends and
 * starts across midnight (`aForgottenTimerEndsWhereTheWorkDid`, `aTypedStartStaysOnItsOwnDay`).
 * This file adds the RUNNING timer in the calendar's columns, in the week
 * totals, in the clock on its row, and the Stop that ends it the next morning.
 *
 * Fixed: Europe/Copenhagen, a January weekend (no clock change near it).
 * Sunday 10 Jan 2027 22:30, looked at on Monday 11 Jan 01:15.
 */

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { dayColumnSeconds, entriesForDay, entryInterval } from "@/src/timetrack/calendarService"
import { EntryList } from "@/src/timetrack/components/EntryList"
import { dateKey } from "@/src/timetrack/timetrackFormatService"
import { daySeconds, entrySeconds, weekTotalSeconds } from "@/src/timetrack/timetrackService"

import { boxValues, dayHeaders, freezeClockAt, secondsOf, stoppedAt, wall, withTimerSince } from "./clockTraps"

const SUNDAY_2230 = wall(2027, 1, 10, 22, 30)
const MONDAY_0115 = wall(2027, 1, 11, 1, 15)
const NOW_SEC = secondsOf(MONDAY_0115)
const HOUR = 3600
const MINUTE = 60

freezeClockAt(() => MONDAY_0115)
afterEach(cleanup)

describe("a timer started on Sunday 22:30, looked at on Monday 01:15", () => {
  const state = () => withTimerSince(SUNDAY_2230)
  const timer = () => state().entries[0]

  test("has run two hours and three quarters", () => {
    expect(entrySeconds(timer(), NOW_SEC)).toBe(2 * HOUR + 45 * MINUTE)
  })

  test("puts an hour and a half on Sunday", () => {
    expect(daySeconds(state().entries, "2027-01-10", NOW_SEC)).toBe(90 * MINUTE)
  })

  test("puts a quarter past the hour on Monday", () => {
    expect(daySeconds(state().entries, "2027-01-11", NOW_SEC)).toBe(75 * MINUTE)
  })

  test("is drawn in both of the calendar's day columns, with the same two halves", () => {
    const entries = state().entries
    expect(entriesForDay(entries, "2027-01-10", NOW_SEC)).toHaveLength(1)
    expect(entriesForDay(entries, "2027-01-11", NOW_SEC)).toHaveLength(1)
    expect(dayColumnSeconds(entries, "2027-01-10", NOW_SEC)).toBe(90 * MINUTE)
    expect(dayColumnSeconds(entries, "2027-01-11", NOW_SEC)).toBe(75 * MINUTE)
  })

  test("runs to the bottom of Sunday's column and from the top of Monday's down to the quarter past one", () => {
    expect(entryInterval(timer(), "2027-01-10", NOW_SEC)).toEqual({ startMin: 22 * 60 + 30, endMin: 24 * 60 })
    expect(entryInterval(timer(), "2027-01-11", NOW_SEC)).toEqual({ startMin: 0, endMin: 75 })
  })

  test("counts in the week it is in, and not twice in the week after (weeks start on Monday)", () => {
    const entries = state().entries
    expect(weekTotalSeconds(entries, "2027-01-10", 1, NOW_SEC), "the week that ended on Sunday").toBe(90 * MINUTE)
    expect(weekTotalSeconds(entries, "2027-01-11", 1, NOW_SEC), "the week that began on Monday").toBe(75 * MINUTE)
  })

  test("is stopped as one entry that ends on Monday and is two hours and three quarters long", () => {
    const stopped = stoppedAt(state(), MONDAY_0115)

    expect(stopped.state.entries).toHaveLength(1)
    expect(stopped.entry.duration).toBe(2 * HOUR + 45 * MINUTE)
    expect(dateKey(stopped.entry.start)).toBe("2027-01-10")
    expect(dateKey(stopped.entry.stop!)).toBe("2027-01-11")
  })

  test("splits the same way once stopped as it did while running", () => {
    const entries = stoppedAt(state(), MONDAY_0115).state.entries

    expect(daySeconds(entries, "2027-01-10", NOW_SEC)).toBe(90 * MINUTE)
    expect(daySeconds(entries, "2027-01-11", NOW_SEC)).toBe(75 * MINUTE)
  })
})

describe("the clock on the running row", () => {
  test("goes on counting through midnight instead of starting again from zero", () => {
    const shortlyAfter = wall(2027, 1, 11, 0, 0, 30)
    vi.setSystemTime(new Date(shortlyAfter))
    const state = withTimerSince(wall(2027, 1, 10, 23, 59, 30))
    const view = render(<EntryList state={state} setState={vi.fn()} nowSec={secondsOf(shortlyAfter)} pushToast={vi.fn()} onEditEntry={vi.fn()} />)

    expect(boxValues(view.container)).toContain("0:01:00")
  })

  test("sits under Today as well as under Yesterday, with an hour and a half on one and a quarter past on the other", () => {
    const state = withTimerSince(SUNDAY_2230)
    const view = render(<EntryList state={state} setState={vi.fn()} nowSec={NOW_SEC} pushToast={vi.fn()} onEditEntry={vi.fn()} />)

    const [today, yesterday] = dayHeaders(view.container)
    expect(today.title).toBe("Today")
    expect(today.text).toMatch(/^Today\s*1:15/)
    expect(yesterday.title).toBe("Yesterday")
    expect(yesterday.text).toMatch(/^Yesterday\s*1:30/)
  })

  test("reads two hours and three quarters on its own row", () => {
    const state = withTimerSince(SUNDAY_2230)
    const view = render(<EntryList state={state} setState={vi.fn()} nowSec={NOW_SEC} pushToast={vi.fn()} onEditEntry={vi.fn()} />)

    expect(boxValues(view.container)).toContain("2:45:00")
  })
})
