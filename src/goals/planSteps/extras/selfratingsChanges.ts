/** THE CHANGES THE DAILY RATINGS SCREENS MAKE, as pure functions over `NsPlan`. */

import type { NsPlan } from "@/src/goals/types"
import { setAnswer } from "../planChanges"
import { fieldUnitKey, ratingScaleKey, fieldScale } from "../planFacts"
import { addField } from "./questionsChanges"

export type RatingScale = "five" | "ten" | "number"

/** A new daily question (a number field). Returns the id, or null for a blank or a repeat. */
export function addRating(plan: NsPlan, label: string): { plan: NsPlan; id: string | null } {
  return addField(plan, label, "number")
}

export function addRatings(plan: NsPlan, labels: string[]): { plan: NsPlan; ids: string[] } {
  let next = plan
  const ids: string[] = []
  for (const l of labels) {
    const made = addRating(next, l)
    next = made.plan
    if (made.id) ids.push(made.id)
  }
  return { plan: next, ids }
}

/** How a rating is answered: 1 to 5, 1 to 10, or a plain number with a unit. */
export function setRatingScale(plan: NsPlan, id: string, scale: RatingScale, unit: string): NsPlan {
  if (!plan.fields.some((f) => f.id === id && f.kind === "number")) return plan
  let next = setAnswer(plan, ratingScaleKey(id), scale === "five" ? "5" : scale === "ten" ? "10" : "")
  next = setAnswer(next, fieldUnitKey(id), scale === "number" ? unit.trim() : "")
  return next
}

export function scaleOf(plan: NsPlan, id: string): RatingScale {
  const s = fieldScale(plan, id)
  return s === 5 ? "five" : s === 10 ? "ten" : "number"
}

/** The last `days` days up to and including `today`, oldest first, with the value a rating held that day (or null). */
export function ratingStrip(plan: NsPlan, id: string, today: string, days = 14): { date: string; value: number | null }[] {
  const [y, m, d] = today.split("-").map(Number)
  return Array.from({ length: days }, (_, i) => {
    const at = new Date(y, m - 1, d - (days - 1 - i))
    const date = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`
    return { date, value: plan.numbers[date]?.[id] ?? null }
  })
}
