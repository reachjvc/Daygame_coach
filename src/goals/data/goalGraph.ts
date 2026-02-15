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

// --- Level 1: Major Life Goals ---
const L1_ONE_PERSON: GoalTemplate[] = [
  template("l1_girlfriend", "Get a girlfriend", 1, "outcome"),
  template("l1_dream_girl", "Find my dream girl", 1, "outcome"),
  template("l1_engaged", "Get engaged to my dream girl", 1, "outcome"),
  template("l1_relationship", "Be in a deeply fulfilling relationship", 1, "outcome"),
  template("l1_the_one", "Get married", 1, "outcome"),
  template("l1_family", "Start a happy and loving family", 1, "outcome"),
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
  // Existing
  template("l2_master_daygame", "Master Daygame", 2, "outcome"),
  template("l2_confident", "Become Confident with Women", 2, "outcome"),
  // New — Daygame-focused
  template("l2_overcome_aa", "Overcome Approach Anxiety Permanently", 2, "outcome"),
  template("l2_master_cold_approach", "Master Cold Approach", 2, "outcome"),
  template("l2_great_talker", "Become Great at Talking to Women", 2, "outcome"),
  template("l2_master_seduction", "Master Seduction & Attraction", 2, "outcome"),
  template("l2_attract_any", "Be Able to Attract Any Woman I Want", 2, "outcome"),
  // New — Dating-focused
  template("l2_master_dating", "Master Dating", 2, "outcome"),
  template("l2_master_texting", "Master Texting Game", 2, "outcome"),
  template("l2_dating_freedom", "Have Total Dating Freedom", 2, "outcome"),
]

// --- Level 3: Specific Skills & Metrics ---
const CURVE_TENSION = 0 // default balanced (geometric) curve

// -- Daygame: Field Work (existing) --
const L3_FIELD_WORK: GoalTemplate[] = [
  template("l3_approach_volume", "Approach Volume", 3, "input", {
    displayCategory: "field_work",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 1000, steps: 15, curveTension: CURVE_TENSION },
    linkedMetric: "approaches_cumulative",
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
  // New field work L3s
  template("l3_hours_in_field", "Hours in Field", 3, "input", {
    displayCategory: "field_work",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 500, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_voice_notes", "Voice Notes / Field Reports", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
  }),
  template("l3_approach_quality", "Approach Quality Self-Rating", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
  }),
  template("l3_open_in_3_seconds", "Open in <3 Seconds", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 10, durationWeeks: 12 },
      { frequencyPerWeek: 15, durationWeeks: 24 },
    ],
  }),
  template("l3_solo_sessions", "Solo Sessions", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
  }),
]

// -- Daygame: Results --
const L3_RESULTS: GoalTemplate[] = [
  template("l3_phone_numbers", "Phone Numbers", 3, "outcome", {
    displayCategory: "results",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 25, steps: 6, curveTension: CURVE_TENSION },
    linkedMetric: "numbers_cumulative",
  }),
  template("l3_instadates", "Instadates", 3, "outcome", {
    displayCategory: "results",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
    linkedMetric: "instadates_cumulative",
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

// -- Daygame: Dirty Dog --
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

// -- Dating: Texting --
const L3_TEXTING: GoalTemplate[] = [
  template("l3_texting_initiated", "Texting Conversations Initiated", 3, "input", {
    displayCategory: "texting",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
  template("l3_number_to_date_conversion", "Numbers Converted to Dates", 3, "outcome", {
    displayCategory: "texting",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 15, steps: 6, curveTension: CURVE_TENSION },
  }),
  template("l3_response_rate", "Texts That Got Replies", 3, "outcome", {
    displayCategory: "texting",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 25, steps: 6, curveTension: CURVE_TENSION },
  }),
]

// -- Dating: Dates --
const L3_DATES: GoalTemplate[] = [
  template("l3_dates_planned", "Dates Planned & Executed", 3, "input", {
    displayCategory: "dates",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
  }),
  template("l3_date_to_second_date", "Second Dates Achieved", 3, "outcome", {
    displayCategory: "dates",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
  }),
  template("l3_creative_dates", "Creative Date Ideas Tried", 3, "outcome", {
    displayCategory: "dates",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
  }),
  template("l3_physical_escalation", "Physical Escalation on Dates", 3, "outcome", {
    displayCategory: "dates",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
  }),
]

// -- Dating: Relationship --
const L3_RELATIONSHIP: GoalTemplate[] = [
  template("l3_women_dating", "Women Currently Dating", 3, "outcome", {
    displayCategory: "relationship",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 5, steps: 5, curveTension: 0 },
  }),
]

// ============================================================================
// Full Catalog
// ============================================================================

const ALL_L3 = [
  ...L3_FIELD_WORK, ...L3_RESULTS, ...L3_DIRTY_DOG,
  ...L3_TEXTING, ...L3_DATES, ...L3_RELATIONSHIP,
]

export const GOAL_TEMPLATES: GoalTemplate[] = [
  ...L1_ONE_PERSON,
  ...L1_ABUNDANCE,
  ...L2_TEMPLATES,
  ...ALL_L3,
]

export const GOAL_TEMPLATE_MAP: Record<string, GoalTemplate> =
  Object.fromEntries(GOAL_TEMPLATES.map((t) => [t.id, t]))

// ============================================================================
// Fan-Out Edges
// ============================================================================

// L1 → L2: all L1 goals fan into all achievements
const L1_TO_L2_EDGES: GoalGraphEdge[] = [...L1_ONE_PERSON, ...L1_ABUNDANCE].flatMap((l1) =>
  L2_TEMPLATES.map((l2) => ({
    parentId: l1.id,
    childId: l2.id,
  }))
)

// L2 → L3: per-L2 connections — each L2 links to the L3s relevant to that transformation
const L2_L3_CONNECTIONS: Record<string, string[]> = {
  // Master Daygame — broad, results-heavy
  l2_master_daygame: [
    // field work
    "l3_approach_volume", "l3_approach_frequency", "l3_session_frequency", "l3_consecutive_days",
    "l3_hours_in_field", "l3_voice_notes", "l3_approach_quality", "l3_open_in_3_seconds", "l3_solo_sessions",
    // results
    "l3_phone_numbers", "l3_instadates", "l3_dates", "l3_second_dates",
    // dirty dog
    "l3_kiss_closes", "l3_lays", "l3_rotation_size", "l3_sustained_rotation",
  ],
  // Become Confident — exposure/consistency-heavy
  l2_confident: [
    "l3_approach_volume", "l3_approach_frequency", "l3_session_frequency", "l3_consecutive_days",
    "l3_hours_in_field", "l3_solo_sessions",
    "l3_phone_numbers", "l3_instadates", "l3_dates", "l3_second_dates",
  ],
  // Overcome AA — pure exposure
  l2_overcome_aa: [
    "l3_approach_volume", "l3_consecutive_days", "l3_solo_sessions",
  ],
  // Master Cold Approach — technique + quality
  l2_master_cold_approach: [
    "l3_approach_volume", "l3_approach_frequency", "l3_approach_quality", "l3_open_in_3_seconds",
    "l3_phone_numbers", "l3_instadates",
  ],
  // Become Great at Talking — conversation/conversion
  l2_great_talker: [
    "l3_phone_numbers", "l3_instadates", "l3_dates",
    "l3_response_rate", "l3_voice_notes",
  ],
  // Master Seduction — escalation
  l2_master_seduction: [
    "l3_kiss_closes", "l3_lays", "l3_physical_escalation",
    "l3_dates", "l3_second_dates",
  ],
  // Attract Any Woman — broadest, everything
  l2_attract_any: ALL_L3.map((t) => t.id),
  // Master Texting — texting metrics
  l2_master_texting: [
    "l3_texting_initiated", "l3_response_rate", "l3_number_to_date_conversion",
  ],
  // Master Dating — date execution
  l2_master_dating: [
    "l3_dates_planned", "l3_date_to_second_date", "l3_creative_dates", "l3_physical_escalation",
  ],
  // Total Dating Freedom — abundance
  l2_dating_freedom: [
    "l3_women_dating", "l3_dates_planned", "l3_rotation_size", "l3_sustained_rotation",
  ],
}

const L2_TO_L3_EDGES: GoalGraphEdge[] = Object.entries(L2_L3_CONNECTIONS).flatMap(
  ([l2Id, l3Ids]) => l3Ids.map((l3Id) => ({ parentId: l2Id, childId: l3Id }))
)

export const GOAL_GRAPH_EDGES: GoalGraphEdge[] = [
  ...L1_TO_L2_EDGES,
  ...L2_TO_L3_EDGES,
]

// ============================================================================
// Achievement Weights — per-L2, each sums to 1.0
// ============================================================================

const PER_L2_WEIGHTS: Record<string, Record<string, number>> = {
  // Master Daygame — results-heavy (17 L3s)
  l2_master_daygame: {
    l3_approach_volume: 0.15,
    l3_approach_frequency: 0.06,
    l3_session_frequency: 0.04,
    l3_consecutive_days: 0.03,
    l3_hours_in_field: 0.06,
    l3_voice_notes: 0.03,
    l3_approach_quality: 0.05,
    l3_open_in_3_seconds: 0.03,
    l3_solo_sessions: 0.03,
    l3_phone_numbers: 0.12,
    l3_instadates: 0.08,
    l3_dates: 0.08,
    l3_second_dates: 0.05,
    l3_kiss_closes: 0.05,
    l3_lays: 0.07,
    l3_rotation_size: 0.035,
    l3_sustained_rotation: 0.035,
  },
  // Become Confident — exposure/consistency-heavy (10 L3s)
  l2_confident: {
    l3_approach_volume: 0.20,
    l3_approach_frequency: 0.10,
    l3_session_frequency: 0.10,
    l3_consecutive_days: 0.10,
    l3_hours_in_field: 0.10,
    l3_solo_sessions: 0.10,
    l3_phone_numbers: 0.10,
    l3_instadates: 0.07,
    l3_dates: 0.07,
    l3_second_dates: 0.06,
  },
  // Overcome AA — exposure-heavy (3 L3s)
  l2_overcome_aa: {
    l3_approach_volume: 0.50,
    l3_consecutive_days: 0.30,
    l3_solo_sessions: 0.20,
  },
  // Master Cold Approach — technique + quality (6 L3s)
  l2_master_cold_approach: {
    l3_approach_volume: 0.15,
    l3_approach_frequency: 0.15,
    l3_approach_quality: 0.25,
    l3_open_in_3_seconds: 0.20,
    l3_phone_numbers: 0.15,
    l3_instadates: 0.10,
  },
  // Become Great at Talking — conversion-heavy (5 L3s)
  l2_great_talker: {
    l3_phone_numbers: 0.20,
    l3_instadates: 0.20,
    l3_dates: 0.25,
    l3_response_rate: 0.20,
    l3_voice_notes: 0.15,
  },
  // Master Seduction — escalation-heavy (5 L3s)
  l2_master_seduction: {
    l3_kiss_closes: 0.15,
    l3_lays: 0.25,
    l3_physical_escalation: 0.25,
    l3_dates: 0.20,
    l3_second_dates: 0.15,
  },
  // Attract Any Woman — broad (all 25 L3s)
  l2_attract_any: {
    l3_approach_volume: 0.06,
    l3_approach_frequency: 0.04,
    l3_session_frequency: 0.03,
    l3_consecutive_days: 0.03,
    l3_hours_in_field: 0.04,
    l3_voice_notes: 0.02,
    l3_approach_quality: 0.04,
    l3_open_in_3_seconds: 0.03,
    l3_solo_sessions: 0.03,
    l3_phone_numbers: 0.06,
    l3_instadates: 0.05,
    l3_dates: 0.05,
    l3_second_dates: 0.04,
    l3_kiss_closes: 0.04,
    l3_lays: 0.06,
    l3_rotation_size: 0.03,
    l3_sustained_rotation: 0.03,
    l3_texting_initiated: 0.03,
    l3_number_to_date_conversion: 0.04,
    l3_response_rate: 0.03,
    l3_dates_planned: 0.04,
    l3_date_to_second_date: 0.04,
    l3_creative_dates: 0.03,
    l3_physical_escalation: 0.05,
    l3_women_dating: 0.06,
  },
  // Master Texting — texting conversion (3 L3s)
  l2_master_texting: {
    l3_texting_initiated: 0.30,
    l3_response_rate: 0.30,
    l3_number_to_date_conversion: 0.40,
  },
  // Master Dating — date execution (4 L3s)
  l2_master_dating: {
    l3_dates_planned: 0.30,
    l3_date_to_second_date: 0.25,
    l3_creative_dates: 0.15,
    l3_physical_escalation: 0.30,
  },
  // Total Dating Freedom — abundance (4 L3s)
  l2_dating_freedom: {
    l3_women_dating: 0.30,
    l3_dates_planned: 0.25,
    l3_rotation_size: 0.25,
    l3_sustained_rotation: 0.20,
  },
}

export const DEFAULT_ACHIEVEMENT_WEIGHTS: DefaultAchievementWeight[] =
  Object.entries(PER_L2_WEIGHTS).flatMap(([l2Id, weights]) =>
    Object.entries(weights).map(([goalId, weight]) => ({
      achievementId: l2Id,
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
    texting: L3_TEXTING,
    dates: L3_DATES,
    relationship: L3_RELATIONSHIP,
  }
}

// ============================================================================
// Catalog groupings for the picker UI
// ============================================================================

export function getCatalogGroups(): {
  onePerson: GoalTemplate[]
  abundance: GoalTemplate[]
} {
  return {
    onePerson: L1_ONE_PERSON,
    abundance: L1_ABUNDANCE,
  }
}

/**
 * Return all daygame goal templates organized by tier for the catalog picker.
 */
export function getCatalogTiers(): {
  tier1: { onePerson: GoalTemplate[]; abundance: GoalTemplate[] }
  tier2: GoalTemplate[]
  tier3: Record<GoalDisplayCategory, GoalTemplate[]>
} {
  return {
    tier1: { onePerson: L1_ONE_PERSON, abundance: L1_ABUNDANCE },
    tier2: L2_TEMPLATES,
    tier3: getTemplatesByCategory(),
  }
}
