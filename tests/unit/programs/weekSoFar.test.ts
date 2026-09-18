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
import { weekSoFar } from "@/src/programs/programsService"

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
