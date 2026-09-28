/**
 * THE MEETING THAT HAS RUN FOR ELEVEN YEARS IS THE ONE THAT VANISHED.
 *
 * `expandRecurrence` walked one STEP per iteration from DTSTART, with a guard of
 * `maxInstances * 4` = 1,600 iterations. For `FREQ=DAILY` a step is one day, so it
 * covered about four and a half years and anything older ran out of guard before the
 * cursor reached the import window.
 *
 * Measured with a 60-day-back window around 2026-09-28: a daily rule from 2015-01-05
 * produced ZERO instances; the same rule from 2026-01-05 produced 91. The cliff sat
 * at 1,671 days.
 *
 * And the message made it worse. `SettingsView` reports "Imported 0 events (skipped 1
 * outside the date window)", which is false — the standup is happening today — and it
 * sends the person to widen a window that is already wide enough.
 *
 * `FREQ=WEEKLY` steps a week, so it reached about thirty years and was never the
 * reported case; MONTHLY and YEARLY reach 133 and 1,600 years. The fix is arithmetic
 * rather than a bigger guard, because a bigger guard is the same cliff further away.
 */

import { describe, expect, test } from "vitest"

import { expandRecurrence } from "@/src/timetrack/calendarService"

/** The shape `parseIcs` hands to `expandRecurrence`. */
function event(startIso: string, rrule: string, minutes = 30) {
  return {
    uid: "standup",
    summary: "Standup",
    start: startIso,
    end: new Date(new Date(startIso).getTime() + minutes * 60_000).toISOString(),
    rrule,
    exdates: [] as string[],
    allDay: false,
  } as never as Parameters<typeof expandRecurrence>[0]
}

const WINDOW_START = new Date(2026, 6, 30, 0, 0, 0)
const WINDOW_END = new Date(2026, 9, 28, 0, 0, 0)

describe("a daily recurring meeting", () => {
  test("imports whether it started this year or eleven years ago", () => {
    const thisYear = expandRecurrence(event("2026-01-05T09:00:00.000Z", "FREQ=DAILY"), WINDOW_START, WINDOW_END)
    const elevenYearsAgo = expandRecurrence(event("2015-01-05T09:00:00.000Z", "FREQ=DAILY"), WINDOW_START, WINDOW_END)

    expect(thisYear.length, "the recent rule produced nothing, so this test asserts nothing").toBeGreaterThan(30)
    expect(elevenYearsAgo.length, "the older rule produced nothing — the oldest meeting is the one that vanishes").toBe(
      thisYear.length,
    )
  })

  test.each([500, 1000, 1671, 2000, 4000])("has no cliff at %i days back", (daysBack) => {
    /**
     * Across the old boundary deliberately: 1,671 days was where it was measured to
     * fail, so a fix that moved the cliff rather than removing it fails here.
     */
    const start = new Date(WINDOW_START.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const instances = expandRecurrence(event(start.toISOString(), "FREQ=DAILY"), WINDOW_START, WINDOW_END)
    expect(instances.length, `${daysBack} days back gave ${instances.length} instances`).toBeGreaterThan(30)
  })

  test("and every instance it returns is inside the window", () => {
    const instances = expandRecurrence(event("2015-01-05T09:00:00.000Z", "FREQ=DAILY"), WINDOW_START, WINDOW_END)
    for (const i of instances) {
      expect(new Date(i.start).getTime(), `${i.start} is outside the window`).toBeLessThanOrEqual(WINDOW_END.getTime())
      expect(new Date(i.end).getTime()).toBeGreaterThanOrEqual(WINDOW_START.getTime())
    }
  })

  test("keeps its time of day across a clock change", () => {
    /**
     * Skipping ahead uses `setDate`, which keeps the wall clock — which is what a
     * recurring 09:00 meeting means. Stepping by milliseconds would drift by an hour
     * at the boundary. `vitest.config.ts` pins Europe/Copenhagen, which has one.
     */
    const at9 = new Date(2024, 0, 8, 9, 0, 0) // a local 09:00, before the change
    const instances = expandRecurrence(event(at9.toISOString(), "FREQ=DAILY"), WINDOW_START, WINDOW_END)
    expect(instances.length).toBeGreaterThan(30)
    const hours = new Set(instances.map((i) => new Date(i.start).getHours()))
    expect(hours, `the meeting drifted to ${[...hours].join(", ")}`).toEqual(new Set([9]))
  })
})

describe("a COUNT rule that ran out before the window", () => {
  test("returns nothing, rather than pretending it has occurrences left", () => {
    /**
     * Skipping steps has to advance the occurrence count too, or a rule with
     * `COUNT=10` that finished years ago would emit ten fresh instances inside the
     * window — a fix that turns a disappearance into an invention.
     */
    const instances = expandRecurrence(
      event("2015-01-05T09:00:00.000Z", "FREQ=DAILY;COUNT=10"),
      WINDOW_START,
      WINDOW_END,
    )
    expect(instances, `${instances.length} instances invented for a rule that ended in 2015`).toHaveLength(0)
  })

  test("and a COUNT rule with occurrences still to come returns them", () => {
    const start = new Date(WINDOW_START.getTime() - 5 * 24 * 60 * 60 * 1000)
    const instances = expandRecurrence(event(start.toISOString(), "FREQ=DAILY;COUNT=20"), WINDOW_START, WINDOW_END)
    expect(instances.length).toBeGreaterThan(0)
    expect(instances.length).toBeLessThanOrEqual(20)
  })
})

describe("a weekly rule", () => {
  test("still lands on the weekdays it names, however old it is", () => {
    const instances = expandRecurrence(
      event("2015-01-05T09:00:00.000Z", "FREQ=WEEKLY;BYDAY=MO,WE,FR"),
      WINDOW_START,
      WINDOW_END,
    )
    expect(instances.length).toBeGreaterThan(10)
    const weekdays = new Set(instances.map((i) => new Date(i.start).getDay()))
    expect(weekdays, `landed on ${[...weekdays].join(", ")} rather than Mon/Wed/Fri`).toEqual(new Set([1, 3, 5]))
  })
})
