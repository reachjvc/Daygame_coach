import { describe, it, expect } from "vitest"
import {
  computeAllBadges,
  computeBadge,
  detectTierUpgrades,
  TIER_ORDER,
} from "@/src/goals/badgeEngineService"
import { ALL_BADGE_REQUIREMENTS } from "@/src/goals/data/goalGraph"
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
// computeBadge — threshold-based badges (6-tier system)
// ============================================================================

describe("computeBadge", () => {
  it("returns null when no active goals contribute to the L2", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_phone_numbers", progress_percentage: 80, current_value: 50 }),
    ]
    const badge = computeBadge("l2_approach", goals)
    expect(badge).toBeNull()
  })

  it("returns null for unknown L2 id", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 50, current_value: 100 }),
    ]
    const badge = computeBadge("l2_nonexistent", goals)
    expect(badge).toBeNull()
  })

  it("computes iron tier for l2_approach with 20 approaches", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 2, current_value: 20 }),
    ]
    const badge = computeBadge("l2_approach", goals)
    expect(badge).not.toBeNull()
    expect(badge!.badgeId).toBe("l2_approach")
    expect(badge!.tier).toBe("iron")
    expect(badge!.tierName).toBe("Approach Newbie")
    expect(badge!.unlocked).toBe(true)
  })

  it("computes bronze tier for l2_approach with 75 approaches + 3 venues", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 8, current_value: 75 }),
      mockL3Goal({ id: "2", template_id: "l3_venues_explored", progress_percentage: 15, current_value: 3 }),
    ]
    const badge = computeBadge("l2_approach", goals)
    expect(badge).not.toBeNull()
    expect(badge!.tier).toBe("bronze")
    expect(badge!.tierName).toBe("Approach Warrior")
  })

  it("computes silver tier for l2_approach with 200 approaches + 7 venues", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 20, current_value: 200 }),
      mockL3Goal({ id: "2", template_id: "l3_venues_explored", progress_percentage: 35, current_value: 7 }),
    ]
    const badge = computeBadge("l2_approach", goals)
    expect(badge).not.toBeNull()
    expect(badge!.tier).toBe("silver")
    expect(badge!.tierName).toBe("Approach Veteran")
  })

  it("returns none when below iron threshold", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 1, current_value: 10 }),
    ]
    const badge = computeBadge("l2_approach", goals)
    expect(badge).not.toBeNull()
    expect(badge!.tier).toBe("none")
    expect(badge!.unlocked).toBe(false)
  })

  it("computes mythic tier when all requirements met", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 100, current_value: 3000 }),
      mockL3Goal({ id: "2", template_id: "l3_venues_explored", progress_percentage: 100, current_value: 50 }),
    ]
    const badge = computeBadge("l2_approach", goals)
    expect(badge).not.toBeNull()
    expect(badge!.tier).toBe("mythic")
    expect(badge!.tierName).toBe("Approach Myth")
    expect(badge!.unlocked).toBe(true)
    expect(badge!.progress).toBe(100)
  })

  it("stays at diamond when missing one mythic requirement", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 100, current_value: 3000 }),
      mockL3Goal({ id: "2", template_id: "l3_venues_explored", progress_percentage: 100, current_value: 30 }),
    ]
    const badge = computeBadge("l2_approach", goals)
    expect(badge).not.toBeNull()
    expect(badge!.tier).toBe("diamond")
    expect(badge!.tierName).toBe("Approach Legend")
  })
})

// ============================================================================
// Non-Daygame threshold badges
// ============================================================================

describe("non-daygame threshold badges", () => {
  it("computes l2_pg_toughness tiers correctly", () => {
    // Iron: 10 challenges
    const ironGoals = [
      mockL3Goal({ id: "1", template_id: "l3_pg_challenges_completed", progress_percentage: 0, current_value: 10 }),
    ]
    expect(computeBadge("l2_pg_toughness", ironGoals)!.tier).toBe("iron")
    expect(computeBadge("l2_pg_toughness", ironGoals)!.tierName).toBe("Soft")

    // Bronze: 30 challenges + 7 cold streak
    const bronzeGoals = [
      mockL3Goal({ id: "1", template_id: "l3_pg_challenges_completed", progress_percentage: 0, current_value: 30 }),
      mockL3Goal({ id: "2", template_id: "l3_pg_cold_streak", progress_percentage: 0, current_value: 7 }),
    ]
    expect(computeBadge("l2_pg_toughness", bronzeGoals)!.tier).toBe("bronze")
    expect(computeBadge("l2_pg_toughness", bronzeGoals)!.tierName).toBe("Growing")

    // Mythic: 500 challenges + 100 cold streak
    const mythicGoals = [
      mockL3Goal({ id: "1", template_id: "l3_pg_challenges_completed", progress_percentage: 0, current_value: 500 }),
      mockL3Goal({ id: "2", template_id: "l3_pg_cold_streak", progress_percentage: 0, current_value: 100 }),
    ]
    expect(computeBadge("l2_pg_toughness", mythicGoals)!.tier).toBe("mythic")
    expect(computeBadge("l2_pg_toughness", mythicGoals)!.tierName).toBe("Mythic Toughness")
  })

  it("computes l2_f_strength tiers correctly", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_f_bench_press", progress_percentage: 0, current_value: 140 }),
      mockL3Goal({ id: "2", template_id: "l3_f_squat", progress_percentage: 0, current_value: 200 }),
      mockL3Goal({ id: "3", template_id: "l3_f_deadlift", progress_percentage: 0, current_value: 220 }),
      mockL3Goal({ id: "4", template_id: "l3_f_pullups", progress_percentage: 0, current_value: 30 }),
      mockL3Goal({ id: "5", template_id: "l3_f_total_sessions", progress_percentage: 0, current_value: 1000 }),
    ]
    const badge = computeBadge("l2_f_strength", goals)
    expect(badge!.tier).toBe("mythic")
    expect(badge!.tierName).toBe("Strength Myth")
  })

  it("computes l2_v_porn_free tiers correctly", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_v_porn_free_days", progress_percentage: 0, current_value: 90 }),
      mockL3Goal({ id: "2", template_id: "l3_v_nofap_streak", progress_percentage: 0, current_value: 21 }),
    ]
    const badge = computeBadge("l2_v_porn_free", goals)
    expect(badge!.tier).toBe("silver")
    expect(badge!.tierName).toBe("Staying Free")
  })

  it("computes l2_w_budgeting tiers correctly", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_w_emergency_fund", progress_percentage: 0, current_value: 6 }),
      mockL3Goal({ id: "2", template_id: "l3_w_net_worth", progress_percentage: 0, current_value: 50000 }),
    ]
    const badge = computeBadge("l2_w_budgeting", goals)
    expect(badge!.tier).toBe("silver")
    expect(badge!.tierName).toBe("Budget Master")
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
    // l3_approach_volume contributes to: l2_approach, l2_tongue, l2_inner
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 50, current_value: 100 }),
    ]
    const badges = computeAllBadges(goals)

    const badgeIds = badges.map((b) => b.badgeId)
    // Daygame threshold badges that reference l3_approach_volume
    expect(badgeIds).toContain("l2_approach")
    expect(badgeIds).toContain("l2_tongue")
    expect(badgeIds).toContain("l2_inner")

    // Should NOT have badges that don't reference l3_approach_volume
    expect(badgeIds).not.toContain("l2_text")
    expect(badgeIds).not.toContain("l2_date")
  })

  it("every badge has correct structure", () => {
    const goals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 50, current_value: 100 }),
      mockL3Goal({ id: "2", template_id: "l3_phone_numbers", progress_percentage: 75, current_value: 20 }),
    ]
    const badges = computeAllBadges(goals)

    for (const badge of badges) {
      expect(badge).toHaveProperty("badgeId")
      expect(badge).toHaveProperty("title")
      expect(badge).toHaveProperty("tierName")
      expect(badge).toHaveProperty("progress")
      expect(badge).toHaveProperty("tier")
      expect(badge).toHaveProperty("unlocked")
      expect(typeof badge.badgeId).toBe("string")
      expect(typeof badge.title).toBe("string")
      expect(typeof badge.tierName).toBe("string")
      expect(typeof badge.progress).toBe("number")
      expect(badge.progress).toBeGreaterThanOrEqual(0)
      expect(badge.progress).toBeLessThanOrEqual(100)
      expect(["none", "iron", "bronze", "silver", "gold", "diamond", "mythic"]).toContain(badge.tier)
      expect(typeof badge.unlocked).toBe("boolean")
      expect(badge.unlocked).toBe(badge.tier !== "none")
    }
  })

  it("includes badges from multiple life areas", () => {
    const goals = [
      // Daygame L3 (milestone-based, in badge requirements)
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 50, current_value: 100 }),
      // Personal Growth L3 (milestone-based, in PG badge requirements)
      mockL3Goal({ id: "2", template_id: "l3_pg_challenges_completed", progress_percentage: 50, current_value: 10 }),
      // Fitness L3 (milestone-based, in FIT badge requirements)
      mockL3Goal({ id: "3", template_id: "l3_f_total_sessions", progress_percentage: 50, current_value: 20 }),
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
// ALL_BADGE_REQUIREMENTS integrity
// ============================================================================

describe("ALL_BADGE_REQUIREMENTS", () => {
  it("has 31 total badge configs (13 daygame + 6 PG + 4 FIT + 4 WLT + 4 VIC)", () => {
    expect(ALL_BADGE_REQUIREMENTS.length).toBe(31)
  })

  it("every badge config has 6 tiers", () => {
    for (const config of ALL_BADGE_REQUIREMENTS) {
      expect(config.tiers.length).toBe(6)
      const tierNames = config.tiers.map((t) => t.tier)
      expect(tierNames).toEqual(["iron", "bronze", "silver", "gold", "diamond", "mythic"])
    }
  })

  it("every tier has at least one requirement", () => {
    for (const config of ALL_BADGE_REQUIREMENTS) {
      for (const tier of config.tiers) {
        expect(tier.requirements.length).toBeGreaterThan(0)
      }
    }
  })

  it("every tier has a non-empty name", () => {
    for (const config of ALL_BADGE_REQUIREMENTS) {
      for (const tier of config.tiers) {
        expect(tier.name.length).toBeGreaterThan(0)
      }
    }
  })
})

// ============================================================================
// Tier boundary precision — daygame threshold badges (6 tiers)
// ============================================================================

describe("tier boundaries", () => {
  it("l2_approach tiers match exact threshold requirements", () => {
    // Iron: 20 approaches
    const ironGoals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 2, current_value: 20 }),
    ]
    const iron = computeBadge("l2_approach", ironGoals)
    expect(iron!.tier).toBe("iron")

    // Bronze: 75 approaches + 3 venues
    const bronzeGoals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 8, current_value: 75 }),
      mockL3Goal({ id: "2", template_id: "l3_venues_explored", progress_percentage: 15, current_value: 3 }),
    ]
    const bronze = computeBadge("l2_approach", bronzeGoals)
    expect(bronze!.tier).toBe("bronze")

    // Silver: 200 approaches + 7 venues
    const silverGoals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 20, current_value: 200 }),
      mockL3Goal({ id: "2", template_id: "l3_venues_explored", progress_percentage: 35, current_value: 7 }),
    ]
    const silver = computeBadge("l2_approach", silverGoals)
    expect(silver!.tier).toBe("silver")

    // Gold: 500 approaches + 15 venues
    const goldGoals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 50, current_value: 500 }),
      mockL3Goal({ id: "2", template_id: "l3_venues_explored", progress_percentage: 75, current_value: 15 }),
    ]
    const gold = computeBadge("l2_approach", goldGoals)
    expect(gold!.tier).toBe("gold")

    // Diamond: 1200 approaches + 25 venues
    const diamondGoals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 100, current_value: 1200 }),
      mockL3Goal({ id: "2", template_id: "l3_venues_explored", progress_percentage: 100, current_value: 25 }),
    ]
    const diamond = computeBadge("l2_approach", diamondGoals)
    expect(diamond!.tier).toBe("diamond")

    // Mythic: 3000 approaches + 50 venues
    const mythicGoals = [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 100, current_value: 3000 }),
      mockL3Goal({ id: "2", template_id: "l3_venues_explored", progress_percentage: 100, current_value: 50 }),
    ]
    const mythic = computeBadge("l2_approach", mythicGoals)
    expect(mythic!.tier).toBe("mythic")
  })

  it("evolving names match tier for each badge", () => {
    // Test l2_tongue evolving names
    const goals = (approaches: number, numbers: number, instadates: number) => [
      mockL3Goal({ id: "1", template_id: "l3_approach_volume", progress_percentage: 0, current_value: approaches }),
      mockL3Goal({ id: "2", template_id: "l3_phone_numbers", progress_percentage: 0, current_value: numbers }),
      mockL3Goal({ id: "3", template_id: "l3_instadates", progress_percentage: 0, current_value: instadates }),
    ]

    expect(computeBadge("l2_tongue", goals(30, 3, 0))!.tierName).toBe("Nervous Tongue")
    expect(computeBadge("l2_tongue", goals(100, 10, 2))!.tierName).toBe("Smooth Tongue")
    expect(computeBadge("l2_tongue", goals(300, 25, 8))!.tierName).toBe("Silver Tongue")
    expect(computeBadge("l2_tongue", goals(600, 50, 18))!.tierName).toBe("Golden Tongue")
    expect(computeBadge("l2_tongue", goals(1200, 100, 35))!.tierName).toBe("Diamond Tongue")
    expect(computeBadge("l2_tongue", goals(3000, 200, 70))!.tierName).toBe("Mythic Tongue")
  })
})

// ============================================================================
// Tier Upgrade Detection
// ============================================================================

describe("TIER_ORDER", () => {
  it("none < iron < bronze < silver < gold < diamond < mythic", () => {
    expect(TIER_ORDER.none).toBeLessThan(TIER_ORDER.iron)
    expect(TIER_ORDER.iron).toBeLessThan(TIER_ORDER.bronze)
    expect(TIER_ORDER.bronze).toBeLessThan(TIER_ORDER.silver)
    expect(TIER_ORDER.silver).toBeLessThan(TIER_ORDER.gold)
    expect(TIER_ORDER.gold).toBeLessThan(TIER_ORDER.diamond)
    expect(TIER_ORDER.diamond).toBeLessThan(TIER_ORDER.mythic)
  })
})

describe("detectTierUpgrades", () => {
  function badge(id: string, tier: BadgeTier, progress = 50): BadgeStatus {
    return { badgeId: id, title: `Badge ${id}`, tierName: `Badge ${id}`, progress, tier, unlocked: tier !== "none" }
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

  it("detects iron → mythic upgrade", () => {
    const prev = [badge("a", "iron")]
    const curr = [badge("a", "mythic")]
    const upgrades = detectTierUpgrades(prev, curr)
    expect(upgrades).toHaveLength(1)
    expect(upgrades[0].previousTier).toBe("iron")
    expect(upgrades[0].newTier).toBe("mythic")
  })
})
