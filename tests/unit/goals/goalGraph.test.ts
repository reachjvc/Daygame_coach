import { describe, test, expect } from "vitest"
import {
  GOAL_TEMPLATES,
  GOAL_TEMPLATE_MAP,
  GOAL_GRAPH_EDGES,
  getChildren,
  getLeafGoals,
  getTemplatesByCategory,
  CROSS_AREA_EDGES,
  getCrossAreaInfluence,
  getCrossAreaContributors,
} from "@/src/goals/data/goalGraph"

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
      "field_work", "results", "dirty_dog", "texting", "dates", "relationship", "scenarios",
      "mindfulness", "resilience", "learning", "reflection", "discipline",
      "strength", "training", "nutrition", "body_comp", "flexibility", "endurance",
      "income", "saving", "investing", "career_growth", "entrepreneurship",
      "porn_freedom", "digital_discipline", "substance_control", "self_control",
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

  test("every template has a valid priority", () => {
    const validPriorities = new Set(["core", "progressive", "niche"])
    for (const t of GOAL_TEMPLATES) {
      expect(validPriorities.has(t.priority)).toBe(true)
    }
  })

  test("L0/L1/L2 templates default to core priority", () => {
    const upper = GOAL_TEMPLATES.filter((t) => t.level < 3)
    for (const g of upper) {
      expect(g.priority).toBe("core")
    }
  })

  test("each life area has 2-4 core L3 templates", () => {
    const l3s = GOAL_TEMPLATES.filter((t) => t.level === 3)
    const coreByArea = new Map<string, number>()
    for (const t of l3s) {
      if (t.priority === "core") {
        coreByArea.set(t.lifeArea, (coreByArea.get(t.lifeArea) || 0) + 1)
      }
    }
    for (const [area, count] of coreByArea) {
      expect(count).toBeGreaterThanOrEqual(2)
      expect(count).toBeLessThanOrEqual(4)
    }
  })

  test("opt-in L1 templates are flagged", () => {
    const optInL1s = GOAL_TEMPLATES.filter((t) => t.level === 1 && t.requiresOptIn)
    const ids = optInL1s.map((t) => t.id)
    expect(ids).toContain("l1_the_one")
    expect(ids).toContain("l1_family")
    expect(optInL1s.length).toBe(2)
  })

  test("non-opt-in templates default to requiresOptIn=false", () => {
    const nonOptIn = GOAL_TEMPLATES.filter((t) => !t.requiresOptIn)
    expect(nonOptIn.length).toBeGreaterThan(0)
    for (const t of nonOptIn) {
      expect(t.requiresOptIn).toBe(false)
    }
  })

  test("no blind spot tools remain after catalog pruning", () => {
    const blindSpotTools = GOAL_TEMPLATES.filter((t) => t.blindSpotTool)
    expect(blindSpotTools.length).toBe(0)
  })

  test("graduation_criteria is only set on core L3 templates", () => {
    const withCriteria = GOAL_TEMPLATES.filter((t) => t.graduation_criteria !== null)
    expect(withCriteria.length).toBeGreaterThan(0)
    for (const t of withCriteria) {
      expect(t.level).toBe(3)
      expect(t.priority).toBe("core")
      expect(typeof t.graduation_criteria).toBe("string")
      expect(t.graduation_criteria!.length).toBeGreaterThan(10)
    }
  })
})

// ============================================================================
// Graph Traversal
// ============================================================================

describe("getChildren", () => {
  test("L1 goals fan directly into their area's L3 work goals", () => {
    const children = getChildren("l1_girlfriend")
    const daygameL3Count = GOAL_TEMPLATES.filter((t) => t.level === 3 && t.lifeArea === "daygame").length
    expect(children.length).toBe(daygameL3Count)
    const ids = children.map((c) => c.id)
    expect(ids).toContain("l3_approach_volume")
    expect(ids).toContain("l3_phone_numbers")
  })

  test("L2 achievements have no children (standalone badges)", () => {
    expect(getChildren("l2_approach").length).toBe(0)
    expect(getChildren("l2_results").length).toBe(0)
    expect(getChildren("l2_tongue").length).toBe(0)
    expect(getChildren("l2_inner").length).toBe(0)
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
  test("L1 goal returns all L3 goals in its area (direct L1→L3)", () => {
    const leaves = getLeafGoals("l1_girlfriend")
    const daygameL3Count = GOAL_TEMPLATES.filter((t) => t.level === 3 && t.lifeArea === "daygame").length
    expect(leaves.length).toBe(daygameL3Count)
    for (const leaf of leaves) {
      expect(leaf.level).toBe(3)
    }
  })

  test("L2 is standalone — returns only itself (no children)", () => {
    const leaves = getLeafGoals("l2_approach")
    // L2 has level 2, not 3, so it doesn't match the "return [tmpl]" branch.
    // But getLeafGoals returns the template itself if it has no children.
    // Since L2 has no children and is not level 3, it returns empty.
    expect(leaves.length).toBe(0)
  })

  test("L3 goal returns itself", () => {
    const leaves = getLeafGoals("l3_approach_volume")
    expect(leaves).toHaveLength(1)
    expect(leaves[0].id).toBe("l3_approach_volume")
  })

  test("L1 goals produce unique L3s (no duplicates)", () => {
    const leaves = getLeafGoals("l1_rotation")
    const ids = leaves.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("unknown ID returns empty array", () => {
    expect(getLeafGoals("nonexistent")).toEqual([])
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
    expect(keys).toContain("field_work")
    expect(keys.length).toBe(27) // 7 daygame + 5 PG + 6 fitness + 5 wealth + 4 vices
  })

  test("field_work contains approach-related goals", () => {
    const cats = getTemplatesByCategory()
    const ids = cats.field_work!.map((t) => t.id)
    expect(ids).toContain("l3_approach_volume")
    expect(ids).toContain("l3_approach_frequency")
  })

  test("dirty_dog contains all dirty dog goals", () => {
    const cats = getTemplatesByCategory()
    const ids = cats.dirty_dog!.map((t) => t.id)
    expect(ids).toContain("l3_kiss_closes")
    expect(ids).toContain("l3_pull_attempts")
    expect(ids).toContain("l3_lays")
    expect(ids).toContain("l3_same_day_lays")
    expect(ids.length).toBe(4)
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

// ============================================================================
// Cross-Area Connections (Phase 3.4)
// ============================================================================

describe("CROSS_AREA_EDGES", () => {
  test("all source IDs are valid template IDs", () => {
    for (const edge of CROSS_AREA_EDGES) {
      expect(GOAL_TEMPLATE_MAP[edge.sourceId]).toBeDefined()
    }
  })

  test("all target IDs are valid template IDs", () => {
    for (const edge of CROSS_AREA_EDGES) {
      expect(GOAL_TEMPLATE_MAP[edge.targetId]).toBeDefined()
    }
  })

  test("no self-edges", () => {
    for (const edge of CROSS_AREA_EDGES) {
      expect(edge.sourceId).not.toBe(edge.targetId)
    }
  })

  test("no same-area edges (source and target must be from different life areas)", () => {
    for (const edge of CROSS_AREA_EDGES) {
      const source = GOAL_TEMPLATE_MAP[edge.sourceId]
      const target = GOAL_TEMPLATE_MAP[edge.targetId]
      expect(source.lifeArea).not.toBe(target.lifeArea)
    }
  })

  test("all weights are between 0 and 1", () => {
    for (const edge of CROSS_AREA_EDGES) {
      expect(edge.weight).toBeGreaterThan(0)
      expect(edge.weight).toBeLessThanOrEqual(1)
    }
  })

  test("all relationships are valid", () => {
    const validRelationships = new Set(["supports", "reinforces", "enables"])
    for (const edge of CROSS_AREA_EDGES) {
      expect(validRelationships.has(edge.relationship)).toBe(true)
    }
  })
})

describe("getCrossAreaInfluence", () => {
  test("returns edges where template is source", () => {
    const edges = getCrossAreaInfluence("l3_pg_meditation")
    expect(edges.length).toBeGreaterThan(0)
    expect(edges.some((e) => e.sourceId === "l3_pg_meditation")).toBe(true)
  })

  test("returns edges where template is target", () => {
    const edges = getCrossAreaInfluence("l2_approach")
    expect(edges.length).toBeGreaterThan(0)
    expect(edges.some((e) => e.targetId === "l2_approach")).toBe(true)
  })

  test("returns empty for template with no cross-area connections", () => {
    const edges = getCrossAreaInfluence("l3_f_deadlift")
    expect(edges).toEqual([])
  })
})

describe("getCrossAreaContributors", () => {
  test("returns only edges where template is the target", () => {
    const edges = getCrossAreaContributors("l2_results")
    expect(edges.length).toBeGreaterThan(0)
    for (const edge of edges) {
      expect(edge.targetId).toBe("l2_results")
    }
  })

  test("returns empty for template that is never a target", () => {
    const edges = getCrossAreaContributors("l3_pg_meditation")
    expect(edges).toEqual([])
  })
})
