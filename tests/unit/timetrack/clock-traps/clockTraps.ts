/**
 * SHARED SETUP FOR THE CLOCK-TRAP TESTS: A FIXED CLOCK, A FIXED ZONE, REAL FUNCTIONS.
 *
 * The suite runs in Europe/Copenhagen (`vitest.config.ts` `env.TZ`). A file that
 * needs another zone changes `process.env.TZ` for its own tests with `useZone`
 * and puts it back afterwards, the way `tests/unit/quit/money.test.ts` does:
 * Node re-reads `TZ` the moment it is assigned, so `new Date()` follows. The
 * zone never leaks to the next file, which may run in the same worker.
 *
 * Entries are made with the product's own `startTimer`, `stopTimer` and
 * `createManualEntry`, so a length here is the length the app would store.
 */

import { afterEach, beforeEach, vi } from "vitest"

import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { createManualEntry, startTimer, stopTimer } from "@/src/timetrack/timetrackService"
import type { IsoDateTime, TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState } from "../helpers"

export const COPENHAGEN = "Europe/Copenhagen"

/** An instant from a wall-clock time in the zone the test runs in (month is 1-12) */
export function wall(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): IsoDateTime {
  return new Date(year, month - 1, day, hour, minute, second, 0).toISOString()
}

export const secondsOf = (iso: IsoDateTime): number => epochSeconds(iso)

/** Hours between two wall-clock midnights: 23, 24 or 25 */
export function hoursInDay(year: number, month: number, day: number): number {
  return (new Date(year, month - 1, day + 1).getTime() - new Date(year, month - 1, day).getTime()) / 3_600_000
}

const DRAFT = { projectId: null, taskId: null, tagIds: [], billable: false }

/** A state with one timer running since `startIso`, started the way the Start button does */
export function withTimerSince(startIso: IsoDateTime, description = "Work", state: TimetrackState = baseState()): TimetrackState {
  return startTimer(state, { ...DRAFT, description }, startIso).state
}

/** A state with one finished entry, made the way a typed start and end make one */
export function withEntry(startIso: IsoDateTime, stopIso: IsoDateTime, description = "Work", state: TimetrackState = baseState()): TimetrackState {
  const made = createManualEntry(state, { draft: { ...DRAFT, description }, start: startIso, stop: stopIso }, stopIso)
  if (!made.entry) throw new Error(`the test's own entry was refused: ${made.violations.map((v) => v.message).join("; ")}`)
  return made.state
}

export function entryNamed(state: TimetrackState, description: string): TimeEntry {
  const found = state.entries.find((e) => e.description === description)
  if (!found) throw new Error(`no entry named ${description}`)
  return found
}

/** Stop the running timer at `nowIso`, as the Stop button does, and hand back the finished entry */
export function stoppedAt(state: TimetrackState, nowIso: IsoDateTime): { state: TimetrackState; entry: TimeEntry } {
  const result = stopTimer(state, nowIso)
  if (!result.stopped) throw new Error("no timer was running to stop")
  return { state: result.state, entry: result.stopped }
}

/**
 * Freezes the page's clock at `nowIso` for every test of the file, and thaws it after.
 * Only `Date` is faked: nothing here may wait on a real or fake timer.
 */
export function freezeClockAt(nowIso: () => IsoDateTime): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(nowIso()))
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}

/** Puts the zone back after every test, so a test may move the phone with `process.env.TZ = ...` */
export function restoreZoneAfterEach(): void {
  let before: string | undefined
  beforeEach(() => {
    before = process.env.TZ
  })
  afterEach(() => {
    if (before === undefined) delete process.env.TZ
    else process.env.TZ = before
  })
}

/** Moves the phone to `zone`, and throws when the page does not draw in it, so a zone test cannot pass in the wrong zone */
export function movePhoneTo(zone: string): void {
  process.env.TZ = zone
  const now = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (now !== zone) throw new Error(`TZ=${zone} did not apply: the page still draws in ${now}`)
}

/**
 * Runs every test of the file with the phone's own zone set to `zone`, then puts back
 * the zone the suite pinned. Call it inside the `describe` that needs it.
 */
export function useZone(zone: () => string): void {
  restoreZoneAfterEach()
  beforeEach(() => movePhoneTo(zone()))
}

/** What an entry list shows in its boxes: descriptions, start, end and length are all input values */
export function boxValues(container: HTMLElement): string[] {
  return [...container.querySelectorAll("input")].map((input) => input.value)
}

/** Each day header of the list with what is written beside it, e.g. "Today18:00" */
export function dayHeaders(container: HTMLElement): { title: string; text: string }[] {
  return [...container.querySelectorAll("section")].map((s) => ({ title: s.querySelector("h3")?.textContent ?? "", text: s.textContent ?? "" }))
}
