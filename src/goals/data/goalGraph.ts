/**
 * Static goal graph catalog — templates, edges, achievement weights, and defaults.
 *
 * This is the "brain" behind "Just get me started": user picks one goal,
 * system traverses this graph to generate a full goal tree with sensible defaults.
 *
 * All data is static — no DB calls. Goal templates map to user_goals rows at creation time.
 */

import type {
  GoalTemplate,
  GoalGraphEdge,
  DefaultAchievementWeight,
  GoalDisplayCategory,
  GoalGraphLevel,
  GoalTemplateType,
  MilestoneLadderConfig,
  HabitRampStep,
  AchievementWeight,
} from "../types"
import type { LinkedMetric } from "@/src/db/goalTypes"

// ============================================================================
// Helper to reduce boilerplate
// ============================================================================

function template(
  id: string,
  title: string,
  level: GoalGraphLevel,
  nature: "input" | "outcome",
  opts: {
    displayCategory?: GoalDisplayCategory
    templateType?: GoalTemplateType
    milestoneConfig?: MilestoneLadderConfig
    rampSteps?: HabitRampStep[]
    linkedMetric?: LinkedMetric
  } = {}
): GoalTemplate {
  return {
    id,
    title,
    level,
    nature,
    displayCategory: opts.displayCategory ?? null,
    templateType: opts.templateType ?? null,
    defaultMilestoneConfig: opts.milestoneConfig ?? null,
    defaultRampSteps: opts.rampSteps ?? null,
    linkedMetric: opts.linkedMetric ?? null,
  }
}

// ============================================================================
// Goal Templates
// ============================================================================

// --- Level 0: Life Dreams ---
const L0_TEMPLATES: GoalTemplate[] = [
  template("dream_marry", "Get married to my dream girl", 0, "outcome"),
  template("dream_family", "Start a happy and loving family", 0, "outcome"),
  template("dream_love", "Find the love of my life", 0, "outcome"),
]

// --- Level 1: Major Life Goals ---
const L1_ONE_PERSON: GoalTemplate[] = [
  template("l1_girlfriend", "Get a girlfriend", 1, "outcome"),
  template("l1_dream_girl", "Find my dream girl", 1, "outcome"),
  template("l1_engaged", "Get engaged to my dream girl", 1, "outcome"),
  template("l1_relationship", "Be in a deeply fulfilling relationship", 1, "outcome"),
  template("l1_the_one", "Find \"the one\"", 1, "outcome"),
]

const L1_ABUNDANCE: GoalTemplate[] = [
  template("l1_rotation", "Build a rotation", 1, "outcome"),
  template("l1_abundant", "Have an abundant dating life", 1, "outcome"),
  template("l1_sleep_x", "Sleep with X women", 1, "outcome"),
  template("l1_attractive_women", "Date very attractive women", 1, "outcome"),
  template("l1_casual", "Have casual options whenever I want", 1, "outcome"),
  template("l1_variety", "Experience variety before settling down", 1, "outcome"),
]

// --- Level 2: Achievements (badges) ---
const L2_TEMPLATES: GoalTemplate[] = [
  template("l2_master_daygame", "Master Daygame", 2, "outcome"),
  template("l2_confident", "Become Confident with Women", 2, "outcome"),
]

// --- Level 3: Specific Skills & Metrics ---
const CURVE_TENSION = 5 // default front-loaded curve

const L3_FIELD_WORK: GoalTemplate[] = [
  template("l3_approach_volume", "Approach Volume", 3, "input", {
    displayCategory: "field_work",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 1000, steps: 15, curveTension: CURVE_TENSION },
    linkedMetric: "approaches_weekly",
  }),
  template("l3_approach_frequency", "Approach Frequency", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 10, durationWeeks: 12 },
      { frequencyPerWeek: 15, durationWeeks: 12 },
      { frequencyPerWeek: 25, durationWeeks: 24 },
    ],
    linkedMetric: "approaches_weekly",
  }),
  template("l3_session_frequency", "Session Frequency", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 48 },
    ],
    linkedMetric: "sessions_weekly",
  }),
  template("l3_consecutive_days", "Consecutive Days Approaching", 3, "input", {
    displayCategory: "field_work",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 30, steps: 8, curveTension: CURVE_TENSION },
  }),
]

const L3_RESULTS: GoalTemplate[] = [
  template("l3_phone_numbers", "Phone Numbers", 3, "outcome", {
    displayCategory: "results",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 25, steps: 6, curveTension: CURVE_TENSION },
    linkedMetric: "numbers_weekly",
  }),
  template("l3_instadates", "Instadates", 3, "outcome", {
    displayCategory: "results",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
    linkedMetric: "instadates_weekly",
  }),
  template("l3_dates", "Dates from Cold Approach", 3, "outcome", {
    displayCategory: "results",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 15, steps: 6, curveTension: CURVE_TENSION },
  }),
  template("l3_second_dates", "Second Dates", 3, "outcome", {
    displayCategory: "results",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
  }),
]

const L3_DIRTY_DOG: GoalTemplate[] = [
  template("l3_kiss_closes", "Kiss Closes", 3, "outcome", {
    displayCategory: "dirty_dog",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 15, steps: 6, curveTension: CURVE_TENSION },
  }),
  template("l3_lays", "Lays from Daygame", 3, "outcome", {
    displayCategory: "dirty_dog",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
  }),
  template("l3_rotation_size", "Rotation Size", 3, "outcome", {
    displayCategory: "dirty_dog",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 3, steps: 3, curveTension: 0 },
  }),
  template("l3_sustained_rotation", "Sustained Rotation", 3, "outcome", {
    displayCategory: "dirty_dog",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 4 },
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 1, durationWeeks: 12 },
    ],
  }),
]

// ============================================================================
// Full Catalog
// ============================================================================

export const GOAL_TEMPLATES: GoalTemplate[] = [
  ...L0_TEMPLATES,
  ...L1_ONE_PERSON,
  ...L1_ABUNDANCE,
  ...L2_TEMPLATES,
  ...L3_FIELD_WORK,
  ...L3_RESULTS,
  ...L3_DIRTY_DOG,
]

export const GOAL_TEMPLATE_MAP: Record<string, GoalTemplate> =
  Object.fromEntries(GOAL_TEMPLATES.map((t) => [t.id, t]))

// ============================================================================
// Fan-Out Edges
// ============================================================================

// L0 → L1: aspirational, all L0 goals fan into all L1 goals of same flavor
// Not critical for v1 — users enter at L1/L2. Included for completeness.

const L0_TO_L1_EDGES: GoalGraphEdge[] = L0_TEMPLATES.flatMap((l0) =>
  [...L1_ONE_PERSON, ...L1_ABUNDANCE].map((l1) => ({
    parentId: l0.id,
    childId: l1.id,
  }))
)

// L1 → L2: all L1 goals fan into both achievements
const L1_TO_L2_EDGES: GoalGraphEdge[] = [...L1_ONE_PERSON, ...L1_ABUNDANCE].flatMap((l1) =>
  L2_TEMPLATES.map((l2) => ({
    parentId: l1.id,
    childId: l2.id,
  }))
)

// L2 → L3: both achievements fan into all L3 goals (same set in v1)
const ALL_L3 = [...L3_FIELD_WORK, ...L3_RESULTS, ...L3_DIRTY_DOG]

const L2_TO_L3_EDGES: GoalGraphEdge[] = L2_TEMPLATES.flatMap((l2) =>
  ALL_L3.map((l3) => ({
    parentId: l2.id,
    childId: l3.id,
  }))
)

export const GOAL_GRAPH_EDGES: GoalGraphEdge[] = [
  ...L0_TO_L1_EDGES,
  ...L1_TO_L2_EDGES,
  ...L2_TO_L3_EDGES,
]

// ============================================================================
// Achievement Weights (v1: same weights for both achievements)
// ============================================================================

const BASE_ACHIEVEMENT_WEIGHTS: Record<string, number> = {
  l3_approach_volume: 0.50,
  l3_approach_frequency: 0.08,
  l3_session_frequency: 0.04,
  l3_consecutive_days: 0.03,
  l3_phone_numbers: 0.10,
  l3_instadates: 0.07,
  l3_dates: 0.07,
  l3_second_dates: 0.03,
  l3_kiss_closes: 0.02,
  l3_lays: 0.03,
  l3_rotation_size: 0.015,
  l3_sustained_rotation: 0.015,
}

export const DEFAULT_ACHIEVEMENT_WEIGHTS: DefaultAchievementWeight[] =
  L2_TEMPLATES.flatMap((l2) =>
    Object.entries(BASE_ACHIEVEMENT_WEIGHTS).map(([goalId, weight]) => ({
      achievementId: l2.id,
      goalId,
      weight,
    }))
  )

// ============================================================================
// Graph Traversal Helpers
// ============================================================================

/**
 * Get immediate children of a template in the goal graph.
 */
export function getChildren(parentId: string): GoalTemplate[] {
  const childIds = GOAL_GRAPH_EDGES
    .filter((e) => e.parentId === parentId)
    .map((e) => e.childId)
  return childIds.map((id) => GOAL_TEMPLATE_MAP[id]).filter(Boolean)
}

/**
 * Get all L3 (leaf) descendants of any template — the actual work goals.
 * Traverses the graph recursively until it hits level 3.
 */
export function getLeafGoals(templateId: string): GoalTemplate[] {
  const tmpl = GOAL_TEMPLATE_MAP[templateId]
  if (!tmpl) return []
  if (tmpl.level === 3) return [tmpl]

  const children = getChildren(templateId)
  const leaves: GoalTemplate[] = []
  const seen = new Set<string>()

  for (const child of children) {
    if (seen.has(child.id)) continue
    seen.add(child.id)
    if (child.level === 3) {
      leaves.push(child)
    } else {
      for (const leaf of getLeafGoals(child.id)) {
        if (!seen.has(leaf.id)) {
          seen.add(leaf.id)
          leaves.push(leaf)
        }
      }
    }
  }

  return leaves
}

/**
 * Get achievement weights for an L2 goal, with auto-redistribution.
 * Pass activeGoalIds to exclude removed goals — weights redistribute proportionally.
 */
export function getAchievementWeights(
  achievementId: string,
  activeGoalIds?: Set<string>
): AchievementWeight[] {
  const allWeights = DEFAULT_ACHIEVEMENT_WEIGHTS
    .filter((w) => w.achievementId === achievementId)

  if (!activeGoalIds) {
    return allWeights.map((w) => ({ goalId: w.goalId, weight: w.weight }))
  }

  return redistributeWeights(
    allWeights.map((w) => ({ goalId: w.goalId, weight: w.weight })),
    activeGoalIds
  )
}

/**
 * Redistribute weights proportionally when some goals are removed.
 * Removed goals' weight is redistributed across remaining goals so total = 1.
 */
export function redistributeWeights(
  weights: AchievementWeight[],
  activeGoalIds: Set<string>
): AchievementWeight[] {
  const active = weights.filter((w) => activeGoalIds.has(w.goalId))
  if (active.length === 0) return []

  const totalActive = active.reduce((sum, w) => sum + w.weight, 0)
  if (totalActive === 0) return active

  return active.map((w) => ({
    goalId: w.goalId,
    weight: w.weight / totalActive,
  }))
}

/**
 * Get all L3 templates grouped by display category.
 */
export function getTemplatesByCategory(): Record<GoalDisplayCategory, GoalTemplate[]> {
  return {
    field_work: L3_FIELD_WORK,
    results: L3_RESULTS,
    dirty_dog: L3_DIRTY_DOG,
  }
}

// ============================================================================
// Catalog groupings for the picker UI
// ============================================================================

export function getCatalogGroups(): {
  lifeDreams: GoalTemplate[]
  onePerson: GoalTemplate[]
  abundance: GoalTemplate[]
} {
  return {
    lifeDreams: L0_TEMPLATES,
    onePerson: L1_ONE_PERSON,
    abundance: L1_ABUNDANCE,
  }
}
