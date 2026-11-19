"use client"

import { useCallback, useEffect, useState } from "react"
import { useQuitStore, type QuitStore } from "./store"

/**
 * The one record per addiction that every quit tool reads and writes: quit
 * date, goal, the end of a break, and the unit with its price. Kept in the
 * `quit-v1` store under the tool key `record`. Days are ISO dates
 * (`YYYY-MM-DD`).
 *
 * Clean runs and slips are NOT here: they live in the Black Box
 * (`src/vice/blackbox/*`, bridged in `src/quit/blackbox.ts`).
 */

export const RECORD_TOOL_KEY = "record"

export type PriceBasis = "typed" | "default"
export interface RecordUnit {
  /** Id from the data file's `units` (cigarettes / vape / pouches). */
  id: string
  /** About how many a day; null when the person skipped it. */
  perDay: number | null
  /** Price of one pack / vape / tin, as the data file's unit says. */
  priceUsd: number
  priceBasis: PriceBasis
}
export type QuitGoal = "stop" | "break" | "later"
export const QUIT_GOALS: readonly QuitGoal[] = ["stop", "break", "later"]
export interface QuitRecord {
  quitDate: string | null
  goal: QuitGoal | null
  /** The day a break ends; null unless the goal is a break. */
  breakEnd: string | null
  unit: RecordUnit | null
}

export function emptyRecord(): QuitRecord {
  return { quitDate: null, goal: null, breakEnd: null, unit: null }
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

/** Sets the quit date and nothing else; no tool's past is touched. */
export function setQuitDate(record: QuitRecord, date: string): QuitRecord {
  if (!isIsoDay(date)) return record
  return { ...record, quitDate: date }
}

/** Takes the quit date away (back to "no date"), and nothing else. */
export function clearQuitDate(record: QuitRecord): QuitRecord {
  return { ...record, quitDate: null }
}

/** Sets goal, date and break end together (a break end only goes with a break). */
export function setPlan(record: QuitRecord, plan: { goal: QuitGoal; quitDate: string | null; breakEnd: string | null }): QuitRecord {
  return {
    ...record,
    goal: plan.goal,
    quitDate: plan.quitDate !== null && isIsoDay(plan.quitDate) ? plan.quitDate : null,
    breakEnd: plan.goal === "break" && plan.breakEnd !== null && isIsoDay(plan.breakEnd) ? plan.breakEnd : null,
  }
}

export function setUnit(record: QuitRecord, unit: RecordUnit | null): QuitRecord {
  return { ...record, unit }
}

/** Reads whatever is stored and returns a safe record; bad parts fall back to empty. */
export function parseRecord(raw: unknown): QuitRecord {
  if (!raw || typeof raw !== "object") return emptyRecord()
  const r = raw as Partial<QuitRecord>
  const u = r.unit
  const unit =
    u && typeof u.id === "string" && (u.perDay === null || Number.isFinite(u.perDay)) && Number.isFinite(u.priceUsd)
      ? { id: u.id, perDay: u.perDay === null ? null : u.perDay, priceUsd: u.priceUsd, priceBasis: u.priceBasis === "typed" ? ("typed" as const) : ("default" as const) }
      : null
  const goal = (QUIT_GOALS as readonly unknown[]).includes(r.goal) ? (r.goal as QuitGoal) : null
  return {
    quitDate: isIsoDay(r.quitDate) ? r.quitDate : null,
    goal,
    breakEnd: goal === "break" && isIsoDay(r.breakEnd) ? r.breakEnd : null,
    unit,
  }
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
    setQuitDate: (date: string) => update((r) => setQuitDate(r, date)),
    clearQuitDate: () => update((r) => clearQuitDate(r)),
    setPlan: (plan: { goal: QuitGoal; quitDate: string | null; breakEnd: string | null }) => update((r) => setPlan(r, plan)),
    setUnit: (unit: RecordUnit | null) => update((r) => setUnit(r, unit)),
  }
}
