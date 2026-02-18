import { describe, test, expect } from "vitest"
import {
  GOAL_TEMPLATES,
  GOAL_TEMPLATE_MAP,
  GOAL_GRAPH_EDGES,
  DEFAULT_ACHIEVEMENT_WEIGHTS,
  getChildren,
  getLeafGoals,
  getAchievementWeights,
  redistributeWeights,
  getTemplatesByCategory,
} from "@/src/goals/data/goalGraph"
import type { AchievementWeight } from "@/src/goals/types"

// ============================================================================
// Catalog Integrity
// ============================================================================

describe("goal catalog integrity", () => {
  test("all template IDs are unique", () => {
    const ids = GOAL_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("GOAL_TEMPLATE_MAP has every template", () => {
    for (const t of GOAL_TEMPLATES) {
      expect(GOAL_TEMPLATE_MAP[t.id]).toBe(t)
    }
  })

  test("all edge parent/child IDs reference existing templates", () => {
    for (const edge of GOAL_GRAPH_EDGES) {
      expect(GOAL_TEMPLATE_MAP[edge.parentId]).toBeDefined()
      expect(GOAL_TEMPLATE_MAP[edge.childId]).toBeDefined()
    }
  })

  test("L3 goals have display categories", () => {
    const l3Goals = GOAL_TEMPLATES.filter((t) => t.level === 3)
    const validCategories = [
      "field_work", "results", "dirty_dog", "texting", "dates", "relationship",
      "mindfulness", "resilience", "learning", "reflection", "discipline",
      "social_activity", "friendships", "hosting", "social_skills", "network_expansion",
      "strength", "training", "nutrition", "body_comp",
      "income", "saving", "investing", "career_growth",
    ]
    for (const g of l3Goals) {
      expect(g.displayCategory).toBeTruthy()
      expect(validCategories).toContain(g.displayCategory)
    }
  })

  test("L3 goals have a template type", () => {
    const l3Goals = GOAL_TEMPLATES.filter((t) => t.level === 3)
    for (const g of l3Goals) {
      expect(g.templateType).toBeTruthy()
      expect(["milestone_ladder", "habit_ramp"]).toContain(g.templateType)
    }
  })

  test("milestone_ladder templates have milestone config", () => {
    const ladders = GOAL_TEMPLATES.filter((t) => t.templateType === "milestone_ladder")
    for (const g of ladders) {
      expect(g.defaultMilestoneConfig).toBeTruthy()
      expect(g.defaultMilestoneConfig!.start).toBeLessThan(g.defaultMilestoneConfig!.target)
      expect(g.defaultMilestoneConfig!.steps).toBeGreaterThanOrEqual(2)
    }
  })

  test("habit_ramp templates have ramp steps", () => {
    const ramps = GOAL_TEMPLATES.filter((t) => t.templateType === "habit_ramp")
    for (const g of ramps) {
      expect(g.defaultRampSteps).toBeTruthy()
      expect(g.defaultRampSteps!.length).toBeGreaterThan(0)
    }
  })

  test("L0/L1/L2 goals do not have display categories", () => {
    const upper = GOAL_TEMPLATES.filter((t) => t.level < 3)
    for (const g of upper) {
      expect(g.displayCategory).toBeNull()
    }
  })
})

// ============================================================================
// Graph Traversal
// ============================================================================

describe("getChildren", () => {
  test("L1 goals fan into their area's L2 achievements", () => {
    const children = getChildren("l1_girlfriend")
    const daygameL2Count = GOAL_TEMPLATES.filter((t) => t.level === 2 && t.lifeArea === "daygame").length
    expect(children.length).toBe(daygameL2Count)
    const ids = children.map((c) => c.id)
    expect(ids).toContain("l2_master_daygame")
    expect(ids).toContain("l2_confident")
  })

  test("L2 master_daygame fans into its connected L3 goals", () => {
    const children = getChildren("l2_master_daygame")
    expect(children.length).toBe(17) // 9 field_work + 4 results + 4 dirty_dog
    const ids = children.map((c) => c.id)
    expect(ids).toContain("l3_approach_volume")
    expect(ids).toContain("l3_lays")
  })

  test("L2 overcome_aa fans into 3 exposure-focused L3s", () => {
    const children = getChildren("l2_overcome_aa")
    expect(children.length).toBe(3)
    const ids = children.map((c) => c.id)
    expect(ids).toContain("l3_approach_volume")
    expect(ids).toContain("l3_consecutive_days")
    expect(ids).toContain("l3_solo_sessions")
  })

  test("L2 master_texting fans into texting L3s", () => {
    const children = getChildren("l2_master_texting")
    expect(children.length).toBe(3)
    const ids = children.map((c) => c.id)
    expect(ids).toContain("l3_texting_initiated")
    expect(ids).toContain("l3_response_rate")
    expect(ids).toContain("l3_number_to_date_conversion")
  })

  test("L2 attract_any fans into all daygame L3 goals", () => {
    const children = getChildren("l2_attract_any")
    const daygameL3Count = GOAL_TEMPLATES.filter((t) => t.level === 3 && t.lifeArea === "daygame").length
    expect(children.length).toBe(daygameL3Count)
  })

  test("L3 goals have no children", () => {
    const children = getChildren("l3_approach_volume")
    expect(children.length).toBe(0)
  })

  test("unknown ID returns empty array", () => {
    expect(getChildren("nonexistent")).toEqual([])
  })
})

describe("getLeafGoals", () => {
  test("L1 goal returns all unique L3 goals in its area (traverses through L2)", () => {
    const leaves = getLeafGoals("l1_girlfriend")
    const daygameL3Count = GOAL_TEMPLATES.filter((t) => t.level === 3 && t.lifeArea === "daygame").length
    expect(leaves.length).toBe(daygameL3Count) // attract_any covers all daygame L3s
    for (const leaf of leaves) {
      expect(leaf.level).toBe(3)
    }
  })

  test("L2 master_daygame returns its 17 L3 goals", () => {
    const leaves = getLeafGoals("l2_master_daygame")
    expect(leaves.length).toBe(17)
  })

  test("L3 goal returns itself", () => {
    const leaves = getLeafGoals("l3_approach_volume")
    expect(leaves).toHaveLength(1)
    expect(leaves[0].id).toBe("l3_approach_volume")
  })

  test("deduplicates L3 goals across L2 fan-outs", () => {
    const leaves = getLeafGoals("l1_rotation")
    const ids = leaves.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("unknown ID returns empty array", () => {
    expect(getLeafGoals("nonexistent")).toEqual([])
  })
})

// ============================================================================
// Achievement Weights
// ============================================================================

describe("achievement weights", () => {
  const l2Ids = GOAL_TEMPLATES.filter((t) => t.level === 2).map((t) => t.id)

  test("every L2 has weights that sum to ~1.0", () => {
    for (const l2Id of l2Ids) {
      const weights = getAchievementWeights(l2Id)
      expect(weights.length).toBeGreaterThan(0)
      const total = weights.reduce((sum, w) => sum + w.weight, 0)
      expect(total).toBeCloseTo(1.0, 2)
    }
  })

  test("per-L2 weights differ (not shared in v2)", () => {
    const daygame = getAchievementWeights("l2_master_daygame")
    const aa = getAchievementWeights("l2_overcome_aa")
    expect(daygame.length).not.toBe(aa.length)
  })

  test("approach volume weight varies by L2 context", () => {
    const daygameWeights = getAchievementWeights("l2_master_daygame")
    const aaWeights = getAchievementWeights("l2_overcome_aa")
    const daygameAV = daygameWeights.find((w) => w.goalId === "l3_approach_volume")
    const aaAV = aaWeights.find((w) => w.goalId === "l3_approach_volume")
    expect(daygameAV).toBeDefined()
    expect(aaAV).toBeDefined()
    // AA weights approach volume much more heavily than master daygame
    expect(aaAV!.weight).toBeGreaterThan(daygameAV!.weight)
  })

  test("all L3 goal IDs in weights exist in catalog", () => {
    for (const w of DEFAULT_ACHIEVEMENT_WEIGHTS) {
      expect(GOAL_TEMPLATE_MAP[w.goalId]).toBeDefined()
    }
  })

  test("all L2 IDs in weights exist in catalog", () => {
    for (const w of DEFAULT_ACHIEVEMENT_WEIGHTS) {
      expect(GOAL_TEMPLATE_MAP[w.achievementId]).toBeDefined()
    }
  })
})

// ============================================================================
// Weight Redistribution
// ============================================================================

describe("redistributeWeights", () => {
  const baseWeights: AchievementWeight[] = [
    { goalId: "a", weight: 0.50 },
    { goalId: "b", weight: 0.30 },
    { goalId: "c", weight: 0.20 },
  ]

  test("returns all weights unchanged when all goals are active", () => {
    const active = new Set(["a", "b", "c"])
    const result = redistributeWeights(baseWeights, active)
    expect(result).toHaveLength(3)
    expect(result[0].weight).toBeCloseTo(0.50, 5)
    expect(result[1].weight).toBeCloseTo(0.30, 5)
    expect(result[2].weight).toBeCloseTo(0.20, 5)
  })

  test("redistributes proportionally when one goal is removed", () => {
    // Remove "c" (0.20) → a and b share its weight proportionally
    const active = new Set(["a", "b"])
    const result = redistributeWeights(baseWeights, active)
    expect(result).toHaveLength(2)

    const total = result.reduce((s, w) => s + w.weight, 0)
    expect(total).toBeCloseTo(1.0, 5)

    // a had 0.50 of 0.80 remaining → 0.50/0.80 = 0.625
    expect(result[0].weight).toBeCloseTo(0.625, 3)
    // b had 0.30 of 0.80 remaining → 0.30/0.80 = 0.375
    expect(result[1].weight).toBeCloseTo(0.375, 3)
  })

  test("single remaining goal gets 100%", () => {
    const active = new Set(["b"])
    const result = redistributeWeights(baseWeights, active)
    expect(result).toHaveLength(1)
    expect(result[0].weight).toBeCloseTo(1.0, 5)
  })

  test("returns empty array when no goals are active", () => {
    const active = new Set<string>()
    const result = redistributeWeights(baseWeights, active)
    expect(result).toEqual([])
  })

  test("ignores unknown IDs in active set", () => {
    const active = new Set(["a", "b", "unknown"])
    const result = redistributeWeights(baseWeights, active)
    expect(result).toHaveLength(2)
    const total = result.reduce((s, w) => s + w.weight, 0)
    expect(total).toBeCloseTo(1.0, 5)
  })

  test("real scenario: user removes dirty dog goals from master_daygame", () => {
    const allWeights = getAchievementWeights("l2_master_daygame")
    const dirtyDogIds = new Set(["l3_kiss_closes", "l3_lays", "l3_rotation_size", "l3_sustained_rotation"])
    const activeIds = new Set(allWeights.map((w) => w.goalId).filter((id) => !dirtyDogIds.has(id)))

    const result = redistributeWeights(allWeights, activeIds)
    const total = result.reduce((s, w) => s + w.weight, 0)
    expect(total).toBeCloseTo(1.0, 2)

    // Approach volume should now be more than its base weight (since dirty dog weight redistributed)
    const approaches = result.find((w) => w.goalId === "l3_approach_volume")
    expect(approaches!.weight).toBeGreaterThan(0.15)
  })
})

// ============================================================================
// getTemplatesByCategory
// ============================================================================

describe("getTemplatesByCategory", () => {
  test("returns all categories across all areas", () => {
    const cats = getTemplatesByCategory()
    const keys = Object.keys(cats).sort()
    expect(keys).toContain("field_work")
    expect(keys).toContain("mindfulness")
    expect(keys).toContain("social_activity")
    expect(keys.length).toBe(24) // 6 daygame + 5 PG + 5 social + 4 fitness + 4 wealth
  })

  test("field_work contains approach-related goals", () => {
    const cats = getTemplatesByCategory()
    const ids = cats.field_work!.map((t) => t.id)
    expect(ids).toContain("l3_approach_volume")
    expect(ids).toContain("l3_approach_frequency")
  })

  test("dirty_dog contains lays and rotation", () => {
    const cats = getTemplatesByCategory()
    const ids = cats.dirty_dog!.map((t) => t.id)
    expect(ids).toContain("l3_lays")
    expect(ids).toContain("l3_rotation_size")
  })

  test("texting contains texting-related goals", () => {
    const cats = getTemplatesByCategory()
    const ids = cats.texting!.map((t) => t.id)
    expect(ids).toContain("l3_texting_initiated")
    expect(ids).toContain("l3_response_rate")
  })

  test("personal growth categories exist", () => {
    const cats = getTemplatesByCategory()
    expect(cats.mindfulness!.length).toBeGreaterThan(0)
    expect(cats.resilience!.length).toBeGreaterThan(0)
    expect(cats.learning!.length).toBeGreaterThan(0)
    expect(cats.reflection!.length).toBeGreaterThan(0)
    expect(cats.discipline!.length).toBeGreaterThan(0)
  })

  test("social categories exist", () => {
    const cats = getTemplatesByCategory()
    expect(cats.social_activity!.length).toBeGreaterThan(0)
    expect(cats.friendships!.length).toBeGreaterThan(0)
    expect(cats.hosting!.length).toBeGreaterThan(0)
    expect(cats.social_skills!.length).toBeGreaterThan(0)
    expect(cats.network_expansion!.length).toBeGreaterThan(0)
  })

  test("fitness categories exist", () => {
    const cats = getTemplatesByCategory()
    expect(cats.strength!.length).toBeGreaterThan(0)
    expect(cats.training!.length).toBeGreaterThan(0)
    expect(cats.nutrition!.length).toBeGreaterThan(0)
    expect(cats.body_comp!.length).toBeGreaterThan(0)
  })

  test("wealth categories exist", () => {
    const cats = getTemplatesByCategory()
    expect(cats.income!.length).toBeGreaterThan(0)
    expect(cats.saving!.length).toBeGreaterThan(0)
    expect(cats.investing!.length).toBeGreaterThan(0)
    expect(cats.career_growth!.length).toBeGreaterThan(0)
  })

  test("all L3 goals are in exactly one category", () => {
    const cats = getTemplatesByCategory()
    const allIds = Object.values(cats).flatMap((templates) => templates!.map((t) => t.id))
    const l3Goals = GOAL_TEMPLATES.filter((t) => t.level === 3)
    expect(allIds.length).toBe(l3Goals.length)
    expect(new Set(allIds).size).toBe(allIds.length)
  })
})
