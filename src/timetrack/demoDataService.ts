/**
 * Keeps the seeded demo history anchored to today.
 *
 * The sandbox stores everything in localStorage, so a demo generated on Monday
 * still says Monday when you reopen it on Thursday: "Today" is empty, the week
 * total reads 0:00, and the demo's running entry looks like a timer left going
 * for three days. This module re-dates the demo rows so the sandbox always
 * opens on a plausible today.
 *
 * Only entries tagged with SEED_CREATED_WITH are touched — anything you created
 * yourself keeps its original dates.
 */

import { FORGOTTEN_TIMER_HOURS, SEED_CREATED_WITH } from "./config"
import { dateKey, daysBetween, epochSeconds } from "./timetrackFormatService"
import { entrySeconds, isRunning } from "./timetrackService"
import type { IsoDateTime, TimeEntry, TimetrackState } from "./types"

export function isDemoEntry(entry: TimeEntry): boolean {
  return entry.createdWith === SEED_CREATED_WITH
}

function shiftIso(iso: IsoDateTime, days: number): IsoDateTime {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString()
}

export interface DemoRefreshResult {
  state: TimetrackState
  /** How many demo entries were re-dated (0 when nothing was stale) */
  shifted: number
  /** Whole days the demo history moved forward */
  days: number
}

/**
 * Move the demo history forward so its newest day is today.
 *
 * Entries that would land later than `nowIso` are pushed back one more day, so
 * the demo never shows time tracked in the future, and a still-running demo
 * entry is re-anchored to have started shortly before now.
 */
export function refreshDemoHistory(state: TimetrackState, nowIso: IsoDateTime): DemoRefreshResult {
  const demoEntries = state.entries.filter(isDemoEntry)
  if (demoEntries.length === 0) return { state, shifted: 0, days: 0 }

  const todayKey = dateKey(nowIso)
  const newestDay = demoEntries.reduce((newest, entry) => {
    const day = dateKey(entry.start)
    return day > newest ? day : newest
  }, "0000-00-00")
  const days = daysBetween(newestDay, todayKey)
  if (days <= 0) return { state, shifted: 0, days: 0 }

  const nowEpoch = epochSeconds(nowIso)
  let shifted = 0

  const entries = state.entries.map((entry) => {
    if (!isDemoEntry(entry)) return entry
    shifted++

    if (isRunning(entry)) {
      // Re-anchor the live demo timer to a believable few minutes ago
      const elapsed = Math.max(60, Math.min(entrySeconds(entry, nowEpoch), 25 * 60))
      const start = new Date((nowEpoch - elapsed) * 1000).toISOString()
      return { ...entry, start, stop: null, duration: -epochSeconds(start), at: nowIso }
    }

    let start = shiftIso(entry.start, days)
    let stop = entry.stop ? shiftIso(entry.stop, days) : null
    // Nothing may end in the future — such a block belongs to the previous day
    if (stop && epochSeconds(stop) > nowEpoch) {
      start = shiftIso(start, -1)
      stop = shiftIso(stop, -1)
    }
    return { ...entry, start, stop, at: nowIso }
  })

  return { state: { ...state, entries }, shifted, days }
}

/**
 * A timer running for an implausible length of time is almost always one that
 * was forgotten (or a sandbox tab left open overnight). Toggl nags about this
 * rather than editing it, so this only reports.
 */
export function forgottenTimer(state: TimetrackState, nowSec: number): { entry: TimeEntry; hours: number } | null {
  const running = state.entries.find((entry) => isRunning(entry) && !entry.serverDeletedAt)
  if (!running) return null
  const hours = entrySeconds(running, nowSec) / 3600
  if (hours < FORGOTTEN_TIMER_HOURS) return null
  return { entry: running, hours }
}

/** Human summary for the Data settings panel */
export function demoDataSummary(state: TimetrackState): { demo: number; mine: number } {
  const demo = state.entries.filter(isDemoEntry).length
  return { demo, mine: state.entries.length - demo }
}
