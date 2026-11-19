/**
 * Money kept since quitting, one place for every quit tool.
 *
 * Clean time x count a day x price of one - spending. Clean time per run runs from 00:00 of its start day to now
 * while it lives, and to 00:00 of its end day once a slip ended it (the slip day is not counted for money).
 * Days are local calendar days (`YYYY-MM-DD`). Time is measured on a calendar line: whole calendar days between
 * the day keys (as the Black Box counts them) plus the time since local 00:00 of the last day, so a clock change
 * never moves a run by an hour.
 */

export const DAY_MS = 86_400_000

export interface MoneyRun {
  start: string
  /** The day a slip ended the run, or null while it lives. */
  end: string | null
}

/** 00:00 local time of a day, in real milliseconds. */
export function dayStartMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** A position on the calendar line: the day (as UTC calendar days) in milliseconds. */
export function dayPos(day: string): number {
  const [y, m, d] = day.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

function keyOf(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** A real instant on the calendar line: its day plus the time since local 00:00. */
export function calPos(ms: number): number {
  const key = keyOf(ms)
  return dayPos(key) + (ms - dayStartMs(key))
}

/** The start of a rolling window of `days` ending now, on the calendar line; `-Infinity` for the whole time. */
export function windowFrom(days: number | null, nowMs: number): number {
  return days === null ? Number.NEGATIVE_INFINITY : calPos(nowMs) - days * DAY_MS
}

/** The clean stretches of the runs on the calendar line, overlaps merged so no time counts twice. */
export function cleanIntervals(runs: MoneyRun[], nowMs: number): [number, number][] {
  const now = calPos(nowMs)
  const raw: [number, number][] = []
  for (const r of runs) {
    const from = dayPos(r.start)
    const to = r.end === null ? now : Math.min(dayPos(r.end), now)
    if (to > from) raw.push([from, to])
  }
  raw.sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  for (const iv of raw) {
    const last = out[out.length - 1]
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1])
    else out.push([iv[0], iv[1]])
  }
  return out
}

/** Clean milliseconds over all runs (overlaps counted once), optionally only the part from `fromPos` on. */
export function totalCleanMs(runs: MoneyRun[], nowMs: number, fromPos = Number.NEGATIVE_INFINITY): number {
  return cleanIntervals(runs, nowMs).reduce((n, [a, b]) => n + Math.max(0, b - Math.max(a, fromPos)), 0)
}

/** Clean milliseconds of one run. */
export function cleanMs(run: MoneyRun, nowMs: number, fromPos = Number.NEGATIVE_INFINITY): number {
  return totalCleanMs([run], nowMs, fromPos)
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
  /** Count only clean time from here on, on the calendar line (a period window, `windowFrom`). */
  fromPos?: number
}

/** Money kept, rounded to cents; negative when spending is more. Null without a count or a price. */
export function moneyKept(i: MoneyInput): number | null {
  const rate = amountPerDay(i.perDay, i.priceUsd)
  if (rate === null) return null
  const days = totalCleanMs(i.runs, i.nowMs, i.fromPos) / DAY_MS
  return round2(rate * days - (i.spent ?? 0))
}

/** Units not used: clean time x count a day, rounded down. Null without a count. */
export function unitsNotUsed(runs: MoneyRun[], nowMs: number, perDay: number | null | undefined, fromPos?: number): number | null {
  if (perDay === null || perDay === undefined || !Number.isFinite(perDay) || perDay <= 0) return null
  return Math.floor((totalCleanMs(runs, nowMs, fromPos) / DAY_MS) * perDay)
}

/** `$1,234.50`, and `-$367.46` with a real minus sign before the dollar sign. */
export function fmtMoney(n: number): string {
  const v = Math.abs(round2(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return round2(n) < 0 ? `−$${v}` : `$${v}`
}
