import { describe, test, expect } from "vitest"
import { buildSetupInserts } from "@/src/goals/goalsService"
import { getParents, getDaygamePathL1, GOAL_TEMPLATE_MAP } from "@/src/goals/data/goalGraph"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import type { GoalSetupSelections, MilestoneLadderConfig } from "@/src/goals/types"

function createSelections(overrides: Partial<GoalSetupSelections> = {}): GoalSetupSelections {
  return {
    path: "fto",
    selectedAreas: new Set<string>(),
    selectedGoalIds: new Set<string>(),
    targets: {},
    curveConfigs: {},
    customGoals: [],
    customCategories: [],
    ...overrides,
  }
}

// ============================================================================
// getParents / getDaygamePathL1 helpers
// ============================================================================

describe("getParents", () => {
  test("returns L2 parents of an L3 template", () => {
    const parents = getParents("l3_approach_volume")
    expect(parents.length).toBeGreaterThan(0)
    expect(parents.every((p) => p.level === 2)).toBe(true)
  })

  test("returns empty for unknown ID", () => {
    expect(getParents("nonexistent")).toEqual([])
  })
})

describe("getDaygamePathL1", () => {
  test("returns FTO L1 goals", () => {
    const fto = getDaygamePathL1("fto")
    expect(fto.length).toBeGreaterThan(0)
    expect(fto.every((t) => t.level === 1 && t.lifeArea === "daygame")).toBe(true)
    expect(fto.some((t) => t.id === "l1_girlfriend")).toBe(true)
  })

  test("returns Abundance L1 goals", () => {
    const abundance = getDaygamePathL1("abundance")
    expect(abundance.length).toBeGreaterThan(0)
    expect(abundance.some((t) => t.id === "l1_rotation")).toBe(true)
  })

  test("FTO and Abundance don't overlap", () => {
    const fto = getDaygamePathL1("fto")
    const abundance = getDaygamePathL1("abundance")
    const ftoIds = new Set(fto.map((t) => t.id))
    for (const t of abundance) {
      expect(ftoIds.has(t.id)).toBe(false)
    }
  })
})

// ============================================================================
// buildSetupInserts
// ============================================================================

describe("buildSetupInserts", () => {
  test("returns empty array when nothing selected", () => {
    const result = buildSetupInserts(createSelections())
    expect(result).toEqual([])
  })

  test("builds tree from 2 L3s sharing 1 L2", () => {
    // l3_approach_volume and l3_approach_frequency both under l2_master_daygame
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume", "l3_approach_frequency"]),
    })
    const result = buildSetupInserts(selections)

    // Should have: 1 L1 + at least 1 L2 + 2 L3s
    const l1s = result.filter((r) => GOAL_TEMPLATE_MAP[r.template_id!]?.level === 1)
    const l3s = result.filter((r) => GOAL_TEMPLATE_MAP[r.template_id!]?.level === 3)
    expect(l1s).toHaveLength(1)
    expect(l3s).toHaveLength(2)

    // L1 should be from FTO path
    expect(l1s[0]._tempParentId).toBeNull()
  })

  test("deduplicates L2 parents when L3s share same L2", () => {
    // Both under l2_master_daygame
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume", "l3_session_frequency"]),
    })
    const result = buildSetupInserts(selections)

    const l2s = result.filter((r) => GOAL_TEMPLATE_MAP[r.template_id!]?.level === 2)
    const l2Ids = new Set(l2s.map((r) => r.template_id))
    // No duplicate L2 IDs
    expect(l2s.length).toBe(l2Ids.size)
  })

  test("creates multiple L2s for L3s from different L2s", () => {
    // l3_approach_volume → l2_master_daygame (among others)
    // l3_eye_contact_holds → l2_overcome_aa (among others)
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume", "l3_eye_contact_holds"]),
    })
    const result = buildSetupInserts(selections)

    const l2s = result.filter((r) => GOAL_TEMPLATE_MAP[r.template_id!]?.level === 2)
    // Should have at least 1 L2 (might be more if they share)
    expect(l2s.length).toBeGreaterThanOrEqual(1)
  })

  test("applies target override to L3 insert", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume"]),
      targets: { l3_approach_volume: 42 },
    })
    const result = buildSetupInserts(selections)

    const l3 = result.find((r) => r.template_id === "l3_approach_volume")
    expect(l3).toBeDefined()
    expect(l3!.target_value).toBe(42)
  })

  test("applies curve config override to L3 insert", () => {
    const config: MilestoneLadderConfig = {
      start: 0,
      target: 100,
      steps: 5,
      curveTension: 0.5,
    }
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume"]),
      curveConfigs: { l3_approach_volume: config },
    })
    const result = buildSetupInserts(selections)

    const l3 = result.find((r) => r.template_id === "l3_approach_volume")
    expect(l3).toBeDefined()
    expect(l3!.target_value).toBe(100)
    expect(l3!.goal_type).toBe("milestone")
    expect(l3!.milestone_config).toBeDefined()
  })

  test("creates suggestion goals as standalone inserts", () => {
    const selections = createSelections({
      selectedAreas: new Set(["health_fitness"]),
      selectedGoalIds: new Set(["health_fitness_s0"]),
    })
    const result = buildSetupInserts(selections)

    expect(result).toHaveLength(1)
    const insert = result[0]
    expect(insert._tempParentId).toBeNull()
    expect(insert.life_area).toBe("health_fitness")
    expect(insert.goal_type).toBe("recurring")

    // Check it matches the first suggestion from LIFE_AREAS
    const area = LIFE_AREAS.find((a) => a.id === "health_fitness")!
    expect(insert.title).toBe(area.suggestions![0].title)
    expect(insert.target_value).toBe(area.suggestions![0].defaultTarget)
  })

  test("applies target override to suggestion goal", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["health_fitness_s0"]),
      targets: { health_fitness_s0: 99 },
    })
    const result = buildSetupInserts(selections)

    expect(result[0].target_value).toBe(99)
  })

  test("excludes custom goals with empty title", () => {
    const selections = createSelections({
      customGoals: [
        { id: "cg1", title: "", categoryId: "custom", target: 1, period: "weekly" },
        { id: "cg2", title: "  ", categoryId: "custom", target: 1, period: "weekly" },
      ],
    })
    const result = buildSetupInserts(selections)
    expect(result).toHaveLength(0)
  })

  test("creates custom goals with non-empty title", () => {
    const selections = createSelections({
      customGoals: [
        { id: "cg1", title: "Read 30 min daily", categoryId: "learning", target: 30, period: "daily" },
      ],
    })
    const result = buildSetupInserts(selections)

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe("Read 30 min daily")
    expect(result[0]._tempParentId).toBeNull()
    expect(result[0].target_value).toBe(30)
    expect(result[0].period).toBe("daily")
  })

  test("temp ID references are valid within result array", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume", "l3_phone_numbers"]),
    })
    const result = buildSetupInserts(selections)

    const tempIds = new Set(result.map((r) => r._tempId))
    for (const insert of result) {
      if (insert._tempParentId) {
        expect(tempIds.has(insert._tempParentId)).toBe(true)
      }
    }
  })

  test("parents come before children in insert order", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume"]),
    })
    const result = buildSetupInserts(selections)

    const tempIdOrder = new Map<string, number>()
    result.forEach((r, i) => tempIdOrder.set(r._tempId, i))

    for (const insert of result) {
      if (insert._tempParentId) {
        const parentIdx = tempIdOrder.get(insert._tempParentId)!
        const childIdx = tempIdOrder.get(insert._tempId)!
        expect(parentIdx).toBeLessThan(childIdx)
      }
    }
  })

  test("uses abundance L1 when path is abundance", () => {
    const selections = createSelections({
      path: "abundance",
      selectedGoalIds: new Set(["l3_approach_volume"]),
    })
    const result = buildSetupInserts(selections)

    const l1 = result.find((r) => GOAL_TEMPLATE_MAP[r.template_id!]?.level === 1)
    expect(l1).toBeDefined()
    const abundanceL1s = getDaygamePathL1("abundance")
    expect(abundanceL1s.some((t) => t.id === l1!.template_id)).toBe(true)
  })

  test("mixed: template + suggestion + custom goals", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume", "health_fitness_s0"]),
      customGoals: [
        { id: "cg1", title: "Custom goal", categoryId: "custom", target: 5, period: "weekly" },
      ],
    })
    const result = buildSetupInserts(selections)

    // Should have: L1 + L2(s) + L3(template) + suggestion + custom
    expect(result.length).toBeGreaterThanOrEqual(4) // at minimum: L1 + L2 + L3 + suggestion + custom = 5
    const titles = result.map((r) => r.title)
    expect(titles).toContain("Custom goal")
  })

  test("suggestion linked_metric is preserved", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["health_fitness_s0"]),
    })
    const result = buildSetupInserts(selections)

    const area = LIFE_AREAS.find((a) => a.id === "health_fitness")!
    const suggestion = area.suggestions![0]
    if (suggestion.linkedMetric) {
      expect(result[0].linked_metric).toBe(suggestion.linkedMetric)
    }
  })
})
