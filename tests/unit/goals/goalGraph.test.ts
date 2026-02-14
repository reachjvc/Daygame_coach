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
    for (const g of l3Goals) {
      expect(g.displayCategory).toBeTruthy()
      expect(["field_work", "results", "dirty_dog"]).toContain(g.displayCategory)
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
  test("L1 goals fan into both L2 achievements", () => {
    const children = getChildren("l1_girlfriend")
    expect(children.length).toBe(2)
    const ids = children.map((c) => c.id)
    expect(ids).toContain("l2_master_daygame")
    expect(ids).toContain("l2_confident")
  })

  test("L2 achievements fan into all L3 goals", () => {
    const children = getChildren("l2_master_daygame")
    const l3Count = GOAL_TEMPLATES.filter((t) => t.level === 3).length
    expect(children.length).toBe(l3Count)
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
  test("L1 goal returns all L3 goals (traverses through L2)", () => {
    const leaves = getLeafGoals("l1_girlfriend")
    const l3Count = GOAL_TEMPLATES.filter((t) => t.level === 3).length
    expect(leaves.length).toBe(l3Count)
    for (const leaf of leaves) {
      expect(leaf.level).toBe(3)
    }
  })

  test("L2 goal returns all L3 goals directly", () => {
    const leaves = getLeafGoals("l2_master_daygame")
    const l3Count = GOAL_TEMPLATES.filter((t) => t.level === 3).length
    expect(leaves.length).toBe(l3Count)
  })

  test("L3 goal returns itself", () => {
    const leaves = getLeafGoals("l3_approach_volume")
    expect(leaves).toHaveLength(1)
    expect(leaves[0].id).toBe("l3_approach_volume")
  })

  test("deduplicates L3 goals (both L2s share the same L3 set)", () => {
    // From L1, traversal goes through 2 L2s, each with same L3 children
    // Should still only have unique L3 goals
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
  test("base weights for each achievement sum to ~1.0", () => {
    for (const achievementId of ["l2_master_daygame", "l2_confident"]) {
      const weights = getAchievementWeights(achievementId)
      const total = weights.reduce((sum, w) => sum + w.weight, 0)
      expect(total).toBeCloseTo(1.0, 2)
    }
  })

  test("both achievements have the same weights in v1", () => {
    const daygame = getAchievementWeights("l2_master_daygame")
    const confident = getAchievementWeights("l2_confident")
    expect(daygame.length).toBe(confident.length)
    for (let i = 0; i < daygame.length; i++) {
      expect(daygame[i].weight).toBe(confident[i].weight)
    }
  })

  test("approach volume has 50% weight", () => {
    const weights = getAchievementWeights("l2_master_daygame")
    const approaches = weights.find((w) => w.goalId === "l3_approach_volume")
    expect(approaches).toBeDefined()
    expect(approaches!.weight).toBe(0.5)
  })

  test("all L3 goal IDs in weights exist in catalog", () => {
    const weights = getAchievementWeights("l2_master_daygame")
    for (const w of weights) {
      expect(GOAL_TEMPLATE_MAP[w.goalId]).toBeDefined()
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

  test("real scenario: user removes dirty dog goals", () => {
    const allWeights = getAchievementWeights("l2_master_daygame")
    const dirtyDogIds = new Set(["l3_kiss_closes", "l3_lays", "l3_rotation_size", "l3_sustained_rotation"])
    const activeIds = new Set(allWeights.map((w) => w.goalId).filter((id) => !dirtyDogIds.has(id)))

    const result = redistributeWeights(allWeights, activeIds)
    const total = result.reduce((s, w) => s + w.weight, 0)
    expect(total).toBeCloseTo(1.0, 2)

    // Approach volume should now be more than 50% (since dirty dog weight redistributed)
    const approaches = result.find((w) => w.goalId === "l3_approach_volume")
    expect(approaches!.weight).toBeGreaterThan(0.50)
  })
})

// ============================================================================
// getTemplatesByCategory
// ============================================================================

describe("getTemplatesByCategory", () => {
  test("returns all three categories", () => {
    const cats = getTemplatesByCategory()
    expect(Object.keys(cats)).toEqual(["field_work", "results", "dirty_dog"])
  })

  test("field_work contains approach-related goals", () => {
    const cats = getTemplatesByCategory()
    const ids = cats.field_work.map((t) => t.id)
    expect(ids).toContain("l3_approach_volume")
    expect(ids).toContain("l3_approach_frequency")
  })

  test("dirty_dog contains lays and rotation", () => {
    const cats = getTemplatesByCategory()
    const ids = cats.dirty_dog.map((t) => t.id)
    expect(ids).toContain("l3_lays")
    expect(ids).toContain("l3_rotation_size")
  })

  test("all L3 goals are in exactly one category", () => {
    const cats = getTemplatesByCategory()
    const allIds = [
      ...cats.field_work.map((t) => t.id),
      ...cats.results.map((t) => t.id),
      ...cats.dirty_dog.map((t) => t.id),
    ]
    const l3Goals = GOAL_TEMPLATES.filter((t) => t.level === 3)
    expect(allIds.length).toBe(l3Goals.length)
    expect(new Set(allIds).size).toBe(allIds.length)
  })
})
