import type { QuitCostSwap } from "../../types"

export const WEEKS_PER_YEAR = 52
export const MAX_PER_DAY = 200
export const MAX_PRICE = 100
export const MAX_MINUTES = 120

export interface CostInput {
  perDay: number
  daysPerWeek: number
  priceUsd: number
  minutesPerUnit: number | null
}

export interface CostResult {
  yearUsd: number
  tenYearUsd: number
  hoursYear: number | null
}

export interface CostState {
  /** Screens already passed with Continue. */
  done: number
  unit: string | null
  perDay: number | null
  daysPerWeek: number
  /** The price as typed. */
  price: string
  minutes: string
  result: CostResult | null
}

export const EMPTY_COST: CostState = { done: 0, unit: null, perDay: null, daysPerWeek: 7, price: "", minutes: "", result: null }

const round2 = (n: number) => Math.round(n * 100) / 100

/** 52 weeks a year, no price rise. Money to the cent; hours to one decimal. */
export function computeCost(i: CostInput): CostResult {
  const perYear = i.perDay * i.daysPerWeek * WEEKS_PER_YEAR
  const yearUsd = round2(perYear * i.priceUsd)
  return {
    yearUsd,
    tenYearUsd: round2(perYear * i.priceUsd * 10),
    hoursYear: i.minutesPerUnit === null ? null : Math.round(((perYear * i.minutesPerUnit) / 60) * 10) / 10,
  }
}

export function defaultPerDay(unitId: string | null): number {
  return unitId === "cigarettes" ? 10 : 1
}

/** A typed number, clamped to the range; empty or junk gives null. */
export function parseAmount(raw: string, min: number, max: number): number | null {
  const s = raw.trim().replace(",", ".")
  if (s === "" || !/^\d*\.?\d*$/.test(s) || s === ".") return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return round2(Math.min(max, Math.max(min, n)))
}

/**
 * One comparison: the largest swap that costs at most a year of it; else the
 * smallest swap with the number of years it takes (only when 10 or fewer).
 */
export function pickCostSwap(
  yearUsd: number,
  swaps: QuitCostSwap[],
): { swap: QuitCostSwap; years: number | null } | null {
  if (!(yearUsd > 0) || swaps.length === 0) return null
  const within = swaps.filter((s) => s.usd <= yearUsd).sort((a, b) => b.usd - a.usd)
  if (within.length > 0) return { swap: within[0], years: null }
  const smallest = [...swaps].sort((a, b) => a.usd - b.usd)[0]
  const years = Math.ceil(smallest.usd / yearUsd)
  return years <= 10 ? { swap: smallest, years } : null
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
export function formatUsd(n: number): string {
  return usd.format(n)
}
