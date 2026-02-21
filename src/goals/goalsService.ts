/**
 * Goals business logic — tree building, filtering, progress aggregation
 */

import type { GoalWithProgress, GoalTreeNode, GoalFilterState, InputMode, CelebrationTier, MilestoneLadderConfig, HabitRampStep, PreviewGoalState, TimeOfDayBracket, WeeklyRhythm, PacingInfo, MilestoneCelebrationData, BadgeStatus, TierUpgradeEvent, WeeklyReviewData, WeeklyGoalMomentum, GoalSetupSelections, WillGateResult, BottleneckResult, GoalTemplate, PhaseTransitionEvent } from "./types"
import type { DailyGoalSnapshotRow, GoalPhase, LinkedMetric } from "@/src/db/goalTypes"
import type { BatchGoalInsert } from "./treeGenerationService"
import { generateMilestoneLadder, computeRampMilestoneDates } from "./milestoneService"
import { getTemplatesByCategory, GOAL_TEMPLATE_MAP, getParents, getDaygamePathL1 } from "./data/goalGraph"
import { LIFE_AREAS } from "./data/lifeAreas"
import { detectTierUpgrades } from "./badgeEngineService"

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
  if (goal.goal_phase === "graduated") return false
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
 * Determine if a goal should auto-consume a streak freeze during reset.
 * Conditions: goal incomplete, has streak worth protecting, freeze available, not already frozen today.
 */
export function shouldAutoFreeze(
  goal: { current_value: number; target_value: number; current_streak: number; streak_freezes_available: number; last_freeze_date: string | null },
  today: string
): boolean {
  if (goal.current_value >= goal.target_value) return false
  if (goal.current_streak <= 0) return false
  if (goal.streak_freezes_available <= 0) return false
  if (goal.last_freeze_date === today) return false
  return true
}

/**
 * Calculate how many days since the goal was last updated.
 * Returns 0 if updated today, 1 if yesterday, etc.
 */
export function getGoalStaleness(updatedAt: string, now?: Date): number {
  const lastUpdate = new Date(updatedAt)
  const ref = now ?? new Date()
  lastUpdate.setHours(0, 0, 0, 0)
  const refDay = new Date(ref)
  refDay.setHours(0, 0, 0, 0)
  return Math.floor((refDay.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Map an hour (0-23) to a time-of-day bracket.
 * morning(5-11), afternoon(12-16), evening(17-20), night(21-4)
 */
export function getTimeOfDayBracket(hour: number): TimeOfDayBracket {
  if (hour >= 5 && hour <= 11) return "morning"
  if (hour >= 12 && hour <= 16) return "afternoon"
  if (hour >= 17 && hour <= 20) return "evening"
  return "night"
}

/**
 * Check if a goal is almost complete (progress >= threshold but not 100%).
 */
export function isAlmostComplete(goal: GoalWithProgress, threshold = 0.8): boolean {
  if (goal.target_value <= 0) return false
  const ratio = goal.current_value / goal.target_value
  return ratio >= threshold && ratio < 1
}

/**
 * Analyze 7 days of snapshots to determine active days and peak time bracket.
 * Uses snapshot created_at timestamps to infer activity times.
 */
export function getWeeklyRhythm(snapshots: DailyGoalSnapshotRow[]): WeeklyRhythm {
  const bracketCounts: Record<TimeOfDayBracket, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  const activeDates = new Set<string>()

  for (const snap of snapshots) {
    if (snap.was_complete) {
      activeDates.add(snap.snapshot_date)
      const hour = new Date(snap.created_at).getHours()
      bracketCounts[getTimeOfDayBracket(hour)]++
    }
  }

  let peakBracket: TimeOfDayBracket | null = null
  let maxCount = 0
  for (const [bracket, count] of Object.entries(bracketCounts) as [TimeOfDayBracket, number][]) {
    if (count > maxCount) {
      maxCount = count
      peakBracket = bracket
    }
  }

  return {
    activeDays: activeDates.size,
    peakBracket: maxCount > 0 ? peakBracket : null,
    bracketCounts,
  }
}

/**
 * Compute pacing info for a habit_ramp goal.
 * Compares actual rate (current_value / weeks_elapsed) against
 * the projected rate from the current ramp step.
 * Returns null if goal has no ramp_steps or has been active less than 1 day.
 */
export function computePacing(goal: GoalWithProgress, now?: Date): PacingInfo | null {
  if (!goal.ramp_steps || goal.goal_type !== "habit_ramp") return null

  const rampSteps = goal.ramp_steps as unknown as HabitRampStep[]
  if (rampSteps.length === 0) return null

  const ref = now ?? new Date()
  const startDate = new Date(goal.period_start_date || goal.created_at)
  const daysActive = Math.max(1, Math.floor((ref.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const weeksElapsed = daysActive / 7

  const actualRate = weeksElapsed > 0 ? goal.current_value / weeksElapsed : 0

  // Find which ramp step we're currently in
  let weeksSoFar = 0
  let projectedRate = rampSteps[0].frequencyPerWeek
  for (const step of rampSteps) {
    if (weeksElapsed <= weeksSoFar + step.durationWeeks) {
      projectedRate = step.frequencyPerWeek
      break
    }
    weeksSoFar += step.durationWeeks
    projectedRate = step.frequencyPerWeek // last step if we're past all
  }

  const pacingRatio = projectedRate > 0 ? actualRate / projectedRate : 0
  let status: PacingInfo["status"]
  if (pacingRatio >= 1.15) status = "ahead"
  else if (pacingRatio >= 0.85) status = "on-pace"
  else status = "behind"

  return { actualRate, projectedRate, pacingRatio, status, daysActive }
}

// ============================================================================
// Will Gate & Bottleneck Analysis (Diagnostic Layer)
// ============================================================================

/** Default threshold: minimum approaches per session-hour before diagnostics engage */
const WILL_GATE_THRESHOLD = 3

/**
 * Compute the will gate — a time:approach ratio that determines whether
 * the user's bottleneck is willpower (getting started) vs skill (improving).
 *
 * If approaches/sessionHours < threshold → "Your bottleneck is getting started, not improving a skill"
 */
export function computeWillGate(
  weeklyApproaches: number,
  sessionDurationMinutes: number,
  threshold: number = WILL_GATE_THRESHOLD
): WillGateResult {
  const sessionHours = sessionDurationMinutes / 60
  if (sessionHours <= 0) {
    return {
      gateTriggered: true,
      ratio: 0,
      message: "You haven't logged any session time this week. The bottleneck is getting out the door.",
    }
  }

  const ratio = weeklyApproaches / sessionHours
  const gateTriggered = ratio < threshold

  return {
    gateTriggered,
    ratio: Math.round(ratio * 10) / 10,
    message: gateTriggered
      ? "Your bottleneck is getting started, not improving a skill. Focus on showing up more."
      : "",
  }
}

/**
 * Compute the primary bottleneck from active goals.
 * If will gate is triggered → return the will message (don't look at skills).
 * Otherwise → find the L3 goal with the worst pacing ratio (furthest behind pace).
 */
export function computeBottleneck(
  goals: GoalWithProgress[],
  pacingMap: Map<string, PacingInfo>,
  willGate: WillGateResult
): BottleneckResult {
  if (willGate.gateTriggered) {
    return {
      willGate,
      bottleneckGoalId: null,
      description: willGate.message,
      recommendedFocus: "Get out and approach. Quantity before quality.",
    }
  }

  // Find worst-pacing L3 goal
  let worstGoalId: string | null = null
  let worstRatio = Infinity

  for (const goal of goals) {
    if (goal.goal_level !== 3) continue
    const pacing = pacingMap.get(goal.id)
    if (!pacing) continue
    if (pacing.pacingRatio < worstRatio) {
      worstRatio = pacing.pacingRatio
      worstGoalId = goal.id
    }
  }

  if (!worstGoalId) {
    return {
      willGate,
      bottleneckGoalId: null,
      description: "All goals are on pace. Keep it up!",
      recommendedFocus: "Maintain current habits.",
    }
  }

  const worstGoal = goals.find((g) => g.id === worstGoalId)!
  const worstPacing = pacingMap.get(worstGoalId)!

  return {
    willGate,
    bottleneckGoalId: worstGoalId,
    description: `"${worstGoal.title}" is your biggest bottleneck — ${Math.round(worstPacing.pacingRatio * 100)}% of target pace.`,
    recommendedFocus: `Prioritize ${worstGoal.title} this week.`,
  }
}

// ============================================================================
// Graduation Lifecycle (Phase M5)
// ============================================================================

/** Consecutive on-pace weeks needed to enter consolidation. */
const CONSOLIDATION_THRESHOLD_WEEKS = 4
/** Consecutive complete weeks needed to graduate. */
const GRADUATION_THRESHOLD_WEEKS = 8
/** Consecutive below-pace weeks to regress from graduated to consolidation. */
const REGRESSION_THRESHOLD_WEEKS = 2

/**
 * Group a flat array of snapshots into weeks (Monday–Sunday).
 * Returns array of week arrays sorted oldest → newest.
 */
export function groupSnapshotsIntoWeeks(snapshots: DailyGoalSnapshotRow[]): DailyGoalSnapshotRow[][] {
  if (snapshots.length === 0) return []

  const weekMap = new Map<string, DailyGoalSnapshotRow[]>()

  for (const snap of snapshots) {
    const date = new Date(snap.snapshot_date + "T00:00:00")
    const day = date.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(date)
    monday.setDate(date.getDate() - diff)
    const key = monday.toISOString().split("T")[0]
    const arr = weekMap.get(key) ?? []
    arr.push(snap)
    weekMap.set(key, arr)
  }

  return [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, snaps]) => snaps)
}

/**
 * Detect if a goal should transition to a new phase.
 * Returns the new phase, or null if no transition.
 *
 * Transitions:
 * - acquisition → consolidation: 4+ consecutive on-pace weeks
 * - consolidation → graduated: 8+ consecutive complete weeks AND graduation_criteria exists
 */
export function detectPhaseTransition(
  goal: GoalWithProgress,
  pacing: PacingInfo | null,
  weeklySnapshots: DailyGoalSnapshotRow[][],
  template: GoalTemplate | null
): GoalPhase | null {
  const currentPhase = goal.goal_phase ?? "acquisition"

  if (currentPhase === "acquisition") {
    // Need 4+ consecutive on-pace weeks
    if (weeklySnapshots.length < CONSOLIDATION_THRESHOLD_WEEKS) return null

    const recentWeeks = weeklySnapshots.slice(-CONSOLIDATION_THRESHOLD_WEEKS)
    const allOnPace = recentWeeks.every((week) => {
      if (week.length === 0) return false
      const completedCount = week.filter((s) => s.was_complete).length
      return completedCount / week.length >= 0.8
    })

    return allOnPace ? "consolidation" : null
  }

  if (currentPhase === "consolidation") {
    // Need 8+ consecutive complete weeks AND graduation_criteria exists on template
    if (!template?.graduation_criteria) return null
    if (weeklySnapshots.length < GRADUATION_THRESHOLD_WEEKS) return null

    const recentWeeks = weeklySnapshots.slice(-GRADUATION_THRESHOLD_WEEKS)
    const allComplete = recentWeeks.every((week) => {
      if (week.length === 0) return false
      return week.every((s) => s.was_complete)
    })

    return allComplete ? "graduated" : null
  }

  return null
}

/**
 * Check if a graduated goal should regress to consolidation.
 * Returns "consolidation" if the goal has been below pace for 2+ consecutive weeks.
 */
export function checkGraduationRegression(
  goal: GoalWithProgress,
  recentWeeks: DailyGoalSnapshotRow[][]
): GoalPhase | null {
  if (goal.goal_phase !== "graduated") return null
  if (recentWeeks.length < REGRESSION_THRESHOLD_WEEKS) return null

  const lastWeeks = recentWeeks.slice(-REGRESSION_THRESHOLD_WEEKS)
  const allBelowPace = lastWeeks.every((week) => {
    if (week.length === 0) return true // no data = below pace
    const completedCount = week.filter((s) => s.was_complete).length
    return completedCount / week.length < 0.5
  })

  return allBelowPace ? "consolidation" : null
}

/**
 * Detect phase transitions for all eligible goals given their historical snapshots.
 * Pure function — returns events but does NOT persist to DB. Caller handles persistence.
 */
export function detectAllPhaseTransitions(
  goals: GoalWithProgress[],
  allSnapshots: DailyGoalSnapshotRow[]
): PhaseTransitionEvent[] {
  const events: PhaseTransitionEvent[] = []

  for (const goal of goals) {
    if (goal.goal_type !== "habit_ramp" || goal.goal_level !== 3) continue

    const goalSnaps = allSnapshots.filter((s) => s.goal_id === goal.id)
    const weeks = groupSnapshotsIntoWeeks(goalSnaps)
    const template = goal.template_id ? GOAL_TEMPLATE_MAP[goal.template_id] ?? null : null

    let newPhase: GoalPhase | null = null

    if (goal.goal_phase === "graduated") {
      newPhase = checkGraduationRegression(goal, weeks)
    } else {
      newPhase = detectPhaseTransition(goal, null, weeks, template)
    }

    if (newPhase) {
      events.push({
        goalId: goal.id,
        goalTitle: goal.title,
        previousPhase: goal.goal_phase ?? null,
        newPhase,
      })
    }
  }

  return events
}

/**
 * Build celebration data when a goal hits a milestone.
 * Returns null if goal has no milestone_config or hasn't reached any milestone.
 */
export function buildMilestoneCelebrationData(
  goal: GoalWithProgress,
  previousBadges?: BadgeStatus[],
  currentBadges?: BadgeStatus[]
): MilestoneCelebrationData | null {
  if (!goal.milestone_config) return null

  const config = goal.milestone_config as unknown as MilestoneLadderConfig
  const milestones = generateMilestoneLadder(config)
  if (milestones.length === 0) return null

  const milestoneValues = milestones.map((m) => m.value)
  // Find which milestone was just hit (highest milestone <= current_value)
  const hitMilestones = milestoneValues.filter((v) => goal.current_value >= v)
  if (hitMilestones.length === 0) return null

  const milestoneValue = hitMilestones[hitMilestones.length - 1]
  const milestoneNumber = hitMilestones.length
  const totalMilestones = milestoneValues.length
  const ladderPosition = Math.round((milestoneNumber / totalMilestones) * 100)

  // Projected next milestone
  let projectedNext: string | null = null
  if (goal.ramp_steps) {
    const projected = computeProjectedDate(goal)
    projectedNext = projected?.nextLabel ?? null
  }

  // Tier upgrade detection
  let badgeTierUpgrade: TierUpgradeEvent | null = null
  if (previousBadges && currentBadges) {
    const upgrades = detectTierUpgrades(previousBadges, currentBadges)
    badgeTierUpgrade = upgrades.length > 0 ? upgrades[0] : null
  }

  return {
    milestoneNumber,
    totalMilestones,
    ladderPosition,
    currentValue: goal.current_value,
    milestoneValue,
    projectedNext,
    badgeTierUpgrade,
  }
}

/**
 * Compute weekly review data from snapshots and current goal state.
 * Pure aggregation — no DB calls.
 */
export function computeWeeklyReviewData(
  snapshots: DailyGoalSnapshotRow[],
  goals: GoalWithProgress[],
  tierUpgrades: TierUpgradeEvent[] = []
): WeeklyReviewData {
  // Count completions per day
  const dayCounts = new Map<string, { completed: number; total: number }>()
  for (const snap of snapshots) {
    const day = snap.snapshot_date
    const entry = dayCounts.get(day) ?? { completed: 0, total: 0 }
    entry.total++
    if (snap.was_complete) entry.completed++
    dayCounts.set(day, entry)
  }

  // Best/worst day by completion count
  let bestDay: string | null = null
  let worstDay: string | null = null
  let bestCount = -1
  let worstCount = Infinity
  for (const [day, { completed, total }] of dayCounts) {
    if (total === 0) continue
    if (completed > bestCount) { bestCount = completed; bestDay = day }
    if (completed < worstCount) { worstCount = completed; worstDay = day }
  }

  // Per-goal momentum: completion rate across the week
  const goalSnapMap = new Map<string, DailyGoalSnapshotRow[]>()
  for (const snap of snapshots) {
    const arr = goalSnapMap.get(snap.goal_id) ?? []
    arr.push(snap)
    goalSnapMap.set(snap.goal_id, arr)
  }

  // Leading/lagging momentum weights
  const INPUT_WEIGHT = 1.5
  const OUTCOME_WEIGHT = 0.5

  const goalMomentum: WeeklyGoalMomentum[] = []
  let weightedCompletionSum = 0
  let totalWeight = 0
  let milestonesHit = 0

  for (const goal of goals) {
    const snaps = goalSnapMap.get(goal.id) ?? []
    const completedCount = snaps.filter((s) => s.was_complete).length
    const completionRate = snaps.length > 0 ? Math.round((completedCount / snaps.length) * 100) : 0

    // Simple trend: compare first half vs second half
    let trend: WeeklyGoalMomentum["trend"] = "stable"
    if (snaps.length >= 4) {
      const mid = Math.floor(snaps.length / 2)
      const sorted = [...snaps].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
      const firstHalf = sorted.slice(0, mid).filter((s) => s.was_complete).length / mid
      const secondHalf = sorted.slice(mid).filter((s) => s.was_complete).length / (sorted.length - mid)
      if (secondHalf > firstHalf + 0.15) trend = "improving"
      else if (secondHalf < firstHalf - 0.15) trend = "declining"
    }

    // Count milestones hit this week (value crossed a milestone threshold)
    if (goal.milestone_config && snaps.length > 0) {
      const config = goal.milestone_config as unknown as MilestoneLadderConfig
      const milestones = generateMilestoneLadder(config)
      const milestoneValues = milestones.map((m) => m.value)
      const sortedSnaps = [...snaps].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
      const startValue = sortedSnaps[0].current_value
      const endValue = sortedSnaps[sortedSnaps.length - 1].current_value
      for (const mv of milestoneValues) {
        if (startValue < mv && endValue >= mv) milestonesHit++
      }
    }

    // Weight by goal nature: input (leading) = 1.5x, outcome (lagging) = 0.5x
    const weight = goal.goal_nature === "input" ? INPUT_WEIGHT
      : goal.goal_nature === "outcome" ? OUTCOME_WEIGHT
      : 1.0
    weightedCompletionSum += completionRate * weight
    totalWeight += weight

    goalMomentum.push({
      goalId: goal.id,
      title: goal.title,
      completionRate,
      trend,
      goalNature: goal.goal_nature,
    })
  }

  const goalsTotal = goals.length
  const goalsCompleted = goals.filter((g) => g.is_complete).length
  const overallMomentumScore = totalWeight > 0 ? Math.round(weightedCompletionSum / totalWeight) : 0

  return {
    overallMomentumScore,
    goalsCompleted,
    goalsTotal,
    bestDay,
    worstDay,
    milestonesHit,
    goalMomentum,
    tierUpgrades,
    phaseTransitions: [],
  }
}

/**
 * Check if a template is "core" priority (auto-enabled during onboarding).
 * Core templates are the foundational 3-4 goals per life area.
 * Progressive and niche templates default to OFF.
 */
function isCorePriority(templateId: string | undefined | null): boolean {
  if (!templateId) return false
  const template = GOAL_TEMPLATE_MAP[templateId]
  return template?.priority === "core"
}

/**
 * Template IDs that default to OFF for FTO (Find The One) path.
 * Abundance-specific goals that don't make sense for relationship-seekers.
 */
const FTO_OFF_TEMPLATES = new Set([
  "l3_women_dating", "l3_sustained_rotation",
  "l3_kiss_closes", "l3_lays",
])

/**
 * Build initial preview state map from generated inserts.
 * L0/L1 goals are always enabled (structural root).
 * L2 goals default to ON but are user-toggleable.
 * L3 dirty_dog goals default to OFF. Niche gap templates default to OFF.
 * FTO path additionally disables abundance-specific L3s.
 */
export function buildPreviewState(
  inserts: BatchGoalInsert[],
  path?: "fto" | "abundance"
): Map<string, PreviewGoalState> {
  const state = new Map<string, PreviewGoalState>()
  for (const insert of inserts) {
    const level = insert.goal_level ?? 0
    const isDirtyDog = insert.display_category === "dirty_dog"
    const isCore = isCorePriority(insert.template_id)
    const isFtoDisabled = path === "fto" && insert.template_id ? FTO_OFF_TEMPLATES.has(insert.template_id) : false
    const entry: PreviewGoalState = {
      enabled: level < 3 || (isCore && !isDirtyDog && !isFtoDisabled),
      targetValue: insert.target_value,
    }
    if (insert.milestone_config && typeof insert.milestone_config === "object") {
      entry.milestoneConfig = insert.milestone_config as unknown as MilestoneLadderConfig
    }
    state.set(insert._tempId, entry)
  }
  return state
}

/**
 * Filter inserts based on preview state.
 * L0/L1 always kept (structural root). L2 filtered by enabled state.
 * L3 filtered by own enabled state AND parent L2 enabled state.
 * Updates target_value and milestone_config.target from state overrides.
 */
export function applyPreviewState(
  inserts: BatchGoalInsert[],
  state: Map<string, PreviewGoalState>
): BatchGoalInsert[] {
  // Build set of disabled L2 tempIds for cascade filtering
  const disabledL2s = new Set<string>()
  for (const insert of inserts) {
    if ((insert.goal_level ?? 0) === 2) {
      const s = state.get(insert._tempId)
      if (s && !s.enabled) disabledL2s.add(insert._tempId)
    }
  }

  return inserts
    .filter((insert) => {
      const level = insert.goal_level ?? 0
      if (level < 2) return true // L0/L1 always included
      if (level === 2) {
        const s = state.get(insert._tempId)
        return s ? s.enabled : true
      }
      // L3: excluded if parent L2 is disabled
      if (insert._tempParentId && disabledL2s.has(insert._tempParentId)) return false
      const s = state.get(insert._tempId)
      return s ? s.enabled : true
    })
    .map((insert) => {
      const s = state.get(insert._tempId)
      if (!s) return insert

      let updated = insert
      if (s.targetValue !== insert.target_value) {
        updated = { ...updated, target_value: s.targetValue }
      }
      if (s.milestoneConfig) {
        updated = { ...updated, milestone_config: { ...s.milestoneConfig, target: updated.target_value } as unknown as Record<string, unknown> }
      } else if (updated !== insert && updated.milestone_config && typeof updated.milestone_config === "object") {
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
 * Generate inserts for the 3 dirty dog goals, parented to the first existing L2 achievement.
 * Returns empty array if no L2 parent exists or all dirty dog goals already exist.
 */
export function generateDirtyDogInserts(
  existingGoals: GoalWithProgress[]
): BatchGoalInsert[] {
  const l2Parent = existingGoals.find((g) => g.goal_level === 2)
  if (!l2Parent) return []

  const dirtyDogTemplates = getTemplatesByCategory().dirty_dog ?? []
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

/**
 * Build batch goal inserts from setup wizard selections.
 *
 * Handles three goal sources:
 * 1. Daygame L3 templates — builds L1→L2→L3 tree with deduplication
 * 2. Life area suggestions — standalone goals from LIFE_AREAS config
 * 3. Custom goals — user-entered standalone goals
 *
 * Returns inserts in creation order (parents before children).
 */
export function buildSetupInserts(selections: GoalSetupSelections): BatchGoalInsert[] {
  const TEMP_PREFIX = "__temp_"
  const inserts: BatchGoalInsert[] = []

  // --- 1. Daygame template L3 goals → build tree with deduped ancestors ---
  const selectedL3Ids = [...selections.selectedGoalIds].filter(
    (id) => GOAL_TEMPLATE_MAP[id]?.level === 3
  )

  if (selectedL3Ids.length > 0) {
    // Find the L1 for the user's chosen path
    const pathL1s = getDaygamePathL1(selections.path)
    const l1 = pathL1s[0]

    if (l1) {
      // Emit L1
      const l1TempId = TEMP_PREFIX + l1.id
      inserts.push(templateToSetupInsert(l1, null))

      // Collect unique L2 parents of all selected L3s
      const l2Map = new Map<string, typeof GOAL_TEMPLATE_MAP[string]>()
      const l3ToL2 = new Map<string, string>()

      for (const l3Id of selectedL3Ids) {
        const parents = getParents(l3Id)
        const l2Parent = parents.find((p) => p.level === 2)
        if (l2Parent) {
          l2Map.set(l2Parent.id, l2Parent)
          l3ToL2.set(l3Id, l2Parent.id)
        }
      }

      // Emit unique L2s
      for (const [, l2] of l2Map) {
        inserts.push(templateToSetupInsert(l2, l1TempId))
      }

      // Emit L3s
      for (const l3Id of selectedL3Ids) {
        const tmpl = GOAL_TEMPLATE_MAP[l3Id]
        if (!tmpl) continue
        const l2Id = l3ToL2.get(l3Id)
        const parentTempId = l2Id ? TEMP_PREFIX + l2Id : l1TempId
        const insert = templateToSetupInsert(tmpl, parentTempId)

        // Apply user overrides
        if (selections.targets[l3Id] !== undefined) {
          insert.target_value = selections.targets[l3Id]
        }
        if (selections.curveConfigs[l3Id]) {
          insert.milestone_config = selections.curveConfigs[l3Id] as unknown as Record<string, unknown>
          insert.target_value = selections.curveConfigs[l3Id].target
          insert.goal_type = "milestone"
        }

        inserts.push(insert)
      }
    }
  }

  // --- 2. Life area suggestion goals → standalone ---
  for (const goalId of selections.selectedGoalIds) {
    const match = goalId.match(/^(.+)_s(\d+)$/)
    if (!match) continue

    const [, areaId, indexStr] = match
    // Skip if this is actually a template ID that matched the pattern
    if (GOAL_TEMPLATE_MAP[goalId]) continue

    const area = LIFE_AREAS.find((a) => a.id === areaId)
    if (!area?.suggestions) continue

    const idx = parseInt(indexStr, 10)
    const suggestion = area.suggestions[idx]
    if (!suggestion) continue

    const insert: BatchGoalInsert = {
      _tempId: `${TEMP_PREFIX}suggestion_${goalId}`,
      _tempParentId: null,
      title: suggestion.title,
      category: areaId,
      life_area: areaId,
      target_value: selections.targets[goalId] ?? suggestion.defaultTarget,
      period: suggestion.defaultPeriod,
      tracking_type: "counter",
      goal_type: "recurring",
      goal_level: 3,
    }

    if (suggestion.linkedMetric) {
      insert.linked_metric = suggestion.linkedMetric as LinkedMetric
    }

    inserts.push(insert)
  }

  // --- 3. Custom goals → standalone ---
  for (const cg of selections.customGoals) {
    if (!cg.title.trim()) continue

    inserts.push({
      _tempId: `${TEMP_PREFIX}custom_${cg.id}`,
      _tempParentId: null,
      title: cg.title.trim(),
      category: cg.categoryId,
      life_area: "custom",
      target_value: selections.targets[cg.id] ?? cg.target,
      period: cg.period as "daily" | "weekly" | "monthly",
      tracking_type: "counter",
      goal_type: "recurring",
      goal_level: 3,
    })
  }

  return inserts
}

function templateToSetupInsert(
  tmpl: typeof GOAL_TEMPLATE_MAP[string],
  tempParentId: string | null
): BatchGoalInsert {
  const TEMP_PREFIX = "__temp_"
  const base: BatchGoalInsert = {
    _tempId: TEMP_PREFIX + tmpl.id,
    _tempParentId: tempParentId,
    title: tmpl.title,
    category: tmpl.lifeArea,
    life_area: tmpl.lifeArea,
    goal_nature: tmpl.nature,
    display_category: tmpl.displayCategory ?? undefined,
    goal_level: tmpl.level,
    template_id: tmpl.id,
    target_value: 1,
    tracking_type: "counter",
    goal_type: "milestone",
    period: "weekly",
  }

  if (tmpl.templateType === "milestone_ladder" && tmpl.defaultMilestoneConfig) {
    base.target_value = tmpl.defaultMilestoneConfig.target
    base.goal_type = "milestone"
    base.milestone_config = tmpl.defaultMilestoneConfig as unknown as Record<string, unknown>
  } else if (tmpl.templateType === "habit_ramp" && tmpl.defaultRampSteps) {
    base.target_value = tmpl.defaultRampSteps[0].frequencyPerWeek
    base.goal_type = "habit_ramp"
    base.period = "weekly"
    base.ramp_steps = tmpl.defaultRampSteps as unknown as Record<string, unknown>[]
  }

  if (tmpl.linkedMetric) {
    base.linked_metric = tmpl.linkedMetric
  }

  return base
}
