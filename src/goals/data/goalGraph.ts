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
  CrossAreaEdge,
  GoalTemplateType,
  GoalPriority,
  MilestoneLadderConfig,
  HabitRampStep,
  AchievementWeight,
  BadgeConfig,
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
    lifeArea?: string
    displayCategory?: GoalDisplayCategory
    templateType?: GoalTemplateType
    milestoneConfig?: MilestoneLadderConfig
    rampSteps?: HabitRampStep[]
    linkedMetric?: LinkedMetric
    priority?: GoalPriority
    requiresOptIn?: boolean
    graduation_criteria?: string | null
    blindSpotTool?: boolean
  } = {}
): GoalTemplate {
  // L0/L1/L2 are structural — always "core". L3 defaults to "progressive".
  const defaultPriority: GoalPriority = level < 3 ? "core" : "progressive"

  return {
    id,
    title,
    level,
    nature,
    lifeArea: opts.lifeArea ?? "daygame",
    displayCategory: opts.displayCategory ?? null,
    templateType: opts.templateType ?? null,
    defaultMilestoneConfig: opts.milestoneConfig ?? null,
    defaultRampSteps: opts.rampSteps ?? null,
    linkedMetric: opts.linkedMetric ?? null,
    priority: opts.priority ?? defaultPriority,
    requiresOptIn: opts.requiresOptIn ?? false,
    graduation_criteria: opts.graduation_criteria ?? null,
    blindSpotTool: opts.blindSpotTool ?? false,
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
  template("l1_the_one", "Get married", 1, "outcome", { requiresOptIn: true }),
  template("l1_family", "Start a happy and loving family", 1, "outcome", { requiresOptIn: true }),
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
  template("l2_approach", "Approach Legend", 2, "outcome"),
  template("l2_results", "Results Legend", 2, "outcome"),
  template("l2_tongue", "Mythic Tongue", 2, "outcome"),
  template("l2_text", "Text God", 2, "outcome"),
  template("l2_date", "Date Architect", 2, "outcome"),
  template("l2_seduction", "Seduction Legend", 2, "outcome"),
  template("l2_inner", "Inner God", 2, "outcome"),
  template("l2_life", "Mythic Life", 2, "outcome"),
  template("l2_grinder", "Mythic Grinder", 2, "outcome"),
  template("l2_self", "Self Myth", 2, "outcome"),
  template("l2_opener", "Mythic Opener", 2, "outcome"),
  template("l2_pipeline", "Pipeline Myth", 2, "outcome"),
  template("l2_training", "Mythic Student", 2, "outcome"),
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
    priority: "core",
    graduation_criteria: "Reached 1000+ lifetime approaches",
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
    priority: "core",
    graduation_criteria: "Consistently averaging 20+ approaches/week for 8+ weeks",
  }),
  template("l3_session_frequency", "Session Frequency", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 48 },
    ],
    linkedMetric: "sessions_weekly",
    priority: "core",
    graduation_criteria: "Consistently hitting 3+ sessions/week for 8+ weeks",
  }),
  // New field work L3s
  template("l3_voice_notes", "Voice Notes / Field Reports", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
    linkedMetric: "field_reports_weekly",
  }),
  template("l3_approach_quality", "High-Quality Approaches", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 4, durationWeeks: 12 },
      { frequencyPerWeek: 6, durationWeeks: 24 },
    ],
    linkedMetric: "approach_quality_avg_weekly",
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
  // Gap templates — available in catalog, default OFF in preview
  template("l3_venues_explored", "New Approach Venues Tried", 3, "input", {
    displayCategory: "field_work",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 20, steps: 8, curveTension: CURVE_TENSION },
    priority: "niche",
  }),
  template("l3_daygame_weekly_review", "Daygame Weekly Reviews", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 48 },
    ],
  }),
  template("l3_visualization", "Visualization Practice", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 8 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
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
    priority: "core",
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
    milestoneConfig: { start: 1, target: 25, steps: 8, curveTension: CURVE_TENSION },
  }),
  template("l3_pull_attempts", "Pull Attempts", 3, "input", {
    displayCategory: "dirty_dog",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
  }),
  template("l3_lays", "Lays from Daygame", 3, "outcome", {
    displayCategory: "dirty_dog",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
  }),
  template("l3_same_day_lays", "Same-Day Lays", 3, "outcome", {
    displayCategory: "dirty_dog",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 5, steps: 5, curveTension: CURVE_TENSION },
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
  template("l3_response_rate", "First Messages That Got a Reply", 3, "outcome", {
    displayCategory: "texting",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 50, steps: 8, curveTension: CURVE_TENSION },
  }),
]

// -- Dating: Dates --
const L3_DATES: GoalTemplate[] = [
  template("l3_dates_planned", "Weekly Dating Activity", 3, "input", {
    displayCategory: "dates",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
  }),
  template("l3_creative_dates", "Creative Date Ideas Tried", 3, "outcome", {
    displayCategory: "dates",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
  }),
  // Gap templates
  template("l3_date_spots", "Date Spot Repertoire", 3, "input", {
    displayCategory: "dates",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 15, steps: 6, curveTension: CURVE_TENSION },
    priority: "niche",
  }),
  template("l3_date_leadership", "Dates Where I Led All Logistics", 3, "input", {
    displayCategory: "dates",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
]

// -- Daygame: Scenario Practice --
const L3_SCENARIOS: GoalTemplate[] = [
  template("l3_scenario_sessions", "Scenario Practice Sessions", 3, "input", {
    displayCategory: "scenarios",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 500, steps: 12, curveTension: CURVE_TENSION },
    linkedMetric: "scenario_sessions_cumulative",
    priority: "progressive",
  }),
  template("l3_scenario_types_tried", "Unique Scenario Types Practiced", 3, "outcome", {
    displayCategory: "scenarios",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 19, steps: 8, curveTension: CURVE_TENSION },
    linkedMetric: "scenario_types_cumulative",
    priority: "progressive",
  }),
  template("l3_scenario_high_scores", "High-Scoring Sessions (7+/10)", 3, "outcome", {
    displayCategory: "scenarios",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 200, steps: 10, curveTension: CURVE_TENSION },
    linkedMetric: "scenario_high_scores_cumulative",
    priority: "progressive",
  }),
]

// -- Dating: Relationship --
const L3_RELATIONSHIP: GoalTemplate[] = [
  template("l3_women_dating", "Active Rotation / Women Dating", 3, "outcome", {
    displayCategory: "relationship",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
  }),
]

// ============================================================================
// PERSONAL GROWTH — Templates
// ============================================================================

const PG = "personal_growth" // life area shorthand

// --- Personal Growth: Level 1 ---
const L1_PERSONAL_GROWTH: GoalTemplate[] = [
  template("l1_pg_best_self", "Become the best version of myself", 1, "outcome", { lifeArea: PG }),
  template("l1_pg_inner_peace", "Achieve deep inner peace", 1, "outcome", { lifeArea: PG }),
  template("l1_pg_unshakeable", "Build unshakeable confidence from within", 1, "outcome", { lifeArea: PG }),
  template("l1_pg_self_aware", "Develop mastery-level self-awareness", 1, "outcome", { lifeArea: PG }),
  template("l1_pg_emotions", "Master my emotions and mindset", 1, "outcome", { lifeArea: PG }),
]

// --- Personal Growth: Level 2 (Achievements) ---
const L2_PG_TEMPLATES: GoalTemplate[] = [
  template("l2_pg_mindfulness", "Master Mindfulness & Presence", 2, "outcome", { lifeArea: PG }),
  template("l2_pg_toughness", "Build Mental Toughness & Resilience", 2, "outcome", { lifeArea: PG }),
  template("l2_pg_well_read", "Become Well-Read & Knowledgeable", 2, "outcome", { lifeArea: PG }),
  template("l2_pg_reflection", "Master Journaling & Self-Reflection", 2, "outcome", { lifeArea: PG }),
  template("l2_pg_eq", "Develop Emotional Intelligence", 2, "outcome", { lifeArea: PG }),
  template("l2_pg_discipline", "Build Iron Discipline", 2, "outcome", { lifeArea: PG }),
]

// --- Personal Growth: Level 3 ---

// -- Mindfulness (2 habit_ramp + 2 milestone_ladder) --
const L3_PG_MINDFULNESS: GoalTemplate[] = [
  template("l3_pg_meditation", "Daily Meditation", 3, "input", {
    lifeArea: PG, displayCategory: "mindfulness",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 7, durationWeeks: 8 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
    priority: "core",
    graduation_criteria: "Daily meditation habit sustained for 8+ consecutive weeks",
  }),
  template("l3_pg_gratitude", "Gratitude Practice", 3, "input", {
    lifeArea: PG, displayCategory: "mindfulness",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 7, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
  template("l3_pg_meditation_hours", "Total Meditation Hours", 3, "outcome", {
    lifeArea: PG, displayCategory: "mindfulness",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 1000, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_pg_meditation_streak", "Consecutive Meditation Days", 3, "outcome", {
    lifeArea: PG, displayCategory: "mindfulness",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 365, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_pg_breathwork", "Breathwork Sessions", 3, "input", {
    lifeArea: PG, displayCategory: "mindfulness",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 8 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
]

// -- Resilience (2 habit_ramp + 2 milestone_ladder) --
const L3_PG_RESILIENCE: GoalTemplate[] = [
  template("l3_pg_comfort_zone", "Comfort Zone Challenges", 3, "input", {
    lifeArea: PG, displayCategory: "resilience",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
    priority: "core",
    graduation_criteria: "Averaging 3+ comfort zone challenges/week for 8+ weeks",
  }),
  template("l3_pg_cold_exposure", "Cold Exposure", 3, "input", {
    lifeArea: PG, displayCategory: "resilience",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 4 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
  template("l3_pg_challenges_completed", "Total Comfort Zone Challenges", 3, "outcome", {
    lifeArea: PG, displayCategory: "resilience",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 500, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_pg_cold_streak", "Consecutive Cold Exposure Days", 3, "outcome", {
    lifeArea: PG, displayCategory: "resilience",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 100, steps: 8, curveTension: CURVE_TENSION },
  }),
]

// -- Learning (1 habit_ramp + 3 milestone_ladder) --
const L3_PG_LEARNING: GoalTemplate[] = [
  template("l3_pg_books", "Books Completed", 3, "outcome", {
    lifeArea: PG, displayCategory: "learning",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 100, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_pg_courses", "Courses Completed", 3, "outcome", {
    lifeArea: PG, displayCategory: "learning",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 25, steps: 8, curveTension: CURVE_TENSION },
  }),
  template("l3_pg_study_hours", "Study & Learning Hours", 3, "input", {
    lifeArea: PG, displayCategory: "learning",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 8 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 10, durationWeeks: 24 },
    ],
  }),
  template("l3_pg_reading_hours", "Total Reading Hours", 3, "outcome", {
    lifeArea: PG, displayCategory: "learning",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 1000, steps: 12, curveTension: CURVE_TENSION },
  }),
]

// -- Reflection (3 habit_ramp + 1 milestone_ladder) --
const L3_PG_REFLECTION: GoalTemplate[] = [
  template("l3_pg_journal", "Journal Entries", 3, "input", {
    lifeArea: PG, displayCategory: "reflection",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 4 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
    priority: "core",
    graduation_criteria: "Daily journaling habit sustained for 8+ consecutive weeks",
  }),
  template("l3_pg_weekly_reviews", "Weekly Reviews Completed", 3, "input", {
    lifeArea: PG, displayCategory: "reflection",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 48 },
    ],
  }),
  template("l3_pg_therapy", "Therapy or Coaching Sessions", 3, "input", {
    lifeArea: PG, displayCategory: "reflection",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 48 },
    ],
  }),
  template("l3_pg_journal_entries", "Total Journal Entries", 3, "outcome", {
    lifeArea: PG, displayCategory: "reflection",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 1000, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_pg_retreats", "Retreat or Workshop Days", 3, "outcome", {
    lifeArea: PG, displayCategory: "reflection",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 20, steps: 8, curveTension: CURVE_TENSION },
    priority: "niche",
  }),
]

// -- Discipline (1 habit_ramp + 1 milestone_ladder) --
const L3_PG_DISCIPLINE: GoalTemplate[] = [
  template("l3_pg_morning_routine", "Morning Routine Completed", 3, "input", {
    lifeArea: PG, displayCategory: "discipline",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 6, durationWeeks: 8 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
    priority: "core",
    graduation_criteria: "Daily morning routine sustained for 8+ consecutive weeks",
  }),
  template("l3_pg_routine_streak", "Consecutive Perfect Routine Days", 3, "outcome", {
    lifeArea: PG, displayCategory: "discipline",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 365, steps: 10, curveTension: CURVE_TENSION },
  }),
]

const ALL_L3_PG = [
  ...L3_PG_MINDFULNESS, ...L3_PG_RESILIENCE, ...L3_PG_LEARNING,
  ...L3_PG_REFLECTION, ...L3_PG_DISCIPLINE,
]

// ============================================================================
// FITNESS — Templates
// ============================================================================

const FIT = "health_fitness" // life area shorthand

// --- Fitness: Level 1 ---
const L1_FITNESS: GoalTemplate[] = [
  template("l1_f_impressive_physique", "Build an impressive physique", 1, "outcome", { lifeArea: FIT }),
  template("l1_f_strong", "Get seriously strong", 1, "outcome", { lifeArea: FIT }),
  template("l1_f_peak_health", "Achieve peak physical health", 1, "outcome", { lifeArea: FIT }),
  template("l1_f_transform", "Transform my body completely", 1, "outcome", { lifeArea: FIT }),
]

// --- Fitness: Level 2 (Achievements) ---
const L2_FIT_TEMPLATES: GoalTemplate[] = [
  template("l2_f_strength", "Build Real Strength", 2, "outcome", { lifeArea: FIT }),
  template("l2_f_body_comp", "Transform Body Composition", 2, "outcome", { lifeArea: FIT }),
  template("l2_f_nutrition", "Master Nutrition & Recovery", 2, "outcome", { lifeArea: FIT }),
  template("l2_f_training_discipline", "Build Unbreakable Training Discipline", 2, "outcome", { lifeArea: FIT }),
]

// --- Fitness: Level 3 ---

// -- Strength --
const L3_FIT_STRENGTH: GoalTemplate[] = [
  template("l3_f_bench_press", "Bench Press 1RM (kg)", 3, "outcome", {
    lifeArea: FIT, displayCategory: "strength",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 40, target: 140, steps: 12, curveTension: CURVE_TENSION },
    priority: "core",
  }),
  template("l3_f_squat", "Squat 1RM (kg)", 3, "outcome", {
    lifeArea: FIT, displayCategory: "strength",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 60, target: 200, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_f_deadlift", "Deadlift 1RM (kg)", 3, "outcome", {
    lifeArea: FIT, displayCategory: "strength",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 60, target: 220, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_f_overhead_press", "Overhead Press 1RM (kg)", 3, "outcome", {
    lifeArea: FIT, displayCategory: "strength",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 20, target: 100, steps: 10, curveTension: CURVE_TENSION },
    priority: "niche",
  }),
  template("l3_f_pullups", "Pull-ups Max Reps", 3, "outcome", {
    lifeArea: FIT, displayCategory: "strength",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 30, steps: 10, curveTension: CURVE_TENSION },
  }),
]

// -- Training --
const L3_FIT_TRAINING: GoalTemplate[] = [
  template("l3_f_gym_frequency", "Gym Sessions per Week", 3, "input", {
    lifeArea: FIT, displayCategory: "training",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 8 },
      { frequencyPerWeek: 4, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 6, durationWeeks: 24 },
    ],
    priority: "core",
    graduation_criteria: "Consistently hitting 5+ gym sessions/week for 8+ weeks",
  }),
  template("l3_f_total_sessions", "Total Training Sessions", 3, "input", {
    lifeArea: FIT, displayCategory: "training",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 1000, steps: 15, curveTension: CURVE_TENSION },
  }),
  template("l3_f_consecutive_weeks", "Consecutive Weeks Training", 3, "input", {
    lifeArea: FIT, displayCategory: "training",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 52, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_f_training_hours", "Total Hours Training", 3, "input", {
    lifeArea: FIT, displayCategory: "training",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 10, target: 1000, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_f_cardio_sessions", "Cardio Sessions per Week", 3, "input", {
    lifeArea: FIT, displayCategory: "training",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
  }),
  template("l3_f_combat_sports", "Combat Sports Sessions", 3, "input", {
    lifeArea: FIT, displayCategory: "training",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 8 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 4, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
]

// -- Nutrition --
const L3_FIT_NUTRITION: GoalTemplate[] = [
  template("l3_f_protein", "Protein Target Hit", 3, "input", {
    lifeArea: FIT, displayCategory: "nutrition",
    priority: "core",
    graduation_criteria: "Hitting protein target 7 days/week for 8+ consecutive weeks",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 6, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
  template("l3_f_meals_prepped", "Meals Prepped", 3, "input", {
    lifeArea: FIT, displayCategory: "nutrition",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 8 },
      { frequencyPerWeek: 10, durationWeeks: 12 },
      { frequencyPerWeek: 15, durationWeeks: 24 },
    ],
  }),
  template("l3_f_water", "Water Intake Target Hit", 3, "input", {
    lifeArea: FIT, displayCategory: "nutrition",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 6, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
  template("l3_f_calorie_target", "Calorie Target Hit", 3, "input", {
    lifeArea: FIT, displayCategory: "nutrition",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 6, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
]

// -- Body Composition --
const L3_FIT_BODY_COMP: GoalTemplate[] = [
  template("l3_f_weight_lost", "Weight/Fat Lost (kg)", 3, "outcome", {
    lifeArea: FIT, displayCategory: "body_comp",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 25, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_f_muscle_gained", "Lean Muscle Gained (kg)", 3, "outcome", {
    lifeArea: FIT, displayCategory: "body_comp",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 15, steps: 8, curveTension: CURVE_TENSION },
  }),
  template("l3_f_body_measurements", "Body Measurements Improved", 3, "outcome", {
    lifeArea: FIT, displayCategory: "body_comp",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 20, steps: 8, curveTension: CURVE_TENSION },
  }),
  template("l3_f_progress_photos", "Progress Photos Taken", 3, "outcome", {
    lifeArea: FIT, displayCategory: "body_comp",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 52, steps: 8, curveTension: CURVE_TENSION },
  }),
]

// -- Flexibility & Mobility --
const L3_FIT_FLEXIBILITY: GoalTemplate[] = [
  template("l3_f_mobility_sessions", "Stretching/Mobility Sessions", 3, "input", {
    lifeArea: FIT, displayCategory: "flexibility",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 8 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
  template("l3_f_yoga", "Yoga Sessions", 3, "input", {
    lifeArea: FIT, displayCategory: "flexibility",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
  template("l3_f_flexibility_hours", "Total Flexibility Hours", 3, "outcome", {
    lifeArea: FIT, displayCategory: "flexibility",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 200, steps: 10, curveTension: CURVE_TENSION },
    priority: "niche",
  }),
]

// -- Running & Endurance --
const L3_FIT_ENDURANCE: GoalTemplate[] = [
  template("l3_f_running_sessions", "Running Sessions", 3, "input", {
    lifeArea: FIT, displayCategory: "endurance",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 8 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 4, durationWeeks: 24 },
    ],
  }),
  template("l3_f_running_distance", "Total Running Distance (km)", 3, "outcome", {
    lifeArea: FIT, displayCategory: "endurance",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 1000, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_f_longest_run", "Longest Run (km)", 3, "outcome", {
    lifeArea: FIT, displayCategory: "endurance",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 42, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_f_cardio_weeks", "Consecutive Cardio Weeks", 3, "outcome", {
    lifeArea: FIT, displayCategory: "endurance",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 52, steps: 10, curveTension: CURVE_TENSION },
  }),
]

const ALL_L3_FIT = [
  ...L3_FIT_STRENGTH, ...L3_FIT_TRAINING, ...L3_FIT_NUTRITION, ...L3_FIT_BODY_COMP,
  ...L3_FIT_FLEXIBILITY, ...L3_FIT_ENDURANCE,
]

// ============================================================================
// WEALTH — Templates
// ============================================================================

const WLT = "career_business" // life area shorthand

// --- Wealth: Level 1 ---
const L1_WEALTH: GoalTemplate[] = [
  template("l1_w_financial_freedom", "Achieve financial freedom", 1, "outcome", { lifeArea: WLT }),
  template("l1_w_build_wealth", "Build serious wealth", 1, "outcome", { lifeArea: WLT }),
  template("l1_w_no_money_stress", "Never stress about money again", 1, "outcome", { lifeArea: WLT }),
  template("l1_w_business", "Build a profitable business", 1, "outcome", { lifeArea: WLT }),
]

// --- Wealth: Level 2 (Achievements) ---
const L2_WLT_TEMPLATES: GoalTemplate[] = [
  template("l2_w_budgeting", "Master Budgeting & Saving", 2, "outcome", { lifeArea: WLT }),
  template("l2_w_earning", "Maximize Earning Power", 2, "outcome", { lifeArea: WLT }),
  template("l2_w_investing", "Build Investment Portfolio", 2, "outcome", { lifeArea: WLT }),
  template("l2_w_debt_free", "Become Completely Debt Free", 2, "outcome", { lifeArea: WLT }),
]

// --- Wealth: Level 3 ---

// -- Income --
const L3_WLT_INCOME: GoalTemplate[] = [
  template("l3_w_monthly_income", "Monthly Income", 3, "outcome", {
    lifeArea: WLT, displayCategory: "income",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 3000, target: 20000, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_w_side_income", "Side Income Monthly", 3, "outcome", {
    lifeArea: WLT, displayCategory: "income",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 100, target: 10000, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_w_income_streams", "Number of Income Streams", 3, "outcome", {
    lifeArea: WLT, displayCategory: "income",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 5, steps: 4, curveTension: CURVE_TENSION },
  }),
  template("l3_w_networking", "Career Networking Actions", 3, "input", {
    lifeArea: WLT, displayCategory: "income",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
    priority: "core",
  }),
]

// -- Saving --
const L3_WLT_SAVING: GoalTemplate[] = [
  template("l3_w_net_worth", "Net Worth Milestones", 3, "outcome", {
    lifeArea: WLT, displayCategory: "saving",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1000, target: 1000000, steps: 15, curveTension: CURVE_TENSION },
  }),
  template("l3_w_savings_rate", "Budget Reviews Completed", 3, "input", {
    lifeArea: WLT, displayCategory: "saving",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
    priority: "core",
  }),
  template("l3_w_emergency_fund", "Emergency Fund (Months)", 3, "outcome", {
    lifeArea: WLT, displayCategory: "saving",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 12, steps: 6, curveTension: CURVE_TENSION },
  }),
  template("l3_w_spending_discipline", "No-Spend Days per Week", 3, "input", {
    lifeArea: WLT, displayCategory: "saving",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 8 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 4, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
  }),
]

// -- Investing --
const L3_WLT_INVESTING: GoalTemplate[] = [
  template("l3_w_portfolio", "Investment Portfolio Value", 3, "outcome", {
    lifeArea: WLT, displayCategory: "investing",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1000, target: 500000, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_w_education", "Financial Education Hours", 3, "input", {
    lifeArea: WLT, displayCategory: "investing",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
  }),
  template("l3_w_diversification", "Asset Classes Invested In", 3, "outcome", {
    lifeArea: WLT, displayCategory: "investing",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 7, steps: 6, curveTension: CURVE_TENSION },
  }),
  template("l3_w_returns_tracked", "Portfolio Review Sessions", 3, "input", {
    lifeArea: WLT, displayCategory: "investing",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
  }),
]

// -- Career Growth --
const L3_WLT_CAREER: GoalTemplate[] = [
  template("l3_w_skills", "Professional Skills Acquired", 3, "outcome", {
    lifeArea: WLT, displayCategory: "career_growth",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 20, steps: 8, curveTension: CURVE_TENSION },
  }),
  template("l3_w_certifications", "Certifications Earned", 3, "outcome", {
    lifeArea: WLT, displayCategory: "career_growth",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 6, curveTension: CURVE_TENSION },
  }),
  template("l3_w_deep_work", "Deep Work Sessions per Week", 3, "input", {
    lifeArea: WLT, displayCategory: "career_growth",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 8 },
      { frequencyPerWeek: 4, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
    priority: "core",
    graduation_criteria: "Consistently hitting 5+ deep work sessions/week for 8+ weeks",
  }),
  template("l3_w_learning", "Career Learning Sessions", 3, "input", {
    lifeArea: WLT, displayCategory: "career_growth",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 8 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
  }),
  template("l3_w_public_speaking", "Public Speaking Events", 3, "outcome", {
    lifeArea: WLT, displayCategory: "career_growth",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 25, steps: 8, curveTension: CURVE_TENSION },
  }),
]

// -- Entrepreneurship --
const L3_WLT_ENTREPRENEURSHIP: GoalTemplate[] = [
  template("l3_w_side_revenue", "Side Project Revenue", 3, "outcome", {
    lifeArea: WLT, displayCategory: "entrepreneurship",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 100, target: 10000, steps: 10, curveTension: CURVE_TENSION },
    priority: "niche",
  }),
  template("l3_w_customers", "Paying Customers", 3, "outcome", {
    lifeArea: WLT, displayCategory: "entrepreneurship",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 100, steps: 10, curveTension: CURVE_TENSION },
    priority: "niche",
  }),
  template("l3_w_products_launched", "Products/Services Launched", 3, "outcome", {
    lifeArea: WLT, displayCategory: "entrepreneurship",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 5, steps: 4, curveTension: CURVE_TENSION },
    priority: "niche",
  }),
  template("l3_w_entrepreneurship_hours", "Entrepreneurship Hours", 3, "input", {
    lifeArea: WLT, displayCategory: "entrepreneurship",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 8 },
      { frequencyPerWeek: 10, durationWeeks: 12 },
      { frequencyPerWeek: 15, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
]

const ALL_L3_WLT = [
  ...L3_WLT_INCOME, ...L3_WLT_SAVING, ...L3_WLT_INVESTING, ...L3_WLT_CAREER, ...L3_WLT_ENTREPRENEURSHIP,
]

// ============================================================================
// VICES & ELIMINATION — Templates
// ============================================================================

const VIC = "vices_elimination" // life area shorthand

// --- Vices: Level 1 ---
const L1_VICES: GoalTemplate[] = [
  template("l1_v_break_free", "Break free from all addictions", 1, "outcome", { lifeArea: VIC }),
  template("l1_v_self_control", "Achieve complete self-control", 1, "outcome", { lifeArea: VIC }),
  template("l1_v_clean_life", "Live a clean, disciplined life", 1, "outcome", { lifeArea: VIC }),
  template("l1_v_reclaim_time", "Reclaim my time and energy", 1, "outcome", { lifeArea: VIC }),
]

// --- Vices: Level 2 (Achievements) ---
const L2_VIC_TEMPLATES: GoalTemplate[] = [
  template("l2_v_porn_free", "Overcome Porn Addiction", 2, "outcome", { lifeArea: VIC }),
  template("l2_v_digital", "Master Digital Discipline", 2, "outcome", { lifeArea: VIC }),
  template("l2_v_substance", "Conquer Substance Habits", 2, "outcome", { lifeArea: VIC }),
  template("l2_v_willpower", "Build Unbreakable Self-Control", 2, "outcome", { lifeArea: VIC }),
]

// --- Vices: Level 3 ---

// -- Porn & Fap Recovery --
const L3_VIC_PORN: GoalTemplate[] = [
  template("l3_v_porn_free_days", "Porn-Free Days", 3, "outcome", {
    lifeArea: VIC, displayCategory: "porn_freedom",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 365, steps: 10, curveTension: CURVE_TENSION },
    priority: "core",
    graduation_criteria: "90+ consecutive porn-free days sustained",
  }),
  template("l3_v_nofap_streak", "NoFap Streak", 3, "outcome", {
    lifeArea: VIC, displayCategory: "porn_freedom",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 90, steps: 8, curveTension: CURVE_TENSION },
  }),
  template("l3_v_porn_free_sustained", "Porn-Free Weeks Sustained", 3, "input", {
    lifeArea: VIC, displayCategory: "porn_freedom",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 7, durationWeeks: 48 },
    ],
  }),
  template("l3_v_urge_journal", "Urge Journaling Sessions", 3, "input", {
    lifeArea: VIC, displayCategory: "porn_freedom",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 8 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
]

// -- Digital Discipline --
const L3_VIC_DIGITAL: GoalTemplate[] = [
  template("l3_v_screen_time", "Screen Time Under Target", 3, "input", {
    lifeArea: VIC, displayCategory: "digital_discipline",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 6, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
    priority: "core",
    graduation_criteria: "Under screen time target 7 days/week for 8+ consecutive weeks",
  }),
  template("l3_v_social_media_free", "Social Media Free Days", 3, "input", {
    lifeArea: VIC, displayCategory: "digital_discipline",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 8 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
  }),
  template("l3_v_no_gaming", "No-Gaming Days per Week", 3, "input", {
    lifeArea: VIC, displayCategory: "digital_discipline",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 4, durationWeeks: 8 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 6, durationWeeks: 24 },
    ],
  }),
  template("l3_v_dopamine_detox", "Dopamine Detox Days", 3, "input", {
    lifeArea: VIC, displayCategory: "digital_discipline",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
  template("l3_v_screen_streak", "Consecutive Days Under Screen Limit", 3, "outcome", {
    lifeArea: VIC, displayCategory: "digital_discipline",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 90, steps: 8, curveTension: CURVE_TENSION },
  }),
]

// -- Substance Control --
const L3_VIC_SUBSTANCE: GoalTemplate[] = [
  template("l3_v_alcohol_free", "Alcohol-Free Days per Week", 3, "input", {
    lifeArea: VIC, displayCategory: "substance_control",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 8 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
  template("l3_v_sober_days", "Consecutive Sober Days", 3, "outcome", {
    lifeArea: VIC, displayCategory: "substance_control",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 365, steps: 10, curveTension: CURVE_TENSION },
    priority: "niche",
  }),
  template("l3_v_smoke_free", "Smoke-Free Days", 3, "outcome", {
    lifeArea: VIC, displayCategory: "substance_control",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 365, steps: 10, curveTension: CURVE_TENSION },
    priority: "niche",
  }),
  template("l3_v_clean_eating", "Clean Eating Days", 3, "input", {
    lifeArea: VIC, displayCategory: "substance_control",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 8 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
]

// -- Self-Control --
const L3_VIC_SELF_CONTROL: GoalTemplate[] = [
  template("l3_v_junk_food_free", "Junk Food Free Days", 3, "input", {
    lifeArea: VIC, displayCategory: "self_control",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 8 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
  template("l3_v_impulse_free", "Impulse Purchase Free Weeks", 3, "outcome", {
    lifeArea: VIC, displayCategory: "self_control",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 52, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_v_no_late_scrolling", "Late Night Scrolling Free Days", 3, "input", {
    lifeArea: VIC, displayCategory: "self_control",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 6, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
  template("l3_v_budget_days", "Stuck to Budget Days", 3, "input", {
    lifeArea: VIC, displayCategory: "self_control",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 6, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
]

const ALL_L3_VIC = [
  ...L3_VIC_PORN, ...L3_VIC_DIGITAL, ...L3_VIC_SUBSTANCE, ...L3_VIC_SELF_CONTROL,
]

// ============================================================================
// Full Catalog
// ============================================================================

const ALL_L3_DAYGAME = [
  ...L3_FIELD_WORK, ...L3_RESULTS, ...L3_DIRTY_DOG,
  ...L3_TEXTING, ...L3_DATES, ...L3_SCENARIOS, ...L3_RELATIONSHIP,
]

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // Daygame
  ...L1_ONE_PERSON, ...L1_ABUNDANCE, ...L2_TEMPLATES, ...ALL_L3_DAYGAME,
  // Personal Growth
  ...L1_PERSONAL_GROWTH, ...L2_PG_TEMPLATES, ...ALL_L3_PG,
  // Fitness
  ...L1_FITNESS, ...L2_FIT_TEMPLATES, ...ALL_L3_FIT,
  // Wealth
  ...L1_WEALTH, ...L2_WLT_TEMPLATES, ...ALL_L3_WLT,
  // Vices & Elimination
  ...L1_VICES, ...L2_VIC_TEMPLATES, ...ALL_L3_VIC,
]

export const GOAL_TEMPLATE_MAP: Record<string, GoalTemplate> =
  Object.fromEntries(GOAL_TEMPLATES.map((t) => [t.id, t]))

// ============================================================================
// Fan-Out Edges
// ============================================================================

// L1 → L3: all L1 goals fan directly into all L3 work goals (per area)
// L2 achievements are standalone badges — not in the parent-child hierarchy.
const L1_TO_L3_DAYGAME: GoalGraphEdge[] = [...L1_ONE_PERSON, ...L1_ABUNDANCE].flatMap((l1) =>
  ALL_L3_DAYGAME.map((l3) => ({ parentId: l1.id, childId: l3.id }))
)
const L1_TO_L3_PG: GoalGraphEdge[] = L1_PERSONAL_GROWTH.flatMap((l1) =>
  ALL_L3_PG.map((l3) => ({ parentId: l1.id, childId: l3.id }))
)
const L1_TO_L3_FIT: GoalGraphEdge[] = L1_FITNESS.flatMap((l1) =>
  ALL_L3_FIT.map((l3) => ({ parentId: l1.id, childId: l3.id }))
)
const L1_TO_L3_WLT: GoalGraphEdge[] = L1_WEALTH.flatMap((l1) =>
  ALL_L3_WLT.map((l3) => ({ parentId: l1.id, childId: l3.id }))
)
const L1_TO_L3_VIC: GoalGraphEdge[] = L1_VICES.flatMap((l1) =>
  ALL_L3_VIC.map((l3) => ({ parentId: l1.id, childId: l3.id }))
)
const L1_TO_L3_EDGES: GoalGraphEdge[] = [
  ...L1_TO_L3_DAYGAME, ...L1_TO_L3_PG, ...L1_TO_L3_FIT, ...L1_TO_L3_WLT,
  ...L1_TO_L3_VIC,
]

// L2 → L3 connections — used ONLY for achievement weight lookups (badge engine).
// NOT included in GOAL_GRAPH_EDGES — L2s are standalone, not in the parent-child hierarchy.
const L2_L3_CONNECTIONS: Record<string, string[]> = {
  // ---- DAYGAME ----
  // All badges use threshold-based requirements (BADGE_REQUIREMENTS).
  // L2_L3_CONNECTIONS only needed for badge→L3 discovery (getL2AchievementsForL3).
  l2_approach: ["l3_approach_volume", "l3_venues_explored"],
  l2_results: ["l3_phone_numbers", "l3_instadates", "l3_dates", "l3_second_dates"],
  l2_tongue: ["l3_approach_volume", "l3_phone_numbers", "l3_instadates"],
  l2_text: ["l3_response_rate", "l3_number_to_date_conversion"],
  l2_date: ["l3_dates", "l3_second_dates", "l3_creative_dates", "l3_date_spots"],
  l2_seduction: ["l3_kiss_closes", "l3_lays", "l3_same_day_lays"],
  l2_inner: ["l3_approach_volume", "l3_venues_explored", "l3_instadates", "l3_creative_dates"],
  l2_life: ["l3_dates", "l3_number_to_date_conversion", "l3_second_dates", "l3_lays"],
  l2_grinder: ["l3_session_frequency", "l3_solo_sessions", "l3_approach_frequency"],
  l2_self: ["l3_voice_notes", "l3_daygame_weekly_review", "l3_visualization"],
  l2_opener: ["l3_approach_quality", "l3_open_in_3_seconds"],
  l2_pipeline: ["l3_texting_initiated", "l3_dates_planned", "l3_pull_attempts", "l3_date_leadership", "l3_women_dating"],
  l2_training: ["l3_scenario_sessions", "l3_scenario_types_tried", "l3_scenario_high_scores"],

  // ---- PERSONAL GROWTH ----
  // Master Mindfulness & Presence (8 L3s — cross-category)
  l2_pg_mindfulness: [
    "l3_pg_meditation", "l3_pg_gratitude", "l3_pg_meditation_hours", "l3_pg_meditation_streak",
    "l3_pg_journal", "l3_pg_weekly_reviews", "l3_pg_therapy", "l3_pg_breathwork",
  ],
  // Build Mental Toughness & Resilience (6 L3s)
  l2_pg_toughness: [
    "l3_pg_comfort_zone", "l3_pg_cold_exposure", "l3_pg_challenges_completed", "l3_pg_cold_streak",
    "l3_pg_morning_routine", "l3_pg_routine_streak",
  ],
  // Become Well-Read & Knowledgeable (6 L3s)
  l2_pg_well_read: [
    "l3_pg_books", "l3_pg_courses", "l3_pg_study_hours", "l3_pg_reading_hours",
    "l3_pg_journal", "l3_pg_journal_entries",
  ],
  // Master Journaling & Self-Reflection (7 L3s)
  l2_pg_reflection: [
    "l3_pg_journal", "l3_pg_weekly_reviews", "l3_pg_therapy", "l3_pg_journal_entries",
    "l3_pg_gratitude", "l3_pg_meditation", "l3_pg_retreats",
  ],
  // Develop Emotional Intelligence (7 L3s)
  l2_pg_eq: [
    "l3_pg_meditation", "l3_pg_gratitude", "l3_pg_meditation_hours",
    "l3_pg_journal", "l3_pg_therapy", "l3_pg_journal_entries", "l3_pg_breathwork",
  ],
  // Build Iron Discipline (6 L3s)
  l2_pg_discipline: [
    "l3_pg_morning_routine", "l3_pg_routine_streak",
    "l3_pg_cold_exposure", "l3_pg_cold_streak",
    "l3_pg_comfort_zone", "l3_pg_challenges_completed",
  ],

  // ---- FITNESS ----
  // Build Real Strength — strength lifts + training consistency (10 L3s)
  l2_f_strength: [
    "l3_f_bench_press", "l3_f_squat", "l3_f_deadlift", "l3_f_overhead_press", "l3_f_pullups",
    "l3_f_gym_frequency", "l3_f_total_sessions", "l3_f_consecutive_weeks", "l3_f_training_hours",
    "l3_f_combat_sports",
  ],
  // Transform Body Composition — body metrics + key habits (9 L3s)
  l2_f_body_comp: [
    "l3_f_weight_lost", "l3_f_muscle_gained", "l3_f_body_measurements", "l3_f_progress_photos",
    "l3_f_gym_frequency", "l3_f_total_sessions", "l3_f_protein", "l3_f_calorie_target",
    "l3_f_cardio_sessions",
  ],
  // Master Nutrition & Recovery — nutrition habits + body outcomes (7 L3s)
  l2_f_nutrition: [
    "l3_f_protein", "l3_f_meals_prepped", "l3_f_water", "l3_f_calorie_target",
    "l3_f_weight_lost", "l3_f_muscle_gained", "l3_f_consecutive_weeks",
  ],
  // Build Unbreakable Training Discipline — all training + new categories (18 L3s)
  l2_f_training_discipline: [
    "l3_f_gym_frequency", "l3_f_total_sessions", "l3_f_consecutive_weeks", "l3_f_training_hours", "l3_f_cardio_sessions",
    "l3_f_combat_sports",
    "l3_f_protein",
    "l3_f_weight_lost", "l3_f_muscle_gained", "l3_f_body_measurements", "l3_f_progress_photos",
    "l3_f_bench_press", "l3_f_squat", "l3_f_deadlift",
    "l3_f_mobility_sessions", "l3_f_yoga", "l3_f_flexibility_hours",
    "l3_f_running_sessions",
  ],

  // ---- WEALTH ----
  // Master Budgeting & Saving (6 L3s)
  l2_w_budgeting: [
    "l3_w_net_worth", "l3_w_savings_rate", "l3_w_emergency_fund", "l3_w_spending_discipline",
    "l3_w_income_streams", "l3_w_monthly_income",
  ],
  // Maximize Earning Power (10 L3s)
  l2_w_earning: [
    "l3_w_monthly_income", "l3_w_side_income", "l3_w_networking",
    "l3_w_skills", "l3_w_deep_work", "l3_w_income_streams",
    "l3_w_public_speaking", "l3_w_side_revenue", "l3_w_customers", "l3_w_entrepreneurship_hours",
  ],
  // Build Investment Portfolio (5 L3s)
  l2_w_investing: [
    "l3_w_portfolio", "l3_w_education", "l3_w_diversification", "l3_w_returns_tracked",
    "l3_w_net_worth",
  ],
  // Become Completely Debt Free (4 L3s)
  l2_w_debt_free: [
    "l3_w_savings_rate", "l3_w_spending_discipline", "l3_w_emergency_fund", "l3_w_net_worth",
  ],

  // ---- VICES & ELIMINATION ----
  // Overcome Porn Addiction
  l2_v_porn_free: [
    "l3_v_porn_free_days", "l3_v_nofap_streak", "l3_v_porn_free_sustained", "l3_v_urge_journal",
    "l3_v_no_late_scrolling", "l3_v_dopamine_detox",
  ],
  // Master Digital Discipline
  l2_v_digital: [
    "l3_v_screen_time", "l3_v_social_media_free", "l3_v_no_gaming", "l3_v_dopamine_detox", "l3_v_screen_streak",
    "l3_v_no_late_scrolling",
  ],
  // Conquer Substance Habits
  l2_v_substance: [
    "l3_v_alcohol_free", "l3_v_sober_days", "l3_v_smoke_free", "l3_v_clean_eating",
    "l3_v_junk_food_free",
  ],
  // Build Unbreakable Self-Control
  l2_v_willpower: ALL_L3_VIC.map((t) => t.id),
}

const L2_TO_L3_EDGES: GoalGraphEdge[] = Object.entries(L2_L3_CONNECTIONS).flatMap(
  ([l2Id, l3Ids]) => l3Ids.map((l3Id) => ({ parentId: l2Id, childId: l3Id }))
)

export const GOAL_GRAPH_EDGES: GoalGraphEdge[] = [
  ...L1_TO_L3_EDGES,
]

// ============================================================================
// Achievement Weights — per-L2, each sums to 1.0
// ============================================================================

// ============================================================================
// Daygame Badge Requirements — threshold-based tiers
// ============================================================================

const r = (templateId: string, value: number) => ({ templateId, value })

export const DAYGAME_BADGE_REQUIREMENTS: BadgeConfig[] = [
  {
    l2Id: "l2_approach",
    tiers: [
      { tier: "iron",    name: "Approach Newbie",   requirements: [r("l3_approach_volume", 20)] },
      { tier: "bronze",  name: "Approach Warrior",  requirements: [r("l3_approach_volume", 75), r("l3_venues_explored", 3)] },
      { tier: "silver",  name: "Approach Veteran",  requirements: [r("l3_approach_volume", 200), r("l3_venues_explored", 7)] },
      { tier: "gold",    name: "Approach Machine",  requirements: [r("l3_approach_volume", 500), r("l3_venues_explored", 15)] },
      { tier: "diamond", name: "Approach Legend",    requirements: [r("l3_approach_volume", 1200), r("l3_venues_explored", 25)] },
      { tier: "mythic",  name: "Approach Myth",     requirements: [r("l3_approach_volume", 3000), r("l3_venues_explored", 50)] },
    ],
  },
  {
    l2Id: "l2_results",
    tiers: [
      { tier: "iron",    name: "Results Seeker",    requirements: [r("l3_phone_numbers", 3)] },
      { tier: "bronze",  name: "Results Hunter",    requirements: [r("l3_phone_numbers", 10), r("l3_instadates", 2)] },
      { tier: "silver",  name: "Results Machine",   requirements: [r("l3_phone_numbers", 25), r("l3_instadates", 8), r("l3_dates", 3)] },
      { tier: "gold",    name: "Results King",      requirements: [r("l3_phone_numbers", 60), r("l3_instadates", 20), r("l3_dates", 12), r("l3_second_dates", 5)] },
      { tier: "diamond", name: "Results Legend",     requirements: [r("l3_phone_numbers", 120), r("l3_instadates", 40), r("l3_dates", 30), r("l3_second_dates", 12)] },
      { tier: "mythic",  name: "Results Myth",      requirements: [r("l3_phone_numbers", 250), r("l3_instadates", 80), r("l3_dates", 60), r("l3_second_dates", 30)] },
    ],
  },
  {
    l2Id: "l2_tongue",
    tiers: [
      { tier: "iron",    name: "Nervous Tongue",    requirements: [r("l3_approach_volume", 30), r("l3_phone_numbers", 3)] },
      { tier: "bronze",  name: "Smooth Tongue",     requirements: [r("l3_approach_volume", 100), r("l3_phone_numbers", 10), r("l3_instadates", 2)] },
      { tier: "silver",  name: "Silver Tongue",     requirements: [r("l3_approach_volume", 300), r("l3_phone_numbers", 25), r("l3_instadates", 8)] },
      { tier: "gold",    name: "Golden Tongue",     requirements: [r("l3_approach_volume", 600), r("l3_phone_numbers", 50), r("l3_instadates", 18)] },
      { tier: "diamond", name: "Diamond Tongue",    requirements: [r("l3_approach_volume", 1200), r("l3_phone_numbers", 100), r("l3_instadates", 35)] },
      { tier: "mythic",  name: "Mythic Tongue",     requirements: [r("l3_approach_volume", 3000), r("l3_phone_numbers", 200), r("l3_instadates", 70)] },
    ],
  },
  {
    l2Id: "l2_text",
    tiers: [
      { tier: "iron",    name: "Text Rookie",       requirements: [r("l3_response_rate", 3), r("l3_number_to_date_conversion", 1)] },
      { tier: "bronze",  name: "Text Player",       requirements: [r("l3_response_rate", 10), r("l3_number_to_date_conversion", 3)] },
      { tier: "silver",  name: "Text Tactician",    requirements: [r("l3_response_rate", 25), r("l3_number_to_date_conversion", 8)] },
      { tier: "gold",    name: "Text King",         requirements: [r("l3_response_rate", 50), r("l3_number_to_date_conversion", 15)] },
      { tier: "diamond", name: "Text God",          requirements: [r("l3_response_rate", 100), r("l3_number_to_date_conversion", 30)] },
      { tier: "mythic",  name: "Text Myth",         requirements: [r("l3_response_rate", 200), r("l3_number_to_date_conversion", 60)] },
    ],
  },
  {
    l2Id: "l2_date",
    tiers: [
      { tier: "iron",    name: "Date Rookie",       requirements: [r("l3_dates", 2), r("l3_second_dates", 1)] },
      { tier: "bronze",  name: "Date Planner",      requirements: [r("l3_dates", 6), r("l3_second_dates", 3), r("l3_creative_dates", 1)] },
      { tier: "silver",  name: "Date Strategist",   requirements: [r("l3_dates", 15), r("l3_second_dates", 8), r("l3_creative_dates", 4)] },
      { tier: "gold",    name: "Date Commander",    requirements: [r("l3_dates", 30), r("l3_second_dates", 16), r("l3_creative_dates", 8), r("l3_date_spots", 4)] },
      { tier: "diamond", name: "Date Architect",    requirements: [r("l3_dates", 55), r("l3_second_dates", 28), r("l3_creative_dates", 15), r("l3_date_spots", 8)] },
      { tier: "mythic",  name: "Date Myth",         requirements: [r("l3_dates", 100), r("l3_second_dates", 50), r("l3_creative_dates", 30), r("l3_date_spots", 15)] },
    ],
  },
  {
    l2Id: "l2_seduction",
    tiers: [
      { tier: "iron",    name: "Seduction Novice",  requirements: [r("l3_kiss_closes", 2)] },
      { tier: "bronze",  name: "Seduction Player",  requirements: [r("l3_kiss_closes", 7), r("l3_lays", 1)] },
      { tier: "silver",  name: "Seduction Artist",  requirements: [r("l3_kiss_closes", 15), r("l3_lays", 4), r("l3_same_day_lays", 1)] },
      { tier: "gold",    name: "Seduction Master",  requirements: [r("l3_kiss_closes", 30), r("l3_lays", 8), r("l3_same_day_lays", 2)] },
      { tier: "diamond", name: "Seduction Legend",   requirements: [r("l3_kiss_closes", 45), r("l3_lays", 15), r("l3_same_day_lays", 5)] },
      { tier: "mythic",  name: "Seduction Myth",    requirements: [r("l3_kiss_closes", 75), r("l3_lays", 30), r("l3_same_day_lays", 10)] },
    ],
  },
  {
    l2Id: "l2_inner",
    tiers: [
      { tier: "iron",    name: "Inner Spark",       requirements: [r("l3_approach_volume", 50), r("l3_venues_explored", 2)] },
      { tier: "bronze",  name: "Inner Flame",       requirements: [r("l3_approach_volume", 150), r("l3_venues_explored", 5), r("l3_instadates", 2)] },
      { tier: "silver",  name: "Inner Shield",      requirements: [r("l3_approach_volume", 400), r("l3_venues_explored", 10), r("l3_instadates", 8), r("l3_creative_dates", 2)] },
      { tier: "gold",    name: "Inner Fortress",    requirements: [r("l3_approach_volume", 750), r("l3_venues_explored", 16), r("l3_instadates", 18), r("l3_creative_dates", 6)] },
      { tier: "diamond", name: "Inner Titan",       requirements: [r("l3_approach_volume", 1200), r("l3_venues_explored", 25), r("l3_instadates", 35), r("l3_creative_dates", 12)] },
      { tier: "mythic",  name: "Inner God",         requirements: [r("l3_approach_volume", 2500), r("l3_venues_explored", 40), r("l3_instadates", 70), r("l3_creative_dates", 25)] },
    ],
  },
  {
    l2Id: "l2_life",
    tiers: [
      { tier: "iron",    name: "Tasting Life",      requirements: [r("l3_dates", 2), r("l3_number_to_date_conversion", 1), r("l3_second_dates", 1)] },
      { tier: "bronze",  name: "Rising Life",       requirements: [r("l3_dates", 7), r("l3_number_to_date_conversion", 4), r("l3_second_dates", 3)] },
      { tier: "silver",  name: "Thriving Life",     requirements: [r("l3_dates", 18), r("l3_number_to_date_conversion", 12), r("l3_second_dates", 8), r("l3_lays", 2)] },
      { tier: "gold",    name: "Abundant Life",     requirements: [r("l3_dates", 35), r("l3_number_to_date_conversion", 22), r("l3_second_dates", 16), r("l3_lays", 5)] },
      { tier: "diamond", name: "Legendary Life",    requirements: [r("l3_dates", 65), r("l3_number_to_date_conversion", 35), r("l3_second_dates", 28), r("l3_lays", 10)] },
      { tier: "mythic",  name: "Mythic Life",       requirements: [r("l3_dates", 120), r("l3_number_to_date_conversion", 60), r("l3_second_dates", 50), r("l3_lays", 20)] },
    ],
  },
  // --- New daygame badges ---
  {
    l2Id: "l2_grinder",
    tiers: [
      { tier: "iron",    name: "Fresh Grinder",     requirements: [r("l3_session_frequency", 20)] },
      { tier: "bronze",  name: "Street Grinder",    requirements: [r("l3_session_frequency", 50), r("l3_solo_sessions", 10)] },
      { tier: "silver",  name: "Steady Grinder",    requirements: [r("l3_session_frequency", 120), r("l3_solo_sessions", 30)] },
      { tier: "gold",    name: "Iron Grinder",      requirements: [r("l3_session_frequency", 250), r("l3_solo_sessions", 60)] },
      { tier: "diamond", name: "Legendary Grinder",  requirements: [r("l3_session_frequency", 500), r("l3_solo_sessions", 120)] },
      { tier: "mythic",  name: "Mythic Grinder",    requirements: [r("l3_session_frequency", 1000), r("l3_solo_sessions", 250)] },
    ],
  },
  {
    l2Id: "l2_self",
    tiers: [
      { tier: "iron",    name: "Self Starter",      requirements: [r("l3_voice_notes", 10), r("l3_daygame_weekly_review", 4)] },
      { tier: "bronze",  name: "Self Aware",        requirements: [r("l3_voice_notes", 30), r("l3_daygame_weekly_review", 12), r("l3_visualization", 20)] },
      { tier: "silver",  name: "Self Coach",        requirements: [r("l3_voice_notes", 75), r("l3_daygame_weekly_review", 30), r("l3_visualization", 50)] },
      { tier: "gold",    name: "Self Master",       requirements: [r("l3_voice_notes", 150), r("l3_daygame_weekly_review", 48), r("l3_visualization", 100)] },
      { tier: "diamond", name: "Self Sensei",       requirements: [r("l3_voice_notes", 300), r("l3_daygame_weekly_review", 96), r("l3_visualization", 200)] },
      { tier: "mythic",  name: "Self Myth",         requirements: [r("l3_voice_notes", 600), r("l3_daygame_weekly_review", 192), r("l3_visualization", 400)] },
    ],
  },
  {
    l2Id: "l2_opener",
    tiers: [
      { tier: "iron",    name: "Hesitant Opener",   requirements: [r("l3_approach_quality", 20)] },
      { tier: "bronze",  name: "Bold Opener",       requirements: [r("l3_approach_quality", 50), r("l3_open_in_3_seconds", 30)] },
      { tier: "silver",  name: "Sharp Opener",      requirements: [r("l3_approach_quality", 120), r("l3_open_in_3_seconds", 80)] },
      { tier: "gold",    name: "Killer Opener",     requirements: [r("l3_approach_quality", 250), r("l3_open_in_3_seconds", 180)] },
      { tier: "diamond", name: "Legendary Opener",   requirements: [r("l3_approach_quality", 500), r("l3_open_in_3_seconds", 350)] },
      { tier: "mythic",  name: "Mythic Opener",     requirements: [r("l3_approach_quality", 1000), r("l3_open_in_3_seconds", 700)] },
    ],
  },
  {
    l2Id: "l2_pipeline",
    tiers: [
      { tier: "iron",    name: "Pipeline Rookie",   requirements: [r("l3_texting_initiated", 10), r("l3_dates_planned", 3)] },
      { tier: "bronze",  name: "Pipeline Builder",  requirements: [r("l3_texting_initiated", 25), r("l3_dates_planned", 8), r("l3_pull_attempts", 5)] },
      { tier: "silver",  name: "Pipeline Manager",  requirements: [r("l3_texting_initiated", 50), r("l3_dates_planned", 20), r("l3_pull_attempts", 12), r("l3_women_dating", 2)] },
      { tier: "gold",    name: "Pipeline King",     requirements: [r("l3_texting_initiated", 100), r("l3_dates_planned", 40), r("l3_pull_attempts", 25), r("l3_women_dating", 3)] },
      { tier: "diamond", name: "Pipeline Legend",    requirements: [r("l3_texting_initiated", 200), r("l3_dates_planned", 80), r("l3_pull_attempts", 50), r("l3_women_dating", 5)] },
      { tier: "mythic",  name: "Pipeline Myth",     requirements: [r("l3_texting_initiated", 400), r("l3_dates_planned", 160), r("l3_pull_attempts", 100), r("l3_women_dating", 8)] },
    ],
  },
  {
    l2Id: "l2_training",
    tiers: [
      { tier: "iron",    name: "Reluctant Student",  requirements: [r("l3_scenario_sessions", 10)] },
      { tier: "bronze",  name: "Keen Student",       requirements: [r("l3_scenario_sessions", 30), r("l3_scenario_types_tried", 3), r("l3_scenario_high_scores", 10)] },
      { tier: "silver",  name: "Dedicated Student",  requirements: [r("l3_scenario_sessions", 80), r("l3_scenario_types_tried", 7), r("l3_scenario_high_scores", 30)] },
      { tier: "gold",    name: "Star Student",       requirements: [r("l3_scenario_sessions", 180), r("l3_scenario_types_tried", 12), r("l3_scenario_high_scores", 70)] },
      { tier: "diamond", name: "Master Student",     requirements: [r("l3_scenario_sessions", 400), r("l3_scenario_types_tried", 16), r("l3_scenario_high_scores", 150)] },
      { tier: "mythic",  name: "Mythic Student",     requirements: [r("l3_scenario_sessions", 800), r("l3_scenario_types_tried", 19), r("l3_scenario_high_scores", 300)] },
    ],
  },
]

// ============================================================================
// Personal Growth Badge Requirements — threshold-based tiers
// ============================================================================

export const PG_BADGE_REQUIREMENTS: BadgeConfig[] = [
  {
    l2Id: "l2_pg_mindfulness",
    tiers: [
      { tier: "iron",    name: "Mindfulness Beginner", requirements: [r("l3_pg_meditation_hours", 10)] },
      { tier: "bronze",  name: "Mindfulness Student",  requirements: [r("l3_pg_meditation_hours", 50), r("l3_pg_meditation_streak", 14)] },
      { tier: "silver",  name: "Mindfulness Practitioner", requirements: [r("l3_pg_meditation_hours", 150), r("l3_pg_meditation_streak", 30)] },
      { tier: "gold",    name: "Mindfulness Master",   requirements: [r("l3_pg_meditation_hours", 400), r("l3_pg_meditation_streak", 90)] },
      { tier: "diamond", name: "Mindfulness Sage",     requirements: [r("l3_pg_meditation_hours", 700), r("l3_pg_meditation_streak", 180)] },
      { tier: "mythic",  name: "Enlightened",          requirements: [r("l3_pg_meditation_hours", 1000), r("l3_pg_meditation_streak", 365)] },
    ],
  },
  {
    l2Id: "l2_pg_toughness",
    tiers: [
      { tier: "iron",    name: "Soft",                 requirements: [r("l3_pg_challenges_completed", 10)] },
      { tier: "bronze",  name: "Growing",              requirements: [r("l3_pg_challenges_completed", 30), r("l3_pg_cold_streak", 7)] },
      { tier: "silver",  name: "Real",                 requirements: [r("l3_pg_challenges_completed", 100), r("l3_pg_cold_streak", 21)] },
      { tier: "gold",    name: "Iron",                 requirements: [r("l3_pg_challenges_completed", 250), r("l3_pg_cold_streak", 45)] },
      { tier: "diamond", name: "Legendary",            requirements: [r("l3_pg_challenges_completed", 400), r("l3_pg_cold_streak", 75)] },
      { tier: "mythic",  name: "Mythic Toughness",     requirements: [r("l3_pg_challenges_completed", 500), r("l3_pg_cold_streak", 100)] },
    ],
  },
  {
    l2Id: "l2_pg_well_read",
    tiers: [
      { tier: "iron",    name: "Casual Reader",        requirements: [r("l3_pg_books", 3)] },
      { tier: "bronze",  name: "Active Reader",        requirements: [r("l3_pg_books", 10), r("l3_pg_reading_hours", 50)] },
      { tier: "silver",  name: "Dedicated Reader",     requirements: [r("l3_pg_books", 25), r("l3_pg_courses", 5), r("l3_pg_reading_hours", 150)] },
      { tier: "gold",    name: "Voracious Reader",     requirements: [r("l3_pg_books", 50), r("l3_pg_courses", 12), r("l3_pg_reading_hours", 400)] },
      { tier: "diamond", name: "Scholar",              requirements: [r("l3_pg_books", 75), r("l3_pg_courses", 20), r("l3_pg_reading_hours", 700)] },
      { tier: "mythic",  name: "Mythic Reader",        requirements: [r("l3_pg_books", 100), r("l3_pg_courses", 25), r("l3_pg_reading_hours", 1000)] },
    ],
  },
  {
    l2Id: "l2_pg_reflection",
    tiers: [
      { tier: "iron",    name: "Reluctant Reflector",  requirements: [r("l3_pg_journal_entries", 10)] },
      { tier: "bronze",  name: "Growing Reflector",    requirements: [r("l3_pg_journal_entries", 50), r("l3_pg_retreats", 1)] },
      { tier: "silver",  name: "Committed Reflector",  requirements: [r("l3_pg_journal_entries", 150), r("l3_pg_retreats", 3)] },
      { tier: "gold",    name: "Deep Reflector",       requirements: [r("l3_pg_journal_entries", 400), r("l3_pg_retreats", 7)] },
      { tier: "diamond", name: "Master Reflector",     requirements: [r("l3_pg_journal_entries", 700), r("l3_pg_retreats", 12)] },
      { tier: "mythic",  name: "Mythic Reflector",     requirements: [r("l3_pg_journal_entries", 1000), r("l3_pg_retreats", 20)] },
    ],
  },
  {
    l2Id: "l2_pg_eq",
    tiers: [
      { tier: "iron",    name: "EQ Novice",            requirements: [r("l3_pg_meditation_hours", 10)] },
      { tier: "bronze",  name: "EQ Student",           requirements: [r("l3_pg_meditation_hours", 50), r("l3_pg_journal_entries", 50)] },
      { tier: "silver",  name: "EQ Practitioner",      requirements: [r("l3_pg_meditation_hours", 150), r("l3_pg_journal_entries", 150)] },
      { tier: "gold",    name: "EQ Expert",            requirements: [r("l3_pg_meditation_hours", 350), r("l3_pg_journal_entries", 350)] },
      { tier: "diamond", name: "EQ Master",            requirements: [r("l3_pg_meditation_hours", 600), r("l3_pg_journal_entries", 600)] },
      { tier: "mythic",  name: "EQ Myth",              requirements: [r("l3_pg_meditation_hours", 1000), r("l3_pg_journal_entries", 1000)] },
    ],
  },
  {
    l2Id: "l2_pg_discipline",
    tiers: [
      { tier: "iron",    name: "Discipline Rookie",    requirements: [r("l3_pg_routine_streak", 7)] },
      { tier: "bronze",  name: "Discipline Builder",   requirements: [r("l3_pg_routine_streak", 21), r("l3_pg_challenges_completed", 20)] },
      { tier: "silver",  name: "Discipline Soldier",   requirements: [r("l3_pg_routine_streak", 60), r("l3_pg_challenges_completed", 80), r("l3_pg_cold_streak", 14)] },
      { tier: "gold",    name: "Discipline Machine",   requirements: [r("l3_pg_routine_streak", 150), r("l3_pg_challenges_completed", 200), r("l3_pg_cold_streak", 45)] },
      { tier: "diamond", name: "Discipline Legend",     requirements: [r("l3_pg_routine_streak", 270), r("l3_pg_challenges_completed", 400), r("l3_pg_cold_streak", 75)] },
      { tier: "mythic",  name: "Discipline Myth",      requirements: [r("l3_pg_routine_streak", 365), r("l3_pg_challenges_completed", 500), r("l3_pg_cold_streak", 100)] },
    ],
  },
]

// ============================================================================
// Fitness Badge Requirements — threshold-based tiers
// ============================================================================

export const FIT_BADGE_REQUIREMENTS: BadgeConfig[] = [
  {
    l2Id: "l2_f_strength",
    tiers: [
      { tier: "iron",    name: "Strength Beginner",    requirements: [r("l3_f_total_sessions", 20)] },
      { tier: "bronze",  name: "Strength Builder",     requirements: [r("l3_f_bench_press", 60), r("l3_f_squat", 80), r("l3_f_total_sessions", 50)] },
      { tier: "silver",  name: "Strength Beast",       requirements: [r("l3_f_bench_press", 80), r("l3_f_squat", 120), r("l3_f_deadlift", 120), r("l3_f_pullups", 10)] },
      { tier: "gold",    name: "Strength Master",      requirements: [r("l3_f_bench_press", 100), r("l3_f_squat", 140), r("l3_f_deadlift", 160), r("l3_f_pullups", 15)] },
      { tier: "diamond", name: "Strength Titan",       requirements: [r("l3_f_bench_press", 120), r("l3_f_squat", 170), r("l3_f_deadlift", 190), r("l3_f_pullups", 22)] },
      { tier: "mythic",  name: "Strength Myth",        requirements: [r("l3_f_bench_press", 140), r("l3_f_squat", 200), r("l3_f_deadlift", 220), r("l3_f_pullups", 30)] },
    ],
  },
  {
    l2Id: "l2_f_body_comp",
    tiers: [
      { tier: "iron",    name: "Body Starter",         requirements: [r("l3_f_progress_photos", 2)] },
      { tier: "bronze",  name: "Body Builder",         requirements: [r("l3_f_progress_photos", 6), r("l3_f_weight_lost", 3)] },
      { tier: "silver",  name: "Body Sculptor",        requirements: [r("l3_f_weight_lost", 8), r("l3_f_muscle_gained", 3), r("l3_f_progress_photos", 12)] },
      { tier: "gold",    name: "Body Artist",          requirements: [r("l3_f_weight_lost", 15), r("l3_f_muscle_gained", 7), r("l3_f_body_measurements", 10)] },
      { tier: "diamond", name: "Body Masterpiece",     requirements: [r("l3_f_weight_lost", 20), r("l3_f_muscle_gained", 12), r("l3_f_progress_photos", 40)] },
      { tier: "mythic",  name: "Body Myth",            requirements: [r("l3_f_weight_lost", 25), r("l3_f_muscle_gained", 15), r("l3_f_body_measurements", 20), r("l3_f_progress_photos", 52)] },
    ],
  },
  {
    l2Id: "l2_f_nutrition",
    tiers: [
      { tier: "iron",    name: "Nutrition Rookie",     requirements: [r("l3_f_consecutive_weeks", 4)] },
      { tier: "bronze",  name: "Nutrition Aware",      requirements: [r("l3_f_consecutive_weeks", 12), r("l3_f_weight_lost", 2)] },
      { tier: "silver",  name: "Nutrition Disciplined", requirements: [r("l3_f_consecutive_weeks", 24), r("l3_f_weight_lost", 5), r("l3_f_muscle_gained", 2)] },
      { tier: "gold",    name: "Nutrition Master",     requirements: [r("l3_f_consecutive_weeks", 36), r("l3_f_weight_lost", 12), r("l3_f_muscle_gained", 6)] },
      { tier: "diamond", name: "Nutrition Sage",       requirements: [r("l3_f_consecutive_weeks", 48), r("l3_f_weight_lost", 20), r("l3_f_muscle_gained", 10)] },
      { tier: "mythic",  name: "Nutrition Myth",       requirements: [r("l3_f_consecutive_weeks", 52), r("l3_f_weight_lost", 25), r("l3_f_muscle_gained", 15)] },
    ],
  },
  {
    l2Id: "l2_f_training_discipline",
    tiers: [
      { tier: "iron",    name: "Training Rookie",      requirements: [r("l3_f_total_sessions", 20)] },
      { tier: "bronze",  name: "Training Regular",     requirements: [r("l3_f_total_sessions", 75), r("l3_f_consecutive_weeks", 8)] },
      { tier: "silver",  name: "Training Machine",     requirements: [r("l3_f_total_sessions", 200), r("l3_f_consecutive_weeks", 24), r("l3_f_training_hours", 150)] },
      { tier: "gold",    name: "Training Warrior",     requirements: [r("l3_f_total_sessions", 400), r("l3_f_consecutive_weeks", 40), r("l3_f_training_hours", 400)] },
      { tier: "diamond", name: "Training Legend",       requirements: [r("l3_f_total_sessions", 700), r("l3_f_consecutive_weeks", 48), r("l3_f_training_hours", 700)] },
      { tier: "mythic",  name: "Training Myth",        requirements: [r("l3_f_total_sessions", 1000), r("l3_f_consecutive_weeks", 52), r("l3_f_training_hours", 1000)] },
    ],
  },
]

// ============================================================================
// Wealth Badge Requirements — threshold-based tiers
// ============================================================================

export const WLT_BADGE_REQUIREMENTS: BadgeConfig[] = [
  {
    l2Id: "l2_w_budgeting",
    tiers: [
      { tier: "iron",    name: "Budget Beginner",      requirements: [r("l3_w_emergency_fund", 1)] },
      { tier: "bronze",  name: "Budget Tracker",       requirements: [r("l3_w_emergency_fund", 3), r("l3_w_net_worth", 10000)] },
      { tier: "silver",  name: "Budget Master",        requirements: [r("l3_w_emergency_fund", 6), r("l3_w_net_worth", 50000)] },
      { tier: "gold",    name: "Budget Wizard",        requirements: [r("l3_w_emergency_fund", 9), r("l3_w_net_worth", 200000), r("l3_w_income_streams", 2)] },
      { tier: "diamond", name: "Budget Legend",         requirements: [r("l3_w_emergency_fund", 12), r("l3_w_net_worth", 500000), r("l3_w_income_streams", 3)] },
      { tier: "mythic",  name: "Budget Myth",          requirements: [r("l3_w_emergency_fund", 12), r("l3_w_net_worth", 1000000), r("l3_w_income_streams", 5)] },
    ],
  },
  {
    l2Id: "l2_w_earning",
    tiers: [
      { tier: "iron",    name: "Earning Starter",      requirements: [r("l3_w_monthly_income", 4000)] },
      { tier: "bronze",  name: "Earning Grower",       requirements: [r("l3_w_monthly_income", 6000), r("l3_w_skills", 3)] },
      { tier: "silver",  name: "Earning Machine",      requirements: [r("l3_w_monthly_income", 10000), r("l3_w_side_income", 1000), r("l3_w_skills", 7)] },
      { tier: "gold",    name: "Earning Master",       requirements: [r("l3_w_monthly_income", 14000), r("l3_w_side_income", 4000), r("l3_w_income_streams", 3)] },
      { tier: "diamond", name: "Earning Mogul",        requirements: [r("l3_w_monthly_income", 18000), r("l3_w_side_income", 7000), r("l3_w_income_streams", 4)] },
      { tier: "mythic",  name: "Earning Myth",         requirements: [r("l3_w_monthly_income", 20000), r("l3_w_side_income", 10000), r("l3_w_income_streams", 5), r("l3_w_skills", 20)] },
    ],
  },
  {
    l2Id: "l2_w_investing",
    tiers: [
      { tier: "iron",    name: "Investor Novice",      requirements: [r("l3_w_portfolio", 5000)] },
      { tier: "bronze",  name: "Investor Beginner",    requirements: [r("l3_w_portfolio", 20000), r("l3_w_diversification", 2)] },
      { tier: "silver",  name: "Investor Builder",     requirements: [r("l3_w_portfolio", 75000), r("l3_w_diversification", 3), r("l3_w_net_worth", 100000)] },
      { tier: "gold",    name: "Investor Pro",         requirements: [r("l3_w_portfolio", 200000), r("l3_w_diversification", 5), r("l3_w_net_worth", 400000)] },
      { tier: "diamond", name: "Investor Legend",       requirements: [r("l3_w_portfolio", 350000), r("l3_w_diversification", 6), r("l3_w_net_worth", 700000)] },
      { tier: "mythic",  name: "Investor Myth",        requirements: [r("l3_w_portfolio", 500000), r("l3_w_diversification", 7), r("l3_w_net_worth", 1000000)] },
    ],
  },
  {
    l2Id: "l2_w_debt_free",
    tiers: [
      { tier: "iron",    name: "Debt Drowning",        requirements: [r("l3_w_emergency_fund", 1)] },
      { tier: "bronze",  name: "Debt Fighting",        requirements: [r("l3_w_emergency_fund", 3), r("l3_w_net_worth", 5000)] },
      { tier: "silver",  name: "Debt Shrinking",       requirements: [r("l3_w_emergency_fund", 6), r("l3_w_net_worth", 50000)] },
      { tier: "gold",    name: "Debt Crushing",        requirements: [r("l3_w_emergency_fund", 9), r("l3_w_net_worth", 200000)] },
      { tier: "diamond", name: "Debt Free",            requirements: [r("l3_w_emergency_fund", 12), r("l3_w_net_worth", 500000)] },
      { tier: "mythic",  name: "Debt Myth",            requirements: [r("l3_w_emergency_fund", 12), r("l3_w_net_worth", 1000000)] },
    ],
  },
]

// ============================================================================
// Vices Badge Requirements — threshold-based tiers
// ============================================================================

export const VIC_BADGE_REQUIREMENTS: BadgeConfig[] = [
  {
    l2Id: "l2_v_porn_free",
    tiers: [
      { tier: "iron",    name: "Barely Free",          requirements: [r("l3_v_porn_free_days", 7)] },
      { tier: "bronze",  name: "Getting Free",         requirements: [r("l3_v_porn_free_days", 30), r("l3_v_nofap_streak", 7)] },
      { tier: "silver",  name: "Staying Free",         requirements: [r("l3_v_porn_free_days", 90), r("l3_v_nofap_streak", 21)] },
      { tier: "gold",    name: "Truly Free",           requirements: [r("l3_v_porn_free_days", 180), r("l3_v_nofap_streak", 45)] },
      { tier: "diamond", name: "Forever Free",         requirements: [r("l3_v_porn_free_days", 270), r("l3_v_nofap_streak", 70)] },
      { tier: "mythic",  name: "Mythic Free",          requirements: [r("l3_v_porn_free_days", 365), r("l3_v_nofap_streak", 90)] },
    ],
  },
  {
    l2Id: "l2_v_digital",
    tiers: [
      { tier: "iron",    name: "Digital Slave",        requirements: [r("l3_v_screen_streak", 3)] },
      { tier: "bronze",  name: "Digital Aware",        requirements: [r("l3_v_screen_streak", 7)] },
      { tier: "silver",  name: "Digital Disciplined",  requirements: [r("l3_v_screen_streak", 21)] },
      { tier: "gold",    name: "Digital Master",       requirements: [r("l3_v_screen_streak", 45)] },
      { tier: "diamond", name: "Digital Monk",         requirements: [r("l3_v_screen_streak", 70)] },
      { tier: "mythic",  name: "Digital Myth",         requirements: [r("l3_v_screen_streak", 90)] },
    ],
  },
  {
    l2Id: "l2_v_substance",
    tiers: [
      { tier: "iron",    name: "Substance Dependent",  requirements: [r("l3_v_sober_days", 7)] },
      { tier: "bronze",  name: "Substance Aware",      requirements: [r("l3_v_sober_days", 30)] },
      { tier: "silver",  name: "Substance Reducing",   requirements: [r("l3_v_sober_days", 90), r("l3_v_smoke_free", 30)] },
      { tier: "gold",    name: "Substance Clean",      requirements: [r("l3_v_sober_days", 180), r("l3_v_smoke_free", 90)] },
      { tier: "diamond", name: "Substance Free",       requirements: [r("l3_v_sober_days", 270), r("l3_v_smoke_free", 180)] },
      { tier: "mythic",  name: "Substance Myth",       requirements: [r("l3_v_sober_days", 365), r("l3_v_smoke_free", 365)] },
    ],
  },
  {
    l2Id: "l2_v_willpower",
    tiers: [
      { tier: "iron",    name: "Willpower Weak",       requirements: [r("l3_v_impulse_free", 4)] },
      { tier: "bronze",  name: "Willpower Growing",    requirements: [r("l3_v_impulse_free", 12), r("l3_v_screen_streak", 7)] },
      { tier: "silver",  name: "Willpower Strong",     requirements: [r("l3_v_impulse_free", 24), r("l3_v_porn_free_days", 30), r("l3_v_screen_streak", 21)] },
      { tier: "gold",    name: "Willpower Iron",       requirements: [r("l3_v_impulse_free", 36), r("l3_v_porn_free_days", 90), r("l3_v_sober_days", 90)] },
      { tier: "diamond", name: "Willpower Unbreakable", requirements: [r("l3_v_impulse_free", 48), r("l3_v_porn_free_days", 180), r("l3_v_sober_days", 180), r("l3_v_screen_streak", 60)] },
      { tier: "mythic",  name: "Willpower Myth",       requirements: [r("l3_v_impulse_free", 52), r("l3_v_porn_free_days", 365), r("l3_v_sober_days", 365), r("l3_v_screen_streak", 90)] },
    ],
  },
]

// ============================================================================
// Combined Badge Requirements — all areas, single threshold system
// ============================================================================

export const ALL_BADGE_REQUIREMENTS: BadgeConfig[] = [
  ...DAYGAME_BADGE_REQUIREMENTS,
  ...PG_BADGE_REQUIREMENTS,
  ...FIT_BADGE_REQUIREMENTS,
  ...WLT_BADGE_REQUIREMENTS,
  ...VIC_BADGE_REQUIREMENTS,
]

/** Set of all L2 IDs that use threshold-based badges */
export const THRESHOLD_L2_IDS = new Set(ALL_BADGE_REQUIREMENTS.map((b) => b.l2Id))

// ============================================================================
// Achievement Weights — per-L2, each sums to 1.0 (non-daygame areas only)
// ============================================================================

const PER_L2_WEIGHTS: Record<string, Record<string, number>> = {

  // ---- PERSONAL GROWTH WEIGHTS ----

  // Master Mindfulness & Presence (8 L3s)
  l2_pg_mindfulness: {
    l3_pg_meditation: 0.20,
    l3_pg_gratitude: 0.13,
    l3_pg_meditation_hours: 0.16,
    l3_pg_meditation_streak: 0.13,
    l3_pg_journal: 0.09,
    l3_pg_weekly_reviews: 0.09,
    l3_pg_therapy: 0.08,
    l3_pg_breathwork: 0.12,
  },
  // Build Mental Toughness & Resilience (6 L3s)
  l2_pg_toughness: {
    l3_pg_comfort_zone: 0.20,
    l3_pg_cold_exposure: 0.15,
    l3_pg_challenges_completed: 0.20,
    l3_pg_cold_streak: 0.15,
    l3_pg_morning_routine: 0.15,
    l3_pg_routine_streak: 0.15,
  },
  // Become Well-Read & Knowledgeable (6 L3s)
  l2_pg_well_read: {
    l3_pg_books: 0.25,
    l3_pg_courses: 0.15,
    l3_pg_study_hours: 0.20,
    l3_pg_reading_hours: 0.20,
    l3_pg_journal: 0.10,
    l3_pg_journal_entries: 0.10,
  },
  // Master Journaling & Self-Reflection (7 L3s)
  l2_pg_reflection: {
    l3_pg_journal: 0.20,
    l3_pg_weekly_reviews: 0.13,
    l3_pg_therapy: 0.12,
    l3_pg_journal_entries: 0.17,
    l3_pg_gratitude: 0.13,
    l3_pg_meditation: 0.13,
    l3_pg_retreats: 0.12,
  },
  // Develop Emotional Intelligence (7 L3s)
  l2_pg_eq: {
    l3_pg_meditation: 0.17,
    l3_pg_gratitude: 0.13,
    l3_pg_meditation_hours: 0.13,
    l3_pg_journal: 0.17,
    l3_pg_therapy: 0.13,
    l3_pg_journal_entries: 0.13,
    l3_pg_breathwork: 0.14,
  },
  // Build Iron Discipline (6 L3s)
  l2_pg_discipline: {
    l3_pg_morning_routine: 0.20,
    l3_pg_routine_streak: 0.20,
    l3_pg_cold_exposure: 0.15,
    l3_pg_cold_streak: 0.15,
    l3_pg_comfort_zone: 0.15,
    l3_pg_challenges_completed: 0.15,
  },

  // ---- FITNESS WEIGHTS ----

  // Build Real Strength (10 L3s)
  l2_f_strength: {
    l3_f_bench_press: 0.16,
    l3_f_squat: 0.16,
    l3_f_deadlift: 0.16,
    l3_f_overhead_press: 0.09,
    l3_f_pullups: 0.09,
    l3_f_gym_frequency: 0.08,
    l3_f_total_sessions: 0.07,
    l3_f_consecutive_weeks: 0.06,
    l3_f_training_hours: 0.05,
    l3_f_combat_sports: 0.08,
  },
  // Transform Body Composition (9 L3s)
  l2_f_body_comp: {
    l3_f_weight_lost: 0.18,
    l3_f_muscle_gained: 0.18,
    l3_f_body_measurements: 0.11,
    l3_f_progress_photos: 0.07,
    l3_f_gym_frequency: 0.11,
    l3_f_total_sessions: 0.07,
    l3_f_protein: 0.09,
    l3_f_calorie_target: 0.09,
    l3_f_cardio_sessions: 0.10,
  },
  // Master Nutrition & Recovery (7 L3s)
  l2_f_nutrition: {
    l3_f_protein: 0.22,
    l3_f_meals_prepped: 0.18,
    l3_f_water: 0.13,
    l3_f_calorie_target: 0.17,
    l3_f_weight_lost: 0.12,
    l3_f_muscle_gained: 0.10,
    l3_f_consecutive_weeks: 0.08,
  },
  // Build Unbreakable Training Discipline (18 L3s)
  l2_f_training_discipline: {
    l3_f_gym_frequency: 0.09,
    l3_f_total_sessions: 0.08,
    l3_f_consecutive_weeks: 0.08,
    l3_f_training_hours: 0.06,
    l3_f_cardio_sessions: 0.05,
    l3_f_combat_sports: 0.05,
    l3_f_protein: 0.05,
    l3_f_weight_lost: 0.06,
    l3_f_muscle_gained: 0.06,
    l3_f_body_measurements: 0.04,
    l3_f_progress_photos: 0.03,
    l3_f_bench_press: 0.06,
    l3_f_squat: 0.06,
    l3_f_deadlift: 0.05,
    l3_f_mobility_sessions: 0.05,
    l3_f_yoga: 0.04,
    l3_f_flexibility_hours: 0.04,
    l3_f_running_sessions: 0.05,
  },

  // ---- WEALTH WEIGHTS ----

  // Master Budgeting & Saving (6 L3s)
  l2_w_budgeting: {
    l3_w_net_worth: 0.20,
    l3_w_savings_rate: 0.18,
    l3_w_emergency_fund: 0.22,
    l3_w_spending_discipline: 0.15,
    l3_w_income_streams: 0.10,
    l3_w_monthly_income: 0.15,
  },
  // Maximize Earning Power (10 L3s)
  l2_w_earning: {
    l3_w_monthly_income: 0.16,
    l3_w_side_income: 0.13,
    l3_w_networking: 0.07,
    l3_w_skills: 0.12,
    l3_w_deep_work: 0.10,
    l3_w_income_streams: 0.08,
    l3_w_public_speaking: 0.08,
    l3_w_side_revenue: 0.10,
    l3_w_customers: 0.08,
    l3_w_entrepreneurship_hours: 0.08,
  },
  // Build Investment Portfolio (5 L3s)
  l2_w_investing: {
    l3_w_portfolio: 0.30,
    l3_w_education: 0.15,
    l3_w_diversification: 0.20,
    l3_w_returns_tracked: 0.15,
    l3_w_net_worth: 0.20,
  },
  // Become Completely Debt Free (4 L3s)
  l2_w_debt_free: {
    l3_w_savings_rate: 0.25,
    l3_w_spending_discipline: 0.30,
    l3_w_emergency_fund: 0.25,
    l3_w_net_worth: 0.20,
  },

  // ---- VICES & ELIMINATION WEIGHTS ----

  // Overcome Porn Addiction (6 L3s)
  l2_v_porn_free: {
    l3_v_porn_free_days: 0.25,
    l3_v_nofap_streak: 0.20,
    l3_v_porn_free_sustained: 0.20,
    l3_v_urge_journal: 0.15,
    l3_v_no_late_scrolling: 0.10,
    l3_v_dopamine_detox: 0.10,
  },
  // Master Digital Discipline (6 L3s)
  l2_v_digital: {
    l3_v_screen_time: 0.22,
    l3_v_social_media_free: 0.18,
    l3_v_no_gaming: 0.15,
    l3_v_dopamine_detox: 0.13,
    l3_v_screen_streak: 0.17,
    l3_v_no_late_scrolling: 0.15,
  },
  // Conquer Substance Habits (5 L3s)
  l2_v_substance: {
    l3_v_alcohol_free: 0.25,
    l3_v_sober_days: 0.25,
    l3_v_smoke_free: 0.20,
    l3_v_clean_eating: 0.15,
    l3_v_junk_food_free: 0.15,
  },
  // Build Unbreakable Self-Control (all 17 L3s)
  l2_v_willpower: {
    l3_v_porn_free_days: 0.07,
    l3_v_nofap_streak: 0.06,
    l3_v_porn_free_sustained: 0.06,
    l3_v_urge_journal: 0.05,
    l3_v_screen_time: 0.07,
    l3_v_social_media_free: 0.06,
    l3_v_no_gaming: 0.05,
    l3_v_dopamine_detox: 0.05,
    l3_v_screen_streak: 0.06,
    l3_v_alcohol_free: 0.07,
    l3_v_sober_days: 0.06,
    l3_v_smoke_free: 0.05,
    l3_v_clean_eating: 0.05,
    l3_v_junk_food_free: 0.06,
    l3_v_impulse_free: 0.06,
    l3_v_no_late_scrolling: 0.06,
    l3_v_budget_days: 0.06,
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
 * Filter weights to active goals only and redistribute so they sum to 1.0.
 * Users who opt out of certain goals (e.g. dirty dog) can still reach 100%
 * on any badge — progress is always relative to the goals they picked.
 */
export function redistributeWeights(
  weights: AchievementWeight[],
  activeGoalIds: Set<string>
): AchievementWeight[] {
  const active = weights.filter((w) => activeGoalIds.has(w.goalId))
  if (active.length === 0) return []
  const total = active.reduce((sum, w) => sum + w.weight, 0)
  if (total === 0) return active
  return active.map((w) => ({ goalId: w.goalId, weight: w.weight / total }))
}

/**
 * Get all L2 achievements that reference a given L3 goal in their weights.
 * Used by setup wizard to show which badges a selected L3 contributes to.
 */
export function getL2AchievementsForL3(l3Id: string): GoalTemplate[] {
  const l2Ids = new Set<string>()
  // Search weighted badges (non-daygame)
  for (const w of DEFAULT_ACHIEVEMENT_WEIGHTS) {
    if (w.goalId === l3Id) {
      l2Ids.add(w.achievementId)
    }
  }
  // Search threshold badges (daygame) via L2_L3_CONNECTIONS
  for (const [l2Id, l3Ids] of Object.entries(L2_L3_CONNECTIONS)) {
    if (l3Ids.includes(l3Id)) {
      l2Ids.add(l2Id)
    }
  }
  return Array.from(l2Ids).map((id) => GOAL_TEMPLATE_MAP[id]).filter(Boolean)
}

/**
 * Get all L3 templates grouped by display category.
 */
export function getTemplatesByCategory(): Partial<Record<GoalDisplayCategory, GoalTemplate[]>> {
  return {
    // Daygame
    field_work: L3_FIELD_WORK,
    results: L3_RESULTS,
    dirty_dog: L3_DIRTY_DOG,
    texting: L3_TEXTING,
    dates: L3_DATES,
    scenarios: L3_SCENARIOS,
    relationship: L3_RELATIONSHIP,
    // Personal Growth
    mindfulness: L3_PG_MINDFULNESS,
    resilience: L3_PG_RESILIENCE,
    learning: L3_PG_LEARNING,
    reflection: L3_PG_REFLECTION,
    discipline: L3_PG_DISCIPLINE,
    // Fitness
    strength: L3_FIT_STRENGTH,
    training: L3_FIT_TRAINING,
    nutrition: L3_FIT_NUTRITION,
    body_comp: L3_FIT_BODY_COMP,
    flexibility: L3_FIT_FLEXIBILITY,
    endurance: L3_FIT_ENDURANCE,
    // Wealth
    income: L3_WLT_INCOME,
    saving: L3_WLT_SAVING,
    investing: L3_WLT_INVESTING,
    career_growth: L3_WLT_CAREER,
    entrepreneurship: L3_WLT_ENTREPRENEURSHIP,
    // Vices & Elimination
    porn_freedom: L3_VIC_PORN,
    digital_discipline: L3_VIC_DIGITAL,
    substance_control: L3_VIC_SUBSTANCE,
    self_control: L3_VIC_SELF_CONTROL,
  }
}

/**
 * Get L3 templates for a specific life area grouped by category.
 */
export function getTemplatesByCategoryForArea(lifeArea: string): Partial<Record<GoalDisplayCategory, GoalTemplate[]>> {
  const all = getTemplatesByCategory()
  const filtered: Partial<Record<GoalDisplayCategory, GoalTemplate[]>> = {}
  for (const [cat, templates] of Object.entries(all)) {
    const areaTemplates = templates!.filter((t) => t.lifeArea === lifeArea)
    if (areaTemplates.length > 0) {
      filtered[cat as GoalDisplayCategory] = areaTemplates
    }
  }
  return filtered
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
 * Life area catalog — L1 goals, L2 achievements, and L3 goals for each area.
 */
export interface AreaCatalog {
  l1Goals: GoalTemplate[]
  l2Achievements: GoalTemplate[]
  l3ByCategory: Partial<Record<GoalDisplayCategory, GoalTemplate[]>>
}

/**
 * Get the full catalog for a specific life area.
 */
export function getAreaCatalog(lifeArea: string): AreaCatalog | null {
  switch (lifeArea) {
    case "daygame":
      return {
        l1Goals: [...L1_ONE_PERSON, ...L1_ABUNDANCE],
        l2Achievements: L2_TEMPLATES,
        l3ByCategory: getTemplatesByCategoryForArea("daygame"),
      }
    case "personal_growth":
      return {
        l1Goals: L1_PERSONAL_GROWTH,
        l2Achievements: L2_PG_TEMPLATES,
        l3ByCategory: getTemplatesByCategoryForArea("personal_growth"),
      }
    case "health_fitness":
      return {
        l1Goals: L1_FITNESS,
        l2Achievements: L2_FIT_TEMPLATES,
        l3ByCategory: getTemplatesByCategoryForArea("health_fitness"),
      }
    case "career_business":
      return {
        l1Goals: L1_WEALTH,
        l2Achievements: L2_WLT_TEMPLATES,
        l3ByCategory: getTemplatesByCategoryForArea("career_business"),
      }
    case "vices_elimination":
      return {
        l1Goals: L1_VICES,
        l2Achievements: L2_VIC_TEMPLATES,
        l3ByCategory: getTemplatesByCategoryForArea("vices_elimination"),
      }
    default:
      return null
  }
}

/**
 * Return all daygame goal templates organized by tier for the catalog picker.
 * @deprecated Use getAreaCatalog() for multi-area support
 */
export function getCatalogTiers(): {
  tier1: { onePerson: GoalTemplate[]; abundance: GoalTemplate[] }
  tier2: GoalTemplate[]
  tier3: Partial<Record<GoalDisplayCategory, GoalTemplate[]>>
} {
  return {
    tier1: { onePerson: L1_ONE_PERSON, abundance: L1_ABUNDANCE },
    tier2: L2_TEMPLATES,
    tier3: getTemplatesByCategoryForArea("daygame"),
  }
}

// ============================================================================
// Cross-Area Connections (Phase 3.4)
// ============================================================================

/**
 * Cross-area edges connect goals from different life areas.
 * Used for weekly review insights and "whole-man" progress visualization.
 */
export const CROSS_AREA_EDGES: CrossAreaEdge[] = [
  // Personal Growth → Daygame
  { sourceId: "l3_pg_meditation", targetId: "l2_approach", weight: 0.7, relationship: "supports" },
  { sourceId: "l3_pg_comfort_zone", targetId: "l3_approach_volume", weight: 0.6, relationship: "enables" },
  { sourceId: "l3_pg_cold_exposure", targetId: "l2_approach", weight: 0.5, relationship: "supports" },
  { sourceId: "l3_pg_books", targetId: "l2_tongue", weight: 0.4, relationship: "reinforces" },
  { sourceId: "l3_pg_morning_routine", targetId: "l3_session_frequency", weight: 0.4, relationship: "enables" },

  // Fitness → Daygame
  { sourceId: "l3_f_gym_frequency", targetId: "l2_results", weight: 0.5, relationship: "supports" },
  { sourceId: "l3_f_gym_frequency", targetId: "l2_inner", weight: 0.4, relationship: "supports" },

  // Vices → Daygame
  { sourceId: "l3_v_porn_free_days", targetId: "l2_inner", weight: 0.6, relationship: "enables" },
  { sourceId: "l3_v_screen_time", targetId: "l3_session_frequency", weight: 0.3, relationship: "enables" },

  // Fitness → Personal Growth
  { sourceId: "l3_f_gym_frequency", targetId: "l2_pg_discipline", weight: 0.5, relationship: "reinforces" },

  // Personal Growth → Vices
  { sourceId: "l3_pg_meditation", targetId: "l2_v_willpower", weight: 0.5, relationship: "supports" },
]

/**
 * Get all cross-area edges where this template is either source or target.
 */
export function getCrossAreaInfluence(templateId: string): CrossAreaEdge[] {
  return CROSS_AREA_EDGES.filter((e) => e.sourceId === templateId || e.targetId === templateId)
}

/**
 * Get cross-area edges where this template is the target (influenced BY other areas).
 */
export function getCrossAreaContributors(templateId: string): CrossAreaEdge[] {
  return CROSS_AREA_EDGES.filter((e) => e.targetId === templateId)
}

/**
 * Get immediate parents of a template in the goal graph (reverse of getChildren).
 */
export function getParents(childId: string): GoalTemplate[] {
  const parentIds = GOAL_GRAPH_EDGES
    .filter((e) => e.childId === childId)
    .map((e) => e.parentId)
  return parentIds.map((id) => GOAL_TEMPLATE_MAP[id]).filter(Boolean)
}

/** FTO L1 IDs (Find The One path). */
const FTO_L1_IDS = new Set(L1_ONE_PERSON.map((t) => t.id))

/**
 * Get daygame L1 goals for a specific path (FTO or Abundance).
 */
export function getDaygamePathL1(path: "fto" | "abundance"): GoalTemplate[] {
  const l1s = GOAL_TEMPLATES.filter((t) => t.lifeArea === "daygame" && t.level === 1 && !t.requiresOptIn)
  if (path === "fto") return l1s.filter((t) => FTO_L1_IDS.has(t.id))
  return l1s.filter((t) => !FTO_L1_IDS.has(t.id))
}
