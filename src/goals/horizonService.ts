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

/** Format a Date as YYYY-MM-DD in LOCAL time (not UTC, to avoid off-by-one shifts). */
function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Today as YYYY-MM-DD (local). */
export function todayISO(now: Date = new Date()): string {
  return toLocalISO(now)
}

/** Add days to a YYYY-MM-DD date, returning YYYY-MM-DD (local, no UTC drift). */
export function addDaysISO(startDate: string, days: number): string {
  const d = new Date(startDate + "T00:00:00")
  if (Number.isNaN(d.getTime())) return startDate
  d.setDate(d.getDate() + days)
  return toLocalISO(d)
}

/** Days out a horizon implies from the start, for auto-suggesting a target date. */
export const HORIZON_OFFSET_DAYS: Record<Horizon, number | null> = {
  now: null,       // ongoing — no end date
  quarter: 90,
  year: 365,
  vision: null,    // open-ended
}

/**
 * Suggest a target date for a goal that has none, based on its TYPE horizon:
 * 90-day goals → start+90, 1-year → start+365, Now/Vision stay open (null).
 */
export function suggestedTargetDate(input: Omit<HorizonInput, "targetDate">, startDate: string): string | null {
  const h = classifyHorizon(input, new Date(startDate + "T00:00:00"))
  const offset = HORIZON_OFFSET_DAYS[h]
  return offset == null ? null : addDaysISO(startDate, offset)
}

/** Compact countdown to a date: "in 12d", "in 3mo", "in 2y 1mo", "5d overdue", "today". */
export function formatCountdown(targetDate: string, now: Date): string | null {
  const t = Date.parse(targetDate + "T00:00:00")
  if (Number.isNaN(t)) return null
  const days = Math.round((t - now.getTime()) / DAY)
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return "today"
  if (days < 31) return `in ${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) {
    const rem = days - months * 30
    return rem > 0 ? `in ${months}mo ${rem}d` : `in ${months}mo`
  }
  const years = Math.floor(months / 12)
  const mo = months % 12
  return mo > 0 ? `in ${years}y ${mo}mo` : `in ${years}y`
}

// ---------------------------------------------------------------------------
// Date nesting — a child tier date should fall within [start, parentDate]. We
// SOFT-validate (flag, never block) so the user can still set whatever they want;
// the UI surfaces a warning when a child reaches past its parent.
// ---------------------------------------------------------------------------

export interface DateNesting {
  /** True when child > parent (child outlives its parent — usually a mistake). */
  violatesParent: boolean
  /** True when child < start (before the plan begins). */
  beforeStart: boolean
}

/** Compare two YYYY-MM-DD strings as dates; null/empty sorts as "no constraint". */
function cmpISO(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null
  const ta = Date.parse(a + "T00:00:00")
  const tb = Date.parse(b + "T00:00:00")
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null
  return ta === tb ? 0 : ta < tb ? -1 : 1
}

/**
 * Validate a child tier date against its plan start and parent tier date.
 * Pure + tolerant: missing dates simply don't constrain. Returns flags, not errors.
 */
export function clampDateWithin(child: string | undefined, start: string | undefined, parentDate?: string): DateNesting {
  const vsParent = cmpISO(child, parentDate)
  const vsStart = cmpISO(child, start)
  return {
    violatesParent: vsParent === 1,
    beforeStart: vsStart === -1,
  }
}

/** Suggest a child date inside [start, parentDate]: the parent's date if set, else null. */
export function suggestChildWithin(start: string | undefined, parentDate?: string): string | null {
  if (parentDate) return parentDate
  return null
}

/**
 * Linear-interpolate an ISO date `fraction` (0..1) of the way from start to end.
 * Used to pace milestone checkpoints across [planStart, targetDate] so the roadmap's
 * finest tier shows projected dates anchored to the plan start. Local-time, no UTC drift.
 */
export function interpolateDateISO(startISO: string, endISO: string, fraction: number): string | null {
  const s = Date.parse(startISO + "T00:00:00")
  const e = Date.parse(endISO + "T00:00:00")
  if (Number.isNaN(s) || Number.isNaN(e)) return null
  const f = Math.max(0, Math.min(1, fraction))
  return toLocalISO(new Date(s + (e - s) * f))
}
