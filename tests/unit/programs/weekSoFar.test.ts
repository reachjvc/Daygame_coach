/**
 * WHOSE WEEK, AND WHOSE TODAY.
 *
 * The week strip worked out what day it was from the phone's clock, and which
 * days had been trained from the phone's zone. The session card beside it was
 * decided on the server from the ACCOUNT's zone. Two answers to "what day is
 * it" on one screen — and on a phone whose zone differs from the account's,
 * they name different days: the strip lit Wednesday while the card prescribed
 * Tuesday's session.
 *
 * Every test here fixes the instant and varies only the zone, because the bug
 * is invisible to any test that runs in one zone. If these ever pass by
 * accident, it is because both sides agreed — which is what two zones exist to
 * rule out.
 */

import { describe, it, expect } from "vitest"
import { weekSoFar, formatDateOnly } from "@/src/programs/programsService"

/** Monday midday UTC. Tuesday 00:00 in Auckland (UTC+12), Monday 13:00 in London. */
const MONDAY_MIDDAY = new Date("2026-09-14T12:00:00.000Z")

describe("which days of this week were trained", () => {
  it("a Sunday-night workout is this week in Auckland and last week in London", () => {
    // 2026-09-13T12:30Z: Monday 14 September at 00:30 in Auckland, and still
    // Sunday afternoon in London. Both places call the week "the one starting
    // Monday 14" — so this single session is inside it in one and outside it
    // in the other. One list, two right answers, and the old code had no way
    // to give either because it asked the phone.
    const logs = [{ logged_at: "2026-09-13T12:30:00.000Z" }]

    const auckland = weekSoFar(logs, "Pacific/Auckland", MONDAY_MIDDAY)
    const london = weekSoFar(logs, "Europe/London", MONDAY_MIDDAY)

    // Auckland has rolled into Tuesday, and that session was its Monday.
    expect(auckland.todayWeekday).toBe(2)
    expect(auckland.trainedWeekdays).toEqual([1])

    // London is still on Monday, and the session belongs to the week before —
    // so the strip there shows nothing trained yet.
    expect(london.todayWeekday).toBe(1)
    expect(london.trainedWeekdays).toEqual([])
  })

  it("today's weekday comes from the account's zone, not the process's", () => {
    // One instant, four zones, four answers. Whatever the test runner's own
    // zone is, at most one of these can be it.
    const at = new Date("2026-09-14T11:00:00.000Z") // Monday midday UTC
    expect(weekSoFar([], "Pacific/Auckland", at).todayWeekday).toBe(1) // Mon 23:00
    expect(weekSoFar([], "UTC", at).todayWeekday).toBe(1)
    expect(weekSoFar([], "America/Los_Angeles", at).todayWeekday).toBe(1) // Mon 04:00

    // And the one that rolls over: Monday 00:30 UTC is still Sunday in LA.
    const justPastMidnight = new Date("2026-09-14T00:30:00.000Z")
    expect(weekSoFar([], "UTC", justPastMidnight).todayWeekday).toBe(1)
    expect(weekSoFar([], "America/Los_Angeles", justPastMidnight).todayWeekday).toBe(7)
  })

  it("leaves out last week entirely, so a strip can go back to empty", () => {
    // The fault this replaces handed the strip every weekday ever trained, so a
    // Monday trained once in July showed "done" every Monday afterwards.
    const now = new Date("2026-09-16T12:00:00.000Z") // Wednesday
    const logs = [
      { logged_at: "2026-09-09T12:00:00.000Z" }, // last Wednesday
      { logged_at: "2026-07-06T12:00:00.000Z" }, // a Monday in July
      { logged_at: "2026-09-14T12:00:00.000Z" }, // this Monday
    ]
    expect(weekSoFar(logs, "UTC", now).trainedWeekdays).toEqual([1])
  })

  it("counts a weekday once however many sessions it holds, in order", () => {
    const now = new Date("2026-09-18T12:00:00.000Z") // Friday
    const logs = [
      { logged_at: "2026-09-16T08:00:00.000Z" }, // Wed
      { logged_at: "2026-09-16T19:00:00.000Z" }, // Wed again
      { logged_at: "2026-09-14T08:00:00.000Z" }, // Mon
    ]
    expect(weekSoFar(logs, "UTC", now).trainedWeekdays).toEqual([1, 3])
  })

  it("a date it cannot read is left out rather than counted as today", () => {
    // Silently becoming NaN and then becoming "today" would mark a day green
    // that nobody trained. A value that cannot be read is not a training day.
    const now = new Date("2026-09-16T12:00:00.000Z")
    expect(weekSoFar([{ logged_at: "not a date" }], "UTC", now).trainedWeekdays).toEqual([])
  })

  it("includes the very first instant of the week and excludes the one before it", () => {
    const now = new Date("2026-09-16T12:00:00.000Z") // Wednesday, UTC
    const mondayMidnight = { logged_at: "2026-09-14T00:00:00.000Z" }
    const sundayLast = { logged_at: "2026-09-13T23:59:59.000Z" }
    expect(weekSoFar([mondayMidnight], "UTC", now).trainedWeekdays).toEqual([1])
    expect(weekSoFar([sundayLast], "UTC", now).trainedWeekdays).toEqual([])
  })
})

describe("the two fields the strip and the card both need", () => {
  it("says which zone it answered in, so a reader can tell", () => {
    // Without this the object is four numbers with no way to know whose
    // calendar produced them — which is how two screens came to disagree.
    const week = weekSoFar([], "Europe/Copenhagen", new Date("2026-09-16T10:00:00Z"))
    expect(week.timezone).toBe("Europe/Copenhagen")
  })

  it("names the Monday the week started on, as a date with no zone left in it", () => {
    // Wednesday 16 September 2026; the Monday before it is the 14th.
    const week = weekSoFar([], "Europe/Copenhagen", new Date("2026-09-16T10:00:00Z"))
    expect(week.weekStartedOn).toBe("2026-09-14")
  })

  it("answers 'trained today' itself, rather than leaving it to be re-derived", () => {
    // Derived anywhere else, it needs today's weekday again — and the place
    // most likely to ask for that is a component, from the phone's clock.
    const now = new Date("2026-09-16T10:00:00Z")
    expect(weekSoFar([], "Europe/Copenhagen", now).trainedToday).toBe(false)
    expect(
      weekSoFar([{ logged_at: "2026-09-16T06:00:00Z" }], "Europe/Copenhagen", now).trainedToday
    ).toBe(true)
    // Trained this week but not today is not "trained today".
    expect(
      weekSoFar([{ logged_at: "2026-09-14T06:00:00Z" }], "Europe/Copenhagen", now).trainedToday
    ).toBe(false)
  })

  it("a 23:45 Copenhagen session counts as today, not tomorrow", () => {
    // 21:45Z on the 16th is 23:45 in Copenhagen — still Wednesday there, and
    // the UTC date agrees; the 22:30Z one is already Thursday in Copenhagen.
    const now = new Date("2026-09-16T21:50:00Z")
    const week = weekSoFar([{ logged_at: "2026-09-16T21:45:00Z" }], "Europe/Copenhagen", now)
    expect(week.trainedToday).toBe(true)
    expect(week.trainedWeekdays).toEqual([3])
  })
})

describe("formatDateOnly", () => {
  it("prints the day it was given, never the day before", () => {
    /**
     * The whole point: `new Date("2026-09-14")` is midnight UTC, and a
     * formatter running west of London prints the 13th. Pinning UTC and
     * building the date at noon means no zone can move it.
     */
    expect(formatDateOnly("2026-09-14", "short")).toMatch(/14/)
    expect(formatDateOnly("2026-09-14", "short")).not.toMatch(/13/)
    expect(formatDateOnly("2026-01-01", "short")).toMatch(/1/)
    expect(formatDateOnly("2026-01-01", "short")).not.toMatch(/31/)
  })

  it("can say the weekday instead", () => {
    // 14 September 2026 is a Monday.
    expect(formatDateOnly("2026-09-14", "weekday")).toMatch(/Mon/)
  })

  it("hands back anything it cannot read, rather than printing a wrong date", () => {
    expect(formatDateOnly("not-a-date", "short")).toBe("not-a-date")
    expect(formatDateOnly("", "short")).toBe("")
  })
})
