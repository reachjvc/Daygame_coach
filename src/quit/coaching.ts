import coaching from "./data/coaching.json"
import tooltext from "./data/tooltext.json"
import { getAddiction } from "./data"
import { getOffer } from "./offer"
import { isAddictionId, isViewable } from "./menu"
import { yearlyCostFromRecord } from "./tools/cost/logic"
import { isTodo, type QuitAddictionId } from "./types"

export const coachingText = coaching
export const coachingLabels = tooltext.coaching

/** `?a=` value to an addiction id; nicotine when missing or unknown. */
export function addictionFromParam(raw: string | string[] | undefined): QuitAddictionId {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v && isAddictionId(v) ? v : "nicotine"
}

export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

export function priceText(): string {
  return formatUsd(getOffer().coachingPriceUsd)
}

export function stepsText(): string[] {
  return coaching.steps.map((s) => s.replace("{days}", String(getOffer().days)))
}

/** The addiction's catch paragraph, or null while it is missing, "TODO" or the addiction is not viewable. */
export function catchText(id: QuitAddictionId, preview = false): string | null {
  if (!isViewable(id, preview)) return null
  const text = getAddiction(id)?.catch
  return typeof text === "string" && text.trim() !== "" && !isTodo(text) ? text : null
}

/** His yearly cost from the shared record (`quit-v1[a].record.unit`): count a day × price × 365. Null without a count or a price. */
export function yearlyCost(stored: unknown): number | null {
  return yearlyCostFromRecord(stored)
}
