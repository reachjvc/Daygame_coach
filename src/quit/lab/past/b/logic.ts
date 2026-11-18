export type Unit = "money" | "time"

export interface Entry {
  id: string
  /** ISO time the entry is about. */
  at: string
  note: string
  relapse: boolean
  amount: number
  unit: Unit
}

export interface Stretch {
  from: number
  to: number
  ms: number
  current: boolean
}

const DAY = 86_400_000
const HOUR = 3_600_000
const MIN = 60_000

/** Example habit data, labelled as such on every screen. Lengths in days of the finished stretches. */
export const EXAMPLE_STRETCH_DAYS = [6.2, 6.9, 9.4, 8.8, 4.6, 9.7, 7.3, 8.6]
export const EXAMPLE_CURRENT_MS = 19 * DAY + 18 * HOUR + 23 * MIN
export const EXAMPLE_PER_DAY_USD = 6
export const EXAMPLE_GOAL_DAYS = 90
export const EXAMPLE_GOAL_PRICE_USD = 30

/** Example start and relapse entries, laid back from `now` so the current stretch is the seen length. */
export function exampleData(now: number): { start: number; entries: Entry[] } {
  const total = EXAMPLE_STRETCH_DAYS.reduce((s, d) => s + d * DAY, 0) + EXAMPLE_CURRENT_MS
  const start = now - total
  let t = start
  const entries = EXAMPLE_STRETCH_DAYS.map((d, i): Entry => {
    t += d * DAY
    return { id: `ex-${i}`, at: new Date(t).toISOString(), note: "", relapse: true, amount: i % 2 === 0 ? 20 : 0, unit: "money" }
  })
  return { start, entries }
}

/** Every stretch from `start` to `now`: one per relapse entry, then the running one. */
export function stretches(start: number, entries: readonly Entry[], now: number): Stretch[] {
  const cuts = entries
    .filter((e) => e.relapse)
    .map((e) => Date.parse(e.at))
    .filter((t) => Number.isFinite(t) && t > start && t < now)
    .sort((a, b) => a - b)
  const out: Stretch[] = []
  let from = start
  for (const t of cuts) {
    out.push({ from, to: t, ms: t - from, current: false })
    from = t
  }
  out.push({ from, to: now, ms: Math.max(0, now - from), current: true })
  return out
}

/** Average of the finished stretches; the running one when none has finished. */
export function averageMs(list: readonly Stretch[]): number {
  const done = list.filter((s) => !s.current)
  const pool = done.length > 0 ? done : list
  if (pool.length === 0) return 0
  return pool.reduce((s, x) => s + x.ms, 0) / pool.length
}

/** "19 days, 18 hr, 23 min". */
export function durationText(ms: number): string {
  const m = Math.max(0, Math.floor(ms / MIN))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  return `${d} days, ${h} hr, ${m % 60} min`
}

function mdy(t: number): string {
  const d = new Date(t)
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`
}

/** "08/19/2026 - 09/08/2026". */
export function datesText(s: Stretch): string {
  return `${mdy(s.from)} - ${mdy(s.to)}`
}

/** Bar heights as shares of the longest stretch, 0 to 1. */
export function barShares(list: readonly Stretch[]): number[] {
  const max = Math.max(1, ...list.map((s) => s.ms))
  return list.map((s) => s.ms / max)
}

/** Money for a length of clean time at a per-day amount, one decimal. */
export function moneyFor(ms: number, perDay: number): number {
  return Math.round((ms / DAY) * perDay * 10) / 10
}

export interface Savings {
  sinceBegan: number
  fromBeginning: number
  balance: number
}

/** Savings: relapse spending comes off the balance but not off "from the beginning". */
export function savings(list: readonly Stretch[], entries: readonly Entry[], perDay: number, purchased: number): Savings {
  const cleanMs = list.reduce((s, x) => s + x.ms, 0)
  const current = list.find((s) => s.current)?.ms ?? 0
  const spent = entries.filter((e) => e.relapse && e.unit === "money").reduce((s, e) => s + e.amount, 0)
  const fromBeginning = moneyFor(cleanMs, perDay)
  return {
    sinceBegan: moneyFor(current, perDay),
    fromBeginning,
    balance: Math.round((fromBeginning - spent - purchased) * 10) / 10,
  }
}

/** Ring share toward a goal, 0 to 1. */
export function goalShare(elapsedMs: number, goalDays: number): number {
  return Math.min(1, Math.max(0, elapsedMs / (goalDays * DAY)))
}

/** Day numbers of the month's grid, Sunday first: 6 rows of 7 as day-of-month, 0 when outside the month. */
export function monthGrid(year: number, month: number): number[] {
  const first = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const cells: number[] = []
  for (let i = 0; i < first; i++) cells.push(0)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(0)
  return cells
}

/** Day-of-month of every relapse entry in that month. */
export function relapseDays(entries: readonly Entry[], year: number, month: number): Set<number> {
  const out = new Set<number>()
  for (const e of entries) {
    if (!e.relapse) continue
    const d = new Date(e.at)
    if (d.getFullYear() === year && d.getMonth() === month) out.add(d.getDate())
  }
  return out
}

/** `datetime-local` value (local time) for a timestamp. */
export function localInput(t: number): string {
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** days, h:mm:ss of a running stretch. */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d} d ${p(Math.floor((s % 86400) / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}
