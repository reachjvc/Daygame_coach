import { describe, it, expect } from "vitest"
import {
  groupGoalsByHierarchy,
  getGoalAccentColor,
} from "@/src/goals/goalHierarchyService"
import type { GoalWithProgress } from "@/src/goals/types"

/** Helper to create a minimal GoalWithProgress for testing */
function mockGoal(overrides: Partial<GoalWithProgress> & { id: string }): GoalWithProgress {
  return {
    user_id: "test",
    title: overrides.id,
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
    goal_nature: null,
    display_category: null,
    goal_level: null,
    template_id: null,
    progress_percentage: 0,
    is_complete: false,
    days_remaining: null,
    ...overrides,
  }
}

describe("groupGoalsByHierarchy", () => {
  it("groups L1 → L2 → L3 into a section", () => {
    const goals = [
      mockGoal({ id: "1", goal_level: 1, template_id: "l1_girlfriend" }),
      mockGoal({ id: "2", goal_level: 2, parent_goal_id: "1", template_id: "l2_master_daygame" }),
      mockGoal({ id: "3", goal_level: 3, parent_goal_id: "2", template_id: "l3_approach_volume", display_category: "field_work", goal_nature: "input" }),
      mockGoal({ id: "4", goal_level: 3, parent_goal_id: "2", template_id: "l3_phone_numbers", display_category: "results", goal_nature: "outcome" }),
    ]

    const { sections, customGoals } = groupGoalsByHierarchy(goals)

    expect(sections.length).toBe(1)
    expect(sections[0].l1Goal.id).toBe("1")
    expect(sections[0].achievements.length).toBe(1)
    expect(sections[0].categories.field_work?.length).toBe(1)
    expect(sections[0].categories.results?.length).toBe(1)
    expect(customGoals.length).toBe(0)
  })

  it("puts goals without goal_level into customGoals", () => {
    const goals = [
      mockGoal({ id: "1", goal_level: 1, template_id: "l1_girlfriend" }),
      mockGoal({ id: "legacy", goal_level: null, template_id: null }),
    ]

    const { sections, customGoals } = groupGoalsByHierarchy(goals)
    expect(sections.length).toBe(1)
    expect(customGoals.length).toBe(1)
    expect(customGoals[0].id).toBe("legacy")
  })

  it("handles dirty_dog category", () => {
    const goals = [
      mockGoal({ id: "1", goal_level: 1, template_id: "l1_girlfriend" }),
      mockGoal({ id: "2", goal_level: 2, parent_goal_id: "1", template_id: "l2_master_daygame" }),
      mockGoal({ id: "3", goal_level: 3, parent_goal_id: "2", display_category: "dirty_dog" }),
    ]

    const { sections } = groupGoalsByHierarchy(goals)
    expect(sections[0].categories.dirty_dog?.length).toBe(1)
  })

  it("handles standalone L2 picks (no L1 in same area)", () => {
    const goals = [
      mockGoal({ id: "2", goal_level: 2, template_id: "l2_master_daygame", life_area: "daygame", category: "daygame" }),
    ]

    const { sections } = groupGoalsByHierarchy(goals)
    expect(sections.length).toBe(1)
    expect(sections[0].l1Goal.id).toBe("2") // L2 treated as section header
  })

  it("handles empty goals array", () => {
    const { sections, customGoals } = groupGoalsByHierarchy([])
    expect(sections.length).toBe(0)
    expect(customGoals.length).toBe(0)
  })

  it("routes goals with unknown display_category to unknownCategories", () => {
    const goals = [
      mockGoal({ id: "l1", goal_level: 1, template_id: "l1_girlfriend" }),
      mockGoal({ id: "unk", goal_level: 3, parent_goal_id: "l1", display_category: "obsolete_cat" as never }),
    ]

    const { sections } = groupGoalsByHierarchy(goals)
    expect(sections.length).toBe(1)
    expect(sections[0].unknownCategories).toHaveProperty("obsolete_cat")
    expect(sections[0].unknownCategories["obsolete_cat"].length).toBe(1)
    expect(sections[0].unknownCategories["obsolete_cat"][0].id).toBe("unk")
    // Should not appear in known categories or uncategorized
    expect(Object.keys(sections[0].categories).length).toBe(0)
    expect(sections[0].uncategorized.length).toBe(0)
  })

  it("routes goals with known display_category to categories (not unknownCategories)", () => {
    const goals = [
      mockGoal({ id: "l1", goal_level: 1, template_id: "l1_girlfriend" }),
      mockGoal({ id: "fw", goal_level: 3, parent_goal_id: "l1", display_category: "field_work" }),
    ]

    const { sections } = groupGoalsByHierarchy(goals)
    expect(sections[0].categories.field_work?.length).toBe(1)
    expect(Object.keys(sections[0].unknownCategories).length).toBe(0)
  })
})

describe("getGoalAccentColor", () => {
  it("returns green for input goals", () => {
    const goal = mockGoal({ id: "1", goal_nature: "input" })
    expect(getGoalAccentColor(goal)).toBe("#22c55e")
  })

  it("returns red for outcome goals", () => {
    const goal = mockGoal({ id: "1", goal_nature: "outcome" })
    expect(getGoalAccentColor(goal)).toBe("#ef4444")
  })

  it("returns null when goal_nature is not set", () => {
    const goal = mockGoal({ id: "1", goal_nature: null })
    expect(getGoalAccentColor(goal)).toBeNull()
  })
})
