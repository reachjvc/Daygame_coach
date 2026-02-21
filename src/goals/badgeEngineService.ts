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
import type { GoalWithProgress, BadgeTier, BadgeStatus, TierUpgradeEvent, GoalPhase } from "./types"

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
// Self-Reported Gating
// ============================================================================

/**
 * Check if any contributing L3 goal has a non-self-reported linked metric.
 * If ALL goals are self-reported (linkedMetric === null), badge tier is capped at bronze.
 */
function hasNonSelfReportedGoal(l3Goals: GoalWithProgress[]): boolean {
  return l3Goals.some((g) => {
    if (!g.template_id) return false
    const template = GOAL_TEMPLATE_MAP[g.template_id]
    return template?.linkedMetric != null
  })
}

// ============================================================================
// Phase-Aware Progress
// ============================================================================

/**
 * Build a progress map that accounts for goal phase.
 * Goals in consolidation/graduated phase contribute 100% of their weight.
 * Goals in acquisition (or no phase) contribute their actual progress_percentage.
 */
function buildPhaseAwareProgressMap(
  l3Goals: GoalWithProgress[]
): Map<string, number> {
  const progressMap = new Map<string, number>()
  for (const goal of l3Goals) {
    if (goal.template_id) {
      const phase = (goal as GoalWithProgress & { goal_phase?: GoalPhase | null }).goal_phase
      const progress = (phase === "consolidation" || phase === "graduated")
        ? 100
        : goal.progress_percentage
      progressMap.set(goal.template_id, progress)
    }
  }
  return progressMap
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
  // Build set of active template IDs and phase-aware progress map
  const activeTemplateIds = new Set<string>()
  for (const goal of l3Goals) {
    if (goal.template_id) {
      activeTemplateIds.add(goal.template_id)
    }
  }

  const progressMap = buildPhaseAwareProgressMap(l3Goals)
  const selfReportedOnly = !hasNonSelfReportedGoal(l3Goals)

  const allL2Ids = getAllL2Ids()
  const badges: BadgeStatus[] = []

  for (const l2Id of allL2Ids) {
    const weights = getAchievementWeights(l2Id, activeTemplateIds)

    // Skip L2s with no active contributing goals
    if (weights.length === 0) continue

    const result = computeAchievementProgress(weights, progressMap)
    let tier = progressToTier(result.progressPercent)

    // Self-reported gating: cap at bronze if no linked metrics
    if (selfReportedOnly && TIER_ORDER[tier] > TIER_ORDER["bronze"]) {
      tier = "bronze"
    }

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
  for (const goal of l3Goals) {
    if (goal.template_id) {
      activeTemplateIds.add(goal.template_id)
    }
  }

  const weights = getAchievementWeights(l2Id, activeTemplateIds)
  if (weights.length === 0) return null

  const progressMap = buildPhaseAwareProgressMap(l3Goals)
  const result = computeAchievementProgress(weights, progressMap)
  let tier = progressToTier(result.progressPercent)

  // Self-reported gating: cap at bronze if no linked metrics
  const selfReportedOnly = !hasNonSelfReportedGoal(l3Goals)
  if (selfReportedOnly && TIER_ORDER[tier] > TIER_ORDER["bronze"]) {
    tier = "bronze"
  }

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

// ============================================================================
// Tier Upgrade Detection
// ============================================================================

/** Numeric order for tier comparison. Higher = better. */
export const TIER_ORDER: Record<BadgeTier, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
}

/**
 * Detect upward tier changes between two badge snapshots.
 * Only reports upgrades (not downgrades or unchanged tiers).
 */
export function detectTierUpgrades(
  previousBadges: BadgeStatus[],
  currentBadges: BadgeStatus[]
): TierUpgradeEvent[] {
  const prevMap = new Map(previousBadges.map((b) => [b.badgeId, b]))
  const upgrades: TierUpgradeEvent[] = []

  for (const current of currentBadges) {
    const prev = prevMap.get(current.badgeId)
    const prevTier = prev?.tier ?? "none"
    if (TIER_ORDER[current.tier] > TIER_ORDER[prevTier]) {
      upgrades.push({
        badgeId: current.badgeId,
        badgeTitle: current.title,
        previousTier: prevTier,
        newTier: current.tier,
      })
    }
  }

  return upgrades
}
