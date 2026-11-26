/**
 * TYPING A TIME ON THE NIGHT THE CLOCKS CHANGE (Europe/Copenhagen).
 *
 * Clock trap 2 of the Time Log test plan, the typed half. The drums refuse a
 * time that does not exist (`theDrumsReadTheClockOnTheWall`); the BOXES, where
 * a time is typed as "02:30", read it with the browser's own date maths. What
 * that does today is pinned here, so a change to it is a decision and not an
 * accident.
 *
 *   28 Mar 2027, 02:00 -> 03:00: 02:30 does not exist.
 *     Today a typed 02:30 becomes 03:30, silently. (The drums say "refused".)
 *   31 Oct 2027, 03:00 -> 02:00: 02:30 happens twice.
 *     Today a typed 02:30 is the FIRST one, in summer time.
 *
 * One reading is a real fault and is kept as `it.fails`: a start typed in the
 * second 02:30, and an end of 02:45, reads the FIRST 02:45, which is before the
 * start, so it becomes 02:45 the next day (24 h 15 min instead of 15 min).
 */

import { describe, expect, it, test } from "vitest"

import {
  formatTimeOfDay,
  fromLocalInputValue,
  lengthQuestion,
  parseEndTimeInput,
  parseStartTimeInput,
  parseTimeInput,
  toLocalInputValue,
} from "@/src/timetrack/timetrackFormatService"
import { typedIntoPair } from "@/src/timetrack/drumService"

import { freezeClockAt, hoursInDay, secondsOf, wall } from "./clockTraps"

const SPRING = "2027-03-28"
const AUTUMN = "2027-10-31"
/** two days on, so nothing typed here is in the future of anything */
freezeClockAt(() => wall(2027, 11, 2, 12))

/** the clock on the wall for an instant, hh:mm */
const onTheWall = (iso: string) => formatTimeOfDay(iso)

describe("the zone", () => {
  test("is pinned: 28 March 2027 has 23 hours and 31 October 2027 has 25", () => {
    expect([hoursInDay(2027, 3, 28), hoursInDay(2027, 10, 31)]).toEqual([23, 25])
  })
})

describe("28 March 2027, the night 02:30 does not exist", () => {
  test("a start typed as 02:30 is 03:30", () => {
    expect(onTheWall(parseTimeInput("02:30", SPRING)!)).toBe("03:30")
  })

  test("a date-and-time box set to 02:30 is 03:30", () => {
    expect(onTheWall(fromLocalInputValue("2027-03-28T02:30")!)).toBe("03:30")
  })

  test("an end typed as 02:30 after a 01:30 start makes a one-hour entry ending 03:30", () => {
    const start = wall(2027, 3, 28, 1, 30)
    const end = parseEndTimeInput("02:30", start)!
    expect(onTheWall(end)).toBe("03:30")
    expect(secondsOf(end) - secondsOf(start)).toBe(3600)
  })

  test("a start typed as 02:30 on an entry that ends at 04:45 keeps the end", () => {
    const pair = { start: wall(2027, 3, 28, 1, 0), stop: wall(2027, 3, 28, 4, 45) }
    const typed = typedIntoPair(pair, "start", "02:30", wall(2027, 3, 29, 12))!
    expect(typed.stop).toBe(pair.stop)
    expect(onTheWall(typed.start)).toBe("03:30")
  })

  test("03:00 and 01:59 are what they say", () => {
    expect([onTheWall(parseTimeInput("03:00", SPRING)!), onTheWall(parseTimeInput("01:59", SPRING)!)]).toEqual(["03:00", "01:59"])
  })
})

describe("31 October 2027, the night 02:30 happens twice", () => {
  const firstTwoThirty = "2027-10-31T00:30:00.000Z"
  const secondTwoThirty = "2027-10-31T01:30:00.000Z"

  test("a start typed as 02:30 is the first one, in summer time", () => {
    expect(parseTimeInput("02:30", AUTUMN)).toBe(firstTwoThirty)
  })

  test("a date-and-time box set to 02:30 is the first one", () => {
    expect(fromLocalInputValue("2027-10-31T02:30")).toBe(firstTwoThirty)
  })

  test("an end typed as 02:30 after a 01:30 start is the first 02:30, an hour later", () => {
    const start = wall(2027, 10, 31, 1, 30)
    const end = parseEndTimeInput("02:30", start)!
    expect(end).toBe(firstTwoThirty)
    expect(secondsOf(end) - secondsOf(start)).toBe(3600)
  })

  test("an end typed as 03:30 after a 01:30 start is three real hours later", () => {
    const start = wall(2027, 10, 31, 1, 30)
    expect(secondsOf(parseEndTimeInput("03:30", start)!) - secondsOf(start)).toBe(3 * 3600)
  })

  test("a box that shows only the clock cannot tell the two 02:30s apart: the second reads back as the first", () => {
    expect(toLocalInputValue(secondTwoThirty)).toBe("2027-10-31T02:30")
    expect(fromLocalInputValue(toLocalInputValue(secondTwoThirty))).toBe(firstTwoThirty)
  })

  test("a start typed as 03:00 on a 01:00-to-05:00 entry keeps the end", () => {
    const pair = { start: wall(2027, 10, 31, 1, 0), stop: wall(2027, 10, 31, 5, 0) }
    const typed = typedIntoPair(pair, "start", "03:00", wall(2027, 11, 2, 12))!
    expect(typed.stop).toBe(pair.stop)
    expect(onTheWall(typed.start)).toBe("03:00")
  })

  // BUG (real, rare): the typed end reads the first 02:45, before the second-02:30 start, so it rolls to the next day
  it.fails("an end typed as 02:45 after a start in the second 02:30 is 15 minutes later, not a day and 15 minutes", () => {
    const end = parseEndTimeInput("02:45", secondTwoThirty)!
    expect(secondsOf(end) - secondsOf(secondTwoThirty)).toBe(15 * 60)
  })

  test("today that reading makes a 24 h 15 min entry, and the screens ask before writing it", () => {
    const end = parseEndTimeInput("02:45", secondTwoThirty)!
    const seconds = secondsOf(end) - secondsOf(secondTwoThirty)
    expect(seconds).toBe(24 * 3600 + 15 * 60)
    expect(lengthQuestion(seconds)).toBe("long")
  })

  test("a start typed as 02:15 on an entry that began at 00:30 stays on that day", () => {
    const start = wall(2027, 10, 31, 0, 30)
    const end = secondsOf(wall(2027, 10, 31, 4, 0))
    const typed = parseStartTimeInput("02:15", start, new Date(end * 1000).toISOString())!
    expect(onTheWall(typed)).toBe("02:15")
    expect(typed.slice(0, 10)).toBe("2027-10-31")
  })
})
