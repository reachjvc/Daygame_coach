import type { QuitUnit } from "../../types"
import { parseRecord, type RecordUnit } from "../../record"
import { isObj, pickInt, pickOne } from "../common"
import { MAX_PER_DAY, MAX_PRICE, parseTyped } from "../date/logic"

export const DAYS_PER_YEAR = 365
export const DEFAULT_PACK_SIZE = 20
export const MAX_PACK_SIZE = 100
export const MAX_PER_WEEK = MAX_PER_DAY * 7

export type PriceMode = "pack" | "one"
export type CountMode = "day" | "week"

/** How he likes to type; the numbers themselves live in the shared record. */
export interface CostState {
  v: 2
  priceMode: PriceMode
  packSize: number
  /** null = not chosen yet: a day for cigarettes, a week for vapes and pouches. */
  countMode: CountMode | null
}

export const EMPTY_COST: CostState = { v: 2, priceMode: "pack", packSize: DEFAULT_PACK_SIZE, countMode: null }

/** Saved state, checked. Anything that is not the v2 shape gives the empty state. */
export function parseCost(x: unknown): CostState {
  if (!isObj(x) || x.v !== 2) return EMPTY_COST
  return {
    v: 2,
    priceMode: pickOne(x.priceMode, ["pack", "one"] as const, "pack"),
    packSize: pickInt(x.packSize, 1, MAX_PACK_SIZE, DEFAULT_PACK_SIZE),
    countMode: pickOne(x.countMode, ["day", "week"] as const, null),
  }
}

/** One disposable vape lasts several days, so vapes and pouches are counted a week by default. */
export function defaultCountMode(unitId: string): CountMode {
  return unitId === "cigarettes" ? "day" : "week"
}

/* ---------- the maths (whole cents, so every line adds up by hand) ---------- */

export interface CostFigures {
  dayCents: number
  yearCents: number
  monthCents: number
  tenCents: number
  /** Units used in a year, rounded to a whole number. */
  unitsYear: number
}

const cents = (n: number) => Math.round(Number(n.toPrecision(12)))

/** day = count × price to the cent; year = day × 365; month = year ÷ 12 to the cent; 10 years = year × 10. */
export function computeCost(perDay: number, priceUsd: number): CostFigures {
  const dayCents = cents(perDay * priceUsd * 100)
  const yearCents = dayCents * DAYS_PER_YEAR
  return {
    dayCents,
    yearCents,
    monthCents: cents(yearCents / 12),
    tenCents: yearCents * 10,
    unitsYear: cents(perDay * DAYS_PER_YEAR),
  }
}

/** The yearly cost the coaching page shows, from the shared record's stored value; null without a count or a price. */
export function yearlyCostFromRecord(stored: unknown): number | null {
  const u = parseRecord(stored).unit
  if (!u || u.perDay === null) return null
  return computeCost(u.perDay, u.priceUsd).yearCents / 100
}

/* ---------- numbers as text ---------- */

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })
const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 })
const plain = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 })

/** "$1,898.00" */
export function formatMoney(dollars: number): string {
  return money.format(dollars)
}
export const formatCents = (c: number): string => formatMoney(c / 100)
/** A price of one: to the cent, or up to 4 decimals when it is not whole cents ("$0.4495"). */
export function formatPrice(dollars: number): string {
  return price.format(Number(dollars.toFixed(4)))
}
/** A count: up to 4 decimals, thousands commas. */
export function formatCount(n: number): string {
  return plain.format(Number(n.toFixed(4)))
}

/** For a box: no commas, up to 4 decimals, at least `min` decimals for money. */
export function boxNumber(n: number, minDecimals = 0): string {
  let s = Number(n.toFixed(4)).toFixed(4)
  for (let d = 4; d > minDecimals && s.endsWith("0"); d--) s = s.slice(0, -1)
  return s.includes(".") && s.endsWith(".") ? s.slice(0, -1) : s
}

/* ---------- reading the form ---------- */

export type Field<T> = { kind: "ok"; value: T } | { kind: "empty" } | { kind: "bad" }

export function parseCount(text: string, mode: CountMode): Field<number> {
  const t = parseTyped(text, mode === "week" ? MAX_PER_WEEK : MAX_PER_DAY)
  return t.kind === "ok" ? { kind: "ok", value: mode === "week" ? t.value / 7 : t.value } : t
}

export function parsePackSize(text: string): Field<number> {
  const s = text.trim()
  if (s === "") return { kind: "empty" }
  if (!/^\d{1,3}$/.test(s)) return { kind: "bad" }
  const n = Number(s)
  return n >= 1 && n <= MAX_PACK_SIZE ? { kind: "ok", value: n } : { kind: "bad" }
}

/** The price of one unit from what is typed: a pack price ÷ size, or the price of one. Empty is not allowed. */
export function parsePrice(text: string, mode: PriceMode, size: number): Field<number> {
  const t = parseTyped(text, MAX_PRICE)
  if (t.kind !== "ok") return t.kind === "empty" ? { kind: "bad" } : t
  return { kind: "ok", value: mode === "pack" ? t.value / size : t.value }
}

const sameMoney = (a: number, b: number) => Math.abs(a - b) < 1e-9

/** A price counts as typed only when it differs from the data file's starting price. */
export function basisFor(priceUsd: number, unit: Pick<QuitUnit, "defaultPriceUsd">): RecordUnit["priceBasis"] {
  return unit.defaultPriceUsd !== null && sameMoney(priceUsd, unit.defaultPriceUsd) ? "default" : "typed"
}

/* ---------- old wave-1 answers ---------- */

/**
 * Wave-1 stored `unit`, `perDay`, `daysPerWeek` and a typed `price`. When the record has no unit, they become the
 * record's unit: perDay × daysPerWeek ÷ 7. A bad price gives null (nothing is imported).
 */
export function importOldCost(old: unknown, units: Pick<QuitUnit, "id" | "defaultPriceUsd">[], current: RecordUnit | null): RecordUnit | null {
  if (current !== null || !isObj(old) || old.v === 2) return null
  const unit = units.find((u) => u.id === old.unit)
  if (!unit) return null
  const typed = parseTyped(typeof old.price === "string" ? old.price : "", MAX_PRICE)
  if (typed.kind !== "ok") return null
  const rawPerDay = typeof old.perDay === "number" && Number.isFinite(old.perDay) && old.perDay >= 0 ? old.perDay : unit.id === "cigarettes" ? 10 : 1
  const days = pickInt(old.daysPerWeek, 1, 7, 7)
  return { id: unit.id, perDay: (rawPerDay * days) / 7, priceUsd: typed.value, priceBasis: basisFor(typed.value, unit) }
}

export function isOldCost(stored: unknown): boolean {
  return isObj(stored) && stored.v !== 2
}
