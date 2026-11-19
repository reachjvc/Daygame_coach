/**
 * Money kept since quitting, one place for every quit tool.
 *
 * Clean time x count a day x price of one - spending. Clean time per run runs from 00:00 of its start day to now
 * while it lives, and to 00:00 of its end day once a slip ended it (the slip day is not counted for money). Days
 * are local calendar days (`YYYY-MM-DD`), times are milliseconds.
 */

export const DAY_MS = 86_400_000

export interface MoneyRun {
  start: string
  /** The day a slip ended the run, or null while it lives. */
  end: string | null
}

/** 00:00 local time of a day. */
export function dayStartMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** Clean milliseconds of one run, optionally only the part from `fromMs` on. Never negative. */
export function cleanMs(run: MoneyRun, nowMs: number, fromMs = Number.NEGATIVE_INFINITY): number {
  const from = Math.max(dayStartMs(run.start), fromMs)
  const to = run.end === null ? nowMs : Math.min(dayStartMs(run.end), nowMs)
  return Math.max(0, to - from)
}

/** Clean milliseconds over all runs, optionally only from `fromMs` on. */
export function totalCleanMs(runs: MoneyRun[], nowMs: number, fromMs = Number.NEGATIVE_INFINITY): number {
  return runs.reduce((n, r) => n + cleanMs(r, nowMs, fromMs), 0)
}

export const round2 = (n: number) => Math.round(n * 100) / 100

/** What one clean day is worth: count a day x price of one. Null without a count or a price. */
export function amountPerDay(perDay: number | null | undefined, priceUsd: number | null | undefined): number | null {
  if (perDay === null || perDay === undefined || priceUsd === null || priceUsd === undefined) return null
  if (!Number.isFinite(perDay) || !Number.isFinite(priceUsd) || perDay <= 0) return null
  return perDay * priceUsd
}

export interface MoneyInput {
  runs: MoneyRun[]
  nowMs: number
  perDay: number | null | undefined
  priceUsd: number | null | undefined
  /** Spending to take off, in dollars. */
  spent?: number
  /** Count only clean time from here on (a period window). */
  fromMs?: number
}

/** Money kept, rounded to cents; negative when spending is more. Null without a count or a price. */
export function moneyKept(i: MoneyInput): number | null {
  const rate = amountPerDay(i.perDay, i.priceUsd)
  if (rate === null) return null
  const days = totalCleanMs(i.runs, i.nowMs, i.fromMs) / DAY_MS
  return round2(rate * days - (i.spent ?? 0))
}

/** Units not used: clean time x count a day, rounded down. Null without a count. */
export function unitsNotUsed(runs: MoneyRun[], nowMs: number, perDay: number | null | undefined, fromMs?: number): number | null {
  if (perDay === null || perDay === undefined || !Number.isFinite(perDay) || perDay <= 0) return null
  return Math.floor((totalCleanMs(runs, nowMs, fromMs) / DAY_MS) * perDay)
}

/** `$1,234.50`, and `−$367.46` with a real minus sign before the dollar sign. */
export function fmtMoney(n: number): string {
  const v = Math.abs(round2(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return round2(n) < 0 ? `−$${v}` : `$${v}`
}
