/**
 * Value Cutting Module
 * Algorithms for prioritizing and cutting down values to the core set.
 */

import { CUTTING_CONFIG } from "../config"
import type { CoreValue, ValueComparison, InferredValue, ValueSource, ValueWithSource } from "../types"

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

/**
 * Generate pairs for pairwise comparison.
 * Uses a tournament-style approach to minimize comparisons needed.
 */
export function generateComparisonPairs(valueIds: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = []

  // Shuffle values to randomize comparisons
  const shuffled = [...valueIds].sort(() => Math.random() - 0.5)

  // For small sets, do round-robin (every value vs every other)
  if (shuffled.length <= 10) {
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        pairs.push([shuffled[i], shuffled[j]])
      }
    }
  } else {
    // For larger sets, use tournament-style brackets
    // Each value needs to be compared at least once
    // Group into pairs, then winners advance
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      pairs.push([shuffled[i], shuffled[i + 1]])
    }
    // If odd number, last one gets a bye (will be in next round)
  }

  return pairs
}

/**
 * Score values based on comparison results.
 * Values that win more comparisons get higher scores.
 */
export function scoreValuesFromComparisons(
  valueIds: string[],
  comparisons: ValueComparison[]
): Map<string, number> {
  const scores = new Map<string, number>()

  // Initialize all values with 0
  for (const id of valueIds) {
    scores.set(id, 0)
  }

  // Add points for wins
  for (const comparison of comparisons) {
    const currentScore = scores.get(comparison.chosenValueId) ?? 0
    scores.set(comparison.chosenValueId, currentScore + 1)
  }

  return scores
}

/**
 * Get top N values based on comparison scores.
 */
export function getTopValues(
  valueIds: string[],
  comparisons: ValueComparison[],
  n: number = CUTTING_CONFIG.targetCoreValues
): string[] {
  const scores = scoreValuesFromComparisons(valueIds, comparisons)

  // Sort by score descending
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id]) => id)
}

/**
 * Determine how many comparison rounds are needed.
 */
export function calculateRoundsNeeded(valueCount: number): number {
  if (valueCount <= CUTTING_CONFIG.targetCoreValues) return 0
  if (valueCount <= 10) return 1
  if (valueCount <= 15) return 2
  return 3
}

/**
 * Check if cutting is complete (we have target number of values).
 */
export function isCuttingComplete(
  valueIds: string[],
  comparisons: ValueComparison[]
): boolean {
  const roundsNeeded = calculateRoundsNeeded(valueIds.length)
  const currentRound = Math.max(0, ...comparisons.map(c => c.roundNumber))
  return currentRound >= roundsNeeded
}

/**
 * Get values remaining after a round of cutting.
 */
export function getValuesAfterRound(
  valueIds: string[],
  comparisons: ValueComparison[],
  round: number
): string[] {
  const roundComparisons = comparisons.filter(c => c.roundNumber === round)
  const scores = scoreValuesFromComparisons(valueIds, roundComparisons)

  // Keep top half (or target number, whichever is larger)
  const keepCount = Math.max(
    Math.ceil(valueIds.length / 2),
    CUTTING_CONFIG.targetCoreValues
  )

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, keepCount)
    .map(([id]) => id)
}

/**
 * Build final core values list with rankings.
 */
export function buildFinalCoreValues(
  valueIds: string[],
  comparisons: ValueComparison[]
): CoreValue[] {
  const topValues = getTopValues(valueIds, comparisons)

  return topValues.map((id, index) => ({
    id,
    rank: index + 1,
  }))
}

/**
 * Merge selected values with inferred values, removing duplicates.
 */
export function mergeValues(
  selectedValues: string[],
  hurdlesInferred: string[],
  deathbedInferred: string[]
): string[] {
  const all = new Set<string>()

  for (const v of selectedValues) all.add(v)
  for (const v of hurdlesInferred) all.add(v)
  for (const v of deathbedInferred) all.add(v)

  return Array.from(all)
}

/**
 * Split values into "current" and "aspirational" based on user choices.
 */
export function splitByAspirational(
  valueIds: string[],
  aspirationalIds: Set<string>
): { current: string[]; aspirational: string[] } {
  const current: string[] = []
  const aspirational: string[] = []

  for (const id of valueIds) {
    if (aspirationalIds.has(id)) {
      aspirational.push(id)
    } else {
      current.push(id)
    }
  }

  return { current, aspirational }
}

/**
 * Determine next action in cutting phase.
 */
export function getNextCuttingAction(
  totalValues: number,
  comparisonsCount: number,
  hasAspirationalSplit: boolean
): "aspirational" | "pairwise" | "ranking" | "complete" {
  // First, do aspirational split if not done
  if (!hasAspirationalSplit && totalValues > CUTTING_CONFIG.minValuesForCutting) {
    return "aspirational"
  }

  // If few values, go straight to ranking
  if (totalValues <= CUTTING_CONFIG.targetCoreValues) {
    return "ranking"
  }

  // If many values, do pairwise comparisons
  if (totalValues > CUTTING_CONFIG.targetCoreValues) {
    const roundsNeeded = calculateRoundsNeeded(totalValues)
    const pairsPerRound = Math.ceil(totalValues / 2)
    const totalPairsNeeded = roundsNeeded * pairsPerRound

    if (comparisonsCount < totalPairsNeeded) {
      return "pairwise"
    }
  }

  return "ranking"
}
