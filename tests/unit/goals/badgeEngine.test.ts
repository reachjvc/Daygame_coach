import { describe, it, expect } from "vitest"
import {
  progressToTier,
  computeAllBadges,
  computeBadge,
  detectTierUpgrades,
  TIER_ORDER,
} from "@/src/goals/badgeEngineService"
import { computeAchievementProgress } from "@/src/goals/milestoneService"
import { getAchievementWeights, DEFAULT_ACHIEVEMENT_WEIGHTS } from "@/src/goals/data/goalGraph"
import type { GoalWithProgress, BadgeTier, BadgeStatus } from "@/src/goals/types"

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a minimal GoalWithProgress for L3 goals in tests. */
function mockL3Goal(
  overrides: Partial<GoalWithProgress> & { id: string; template_id: string; progress_percentage: number }
): GoalWithProgress {
  return {
    user_id: "test-user",
    title: overrides.template_id,
    category: "daygame",
    tracking_type: "counter",
    period: "weekly",
    target_value: 100,
    current_value: 0,
    period_start_date: "2026-01-01",
    custom_end_date: null,
    current_streak: 0,
    best_streak: 0,
    is_active: true,
    is_archived: false,
    linked_metric: null,
    position: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    life_area: "daygame",
    parent_goal_id: null,
    target_date: null,
    description: null,
    goal_type: "milestone",
    goal_nature: "input",
    display_category: "field_work",
    goal_level: 3,
    milestone_config: null,
    ramp_steps: null,
    is_complete: false,
    days_remaining: null,
    motivation_note: null,
    streak_freezes_available: 0,
    streak_freezes_used: 0,
    last_freeze_date: null,
    goal_phase: null,
    ...overrides,
  }
}

// ============================================================================
// progressToTier
// ============================================================================

describe("progressToTier", () => {
  it("returns 'none' for 0%", () => {
    expect(progressToTier(0)).toBe("none")
  })

  it("returns 'none' for 24%", () => {
    expect(progressToTier(24)).toBe("none")
  })

  it("returns 'bronze' at exactly 25%", () => {
    expect(progressToTier(25)).toBe("bronze")
  })

  it("returns 'bronze' for 49%", () => {
    expect(progressToTier(49)).toBe("bronze")
  })

  it("returns 'silver' at exactly 50%", () => {
    expect(progressToTier(50)).toBe("silver")
  })

  it("returns 'silver' for 74%", () => {
    expect(progressToTier(74)).toBe("silver")
  })

  it("returns 'gold' at exactly 75%", () => {
    expect(progressToTier(75)).toBe("gold")
  })

  it("returns 'gold' for 99%", () => {
    expect(progressToTier(99)).toBe("gold")
  })

  it("returns 'diamond' at exactly 100%", () => {
    expect(progressToTier(100)).toBe("diamond")
  })

  it("clamps: returns 'none' for negative values", () => {
    // progressToTier doesn't clamp but 0 is the minimum progress from computeAchievementProgress
    expect(progressToTier(-5)).toBe("none")
  })
})

// ============================================================================
// computeBadge — single L2
// ============================================================================

describe("computeBadge", () => {
  it("returns null when no active goals contribute to the L2", () => {
    // Pass goals that don't match any weights for l2_overcome_aa
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_phone_numbers", progress_percentage: 80 }),
    ]
    // l2_overcome_aa only has l3_approach_volume, l3_consecutive_days, l3_solo_sessions
    const badge = computeBadge("l2_overcome_aa", goals)
    expect(badge).toBeNull()
  })

  it("returns null for unknown L2 id", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 50 }),
    ]
    const badge = computeBadge("l2_nonexistent", goals)
    expect(badge).toBeNull()
  })

  it("computes correct badge for l2_overcome_aa with 3 of 7 goals at 100%", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 100 }),
      mockL3Goal({ id: "2", template_id: "l3_consecutive_days", progress_percentage: 100 }),
      mockL3Goal({ id: "3", template_id: "l3_solo_sessions", progress_percentage: 100 }),
    ]
    const badge = computeBadge("l2_overcome_aa", goals)
    expect(badge).not.toBeNull()
    expect(badge!.badgeId).toBe("l2_overcome_aa")
    expect(badge!.title).toBe("Overcome Approach Anxiety Permanently")
    // Only 3 of 7 weights active — no renormalization, so progress < 100
    // approach_volume has linkedMetric so self-reported gating doesn't apply
    expect(badge!.progress).toBeLessThan(100)
    expect(badge!.progress).toBeGreaterThan(50)
    expect(badge!.unlocked).toBe(true)
  })

  it("computes correct badge for l2_overcome_aa with all goals at 0%", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 0 }),
      mockL3Goal({ id: "2", template_id: "l3_consecutive_days", progress_percentage: 0 }),
      mockL3Goal({ id: "3", template_id: "l3_solo_sessions", progress_percentage: 0 }),
    ]
    const badge = computeBadge("l2_overcome_aa", goals)
    expect(badge).not.toBeNull()
    expect(badge!.progress).toBe(0)
    expect(badge!.tier).toBe("none")
    expect(badge!.unlocked).toBe(false)
  })

  it("computes correct progress with partial completion (no renormalization)", () => {
    // Provide ALL 7 l2_overcome_aa goals at 50% so weights sum to 1
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 50 }),
      mockL3Goal({ id: "2", template_id: "l3_consecutive_days", progress_percentage: 50 }),
      mockL3Goal({ id: "3", template_id: "l3_solo_sessions", progress_percentage: 50 }),
      mockL3Goal({ id: "4", template_id: "l3_eye_contact_holds", progress_percentage: 50 }),
      mockL3Goal({ id: "5", template_id: "l3_aa_comfort_rating", progress_percentage: 50 }),
      mockL3Goal({ id: "6", template_id: "l3_positive_references", progress_percentage: 50 }),
      mockL3Goal({ id: "7", template_id: "l3_warmup_routine", progress_percentage: 50 }),
    ]
    const badge = computeBadge("l2_overcome_aa", goals)
    expect(badge).not.toBeNull()
    // All weights sum to 1, each goal at 50% → progress = 50
    expect(badge!.progress).toBe(50)
    expect(badge!.tier).toBe("silver")
    expect(badge!.unlocked).toBe(true)
  })

  it("fewer active goals = lower max progress (no renormalization)", () => {
    // l2_overcome_aa has 7 L3s — provide only 2, weights keep original values
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 100 }),
      mockL3Goal({ id: "2", template_id: "l3_consecutive_days", progress_percentage: 0 }),
    ]
    const badge = computeBadge("l2_overcome_aa", goals)
    expect(badge).not.toBeNull()
    // Only original weights for these 2 goals used — no redistribution
    // Progress reflects only what these 2 weights contribute
    expect(badge!.progress).toBeGreaterThan(20)
    expect(badge!.progress).toBeLessThan(50)
  })
})

// ============================================================================
// Cross-validation: badge engine produces same % as computeAchievementProgress
// ============================================================================

describe("cross-validation with computeAchievementProgress", () => {
  it("badge progress matches milestoneService for l2_overcome_aa", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 72 }),
      mockL3Goal({ id: "2", template_id: "l3_consecutive_days", progress_percentage: 38 }),
      mockL3Goal({ id: "3", template_id: "l3_solo_sessions", progress_percentage: 91 }),
    ]

    // Compute via badge engine
    const badge = computeBadge("l2_overcome_aa", goals)

    // Compute via milestoneService directly (same approach as goalHierarchyService)
    const activeTemplateIds = new Set(goals.map((g) => g.template_id!))
    const weights = getAchievementWeights("l2_overcome_aa", activeTemplateIds)
    const progressMap = new Map<string, number>()
    for (const g of goals) {
      progressMap.set(g.template_id!, g.progress_percentage)
    }
    const direct = computeAchievementProgress(weights, progressMap)

    expect(badge).not.toBeNull()
    expect(badge!.progress).toBe(direct.progressPercent)
  })

  it("badge progress matches milestoneService for l2_master_texting with subset of goals", () => {
    // l2_master_texting: texting_initiated=0.30, response_rate=0.30, number_to_date_conversion=0.40
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_texting_initiated", progress_percentage: 60 }),
      mockL3Goal({ id: "2", template_id: "l3_number_to_date_conversion", progress_percentage: 25 }),
      // l3_response_rate not present — weight redistributes
    ]

    const badge = computeBadge("l2_master_texting", goals)

    const activeTemplateIds = new Set(goals.map((g) => g.template_id!))
    const weights = getAchievementWeights("l2_master_texting", activeTemplateIds)
    const progressMap = new Map<string, number>()
    for (const g of goals) {
      progressMap.set(g.template_id!, g.progress_percentage)
    }
    const direct = computeAchievementProgress(weights, progressMap)

    expect(badge).not.toBeNull()
    expect(badge!.progress).toBe(direct.progressPercent)
  })

  it("badge progress matches milestoneService for l2_master_daygame (large weight set)", () => {
    // Provide a mix of progress values for several of l2_master_daygame's 17 L3s
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 80 }),
      mockL3Goal({ id: "2", template_id: "l3_phone_numbers", progress_percentage: 45 }),
      mockL3Goal({ id: "3", template_id: "l3_instadates", progress_percentage: 30 }),
      mockL3Goal({ id: "4", template_id: "l3_dates", progress_percentage: 20 }),
      mockL3Goal({ id: "5", template_id: "l3_lays", progress_percentage: 10 }),
      mockL3Goal({ id: "6", template_id: "l3_approach_frequency", progress_percentage: 90 }),
    ]

    const badge = computeBadge("l2_master_daygame", goals)

    const activeTemplateIds = new Set(goals.map((g) => g.template_id!))
    const weights = getAchievementWeights("l2_master_daygame", activeTemplateIds)
    const progressMap = new Map<string, number>()
    for (const g of goals) {
      progressMap.set(g.template_id!, g.progress_percentage)
    }
    const direct = computeAchievementProgress(weights, progressMap)

    expect(badge).not.toBeNull()
    expect(badge!.progress).toBe(direct.progressPercent)
  })
})

// ============================================================================
// computeAllBadges
// ============================================================================

describe("computeAllBadges", () => {
  it("returns empty array when no goals are provided", () => {
    const badges = computeAllBadges([])
    expect(badges).toEqual([])
  })

  it("returns empty array when goals have no template_id", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: null as unknown as string, progress_percentage: 50 }),
    ]
    const badges = computeAllBadges(goals)
    expect(badges).toEqual([])
  })

  it("returns badges only for L2s with active contributing goals", () => {
    // l3_approach_volume contributes to: l2_master_daygame, l2_confident, l2_overcome_aa,
    // l2_master_cold_approach, l2_attract_any
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 50 }),
    ]
    const badges = computeAllBadges(goals)

    // Should have badges for each L2 that includes l3_approach_volume
    const badgeIds = badges.map((b) => b.badgeId)
    expect(badgeIds).toContain("l2_master_daygame")
    expect(badgeIds).toContain("l2_confident")
    expect(badgeIds).toContain("l2_overcome_aa")
    expect(badgeIds).toContain("l2_master_cold_approach")
    expect(badgeIds).toContain("l2_attract_any")

    // Should NOT have badges for L2s that don't include l3_approach_volume
    expect(badgeIds).not.toContain("l2_master_texting")
    expect(badgeIds).not.toContain("l2_master_dating")
    expect(badgeIds).not.toContain("l2_dating_freedom")
  })

  it("every badge has correct structure", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 50 }),
      mockL3Goal({ id: "2", template_id: "l3_phone_numbers", progress_percentage: 75 }),
    ]
    const badges = computeAllBadges(goals)

    for (const badge of badges) {
      expect(badge).toHaveProperty("badgeId")
      expect(badge).toHaveProperty("title")
      expect(badge).toHaveProperty("progress")
      expect(badge).toHaveProperty("tier")
      expect(badge).toHaveProperty("unlocked")
      expect(typeof badge.badgeId).toBe("string")
      expect(typeof badge.title).toBe("string")
      expect(typeof badge.progress).toBe("number")
      expect(badge.progress).toBeGreaterThanOrEqual(0)
      expect(badge.progress).toBeLessThanOrEqual(100)
      expect(["none", "bronze", "silver", "gold", "diamond"]).toContain(badge.tier)
      expect(typeof badge.unlocked).toBe("boolean")
      expect(badge.unlocked).toBe(badge.tier !== "none")
    }
  })

  it("all badges at 100% when all L3 goals are 100%", () => {
    // Create goals for ALL L3 templates referenced in weights
    const allL3Ids = new Set(DEFAULT_ACHIEVEMENT_WEIGHTS.map((w) => w.goalId))
    const goals = [...allL3Ids].map((templateId, i) =>
      mockL3Goal({ id: String(i), template_id: templateId, progress_percentage: 100 })
    )
    const badges = computeAllBadges(goals)

    // Every badge should be diamond
    for (const badge of badges) {
      expect(badge.progress).toBe(100)
      expect(badge.tier).toBe("diamond")
      expect(badge.unlocked).toBe(true)
    }
  })

  it("all badges at 0% when all L3 goals are 0%", () => {
    const allL3Ids = new Set(DEFAULT_ACHIEVEMENT_WEIGHTS.map((w) => w.goalId))
    const goals = [...allL3Ids].map((templateId, i) =>
      mockL3Goal({ id: String(i), template_id: templateId, progress_percentage: 0 })
    )
    const badges = computeAllBadges(goals)

    for (const badge of badges) {
      expect(badge.progress).toBe(0)
      expect(badge.tier).toBe("none")
      expect(badge.unlocked).toBe(false)
    }
  })

  it("includes badges from multiple life areas", () => {
    const goals = [
      // Daygame L3
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 50 }),
      // Personal Growth L3
      mockL3Goal({ id: "2", template_id: "l3_pg_meditation", progress_percentage: 50 }),
      // Fitness L3
      mockL3Goal({ id: "3", template_id: "l3_f_bench_press", progress_percentage: 50 }),
    ]
    const badges = computeAllBadges(goals)
    const badgeIds = badges.map((b) => b.badgeId)

    // Should span multiple life areas
    expect(badgeIds.some((id) => id.startsWith("l2_") && !id.includes("pg_") && !id.includes("f_"))).toBe(true)
    expect(badgeIds.some((id) => id.includes("pg_"))).toBe(true)
    expect(badgeIds.some((id) => id.includes("f_"))).toBe(true)
  })
})

// ============================================================================
// Tier boundary precision
// ============================================================================

describe("tier boundaries", () => {
  it("badges correctly reflect tier at exact boundaries (all 7 goals provided)", () => {
    // Provide ALL 7 l2_overcome_aa L3s so weights sum to 1 and progress maps directly
    const makeAll7 = (pct: number) => [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: pct }),
      mockL3Goal({ id: "2", template_id: "l3_consecutive_days", progress_percentage: pct }),
      mockL3Goal({ id: "3", template_id: "l3_solo_sessions", progress_percentage: pct }),
      mockL3Goal({ id: "4", template_id: "l3_eye_contact_holds", progress_percentage: pct }),
      mockL3Goal({ id: "5", template_id: "l3_aa_comfort_rating", progress_percentage: pct }),
      mockL3Goal({ id: "6", template_id: "l3_positive_references", progress_percentage: pct }),
      mockL3Goal({ id: "7", template_id: "l3_warmup_routine", progress_percentage: pct }),
    ]

    const badge25 = computeBadge("l2_overcome_aa", makeAll7(25))
    expect(badge25!.progress).toBe(25)
    expect(badge25!.tier).toBe("bronze")

    const badge50 = computeBadge("l2_overcome_aa", makeAll7(50))
    expect(badge50!.progress).toBe(50)
    expect(badge50!.tier).toBe("silver")

    const badge75 = computeBadge("l2_overcome_aa", makeAll7(75))
    expect(badge75!.progress).toBe(75)
    expect(badge75!.tier).toBe("gold")

    const badge100 = computeBadge("l2_overcome_aa", makeAll7(100))
    expect(badge100!.progress).toBe(100)
    expect(badge100!.tier).toBe("diamond")
  })
})

// ============================================================================
// Self-Reported Gating
// ============================================================================

describe("self-reported gating", () => {
  it("caps tier at bronze when all goals are self-reported", () => {
    // Use goals with templates that have NO linkedMetric
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_consecutive_days", progress_percentage: 100 }),
      mockL3Goal({ id: "2", template_id: "l3_solo_sessions", progress_percentage: 100 }),
    ]
    const badge = computeBadge("l2_overcome_aa", goals)
    expect(badge).not.toBeNull()
    // Even with high progress, tier capped at bronze
    expect(badge!.tier).toBe("bronze")
  })

  it("allows higher tiers when at least one goal has linked metric", () => {
    // l3_approach_volume has linkedMetric: "approaches_cumulative"
    // Use correct 7 L3 IDs for l2_overcome_aa
    const allGoals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 100 }),
      mockL3Goal({ id: "2", template_id: "l3_consecutive_days", progress_percentage: 100 }),
      mockL3Goal({ id: "3", template_id: "l3_solo_sessions", progress_percentage: 100 }),
      mockL3Goal({ id: "4", template_id: "l3_eye_contact_holds", progress_percentage: 100 }),
      mockL3Goal({ id: "5", template_id: "l3_aa_comfort_rating", progress_percentage: 100 }),
      mockL3Goal({ id: "6", template_id: "l3_positive_references", progress_percentage: 100 }),
      mockL3Goal({ id: "7", template_id: "l3_warmup_routine", progress_percentage: 100 }),
    ]
    const badge = computeBadge("l2_overcome_aa", allGoals)
    expect(badge).not.toBeNull()
    // approach_volume has linked metric, so gating doesn't apply
    expect(badge!.tier).toBe("diamond")
  })
})

// ============================================================================
// Phase-Aware Progress
// ============================================================================

describe("phase-aware progress", () => {
  it("treats consolidated goals as 100% progress", () => {
    const goals = [
      mockL3Goal({
        id: "1", template_id: "l3_approach_volume", progress_percentage: 50,
        goal_phase: "consolidation",
      } as any),
      mockL3Goal({ id: "2", template_id: "l3_consecutive_days", progress_percentage: 50 }),
      mockL3Goal({ id: "3", template_id: "l3_solo_sessions", progress_percentage: 50 }),
      mockL3Goal({ id: "4", template_id: "l3_eye_contact_holds", progress_percentage: 50 }),
      mockL3Goal({ id: "5", template_id: "l3_aa_comfort_rating", progress_percentage: 50 }),
      mockL3Goal({ id: "6", template_id: "l3_positive_references", progress_percentage: 50 }),
      mockL3Goal({ id: "7", template_id: "l3_warmup_routine", progress_percentage: 50 }),
    ]
    const badgeWithPhase = computeBadge("l2_overcome_aa", goals)

    // Without phase, approach_volume contributes 50% of its weight
    // With consolidation phase, approach_volume contributes 100% of its weight
    const goalsWithoutPhase = goals.map(g => ({ ...g, goal_phase: null }))
    const badgeWithoutPhase = computeBadge("l2_overcome_aa", goalsWithoutPhase)

    expect(badgeWithPhase!.progress).toBeGreaterThan(badgeWithoutPhase!.progress)
  })

  it("treats graduated goals as 100% progress", () => {
    const goals = [
      mockL3Goal({
        id: "1", template_id: "l3_approach_volume", progress_percentage: 30,
        goal_phase: "graduated",
      } as any),
      mockL3Goal({ id: "2", template_id: "l3_consecutive_days", progress_percentage: 30 }),
      mockL3Goal({ id: "3", template_id: "l3_solo_sessions", progress_percentage: 30 }),
      mockL3Goal({ id: "4", template_id: "l3_eye_contact_holds", progress_percentage: 30 }),
      mockL3Goal({ id: "5", template_id: "l3_aa_comfort_rating", progress_percentage: 30 }),
      mockL3Goal({ id: "6", template_id: "l3_positive_references", progress_percentage: 30 }),
      mockL3Goal({ id: "7", template_id: "l3_warmup_routine", progress_percentage: 30 }),
    ]
    const badge = computeBadge("l2_overcome_aa", goals)

    // Graduated goal contributes 100% instead of 30%, so progress > 30
    expect(badge!.progress).toBeGreaterThan(30)
  })
})

// ============================================================================
// Tier Upgrade Detection (Phase 6.8)
// ============================================================================

describe("TIER_ORDER", () => {
  it("none < bronze < silver < gold < diamond", () => {
    expect(TIER_ORDER.none).toBeLessThan(TIER_ORDER.bronze)
    expect(TIER_ORDER.bronze).toBeLessThan(TIER_ORDER.silver)
    expect(TIER_ORDER.silver).toBeLessThan(TIER_ORDER.gold)
    expect(TIER_ORDER.gold).toBeLessThan(TIER_ORDER.diamond)
  })
})

describe("detectTierUpgrades", () => {
  function badge(id: string, tier: BadgeTier, progress = 50): BadgeStatus {
    return { badgeId: id, title: `Badge ${id}`, progress, tier, unlocked: tier !== "none" }
  }

  it("returns empty array when no tier changes", () => {
    const prev = [badge("a", "bronze"), badge("b", "silver")]
    const curr = [badge("a", "bronze"), badge("b", "silver")]
    expect(detectTierUpgrades(prev, curr)).toEqual([])
  })

  it("detects single upgrade", () => {
    const prev = [badge("a", "bronze")]
    const curr = [badge("a", "silver")]
    const upgrades = detectTierUpgrades(prev, curr)
    expect(upgrades).toHaveLength(1)
    expect(upgrades[0]).toEqual({
      badgeId: "a",
      badgeTitle: "Badge a",
      previousTier: "bronze",
      newTier: "silver",
    })
  })

  it("detects skip-tier upgrade (bronze → gold)", () => {
    const prev = [badge("a", "bronze")]
    const curr = [badge("a", "gold")]
    const upgrades = detectTierUpgrades(prev, curr)
    expect(upgrades).toHaveLength(1)
    expect(upgrades[0].previousTier).toBe("bronze")
    expect(upgrades[0].newTier).toBe("gold")
  })

  it("does not report downgrades", () => {
    const prev = [badge("a", "gold")]
    const curr = [badge("a", "silver")]
    expect(detectTierUpgrades(prev, curr)).toEqual([])
  })

  it("handles new badge not in previous list (none → tier)", () => {
    const prev: BadgeStatus[] = []
    const curr = [badge("a", "bronze")]
    const upgrades = detectTierUpgrades(prev, curr)
    expect(upgrades).toHaveLength(1)
    expect(upgrades[0].previousTier).toBe("none")
    expect(upgrades[0].newTier).toBe("bronze")
  })

  it("detects multiple upgrades simultaneously", () => {
    const prev = [badge("a", "bronze"), badge("b", "silver"), badge("c", "gold")]
    const curr = [badge("a", "silver"), badge("b", "gold"), badge("c", "gold")]
    const upgrades = detectTierUpgrades(prev, curr)
    expect(upgrades).toHaveLength(2) // a and b upgraded, c unchanged
    expect(upgrades.map((u) => u.badgeId)).toContain("a")
    expect(upgrades.map((u) => u.badgeId)).toContain("b")
  })

  it("does not report none → none as upgrade", () => {
    const prev = [badge("a", "none")]
    const curr = [badge("a", "none")]
    expect(detectTierUpgrades(prev, curr)).toEqual([])
  })
})
