import { describe, test, expect } from "vitest"
import {
  GOAL_TEMPLATES,
  GOAL_TEMPLATE_MAP,
  GOAL_GRAPH_EDGES,
  getChildren,
  getTemplatesByCategory,
} from "@/src/goals/data/goalGraph"

// ============================================================================
// Catalog Integrity
// ============================================================================

describe("goal catalog integrity", () => {
  test("all template IDs are unique", () => {
    const ids = GOAL_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
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

// ============================================================================
// getTemplatesByCategory
// ============================================================================

describe("getTemplatesByCategory", () => {
  test("dirty_dog contains all dirty dog goals", () => {
    const cats = getTemplatesByCategory()
    const ids = cats.dirty_dog!.map((t) => t.id)
    expect(ids).toContain("l3_kiss_closes")
    expect(ids).toContain("l3_pull_attempts")
    expect(ids).toContain("l3_lays")
    expect(ids).toContain("l3_same_day_lays")
    expect(ids.length).toBe(4)
  })

  test("all L3 goals are in exactly one category", () => {
    const cats = getTemplatesByCategory()
    const allIds = Object.values(cats).flatMap((templates) => templates!.map((t) => t.id))
    const l3Goals = GOAL_TEMPLATES.filter((t) => t.level === 3)
    expect(allIds.length).toBe(l3Goals.length)
    expect(new Set(allIds).size).toBe(allIds.length)
  })
})
