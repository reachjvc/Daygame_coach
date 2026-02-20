/**
 * L2 Badge Engine — standalone service that computes badge/gamification status
 * for each L2 achievement from a flat list of L3 goal progress.
 *
 * Uses the same weighted aggregation math as computeAchievementProgress()
 * in milestoneService.ts, but packages results as badge statuses with tiers.
 *
 * Pure functions — no DB or side effects.
 */

import {
  DEFAULT_ACHIEVEMENT_WEIGHTS,
  GOAL_TEMPLATE_MAP,
  getAchievementWeights,
} from "./data/goalGraph"
import { computeAchievementProgress } from "./milestoneService"
import type { GoalWithProgress, BadgeTier, BadgeStatus } from "./types"

// ============================================================================
// Tier Thresholds
// ============================================================================

/** Badge tier thresholds (progress percentage boundaries). */
const TIER_THRESHOLDS: { min: number; tier: BadgeTier }[] = [
  { min: 100, tier: "diamond" },
  { min: 75, tier: "gold" },
  { min: 50, tier: "silver" },
  { min: 25, tier: "bronze" },
  { min: 0, tier: "none" },
]

/**
 * Map a progress percentage (0–100) to a badge tier.
 */
export function progressToTier(progress: number): BadgeTier {
  for (const { min, tier } of TIER_THRESHOLDS) {
    if (progress >= min) return tier
  }
  return "none"
}

// ============================================================================
// Badge Computation
// ============================================================================

/**
 * Extract unique L2 achievement IDs from the default weight table.
 * These are all L2 IDs that have weight entries defined.
 */
function getAllL2Ids(): string[] {
  const ids = new Set(DEFAULT_ACHIEVEMENT_WEIGHTS.map((w) => w.achievementId))
  return [...ids]
}

/**
 * Compute badge status for all L2 achievements from a flat list of L3 goals.
 *
 * For each L2:
 * 1. Determines which L3 goals are active (present in the input list with a template_id)
 * 2. Redistributes weights across active goals only (same as getAchievementWeights)
 * 3. Computes weighted progress (same math as computeAchievementProgress)
 * 4. Assigns a tier based on progress thresholds
 *
 * L2 achievements with zero active contributing goals are excluded from the result.
 *
 * @param l3Goals - flat list of L3 GoalWithProgress items (must have template_id and progress_percentage)
 * @returns BadgeStatus[] - one entry per L2 that has at least one active contributing L3
 */
export function computeAllBadges(l3Goals: GoalWithProgress[]): BadgeStatus[] {
  // Build set of active template IDs and progress map
  const activeTemplateIds = new Set<string>()
  const progressMap = new Map<string, number>()

  for (const goal of l3Goals) {
    if (goal.template_id) {
      activeTemplateIds.add(goal.template_id)
      progressMap.set(goal.template_id, goal.progress_percentage)
    }
  }

  const allL2Ids = getAllL2Ids()
  const badges: BadgeStatus[] = []

  for (const l2Id of allL2Ids) {
    const weights = getAchievementWeights(l2Id, activeTemplateIds)

    // Skip L2s with no active contributing goals
    if (weights.length === 0) continue

    const result = computeAchievementProgress(weights, progressMap)
    const tier = progressToTier(result.progressPercent)

    const template = GOAL_TEMPLATE_MAP[l2Id]
    const title = template?.title ?? l2Id

    badges.push({
      badgeId: l2Id,
      title,
      progress: result.progressPercent,
      tier,
      unlocked: tier !== "none",
    })
  }

  return badges
}

/**
 * Compute badge status for a single L2 achievement from a flat list of L3 goals.
 *
 * Returns null if the L2 has no active contributing goals in the input list.
 *
 * @param l2Id - the L2 template ID (e.g., "l2_master_daygame")
 * @param l3Goals - flat list of L3 GoalWithProgress items
 */
export function computeBadge(
  l2Id: string,
  l3Goals: GoalWithProgress[]
): BadgeStatus | null {
  const activeTemplateIds = new Set<string>()
  const progressMap = new Map<string, number>()

  for (const goal of l3Goals) {
    if (goal.template_id) {
      activeTemplateIds.add(goal.template_id)
      progressMap.set(goal.template_id, goal.progress_percentage)
    }
  }

  const weights = getAchievementWeights(l2Id, activeTemplateIds)
  if (weights.length === 0) return null

  const result = computeAchievementProgress(weights, progressMap)
  const tier = progressToTier(result.progressPercent)

  const template = GOAL_TEMPLATE_MAP[l2Id]
  const title = template?.title ?? l2Id

  return {
    badgeId: l2Id,
    title,
    progress: result.progressPercent,
    tier,
    unlocked: tier !== "none",
  }
}
