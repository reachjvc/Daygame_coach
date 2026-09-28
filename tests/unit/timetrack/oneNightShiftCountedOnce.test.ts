/**
 * THE SCREENS AGREE ABOUT AN ENTRY THAT CROSSED MIDNIGHT.
 *
 * Found in a browser on 2026-09-28, with one entry in the workspace — a manual entry
 * from Sunday 23:00 to Monday 07:00, which is the app's own documented "crossed
 * midnight" path:
 *
 *   Timer:    "This week 0:00"   (while the row itself is listed)
 *   Calendar: "Today 7:00"
 *   Reports:  "TOTAL HOURS 0:00 · 0 entries · 0 active days", every chart bar 0m
 *
 * Two causes, and the first is a defect under ANY model of what a day is:
 *
 *   1. `entriesInRange` and `weekTotalSeconds` selected on `dateKey(e.start)`, so an
 *      entry starting the evening before the range began was excluded ENTIRELY — not
 *      misattributed, absent. A report for a week that contains seven of its eight
 *      hours said "0 entries".
 *   2. Those that did include it gave the whole duration to the start day, while
 *      `calendarService.entryDaySeconds` splits at local midnight and carries a comment
 *      arguing that is the right definition of a day's hours. Two definitions of "hours
 *      on this day", no owner — so the calendar and the report disagreed about the same
 *      week.
 *
 * `entryDaySeconds` is the owner now, because it is the one with a stated rationale.
 * The entry LIST still groups a row under its start day: a row belongs under one
 * heading, and that is a different question from how many hours a day holds.
 *
 * What this cost: a night shift, or a timer left running past midnight, was missing from
 * the report and the week total — including the CSV export and anything invoiced from it
 * — while the previous day was inflated by the same hours.
 */

import { describe, expect, test } from "vitest"

import { dayColumnSeconds } from "@/src/timetrack/calendarService"
import { buildDetailed, buildSummary, buildWorkload, defaultReportConfig, emptyFilters } from "@/src/timetrack/reportsService"
import { entriesInRange, weekTotalSeconds } from "@/src/timetrack/timetrackService"
import type { TimeEntry } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

/** Sunday 23:00 → Monday 07:00, local. Eight hours, one of them on the Sunday. */
function nightShift(): TimeEntry {
  const base = entry(1, "2026-09-27", "23:00", "23:30", { description: "night shift" })
  const stop = new Date(2026, 8, 28, 7, 0, 0).toISOString()
  return { ...base, stop, duration: Math.round((new Date(stop).getTime() - new Date(base.start).getTime()) / 1000) }
}

const MONDAY = "2026-09-28"
const SUNDAY_AFTER = "2026-10-04"
const NOW_SEC = Math.floor(new Date(2026, 9, 1, 12).getTime() / 1000)

describe("a shift that crossed midnight", () => {
  const state = baseState({ entries: [nightShift()] })

  /**
   * PINS BEHAVIOUR THAT ALREADY WORKED, deliberately: `entryDaySeconds` was the one
   * surface that had this right, and the fix made it the owner for the others. So this
   * passes against the old source, and `tests-must-fail-without-the-fix.mjs` will keep
   * reporting it — that is correct, and this comment is the answer.
   */
  test("is eight hours, one on the Sunday and seven on the Monday", () => {
    // the premise, so the numbers below mean something
    expect(state.entries[0].duration).toBe(8 * 3600)
    expect(dayColumnSeconds(state.entries, "2026-09-27", NOW_SEC)).toBe(3600)
    expect(dayColumnSeconds(state.entries, MONDAY, NOW_SEC)).toBe(7 * 3600)
  })

  test("is in a report for the week it was mostly worked", () => {
    const inRange = entriesInRange(state.entries, MONDAY, SUNDAY_AFTER)
    expect(inRange, "the entry was excluded from a week holding seven of its eight hours").toHaveLength(1)
  })

  test("and the week total counts the hours that fall inside the week", () => {
    const total = weekTotalSeconds(state.entries, MONDAY, 1, NOW_SEC)
    expect(total, `the week total read ${total / 3600}h`).toBe(7 * 3600)
  })

  test("and the Reports summary agrees with the calendar, to the second", () => {
    const config = { ...defaultReportConfig(MONDAY, 1, state.workspace.rounding), filters: emptyFilters({ start: MONDAY, end: SUNDAY_AFTER }) }
    const summary = buildSummary(state, config, NOW_SEC)

    const fromCalendar = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]
      .reduce((sum, day) => sum + dayColumnSeconds(state.entries, day, NOW_SEC), 0)

    expect(summary.totals.seconds, "the report and the calendar disagree about the same week").toBe(fromCalendar)
    expect(summary.totals.entryCount, "the report said nothing was tracked").toBeGreaterThan(0)
    expect(summary.totals.activeDays, "a day with seven tracked hours was not an active day").toBeGreaterThan(0)
  })

  test("and the detailed report lists it", () => {
    const config = { ...defaultReportConfig(MONDAY, 1, state.workspace.rounding), filters: emptyFilters({ start: MONDAY, end: SUNDAY_AFTER }) }
    expect(buildDetailed(state, config, NOW_SEC), "the CSV export would have been empty").toHaveLength(1)
  })

  test("and a single-day report for the Monday shows the Monday's hours", () => {
    const config = { ...defaultReportConfig(MONDAY, 1, state.workspace.rounding), filters: emptyFilters({ start: MONDAY, end: MONDAY }) }
    const summary = buildSummary(state, config, NOW_SEC)
    expect(summary.totals.seconds).toBe(dayColumnSeconds(state.entries, MONDAY, NOW_SEC))
  })

  test("and the Sunday's own report shows only the Sunday's hour", () => {
    const config = { ...defaultReportConfig("2026-09-27", 1, state.workspace.rounding), filters: emptyFilters({ start: "2026-09-27", end: "2026-09-27" }) }
    const summary = buildSummary(state, config, NOW_SEC)
    expect(summary.totals.seconds, "the previous day was inflated by the whole shift").toBe(3600)
  })

  /** The control. Passes against the old source by design — that is what a control is. */
  test("an ordinary same-day entry is untouched, which is the control", () => {
    const ordinary = baseState({ entries: [entry(2, MONDAY, "09:00", "10:30")] })
    const config = { ...defaultReportConfig(MONDAY, 1, ordinary.workspace.rounding), filters: emptyFilters({ start: MONDAY, end: SUNDAY_AFTER }) }
    expect(buildSummary(ordinary, config, NOW_SEC).totals.seconds).toBe(90 * 60)
    expect(weekTotalSeconds(ordinary.entries, MONDAY, 1, NOW_SEC)).toBe(90 * 60)
    expect(entriesInRange(ordinary.entries, MONDAY, SUNDAY_AFTER)).toHaveLength(1)
  })
})

describe("and every tab tells the same story about it", () => {
  const state = baseState({ entries: [nightShift()] })
  const config = (patch: Record<string, unknown> = {}) => ({
    ...defaultReportConfig(MONDAY, 1, state.workspace.rounding),
    filters: emptyFilters({ start: MONDAY, end: SUNDAY_AFTER }),
    ...patch,
  })

  /** The calendar's answer for the whole week, which is the one with a written rule. */
  const fromCalendar = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]
    .reduce((sum, day) => sum + dayColumnSeconds(state.entries, day, NOW_SEC), 0)

  test("the workload grid puts the hours in the day's own column", () => {
    /**
     * `dayIndex.get(dateKey(entry.start))` returned undefined for an entry that began
     * the evening before the range, so the grid dropped it and every cell read "—".
     */
    const report = buildWorkload(state, config(), NOW_SEC)
    const total = report.dayTotals.reduce((sum, v) => sum + v, 0)
    expect(total, "the grid lost the shift entirely").toBe(fromCalendar)
    expect(report.dayTotals[0], "the Monday column is empty").toBe(7 * 3600)
  })

  test("the chart buckets sum to the total, and to a total that is not zero", () => {
    /**
     * THE SECOND HALF IS THE WHOLE TEST. Without it this asserted `0 === 0`: on the old
     * source the entry was excluded from the range ENTIRELY, so the buckets and the
     * total were both empty and the property held by vacuum. It was named "which they
     * did not before" and `tests-must-fail-without-the-fix.mjs` reported it passing
     * against the old source, which is how the claim was caught.
     *
     * A sum-equals-total property can only see a MISATTRIBUTION. It cannot see an
     * absence, and absence was the defect — the same lesson the recurrence fuzzing in
     * this slice learned the hard way. So the magnitude is pinned too.
     */
    const summary = buildSummary(state, config(), NOW_SEC)
    const bucketed = summary.buckets.reduce((sum, b) => sum + b.seconds, 0)
    expect(summary.totals.seconds).toBe(7 * 3600)
    expect(bucketed).toBe(summary.totals.seconds)
  })

  test("grouping by date splits it across the two days", () => {
    const grouped = buildSummary(state, config({ grouping: "date" }), NOW_SEC)
    const labels = grouped.rows.map((r) => r.label)
    expect(labels, `grouped by date it read ${labels.join(", ")}`).toContain(MONDAY)
    expect(grouped.rows.reduce((sum, r) => sum + r.seconds, 0)).toBe(fromCalendar)
  })

  test("and the detailed row carries the hours inside the range, not the whole shift", () => {
    const monday = config({ filters: emptyFilters({ start: MONDAY, end: MONDAY }) })
    const rows = buildDetailed(state, monday, NOW_SEC)
    expect(rows).toHaveLength(1)
    expect(rows[0].seconds, "the CSV would have invoiced eight hours for a seven-hour Monday").toBe(7 * 3600)
  })
})
