"use client"

import { useCallback, useEffect, useState } from "react"
import { useQuitStore, type QuitStore } from "./store"

/**
 * The one record per addiction that every quit tool reads and writes: quit
 * date, clean runs, slips, and the unit with its price. Kept in the `quit-v1`
 * store under the tool key `record`. Days are ISO dates (`YYYY-MM-DD`).
 *
 * A "run" is a stretch of clean days. A run covers `start` up to but not
 * including `end` (the day of the slip or restart); an open run (`end: null`)
 * covers `start` up to but not including today. So the day you quit counts 0,
 * the next morning counts 1. Runs are never deleted.
 */

export const RECORD_TOOL_KEY = "record"

export type RunEnd = "slip" | "reset"
export interface Run {
  start: string
  end: string | null
  endedBy: RunEnd | null
}
export interface Slip {
  id: string
  day: string
  note?: string
}
export type PriceBasis = "typed" | "default"
export interface RecordUnit {
  /** Id from the data file's `units` (cigarettes / vape / pouches). */
  id: string
  perDay: number
  /** Price of one pack / vape / tin, as the data file's unit says. */
  priceUsd: number
  priceBasis: PriceBasis
}
export interface QuitRecord {
  quitDate: string | null
  runs: Run[]
  slips: Slip[]
  unit: RecordUnit | null
}

export function emptyRecord(): QuitRecord {
  return { quitDate: null, runs: [], slips: [], unit: null }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDay(x: unknown): x is string {
  if (typeof x !== "string" || !ISO.test(x)) return false
  const d = new Date(`${x}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x
}

function dayNumber(day: string): number {
  return Math.round(new Date(`${day}T00:00:00Z`).getTime() / 86_400_000)
}

export function addDays(day: string, n: number): string {
  return new Date((dayNumber(day) + n) * 86_400_000).toISOString().slice(0, 10)
}

/** Today in the browser's own zone, as an ISO day. */
export function todayIso(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${m}-${d}`
}

function runDays(run: Run, today: string): number {
  const stop = run.end !== null && run.end < today ? run.end : today
  return Math.max(0, dayNumber(stop) - dayNumber(run.start))
}

/** Clean days over all runs. */
export function cleanDays(record: QuitRecord, today: string): number {
  return record.runs.reduce((sum, r) => sum + runDays(r, today), 0)
}

/** The run that is still going, or null. */
export function currentRun(record: QuitRecord): Run | null {
  return record.runs.find((r) => r.end === null) ?? null
}

/** Clean days in the current run only (0 when no run is open). */
export function currentRunDays(record: QuitRecord, today: string): number {
  const run = currentRun(record)
  return run ? runDays(run, today) : 0
}

function sortRuns(runs: Run[]): Run[] {
  return [...runs].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
}

/** First day after `day` that is not itself a slip day. */
function nextCleanDay(slips: Slip[], day: string): string {
  let next = addDays(day, 1)
  while (slips.some((s) => s.day === next)) next = addDays(next, 1)
  return next
}

/**
 * Records a slip on `day` (any day up to `today`). The run that held that day
 * ends there; a new run starts on the next clean day. A second slip on the
 * same day, a bad date or a future day changes nothing.
 */
export function addSlip(record: QuitRecord, day: string, today: string, note?: string): QuitRecord {
  if (!isIsoDay(day) || day > today) return record
  if (record.slips.some((s) => s.day === day)) return record
  let n = 1
  while (record.slips.some((s) => s.id === `s-${day}-${n}`)) n++
  const slip: Slip = { id: `s-${day}-${n}`, day, ...(note ? { note } : {}) }
  const slips = [...record.slips, slip]
  const runs: Run[] = []
  for (const run of record.runs) {
    const holds = run.start <= day && (run.end === null || run.end > day)
    if (!holds) {
      runs.push(run)
      continue
    }
    if (run.start < day) runs.push({ start: run.start, end: day, endedBy: "slip" })
    const next = nextCleanDay(slips, day)
    if (run.end === null || next < run.end) runs.push({ start: next, end: run.end, endedBy: run.endedBy })
  }
  // A slip before any run (or on a run's first day) still opens a run after it.
  if (record.runs.length === 0) {
    runs.push({ start: nextCleanDay(slips, day), end: null, endedBy: null })
  }
  return { ...record, slips, runs: sortRuns(runs) }
}

/** Removes a slip by id and joins the runs on both sides of it. */
export function undoSlip(record: QuitRecord, id: string): QuitRecord {
  const slip = record.slips.find((s) => s.id === id)
  if (!slip) return record
  const slips = record.slips.filter((s) => s.id !== id)
  const runs = sortRuns(record.runs)
  const i = runs.findIndex((r) => r.end === slip.day && r.endedBy === "slip")
  const merged: Run[] = []
  if (i === -1) {
    // The slip opened the record or sat on a run's first day: nothing to join.
    const j = runs.findIndex((r) => r.start === nextCleanDay(record.slips, slip.day))
    if (j === -1) return { ...record, slips }
    runs.forEach((r, k) => merged.push(k === j ? { ...r, start: slip.day } : r))
    return { ...record, slips, runs: merged }
  }
  const nextStart = nextCleanDay(record.slips, slip.day)
  const j = runs.findIndex((r, k) => k > i && r.start === nextStart)
  runs.forEach((r, k) => {
    if (k === i) {
      const after = j === -1 ? null : runs[j]
      merged.push({ start: r.start, end: after ? after.end : null, endedBy: after ? after.endedBy : null })
    } else if (k !== j) merged.push(r)
  })
  return { ...record, slips, runs: merged }
}

/**
 * Sets the quit date. First time: opens a run on that date. Later: moving the
 * date earlier on an untouched record moves the run; any other change closes
 * the open run on the new date ("reset") and opens a fresh one there. No past
 * run is ever removed.
 */
export function setQuitDate(record: QuitRecord, date: string, today: string): QuitRecord {
  if (!isIsoDay(date)) return record
  const open = currentRun(record)
  const base = { ...record, quitDate: date }
  if (!open) {
    const last = sortRuns(record.runs).at(-1)
    const start = last?.end && last.end >= date ? addDays(last.end, 1) : date
    return { ...base, runs: sortRuns([...record.runs, { start, end: null, endedBy: null }]) }
  }
  if (open.start === date) return base
  const others = record.runs.filter((r) => r !== open)
  const floor = sortRuns(others).at(-1)?.end
  const lowest = floor ? addDays(floor, 1) : null
  if (date < open.start) {
    const start = lowest && date < lowest ? lowest : date
    return { ...base, runs: sortRuns([...others, { ...open, start }]) }
  }
  if (others.length === 0 && open.start >= today) {
    return { ...base, runs: [{ ...open, start: date }] }
  }
  return {
    ...base,
    runs: sortRuns([...others, { start: open.start, end: date, endedBy: "reset" }, { start: date, end: null, endedBy: null }]),
  }
}

export function setUnit(record: QuitRecord, unit: RecordUnit | null): QuitRecord {
  return { ...record, unit }
}

/** Reads whatever is stored and returns a safe record; bad parts fall back to empty. */
export function parseRecord(raw: unknown): QuitRecord {
  if (!raw || typeof raw !== "object") return emptyRecord()
  const r = raw as Partial<QuitRecord>
  const runs = Array.isArray(r.runs)
    ? r.runs.filter((x): x is Run => !!x && isIsoDay(x.start) && (x.end === null || isIsoDay(x.end)))
    : []
  const slips = Array.isArray(r.slips)
    ? r.slips.filter((x): x is Slip => !!x && typeof x.id === "string" && isIsoDay(x.day))
    : []
  const u = r.unit
  const unit =
    u && typeof u.id === "string" && Number.isFinite(u.perDay) && Number.isFinite(u.priceUsd)
      ? { id: u.id, perDay: u.perDay, priceUsd: u.priceUsd, priceBasis: u.priceBasis === "typed" ? ("typed" as const) : ("default" as const) }
      : null
  return { quitDate: isIsoDay(r.quitDate) ? r.quitDate : null, runs, slips, unit }
}

export function loadRecord(store: QuitStore, addiction: string): QuitRecord {
  return parseRecord(store.get(addiction, RECORD_TOOL_KEY))
}

export function saveRecord(store: QuitStore, addiction: string, record: QuitRecord): void {
  store.set(addiction, RECORD_TOOL_KEY, record)
}

/**
 * The shared record for one addiction. `ready` is false on the server and the
 * first client render (so markup matches), true once the browser copy loaded.
 */
export function useQuitRecord(addiction: string) {
  const store = useQuitStore()
  const [record, setRecord] = useState<QuitRecord>(emptyRecord)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setRecord(loadRecord(store, addiction))
    setReady(true)
  }, [store, addiction])

  const update = useCallback(
    (fn: (current: QuitRecord) => QuitRecord) => {
      const next = fn(loadRecord(store, addiction))
      saveRecord(store, addiction, next)
      setRecord(next)
    },
    [store, addiction],
  )

  return {
    record,
    ready,
    setQuitDate: (date: string, today: string = todayIso()) => update((r) => setQuitDate(r, date, today)),
    addSlip: (day: string, note?: string, today: string = todayIso()) => update((r) => addSlip(r, day, today, note)),
    undoSlip: (id: string) => update((r) => undoSlip(r, id)),
    setUnit: (unit: RecordUnit | null) => update((r) => setUnit(r, unit)),
  }
}
