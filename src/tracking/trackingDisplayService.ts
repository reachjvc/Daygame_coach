/**
 * Display helpers for tracking enum values.
 * Provides safe fallbacks for unknown/stale values.
 */

import { OUTCOME_OPTIONS, SET_TYPE_OPTIONS } from "./config"
import { isKnownOutcome, isKnownSetType } from "@/src/db/trackingEnums"

export function getOutcomeLabel(outcome: string): string {
  const found = OUTCOME_OPTIONS.find(o => o.value === outcome)
  if (found) return found.label
  return outcome.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export function getOutcomeEmoji(outcome: string): string {
  const found = OUTCOME_OPTIONS.find(o => o.value === outcome)
  if (found) return found.emoji
  return "❓"
}

export function getOutcomeColor(outcome: string): string {
  const found = OUTCOME_OPTIONS.find(o => o.value === outcome)
  if (found) return found.color
  return "bg-amber-500/20 text-amber-500 border-amber-500/30"  // warning style for unknown
}

export function getSetTypeLabel(setType: string): string {
  const found = SET_TYPE_OPTIONS.find(o => o.value === setType)
  if (found) return found.label
  return setType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

export function getSetTypeEmoji(setType: string): string {
  const found = SET_TYPE_OPTIONS.find(o => o.value === setType)
  if (found) return found.emoji
  return "❓"
}

export function isUnknownOutcome(outcome: string | null): boolean {
  if (!outcome) return false
  return !isKnownOutcome(outcome)
}

export function isUnknownSetType(setType: string | null): boolean {
  if (!setType) return false
  return !isKnownSetType(setType)
}
