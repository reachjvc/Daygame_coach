/**
 * "480 of 500", shown only when a text is close to the database's cap
 * (`src/goals/planLimits.ts`), so an ordinary field looks exactly as before.
 * Sits under or beside the input it counts; `role="status"` so a screen reader
 * hears it once it appears.
 */

import { charCount } from "../../planLimits"

/** The share of the cap from which the counter appears. */
const SHOW_FROM = 0.9

export function LimitCounter({ value, max, label }: { value: string; max: number; label?: string }) {
  const count = charCount(value)
  if (count < max * SHOW_FROM) return null
  return (
    <span role="status" aria-label={label ? `${label}: ${count} of ${max} characters` : undefined} className="block text-[10px] text-amber-300/80 tabular-nums">
      {count} of {max}
    </span>
  )
}
