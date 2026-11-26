// @vitest-environment jsdom
/**
 * THE NIGHT THE CLOCKS CHANGE IS 23 OR 25 REAL HOURS, AND EVERY SCREEN SAYS SO.
 *
 * Clock trap 2 of the Time Log test plan, in Europe/Copenhagen, the zone the
 * app is used in. The calendar and the list are built from local midnights,
 * and the clock on the wall jumps:
 *   - 28 Mar 2027: 02:00 becomes 03:00, so the day has 23 hours;
 *   - 31 Oct 2027: 03:00 becomes 02:00, so the day has 25 hours;
 *   - 25 Oct 2026: the same autumn change, a Sunday that has already happened.
 *
 * Already pinned elsewhere, not repeated: the drums on the night
 * (`theDrumsReadTheClockOnTheWall`), a block dragged across it
 * (`aDraggedBlockLandsUnderTheFingerOnAClockChange`), one entry's calendar
 * column on 25 Oct 2026 (`aDayTotalsTheSecondsItTracked`), a move to another
 * day over it (`aForgottenTimerEndsWhereTheWorkDid`) and the 6 h alert
 * (`theSixHourAlertRingsOnceAndWaitsForMorning`). Typing a time on the night
 * is in `typingATimeOnTheNightTheClocksChange`.
 *
 * What is pinned here: the real length of an entry across the switch, a
 * running timer across it, the day's total on every screen that shows one,
 * and a timer that has run "a day" over it.
 */

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { dayColumnSeconds, entryInterval } from "@/src/timetrack/calendarService"
import { EntryList } from "@/src/timetrack/components/EntryList"
import { formatDuration } from "@/src/timetrack/timetrackFormatService"
import { buildDayGroups, daySeconds, entrySeconds, weekTotalSeconds } from "@/src/timetrack/timetrackService"

import { boxValues, entryNamed, freezeClockAt, hoursInDay, secondsOf, stoppedAt, wall, withEntry, withTimerSince } from "./clockTraps"

const HOUR = 3600

interface Night {
  /** how the night is named in the test titles */
  name: string
  year: number
  month: number
  day: number
  /** the real length of the day, in hours */
  hours: 23 | 25
  /** real hours between 01:00 and 04:00 that morning */
  oneToFour: number
  /** real hours between 01:30 and 03:30 that morning */
  halfPastOneToHalfPastThree: number
}

const NIGHTS: Night[] = [
  { name: "28 March 2027, summer time begins", year: 2027, month: 3, day: 28, hours: 23, oneToFour: 2, halfPastOneToHalfPastThree: 1 },
  { name: "31 October 2027, summer time ends", year: 2027, month: 10, day: 31, hours: 25, oneToFour: 4, halfPastOneToHalfPastThree: 3 },
  { name: "25 October 2026, summer time ended", year: 2026, month: 10, day: 25, hours: 25, oneToFour: 4, halfPastOneToHalfPastThree: 3 },
]

const key = (n: Night, dayOffset = 0) => {
  const d = new Date(n.year, n.month - 1, n.day + dayOffset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const at = (n: Night, h: number, m = 0, dayOffset = 0) => wall(n.year, n.month, n.day + dayOffset, h, m)
/** a quiet afternoon two days on: nothing is running or planned */
const looking = (n: Night) => at(n, 15, 0, 2)

freezeClockAt(() => wall(2027, 1, 1, 12))
afterEach(cleanup)

describe.each(NIGHTS)("on $name", (night) => {
  const nowSec = () => secondsOf(looking(night))
  const showList = (state: ReturnType<typeof withEntry>, now = nowSec()) =>
    render(<EntryList state={state} setState={vi.fn()} nowSec={now} pushToast={vi.fn()} onEditEntry={vi.fn()} />)
  beforeEach(() => vi.setSystemTime(new Date(looking(night))))

  test("the zone is pinned: the day is as long as the clock change makes it", () => {
    expect(hoursInDay(night.year, night.month, night.day), "is TZ pinned to Europe/Copenhagen?").toBe(night.hours)
  })

  describe("an entry that spans the switch", () => {
    test("has the real elapsed length from 01:00 to 04:00, not the wall-clock three hours", () => {
      const state = withEntry(at(night, 1), at(night, 4), "Span")
      expect(entryNamed(state, "Span").duration).toBe(night.oneToFour * HOUR)
    })

    test("shows that real length on its row in the list", () => {
      const view = showList(withEntry(at(night, 1), at(night, 4), "Span"))
      expect(boxValues(view.container)).toContain(formatDuration(night.oneToFour * HOUR))
    })

    test("is drawn in the calendar from 01:00 to 04:00 on the wall, and totalled in real time", () => {
      const state = withEntry(at(night, 1), at(night, 4), "Span")
      const span = entryNamed(state, "Span")
      expect(entryInterval(span, key(night), nowSec())).toEqual({ startMin: 60, endMin: 240 })
      expect(dayColumnSeconds(state.entries, key(night), nowSec())).toBe(night.oneToFour * HOUR)
    })
  })

  describe("the day's total", () => {
    const wholeDay = () => withEntry(at(night, 0), at(night, 0, 0, 1), "Whole day")

    test("for an entry from midnight to midnight is the real length of the day", () => {
      expect(daySeconds(wholeDay().entries, key(night), nowSec())).toBe(night.hours * HOUR)
    })

    test("is the same in the calendar's column", () => {
      expect(dayColumnSeconds(wholeDay().entries, key(night), nowSec())).toBe(night.hours * HOUR)
    })

    test("is the same in the list's day header", () => {
      const group = buildDayGroups(wholeDay().entries, { groupSimilar: false, nowSec: nowSec() }).find((g) => g.date === key(night))
      expect(group?.totalSeconds).toBe(night.hours * HOUR)
    })

    test("is the same in the week total, and the day after it gets none of it", () => {
      const entries = wholeDay().entries
      expect(weekTotalSeconds(entries, key(night), 1, nowSec())).toBe(night.hours * HOUR)
      expect(daySeconds(entries, key(night, 1), nowSec())).toBe(0)
    })

    test("adds up work before and after the switch in real time", () => {
      let state = withEntry(at(night, 0, 30), at(night, 1, 30), "Before")
      state = withEntry(at(night, 3, 30), at(night, 5), "After", state)
      expect(daySeconds(state.entries, key(night), nowSec())).toBe(2.5 * HOUR)
    })

    test("is not touched by an ordinary hour the next day", () => {
      const state = withEntry(at(night, 9, 0, 1), at(night, 10, 0, 1), "Monday")
      expect(daySeconds(state.entries, key(night, 1), nowSec())).toBe(HOUR)
    })
  })

  describe("a timer running from 01:30", () => {
    const now = () => at(night, 3, 30)

    test("has run the real time at 03:30, not the wall-clock two hours", () => {
      vi.setSystemTime(new Date(now()))
      const timer = withTimerSince(at(night, 1, 30)).entries[0]
      expect(entrySeconds(timer, secondsOf(now()))).toBe(night.halfPastOneToHalfPastThree * HOUR)
    })

    test("reads that real time on its row", () => {
      vi.setSystemTime(new Date(now()))
      const view = showList(withTimerSince(at(night, 1, 30)), secondsOf(now()))
      expect(boxValues(view.container)).toContain(`${night.halfPastOneToHalfPastThree}:00:00`)
    })

    test("is stopped with the real time as its length", () => {
      const stopped = stoppedAt(withTimerSince(at(night, 1, 30)), now())
      expect(stopped.entry.duration).toBe(night.halfPastOneToHalfPastThree * HOUR)
    })

    test("adds that real time to the day's total while it runs", () => {
      const timer = withTimerSince(at(night, 1, 30))
      expect(daySeconds(timer.entries, key(night), secondsOf(now()))).toBe(night.halfPastOneToHalfPastThree * HOUR)
    })
  })

  describe("a timer that has run since noon the day before", () => {
    const dayBeforeNoon = () => at(night, 12, 0, -1)
    const noon = () => at(night, 12, 0)
    /** from noon to noon across the switch: 23 or 25 hours, never 24 */
    test("reads the real hours of that day, not 24:00:00", () => {
      vi.setSystemTime(new Date(noon()))
      const view = showList(withTimerSince(dayBeforeNoon()), secondsOf(noon()))
      expect(boxValues(view.container)).toContain(`${night.hours}:00:00`)
    })

    test("puts twelve hours on the day before and the rest on the night's own day", () => {
      const entries = withTimerSince(dayBeforeNoon()).entries
      expect(daySeconds(entries, key(night, -1), secondsOf(noon()))).toBe(12 * HOUR)
      expect(daySeconds(entries, key(night), secondsOf(noon()))).toBe((night.hours - 12) * HOUR)
    })
  })
})
