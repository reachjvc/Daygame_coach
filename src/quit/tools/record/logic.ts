import type { BlackBoxRecord } from "@/src/vice/types"
import { forVice, runLanes, stats } from "@/src/vice/blackboxService"
import { addDays, isIsoDay } from "../../record"
import { DAY_MS, amountPerDay, dayStartMs, moneyKept, round2, totalCleanMs, calPos, dayPos, windowFrom, type MoneyRun } from "../../money"
import { daysBetween, mondayIndex } from "../date/logic"

export { daysBetween, mondayIndex }

/** Clean-day steps. */
export const DAY_LADDER = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const
/** Money steps, USD. */
export const MONEY_LADDER = [10, 25, 50, 100, 250, 500, 1000, 2500] as const
/** Period tabs on the Money screen; `null` is the whole time. Rolling windows. */
export const PERIODS = [
  { id: "total", days: null },
  { id: "d7", days: 7 },
  { id: "d30", days: 30 },
  { id: "d365", days: 365 },
] as const
export type PeriodId = (typeof PERIODS)[number]["id"]

export const MAX_SPEND = 100_000
export const MAX_TARGET = 100_000
export const MAX_NOTE = 60

/* ---------- what the Black Box holds, as this tool reads it ---------- */

export interface Moment {
  day: string
  thought: string
}
export interface RunView {
  id: string
  start: string
  /** The slip day, or null while it lives. */
  end: string | null
  /** Black Box days: both ends counted. */
  days: number
  live: boolean
  closeCalls: Moment[]
  /** The slip that ended it. */
  slip: Moment | null
}
export interface RecordView {
  /** Oldest first. */
  runs: RunView[]
  total: number
  /** Days of the living run; null when none lives. */
  current: number | null
  best: number
  closeCalls: number
  /** Every clean day, one entry per counted day, oldest first (the slip day counts, as in the Black Box). */
  cleanDays: string[]
  slips: Moment[]
  closeCallList: Moment[]
}

/** One vice's runs and reports, with the Black Box's own maths (`forVice`, `stats`, `runLanes`, `runDays`). */
export function viewOf(box: BlackBoxRecord, viceId: string, today: string): RecordView {
  // Malformed rows (a report with no valid day, a run with a non-calendar day) are skipped, never a crash.
  const sane: BlackBoxRecord = {
    ...box,
    attempts: box.attempts.filter((a) => isIsoDay(a.startedOn) && (a.endedOn === null || isIsoDay(a.endedOn))),
    reports: box.reports.filter((r) => typeof r.at === "string" && isIsoDay(r.at.slice(0, 10))),
  }
  const mine = forVice(sane, viceId)
  const lanes = runLanes(mine, today)
  const s = stats(mine, today)
  const runs: RunView[] = lanes.map((l) => {
    const ended = l.attempt.endedByReportId ? mine.reports.find((r) => r.id === l.attempt.endedByReportId) : undefined
    return {
      id: l.attempt.id,
      start: l.attempt.startedOn,
      end: l.attempt.endedOn,
      days: l.days,
      live: l.live,
      closeCalls: mine.reports
        .filter((r) => r.attemptId === l.attempt.id && !r.wentThrough)
        .map((r) => ({ day: r.at.slice(0, 10), thought: typeof r.thought === "string" ? r.thought : "" }))
        .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)),
      slip: ended ? { day: ended.at.slice(0, 10), thought: typeof ended.thought === "string" ? ended.thought : "" } : l.attempt.endedOn ? { day: l.attempt.endedOn, thought: "" } : null,
    }
  })
  const cleanDays: string[] = []
  for (const r of runs) for (let i = 0; i < r.days; i++) cleanDays.push(addDays(r.start, i))
  // A calendar day held by two runs (a slip day and the new run that day) counts once here.
  const uniqueDays = [...new Set(cleanDays)].sort()
  return {
    runs,
    total: s.totalCleanDays,
    current: s.currentDays,
    best: s.longestDays,
    closeCalls: s.closeCallsSurvived,
    cleanDays: uniqueDays,
    slips: runs.flatMap((r) => (r.slip ? [r.slip] : [])),
    closeCallList: runs.flatMap((r) => r.closeCalls),
  }
}

/** The runs as money counts them. */
export const moneyRuns = (runs: RunView[]): MoneyRun[] => runs.map((r) => ({ start: r.start, end: r.end }))

/* ---------- the tool's own data ---------- */

export interface Spend {
  id: string
  day: string
  amount: number
  note: string
}
export interface Target {
  id: string
  name: string
  price: number
}

/* ---------- periods ---------- */

/** Spending dated inside the window (from the local day the window starts on). */
export function spentInPeriod(spends: Spend[], days: number | null, nowMs: number): number {
  if (days === null) return round2(spends.reduce((n, s) => n + s.amount, 0))
  const from = addDays(dayKeyOf(nowMs), -days)
  return round2(spends.filter((s) => s.day >= from).reduce((n, s) => n + s.amount, 0))
}

export function dayKeyOf(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/* ---------- clean-day ladder ---------- */

/** The first step above `total`, or null when every step is reached. */
export function nextDayStep(total: number): number | null {
  return DAY_LADDER.find((t) => t > total) ?? null
}

/** The ring's fill, 0 to 1: how far `total` is toward the next step. */
export function ringFill(total: number): number {
  const next = nextDayStep(total)
  return next === null ? 1 : Math.min(1, total / next)
}

export interface DayStep {
  threshold: number
  /** The date of that clean day, or null while not reached. */
  date: string | null
  toGo: number
  /** The day it will be reached if the living run keeps going; null without a living run or once reached. */
  projected: string | null
}

export function dayMilestones(view: RecordView, today: string): DayStep[] {
  return DAY_LADDER.map((t) => {
    const date = view.cleanDays[t - 1] ?? null
    const toGo = Math.max(0, t - view.total)
    return { threshold: t, date, toGo, projected: date === null && view.current !== null ? addDays(today, toGo) : null }
  })
}

/* ---------- money ladder ---------- */

export interface MoneyStep {
  threshold: number
  /** The first day the money kept was at or above the step; only while it is at or above it today. */
  reachedOn: string | null
  /** Days of clean time at the daily rate still needed; null when reached or without an amount a day. */
  daysAtRate: number | null
}

/** The money kept at the end of each day from `first` to `today` (the last one at `nowMs`), spending dated up to that day. */
function dailyMoney(runs: MoneyRun[], spends: Spend[], perDay: number | null, priceUsd: number | null, first: string, today: string, nowMs: number): { day: string; money: number }[] {
  const out: { day: string; money: number }[] = []
  const n = Math.min(4000, daysBetween(first, today))
  for (let i = 0; i <= n; i++) {
    const day = addDays(first, i)
    const at = Math.min(dayStartMs(addDays(day, 1)), nowMs)
    const spent = round2(spends.filter((s) => s.day <= day).reduce((a, s) => a + s.amount, 0))
    const money = moneyKept({ runs, nowMs: at, perDay, priceUsd, spent })
    if (money === null) return []
    out.push({ day, money })
  }
  return out
}

export function moneyMilestones(runs: MoneyRun[], spends: Spend[], perDay: number | null, priceUsd: number | null, today: string, nowMs: number): MoneyStep[] {
  const rate = amountPerDay(perDay, priceUsd)
  const now = moneyKept({ runs, nowMs, perDay, priceUsd, spent: round2(spends.reduce((a, s) => a + s.amount, 0)) })
  const first = runs.length > 0 ? runs.map((r) => r.start).sort()[0] : today
  const days = now !== null && now >= MONEY_LADDER[0] ? dailyMoney(runs, spends, perDay, priceUsd, first, today, nowMs) : []
  return MONEY_LADDER.map((t) => {
    if (now !== null && now >= t) return { threshold: t, reachedOn: days.find((d) => d.money >= t)?.day ?? today, daysAtRate: null }
    return { threshold: t, reachedOn: null, daysAtRate: now !== null && rate !== null && rate > 0 ? Math.ceil((t - now) / rate) : null }
  })
}

/* ---------- targets ---------- */

export interface FilledTarget {
  target: Target
  funded: number
  done: boolean
  /** Money still missing for this target and every one above it; counted from the real total, so more than the price when it is negative. */
  missing: number
  /** Whole days at the daily rate; null without a rate. */
  daysToGo: number | null
}

/** Targets are filled in order from the money kept. The total may be negative: the days to go grow with it. */
export function fillTargets(targets: Target[], money: number, rate: number | null): FilledTarget[] {
  let before = 0
  return targets.map((target) => {
    const upTo = before + target.price
    const funded = round2(Math.min(target.price, Math.max(0, money - before)))
    const done = money >= upTo
    const missing = done ? 0 : round2(upTo - money)
    before = upTo
    return { target, funded, done, missing, daysToGo: done ? 0 : rate !== null && rate > 0 ? Math.ceil(missing / rate) : null }
  })
}

/* ---------- calendar ---------- */

/** Monday-first weeks of day keys for one month; days of other months are null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const count = new Date(year, month + 1, 0).getDate()
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const cells: (string | null)[] = Array<null>(lead).fill(null)
  for (let d = 1; d <= count; d++) cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`)
  while (cells.length % 7) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export interface DayInfo {
  day: string
  today: boolean
  /** A day after today. */
  future: boolean
  /** The run this clean day belongs to, and which day of it. */
  clean: { runStart: string; dayNo: number } | null
  slips: string[]
  closeCalls: string[]
}
export type CellState = "slip" | "clean" | "plain"

export function dayInfo(day: string, view: RecordView, today: string): DayInfo {
  let clean: DayInfo["clean"] = null
  for (const r of view.runs) {
    const last = r.end ?? today
    if (day >= r.start && day <= last) {
      clean = { runStart: r.start, dayNo: daysBetween(r.start, day) + 1 }
      break
    }
  }
  return {
    day,
    today: day === today,
    future: day > today,
    clean,
    slips: view.slips.filter((s) => s.day === day).map((s) => s.thought),
    closeCalls: view.closeCallList.filter((c) => c.day === day).map((c) => c.thought),
  }
}

/** A slip day is dashed even though the Black Box counts it as a day; a clean day is filled; any other day is plain. */
export function cellState(info: DayInfo): CellState {
  if (info.slips.length > 0) return "slip"
  return info.clean ? "clean" : "plain"
}

/** The first and last month (as `[year, month0]`) the calendar can show: the first run's month to this month. */
export function monthSpan(view: RecordView, today: string): { first: [number, number]; last: [number, number] } {
  const [ty, tm] = today.split("-").map(Number)
  const start = view.runs.length > 0 ? view.runs[0].start : today
  const [sy, sm] = start.split("-").map(Number)
  return { first: [sy, sm - 1], last: [ty, tm - 1] }
}

/* ---------- starting a run ---------- */

/**
 * The day to start a run on, or null: the record's date is today or past, the goal is stop or break, and the Black Box
 * holds no run of this vice (living or ended) that started on or after that date.
 */
export function runToStart(quitDate: string | null, goal: string | null, today: string, view: RecordView): string | null {
  if (!quitDate || quitDate > today) return null
  if (goal !== "stop" && goal !== "break") return null
  if (view.runs.some((r) => r.start >= quitDate)) return null
  return quitDate
}

/* ---------- counter ---------- */

export interface Split {
  days: number
  hours: number
  minutes: number
  seconds: number
}
export function splitElapsed(ms: number): Split {
  const t = Math.max(0, Math.floor(ms / 1000))
  return { days: Math.floor(t / 86400), hours: Math.floor((t % 86400) / 3600), minutes: Math.floor((t % 3600) / 60), seconds: t % 60 }
}

/** Days with two decimals and the right plural: "44.87 days", "1 day". */
export function daysText(days: number): string {
  const s = (Math.round(days * 100) / 100).toFixed(2)
  return s === "1.00" ? "1 day" : `${s} days`
}
export const plural = (n: number, one: string, many: string) => (n === 1 ? `${n} ${one}` : `${n} ${many}`)

/* ---------- money for a period ---------- */

export interface PeriodMoney {
  /** Null without a count or a price. */
  money: number | null
  spent: number
  /** Clean time inside the window, in days. */
  cleanDays: number
  /** Where the window starts on the calendar line (`windowFrom`). */
  fromPos: number
}

/** Money kept in a rolling window (`days`) or the whole time (`null`): clean time x count x price - spending dated inside it. */
export function moneyFor(runs: MoneyRun[], unit: { perDay: number | null; priceUsd: number } | null, spends: Spend[], nowMs: number, days: number | null): PeriodMoney {
  const fromPos = windowFrom(days, nowMs)
  const spent = spentInPeriod(spends, days, nowMs)
  const money = unit ? moneyKept({ runs, nowMs, perDay: unit.perDay, priceUsd: unit.priceUsd, spent, fromPos }) : null
  return { money, spent, cleanDays: totalCleanMs(runs, nowMs, fromPos) / DAY_MS, fromPos }
}

/** Milliseconds from 00:00 of `startDay` to now on the calendar line (a clock change never moves it). */
export function elapsedSince(startDay: string, nowMs: number): number {
  return Math.max(0, calPos(nowMs) - dayPos(startDay))
}

/** An amount typed by the reader, rounded to cents; null when it is below one cent. */
export function toCents(value: number): number | null {
  const v = Math.round(value * 100) / 100
  return v >= 0.01 ? v : null
}
