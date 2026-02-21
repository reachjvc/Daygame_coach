import { describe, test, expect } from "vitest"
import { buildPreviewState, applyPreviewState } from "@/src/goals/goalsService"
import { generateGoalTreeInserts } from "@/src/goals/treeGenerationService"
import { getDaygamePathL1 } from "@/src/goals/data/goalGraph"
import type { BatchGoalInsert } from "@/src/goals/treeGenerationService"

// ============================================================================
// Fixtures
// ============================================================================

function createInsert(overrides: Partial<BatchGoalInsert> = {}): BatchGoalInsert {
  return {
    _tempId: "__temp_test",
    _tempParentId: null,
    title: "Test Goal",
    category: "daygame",
    life_area: "daygame",
    target_value: 100,
    tracking_type: "counter",
    goal_type: "milestone",
    period: "weekly",
    goal_level: 3,
    display_category: "field_work",
    ...overrides,
  }
}

// ============================================================================
// buildPreviewState
// ============================================================================

describe("buildPreviewState", () => {
  test("returns enabled=true for L0/L1/L2 goals", () => {
    const inserts: BatchGoalInsert[] = [
      createInsert({ _tempId: "__temp_l0", goal_level: 0, display_category: undefined }),
      createInsert({ _tempId: "__temp_l1", goal_level: 1, display_category: undefined }),
      createInsert({ _tempId: "__temp_l2", goal_level: 2, display_category: undefined }),
    ]
    const state = buildPreviewState(inserts)
    expect(state.get("__temp_l0")!.enabled).toBe(true)
    expect(state.get("__temp_l1")!.enabled).toBe(true)
    expect(state.get("__temp_l2")!.enabled).toBe(true)
  })

  test("returns enabled=true for core-priority L3 goals", () => {
    const inserts: BatchGoalInsert[] = [
      createInsert({ _tempId: "__temp_core", display_category: "field_work", template_id: "l3_approach_volume" }),
    ]
    const state = buildPreviewState(inserts)
    expect(state.get("__temp_core")!.enabled).toBe(true)
  })

  test("returns enabled=false for progressive/niche L3 goals", () => {
    const inserts: BatchGoalInsert[] = [
      createInsert({ _tempId: "__temp_prog", display_category: "field_work", template_id: "l3_consecutive_days" }),
      createInsert({ _tempId: "__temp_niche", display_category: "field_work", template_id: "l3_venues_explored" }),
    ]
    const state = buildPreviewState(inserts)
    expect(state.get("__temp_prog")!.enabled).toBe(false)
    expect(state.get("__temp_niche")!.enabled).toBe(false)
  })

  test("returns enabled=false for dirty_dog L3 goals", () => {
    const inserts: BatchGoalInsert[] = [
      createInsert({ _tempId: "__temp_dd", display_category: "dirty_dog" }),
    ]
    const state = buildPreviewState(inserts)
    expect(state.get("__temp_dd")!.enabled).toBe(false)
  })

  test("sets targetValue from insert target_value", () => {
    const inserts = [createInsert({ _tempId: "__temp_x", target_value: 500 })]
    const state = buildPreviewState(inserts)
    expect(state.get("__temp_x")!.targetValue).toBe(500)
  })

  test("extracts milestoneConfig from insert milestone_config", () => {
    const config = { start: 1, target: 1000, steps: 15, curveTension: 5 }
    const inserts = [createInsert({ _tempId: "__temp_mc", milestone_config: config })]
    const state = buildPreviewState(inserts)
    expect(state.get("__temp_mc")!.milestoneConfig).toEqual(config)
  })

  test("milestoneConfig is undefined when insert has no milestone_config", () => {
    const inserts = [createInsert({ _tempId: "__temp_no_mc", milestone_config: undefined })]
    const state = buildPreviewState(inserts)
    expect(state.get("__temp_no_mc")!.milestoneConfig).toBeUndefined()
  })

  test("works with real generated inserts from L1 template", () => {
    const inserts = generateGoalTreeInserts("l1_girlfriend")
    const state = buildPreviewState(inserts)

    // L1 and L2 should be enabled
    for (const insert of inserts) {
      const level = insert.goal_level ?? 0
      if (level < 3) {
        expect(state.get(insert._tempId)!.enabled).toBe(true)
      }
    }

    // Only core L3s should be enabled
    const l3s = inserts.filter((i) => (i.goal_level ?? 0) === 3)
    const enabledL3s = l3s.filter((i) => state.get(i._tempId)!.enabled)
    const disabledL3s = l3s.filter((i) => !state.get(i._tempId)!.enabled)

    // Should have some enabled (core) and some disabled (progressive/niche/dirty_dog)
    expect(enabledL3s.length).toBeGreaterThan(0)
    expect(enabledL3s.length).toBeLessThanOrEqual(4) // max 4 core per area
    expect(disabledL3s.length).toBeGreaterThan(0)

    // All enabled L3s should be core priority (not dirty_dog)
    for (const l3 of enabledL3s) {
      expect(l3.display_category).not.toBe("dirty_dog")
    }
  })
})

// ============================================================================
// getDaygamePathL1 — opt-in filtering
// ============================================================================

describe("getDaygamePathL1", () => {
  test("excludes requiresOptIn L1 templates from both paths", () => {
    const ftoL1s = getDaygamePathL1("fto")
    const abundanceL1s = getDaygamePathL1("abundance")
    const allL1s = [...ftoL1s, ...abundanceL1s]

    // l1_the_one and l1_family have requiresOptIn=true, should be excluded
    for (const l1 of allL1s) {
      expect(l1.requiresOptIn).toBe(false)
    }
    expect(allL1s.every((l) => l.id !== "l1_the_one")).toBe(true)
    expect(allL1s.every((l) => l.id !== "l1_family")).toBe(true)
  })

  test("still returns non-opt-in L1s", () => {
    const ftoL1s = getDaygamePathL1("fto")
    const abundanceL1s = getDaygamePathL1("abundance")
    // At least one L1 per path should remain
    expect(ftoL1s.length).toBeGreaterThan(0)
    expect(abundanceL1s.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// applyPreviewState
// ============================================================================

describe("applyPreviewState", () => {
  test("removes disabled L3 goals from output", () => {
    const inserts: BatchGoalInsert[] = [
      createInsert({ _tempId: "__temp_a", title: "Enabled" }),
      createInsert({ _tempId: "__temp_b", title: "Disabled" }),
    ]
    const state = new Map([
      ["__temp_a", { enabled: true, targetValue: 100 }],
      ["__temp_b", { enabled: false, targetValue: 100 }],
    ])
    const result = applyPreviewState(inserts, state)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe("Enabled")
  })

  test("keeps L0/L1 regardless of state, filters disabled L2", () => {
    const inserts: BatchGoalInsert[] = [
      createInsert({ _tempId: "__temp_l1", goal_level: 1 }),
      createInsert({ _tempId: "__temp_l2", goal_level: 2 }),
    ]
    const state = new Map([
      ["__temp_l1", { enabled: false, targetValue: 1 }],
      ["__temp_l2", { enabled: false, targetValue: 1 }],
    ])
    const result = applyPreviewState(inserts, state)
    expect(result).toHaveLength(1)
    expect(result[0]._tempId).toBe("__temp_l1")
  })

  test("updates target_value when state has override", () => {
    const inserts = [createInsert({ _tempId: "__temp_x", target_value: 1000 })]
    const state = new Map([["__temp_x", { enabled: true, targetValue: 500 }]])
    const result = applyPreviewState(inserts, state)
    expect(result[0].target_value).toBe(500)
  })

  test("updates milestone_config.target when target changes", () => {
    const inserts = [
      createInsert({
        _tempId: "__temp_mc",
        target_value: 1000,
        milestone_config: { start: 1, target: 1000, steps: 15, curveTension: 5 },
      }),
    ]
    const state = new Map([["__temp_mc", { enabled: true, targetValue: 500 }]])
    const result = applyPreviewState(inserts, state)
    expect(result[0].target_value).toBe(500)
    expect((result[0].milestone_config as Record<string, unknown>).target).toBe(500)
  })

  test("preserves _tempId and _tempParentId on surviving inserts", () => {
    const inserts = [
      createInsert({ _tempId: "__temp_parent", _tempParentId: null, goal_level: 1 }),
      createInsert({ _tempId: "__temp_child", _tempParentId: "__temp_parent" }),
    ]
    const state = new Map([
      ["__temp_parent", { enabled: true, targetValue: 100 }],
      ["__temp_child", { enabled: true, targetValue: 100 }],
    ])
    const result = applyPreviewState(inserts, state)
    expect(result[0]._tempId).toBe("__temp_parent")
    expect(result[1]._tempParentId).toBe("__temp_parent")
  })

  test("returns only structural goals when all L3 disabled", () => {
    const inserts: BatchGoalInsert[] = [
      createInsert({ _tempId: "__temp_l1", goal_level: 1 }),
      createInsert({ _tempId: "__temp_l2", goal_level: 2 }),
      createInsert({ _tempId: "__temp_l3a", goal_level: 3 }),
      createInsert({ _tempId: "__temp_l3b", goal_level: 3 }),
    ]
    const state = new Map([
      ["__temp_l1", { enabled: true, targetValue: 1 }],
      ["__temp_l2", { enabled: true, targetValue: 1 }],
      ["__temp_l3a", { enabled: false, targetValue: 100 }],
      ["__temp_l3b", { enabled: false, targetValue: 100 }],
    ])
    const result = applyPreviewState(inserts, state)
    expect(result).toHaveLength(2)
    expect(result.every((r) => (r.goal_level ?? 0) < 3)).toBe(true)
  })

  test("filters L3 children when parent L2 is disabled", () => {
    const inserts: BatchGoalInsert[] = [
      createInsert({ _tempId: "__temp_l1", goal_level: 1 }),
      createInsert({ _tempId: "__temp_l2a", goal_level: 2, _tempParentId: "__temp_l1" }),
      createInsert({ _tempId: "__temp_l2b", goal_level: 2, _tempParentId: "__temp_l1" }),
      createInsert({ _tempId: "__temp_l3a", goal_level: 3, _tempParentId: "__temp_l2a" }),
      createInsert({ _tempId: "__temp_l3b", goal_level: 3, _tempParentId: "__temp_l2b" }),
    ]
    const state = new Map([
      ["__temp_l1", { enabled: true, targetValue: 1 }],
      ["__temp_l2a", { enabled: false, targetValue: 1 }],
      ["__temp_l2b", { enabled: true, targetValue: 1 }],
      ["__temp_l3a", { enabled: true, targetValue: 100 }],
      ["__temp_l3b", { enabled: true, targetValue: 100 }],
    ])
    const result = applyPreviewState(inserts, state)
    // L1 always kept, L2a removed, L2b kept, L3a removed (parent L2a disabled), L3b kept
    expect(result).toHaveLength(3)
    expect(result.map((r) => r._tempId)).toEqual(["__temp_l1", "__temp_l2b", "__temp_l3b"])
  })

  test("applies edited milestoneConfig from state", () => {
    const inserts = [
      createInsert({
        _tempId: "__temp_mc",
        target_value: 1000,
        milestone_config: { start: 1, target: 1000, steps: 15, curveTension: 5 },
      }),
    ]
    const editedConfig = { start: 1, target: 1000, steps: 8, curveTension: 3 }
    const state = new Map([["__temp_mc", { enabled: true, targetValue: 1000, milestoneConfig: editedConfig }]])
    const result = applyPreviewState(inserts, state)
    const mc = result[0].milestone_config as Record<string, unknown>
    expect(mc.steps).toBe(8)
    expect(mc.curveTension).toBe(3)
    expect(mc.target).toBe(1000)
  })

  test("applies milestoneConfig with updated target when both change", () => {
    const inserts = [
      createInsert({
        _tempId: "__temp_mc2",
        target_value: 1000,
        milestone_config: { start: 1, target: 1000, steps: 15, curveTension: 5 },
      }),
    ]
    const editedConfig = { start: 1, target: 1000, steps: 10, curveTension: 2 }
    const state = new Map([["__temp_mc2", { enabled: true, targetValue: 500, milestoneConfig: editedConfig }]])
    const result = applyPreviewState(inserts, state)
    expect(result[0].target_value).toBe(500)
    const mc = result[0].milestone_config as Record<string, unknown>
    expect(mc.target).toBe(500)
    expect(mc.steps).toBe(10)
    expect(mc.curveTension).toBe(2)
  })

  test("does not mutate original inserts", () => {
    const inserts = [createInsert({ _tempId: "__temp_x", target_value: 1000 })]
    const state = new Map([["__temp_x", { enabled: true, targetValue: 500 }]])
    applyPreviewState(inserts, state)
    expect(inserts[0].target_value).toBe(1000)
  })
})
