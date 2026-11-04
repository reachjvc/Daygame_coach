/**
 * A PLANNED ENTRY COUNTS NOWHERE UNTIL IT STARTS (Q2, Phase 5 item 5).
 *
 * The owner chose: a future entry is striped, "planned", and not counted in
 * today's or the week's total until its start passes. A plan you skip must not
 * inflate a total. Every screen that shows "tracked" is asked here, because a
 * rule kept by one total and not the next is how the screens came to disagree
 * about one night shift (everyScreenAgreesAboutOneNightShift.test.ts).
 *
 * Nothing new is stored: planned is "starts after now", so it needs no column,
 * survives sync as it is, and turns into a normal entry by itself when its
 * start passes.
 */

import { describe, expect, test } from "vitest"

import { dayColumnSeconds } from "@/src/timetrack/calendarService"
import { buildProjectDashboard } from "@/src/timetrack/projectDashboardService"
import { buildDetailed, buildSummary, buildWorkload, defaultReportConfig, emptyFilters } from "@/src/timetrack/reportsService"
import { buildDayGroups, isPlanned, secondsInRangeOf, sumSeconds, weekTotalSeconds } from "@/src/timetrack/timetrackService"

import { baseState, entry } from "./helpers"

/** Wednesday 2026-08-12 12:00, local: inside the helper project's August period */
const NOW = Math.floor(new Date(2026, 7, 12, 12, 0, 0, 0).getTime() / 1000)
const TODAY = "2026-08-12"
const TOMORROW = "2026-08-13"
const WEEK = { start: "2026-08-10", end: "2026-08-16" }

function day() {
  return [
    entry("done", TODAY, "09:00", "11:00", { description: "Deep work" }),
    // later today, not begun yet
    entry("later", TODAY, "15:00", "16:00", { description: "Call" }),
    // the acceptance story: tomorrow 10:00–11:30
    entry("gym", TOMORROW, "10:00", "11:30", { description: "Gym" }),
  ]
}

const TWO_HOURS = 2 * 3600

describe("which entries are planned", () => {
  test("one that starts after now is planned; one that has begun is not", () => {
    const [done, later, gym] = day()
    expect(isPlanned(done, NOW)).toBe(false)
    expect(isPlanned(later, NOW)).toBe(true)
    expect(isPlanned(gym, NOW)).toBe(true)
  })

  test("it stops being planned the moment its start passes", () => {
    const later = day()[1]
    const atThree = Math.floor(new Date(2026, 7, 12, 15, 0, 0, 0).getTime() / 1000)
    expect(isPlanned(later, atThree)).toBe(false)
  })
})

describe("no total counts it before it starts", () => {
  test("the list's day header: today is the two hours worked, and tomorrow is nothing yet", () => {
    const groups = buildDayGroups(day(), { groupSimilar: true, nowSec: NOW })
    const today = groups.find((g) => g.date === TODAY)!
    const tomorrow = groups.find((g) => g.date === TOMORROW)!

    expect(today.totalSeconds).toBe(TWO_HOURS)
    expect(tomorrow.totalSeconds).toBe(0)
    // and the header can say what is planned beside it
    expect(today.plannedSeconds).toBe(3600)
    expect(tomorrow.plannedSeconds).toBe(90 * 60)
  })

  test("a planned row still shows its own length: it is the plan, not a total", () => {
    const groups = buildDayGroups(day(), { groupSimilar: true, nowSec: NOW })
    const gymRow = groups.find((g) => g.date === TOMORROW)!.rows[0]
    expect(gymRow.totalSeconds).toBe(90 * 60)
  })

  test("a planned entry is never grouped with a worked one of the same name", () => {
    const entries = [
      entry("a", TODAY, "09:00", "10:00", { description: "Email" }),
      entry("b", TODAY, "17:00", "17:30", { description: "Email" }),
    ]
    const rows = buildDayGroups(entries, { groupSimilar: true, nowSec: NOW })[0].rows
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => !row.grouped)).toBe(true)
  })

  test("This week", () => {
    expect(weekTotalSeconds(day(), TODAY, 1, NOW)).toBe(TWO_HOURS)
  })

  test("the calendar's day totals", () => {
    expect(dayColumnSeconds(day(), TODAY, NOW)).toBe(TWO_HOURS)
    expect(dayColumnSeconds(day(), TOMORROW, NOW)).toBe(0)
  })

  test("Reports: Summary, Detailed and Workload", () => {
    const state = baseState({ entries: day() })
    const config = { ...defaultReportConfig(TODAY, 1, state.workspace.rounding), filters: emptyFilters(WEEK) }

    const summary = buildSummary(state, config, NOW)
    expect(summary.totals.seconds).toBe(TWO_HOURS)
    expect(summary.totals.entryCount).toBe(1)
    expect(buildDetailed(state, config, NOW).map((row) => row.entryId)).toEqual(["done"])
    expect(buildWorkload(state, config, NOW).grandTotal).toBe(TWO_HOURS)
  })

  test("the totals Manage, Projects and Clients show", () => {
    expect(secondsInRangeOf(day(), WEEK.start, WEEK.end, NOW)).toBe(TWO_HOURS)
    expect(sumSeconds(day(), NOW)).toBe(TWO_HOURS)
  })

  test("the project dashboard", () => {
    const state = baseState({ entries: day() })
    const dashboard = buildProjectDashboard(state, "30", TODAY, NOW)!
    expect(dashboard.trackedSeconds).toBe(TWO_HOURS)
    expect(dashboard.taskBreakdown.reduce((sum, row) => sum + row.seconds, 0)).toBe(TWO_HOURS)
  })

  test("once its start has passed it counts like any other", () => {
    const afterGym = Math.floor(new Date(2026, 7, 13, 12, 0, 0, 0).getTime() / 1000)
    expect(weekTotalSeconds(day(), TODAY, 1, afterGym)).toBe(TWO_HOURS + 3600 + 90 * 60)
  })
})
