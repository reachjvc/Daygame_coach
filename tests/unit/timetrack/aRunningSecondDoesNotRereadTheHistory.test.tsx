// @vitest-environment jsdom
/**
 * A SECOND OF A RUNNING TIMER DOES NOT REREAD THE HISTORY — AND STILL SHOWS THE SAME NUMBERS.
 *
 * Found by the heavy-user audit of 2026-11-04 (D6), in a real browser with 1,791
 * entries: the Timer list recomputed "This week" from the whole history on every
 * keystroke and every second a timer ran (41 ms a render at 1,800 entries, 203 ms at
 * 7,000), and Reports rebuilt all four tabs every second (68 ms and 264 ms). Typing in
 * "What are you working on?" lagged ~215 ms a key on a PC and ~380 ms on a phone.
 *
 * The finished entries are now worked out when they change, and a tick adds only the
 * running entry. The proof that a tick does not touch the history is direct: the old
 * entries here count every read of their fields, and a tick must make none. The proof
 * that nothing changed on screen is a comparison with the full rebuild, second by
 * second, through a night shift, a deleted entry and a running timer.
 */

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import { ReportsView } from "@/src/timetrack/components/ReportsView"
import {
  buildDetailed,
  buildProfitability,
  buildSummary,
  buildWorkload,
  defaultReportConfig,
  emptyFilters,
  liveReport,
} from "@/src/timetrack/reportsService"
import { timerList } from "@/src/timetrack/timerListService"
import { addDays, eachDay, epochSeconds, weekStartOf } from "@/src/timetrack/timetrackFormatService"
import { buildDayGroups, daySeconds, liveEntries, runningDurationValue, weekTotalSeconds } from "@/src/timetrack/timetrackService"
import type { ReportConfig, TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

afterEach(cleanup)
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

// Monday 2026-08-10, 15:00 local, with a timer running since 14:00
const NOW_SEC = Math.floor(new Date(2026, 7, 10, 15, 0, 0).getTime() / 1000)
const running = (): TimeEntry => {
  const start = new Date(2026, 7, 10, 14, 0, 0).toISOString()
  return { ...entry("run", "2026-08-10", "14:00", "14:00"), stop: null, start, duration: runningDurationValue(start), description: "running" }
}

/**
 * Old entries that count every read of their fields once `reads.on` is set. The list
 * shows the newest seven days that HAVE entries, so the first ten days here are on
 * screen and not watched: a row on screen is read to be drawn.
 */
function watchedHistory(days: number, perDay: number, reads: { on: boolean; n: number }): TimeEntry[] {
  const out: TimeEntry[] = []
  for (let back = 30; back < 30 + days; back++) {
    const day = addDays("2026-08-10", -back)
    for (let i = 0; i < perDay; i++) {
      const plain = entry(`old-${back}-${i}`, day, `${String(8 + i).padStart(2, "0")}:00`, `${String(8 + i).padStart(2, "0")}:45`, {
        description: `task ${i}`,
        projectId: i % 2 ? "30" : "31",
      })
      if (back < 40) {
        out.push(plain)
        continue
      }
      const watched = { ...plain }
      for (const key of ["start", "stop", "duration", "description", "projectId", "tagIds", "billable"] as const) {
        const value = plain[key]
        Object.defineProperty(watched, key, {
          enumerable: true,
          get() {
            if (reads.on) reads.n++
            return value
          },
        })
      }
      out.push(watched)
    }
  }
  return out
}

function workspace(history: TimeEntry[]): TimetrackState {
  return baseState({
    entries: [
      running(),
      entry("today", "2026-08-10", "09:00", "10:00", { description: "planning" }),
      // a night shift into this week, and one deleted on the server
      { ...entry("night", "2026-08-09", "22:00", "23:59"), stop: new Date(2026, 7, 10, 6, 0, 0).toISOString(), duration: 8 * 3600 },
      { ...entry("gone", "2026-08-10", "11:00", "12:00"), serverDeletedAt: "2026-08-10T12:00:00.000Z" },
      // planned (Q2): in no total until 16:00 and 18:00 pass, and the second one past midnight
      entry("plan", "2026-08-10", "16:00", "17:00", { description: "planned call" }),
      { ...entry("late-plan", "2026-08-10", "23:00", "23:59"), stop: new Date(2026, 7, 11, 1, 0, 0).toISOString(), duration: 2 * 3600 },
      ...history,
    ],
  })
}

describe("a second of a running timer", () => {
  test("re-renders the Timer list without reading one old entry", () => {
    const reads = { on: false, n: 0 }
    const state = workspace(watchedHistory(40, 6, reads))
    const props = { state, setState: () => {}, pushToast: () => {}, onEditEntry: () => {} }
    const view = render(<EntryList {...props} nowSec={NOW_SEC} />)

    reads.on = true
    for (let tick = 1; tick <= 5; tick++) view.rerender(<EntryList {...props} nowSec={NOW_SEC + tick} />)

    expect(reads.n, "fields of entries a month old read on a tick").toBe(0)
  })

  test("and redraws none of the rows on screen that a second does not change", () => {
    // the last seven days' entries are on screen, and watched like the old ones
    const reads = { on: false, n: 0 }
    const recent: TimeEntry[] = []
    for (let back = 1; back <= 7; back++) {
      const plain = entry(`recent-${back}`, addDays("2026-08-10", -back), "09:00", "10:00", { description: `recent ${back}` })
      const watched = { ...plain }
      for (const key of ["start", "stop", "duration", "description", "projectId", "tagIds", "billable"] as const) {
        const value = plain[key]
        Object.defineProperty(watched, key, {
          enumerable: true,
          get() {
            if (reads.on) reads.n++
            return value
          },
        })
      }
      recent.push(watched)
    }
    const state = workspace([...recent, ...watchedHistory(40, 6, reads)])
    const props = { state, setState: () => {}, pushToast: () => {}, onEditEntry: () => {} }
    const view = render(<EntryList {...props} nowSec={NOW_SEC} />)
    expect(view.getAllByDisplayValue(/^recent \d$/).length, "the recent rows are not on screen").toBeGreaterThan(3)
    // the first second notes which rows hold a running timer; every second after it reads nothing
    view.rerender(<EntryList {...props} nowSec={NOW_SEC + 1} />)

    reads.on = true
    for (let tick = 2; tick <= 6; tick++) view.rerender(<EntryList {...props} nowSec={NOW_SEC + tick} />)

    expect(reads.n, "fields of earlier days' rows read on a tick").toBe(0)
  })

  test("re-renders Reports without reading one old entry", () => {
    const reads = { on: false, n: 0 }
    const state = workspace(watchedHistory(40, 6, reads))
    const config = defaultReportConfig("2026-08-10", 1, state.workspace.rounding)
    const props = { state, setState: () => {}, config, setConfig: () => {}, pushToast: () => {} }
    const view = render(<ReportsView {...props} nowSec={NOW_SEC} />)

    reads.on = true
    for (let tick = 1; tick <= 5; tick++) view.rerender(<ReportsView {...props} nowSec={NOW_SEC + tick} />)

    expect(reads.n, "fields of entries a month old read on a tick").toBe(0)
  })
})

describe("and the numbers it shows", () => {
  const reads = { on: false, n: 0 }
  const state = workspace(watchedHistory(10, 3, reads))
  // 15:00, a second later, either side of the plan's 16:00 start, inside the late plan, next morning
  const seconds = [NOW_SEC, NOW_SEC + 1, NOW_SEC + 3599, NOW_SEC + 3600, NOW_SEC + 3601, NOW_SEC + 8.5 * 3600, NOW_SEC + 3600 * 18]

  test("a plan joins the totals the second its start passes, not a second earlier or later", () => {
    const list = timerList(state.entries, true)
    const summary = liveReport("summary", state, configs[0][1])
    const today = (now: number) => list.groupsAt(now).find((g) => g.date === "2026-08-10")!
    // the same list and report, asked second by second across 16:00
    const before = { day: today(NOW_SEC + 3599).totalSeconds, week: list.weekSecondsAt("2026-08-10", 1, NOW_SEC + 3599), report: summary(NOW_SEC + 3599).totals.seconds }
    const after = { day: today(NOW_SEC + 3601).totalSeconds, week: list.weekSecondsAt("2026-08-10", 1, NOW_SEC + 3601), report: summary(NOW_SEC + 3601).totals.seconds }
    // two seconds of the running timer, and the whole planned hour, which is worked time once it starts
    expect(after.day - before.day).toBe(2 + 3600)
    expect(after.week - before.week).toBe(2 + 3600)
    expect(after.report - before.report).toBe(2 + 3600)
    // what is still planned is said beside the day's total: both plans, then only the late one
    expect(today(NOW_SEC + 3599).plannedSeconds).toBe(3600 + 2 * 3600)
    expect(today(NOW_SEC + 3601).plannedSeconds).toBe(2 * 3600)
  })

  test("the Timer list's days and week match a full rebuild, every second", () => {
    for (const groupSimilar of [true, false]) {
      const list = timerList(state.entries, groupSimilar)
      for (const now of seconds) {
        expect(list.groupsAt(now)).toEqual(buildDayGroups(liveEntries(state), { groupSimilar, nowSec: now }))
        for (const weekStart of [0, 1, 6] as const) {
          expect(list.weekSecondsAt("2026-08-10", weekStart, now)).toBe(weekTotalSeconds(liveEntries(state), "2026-08-10", weekStart, now))
        }
      }
    }
  })

  test("the week total is still the seven days' own hours added up", () => {
    for (const weekStart of [0, 1, 6] as const) {
      const start = weekStartOf("2026-08-10", weekStart)
      const byDays = eachDay(start, addDays(start, 6)).reduce((sum, day) => sum + daySeconds(state.entries, day, NOW_SEC), 0)
      expect(weekTotalSeconds(state.entries, "2026-08-10", weekStart, NOW_SEC)).toBe(byDays)
    }
  })

  const configs: [string, ReportConfig][] = [
    ["this week", defaultReportConfig("2026-08-10", 1, state.workspace.rounding)],
    [
      "a month grouped by date, rounded, stacked",
      {
        ...defaultReportConfig("2026-08-10", 1, { enabled: true, mode: "up", minutes: 15 }),
        filters: emptyFilters({ start: "2026-07-01", end: "2026-08-31" }),
        grouping: "date",
        subGrouping: "tag",
        chartStackBy: "project",
        sort: { column: "description", direction: "asc" },
      },
    ],
  ]

  /**
   * Money is summed in another order, so it is compared to a millionth. And the running
   * entry is added last rather than where it sits in the list, so two rows with EXACTLY
   * the same total may stand the other way round for that second: rows are compared by
   * key, and the order by size is checked on its own below.
   */
  const rounded = (value: unknown): unknown =>
    JSON.parse(JSON.stringify(value), (_key, v) => {
      if (typeof v === "number") return Math.round(v * 1e6) / 1e6
      if (Array.isArray(v) && v.every((item) => item && typeof item === "object" && "key" in item)) {
        return [...v].sort((a, b) => String(a.key).localeCompare(String(b.key)))
      }
      return v
    })
  const bySize = (values: number[]) => values.every((v, i) => i === 0 || values[i - 1] >= v)

  for (const [name, config] of configs) {
    test(`all four reports match a full rebuild, every second (${name})`, () => {
      const summary = liveReport("summary", state, config)
      const detailed = liveReport("detailed", state, config)
      const workload = liveReport("workload", state, config)
      const profitability = liveReport("profitability", state, config)
      for (const now of seconds) {
        expect(rounded(summary(now))).toEqual(rounded(buildSummary(state, config, now)))
        expect(detailed(now)).toEqual(buildDetailed(state, config, now))
        expect(rounded(workload(now))).toEqual(rounded(buildWorkload(state, config, now)))
        expect(rounded(profitability(now))).toEqual(rounded(buildProfitability(state, config, now)))
        if (config.grouping !== "date") {
          expect(bySize(summary(now).rows.map((r) => r.seconds))).toBe(true)
          expect(bySize(profitability(now).rows.map((r) => r.profit))).toBe(true)
        }
        expect(bySize(workload(now).rows.map((r) => r.total))).toBe(true)
      }
    })
  }

  test("with nothing running, a report is built once and then only read", () => {
    const stopped = { ...state, entries: state.entries.filter((e) => e.stop !== null) }
    const config = configs[0][1]
    const at = liveReport("summary", stopped, config)
    expect(at(NOW_SEC)).toBe(at(NOW_SEC + 60))
    expect(epochSeconds(new Date(NOW_SEC * 1000).toISOString())).toBe(NOW_SEC)
  })
})
