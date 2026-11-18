import coaching from "./data/coaching.json"
import tooltext from "./data/tooltext.json"
import { getAddiction } from "./data"
import { getOffer } from "./offer"
import { isAddictionId, isViewable } from "./menu"
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

/** What `cost` stored: `quit-v1[a].cost.result.yearUsd`. Null for anything else. */
export function yearlyCost(stored: unknown): number | null {
  if (!stored || typeof stored !== "object") return null
  const result = (stored as { result?: unknown }).result
  if (!result || typeof result !== "object") return null
  const year = (result as { yearUsd?: unknown }).yearUsd
  return typeof year === "number" && Number.isFinite(year) && year >= 0 ? year : null
}
