/** Pure counter, money and streak maths shared by the Progress home copies. */

export const DAY = 86_400_000
export const HOUR = 3_600_000
export const MIN = 60_000

/** Whole days between a start and now; never negative. */
export function wholeDays(startMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - startMs) / DAY))
}

/** Days as a fraction. */
export function fracDays(startMs: number, nowMs: number): number {
  return Math.max(0, (nowMs - startMs) / DAY)
}

export interface Split {
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Elapsed milliseconds split into days, hours, minutes, seconds. */
export function splitElapsed(ms: number): Split {
  const t = Math.max(0, Math.floor(ms / 1000))
  return { days: Math.floor(t / 86400), hours: Math.floor((t % 86400) / 3600), minutes: Math.floor((t % 3600) / 60), seconds: t % 60 }
}

export interface Ymd {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Calendar years, months, days (then h/m/s) from a start to now. */
export function ymdhms(startMs: number, nowMs: number): Ymd {
  const s = new Date(startMs)
  const n = new Date(Math.max(startMs, nowMs))
  const at = (m: number) => new Date(s.getFullYear(), s.getMonth() + m, s.getDate(), s.getHours(), s.getMinutes(), s.getSeconds())
  let months = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth())
  if (at(months).getTime() > n.getTime()) months -= 1
  const rest = splitElapsed(n.getTime() - at(months).getTime())
  return { years: Math.floor(months / 12), months: months % 12, days: rest.days, hours: rest.hours, minutes: rest.minutes, seconds: rest.seconds }
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Money kept: whole days times the per-day spend. */
export const moneySaved = (perDay: number, days: number) => round2(perDay * days)
/** A month is a twelfth of 365 days. */
export const monthly = (perDay: number) => round2((perDay * 365) / 12)
export const yearly = (perDay: number) => round2(perDay * 365)
export const weekly = (perDay: number) => round2(perDay * 7)
/** One strip rectangle per whole twenty. */
export const billCount = (total: number) => Math.floor(total / 20)

/** `$1,234.50`. */
export function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Cigarettes not smoked: fractional days times the per-day count, floored. */
export const cigsAvoided = (perDay: number, days: number) => Math.floor(perDay * days)
/** Money from cigarettes not smoked: count times pack price over pack size. */
export const cigMoney = (count: number, packPrice: number, packSize: number) => round2((count * packPrice) / Math.max(1, packSize))

/** Local-date key `YYYY-MM-DD`. */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function keyToMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** Calendar day arithmetic that survives clock changes. */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number)
  return dayKey(new Date(y, m - 1, d + n).getTime())
}

export type DayStatus = "dry" | "drank"

/** Current streak: consecutive dry days ending today (or yesterday while today is unlogged). */
export function currentStreak(log: Record<string, DayStatus>, today: string): number {
  let k = log[today] === undefined ? addDays(today, -1) : today
  let n = 0
  while (log[k] === "dry") {
    n++
    k = addDays(k, -1)
  }
  return n
}

/** Longest run of consecutive dry days ever logged. */
export function bestStreak(log: Record<string, DayStatus>): number {
  const dry = Object.keys(log)
    .filter((k) => log[k] === "dry")
    .sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const k of dry) {
    run = prev !== null && addDays(prev, 1) === k ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return best
}

export const dryDayCount = (log: Record<string, DayStatus>, from: string, to: string) =>
  Object.keys(log).filter((k) => log[k] === "dry" && k >= from && k <= to).length

/** How many ladder steps a value has reached. */
export const reached = (ladder: readonly number[], value: number) => ladder.filter((t) => value >= t).length

/** Index of the next ladder step above `value`, or -1. */
export const nextStep = (ladder: readonly number[], value: number) => ladder.findIndex((t) => value < t)

/** One alcohol unit is 10 ml of pure alcohol (published definition, UK). */
export const unitsOf = (ml: number, abvPercent: number, qty: number) => Math.round(((ml * abvPercent) / 100 / 10) * qty * 10) / 10
