/**
 * Value Cutting Module
 * Where each value in the cutting step came from, and the aspirational default
 * that source implies.
 */

import type { InferredValue, ValueSource, ValueWithSource } from "../types"

// ============================================================================
// Value Source Tracking (for new prioritization flow)
// ============================================================================

/**
 * Convert a value ID to a display name.
 * E.g., "self-reliance" -> "Self-Reliance"
 */
export function formatValueDisplayName(valueId: string): string {
  return valueId
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-")
    // Handle special cases like "self-reliance" -> "Self-Reliance"
    .replace(/-([a-z])/g, (_, char) => "-" + char.toUpperCase())
    // Actually make it look nice with spaces
    .replace(/-/g, " ")
}

/**
 * Determine the source of a value for display purposes.
 * Priority: picked > peak_experience > shadow > hurdles
 * (If user explicitly picked it, that takes precedence)
 */
export function getValueSource(
  valueId: string,
  selectedValues: string[],
  shadowInferred: InferredValue[] | null,
  peakExperienceInferred: InferredValue[] | null,
  hurdlesInferred: InferredValue[] | null
): ValueSource {
  // If user explicitly picked it, that's the primary source
  if (selectedValues.includes(valueId)) {
    return "picked"
  }
  // Check inference sources (order matters for smart defaults)
  if (peakExperienceInferred?.some(v => v.id === valueId)) {
    return "peak_experience"
  }
  if (shadowInferred?.some(v => v.id === valueId)) {
    return "shadow"
  }
  if (hurdlesInferred?.some(v => v.id === valueId)) {
    return "hurdles"
  }
  // Fallback (shouldn't happen if value is in the merged set)
  return "picked"
}

/**
 * Get the inference reason for a value (if it was inferred).
 */
export function getInferenceReason(
  valueId: string,
  shadowInferred: InferredValue[] | null,
  peakExperienceInferred: InferredValue[] | null,
  hurdlesInferred: InferredValue[] | null
): string | undefined {
  const shadow = shadowInferred?.find(v => v.id === valueId)
  if (shadow) return shadow.reason

  const peak = peakExperienceInferred?.find(v => v.id === valueId)
  if (peak) return peak.reason

  const hurdles = hurdlesInferred?.find(v => v.id === valueId)
  if (hurdles) return hurdles.reason

  return undefined
}

/**
 * Build a list of all values with their source information.
 * Merges selected values and inferred values, deduplicates, and adds source tracking.
 */
export function buildValuesWithSource(
  selectedValues: string[],
  shadowInferred: InferredValue[] | null,
  peakExperienceInferred: InferredValue[] | null,
  hurdlesInferred: InferredValue[] | null
): ValueWithSource[] {
  // Collect all unique value IDs
  const allIds = new Set<string>()
  selectedValues.forEach(id => allIds.add(id))
  shadowInferred?.forEach(v => allIds.add(v.id))
  peakExperienceInferred?.forEach(v => allIds.add(v.id))
  hurdlesInferred?.forEach(v => allIds.add(v.id))

  // Build the list with source info
  const result: ValueWithSource[] = []
  for (const id of allIds) {
    const source = getValueSource(id, selectedValues, shadowInferred, peakExperienceInferred, hurdlesInferred)
    const reason = getInferenceReason(id, shadowInferred, peakExperienceInferred, hurdlesInferred)

    result.push({
      id,
      displayName: formatValueDisplayName(id),
      source,
      reason,
    })
  }

  // Sort: picked first, then by source, then alphabetically
  const sourceOrder: Record<ValueSource, number> = {
    picked: 0,
    peak_experience: 1,
    shadow: 2,
    hurdles: 3,
  }

  return result.sort((a, b) => {
    const sourceCompare = sourceOrder[a.source] - sourceOrder[b.source]
    if (sourceCompare !== 0) return sourceCompare
    return a.displayName.localeCompare(b.displayName)
  })
}

/**
 * Get the smart default for aspirational check based on value source.
 * - Peak Experience values -> default to "I Live This" (user embodied them at their best)
 * - Hurdles/Shadow values -> default to "I Aspire to This" (growth areas)
 * - Picked values -> no default (user must choose)
 */
export function getAspirationalDefault(source: ValueSource): boolean | null {
  switch (source) {
    case "peak_experience":
      return false // "I Live This" (not aspirational)
    case "hurdles":
    case "shadow":
      return true // "I Aspire to This"
    case "picked":
    default:
      return null // No default
  }
}
