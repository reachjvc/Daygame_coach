/**
 * Hierarchy display service — groups goals into the Phase 4 visual structure.
 *
 * Pure functions, no DB calls.
 */

import { getAchievementWeights } from "./data/goalGraph"
import { computeAchievementProgress } from "./milestoneService"
import { isKnownDisplayCategory } from "@/src/db/goalEnums"
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
 * - sections: one per L1 goal, with L3 goals grouped by category
 * - customGoals: goals without goal_level (manually created before Phase 4)
 *
 * L2 achievements are standalone badges — not part of the parent-child hierarchy.
 * They're included in each section's `achievements` array by matching life_area.
 */
export function groupGoalsByHierarchy(goals: GoalWithProgress[]): {
  sections: HierarchySection[]
  customGoals: GoalWithProgress[]
} {
  const sections: HierarchySection[] = []
  const customGoals: GoalWithProgress[] = []

  // Separate by level
  const l1Goals = goals.filter((g) => g.goal_level === 1)
  const l0Goals = goals.filter((g) => g.goal_level === 0)
  const l2Goals = goals.filter((g) => g.goal_level === 2)
  const l3Goals = goals.filter((g) => g.goal_level === 3)
  const noLevel = goals.filter((g) => g.goal_level === null || g.goal_level === undefined)

  // Build sections for L1 goals
  for (const l1 of l1Goals) {
    // L3 goals that parent directly to this L1
    // Also support legacy L3→L2 parentage by checking if parent is an L2 under this L1
    const legacyL2Ids = new Set(
      l2Goals.filter((g) => g.parent_goal_id === l1.id).map((a) => a.id)
    )
    const l3ForSection = l3Goals.filter(
      (g) => g.parent_goal_id === l1.id || (g.parent_goal_id && legacyL2Ids.has(g.parent_goal_id))
    )

    // L2 achievements matching this L1's life area (standalone badges)
    const achievements = l2Goals.filter((g) => g.life_area === l1.life_area || g.category === l1.category)

    const categories: Partial<Record<GoalDisplayCategory, GoalWithProgress[]>> = {}
    const unknownCategories: Record<string, GoalWithProgress[]> = {}
    const uncategorized: GoalWithProgress[] = []

    for (const l3 of l3ForSection) {
      const cat = l3.display_category
      if (cat && isKnownDisplayCategory(cat)) {
        if (!categories[cat]) categories[cat] = []
        categories[cat]!.push(l3)
      } else if (cat) {
        if (!unknownCategories[cat]) unknownCategories[cat] = []
        unknownCategories[cat].push(l3)
      } else {
        uncategorized.push(l3)
      }
    }

    sections.push({ l1Goal: l1, achievements, categories, unknownCategories, uncategorized })
  }

  // L0 goals with L1 children — create sections for their L1 children
  for (const l0 of l0Goals) {
    const l1Children = l1Goals.filter((g) => g.parent_goal_id === l0.id)
    if (l1Children.length === 0) {
      customGoals.push(l0)
    }
  }

  // Standalone L2 goals (no L1 in same area) — treat as section headers
  const coveredAreas = new Set(l1Goals.map((g) => g.life_area ?? g.category))
  const standaloneL2 = l2Goals.filter((g) => {
    const area = g.life_area ?? g.category
    return !coveredAreas.has(area)
  })
  for (const l2 of standaloneL2) {
    sections.push({ l1Goal: l2, achievements: [], categories: {}, unknownCategories: {}, uncategorized: [] })
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
  if (goal.goal_nature !== null && goal.goal_nature !== undefined) {
    console.warn(`[goalHierarchyService] Unknown goal_nature "${goal.goal_nature}" for goal ${goal.id}`)
  }
  return null
}
