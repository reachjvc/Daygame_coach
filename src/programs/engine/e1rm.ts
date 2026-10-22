/**
 * AN ESTIMATED ONE-REP MAX FROM ONE SET — Q11.
 *
 * With an RPE logged, the reps-and-RPE chart from Reactive Training Systems
 * (Mike Tuchscherer): a set of 5 at RPE 8 is 81.1% of a max, so 100 × 5 @ 8
 * says the max is about 123. Without one, Epley (`estimateOneRepMax`), which
 * is what the app has always used.
 *
 * The chart is one ladder: every rep, and every half point of RPE below 10,
 * is one rung down. That is how it is published, and why it is stored as a
 * single list rather than a grid that could disagree with itself.
 */

import { estimateOneRepMax } from "../programsService"

/** Rung n = (reps − 1) × 2 + (10 − RPE) × 2. Covers 1–12 reps at RPE 6.5–10. */
const RTS_LADDER = [
  100, 97.8, 95.5, 93.9, 92.2, 90.7, 89.2, 87.8, 86.3, 85.0, 83.7, 82.4, 81.1, 79.9, 78.6, 77.4, 76.2, 75.1, 73.9,
  72.3, 70.7, 69.4, 68.0, 66.7, 65.3, 64.0, 62.6, 61.3, 59.9, 58.6,
]

/** The share of a max that `reps` at `rpe` represents, or null off the chart. */
export function rtsPercent(reps: number, rpe: number): number | null {
  if (!Number.isInteger(reps) || reps < 1 || reps > 12) return null
  if (!Number.isInteger(rpe * 2) || rpe < 6.5 || rpe > 10) return null
  const rung = (reps - 1) * 2 + (10 - rpe) * 2
  return RTS_LADDER[rung] ?? null
}

/** The max one set suggests: the RTS chart when an RPE was logged and is on it, Epley otherwise. */
export function e1rm(weight: number, reps: number, rpe?: number | null): number {
  if (weight <= 0 || reps <= 0) return 0
  const pct = rpe != null ? rtsPercent(reps, rpe) : null
  const value = pct != null ? weight / (pct / 100) : estimateOneRepMax(weight, reps)
  return Math.round(value * 10) / 10
}

/** What to load for `reps` at `rpe` given a max — the same chart read the other way. */
export function weightForEffort(max: number, reps: number, rpe: number): number | null {
  const pct = rtsPercent(reps, rpe)
  return pct == null ? null : Math.round(max * pct) / 100
}
