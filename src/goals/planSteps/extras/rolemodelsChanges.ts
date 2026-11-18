/**
 * THE CHANGES THE ROLE MODELS SCREENS MAKE, as pure functions over `NsPlan`.
 *
 * The copy space cannot reach the role-model tables, so the lineup is kept as answer rows (`planFacts.ts`).
 */

import type { NsPlan } from "@/src/goals/types"
import { periodOf } from "@/src/goals/reviewService"
import { setAnswer } from "../planChanges"
import {
  LINEUP_HOUR_KEY, LINEUP_KEY, LINEUP_REMIND_KEY, LINEUP_WEEK_OF_KEY, LINEUP_WEEK_VALUE_KEY, lineupIds, lineupMarkKey, lineupTakeKey,
} from "../planFacts"

export const LINEUP_MAX = 5

/** Put a person in the lineup (the sixth is refused). */
export function addToLineup(plan: NsPlan, personId: string): NsPlan {
  const ids = lineupIds(plan)
  if (ids.includes(personId) || ids.length >= LINEUP_MAX) return plan
  return setAnswer(plan, LINEUP_KEY, [...ids, personId].join(","))
}

/** Take a person out, and what was taken from them. */
export function removeFromLineup(plan: NsPlan, personId: string): NsPlan {
  const ids = lineupIds(plan).filter((i) => i !== personId)
  return setAnswer(setAnswer(plan, LINEUP_KEY, ids.join(",")), lineupTakeKey(personId), "")
}

/** The values taken from one person: 1 to 5, no repeats. An empty list changes nothing. */
export function setTaken(plan: NsPlan, personId: string, values: string[]): NsPlan {
  const clean = [...new Set(values.map((v) => v.trim()).filter(Boolean))].slice(0, 5)
  if (clean.length === 0 || !lineupIds(plan).includes(personId)) return plan
  return setAnswer(plan, lineupTakeKey(personId), clean.join("|"))
}

/** The value to watch this week, stamped with this week's Monday; null clears it. */
export function setWeekValue(plan: NsPlan, value: string | null, today: string): NsPlan {
  if (!value?.trim()) return setAnswer(setAnswer(plan, LINEUP_WEEK_VALUE_KEY, ""), LINEUP_WEEK_OF_KEY, "")
  return setAnswer(setAnswer(plan, LINEUP_WEEK_VALUE_KEY, value.trim()), LINEUP_WEEK_OF_KEY, periodOf("week", today).start)
}

/** The daily reminder's choice. Stored and shown; this copy sends nothing. */
export function setRemind(plan: NsPlan, on: boolean, hour: number): NsPlan {
  const h = Math.min(23, Math.max(0, Math.round(hour)))
  return setAnswer(setAnswer(plan, LINEUP_REMIND_KEY, on ? "1" : ""), LINEUP_HOUR_KEY, String(h))
}

/** Whether the week's value was lived on a day (`null` clears the mark). */
export function setMark(plan: NsPlan, date: string, mark: "lived" | "short" | null): NsPlan {
  return setAnswer(plan, lineupMarkKey(date), mark ?? "")
}
