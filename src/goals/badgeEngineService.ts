/**
 * L2 Badge Engine — computes badge/gamification status for L2 achievements.
 *
 * All badges use threshold-based tiers with evolving names (6 tiers).
 * Each badge config defines concrete L3 value requirements per tier.
 *
 * Pure functions — no DB or side effects.
 */

import {
  GOAL_TEMPLATE_MAP,
  ALL_BADGE_REQUIREMENTS,
  THRESHOLD_L2_IDS,
} from "./data/goalGraph"
import type {
  GoalWithProgress, BadgeTier, BadgeStatus, TierUpgradeEvent,
  BadgeConfig, BadgeTierRequirement,
} from "./types"

// ============================================================================
// Tier System
// ============================================================================

/** Ordered tiers from highest to lowest for threshold checking. */
const TIERS_DESC: BadgeTier[] = ["mythic", "diamond", "gold", "silver", "bronze", "iron"]

/** Map a progress percentage (0–100) to a display tier. */
export function progressToTier(percent: number): BadgeTier {
  if (percent >= 100) return "diamond"
  if (percent >= 75) return "gold"
  if (percent >= 50) return "silver"
  if (percent >= 25) return "bronze"
  return "none"
}

/** Numeric order for tier comparison. Higher = better. */
export const TIER_ORDER: Record<BadgeTier, number> = {
  none: 0,
  iron: 1,
  bronze: 2,
  silver: 3,
  gold: 4,
  diamond: 5,
  mythic: 6,
}

// ============================================================================
// Threshold-Based Badge Computation
// ============================================================================

/**
 * Build a map of template_id → current_value from L3 goals.
 */
function buildCurrentValueMap(l3Goals: GoalWithProgress[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const goal of l3Goals) {
    if (goal.template_id) {
      map.set(goal.template_id, goal.current_value)
    }
  }
  return map
}

/**
 * Check if all requirements for a tier are met.
 */
function tierRequirementsMet(
  requirements: BadgeTierRequirement[],
  valueMap: Map<string, number>
): boolean {
  return requirements.every((req) => {
    const value = valueMap.get(req.templateId) ?? 0
    return value >= req.value
  })
}

/**
 * Compute progress percentage toward the next tier.
 * Returns the minimum completion ratio across all next-tier requirements.
 * If already mythic, returns 100.
 */
function computeThresholdProgress(
  config: BadgeConfig,
  currentTier: BadgeTier,
  valueMap: Map<string, number>
): number {
  if (currentTier === "mythic") return 100

  // Find the next tier's requirements
  const currentIdx = TIERS_DESC.indexOf(currentTier)
  const nextTierIdx = currentTier === "none" ? TIERS_DESC.length - 1 : currentIdx - 1
  if (nextTierIdx < 0) return 100

  const nextTier = TIERS_DESC[nextTierIdx]
  const nextTierConfig = config.tiers.find((t) => t.tier === nextTier)
  if (!nextTierConfig) return 0

  // Progress = minimum ratio across all requirements (bottleneck determines %)
  const ratios = nextTierConfig.requirements.map((req) => {
    const value = valueMap.get(req.templateId) ?? 0
    return Math.min(100, Math.round((value / req.value) * 100))
  })

  return ratios.length > 0 ? Math.min(...ratios) : 0
}

/**
 * Get the evolving tier name for the current tier of a badge.
 * Returns the name from BadgeTierConfig, or falls back to the template title.
 */
function getTierName(config: BadgeConfig, currentTier: BadgeTier): string {
  if (currentTier === "none") {
    // Show the iron tier name as the "locked" label
    const ironTier = config.tiers.find((t) => t.tier === "iron")
    return ironTier?.name ?? GOAL_TEMPLATE_MAP[config.l2Id]?.title ?? config.l2Id
  }
  const tierConfig = config.tiers.find((t) => t.tier === currentTier)
  return tierConfig?.name ?? GOAL_TEMPLATE_MAP[config.l2Id]?.title ?? config.l2Id
}

/**
 * Compute badge status for a single badge using threshold requirements.
 */
function computeThresholdBadge(
  config: BadgeConfig,
  l3Goals: GoalWithProgress[]
): BadgeStatus | null {
  const valueMap = buildCurrentValueMap(l3Goals)

  // Check if user has ANY of the referenced L3 goals
  const hasRelevantGoal = config.tiers.some((t) =>
    t.requirements.some((req) => valueMap.has(req.templateId))
  )
  if (!hasRelevantGoal) return null

  // Find highest tier where ALL requirements are met
  let currentTier: BadgeTier = "none"
  for (const tier of TIERS_DESC) {
    const tierConfig = config.tiers.find((t) => t.tier === tier)
    if (tierConfig && tierRequirementsMet(tierConfig.requirements, valueMap)) {
      currentTier = tier
      break
    }
  }

  const progress = computeThresholdProgress(config, currentTier, valueMap)
  const template = GOAL_TEMPLATE_MAP[config.l2Id]
  const title = template?.title ?? config.l2Id
  const tierName = getTierName(config, currentTier)

  return {
    badgeId: config.l2Id,
    title,
    tierName,
    progress,
    tier: currentTier,
    unlocked: currentTier !== "none",
  }
}

// ============================================================================
// Combined Badge Computation
// ============================================================================

/**
 * Compute badge status for all L2 achievements from a flat list of L3 goals.
 *
 * All badges use threshold-based tiers with evolving names (6 tiers).
 *
 * @param l3Goals - flat list of L3 GoalWithProgress items
 * @returns BadgeStatus[] - one entry per L2 that has at least one active contributing L3
 */
export function computeAllBadges(l3Goals: GoalWithProgress[]): BadgeStatus[] {
  const badges: BadgeStatus[] = []

  for (const config of ALL_BADGE_REQUIREMENTS) {
    const badge = computeThresholdBadge(config, l3Goals)
    if (badge) badges.push(badge)
  }

  return badges
}

/**
 * Compute badge status for a single L2 achievement from a flat list of L3 goals.
 * Returns null if the L2 has no active contributing goals in the input list.
 */
export function computeBadge(
  l2Id: string,
  l3Goals: GoalWithProgress[]
): BadgeStatus | null {
  if (!THRESHOLD_L2_IDS.has(l2Id)) return null

  const config = ALL_BADGE_REQUIREMENTS.find((b) => b.l2Id === l2Id)
  if (!config) return null
  return computeThresholdBadge(config, l3Goals)
}

// ============================================================================
// Tier Upgrade Detection
// ============================================================================

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
