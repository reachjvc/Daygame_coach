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

describe("whatever the rule says, across 1,700 shapes", () => {
  /**
   * The jump replaced a walk, and a jump is arithmetic where the walk was iteration —
   * so the way it goes wrong is off-by-one rather than obviously broken. Round 6 found
   * two such errors by running the new code against the old one over a few thousand
   * rules, and both were invisible to every example test above:
   *
   *   - the weekly branch emits, in DTSTART's own week, only the BYDAY weekdays at or
   *     after DTSTART — it skips the earlier ones WITHOUT counting them. Crediting the
   *     full `byDay.length` for that week ran a `COUNT` rule ahead and stopped it
   *     early: 36 events instead of 39 on `BYDAY=MO,WE,FR,SA;COUNT=90` from a
   *     Saturday, and three of the missing ones were in the future;
   *   - an instance that STARTS before the window can still END inside it, and the
   *     jump landed past it. A nightly 23:00–00:30 series lost its first event; a
   *     three-day recurring event loses three.
   *
   * Comparing against the old implementation is not something a permanent test can do,
   * so these are the properties that were violated, asserted over the same spread of
   * shapes. Each one failed for at least one shape before the fix.
   */
  const SHAPES = (() => {
    const out: { start: string; rule: string; minutes: number }[] = []
    /**
     * `UNTIL` IS IN HERE NOW, AND ITS ABSENCE IS WHY THIS FILE MISSED A LIVE BUG.
     *
     * The first version of this enumeration had no `UNTIL` and no `EXDATE` at all — so
     * it passed identically against the code before and after the `UNTIL` bound was
     * fixed, which means it said nothing about the very defect that followed. The
     * method was right and the enumeration stopped one rule part short, which is the
     * same failure as a stand-in one level up: the shape space IS the claim.
     *
     * The `UNTIL` forms matter individually: Google Calendar writes it as the end of
     * the last day in UTC for every "ends on <date>" repeat, and that is the form that
     * loses the most when the bound is tested against the wrong instant.
     */
    for (const freq of ["DAILY", "WEEKLY"]) {
      for (const interval of [1, 2, 3]) {
        for (const count of [null, 5, 40, 90]) {
          for (const until of [
            null,
            "20261021T215959Z", // end of a day, UTC — what Google writes
            "20261026T090000Z", // mid-morning
            "20260801T000000Z", // just inside the window
            "20260101T000000Z", // long before it
          ]) {
            for (const byday of freq === "WEEKLY" ? [null, "MO", "MO,WE,FR", "MO,WE,FR,SA", "SA,SU"] : [null]) {
              for (const minutes of [30, 90, 24 * 60, 3 * 24 * 60]) {
                for (const start of [
                  "2026-07-20T23:00:00.000Z", "2026-05-02T09:00:00.000Z", "2015-01-05T09:00:00.000Z",
                  "2026-08-15T07:30:00.000Z", "2024-01-08T09:00:00.000Z", "2026-09-27T12:00:00.000Z",
                  "2026-05-01T09:00:00.000Z", "2026-05-06T09:00:00.000Z",
                ]) {
                  let rule = `FREQ=${freq}`
                  if (interval > 1) rule += `;INTERVAL=${interval}`
                  if (count !== null) rule += `;COUNT=${count}`
                  if (until) rule += `;UNTIL=${until}`
                  if (byday) rule += `;BYDAY=${byday}`
                  out.push({ start, rule, minutes })
                }
              }
            }
          }
        }
      }
    }
    return out
  })()

  test("there are enough shapes for this to mean anything", () => {
    expect(SHAPES.length).toBeGreaterThan(1_000)
  })

  /**
   * AN INDEPENDENT ORACLE, BECAUSE THE PROPERTIES BELOW CANNOT SEE A MISSING INSTANCE.
   *
   * This matters and it is the second lesson of the round. The first version of this
   * describe block asserted only properties OF THE EMITTED SET — no repeats, in order,
   * within COUNT, overlapping the window, on a named weekday — and then I put both of
   * round 6's defects back and watched all sixteen tests stay green. Of course they
   * did: both defects make the function emit FEWER instances, and "too few" is not a
   * property of what came out. The reviewer found them by comparing against the old
   * implementation, which is the only thing that can see an absence.
   *
   * So this walks the rule day by day from DTSTART with no jumping and no cleverness —
   * the meaning the optimisation has to preserve — and the assertion is that the two
   * agree. It is slow and that is the point: it is allowed to be, because it is the
   * definition and the fast one has to match it.
   */
  function byBruteForce(startIso: string, rule: string, minutes: number): string[] {
    const parts: Record<string, string> = {}
    for (const part of rule.split(";")) {
      const [k, v] = part.split("=")
      if (k && v) parts[k.toUpperCase()] = v
    }
    const interval = Math.max(1, Number(parts.INTERVAL ?? 1))
    const count = parts.COUNT ? Number(parts.COUNT) : null
    const byDay = parts.BYDAY ? parts.BYDAY.split(",") : null
    /**
     * `UNTIL` is a bound on the INSTANCE, not on any cursor — RFC 5545: an occurrence
     * at or before it is in the set. Parsed here the same way `parseIcsDate` does, so
     * the oracle's reading of the rule is not the implementation's reading of it.
     */
    const untilMs = (() => {
      if (!parts.UNTIL) return null
      const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/.exec(parts.UNTIL)
      if (!m) return null
      const [, y, mo, d, h = "23", mi = "59", sec = "59"] = m
      return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec))
    })()
    const names = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
    const start = new Date(startIso)
    const durationMs = minutes * 60_000

    const out: string[] = []
    let emitted = 0
    // a day at a time from DTSTART, far enough to pass the window in every shape
    for (let day = 0; day < 4_600; day++) {
      const at = new Date(start)
      at.setDate(start.getDate() + day)
      at.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0)
      if (at > WINDOW_END && emitted > 0) break

      let member = false
      if (parts.FREQ === "DAILY") {
        member = day % interval === 0
      } else if (parts.FREQ === "WEEKLY") {
        // which interval-week this day falls in, counted from DTSTART's own week
        const weekOfStart = new Date(start)
        weekOfStart.setDate(start.getDate() - start.getDay())
        const weeks = Math.round((new Date(at.getFullYear(), at.getMonth(), at.getDate() - at.getDay()).getTime() -
          new Date(weekOfStart.getFullYear(), weekOfStart.getMonth(), weekOfStart.getDate()).getTime()) / (7 * 86_400_000))
        member = weeks >= 0 && weeks % interval === 0 && (byDay ? byDay.includes(names[at.getDay()]) : at.getDay() === start.getDay())
      }
      if (!member || at < start) continue

      if (count !== null && emitted >= count) break
      if (untilMs !== null && at.getTime() > untilMs) break
      emitted++
      const end = new Date(at.getTime() + durationMs)
      if (at <= WINDOW_END && end >= WINDOW_START) out.push(at.toISOString())
    }
    return out
  }

  test("matches a day-by-day walk of the same rule, for every shape", () => {
    const wrong: string[] = []
    for (const shape of SHAPES) {
      const fast = expandRecurrence(event(shape.start, shape.rule, shape.minutes), WINDOW_START, WINDOW_END).map(
        (i) => i.start,
      )
      const slow = byBruteForce(shape.start, shape.rule, shape.minutes)
      if (fast.join("|") !== slow.join("|")) {
        wrong.push(`${shape.rule} from ${shape.start} dur=${shape.minutes}: got ${fast.length}, expected ${slow.length}`)
      }
    }
    expect(wrong.slice(0, 8), `${wrong.length} of ${SHAPES.length} shapes disagree`).toEqual([])
  })

  test("no instance is emitted twice, and none is out of order", () => {
    const wrong: string[] = []
    for (const shape of SHAPES) {
      const times = expandRecurrence(event(shape.start, shape.rule, shape.minutes), WINDOW_START, WINDOW_END).map((i) =>
        new Date(i.start).getTime(),
      )
      if (new Set(times).size !== times.length) wrong.push(`${shape.rule} from ${shape.start}: a repeat`)
      for (let i = 1; i < times.length; i++) {
        if (times[i] < times[i - 1]) { wrong.push(`${shape.rule} from ${shape.start}: out of order`); break }
      }
    }
    expect(wrong.slice(0, 5), `${wrong.length} shapes wrong`).toEqual([])
  })

  test("a COUNT rule never emits more than its count", () => {
    const wrong: string[] = []
    for (const shape of SHAPES) {
      const count = Number(/COUNT=(\d+)/.exec(shape.rule)?.[1] ?? 0)
      if (!count) continue
      const n = expandRecurrence(event(shape.start, shape.rule, shape.minutes), WINDOW_START, WINDOW_END).length
      if (n > count) wrong.push(`${shape.rule} from ${shape.start}: ${n} > ${count}`)
    }
    expect(wrong.slice(0, 5)).toEqual([])
  })

  test("every instance overlaps the window, and an event ending inside it is kept", () => {
    /**
     * The second half is the one the jump broke. A 23:00–00:30 nightly series has an
     * instance starting the evening before the window whose end is inside it, and the
     * rule `push` applies — `if (instanceEnd < windowStart) return` — keeps it.
     */
    const wrong: string[] = []
    let keptAnEndOverlap = 0
    for (const shape of SHAPES) {
      for (const i of expandRecurrence(event(shape.start, shape.rule, shape.minutes), WINDOW_START, WINDOW_END)) {
        const startMs = new Date(i.start).getTime()
        const endMs = new Date(i.end).getTime()
        if (endMs < WINDOW_START.getTime() || startMs > WINDOW_END.getTime()) {
          wrong.push(`${shape.rule} from ${shape.start}: ${i.start} does not overlap the window`)
        }
        if (startMs < WINDOW_START.getTime() && endMs >= WINDOW_START.getTime()) keptAnEndOverlap++
      }
    }
    expect(wrong.slice(0, 5)).toEqual([])
    expect(keptAnEndOverlap, "no shape produced an instance straddling the window's start, so this asserts nothing").toBeGreaterThan(0)
  })

  test("every instance of a BYDAY rule lands on a weekday it names", () => {
    const names = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
    const wrong: string[] = []
    for (const shape of SHAPES) {
      const byday = /BYDAY=([A-Z,]+)/.exec(shape.rule)?.[1]?.split(",")
      if (!byday) continue
      for (const i of expandRecurrence(event(shape.start, shape.rule, shape.minutes), WINDOW_START, WINDOW_END)) {
        const day = names[new Date(i.start).getDay()]
        if (!byday.includes(day)) wrong.push(`${shape.rule}: landed on ${day}`)
      }
    }
    expect(wrong.slice(0, 5)).toEqual([])
  })
})

describe("a monthly or yearly event on a day some months do not have", () => {
  /**
   * `cursor.setMonth(cursor.getMonth() + interval)` on a mutated cursor overflows
   * February and never comes back: a monthly meeting on 31 January became Jan 31,
   * **Mar 3**, Apr 3, May 3 … and stayed on the 3rd for ever. Yearly from 29 February
   * became 1 March every year after.
   *
   * RFC 5545 §3.3.10 is explicit — an instance on a date that does not exist "MUST be
   * ignored and MUST NOT be counted" — so the set is Jan 31, Mar 31, May 31, and the
   * app was inventing a day and then keeping it. A DTSTART from 2020 has drifted for
   * six years by the time a 60-day import window reaches it, so the meeting arrives on
   * the wrong day with nothing on screen to show it.
   *
   * The days are asserted rather than the count, because a count would have passed
   * against the drift: it emitted the same NUMBER of instances, on the wrong dates.
   */
  const YEAR_START = new Date(2026, 0, 1)
  const YEAR_END = new Date(2026, 11, 30, 23, 59)

  const daysOf = (startIso: string, rule: string, from = YEAR_START, to = YEAR_END) =>
    expandRecurrence(event(startIso, rule, 30), from, to).map((i) => new Date(i.start).getDate())

  test("keeps the day of the month it was set on, or skips that month", () => {
    const onThe31st = daysOf(new Date(2026, 0, 31, 9).toISOString(), "FREQ=MONTHLY")
    expect(new Set(onThe31st), `landed on ${[...new Set(onThe31st)].join(", ")}`).toEqual(new Set([31]))
    // and it skips the months that have no 31st rather than moving
    expect(onThe31st.length).toBe(6)
  })

  test("the 30th appears in every month except February", () => {
    const onThe30th = daysOf(new Date(2026, 0, 30, 9).toISOString(), "FREQ=MONTHLY")
    expect(new Set(onThe30th)).toEqual(new Set([30]))
    expect(onThe30th.length, "February has no 30th, so eleven").toBe(11)
  })

  test("an ordinary day is in every month, which is the control", () => {
    /**
     * Without this, a fix that skipped too eagerly would pass the two above while
     * dropping half the calendar.
     */
    expect(daysOf(new Date(2026, 0, 15, 9).toISOString(), "FREQ=MONTHLY").length).toBe(12)
  })

  test("a yearly event on 29 February happens only in leap years", () => {
    const years = expandRecurrence(
      event(new Date(2024, 1, 29, 9).toISOString(), "FREQ=YEARLY", 30),
      new Date(2024, 0, 1),
      new Date(2033, 11, 31),
    ).map((i) => new Date(i.start).getFullYear())

    expect(years, "1 March in the non-leap years, which is a day the rule never named").toEqual([2024, 2028, 2032])
  })

  test("and a skipped month does not consume a COUNT", () => {
    /**
     * The other half of the RFC sentence: "MUST NOT be counted". A `COUNT=4` monthly
     * series from the 31st must give four instances on the 31st, not four minus the
     * Februaries.
     */
    const days = daysOf(new Date(2026, 0, 31, 9).toISOString(), "FREQ=MONTHLY;COUNT=4", YEAR_START, new Date(2027, 11, 31))
    expect(days).toEqual([31, 31, 31, 31])
  })
})
