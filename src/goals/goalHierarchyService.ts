/**
 * Hierarchy display service — groups goals into the Phase 4 visual structure.
 *
 * Pure functions, no DB calls.
 */

import { getAchievementWeights } from "./data/goalGraph"
import { computeAchievementProgress } from "./milestoneService"
import type {
  GoalWithProgress,
  GoalDisplayCategory,
  HierarchySection,
  AchievementProgressResult,
} from "./types"

// Colors for input (green) and outcome (red) goal natures
const INPUT_COLOR = "#22c55e" // green-500
const OUTCOME_COLOR = "#ef4444" // red-500

/**
 * Group flat goals into hierarchy sections for display.
 *
 * Returns:
 * - sections: one per L1 goal, each with L2 achievements and L3 goals by category
 * - customGoals: goals without goal_level (manually created before Phase 4)
 */
export function groupGoalsByHierarchy(goals: GoalWithProgress[]): {
  sections: HierarchySection[]
  customGoals: GoalWithProgress[]
} {
  const sections: HierarchySection[] = []
  const customGoals: GoalWithProgress[] = []

  // Index goals by id for parent lookups
  const goalMap = new Map(goals.map((g) => [g.id, g]))

  // Separate by level
  const l1Goals = goals.filter((g) => g.goal_level === 1)
  const l0Goals = goals.filter((g) => g.goal_level === 0)
  const l2Goals = goals.filter((g) => g.goal_level === 2)
  const l3Goals = goals.filter((g) => g.goal_level === 3)
  const noLevel = goals.filter((g) => g.goal_level === null || g.goal_level === undefined)

  // Build sections for L1 goals
  for (const l1 of l1Goals) {
    const achievements = l2Goals.filter((g) => g.parent_goal_id === l1.id)
    const achievementIds = new Set(achievements.map((a) => a.id))

    // L3 goals that parent to any of this L1's achievements
    const l3ForSection = l3Goals.filter((g) => g.parent_goal_id && achievementIds.has(g.parent_goal_id))

    const categories: Partial<Record<GoalDisplayCategory, GoalWithProgress[]>> = {}
    const uncategorized: GoalWithProgress[] = []

    for (const l3 of l3ForSection) {
      const cat = l3.display_category as GoalDisplayCategory | null
      if (cat && (cat === "field_work" || cat === "results" || cat === "dirty_dog")) {
        if (!categories[cat]) categories[cat] = []
        categories[cat]!.push(l3)
      } else {
        uncategorized.push(l3)
      }
    }

    sections.push({ l1Goal: l1, achievements, categories, uncategorized })
  }

  // L0 goals with L1 children — create sections for their L1 children
  for (const l0 of l0Goals) {
    const l1Children = l1Goals.filter((g) => g.parent_goal_id === l0.id)
    // If L1 children were already processed above, skip
    // The L0 goal itself is shown as context but L1s are the real sections
    if (l1Children.length === 0) {
      customGoals.push(l0)
    }
    // L1 children are already handled above as sections
  }

  // L2 goals without an L1 parent (standalone picks)
  const assignedL2Ids = new Set(sections.flatMap((s) => s.achievements.map((a) => a.id)))
  const standaloneL2 = l2Goals.filter((g) => !assignedL2Ids.has(g.id))
  for (const l2 of standaloneL2) {
    const l3ForL2 = l3Goals.filter((g) => g.parent_goal_id === l2.id)
    const categories: Partial<Record<GoalDisplayCategory, GoalWithProgress[]>> = {}
    const uncategorized: GoalWithProgress[] = []
    for (const l3 of l3ForL2) {
      const cat = l3.display_category as GoalDisplayCategory | null
      if (cat && (cat === "field_work" || cat === "results" || cat === "dirty_dog")) {
        if (!categories[cat]) categories[cat] = []
        categories[cat]!.push(l3)
      } else {
        uncategorized.push(l3)
      }
    }
    // Treat L2 as the "L1" for display purposes
    sections.push({ l1Goal: l2, achievements: [], categories, uncategorized })
  }

  // Goals without goal_level are legacy/custom
  customGoals.push(...noLevel)

  return { sections, customGoals }
}

/**
 * Compute achievement progress from sibling goals.
 *
 * Uses the goal graph's achievement weights and the milestoneService's
 * weighted progress calculator.
 */
export function computeAchievementProgressFromGoals(
  achievement: GoalWithProgress,
  siblingGoals: GoalWithProgress[]
): AchievementProgressResult {
  const activeTemplateIds = new Set(
    siblingGoals.filter((g) => g.template_id).map((g) => g.template_id!)
  )

  const weights = achievement.template_id
    ? getAchievementWeights(achievement.template_id, activeTemplateIds)
    : []

  // Build progress map: template_id → progress percentage
  const progressMap = new Map<string, number>()
  for (const goal of siblingGoals) {
    if (goal.template_id) {
      progressMap.set(goal.template_id, goal.progress_percentage)
    }
  }

  return computeAchievementProgress(weights, progressMap)
}

/**
 * Get the accent color for a goal based on its nature.
 * Input goals = green, outcome goals = red.
 * Falls back to null when goal_nature is not set (legacy goals use life area color).
 */
export function getGoalAccentColor(goal: GoalWithProgress): string | null {
  if (goal.goal_nature === "input") return INPUT_COLOR
  if (goal.goal_nature === "outcome") return OUTCOME_COLOR
  return null
}
