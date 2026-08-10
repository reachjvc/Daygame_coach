import { describe, expect, test } from "vitest"

import { CREATED_WITH, FORGOTTEN_TIMER_HOURS, SEED_CREATED_WITH } from "@/src/timetrack/config"
import {
  demoDataSummary,
  forgottenTimer,
  isDemoEntry,
  refreshDemoHistory,
} from "@/src/timetrack/demoDataService"
import { dateKey, epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { entrySeconds, isRunning } from "@/src/timetrack/timetrackService"

import { NOW_ISO, baseState, entry } from "./helpers"

const NOW_SEC = epochSeconds(NOW_ISO)
const demo = { createdWith: SEED_CREATED_WITH }
const mine = { createdWith: CREATED_WITH }

describe("demo entry tagging", () => {
  test("only seeded rows count as demo data", () => {
    expect(isDemoEntry(entry(1, "2026-08-10", "09:00", "10:00", demo))).toBe(true)
    expect(isDemoEntry(entry(2, "2026-08-10", "09:00", "10:00", mine))).toBe(false)
  })

  test("summary splits demo from own entries", () => {
    const state = baseState({
      entries: [entry(1, "2026-08-10", "09:00", "10:00", demo), entry(2, "2026-08-10", "10:00", "11:00", mine)],
    })
    expect(demoDataSummary(state)).toEqual({ demo: 1, mine: 1 })
  })
})

describe("refreshDemoHistory", () => {
  test("does nothing when the demo already ends today", () => {
    const state = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", demo)] })
    const result = refreshDemoHistory(state, NOW_ISO)
    expect(result.shifted).toBe(0)
    expect(result.days).toBe(0)
    expect(result.state).toBe(state)
  })

  test("does nothing when there is no demo data at all", () => {
    const state = baseState({ entries: [entry(1, "2026-08-01", "09:00", "10:00", mine)] })
    expect(refreshDemoHistory(state, NOW_ISO).shifted).toBe(0)
  })

  test("moves a stale demo history forward so its newest day is today", () => {
    // Demo seeded three days ago: 2026-08-05 and 2026-08-07 (newest)
    const state = baseState({
      entries: [
        entry(1, "2026-08-05", "09:00", "10:00", demo),
        entry(2, "2026-08-07", "09:00", "10:30", demo),
      ],
    })
    const result = refreshDemoHistory(state, NOW_ISO)
    expect(result.days).toBe(3)
    expect(result.shifted).toBe(2)
    const days = result.state.entries.map((e) => dateKey(e.start)).sort()
    expect(days).toEqual(["2026-08-08", "2026-08-10"])
  })

  test("preserves each demo entry's duration and time of day", () => {
    const original = entry(1, "2026-08-07", "09:15", "10:45", demo)
    const result = refreshDemoHistory(baseState({ entries: [original] }), NOW_ISO)
    const moved = result.state.entries[0]
    expect(moved.duration).toBe(original.duration)
    expect(new Date(moved.start).getHours()).toBe(new Date(original.start).getHours())
    expect(new Date(moved.start).getMinutes()).toBe(new Date(original.start).getMinutes())
  })

  test("never leaves a demo entry ending in the future", () => {
    // NOW_ISO is 12:00 UTC; a 20:00-22:00 block would land in the future today
    const state = baseState({
      entries: [
        entry(1, "2026-08-07", "20:00", "22:00", demo),
        entry(2, "2026-08-07", "09:00", "10:00", demo),
      ],
    })
    const result = refreshDemoHistory(state, NOW_ISO)
    for (const moved of result.state.entries) {
      expect(epochSeconds(moved.stop!)).toBeLessThanOrEqual(NOW_SEC)
    }
  })

  test("re-anchors a stale running demo timer to minutes ago, not days", () => {
    const staleStart = new Date(2026, 7, 7, 9, 0).toISOString()
    const state = baseState({
      entries: [
        {
          ...entry(1, "2026-08-07", "09:00", "10:00", demo),
          stop: null,
          duration: -epochSeconds(staleStart),
        },
      ],
    })
    const result = refreshDemoHistory(state, NOW_ISO)
    const running = result.state.entries[0]
    expect(isRunning(running)).toBe(true)
    const elapsed = entrySeconds(running, NOW_SEC)
    expect(elapsed).toBeGreaterThanOrEqual(60)
    expect(elapsed).toBeLessThanOrEqual(25 * 60)
    expect(dateKey(running.start)).toBe(dateKey(NOW_ISO))
  })

  test("leaves the user's own entries exactly where they were", () => {
    const ownEntry = entry(2, "2026-08-01", "09:00", "10:00", mine)
    const state = baseState({ entries: [entry(1, "2026-08-07", "09:00", "10:00", demo), ownEntry] })
    const result = refreshDemoHistory(state, NOW_ISO)
    const untouched = result.state.entries.find((e) => e.id === 2)!
    expect(untouched.start).toBe(ownEntry.start)
    expect(untouched.stop).toBe(ownEntry.stop)
  })
})

describe("forgottenTimer", () => {
  test("reports a timer running longer than the threshold", () => {
    const start = new Date((NOW_SEC - (FORGOTTEN_TIMER_HOURS + 2) * 3600) * 1000).toISOString()
    const state = baseState({
      entries: [{ ...entry(1, "2026-08-09", "09:00", "10:00", mine), start, stop: null, duration: -epochSeconds(start) }],
    })
    const result = forgottenTimer(state, NOW_SEC)
    expect(result?.hours).toBeCloseTo(FORGOTTEN_TIMER_HOURS + 2, 1)
  })

  test("stays quiet for a normal running timer", () => {
    const start = new Date((NOW_SEC - 1800) * 1000).toISOString()
    const state = baseState({
      entries: [{ ...entry(1, "2026-08-10", "09:00", "10:00", mine), start, stop: null, duration: -epochSeconds(start) }],
    })
    expect(forgottenTimer(state, NOW_SEC)).toBeNull()
  })

  test("stays quiet when nothing is running", () => {
    expect(forgottenTimer(baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", mine)] }), NOW_SEC)).toBeNull()
  })
})
