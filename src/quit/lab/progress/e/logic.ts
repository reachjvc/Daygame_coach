import { addDays, bestStreak, currentStreak, dryDayCount, keyToMs, reached, unitsOf, type DayStatus } from "../shared/calc"

export type DrinkKind = "beer" | "cider" | "wine"
export type Place = "shop" | "bar"

export interface Drink {
  kind: DrinkKind
  place: Place
  ml: number
  abv: number
  qty: number
  /** Cost of one drink. */
  cost: number
}

export interface Wellbeing {
  mood: number
  energy: number
  sleep: number
  cravings: number
}

export interface DayRec {
  status: DayStatus
  drinks: Drink[]
  wb: Wellbeing
  note: string
}

export type ESetup = {
  startMs: number
  baseUnits: number
  baseCost: number
  seeded: number
}

export const EMPTY_WB: Wellbeing = { mood: 0, energy: 0, sleep: 0, cravings: 0 }
export const TOTAL_LADDER = [1, 7, 14, 30, 60, 100, 200, 300, 500, 1000] as const
export const GOAL_LADDER = [3, 5, 8] as const

/** Sizes offered per drink kind, with millilitres; the middle one is the default. */
export const SIZES: Record<DrinkKind, { ml: number }[]> = {
  beer: [{ ml: 330 }, { ml: 568 }, { ml: 440 }],
  cider: [{ ml: 284 }, { ml: 568 }, { ml: 440 }],
  wine: [{ ml: 125 }, { ml: 175 }, { ml: 250 }],
}
export const DEFAULT_ABV: Record<DrinkKind, number> = { beer: 4.5, cider: 5.5, wine: 12.5 }
/** A rough cost of one drink before he types his own: shop-bought or bar. */
export const ROUGH_COST: Record<Place, number> = { shop: 2.5, bar: 6 }

export const dayUnits = (r: DayRec) => Math.round(r.drinks.reduce((s, d) => s + unitsOf(d.ml, d.abv, d.qty), 0) * 10) / 10
export const dayCost = (r: DayRec) => r.drinks.reduce((s, d) => s + d.cost * d.qty, 0)

export type Period = 0 | 1 | 2 | 3

/** First day of a period: total from the start, week from Monday, month from the 1st, year from 1 January. */
export function periodStart(p: Period, today: string, start: string): string {
  const d = new Date(keyToMs(today))
  const from =
    p === 0
      ? start
      : p === 1
        ? addDays(today, -((d.getDay() + 6) % 7))
        : p === 2
          ? `${today.slice(0, 7)}-01`
          : `${today.slice(0, 4)}-01-01`
  return from < start ? start : from
}

export function statusMap(days: Record<string, DayRec>): Record<string, DayStatus> {
  const out: Record<string, DayStatus> = {}
  for (const k of Object.keys(days)) out[k] = days[k].status
  return out
}

export interface Dash {
  dry: number
  dayCount: number
  units: number
  money: number
  current: number
  best: number
}

/**
 * Savings compare each logged day with his baseline week spread over 7 days; unlogged days count for nothing.
 * Nothing is shown before a baseline exists (the caller checks).
 */
export function dash(days: Record<string, DayRec>, s: ESetup, p: Period, today: string, startKey: string): Dash {
  const from = periodStart(p, today, startKey)
  const map = statusMap(days)
  let units = 0
  let money = 0
  for (const k of Object.keys(days)) {
    if (k < from || k > today) continue
    units += s.baseUnits / 7 - dayUnits(days[k])
    money += s.baseCost / 7 - dayCost(days[k])
  }
  const dayCount = Math.round((keyToMs(today) - keyToMs(from)) / 86_400_000) + 1
  return {
    dry: dryDayCount(map, from, today),
    dayCount,
    units: Math.max(0, Math.round(units * 10) / 10),
    money: Math.max(0, Math.round(money * 100) / 100),
    current: currentStreak(map, today),
    best: bestStreak(map),
  }
}

export interface EBadges {
  totalDry: number
  total: number
  goals: number
  mission: boolean
  /** Index into TOTAL_LADDER of the last earned total-days badge, or -1. */
  last: number
}

/** Badge counters: total dry days from the ladder, goals achieved (none built yet), the one mission. */
export function badgesOf(days: Record<string, DayRec>, goalsDone: number): EBadges {
  const dry = Object.values(days).filter((d) => d.status === "dry").length
  const total = reached(TOTAL_LADDER, dry)
  return { totalDry: dry, total, goals: reached(GOAL_LADDER, goalsDone), mission: dry >= 1, last: total - 1 }
}

/** Average of the answered wellbeing values, 0 when none. */
export function wbAverage(w: Wellbeing): number {
  const v = [w.mood, w.energy, w.sleep, w.cravings].filter((n) => n > 0)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
}

/** The example log: dry days from the start to yesterday, two drinking days, a few wellbeing marks and one note. */
export function seedLog(today: string, startKey: string, note: string): Record<string, DayRec> {
  const out: Record<string, DayRec> = {}
  for (let k = startKey; k < today; k = addDays(k, 1)) {
    out[k] = { status: "dry", drinks: [], wb: EMPTY_WB, note: "" }
  }
  for (const n of [17, 8]) {
    const k = addDays(today, -n)
    if (out[k]) out[k] = { status: "drank", drinks: [{ kind: "cider", place: "shop", ml: 568, abv: 5.5, qty: 1, cost: 5 }], wb: EMPTY_WB, note: "" }
  }
  const k2 = addDays(today, -3)
  if (out[k2]) out[k2] = { ...out[k2], wb: { mood: 4, energy: 3, sleep: 4, cravings: 2 }, note }
  const k3 = addDays(today, -2)
  if (out[k3]) out[k3] = { ...out[k3], wb: { mood: 3, energy: 4, sleep: 3, cravings: 1 } }
  return out
}
