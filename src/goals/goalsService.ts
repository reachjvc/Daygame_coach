/**
 * Goals business logic — tree building, filtering, progress aggregation
 */

import type { GoalWithProgress, GoalTreeNode, GoalFilterState, InputMode, CelebrationTier } from "./types"

/**
 * Build a hierarchical goal tree from a flat array. O(n) algorithm.
 * Detects cycles and self-references — orphaned nodes become roots.
 */
export function buildGoalTree(goals: GoalWithProgress[]): GoalTreeNode[] {
  const nodeMap = new Map<string, GoalTreeNode>()
  const roots: GoalTreeNode[] = []

  for (const goal of goals) {
    nodeMap.set(goal.id, { ...goal, children: [] })
  }

  // Detect cycles: walk parent chain, if we revisit a node it's a cycle
  const safeParent = new Map<string, string | null>()
  for (const goal of goals) {
    if (!goal.parent_goal_id || !nodeMap.has(goal.parent_goal_id)) {
      safeParent.set(goal.id, null)
      continue
    }
    if (goal.parent_goal_id === goal.id) {
      safeParent.set(goal.id, null)
      continue
    }
    const visited = new Set<string>([goal.id])
    let ancestor = goal.parent_goal_id
    let hasCycle = false
    while (ancestor && nodeMap.has(ancestor)) {
      if (visited.has(ancestor)) { hasCycle = true; break }
      visited.add(ancestor)
      const ancestorGoal = goals.find((g) => g.id === ancestor)
      ancestor = ancestorGoal?.parent_goal_id ?? null
    }
    safeParent.set(goal.id, hasCycle ? null : goal.parent_goal_id)
  }

  for (const goal of goals) {
    const node = nodeMap.get(goal.id)!
    const parentId = safeParent.get(goal.id)
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node)
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
    if (targetYear > thisYear) return "Multi-Year"

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

/**
 * Determine the input mode for a goal based on tracking type and target value.
 * - boolean goals → "boolean" (Mark Done button)
 * - counter goals with high target (>50) → "direct-entry" (number input)
 * - counter goals with low target → "buttons" (+1, +5, etc.)
 */
export function getInputMode(goal: GoalWithProgress): InputMode {
  if (goal.tracking_type === "boolean") return "boolean"
  if (goal.target_value > 50) return "direct-entry"
  return "buttons"
}

/**
 * Get appropriate increment button values based on target value.
 * Small targets: [1], medium: [1, 5], larger: [1, 5, 10]
 */
export function getButtonIncrements(targetValue: number): number[] {
  if (targetValue <= 5) return [1]
  if (targetValue <= 20) return [1, 5]
  return [1, 5, 10]
}

/**
 * Get celebration tier for a completed goal based on its time horizon.
 * Bigger/longer goals get more impressive celebrations.
 */
export function getCelebrationTier(goal: GoalWithProgress): CelebrationTier {
  const horizon = deriveTimeHorizon(goal)
  switch (horizon) {
    case "Today":
      return "subtle"
    case "This Week":
      return "toast"
    case "This Month":
      return "toast"
    case "This Quarter":
      return "confetti-small"
    case "This Year":
      return "confetti-full"
    case "Multi-Year":
      return "confetti-epic"
    case "Life":
      return "confetti-epic"
    default:
      return "toast"
  }
}
