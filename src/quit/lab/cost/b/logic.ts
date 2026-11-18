import { fracDays, wholeDays } from "../../progress/shared/calc"
import { round2 } from "../shared/logic"

export interface BSetup {
  startMs: number | null
  cigsPerDay: number | null
  packSize: number | null
  packPrice: number | null
  /** 1 while the example numbers are in. */
  ex: number
}

export interface Goal {
  name: string
  price: number | null
}

export const EMPTY_SETUP: BSetup = { startMs: null, cigsPerDay: null, packSize: null, packPrice: null, ex: 0 }
export const EMPTY_GOALS: Goal[] = [
  { name: "", price: null },
  { name: "", price: null },
  { name: "", price: null },
]

export const isReady = (s: BSetup): boolean => s.startMs !== null && (s.cigsPerDay ?? 0) > 0 && (s.packSize ?? 0) > 0 && (s.packPrice ?? 0) > 0

/** Whole days since the quit date (the "Days" figure). */
export const daysSince = (s: BSetup, now: number) => (s.startMs === null ? 0 : wholeDays(s.startMs, now))

/** Cigarettes not smoked: elapsed time in days (fractional) times cigarettes per day, whole cigarettes. */
export function cigsNotSmoked(s: BSetup, now: number): number {
  if (s.startMs === null || s.cigsPerDay === null) return 0
  return Math.floor(fracDays(s.startMs, now) * s.cigsPerDay)
}

/** Price of one cigarette: pack price over pack size. */
export const perCigarette = (s: BSetup): number => (s.packSize && s.packPrice !== null ? s.packPrice / s.packSize : 0)

/** Money saved: cigarettes not smoked times the price of one cigarette. */
export const moneySaved = (s: BSetup, now: number): number => round2(cigsNotSmoked(s, now) * perCigarette(s))
