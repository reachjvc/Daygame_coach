/**
 * THE DRUMS READ THE CLOCK ON THE WALL (Phase 5 of Plans/time-tracker-like-toggl.md).
 *
 * The owner picked scrolling drums, [day][hour][minute], and asked what happens
 * across days (Q1 and its 11 scenarios). The drums show a wall clock, and a
 * stored entry is an instant, so everything here is the step between the two:
 * a drum value to a time and back, across midnight, across the two nights a
 * year the clock jumps, in 12-hour mode, and an end set before its start.
 *
 * The suite runs in Europe/Copenhagen (vitest.config.ts), the zone the app is
 * used in. In 2026 the clocks go forward on 29 March (02:00 becomes 03:00, so
 * 02:30 never happens) and back on 25 October (03:00 becomes 02:00, so 02:30
 * happens twice).
 */

import { describe, expect, test } from "vitest"

import {
  DAYS_EACH_WAY,
  dayChoices,
  dayLabel,
  dayRefused,
  fromTwelve,
  hourExists,
  hourLabels,
  hourRefused,
  instantsAt,
  lengthLine,
  mendEnd,
  minuteRefused,
  momentOf,
  moveDrum,
  nudgePair,
  partsOf,
  readPair,
  repeatedHour,
  toTwelve,
  typedIntoPair,
} from "@/src/timetrack/drumService"

const local = (month: number, day: number, h: number, m = 0, s = 0) => new Date(2026, month - 1, day, h, m, s, 0).toISOString()
const NOW = local(11, 4, 14, 30)
const OPEN = { earliest: null, latest: null }

describe("a drum value to a time, and back", () => {
  test("a moment reads as its day, hour and minute on the page's own clock, and those make the same moment again", () => {
    expect(partsOf(local(11, 4, 14, 30))).toEqual({ day: "2026-11-04", hour: 14, minute: 30 })
    expect(momentOf({ day: "2026-11-04", hour: 14, minute: 30 })).toBe(local(11, 4, 14, 30))
  })

  test("the drums set whole minutes: the seconds of the moment they started from are dropped (scenario 10)", () => {
    expect(moveDrum(local(11, 4, 14, 30, 25), { minute: 31 }, OPEN)).toBe(local(11, 4, 14, 31))
  })

  test("turning the day drum keeps the clock time: 23:50 today, one day back, is 23:50 yesterday", () => {
    expect(moveDrum(local(11, 4, 23, 50), { day: "2026-11-03" }, OPEN)).toBe(local(11, 3, 23, 50))
  })
})

describe("across midnight", () => {
  test("yesterday 22:30 to today 01:15 is 2:45, and says it ends the next day (scenario 2)", () => {
    const start = momentOf({ day: "2026-11-03", hour: 22, minute: 30 })!
    const stop = momentOf({ day: "2026-11-04", hour: 1, minute: 15 })!
    const reading = readPair(start, stop, NOW)

    expect(reading.seconds).toBe(2 * 3600 + 45 * 60)
    expect(reading.laterDays).toBe(1)
    expect(reading.endsBeforeStart).toBe(false)
    expect(lengthLine(reading, "improved")).toBe("2:45 · ends next day")
  })

  test("a timer forgotten over a weekend, Friday 17:00 to Sunday 10:00, says how many days later it ends (scenario 5)", () => {
    const reading = readPair(local(10, 30, 17, 0), local(11, 1, 10, 0), NOW)

    expect(reading.long).toBe(true)
    expect(lengthLine(reading, "improved")).toBe("41:00 · ends 2 days later")
  })

  test("a day's own fix, 09:00 to 11:55, is just its length (scenario 1)", () => {
    expect(lengthLine(readPair(local(11, 4, 9, 0), local(11, 4, 11, 55), NOW), "improved")).toBe("2:55")
  })
})

describe("the night the clocks go back (last Sunday of October)", () => {
  test("02:30 happens twice that night, an hour apart", () => {
    expect(instantsAt({ day: "2026-10-25", hour: 2, minute: 30 })).toEqual(["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"])
    expect(repeatedHour("2026-10-25T00:30:00.000Z")).toBe("first")
    expect(repeatedHour("2026-10-25T01:30:00.000Z")).toBe("second")
    expect(repeatedHour(local(10, 25, 4, 0))).toBeNull()
  })

  test("the drums stay in the 02:00 you are in: the minute drum never jumps an hour", () => {
    // first 02:45 (summer time) to 02:30 is the first 02:30, the second to the second
    expect(moveDrum("2026-10-25T00:45:00.000Z", { minute: 30 }, OPEN)).toBe("2026-10-25T00:30:00.000Z")
    expect(moveDrum("2026-10-25T01:45:00.000Z", { minute: 30 }, OPEN)).toBe("2026-10-25T01:30:00.000Z")
  })

  test("coming down from 03:10 reaches the second 02:10, and coming up from 01:50 the first 02:50", () => {
    expect(moveDrum(local(10, 25, 3, 10), { hour: 2 }, OPEN)).toBe("2026-10-25T01:10:00.000Z")
    expect(moveDrum(local(10, 25, 1, 50), { hour: 2 }, OPEN)).toBe("2026-10-25T00:50:00.000Z")
  })

  test("01:30 to 03:30 that night is three hours, not two, and midnight to midnight is 25", () => {
    expect(readPair(local(10, 25, 1, 30), local(10, 25, 3, 30), NOW).seconds).toBe(3 * 3600)
    expect(lengthLine(readPair(local(10, 25, 0, 0), local(10, 26, 0, 0), NOW), "improved")).toBe("25:00 · ends next day")
  })
})

describe("the night the clocks go forward (last Sunday of March)", () => {
  test("02:30 does not happen that night: refused, not quietly moved to 03:30", () => {
    expect(instantsAt({ day: "2026-03-29", hour: 2, minute: 30 })).toEqual([])
    expect(momentOf({ day: "2026-03-29", hour: 2, minute: 30 })).toBeNull()
    expect(moveDrum(local(3, 29, 1, 30), { hour: 2 }, OPEN)).toBeNull()
  })

  test("the missing hour is greyed on that day only", () => {
    expect(hourExists("2026-03-29", 2)).toBe(false)
    expect(hourRefused("2026-03-29", 2, OPEN)).toBe(true)
    expect(hourRefused("2026-03-28", 2, OPEN)).toBe(false)
    expect(hourRefused("2026-03-29", 3, OPEN)).toBe(false)
  })

  test("01:30 to 03:30 that night is one hour", () => {
    expect(readPair(local(3, 29, 1, 30), local(3, 29, 3, 30), NOW).seconds).toBe(3600)
  })
})

describe("12-hour mode (scenario 9)", () => {
  test("the hour drum reads 12, 1 … 11, and the AM/PM drum says which half", () => {
    expect(hourLabels("h12")).toEqual(["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"])
    expect(hourLabels("h24")).toHaveLength(24)
    expect(hourLabels("h24")[0]).toBe("00")
    expect(hourLabels("h24")[23]).toBe("23")
  })

  test("12 AM is midnight, 12 PM is noon, and 1 PM is 13:00, both ways", () => {
    expect(toTwelve(0)).toEqual({ index: 0, pm: false })
    expect(toTwelve(12)).toEqual({ index: 0, pm: true })
    expect(toTwelve(13)).toEqual({ index: 1, pm: true })
    expect(toTwelve(11)).toEqual({ index: 11, pm: false })
    expect(fromTwelve(0, false)).toBe(0)
    expect(fromTwelve(0, true)).toBe(12)
    expect(fromTwelve(1, true)).toBe(13)
    expect(fromTwelve(11, false)).toBe(11)
  })

  test("turning AM to PM on 9:15 AM is 9:15 PM", () => {
    expect(moveDrum(local(11, 4, 9, 15), { hour: fromTwelve(toTwelve(9).index, true) }, OPEN)).toBe(local(11, 4, 21, 15))
  })
})

describe("the day drum (scenario 4)", () => {
  test("runs from 14 days back to 14 days ahead", () => {
    const days = dayChoices("2026-11-04", "2026-11-04")
    expect(DAYS_EACH_WAY).toBe(14)
    expect(days).toHaveLength(29)
    expect(days[0]).toBe("2026-10-21")
    expect(days[28]).toBe("2026-11-18")
  })

  test("is named Yesterday, Today, Tomorrow, and then by weekday and date", () => {
    expect(dayLabel("2026-11-03", "2026-11-04")).toBe("Yesterday")
    expect(dayLabel("2026-11-04", "2026-11-04")).toBe("Today")
    expect(dayLabel("2026-11-05", "2026-11-04")).toBe("Tomorrow")
    expect(dayLabel("2026-10-30", "2026-11-04")).toBe("Fri 30 Oct")
    expect(dayLabel("2025-12-31", "2026-01-05")).toBe("Wed 31 Dec 2025")
  })

  test("an entry older than that still finds its own day on the drum", () => {
    const days = dayChoices("2026-11-04", "2026-09-01")
    expect(days[0]).toBe("2026-09-01")
    expect(days).toHaveLength(30)
  })
})

describe("a running timer's drums: after now is greyed and refused (scenario 7)", () => {
  const latest = local(11, 4, 14, 30, 25)
  const bounds = { earliest: local(11, 4, 9, 0, 40), latest }

  test("hours and days wholly after now, or before the timer began, are refused; the hour of now is not", () => {
    expect(hourRefused("2026-11-04", 15, bounds)).toBe(true)
    expect(hourRefused("2026-11-04", 14, bounds)).toBe(false)
    expect(hourRefused("2026-11-04", 9, bounds)).toBe(false)
    expect(hourRefused("2026-11-04", 8, bounds)).toBe(true)
    expect(dayRefused("2026-11-05", bounds)).toBe(true)
    expect(dayRefused("2026-11-04", bounds)).toBe(false)
    expect(dayRefused("2026-11-03", bounds)).toBe(true)
  })

  test("a minute after now is refused; the minute now is in is not", () => {
    expect(minuteRefused({ day: "2026-11-04", hour: 14, minute: 31 }, bounds)).toBe(true)
    expect(minuteRefused({ day: "2026-11-04", hour: 14, minute: 30 }, bounds)).toBe(false)
    expect(minuteRefused({ day: "2026-11-04", hour: 9, minute: 0 }, bounds)).toBe(false)
  })

  test("an hour that would carry the minute past now lands on now, and one before the start on the start", () => {
    expect(moveDrum(local(11, 4, 13, 45), { hour: 14 }, bounds)).toBe(latest)
    expect(moveDrum(local(11, 4, 10, 0), { hour: 9 }, bounds)).toBe(local(11, 4, 9, 0, 40))
  })
})

describe("an end before its start (scenario 6)", () => {
  test("Today 14:00 to Today 13:00 ends before it starts, and is not rolled to tomorrow by itself", () => {
    const reading = readPair(local(11, 4, 14, 0), local(11, 4, 13, 0), NOW)
    expect(reading.endsBeforeStart).toBe(true)
    expect(lengthLine(reading, "improved")).toBe("Ends before it starts")
  })

  test("its one-tap mend is End next day: 13:00 tomorrow", () => {
    expect(mendEnd(local(11, 4, 14, 0), local(11, 4, 13, 0))).toEqual({ stop: local(11, 5, 13, 0), label: "End next day" })
  })

  test("an end left on an earlier day, at a later clock time, mends to the start's own day", () => {
    expect(mendEnd(local(11, 4, 9, 0), local(11, 3, 10, 0))).toEqual({ stop: local(11, 4, 10, 0), label: "End same day" })
  })

  test("an end after its start needs no mend", () => {
    expect(mendEnd(local(11, 4, 9, 0), local(11, 4, 10, 0))).toBeNull()
  })
})

describe("a planned entry (Q2)", () => {
  test("tomorrow 10:00 to 11:30 reads as planned", () => {
    const reading = readPair(local(11, 5, 10, 0), local(11, 5, 11, 30), NOW)
    expect(reading.planned).toBe(true)
    expect(lengthLine(reading, "improved")).toBe("1:30 · planned")
  })

  test("one that has begun is not", () => {
    expect(readPair(local(11, 4, 14, 0), local(11, 4, 15, 0), NOW).planned).toBe(false)
  })
})

describe("the boxes and ± buttons on a pair the drums have not saved yet", () => {
  const pair = { start: local(11, 3, 22, 30), stop: local(11, 4, 10, 0) }

  test("a typed end is read after the pair's own start: 0115 after yesterday 22:30 is 01:15 today", () => {
    expect(typedIntoPair(pair, "stop", "0115", NOW)).toEqual({ ...pair, stop: local(11, 4, 1, 15) })
  })

  test("a typed start keeps the end", () => {
    expect(typedIntoPair(pair, "start", "2300", NOW)).toEqual({ ...pair, start: local(11, 3, 23, 0) })
  })

  test("a typed duration moves the end", () => {
    expect(typedIntoPair(pair, "duration", "2:45", NOW)).toEqual({ ...pair, stop: local(11, 4, 1, 15) })
  })

  test("a new day moves both ends and keeps the length", () => {
    expect(typedIntoPair(pair, "day", "2026-11-01", NOW)).toEqual({ start: local(11, 1, 22, 30), stop: local(11, 2, 10, 0) })
  })

  test("something unreadable is no edit", () => {
    expect(typedIntoPair(pair, "stop", "soon", NOW)).toBeNull()
  })

  test("±5 moves one end", () => {
    expect(nudgePair(pair, "start", -300)).toEqual({ ...pair, start: local(11, 3, 22, 25) })
    expect(nudgePair(pair, "stop", 300)).toEqual({ ...pair, stop: local(11, 4, 10, 5) })
  })
})
