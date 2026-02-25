import { describe, test, expect } from "vitest"
import { buildSetupInserts } from "@/src/goals/goalsService"
import { getParents, getDaygamePathL1, getL2AchievementsForL3, GOAL_TEMPLATE_MAP } from "@/src/goals/data/goalGraph"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import type { GoalSetupSelections, MilestoneLadderConfig } from "@/src/goals/types"

function createSelections(overrides: Partial<GoalSetupSelections> = {}): GoalSetupSelections {
  return {
    path: "fto",
    selectedAreas: new Set<string>(),
    selectedGoalIds: new Set<string>(),
    targets: {},
    curveConfigs: {},
    rampConfigs: {},
    customGoals: [],
    customCategories: [],
    targetDates: {},
    goalDates: {},
    ...overrides,
  }
}

// ============================================================================
// getParents / getDaygamePathL1 helpers
// ============================================================================

describe("getParents", () => {
  test("returns L1 parents of an L3 template (L1→L3 direct)", () => {
    const parents = getParents("l3_approach_volume")
    expect(parents.length).toBeGreaterThan(0)
    expect(parents.every((p) => p.level === 1)).toBe(true)
  })

  test("returns empty for unknown ID", () => {
    expect(getParents("nonexistent")).toEqual([])
  })
})

describe("getL2AchievementsForL3", () => {
  test("returns L2 achievements that reference an L3 in their connections or weights", () => {
    const l2s = getL2AchievementsForL3("l3_approach_volume")
    expect(l2s.length).toBeGreaterThan(0)
    expect(l2s.every((t) => t.level === 2)).toBe(true)
    // l3_approach_volume is referenced by daygame threshold badges via L2_L3_CONNECTIONS
    expect(l2s.some((t) => t.id === "l2_approach")).toBe(true)
  })

  test("returns empty for unknown ID", () => {
    expect(getL2AchievementsForL3("nonexistent")).toEqual([])
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

  test("builds tree from 2 L3s: L1 + standalone L2 badges + L3s parented to L1", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume", "l3_approach_frequency"]),
    })
    const result = buildSetupInserts(selections)

    const l1s = result.filter((r) => GOAL_TEMPLATE_MAP[r.template_id!]?.level === 1)
    const l3s = result.filter((r) => GOAL_TEMPLATE_MAP[r.template_id!]?.level === 3)
    expect(l1s).toHaveLength(1)
    expect(l3s).toHaveLength(2)

    // L1 should be from FTO path
    expect(l1s[0]._tempParentId).toBeNull()

    // L3s parent directly to L1
    for (const l3 of l3s) {
      expect(l3._tempParentId).toMatch(/^__temp_l1_/)
    }
  })

  test("emits standalone L2 badges (no parent) for referenced achievements", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume", "l3_session_frequency"]),
    })
    const result = buildSetupInserts(selections)

    const l2s = result.filter((r) => GOAL_TEMPLATE_MAP[r.template_id!]?.level === 2)
    // L2s exist as standalone badges
    expect(l2s.length).toBeGreaterThan(0)
    // All L2s have no parent (standalone)
    for (const l2 of l2s) {
      expect(l2._tempParentId).toBeNull()
    }
    // No duplicate L2 IDs
    const l2Ids = new Set(l2s.map((r) => r.template_id))
    expect(l2s.length).toBe(l2Ids.size)
  })

  test("emits L2 badges from different areas when L3s reference multiple L2s", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume", "l3_phone_numbers"]),
    })
    const result = buildSetupInserts(selections)

    const l2s = result.filter((r) => GOAL_TEMPLATE_MAP[r.template_id!]?.level === 2)
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

    // Should have: L1 + L2 badges + L3(template) + suggestion + custom
    expect(result.length).toBeGreaterThanOrEqual(4)
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

  // ── Date cascade tests ──────────────────────────────────────────────

  test("goalDates applied to L3 inserts", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume"]),
      goalDates: { l3_approach_volume: "2026-12-31" },
    })
    const result = buildSetupInserts(selections)

    const l3 = result.find((r) => r.template_id === "l3_approach_volume")
    expect(l3).toBeDefined()
    expect(l3!.target_date).toBe("2026-12-31")
  })

  test("area date cascades to L3 when no goalDate set", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume"]),
      targetDates: { daygame: "2027-06-01" },
    })
    const result = buildSetupInserts(selections)

    const l3 = result.find((r) => r.template_id === "l3_approach_volume")
    expect(l3).toBeDefined()
    expect(l3!.target_date).toBe("2027-06-01")
  })

  test("goalDate overrides area date for specific L3 goal", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume", "l3_phone_numbers"]),
      targetDates: { daygame: "2027-06-01" },
      goalDates: { l3_approach_volume: "2026-12-31" },
    })
    const result = buildSetupInserts(selections)

    const volume = result.find((r) => r.template_id === "l3_approach_volume")
    const phones = result.find((r) => r.template_id === "l3_phone_numbers")
    expect(volume!.target_date).toBe("2026-12-31")
    expect(phones!.target_date).toBe("2027-06-01")
  })

  test("goalDates applied to suggestion goals", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["health_fitness_s0"]),
      goalDates: { health_fitness_s0: "2026-09-15" },
    })
    const result = buildSetupInserts(selections)

    expect(result[0].target_date).toBe("2026-09-15")
  })

  test("area date cascades to suggestion goals", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["health_fitness_s0"]),
      targetDates: { health_fitness: "2027-01-01" },
    })
    const result = buildSetupInserts(selections)

    expect(result[0].target_date).toBe("2027-01-01")
  })

  test("goalDates applied to custom goals", () => {
    const selections = createSelections({
      customGoals: [
        { id: "cg1", title: "Read daily", categoryId: "learning", target: 30, period: "daily" },
      ],
      goalDates: { cg1: "2026-08-01" },
    })
    const result = buildSetupInserts(selections)

    expect(result[0].target_date).toBe("2026-08-01")
  })

  test("no target_date set when neither goalDate nor area date exists", () => {
    const selections = createSelections({
      selectedGoalIds: new Set(["l3_approach_volume"]),
    })
    const result = buildSetupInserts(selections)

    const l3 = result.find((r) => r.template_id === "l3_approach_volume")
    expect(l3!.target_date).toBeUndefined()
  })
})
