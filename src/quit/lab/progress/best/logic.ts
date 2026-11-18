import { DAY, addDays, keyToMs } from "../shared/calc"

/** Clear-day counts on the milestone ladder. */
export const DAY_LADDER = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const
/** Money amounts (USD) on the milestone ladder. */
export const MONEY_LADDER = [10, 25, 50, 100, 250, 500, 1000, 2500] as const
/** Money period tabs: rolling windows of completed days; 0 is the whole time since the start. */
export const PERIOD_DAYS = [0, 1, 7, 30, 365] as const

export interface Slip {
  day: string
  note: string
}
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
export interface BestSetup {
  startMs: number
  unitId: string
  /** Units per day; 0 until typed. */
  perDay: number
  price: number
  /** 1 when the price was edited away from the data-file figure. */
  priceOwn: number
  seeded: number
}

const round2 = (n: number) => Math.round(n * 100) / 100
export const diffDays = (a: string, b: string) => Math.round((keyToMs(b) - keyToMs(a)) / DAY)

/** Completed days: the start day up to yesterday. Today is not counted until it is over. */
export function completedDays(startKey: string, today: string): string[] {
  const out: string[] = []
  for (let k = startKey; k < today; k = addDays(k, 1)) out.push(k)
  return out
}

/** One slip per day (a second one on the same day replaces the note); days outside start..today are dropped; oldest first. */
export function cleanSlips(slips: Slip[], startKey: string, today: string): Slip[] {
  const byDay = new Map<string, Slip>()
  for (const s of slips) if (s.day >= startKey && s.day <= today) byDay.set(s.day, s)
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1))
}

export interface Stretch {
  from: string
  /** Last clear day of the stretch; before `from` when the length is 0. */
  to: string
  length: number
  /** The slip that ended it, or null for the stretch still running. */
  endedBy: Slip | null
}

export interface Stats {
  total: number
  current: number
  best: number
  /** Oldest first; the last entry is the stretch still running. */
  stretches: Stretch[]
}

/** Total clear days, current run and best run from the start date and the slip days. Nothing is ever wiped. */
export function stats(startKey: string, today: string, slipsIn: Slip[]): Stats {
  const slips = cleanSlips(slipsIn, startKey, today)
  const stretches: Stretch[] = []
  let from = startKey
  for (const s of slips) {
    const length = Math.max(0, diffDays(from, s.day))
    stretches.push({ from, to: addDays(s.day, -1), length, endedBy: s })
    from = addDays(s.day, 1)
  }
  const current = Math.max(0, diffDays(from, today))
  stretches.push({ from, to: addDays(today, -1), length: current, endedBy: null })
  const total = stretches.reduce((n, s) => n + s.length, 0)
  const best = stretches.reduce((m, s) => Math.max(m, s.length), 0)
  return { total, current, best, stretches }
}

/** Completed days without a slip, oldest first. */
export function clearDayKeys(startKey: string, today: string, slips: Slip[]): string[] {
  const slipDays = new Set(slips.map((s) => s.day))
  return completedDays(startKey, today).filter((k) => !slipDays.has(k))
}

export const dailyAmount = (perDay: number, price: number) => round2(perDay * price)
export const sumSpend = (spends: Spend[]) => round2(spends.reduce((n, s) => n + s.amount, 0))

/** Money kept: clear days times the daily amount, minus what he spent on the habit or replacements. */
export function moneyKept(perDayAmount: number, clearDays: number, spent: number): number {
  return round2(perDayAmount * clearDays - spent)
}

/** Money kept over the last `days` completed days (0 = since the start). */
export function periodMoney(days: number, startKey: string, today: string, slips: Slip[], spends: Spend[], perDayAmount: number) {
  const back = addDays(today, -days)
  const first = days === 0 || back < startKey ? startKey : back
  const clear = clearDayKeys(startKey, today, slips).filter((k) => k >= first).length
  const spent = sumSpend(spends.filter((s) => s.day >= first && s.day <= today))
  return { clear, spent, money: moneyKept(perDayAmount, clear, spent), from: first }
}

export interface FilledTarget {
  target: Target
  funded: number
  done: boolean
  /** Whole days still to go at his daily amount; null while the daily amount is empty. */
  daysToGo: number | null
  /** Money still missing, counting every target above it. */
  missing: number
}

/** Targets are filled in order: the first takes what it needs, the next takes what is left. */
export function fillTargets(targets: Target[], money: number, perDayAmount: number): FilledTarget[] {
  let left = Math.max(0, money)
  let before = 0
  return targets.map((target) => {
    const funded = round2(Math.min(left, target.price))
    left = round2(left - funded)
    before += target.price
    const done = funded >= target.price
    const missing = done ? 0 : round2(before - Math.max(0, money))
    return { target, funded, done, missing, daysToGo: done ? 0 : perDayAmount > 0 ? Math.ceil(missing / perDayAmount) : null }
  })
}

export interface Step {
  threshold: number
  /** Day key it was reached, or null. */
  date: string | null
  /** Still to go (clear days for the day ladder, days at his rate for the money ladder); null when not computable. */
  toGo: number | null
}

/** Clear-day ladder: reached on the date of the Nth clear day. */
export function dayMilestones(clearKeys: string[]): Step[] {
  return DAY_LADDER.map((t) => ({ threshold: t, date: clearKeys[t - 1] ?? null, toGo: Math.max(0, t - clearKeys.length) }))
}

/** Money ladder: reached on the first day the money kept was at or above the amount. */
export function moneyMilestones(startKey: string, today: string, slips: Slip[], spends: Spend[], perDayAmount: number, moneyNow: number): Step[] {
  const slipDays = new Set(slips.map((s) => s.day))
  const firsts = new Map<number, string>()
  let clear = 0
  for (const k of completedDays(startKey, today)) {
    if (!slipDays.has(k)) clear++
    const money = moneyKept(perDayAmount, clear, sumSpend(spends.filter((s) => s.day <= k)))
    for (const t of MONEY_LADDER) if (money >= t && !firsts.has(t)) firsts.set(t, k)
  }
  return MONEY_LADDER.map((t) => {
    const date = perDayAmount > 0 ? (firsts.get(t) ?? null) : null
    if (date) return { threshold: t, date, toGo: 0 }
    return { threshold: t, date: null, toGo: perDayAmount > 0 ? Math.ceil(Math.max(0, t - moneyNow) / perDayAmount) : null }
  })
}

export type CellState = "clear" | "slip" | "today" | "outside"

/** Monday-first weeks of day keys covering one month; days of other months are null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1)
  const count = new Date(year, month + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= count; d++) cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`)
  while (cells.length % 7) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function cellState(key: string, startKey: string, today: string, slips: Slip[]): CellState {
  if (key < startKey || key > today) return "outside"
  if (slips.some((s) => s.day === key)) return "slip"
  return key === today ? "today" : "clear"
}
