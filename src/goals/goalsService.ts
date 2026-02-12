/**
 * Goals business logic — tree building, filtering, progress aggregation
 */

import type { GoalWithProgress, GoalTreeNode, GoalFilterState } from "./types"

/**
 * Build a hierarchical goal tree from a flat array. O(n) algorithm.
 */
export function buildGoalTree(goals: GoalWithProgress[]): GoalTreeNode[] {
  const nodeMap = new Map<string, GoalTreeNode>()
  const roots: GoalTreeNode[] = []

  for (const goal of goals) {
    nodeMap.set(goal.id, { ...goal, children: [] })
  }

  for (const goal of goals) {
    const node = nodeMap.get(goal.id)!
    if (goal.parent_goal_id && nodeMap.has(goal.parent_goal_id)) {
      nodeMap.get(goal.parent_goal_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/**
 * Flatten a goal tree back into a flat array of GoalWithProgress.
 * Performs a depth-first traversal, stripping the `children` property.
 */
export function flattenTree(tree: GoalTreeNode[]): GoalWithProgress[] {
  const result: GoalWithProgress[] = []
  function walk(nodes: GoalTreeNode[]) {
    for (const node of nodes) {
      const { children, ...goal } = node
      result.push(goal)
      if (children.length > 0) walk(children)
    }
  }
  walk(tree)
  return result
}

/**
 * Filter goals by life area, time horizon, status, and search text
 */
export function filterGoals(
  goals: GoalWithProgress[],
  filters: GoalFilterState
): GoalWithProgress[] {
  return goals.filter((goal) => {
    if (filters.lifeArea && goal.life_area !== filters.lifeArea) return false
    if (filters.timeHorizon && deriveTimeHorizon(goal) !== filters.timeHorizon) return false
    if (filters.status) {
      if (filters.status === "complete" && !goal.is_complete) return false
      if (filters.status === "active" && goal.is_complete) return false
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!goal.title.toLowerCase().includes(q) && !goal.life_area.toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })
}

/**
 * Group goals by life area
 */
export function groupGoalsByLifeArea(
  goals: GoalWithProgress[]
): Record<string, GoalWithProgress[]> {
  const groups: Record<string, GoalWithProgress[]> = {}
  for (const goal of goals) {
    const key = goal.life_area || "custom"
    if (!groups[key]) groups[key] = []
    groups[key].push(goal)
  }
  return groups
}

/**
 * Group goals by derived time horizon
 */
export function groupGoalsByTimeHorizon(
  goals: GoalWithProgress[]
): Record<string, GoalWithProgress[]> {
  const groups: Record<string, GoalWithProgress[]> = {}
  for (const goal of goals) {
    const horizon = deriveTimeHorizon(goal)
    if (!groups[horizon]) groups[horizon] = []
    groups[horizon].push(goal)
  }
  return groups
}

/**
 * Compute progress summary per life area
 */
export function computeLifeAreaProgress(
  goals: GoalWithProgress[]
): { lifeArea: string; completed: number; total: number; avgProgress: number }[] {
  const grouped = groupGoalsByLifeArea(goals)
  return Object.entries(grouped).map(([lifeArea, areaGoals]) => {
    const completed = areaGoals.filter((g) => g.is_complete).length
    const total = areaGoals.length
    const avgProgress =
      total > 0
        ? Math.round(areaGoals.reduce((sum, g) => sum + g.progress_percentage, 0) / total)
        : 0
    return { lifeArea, completed, total, avgProgress }
  })
}

/**
 * Derive a human-readable time horizon label from goal properties
 */
export function deriveTimeHorizon(goal: GoalWithProgress): string {
  // Milestone goals: derive from target_date
  if (goal.goal_type === "milestone" && goal.target_date) {
    const target = new Date(goal.target_date)
    const now = new Date()
    const thisYear = now.getFullYear()
    const targetYear = target.getFullYear()

    if (targetYear - thisYear > 5) return "Life"
    if (targetYear > thisYear) return "This Year"

    const thisQuarter = Math.floor(now.getMonth() / 3)
    const targetQuarter = Math.floor(target.getMonth() / 3)
    if (targetYear === thisYear && targetQuarter > thisQuarter) return "This Quarter"

    if (targetYear === thisYear && target.getMonth() > now.getMonth()) return "This Month"
    if (targetYear === thisYear && target.getMonth() === now.getMonth()) {
      const daysRemaining = target.getDate() - now.getDate()
      if (daysRemaining > 7) return "This Month"
      if (daysRemaining > 0) return "This Week"
      return "Today"
    }

    return "Custom"
  }

  // Recurring goals: derive from period
  switch (goal.period) {
    case "daily":
      return "Today"
    case "weekly":
      return "This Week"
    case "monthly":
      return "This Month"
    case "quarterly":
      return "This Quarter"
    case "yearly":
      return "This Year"
    default:
      return "Custom"
  }
}
