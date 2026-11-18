import { round2 } from "../shared/logic"

export type TabId = "cigarettes" | "vaping" | "tobacco" | "snus" | "shisha"
export const TAB_IDS: TabId[] = ["cigarettes", "vaping", "tobacco", "snus", "shisha"]

export interface FieldDef {
  key: string
  min: number
  max?: number
  step: number
  /** Shown on the page but not used in its stated formula. */
  unused?: boolean
}

/** Fields of each tab with the limits and steps read off the public page. */
export const FIELDS: Record<TabId, FieldDef[]> = {
  cigarettes: [
    { key: "perDay", min: 0, max: 200, step: 1 },
    { key: "price", min: 0, max: 1000, step: 0.1 },
    { key: "pack", min: 1, max: 100, step: 1 },
  ],
  vaping: [
    { key: "liquid", min: 0, max: 100000, step: 1 },
    { key: "pods", min: 0, step: 1 },
  ],
  tobacco: [
    { key: "pouches", min: 0, step: 1 },
    { key: "price", min: 0, step: 0.5 },
    { key: "rolls", min: 0, step: 1, unused: true },
  ],
  snus: [
    { key: "cans", min: 0, step: 1 },
    { key: "price", min: 0, step: 0.5 },
    { key: "pouches", min: 1, step: 1, unused: true },
  ],
  shisha: [
    { key: "sessions", min: 0, step: 1 },
    { key: "cost", min: 0, step: 1 },
  ],
}

export type Values = Record<string, number | null>
const v = (vals: Values, k: string) => vals[k] ?? 0

/**
 * Money per day, as the page states it per tab. A box never typed in counts as 0; the
 * cigarette formula needs a pack size, so it gives 0 until one is typed.
 */
export function dailyCost(tab: TabId, vals: Values): number {
  switch (tab) {
    case "cigarettes": {
      const pack = vals.pack ?? 0
      return pack >= 1 ? (v(vals, "perDay") * v(vals, "price")) / pack : 0
    }
    case "vaping":
      return (v(vals, "liquid") + v(vals, "pods")) / 30
    case "tobacco":
      return (v(vals, "pouches") * v(vals, "price")) / 30
    case "snus":
      return (v(vals, "cans") * v(vals, "price")) / 7
    case "shisha":
      return (v(vals, "sessions") * v(vals, "cost")) / 7
  }
}

/** A month is a twelfth of 365 days. */
export const perMonth = (daily: number) => (daily * 365) / 12
export const perYear = (daily: number) => daily * 365
export const perTenYears = (daily: number) => perYear(daily) * 10

/**
 * Total after `years` of saving the same amount each year. With a yearly growth rate `rate`
 * (a fraction, 0 for none) the yearly amount grows each year and the sum compounds:
 * y * ((1 + r)^t - 1) / r.
 */
export function savedOver(yearly: number, years: number, rate: number): number {
  if (!(rate > 0)) return yearly * years
  return (yearly * (Math.pow(1 + rate, years) - 1)) / rate
}

export interface Reach {
  unit: "days" | "months"
  n: number
}

/** Time to reach a price: days (rounded up) up to about two months, then months (rounded up). */
export function reachTime(price: number, daily: number): Reach | null {
  if (!(price > 0) || !(daily > 0)) return null
  const days = Math.ceil(price / daily)
  if (days <= 61) return { unit: "days", n: days }
  return { unit: "months", n: Math.ceil(price / daily / (365 / 12)) }
}

/** Units not consumed over `years` years. */
export const unitsNot = (perDay: number, years: number) => Math.round(perDay * 365 * years)

/** App side: savings so far = daily savings times fractional days since the quit date. */
export function savedSoFar(daily: number, startMs: number | null, now: number): number {
  if (startMs === null) return 0
  return round2(daily * (Math.max(0, now - startMs) / 86_400_000))
}

/** Goal progress 0..100, rounded to a whole percent (695 of 1200 reads 58); 0 with no price. */
export const goalPct = (saved: number, price: number | null): number => (price && price > 0 ? Math.min(100, Math.round((saved / price) * 100)) : 0)

/** Days and hours left to reach a goal at the daily rate; null when the daily rate is 0. */
export function countdown(saved: number, price: number | null, daily: number): { days: number; hours: number } | null {
  if (!(daily > 0) || !(price && price > 0)) return null
  const left = Math.max(0, price - saved) / daily
  const days = Math.floor(left)
  return { days, hours: Math.floor((left - days) * 24) }
}
