import { DAY } from "../../progress/shared/calc"
import { reachTime, savedOver, type Reach } from "../e/logic"
import { round2 } from "../shared/logic"

export interface CostSetup {
  startMs: number
  /** Unit id from the data file, or "" when the addiction has no units (he types money per day). */
  unitId: string
  /** Units per day; 0 when the addiction has no units. */
  perDay: number
  /** Price of one unit in USD. */
  price: number
  /** 1 when the price was changed away from the data-file figure. */
  priceOwn: number
  /** Money per day typed directly; used when `unitId` is "". */
  money: number
}

export interface Spend {
  id: string
  /** `YYYY-MM-DD`. */
  day: string
  amount: number
  note: string
}

export interface Goal {
  id: string
  name: string
  price: number
  bought: boolean
}

/** Money per day: units a day times the price of one, or the amount typed directly. */
export const dailyOf = (s: CostSetup): number => (s.unitId ? round2(s.perDay * s.price) : round2(s.money))

/** Days since the start, fractional; 0 before the start. */
export const elapsedDays = (startMs: number, now: number): number => Math.max(0, now - startMs) / DAY

/** Money kept before anything he spent: daily amount times days since the start. */
export const grossKept = (daily: number, days: number): number => round2(daily * days)

export const sumSpend = (spends: Spend[]): number => round2(spends.reduce((n, s) => n + s.amount, 0))

/** Honest net money: money kept minus what he spent on the habit or replacements. May be below zero. */
export const netMoney = (gross: number, spent: number): number => round2(gross - spent)

export const boughtTotal = (goals: Goal[]): number => round2(goals.filter((g) => g.bought).reduce((n, g) => n + g.price, 0))

/** What goals can draw on: net money minus what he already bought. */
export const availableMoney = (net: number, bought: number): number => round2(net - bought)

export interface Periods {
  day: number
  week: number
  month: number
  year: number
  tenYears: number
}

/**
 * Money per day, week, month (a twelfth of 365 days), year (365 days) and 10 years. `rate` is a yearly
 * rise as a fraction, only ever typed by him; 0 means flat. The first year is flat, each later year grows.
 */
export function periods(daily: number, rate = 0): Periods {
  const yearly = daily * 365
  return {
    day: round2(daily),
    week: round2(daily * 7),
    month: round2(yearly / 12),
    year: round2(yearly),
    tenYears: round2(savedOver(yearly, 10, rate)),
  }
}

export interface FilledGoal {
  goal: Goal
  funded: number
  /** Whole percent, rounded down; 100 when full. */
  pct: number
  ready: boolean
  /** Money still missing, counting every unbought goal above it. */
  missing: number
  /** Time to reach at his daily rate; null when ready or while the rate is empty. */
  reach: Reach | null
}

/** Unbought goals fill in order from what is available: the first takes what it needs, the next takes the rest. */
export function fillGoals(goals: Goal[], available: number, daily: number): FilledGoal[] {
  let left = Math.max(0, available)
  let before = 0
  return goals
    .filter((g) => !g.bought)
    .map((goal) => {
      const funded = round2(Math.min(left, goal.price))
      left = round2(left - funded)
      before = round2(before + goal.price)
      const ready = funded >= goal.price
      const missing = ready ? 0 : round2(before - Math.max(0, available))
      return {
        goal,
        funded,
        pct: goal.price > 0 ? Math.min(100, Math.floor((funded / goal.price) * 100 + 1e-9)) : 0,
        ready,
        missing,
        reach: ready ? null : reachTime(missing, daily),
      }
    })
}
