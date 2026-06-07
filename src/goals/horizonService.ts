/**
 * Time-horizon classification (pure). Goals live at different timescales — a
 * long-term vision unfolds into 1-year goals, 90-day targets, and daily habits.
 * This lets the flow show that cascade explicitly ("group by time") instead of
 * hiding the time dimension. Inferred from the goal's primitive + target date.
 */

import type { GoalPrimitive, GoalRole } from "./data/newGoalFramework"

export type Horizon = "vision" | "year" | "quarter" | "now"

export interface HorizonMeta {
  label: string
  sublabel: string
  color: string
  /** Display order: abstract → concrete (vision at top, now at bottom). */
  order: number
}

export const HORIZON_META: Record<Horizon, HorizonMeta> = {
  vision:  { label: "Vision",  sublabel: "Long-term & journeys",   color: "#a855f7", order: 0 },
  year:    { label: "1 Year",  sublabel: "Medium-term goals",      color: "#3b82f6", order: 1 },
  quarter: { label: "90 Days", sublabel: "Short-term targets",     color: "#f59e0b", order: 2 },
  now:     { label: "Now",     sublabel: "Daily & weekly habits",  color: "#22c55e", order: 3 },
}

export const HORIZONS_ORDERED: Horizon[] = ["vision", "year", "quarter", "now"]

const DAY = 86_400_000
const QUARTER_DAYS = 120
const YEAR_DAYS = 500

export interface HorizonInput {
  primitive: GoalPrimitive
  role: GoalRole
  /** ISO YYYY-MM-DD, optional. */
  targetDate?: string
}

/**
 * Classify a goal into a time horizon.
 * - Ongoing drivers (habits / volume drivers) → "now" (you do them now, ongoing).
 * - Stage journeys → "vision" (long qualitative arcs).
 * - A dated target → by days-to-date (≤120 → 90-day, ≤500 → 1-year, else vision).
 * - Otherwise (an undated metric) → "year" (sensible medium default).
 */
export function classifyHorizon(input: HorizonInput, now: Date): Horizon {
  if (input.role === "driver" || input.primitive === "habit") return "now"
  if (input.primitive === "stage") return "vision"

  if (input.targetDate) {
    const t = Date.parse(input.targetDate + "T00:00:00")
    if (!Number.isNaN(t)) {
      const days = (t - now.getTime()) / DAY
      if (days <= QUARTER_DAYS) return "quarter"
      if (days <= YEAR_DAYS) return "year"
      return "vision"
    }
  }
  return "year"
}
