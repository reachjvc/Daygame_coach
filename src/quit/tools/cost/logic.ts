import type { QuitCostSwap } from "../../types"
import { isObj, pickInt, pickStr } from "../common"

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
    // Ten times the whole-dollar year figure the reader sees.
    tenYearUsd: Math.round(yearUsd) * 10,
    hoursYear: i.minutesPerUnit === null ? null : Math.round(((perYear * i.minutesPerUnit) / 60) * 10) / 10,
  }
}

export function defaultPerDay(unitId: string | null): number {
  return unitId === "cigarettes" ? 10 : 1
}

/** A typed number inside the range (`1e2` is 100); empty, junk or out of range gives null. Never clamps. */
export function parseAmount(raw: string, min: number, max: number): number | null {
  const s = raw.trim().replace(",", ".")
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < min || n > max) return null
  const r = round2(n)
  return r === 0 ? 0 : r // never -0
}

/** True when something is typed but it is not a usable number in range (so the field says why). */
export function amountOutOfRange(raw: string, min: number, max: number): boolean {
  return raw.trim() !== "" && parseAmount(raw, min, max) === null
}

/** Saved state, checked. */
export function parseCost(x: unknown): CostState {
  const o = isObj(x) ? x : {}
  const r = o.result
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v)
  const result =
    isObj(r) && num(r.yearUsd) && num(r.tenYearUsd) && (r.hoursYear === null || num(r.hoursYear))
      ? ({ yearUsd: r.yearUsd, tenYearUsd: r.tenYearUsd, hoursYear: r.hoursYear } as CostResult)
      : null
  const perDay = typeof o.perDay === "number" && Number.isFinite(o.perDay) && o.perDay >= 0 && o.perDay <= MAX_PER_DAY ? o.perDay : null
  return {
    done: pickInt(o.done, 0, 3, 0),
    unit: pickStr(o.unit, null),
    perDay,
    daysPerWeek: pickInt(o.daysPerWeek, 1, 7, 7),
    price: pickStr(o.price, ""),
    minutes: pickStr(o.minutes, ""),
    result,
  }
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
