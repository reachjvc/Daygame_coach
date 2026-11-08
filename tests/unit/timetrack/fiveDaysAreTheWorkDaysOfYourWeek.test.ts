/**
 * "5 DAYS" IS THE WORK DAYS OF THE WEEK YOU ARE LOOKING AT, BY YOUR WEEK START
 * (Phase 8 heavy-history audit of Plans/toggl-parity.md).
 *
 * The calendar's 5 days view always took the Monday on or before the day
 * shown. With weeks starting on Sunday, Day view stepped back to Sunday 1 Nov
 * and then "5 days" showed Mon 26 – Fri 30 Oct, while the week row above said
 * "This week" with this week's total. Saturday starts did the same. Now 5 days
 * is Monday to Friday of the person's own week holding that day.
 */

import { describe, expect, test } from "vitest"

import { calendarDays } from "@/src/timetrack/calendarService"

describe("the calendar's days", () => {
  test("5 days, weeks from Sunday: Sunday 1 Nov is in the week of Mon 2 – Fri 6 Nov", () => {
    expect(calendarDays("workweek", "2026-11-01", 0)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"])
  })

  test("5 days, weeks from Saturday: Saturday 31 Oct is in the week of Mon 2 – Fri 6 Nov", () => {
    expect(calendarDays("workweek", "2026-10-31", 6)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"])
  })

  test("5 days, weeks from Monday: as before", () => {
    expect(calendarDays("workweek", "2026-11-08", 1)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"])
  })

  test("a week and a day are as they were", () => {
    expect(calendarDays("week", "2026-11-01", 0)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"])
    expect(calendarDays("day", "2026-11-01", 0)).toEqual(["2026-11-01"])
  })
})
