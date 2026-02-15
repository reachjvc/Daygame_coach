/**
 * Goals business logic — tree building, filtering, progress aggregation
 */

import type { GoalWithProgress, GoalTreeNode, GoalFilterState, InputMode, CelebrationTier, MilestoneLadderConfig, HabitRampStep, PreviewGoalState } from "./types"
import type { BatchGoalInsert } from "./treeGenerationService"
import { generateMilestoneLadder, computeRampMilestoneDates } from "./milestoneService"
import { getTemplatesByCategory } from "./data/goalGraph"

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
  // Milestone goals without target_date are long-term by nature
  if (goal.goal_type === "milestone" && !goal.target_date) {
    return "Long-term"
  }

  // Milestone goals with target_date: derive from date
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
 * Determine if a goal should appear in the Daily action view.
 * L3 goals and standalone goals (goal_level null) with habit_ramp or recurring types are daily-actionable.
 * Milestone goals and L0/L1/L2 goals are excluded.
 */
export function isDailyActionable(goal: GoalWithProgress): boolean {
  if (goal.goal_level !== null && goal.goal_level !== 3) return false
  return goal.goal_type === "habit_ramp" || goal.goal_type === "recurring"
}

/**
 * Determine if a goal should appear in the Daily milestones summary.
 * L3 and standalone milestone goals that are not archived.
 */
export function isDailyMilestone(goal: GoalWithProgress): boolean {
  return (goal.goal_level === 3 || goal.goal_level === null)
    && goal.goal_type === "milestone"
    && !goal.is_archived
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
 * Derive child goal level from parent level.
 * Returns null if parent has no level (standalone goal).
 */
export function deriveChildLevel(parentLevel: number | null): number | null {
  if (parentLevel === null) return null
  return Math.min(3, parentLevel + 1)
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

/**
 * Get the next milestone info for a goal with milestone_config.
 * Returns the next milestone value above current_value, or null if completed / no config.
 */
export function getNextMilestoneInfo(
  goal: GoalWithProgress
): { nextValue: number; remaining: number } | null {
  if (!goal.milestone_config) return null
  const config = goal.milestone_config as unknown as MilestoneLadderConfig
  const milestones = generateMilestoneLadder(config)
  const next = milestones.find((m) => m.value > goal.current_value)
  if (!next) return null
  return { nextValue: next.value, remaining: next.value - goal.current_value }
}

/**
 * Get all milestone ladder values for a goal.
 * Returns array of milestone values or null if no milestone_config.
 */
export function getMilestoneLadderValues(
  goal: GoalWithProgress
): number[] | null {
  if (!goal.milestone_config) return null
  const config = goal.milestone_config as unknown as MilestoneLadderConfig
  const milestones = generateMilestoneLadder(config)
  return milestones.map((m) => m.value)
}

/**
 * Format a streak label for the daily view.
 * Returns "Week N of your daygame journey" or empty string for 0.
 */
export function formatStreakLabel(weeks: number): string {
  if (weeks <= 0) return ""
  return `Week ${weeks} streak`
}

/**
 * Get the number of days remaining in the current week (Mon-Sun).
 * Sunday = 0 remaining, Monday = 6, etc.
 */
export function getDaysLeftInWeek(): number {
  const day = new Date().getDay() // 0=Sun, 1=Mon, ...6=Sat
  if (day === 0) return 0 // Sunday = end of week
  return 7 - day
}

/**
 * Projected date info for a goal with milestone_config and ramp_steps.
 */
export interface ProjectedDateInfo {
  /** e.g. "25 by Apr 2026" */
  nextLabel: string | null
  /** e.g. "1000 by Dec 2028" */
  finalLabel: string | null
}

/**
 * Format a date as "Mon YYYY" (e.g., "Apr 2026").
 */
function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

/**
 * Compute projected completion dates for a goal using its milestone config and ramp steps.
 * Returns null if the goal lacks either milestone_config or ramp_steps.
 */
export function computeProjectedDate(goal: GoalWithProgress): ProjectedDateInfo | null {
  if (!goal.milestone_config || !goal.ramp_steps) return null

  const config = goal.milestone_config as unknown as MilestoneLadderConfig
  const rampSteps = goal.ramp_steps as unknown as HabitRampStep[]

  if (rampSteps.length === 0) return null

  const milestones = generateMilestoneLadder(config)
  if (milestones.length === 0) return null

  const milestoneValues = milestones.map((m) => m.value)
  const startDate = new Date(goal.period_start_date || goal.created_at)
  const dated = computeRampMilestoneDates(milestoneValues, rampSteps, startDate)

  if (dated.length === 0) return null

  // Find next milestone above current_value
  const nextDated = dated.find((d) => d.milestoneValue > goal.current_value)
  const finalDated = dated[dated.length - 1]

  return {
    nextLabel: nextDated ? `${nextDated.milestoneValue} by ${formatMonthYear(nextDated.estimatedDate)}` : null,
    finalLabel: finalDated ? `${finalDated.milestoneValue} by ${formatMonthYear(finalDated.estimatedDate)}` : null,
  }
}

/**
 * Build initial preview state map from generated inserts.
 * L0/L1/L2 goals are always enabled (not user-toggleable).
 * L3 dirty_dog goals default to OFF. All other L3 default to ON.
 */
export function buildPreviewState(
  inserts: BatchGoalInsert[]
): Map<string, PreviewGoalState> {
  const state = new Map<string, PreviewGoalState>()
  for (const insert of inserts) {
    const level = insert.goal_level ?? 0
    const isDirtyDog = insert.display_category === "dirty_dog"
    state.set(insert._tempId, {
      enabled: level < 3 || !isDirtyDog,
      targetValue: insert.target_value,
    })
  }
  return state
}

/**
 * Filter inserts based on preview state.
 * Removes disabled L3 goals. Keeps all L0/L1/L2 (structural).
 * Updates target_value and milestone_config.target from state overrides.
 */
export function applyPreviewState(
  inserts: BatchGoalInsert[],
  state: Map<string, PreviewGoalState>
): BatchGoalInsert[] {
  return inserts
    .filter((insert) => {
      const level = insert.goal_level ?? 0
      if (level < 3) return true
      const s = state.get(insert._tempId)
      return s ? s.enabled : true
    })
    .map((insert) => {
      const s = state.get(insert._tempId)
      if (!s || s.targetValue === insert.target_value) return insert

      const updated = { ...insert, target_value: s.targetValue }
      if (updated.milestone_config && typeof updated.milestone_config === "object") {
        updated.milestone_config = { ...updated.milestone_config, target: s.targetValue }
      }
      return updated
    })
}

/**
 * Find an existing goal matching a template_id.
 */
export function findExistingByTemplate(
  goals: GoalWithProgress[],
  templateId: string
): GoalWithProgress | null {
  return goals.find((g) => g.template_id === templateId) ?? null
}

/**
 * Generate inserts for the 4 dirty dog goals, parented to the first existing L2 achievement.
 * Returns empty array if no L2 parent exists or all dirty dog goals already exist.
 */
export function generateDirtyDogInserts(
  existingGoals: GoalWithProgress[]
): BatchGoalInsert[] {
  const l2Parent = existingGoals.find((g) => g.goal_level === 2)
  if (!l2Parent) return []

  const dirtyDogTemplates = getTemplatesByCategory().dirty_dog
  const existingTemplateIds = new Set(existingGoals.map((g) => g.template_id).filter(Boolean))

  return dirtyDogTemplates
    .filter((tmpl) => !existingTemplateIds.has(tmpl.id))
    .map((tmpl) => {
      const insert: BatchGoalInsert = {
        _tempId: "__temp_" + tmpl.id,
        _tempParentId: null,
        title: tmpl.title,
        category: "daygame",
        life_area: "daygame",
        goal_nature: tmpl.nature,
        display_category: tmpl.displayCategory ?? undefined,
        goal_level: tmpl.level,
        template_id: tmpl.id,
        parent_goal_id: l2Parent.id,
        target_value: 1,
        tracking_type: "counter",
        goal_type: "milestone",
        period: "weekly",
      }

      if (tmpl.templateType === "milestone_ladder" && tmpl.defaultMilestoneConfig) {
        insert.target_value = tmpl.defaultMilestoneConfig.target
        insert.goal_type = "milestone"
        insert.milestone_config = tmpl.defaultMilestoneConfig as unknown as Record<string, unknown>
      } else if (tmpl.templateType === "habit_ramp" && tmpl.defaultRampSteps) {
        insert.target_value = tmpl.defaultRampSteps[0].frequencyPerWeek
        insert.goal_type = "habit_ramp"
        insert.period = "weekly"
        insert.ramp_steps = tmpl.defaultRampSteps as unknown as Record<string, unknown>[]
      }

      if (tmpl.linkedMetric) {
        insert.linked_metric = tmpl.linkedMetric
      }

      return insert
    })
}
