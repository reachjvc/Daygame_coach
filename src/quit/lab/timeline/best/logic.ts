import { BAND_DAYS, type Band } from "./bands"

const DAY = 86_400_000

const midnight = (ms: number) => {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Calendar day number since the quit date; day 1 is the quit date itself. Zero or less before it. */
export function dayNumber(startMs: number, nowMs: number): number {
  return Math.round((midnight(nowMs) - midnight(startMs)) / DAY) + 1
}

export interface Place {
  /** Percent of the band's width where the span starts. */
  left: number
  /** Percent of the band's width the span covers. */
  width: number
}

/** A span of whole days (both ends included) on the 42-day axis. */
export function span(from: number, to: number): Place {
  const a = Math.max(1, Math.min(BAND_DAYS, from))
  const b = Math.max(a, Math.min(BAND_DAYS, to))
  return { left: ((a - 1) / BAND_DAYS) * 100, width: ((b - a + 1) / BAND_DAYS) * 100 }
}

/** Percent position of the middle of a day; days beyond the axis stay at the edge. */
export function dayPosition(day: number): number {
  const d = Math.max(1, Math.min(BAND_DAYS, day))
  return ((d - 0.5) / BAND_DAYS) * 100
}

export type Phase = "ahead" | "peak" | "after-peak" | "in-range" | "past-end" | "open-within" | "open-past"

/** Where his day sits against one band. `ahead` is before the quit date. */
export function phaseOf(band: Band, day: number): Phase {
  if (day < 1) return "ahead"
  if (band.openFrom !== null) return day <= band.openFrom ? "open-within" : "open-past"
  if (band.gone && day > band.gone[1]) return "past-end"
  if (band.peak && day <= band.peak[1]) return "peak"
  if (band.gone && day < band.gone[0]) return "after-peak"
  return "in-range"
}

/** How many bands have an end and his day is past it. Open-ended bands are never counted. */
export function pastEndCount(bands: readonly Band[], day: number): { past: number; total: number } {
  const ended = bands.filter((b) => b.gone !== null)
  return { past: ended.filter((b) => day > (b.gone as readonly [number, number])[1]).length, total: ended.length }
}

/** Day cells of the strip, grouped by week: [[1..7], [8..14], ...]. */
export function weeks(): number[][] {
  return Array.from({ length: BAND_DAYS / 7 }, (_, w) => Array.from({ length: 7 }, (_, i) => w * 7 + i + 1))
}
