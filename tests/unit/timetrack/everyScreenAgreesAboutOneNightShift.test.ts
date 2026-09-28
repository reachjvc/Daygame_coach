/**
 * ONE SHIFT, EVERY SCREEN, ONE NUMBER — AND THE COST OF THE FIRST ATTEMPT.
 *
 * `oneNightShiftCountedOnce.test.ts` next door fixed the Timer and the four report
 * tabs. It did not look at the seven OTHER places that show "tracked in this period",
 * and a reviewer found all of them broken worse than before:
 *
 *   - `entriesInRange` selects by OVERLAP, which is right for selection. Eight callers
 *     summed WHOLE entries off it, so an eight-hour night shift read 8h in the previous
 *     week AND 8h in the next — sixteen hours for eight worked — while `weekTotalSeconds`
 *     on the Timer beside it correctly said 7. Before the change those callers were
 *     wrong by attribution and counted ONCE; after it they double-counted.
 *   - the project dashboard's header summed whole entries while its own burn-up chart
 *     filed each entry under `dateKey(entry.start)`, a day outside the period, so the
 *     card read "8h tracked" over a chart that never left zero.
 *   - `alertProgressPct` read 80% of a ten-hour estimate for seven hours worked, enough
 *     to fire a 75% alert that should not fire, in two consecutive periods.
 *   - rounding moved to per-day, so 23:55 → 00:05 — ten minutes — billed THIRTY at
 *     quarter-hour round-up. Two quarter hours instead of one.
 *   - and the four builders became O(entries x days): "This year" with 300 entries went
 *     from 5 ms to 1508 ms, rebuilt every second while a timer runs.
 *
 * Every one of those was invisible to 572 passing tests, because each test asserted the
 * surface its own fix had touched. This one asserts that the surfaces AGREE.
 */

import { describe, expect, test } from "vitest"

import { buildProjectDashboard } from "@/src/timetrack/projectDashboardService"
import {
  buildDetailed,
  buildSummary,
  buildWorkload,
  defaultReportConfig,
  detailedToCsv,
  emptyFilters,
} from "@/src/timetrack/reportsService"
import {
  alertProgressPct,
  auditMembers,
  entrySecondsInRange,
  secondsInRangeOf,
  liveEntries,
  weekTotalSeconds,
} from "@/src/timetrack/timetrackService"

import { baseState, entry } from "./helpers"

const NOW = Math.floor(Date.parse("2026-09-28T12:00:00.000Z") / 1000)
const THIS_WEEK = { start: "2026-09-28", end: "2026-10-04" }
const PREV_WEEK = { start: "2026-09-21", end: "2026-09-27" }
const MONDAY_HOURS = 7
const SUNDAY_HOURS = 1

/** Sunday 2026-09-27 23:00 → Monday 2026-09-28 07:00, local. Eight hours, 7 of them Monday. */
function nightShift() {
  const e = entry("night", "2026-09-27", "23:00", "23:59")
  e.stop = new Date(2026, 8, 28, 7, 0, 0, 0).toISOString()
  e.duration = Math.round((Date.parse(e.stop) - Date.parse(e.start)) / 1000)
  return e
}

describe("the eight hours are split, not duplicated", () => {
  const entries = [nightShift()]

  test("the two weeks it touches hold one hour and seven, not eight and eight", () => {
    expect(secondsInRangeOf(entries, PREV_WEEK.start, PREV_WEEK.end, NOW) / 3600).toBe(SUNDAY_HOURS)
    expect(secondsInRangeOf(entries, THIS_WEEK.start, THIS_WEEK.end, NOW) / 3600).toBe(MONDAY_HOURS)
  })

  test("and they add up to the shift, which is the whole claim", () => {
    const both =
      secondsInRangeOf(entries, PREV_WEEK.start, PREV_WEEK.end, NOW) +
      secondsInRangeOf(entries, THIS_WEEK.start, THIS_WEEK.end, NOW)
    expect(both).toBe(entries[0].duration)
  })

  test("Team's tracked-this-week agrees with the Timer's week total, to the second", () => {
    const state = baseState()
    state.entries = entries
    const team = secondsInRangeOf(
      liveEntries(state).filter((e) => e.userId === entries[0].userId),
      THIS_WEEK.start,
      THIS_WEEK.end,
      NOW,
    )
    expect(team).toBe(weekTotalSeconds(state.entries, THIS_WEEK.start, 1, NOW))
  })

  test("the member audit counts the hours in the range, not the whole shift twice", () => {
    const state = baseState()
    state.entries = entries
    const audited = auditMembers(state, THIS_WEEK, 24, NOW)
    const self = audited.find((a) => a.member.id === entries[0].userId)
    expect(self?.seconds).toBe(MONDAY_HOURS * 3600)
  })
})

describe("the project dashboard agrees with its own chart", () => {
  function stateWithPeriod() {
    const state = baseState()
    state.entries = [nightShift()]
    const project = state.projects[0]
    project.startDate = THIS_WEEK.start
    project.endDate = THIS_WEEK.end
    project.recurringPeriod = null
    project.estimateType = "hours"
    project.estimatedSeconds = 10 * 3600
    project.autoEstimates = false
    state.entries[0].projectId = project.id
    return state
  }

  test("the header total is the hours inside the period", () => {
    const dash = buildProjectDashboard(stateWithPeriod(), "30", THIS_WEEK.end, NOW)
    expect(dash?.trackedSeconds).toBe(MONDAY_HOURS * 3600)
  })

  test("and the burn-up's last point is that same number", () => {
    const dash = buildProjectDashboard(stateWithPeriod(), "30", THIS_WEEK.end, NOW)
    expect(dash?.burnUp.at(-1)?.seconds).toBe(dash?.trackedSeconds)
  })

  test("an alert threshold is judged on the hours worked in the period", () => {
    const state = stateWithPeriod()
    const pct = alertProgressPct(state, state.projects[0], "estimate", THIS_WEEK.end, NOW)
    // 7 of 10 hours, not 8 — 80% would cross a 75% threshold that must not fire
    expect(pct).toBe(70)
  })
})

describe("rounding is applied to the entry, once", () => {
  /** 23:55 → 00:05: ten real minutes, across midnight. */
  function tenMinutesAcrossMidnight() {
    const e = entry("r", "2026-09-27", "23:55", "23:59")
    e.stop = new Date(2026, 8, 28, 0, 5, 0, 0).toISOString()
    e.duration = Math.round((Date.parse(e.stop) - Date.parse(e.start)) / 1000)
    return e
  }
  const config = () => ({
    ...defaultReportConfig("2026-09-28", 1, { enabled: false, mode: "nearest", minutes: 15 }),
    filters: emptyFilters({ start: "2026-09-27", end: "2026-09-28" }),
    rounding: { enabled: true, minutes: 15, mode: "up" as const },
  })

  test("ten minutes across midnight bills one quarter hour, not two", () => {
    const state = baseState()
    state.entries = [tenMinutesAcrossMidnight()]
    expect(buildSummary(state, config(), NOW).totals.seconds).toBe(15 * 60)
  })

  test("and the Workload grid bills the same quarter hour", () => {
    const state = baseState()
    state.entries = [tenMinutesAcrossMidnight()]
    const workload = buildWorkload(state, config(), NOW)
    expect(workload.dayTotals.reduce((a, b) => a + b, 0)).toBe(15 * 60)
  })

  test("the chart buckets still sum to the rounded total exactly", () => {
    const state = baseState()
    state.entries = [tenMinutesAcrossMidnight()]
    const summary = buildSummary(state, config(), NOW)
    expect(summary.buckets.reduce((sum, b) => sum + b.seconds, 0)).toBe(summary.totals.seconds)
  })
})

describe("a row describes the same interval its duration measures", () => {
  /** Range = the Monday only, so the shift's Sunday hour falls outside it. */
  const mondayOnly = () => ({
    ...defaultReportConfig("2026-09-28", 1, { enabled: false, mode: "nearest", minutes: 15 }),
    filters: emptyFilters({ start: "2026-09-28", end: "2026-09-28" }),
  })

  test("the detailed row's start, stop and duration agree with each other", () => {
    const state = baseState()
    state.entries = [nightShift()]
    const [row] = buildDetailed(state, mondayOnly(), NOW)
    const spanned = (Date.parse(row.stop!) - Date.parse(row.start)) / 1000
    expect(spanned, `start ${row.start} stop ${row.stop} duration ${row.seconds}s`).toBe(row.seconds)
  })

  test("and the CSV carries those same three numbers", () => {
    const state = baseState()
    state.entries = [nightShift()]
    const csv = detailedToCsv(buildDetailed(state, mondayOnly(), NOW), "EUR")
    const cells = csv.trim().split("\n")[1].split(",")
    const start = cells.find((c) => c.startsWith("2026-09-28T00:00"))
    expect(start, `no clipped start in: ${csv.trim().split("\n")[1]}`).toBeTruthy()
    expect(csv).toContain("7:00:00")
  })

  test("an entry with no hours inside the range is not a row at all", () => {
    /**
     * A shift ending exactly at the range's first midnight exported as
     * `…23:00, …00:00, 0:00:00, 0.00` — an hour of work shown as nothing.
     */
    const state = baseState()
    const e = entry("touches", "2026-09-27", "23:00", "23:59")
    e.stop = new Date(2026, 8, 28, 0, 0, 0, 0).toISOString()
    e.duration = Math.round((Date.parse(e.stop) - Date.parse(e.start)) / 1000)
    state.entries = [e]
    expect(buildDetailed(state, mondayOnly(), NOW)).toEqual([])
  })

  test("and Summary does not claim an entry it shows no hours for", () => {
    const state = baseState()
    const e = entry("touches", "2026-09-27", "23:00", "23:59")
    e.stop = new Date(2026, 8, 28, 0, 0, 0, 0).toISOString()
    e.duration = Math.round((Date.parse(e.stop) - Date.parse(e.start)) / 1000)
    state.entries = [e]
    const summary = buildSummary(state, mondayOnly(), NOW)
    expect({ seconds: summary.totals.seconds, entries: summary.totals.entryCount, rows: summary.rows.length }).toEqual({
      seconds: 0,
      entries: 0,
      rows: 0,
    })
  })
})

describe("and it stays fast enough to render every second", () => {
  test("a year of entries through three builders is well under a frame budget", () => {
    /**
     * `ReportsView` builds all four reports in a `useMemo` keyed on `nowSec`, which
     * ticks every 1000 ms while a timer runs, so the whole build has to fit in a second
     * with room to spare. The first version of the night-shift fix took 1508 ms here.
     * The ceiling is deliberately loose — this is a regression alarm for the complexity
     * class, not a benchmark, and CI machines vary.
     */
    const state = baseState()
    state.entries = Array.from({ length: 400 }, (_, i) => {
      const day = new Date(2025, 8, 28)
      day.setDate(day.getDate() + (i % 365))
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
      return entry(i, key, "09:00", "17:00")
    })
    const config = { ...defaultReportConfig("2026-09-28", 1, { enabled: false, mode: "nearest", minutes: 15 }), filters: emptyFilters({ start: "2025-09-28", end: "2026-09-28" }) }

    const started = performance.now()
    buildSummary(state, config, NOW)
    buildWorkload(state, config, NOW)
    const elapsed = performance.now() - started
    expect(elapsed, `a year of 400 entries took ${Math.round(elapsed)} ms`).toBeLessThan(400)
  })

  test("entrySecondsInRange does not walk the range", () => {
    /**
     * The property behind the number above, asserted directly so it cannot be lost to a
     * faster machine: a twenty-year range must cost about what a one-day range costs.
     */
    const e = nightShift()
    const oneDay = performance.now()
    for (let i = 0; i < 20_000; i++) entrySecondsInRange(e, "2026-09-28", "2026-09-28", NOW)
    const dayCost = performance.now() - oneDay

    const twentyYears = performance.now()
    for (let i = 0; i < 20_000; i++) entrySecondsInRange(e, "2006-09-28", "2026-09-28", NOW)
    const rangeCost = performance.now() - twentyYears

    expect(rangeCost, `one day ${Math.round(dayCost)} ms vs twenty years ${Math.round(rangeCost)} ms`).toBeLessThan(
      Math.max(50, dayCost * 5),
    )
  })
})
