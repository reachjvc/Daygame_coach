/**
 * Value Cutting Module
 * Algorithms for prioritizing and cutting down values to the core set.
 */

import { CUTTING_CONFIG } from "../config"
import type { CoreValue, ValueComparison } from "../types"

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
