/**
 * Scenario Recommendation Service
 *
 * Computes personalized scenario recommendations based on user goals.
 * Uses weighted pattern matching to score scenarios against goal text.
 */

import type { ScenarioId, ScenarioWeights, GoalPattern, UserGoal, ScenarioScore } from "./types"
import { getAvailableScenarioIds } from "./catalog"
import {
  GOAL_SCENARIO_WEIGHTS,
  DEFAULT_SCENARIO_WEIGHTS,
  ALL_SCENARIOS,
} from "./data/goalScenarioWeights"

/**
 * Find all goal patterns that match a goal title.
 */
function matchGoalPatterns(goalTitle: string): GoalPattern[] {
  return GOAL_SCENARIO_WEIGHTS.filter((pattern) => pattern.pattern.test(goalTitle))
}

/**
 * Compute scenario weights for a single goal.
 * If multiple patterns match, uses the highest weight for each scenario.
 */
function computeWeightsForGoal(goalTitle: string): {
  weights: ScenarioWeights
  matchedPatterns: string[]
} {
  const matchedPatterns = matchGoalPatterns(goalTitle)

  if (matchedPatterns.length === 0) {
    return { weights: DEFAULT_SCENARIO_WEIGHTS, matchedPatterns: [] }
  }

  // Combine weights - take max weight per scenario across all matched patterns
  const combinedWeights = { ...DEFAULT_SCENARIO_WEIGHTS }
  const patternNames: string[] = []

  for (const pattern of matchedPatterns) {
    patternNames.push(pattern.description)
    for (const scenarioId of ALL_SCENARIOS) {
      const patternWeight = pattern.weights[scenarioId] ?? 0
      combinedWeights[scenarioId] = Math.max(combinedWeights[scenarioId], patternWeight)
    }
  }

  return { weights: combinedWeights, matchedPatterns: patternNames }
}

/**
 * Compute aggregated scenario scores across all user goals.
 * Sums weights per scenario, then normalizes.
 */
function computeAggregatedScores(goals: UserGoal[]): ScenarioScore[] {
  const scoreMap: Record<ScenarioId, { total: number; patterns: Set<string> }> = {} as Record<
    ScenarioId,
    { total: number; patterns: Set<string> }
  >

  // Initialize
  for (const scenarioId of ALL_SCENARIOS) {
    scoreMap[scenarioId] = { total: 0, patterns: new Set() }
  }

  // Aggregate weights from all goals
  for (const goal of goals) {
    const { weights, matchedPatterns } = computeWeightsForGoal(goal.title)

    for (const scenarioId of ALL_SCENARIOS) {
      scoreMap[scenarioId].total += weights[scenarioId]
      for (const pattern of matchedPatterns) {
        scoreMap[scenarioId].patterns.add(pattern)
      }
    }
  }

  // Convert to sorted array
  const scores: ScenarioScore[] = ALL_SCENARIOS.map((scenarioId) => ({
    scenarioId,
    score: scoreMap[scenarioId].total,
    matchedPatterns: Array.from(scoreMap[scenarioId].patterns),
  }))

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  return scores
}

/**
 * Get recommended scenarios for a user based on their goals.
 *
 * @param goals - User's active goals
 * @param count - Number of recommendations to return (default 3)
 * @param onlyAvailable - Only return currently available scenarios (default true)
 * @returns Top N scenario IDs sorted by relevance
 */
export function getRecommendedScenarios(
  goals: UserGoal[],
  count: number = 3,
  onlyAvailable: boolean = true
): ScenarioId[] {
  if (goals.length === 0) {
    // No goals - return default recommendations
    const defaults: ScenarioId[] = ["practice-shittests", "keep-it-going", "practice-career-response"]
    if (onlyAvailable) {
      const available = getAvailableScenarioIds()
      return defaults.filter((id) => available.includes(id)).slice(0, count)
    }
    return defaults.slice(0, count)
  }

  const scores = computeAggregatedScores(goals)

  let candidates = scores
  if (onlyAvailable) {
    const available = getAvailableScenarioIds()
    candidates = scores.filter((s) => available.includes(s.scenarioId))
  }

  return candidates.slice(0, count).map((s) => s.scenarioId)
}

/**
 * Get detailed recommendation scores for debugging/display.
 *
 * @param goals - User's active goals
 * @param onlyAvailable - Only return currently available scenarios (default true)
 * @returns All scenario scores with matched patterns
 */
export function getRecommendationScores(
  goals: UserGoal[],
  onlyAvailable: boolean = true
): ScenarioScore[] {
  if (goals.length === 0) {
    return ALL_SCENARIOS.map((id) => ({
      scenarioId: id,
      score: DEFAULT_SCENARIO_WEIGHTS[id],
      matchedPatterns: [],
    }))
  }

  const scores = computeAggregatedScores(goals)

  if (onlyAvailable) {
    const available = getAvailableScenarioIds()
    return scores.filter((s) => available.includes(s.scenarioId))
  }

  return scores
}

/**
 * Check which patterns a goal text matches.
 * Useful for debugging or showing users why a scenario was recommended.
 */
export function debugGoalMatches(goalTitle: string): { pattern: string; description: string }[] {
  return matchGoalPatterns(goalTitle).map((p) => ({
    pattern: p.pattern.toString(),
    description: p.description,
  }))
}
