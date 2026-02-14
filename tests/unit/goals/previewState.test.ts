import { describe, test, expect } from "vitest"
import { buildPreviewState, applyPreviewState } from "@/src/goals/goalsService"
import { generateGoalTreeInserts } from "@/src/goals/treeGenerationService"
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

  test("returns enabled=true for field_work and results L3 goals", () => {
    const inserts: BatchGoalInsert[] = [
      createInsert({ _tempId: "__temp_fw", display_category: "field_work" }),
      createInsert({ _tempId: "__temp_res", display_category: "results" }),
    ]
    const state = buildPreviewState(inserts)
    expect(state.get("__temp_fw")!.enabled).toBe(true)
    expect(state.get("__temp_res")!.enabled).toBe(true)
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

    // Dirty dog L3s should be disabled
    const dirtyDogL3s = inserts.filter(
      (i) => (i.goal_level ?? 0) === 3 && i.display_category === "dirty_dog"
    )
    expect(dirtyDogL3s.length).toBeGreaterThan(0)
    for (const dd of dirtyDogL3s) {
      expect(state.get(dd._tempId)!.enabled).toBe(false)
    }
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

  test("keeps all L0/L1/L2 regardless of state", () => {
    const inserts: BatchGoalInsert[] = [
      createInsert({ _tempId: "__temp_l1", goal_level: 1 }),
      createInsert({ _tempId: "__temp_l2", goal_level: 2 }),
    ]
    const state = new Map([
      ["__temp_l1", { enabled: false, targetValue: 1 }],
      ["__temp_l2", { enabled: false, targetValue: 1 }],
    ])
    const result = applyPreviewState(inserts, state)
    expect(result).toHaveLength(2)
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
    const state = buildPreviewState(inserts)
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

  test("does not mutate original inserts", () => {
    const inserts = [createInsert({ _tempId: "__temp_x", target_value: 1000 })]
    const state = new Map([["__temp_x", { enabled: true, targetValue: 500 }]])
    applyPreviewState(inserts, state)
    expect(inserts[0].target_value).toBe(1000)
  })
})
