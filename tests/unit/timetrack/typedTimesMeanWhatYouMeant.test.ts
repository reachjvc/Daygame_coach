/**
 * A TYPED TIME MEANS THE NEAREST SENSIBLE TIME (plan D10).
 *
 * Three misreadings, each confirmed by running the code on 2026-11-03:
 *
 *   - "1h30" was 1:00:00. The 30 was read past and dropped.
 *   - "4p" was 04:00 in the morning. Only "am"/"pm" were looked for.
 *   - With a 10:00 start, an end of "9" made a 23-hour entry, and "3" or "3p"
 *     a 17-hour one. A bare hour was read on the 24-hour clock, and an hour
 *     already gone by today became tomorrow.
 *
 * The rule now, for an END: a bare hour from 1 to 12 ("9", "3") is whichever
 * of h and h+12 comes first at or after the start. Anything typed with minutes,
 * a leading zero or am/pm ("09:00", "0900", "930", "3p") is that exact clock
 * time, on the first day it is not before the start — and the screens ask
 * before writing anything that comes out longer than 12 hours (see
 * aTwentyThreeHourEntryAsksFirst.test.tsx).
 */

import { describe, expect, test } from "vitest"

import { parseDurationInput, parseEndTimeInput, parseTimeInput } from "@/src/timetrack/timetrackFormatService"

/** Local wall-clock times in November 2026, so the test reads the same in any zone */
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).toISOString()
const DAY = "2026-11-03"
const clock = (iso: string | null) => (iso ? new Date(iso).toTimeString().slice(0, 5) : null)

describe("a duration", () => {
  test("1h30 is an hour and a half, not an hour", () => {
    expect(parseDurationInput("1h30")).toBe(5400)
  })

  test("and the same with a space, or two digits of hours", () => {
    expect(parseDurationInput("1h 30")).toBe(5400)
    expect(parseDurationInput("2h15")).toBe(8100)
  })

  test("a bare number after minutes is seconds", () => {
    expect(parseDurationInput("5m30")).toBe(330)
  })

  test("what already worked still works", () => {
    expect(parseDurationInput("1h30m")).toBe(5400)
    expect(parseDurationInput("90")).toBe(5400)
    expect(parseDurationInput("1.5")).toBe(5400)
    expect(parseDurationInput("1:30")).toBe(5400)
    expect(parseDurationInput("2h")).toBe(7200)
  })
})

describe("a time of day", () => {
  test("4p is four in the afternoon", () => {
    expect(clock(parseTimeInput("4p", DAY))).toBe("16:00")
  })

  test("and the other short forms read the same way", () => {
    expect(clock(parseTimeInput("3p", DAY))).toBe("15:00")
    expect(clock(parseTimeInput("8a", DAY))).toBe("08:00")
    expect(clock(parseTimeInput("4:30p", DAY))).toBe("16:30")
    expect(clock(parseTimeInput("9 p.m.", DAY))).toBe("21:00")
  })

  test("12a is midnight and 12p is noon", () => {
    expect(clock(parseTimeInput("12a", DAY))).toBe("00:00")
    expect(clock(parseTimeInput("12p", DAY))).toBe("12:00")
  })

  test("what already worked still works", () => {
    expect(clock(parseTimeInput("9pm", DAY))).toBe("21:00")
    expect(clock(parseTimeInput("1:45 pm", DAY))).toBe("13:45")
    expect(clock(parseTimeInput("12:30 am", DAY))).toBe("00:30")
    expect(clock(parseTimeInput("1345", DAY))).toBe("13:45")
    // a start is not guessed at: "9" on its own is nine in the morning
    expect(clock(parseTimeInput("9", DAY))).toBe("09:00")
  })
})

describe("an end typed after a 10:00 start", () => {
  const START = at(3, 10)

  test("9 is 21:00 the same evening, not 09:00 tomorrow", () => {
    expect(parseEndTimeInput("9", START)).toBe(at(3, 21))
  })

  test("3 and 3p are 15:00, not three in the morning", () => {
    expect(parseEndTimeInput("3", START)).toBe(at(3, 15))
    expect(parseEndTimeInput("3p", START)).toBe(at(3, 15))
  })

  test("11 is 11:00, an hour later, as before", () => {
    expect(parseEndTimeInput("11", START)).toBe(at(3, 11))
  })

  test("12 is noon", () => {
    expect(parseEndTimeInput("12", START)).toBe(at(3, 12))
  })

  test("09:00, 0900 and 930 are exact clock times, so they are tomorrow morning (and the screen asks)", () => {
    expect(parseEndTimeInput("09:00", START)).toBe(at(4, 9))
    expect(parseEndTimeInput("0900", START)).toBe(at(4, 9))
    expect(parseEndTimeInput("930", START)).toBe(at(4, 9, 30))
  })

  test("an hour from 13 up is never moved", () => {
    expect(parseEndTimeInput("13", START)).toBe(at(3, 13))
    expect(parseEndTimeInput("23", START)).toBe(at(3, 23))
  })
})

describe("an end typed after a 22:00 start", () => {
  const START = at(3, 22)

  test("1 is one in the morning, three hours on", () => {
    expect(parseEndTimeInput("1", START)).toBe(at(4, 1))
  })

  test("11 is 23:00 tonight", () => {
    expect(parseEndTimeInput("11", START)).toBe(at(3, 23))
  })

  test("12 is midnight, not noon tomorrow", () => {
    expect(parseEndTimeInput("12", START)).toBe(at(4, 0))
  })

  test("01:00 is the next morning, as before", () => {
    expect(parseEndTimeInput("01:00", START)).toBe(at(4, 1))
  })
})
