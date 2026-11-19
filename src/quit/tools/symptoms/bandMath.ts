import { BAND_DAYS, type Band } from "./bands"

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

export type Phase = "peak" | "after-peak" | "in-range" | "past-end" | "open-before" | "open-within" | "open-past"

/** Where his day (1 or later) sits against one band. */
export function phaseOf(band: Band, day: number): Phase {
  if (band.openFrom !== null) {
    const first = band.tested ? band.tested[0] : 1
    if (day < first) return "open-before"
    return day <= band.openFrom ? "open-within" : "open-past"
  }
  if (band.gone && day > band.gone[1]) return "past-end"
  if (band.peak && day <= band.peak[1]) return "peak"
  if (band.gone && day < band.gone[0]) return "after-peak"
  return "in-range"
}

/** The time line of the cravings card: three spans (weeks 1-4, months 2-6, months 7-12), starting on these days. */
export const CRAVING_MARK_DAYS = [1, 29, 183] as const

/**
 * Percent position of his day on the cravings time line. The four marks sit at 12.5, 37.5, 62.5 and 87.5 percent;
 * a day between two marks sits between them in proportion; before week 1 and after month 12 it stays near the ends.
 */
export function cravingPosition(day: number): number {
  const knots: [number, number][] = [[0, 2], [7, 12.5], [28, 37.5], [182, 62.5], [365, 87.5], [730, 98]]
  const d = Math.max(0, Math.min(730, day))
  for (let i = 1; i < knots.length; i++) {
    const [d0, p0] = knots[i - 1]
    const [d1, p1] = knots[i]
    if (d <= d1) return p0 + ((d - d0) / (d1 - d0)) * (p1 - p0)
  }
  return 98
}
