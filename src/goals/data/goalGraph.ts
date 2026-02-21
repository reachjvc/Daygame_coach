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
  // Existing
  template("l2_master_daygame", "Master Daygame", 2, "outcome"),
  template("l2_confident", "Become Confident with Women", 2, "outcome"),
  // New — Daygame-focused
  template("l2_overcome_aa", "Overcome Approach Anxiety Permanently", 2, "outcome"),
  template("l2_master_cold_approach", "Master Cold Approach", 2, "outcome"),
  template("l2_great_talker", "Master Conversational Game", 2, "outcome"),
  template("l2_master_seduction", "Master Seduction & Attraction", 2, "outcome"),
  template("l2_attract_any", "Be Able to Attract Any Woman I Want", 2, "outcome"),
  template("l2_inner_game", "Master Inner Game", 2, "outcome"),
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
    linkedMetric: "field_reports_weekly",
  }),
  template("l3_approach_quality", "Approach Quality Self-Rating", 3, "input", {
    displayCategory: "field_work",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 3, target: 8, steps: 5, curveTension: CURVE_TENSION },
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
  template("l3_eye_contact_holds", "Eye Contact Holds with Strangers", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 8 },
      { frequencyPerWeek: 10, durationWeeks: 12 },
      { frequencyPerWeek: 20, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
  template("l3_aa_comfort_rating", "Pre-Session Anxiety Level", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
  template("l3_positive_references", "Positive Reference Experiences Logged", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
  template("l3_warmup_routine", "Warm-Up Routine Completed", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 48 },
    ],
    priority: "niche",
  }),
  template("l3_vocal_practice", "Vocal Tonality Drills", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 8 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
  template("l3_wing_feedback", "Wing Feedback Sessions", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 48 },
    ],
    blindSpotTool: true,
  }),
  template("l3_video_review", "Approach Video Reviews", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 48 },
    ],
    blindSpotTool: true,
  }),
  template("l3_daygame_weekly_review", "Daygame Weekly Reviews", 3, "input", {
    displayCategory: "field_work",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 48 },
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
    milestoneConfig: { start: 1, target: 15, steps: 6, curveTension: CURVE_TENSION },
  }),
  template("l3_lays", "Lays from Daygame", 3, "outcome", {
    displayCategory: "dirty_dog",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
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
  template("l3_physical_escalation", "Physical Escalation on Dates", 3, "outcome", {
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

// -- Dating: Relationship --
const L3_RELATIONSHIP: GoalTemplate[] = [
  template("l3_women_dating", "Active Rotation / Women Dating", 3, "outcome", {
    displayCategory: "relationship",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 5, steps: 5, curveTension: 0 },
  }),
  // Gap templates
  template("l3_boundaries_set", "Boundaries Clearly Set", 3, "input", {
    displayCategory: "relationship",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 10, steps: 5, curveTension: CURVE_TENSION },
    priority: "niche",
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
// SOCIAL — Templates
// ============================================================================

const SOC = "social" // life area shorthand

// --- Social: Level 1 ---
const L1_SOCIAL: GoalTemplate[] = [
  template("l1_s_incredible_circle", "Have an incredible social circle", 1, "outcome", { lifeArea: SOC }),
  template("l1_s_confident_anywhere", "Be the most confident person in any room", 1, "outcome", { lifeArea: SOC }),
  template("l1_s_lifelong_friends", "Build deep, lifelong friendships", 1, "outcome", { lifeArea: SOC }),
  template("l1_s_social_leader", "Become a social leader", 1, "outcome", { lifeArea: SOC }),
]

// --- Social: Level 2 (Achievements) ---
const L2_SOC_TEMPLATES: GoalTemplate[] = [
  template("l2_s_inner_circle", "Build a Strong Inner Circle", 2, "outcome", { lifeArea: SOC }),
  template("l2_s_magnetic", "Become Socially Magnetic", 2, "outcome", { lifeArea: SOC }),
  template("l2_s_hosting", "Master Hosting & Events", 2, "outcome", { lifeArea: SOC }),
  template("l2_s_network", "Expand Your Network", 2, "outcome", { lifeArea: SOC }),
  template("l2_s_connector", "Become a Connector", 2, "outcome", { lifeArea: SOC }),
]

// --- Social: Level 3 ---

// -- Social Activity (4 habit_ramp + 1 milestone_ladder) --
const L3_SOC_ACTIVITY: GoalTemplate[] = [
  template("l3_s_social_events", "Social Events Attended", 3, "input", {
    lifeArea: SOC, displayCategory: "social_activity",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
    priority: "core",
    graduation_criteria: "Consistently attending 3+ social events/week for 8+ weeks",
  }),
  template("l3_s_new_conversations", "Conversations with New People", 3, "input", {
    lifeArea: SOC, displayCategory: "social_activity",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 4 },
      { frequencyPerWeek: 7, durationWeeks: 12 },
      { frequencyPerWeek: 14, durationWeeks: 24 },
    ],
    priority: "core",
  }),
  template("l3_s_group_activities", "Group Activities", 3, "input", {
    lifeArea: SOC, displayCategory: "social_activity",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
  }),
  template("l3_s_plans_initiated", "Plans Initiated", 3, "input", {
    lifeArea: SOC, displayCategory: "social_activity",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 4 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
  }),
  template("l3_s_total_events_attended", "Total Social Events Attended", 3, "outcome", {
    lifeArea: SOC, displayCategory: "social_activity",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 500, steps: 12, curveTension: CURVE_TENSION },
  }),
]

// -- Friendships (4 habit_ramp + 1 milestone_ladder) --
const L3_SOC_FRIENDSHIPS: GoalTemplate[] = [
  template("l3_s_friend_hangouts", "Friend Calls & Hangouts", 3, "input", {
    lifeArea: SOC, displayCategory: "friendships",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 4 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
    priority: "core",
  }),
  template("l3_s_old_friends", "Reach Out to Old Friends", 3, "input", {
    lifeArea: SOC, displayCategory: "friendships",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
  }),
  template("l3_s_deep_conversations", "Deep 1-on-1 Conversations", 3, "input", {
    lifeArea: SOC, displayCategory: "friendships",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
  }),
  template("l3_s_quality_time", "Quality Time with Close Friends", 3, "input", {
    lifeArea: SOC, displayCategory: "friendships",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 4 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
  }),
  template("l3_s_close_friends", "Close Friendships Built", 3, "outcome", {
    lifeArea: SOC, displayCategory: "friendships",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 15, steps: 8, curveTension: CURVE_TENSION },
  }),
]

// -- Hosting (3 habit_ramp + 2 milestone_ladder) --
const L3_SOC_HOSTING: GoalTemplate[] = [
  template("l3_s_gatherings", "Gatherings & Dinners Hosted", 3, "input", {
    lifeArea: SOC, displayCategory: "hosting",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 1, durationWeeks: 24 },
    ],
  }),
  template("l3_s_organized_activities", "Group Activities Organized", 3, "input", {
    lifeArea: SOC, displayCategory: "hosting",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
  }),
  template("l3_s_introductions", "Friends Introduced to Each Other", 3, "input", {
    lifeArea: SOC, displayCategory: "hosting",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
  }),
  template("l3_s_events_planned", "Events Planned & Executed", 3, "outcome", {
    lifeArea: SOC, displayCategory: "hosting",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 50, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_s_total_hosted", "Total Events Hosted", 3, "outcome", {
    lifeArea: SOC, displayCategory: "hosting",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 100, steps: 10, curveTension: CURVE_TENSION },
  }),
]

// -- Social Skills (1 habit_ramp + 2 milestone_ladder) --
const L3_SOC_SKILLS: GoalTemplate[] = [
  template("l3_s_followups", "Follow-ups Sent Within 24h", 3, "input", {
    lifeArea: SOC, displayCategory: "social_skills",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 4 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
  }),
  template("l3_s_consecutive_social", "Consecutive Weeks Being Social", 3, "outcome", {
    lifeArea: SOC, displayCategory: "social_skills",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 52, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_s_conversations_total", "Total Conversations with Strangers", 3, "outcome", {
    lifeArea: SOC, displayCategory: "social_skills",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 1000, steps: 15, curveTension: CURVE_TENSION },
  }),
]

// -- Network Expansion (3 milestone_ladder) --
const L3_SOC_NETWORK: GoalTemplate[] = [
  template("l3_s_new_people", "New People Met", 3, "outcome", {
    lifeArea: SOC, displayCategory: "network_expansion",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 500, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_s_network_size", "Total Network Connections", 3, "outcome", {
    lifeArea: SOC, displayCategory: "network_expansion",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 10, target: 500, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_s_introductions_received", "Introductions Received", 3, "outcome", {
    lifeArea: SOC, displayCategory: "network_expansion",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 50, steps: 8, curveTension: CURVE_TENSION },
  }),
]

// -- Mentorship (2 habit_ramp + 1 milestone_ladder) --
const L3_SOC_MENTORSHIP: GoalTemplate[] = [
  template("l3_s_mentoring_given", "Mentoring Sessions Given", 3, "input", {
    lifeArea: SOC, displayCategory: "mentorship",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
  template("l3_s_mentoring_received", "Mentoring Sessions Received", 3, "input", {
    lifeArea: SOC, displayCategory: "mentorship",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 48 },
    ],
    priority: "niche",
  }),
  template("l3_s_volunteering", "Community & Volunteering Hours", 3, "input", {
    lifeArea: SOC, displayCategory: "mentorship",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 8 },
      { frequencyPerWeek: 2, durationWeeks: 12 },
      { frequencyPerWeek: 3, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
]

const ALL_L3_SOC = [
  ...L3_SOC_ACTIVITY, ...L3_SOC_FRIENDSHIPS, ...L3_SOC_HOSTING,
  ...L3_SOC_SKILLS, ...L3_SOC_NETWORK, ...L3_SOC_MENTORSHIP,
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
// LIFESTYLE — Templates
// ============================================================================

const LIFE = "lifestyle" // life area shorthand

// --- Lifestyle: Level 1 ---
const L1_LIFESTYLE: GoalTemplate[] = [
  template("l1_li_adventurous", "Live an exciting, adventurous life", 1, "outcome", { lifeArea: LIFE }),
  template("l1_li_well_rounded", "Become a well-rounded, interesting man", 1, "outcome", { lifeArea: LIFE }),
  template("l1_li_environment", "Master my living environment", 1, "outcome", { lifeArea: LIFE }),
  template("l1_li_hobbies", "Develop impressive hobbies and skills", 1, "outcome", { lifeArea: LIFE }),
]

// --- Lifestyle: Level 2 (Achievements) ---
const L2_LIFE_TEMPLATES: GoalTemplate[] = [
  template("l2_li_adventure", "Build an Adventure-Filled Life", 2, "outcome", { lifeArea: LIFE }),
  template("l2_li_creative", "Master a Creative Skill", 2, "outcome", { lifeArea: LIFE }),
  template("l2_li_living_space", "Create an Impressive Living Space", 2, "outcome", { lifeArea: LIFE }),
  template("l2_li_style", "Develop a Personal Style", 2, "outcome", { lifeArea: LIFE }),
  template("l2_li_cook", "Become a Great Cook", 2, "outcome", { lifeArea: LIFE }),
]

// --- Lifestyle: Level 3 ---

// -- Hobbies & Skills --
const L3_LIFE_HOBBIES: GoalTemplate[] = [
  template("l3_li_hobby_sessions", "Hobby Practice Sessions", 3, "input", {
    lifeArea: LIFE, displayCategory: "hobbies_skills",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 8 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 5, durationWeeks: 24 },
    ],
    priority: "core",
  }),
  template("l3_li_instrument_hours", "Musical Instrument Hours", 3, "outcome", {
    lifeArea: LIFE, displayCategory: "hobbies_skills",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 500, steps: 12, curveTension: CURVE_TENSION },
  }),
  template("l3_li_martial_arts", "Martial Arts Classes", 3, "input", {
    lifeArea: LIFE, displayCategory: "hobbies_skills",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 2, durationWeeks: 8 },
      { frequencyPerWeek: 3, durationWeeks: 12 },
      { frequencyPerWeek: 4, durationWeeks: 24 },
    ],
  }),
  template("l3_li_dance_classes", "Dance Classes Attended", 3, "outcome", {
    lifeArea: LIFE, displayCategory: "hobbies_skills",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 100, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_li_creative_projects", "Creative Projects Completed", 3, "outcome", {
    lifeArea: LIFE, displayCategory: "hobbies_skills",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 25, steps: 8, curveTension: CURVE_TENSION },
  }),
  template("l3_li_language_learning", "Language Learning Sessions", 3, "input", {
    lifeArea: LIFE, displayCategory: "hobbies_skills",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 8 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
    priority: "niche",
  }),
]

// -- Cooking & Home --
const L3_LIFE_COOKING: GoalTemplate[] = [
  template("l3_li_home_cooked", "Home-Cooked Meals", 3, "input", {
    lifeArea: LIFE, displayCategory: "cooking_domestic",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 3, durationWeeks: 8 },
      { frequencyPerWeek: 5, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
    priority: "core",
  }),
  template("l3_li_recipes", "Recipes Mastered", 3, "outcome", {
    lifeArea: LIFE, displayCategory: "cooking_domestic",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 50, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_li_deep_clean", "Deep Cleans Completed", 3, "input", {
    lifeArea: LIFE, displayCategory: "cooking_domestic",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 48 },
    ],
  }),
  template("l3_li_home_projects", "Home Improvement Projects", 3, "outcome", {
    lifeArea: LIFE, displayCategory: "cooking_domestic",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 20, steps: 8, curveTension: CURVE_TENSION },
  }),
]

// -- Adventure & Travel --
const L3_LIFE_ADVENTURE: GoalTemplate[] = [
  template("l3_li_new_experiences", "New Experiences Tried", 3, "input", {
    lifeArea: LIFE, displayCategory: "adventure_travel",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 1, durationWeeks: 12 },
      { frequencyPerWeek: 2, durationWeeks: 24 },
    ],
    priority: "core",
  }),
  template("l3_li_places_visited", "Countries or Cities Visited", 3, "outcome", {
    lifeArea: LIFE, displayCategory: "adventure_travel",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 30, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_li_adventures", "Adventure Activities Done", 3, "outcome", {
    lifeArea: LIFE, displayCategory: "adventure_travel",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 50, steps: 10, curveTension: CURVE_TENSION },
  }),
  template("l3_li_weekend_trips", "Weekend Trips Taken", 3, "outcome", {
    lifeArea: LIFE, displayCategory: "adventure_travel",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 24, steps: 8, curveTension: CURVE_TENSION },
  }),
]

// -- Style & Grooming --
const L3_LIFE_STYLE: GoalTemplate[] = [
  template("l3_li_grooming", "Grooming Routine Days", 3, "input", {
    lifeArea: LIFE, displayCategory: "style_grooming",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 6, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
  template("l3_li_wardrobe", "Wardrobe Pieces Upgraded", 3, "outcome", {
    lifeArea: LIFE, displayCategory: "style_grooming",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 20, steps: 8, curveTension: CURVE_TENSION },
  }),
  template("l3_li_skincare", "Skincare Routine Days", 3, "input", {
    lifeArea: LIFE, displayCategory: "style_grooming",
    templateType: "habit_ramp",
    rampSteps: [
      { frequencyPerWeek: 5, durationWeeks: 4 },
      { frequencyPerWeek: 6, durationWeeks: 12 },
      { frequencyPerWeek: 7, durationWeeks: 24 },
    ],
  }),
  template("l3_li_style_experiments", "Style Experiments Tried", 3, "outcome", {
    lifeArea: LIFE, displayCategory: "style_grooming",
    templateType: "milestone_ladder",
    milestoneConfig: { start: 1, target: 20, steps: 8, curveTension: CURVE_TENSION },
  }),
]

const ALL_L3_LIFE = [
  ...L3_LIFE_HOBBIES, ...L3_LIFE_COOKING, ...L3_LIFE_ADVENTURE, ...L3_LIFE_STYLE,
]

// ============================================================================
// Full Catalog
// ============================================================================

const ALL_L3_DAYGAME = [
  ...L3_FIELD_WORK, ...L3_RESULTS, ...L3_DIRTY_DOG,
  ...L3_TEXTING, ...L3_DATES, ...L3_RELATIONSHIP,
]

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // Daygame
  ...L1_ONE_PERSON, ...L1_ABUNDANCE, ...L2_TEMPLATES, ...ALL_L3_DAYGAME,
  // Personal Growth
  ...L1_PERSONAL_GROWTH, ...L2_PG_TEMPLATES, ...ALL_L3_PG,
  // Social
  ...L1_SOCIAL, ...L2_SOC_TEMPLATES, ...ALL_L3_SOC,
  // Fitness
  ...L1_FITNESS, ...L2_FIT_TEMPLATES, ...ALL_L3_FIT,
  // Wealth
  ...L1_WEALTH, ...L2_WLT_TEMPLATES, ...ALL_L3_WLT,
  // Vices & Elimination
  ...L1_VICES, ...L2_VIC_TEMPLATES, ...ALL_L3_VIC,
  // Lifestyle
  ...L1_LIFESTYLE, ...L2_LIFE_TEMPLATES, ...ALL_L3_LIFE,
]

export const GOAL_TEMPLATE_MAP: Record<string, GoalTemplate> =
  Object.fromEntries(GOAL_TEMPLATES.map((t) => [t.id, t]))

// ============================================================================
// Fan-Out Edges
// ============================================================================

// L1 → L2: all L1 goals fan into all achievements (per area)
const L1_TO_L2_DAYGAME: GoalGraphEdge[] = [...L1_ONE_PERSON, ...L1_ABUNDANCE].flatMap((l1) =>
  L2_TEMPLATES.map((l2) => ({ parentId: l1.id, childId: l2.id }))
)
const L1_TO_L2_PG: GoalGraphEdge[] = L1_PERSONAL_GROWTH.flatMap((l1) =>
  L2_PG_TEMPLATES.map((l2) => ({ parentId: l1.id, childId: l2.id }))
)
const L1_TO_L2_SOC: GoalGraphEdge[] = L1_SOCIAL.flatMap((l1) =>
  L2_SOC_TEMPLATES.map((l2) => ({ parentId: l1.id, childId: l2.id }))
)
const L1_TO_L2_FIT: GoalGraphEdge[] = L1_FITNESS.flatMap((l1) =>
  L2_FIT_TEMPLATES.map((l2) => ({ parentId: l1.id, childId: l2.id }))
)
const L1_TO_L2_WLT: GoalGraphEdge[] = L1_WEALTH.flatMap((l1) =>
  L2_WLT_TEMPLATES.map((l2) => ({ parentId: l1.id, childId: l2.id }))
)
const L1_TO_L2_VIC: GoalGraphEdge[] = L1_VICES.flatMap((l1) =>
  L2_VIC_TEMPLATES.map((l2) => ({ parentId: l1.id, childId: l2.id }))
)
const L1_TO_L2_LIFE: GoalGraphEdge[] = L1_LIFESTYLE.flatMap((l1) =>
  L2_LIFE_TEMPLATES.map((l2) => ({ parentId: l1.id, childId: l2.id }))
)
const L1_TO_L2_EDGES: GoalGraphEdge[] = [
  ...L1_TO_L2_DAYGAME, ...L1_TO_L2_PG, ...L1_TO_L2_SOC, ...L1_TO_L2_FIT, ...L1_TO_L2_WLT,
  ...L1_TO_L2_VIC, ...L1_TO_L2_LIFE,
]

// L2 → L3: per-L2 connections — each L2 links to the L3s relevant to that transformation
const L2_L3_CONNECTIONS: Record<string, string[]> = {
  // ---- DAYGAME ----
  // Master Daygame — broad, results-heavy
  l2_master_daygame: [
    "l3_approach_volume", "l3_approach_frequency", "l3_session_frequency", "l3_consecutive_days",
    "l3_hours_in_field", "l3_voice_notes", "l3_approach_quality", "l3_open_in_3_seconds", "l3_solo_sessions",
    "l3_phone_numbers", "l3_instadates", "l3_dates", "l3_second_dates",
    "l3_kiss_closes", "l3_lays", "l3_women_dating", "l3_sustained_rotation",
    "l3_venues_explored", "l3_daygame_weekly_review", "l3_video_review",
  ],
  // Become Confident — exposure/consistency-heavy
  l2_confident: [
    "l3_approach_volume", "l3_approach_frequency", "l3_session_frequency", "l3_consecutive_days",
    "l3_hours_in_field", "l3_solo_sessions",
    "l3_phone_numbers", "l3_instadates", "l3_dates", "l3_second_dates",
    "l3_eye_contact_holds", "l3_positive_references", "l3_warmup_routine",
  ],
  // Overcome AA — pure exposure
  l2_overcome_aa: [
    "l3_approach_volume", "l3_consecutive_days", "l3_solo_sessions",
    "l3_eye_contact_holds", "l3_aa_comfort_rating", "l3_positive_references", "l3_warmup_routine",
  ],
  // Master Cold Approach — technique + quality
  l2_master_cold_approach: [
    "l3_approach_volume", "l3_approach_frequency", "l3_approach_quality", "l3_open_in_3_seconds",
    "l3_phone_numbers", "l3_instadates",
    "l3_vocal_practice", "l3_eye_contact_holds", "l3_video_review", "l3_wing_feedback",
  ],
  // Master Conversational Game — conversation/conversion
  l2_great_talker: [
    "l3_phone_numbers", "l3_instadates", "l3_dates",
    "l3_response_rate", "l3_voice_notes", "l3_approach_quality",
    "l3_vocal_practice",
  ],
  // Master Seduction — escalation
  l2_master_seduction: [
    "l3_kiss_closes", "l3_lays", "l3_physical_escalation",
    "l3_dates", "l3_second_dates",
    "l3_date_leadership",
  ],
  // Attract Any Woman — broadest, everything
  l2_attract_any: ALL_L3_DAYGAME.map((t) => t.id),
  // Master Inner Game — mindset, resilience, anti-anxiety
  l2_inner_game: [
    "l3_consecutive_days", "l3_solo_sessions",
    "l3_eye_contact_holds", "l3_aa_comfort_rating", "l3_positive_references",
    "l3_warmup_routine", "l3_approach_volume", "l3_daygame_weekly_review",
  ],
  // Master Texting — texting metrics
  l2_master_texting: [
    "l3_texting_initiated", "l3_response_rate", "l3_number_to_date_conversion",
  ],
  // Master Dating — date execution
  l2_master_dating: [
    "l3_dates_planned", "l3_second_dates", "l3_creative_dates", "l3_physical_escalation",
    "l3_date_spots", "l3_date_leadership",
  ],
  // Total Dating Freedom — abundance
  l2_dating_freedom: [
    "l3_women_dating", "l3_dates_planned", "l3_sustained_rotation",
    "l3_boundaries_set",
  ],

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

  // ---- SOCIAL ----
  // Build a Strong Inner Circle (7 L3s)
  l2_s_inner_circle: [
    "l3_s_friend_hangouts", "l3_s_old_friends", "l3_s_deep_conversations",
    "l3_s_quality_time", "l3_s_close_friends",
    "l3_s_gatherings", "l3_s_organized_activities",
  ],
  // Become Socially Magnetic (7 L3s)
  l2_s_magnetic: [
    "l3_s_followups", "l3_s_consecutive_social", "l3_s_conversations_total",
    "l3_s_new_conversations", "l3_s_social_events",
    "l3_s_total_events_attended", "l3_s_close_friends",
  ],
  // Master Hosting & Events (7 L3s)
  l2_s_hosting: [
    "l3_s_gatherings", "l3_s_organized_activities", "l3_s_introductions",
    "l3_s_events_planned", "l3_s_total_hosted",
    "l3_s_social_events", "l3_s_plans_initiated",
  ],
  // Expand Your Network (9 L3s)
  l2_s_network: [
    "l3_s_new_people", "l3_s_network_size", "l3_s_introductions_received",
    "l3_s_social_events", "l3_s_plans_initiated",
    "l3_s_new_conversations", "l3_s_total_events_attended",
    "l3_s_mentoring_given", "l3_s_volunteering",
  ],
  // Become a Connector (9 L3s)
  l2_s_connector: [
    "l3_s_introductions", "l3_s_old_friends", "l3_s_followups",
    "l3_s_new_people", "l3_s_conversations_total", "l3_s_close_friends",
    "l3_s_mentoring_given", "l3_s_mentoring_received", "l3_s_volunteering",
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

  // ---- LIFESTYLE ----
  // Build an Adventure-Filled Life
  l2_li_adventure: [
    "l3_li_new_experiences", "l3_li_places_visited", "l3_li_adventures", "l3_li_weekend_trips",
    "l3_li_hobby_sessions", "l3_li_dance_classes",
  ],
  // Master a Creative Skill
  l2_li_creative: [
    "l3_li_hobby_sessions", "l3_li_instrument_hours", "l3_li_creative_projects",
    "l3_li_language_learning", "l3_li_dance_classes",
  ],
  // Create an Impressive Living Space
  l2_li_living_space: [
    "l3_li_home_cooked", "l3_li_recipes", "l3_li_deep_clean", "l3_li_home_projects",
    "l3_li_grooming", "l3_li_skincare",
  ],
  // Develop a Personal Style
  l2_li_style: [
    "l3_li_grooming", "l3_li_wardrobe", "l3_li_skincare", "l3_li_style_experiments",
  ],
  // Become a Great Cook
  l2_li_cook: [
    "l3_li_home_cooked", "l3_li_recipes", "l3_li_new_experiences",
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
  // Master Daygame — results-heavy (20 L3s)
  l2_master_daygame: {
    l3_approach_volume: 0.14,
    l3_approach_frequency: 0.05,
    l3_session_frequency: 0.04,
    l3_consecutive_days: 0.03,
    l3_hours_in_field: 0.05,
    l3_voice_notes: 0.03,
    l3_approach_quality: 0.05,
    l3_open_in_3_seconds: 0.03,
    l3_solo_sessions: 0.03,
    l3_phone_numbers: 0.11,
    l3_instadates: 0.07,
    l3_dates: 0.07,
    l3_second_dates: 0.05,
    l3_kiss_closes: 0.05,
    l3_lays: 0.07,
    l3_women_dating: 0.03,
    l3_sustained_rotation: 0.03,
    l3_venues_explored: 0.02,
    l3_daygame_weekly_review: 0.03,
    l3_video_review: 0.02,
  },
  // Become Confident — exposure/consistency-heavy (13 L3s)
  l2_confident: {
    l3_approach_volume: 0.17,
    l3_approach_frequency: 0.09,
    l3_session_frequency: 0.08,
    l3_consecutive_days: 0.09,
    l3_hours_in_field: 0.08,
    l3_solo_sessions: 0.08,
    l3_phone_numbers: 0.09,
    l3_instadates: 0.06,
    l3_dates: 0.06,
    l3_second_dates: 0.05,
    l3_eye_contact_holds: 0.06,
    l3_positive_references: 0.05,
    l3_warmup_routine: 0.04,
  },
  // Overcome AA — exposure-heavy (7 L3s)
  l2_overcome_aa: {
    l3_approach_volume: 0.35,
    l3_consecutive_days: 0.18,
    l3_solo_sessions: 0.12,
    l3_eye_contact_holds: 0.12,
    l3_aa_comfort_rating: 0.10,
    l3_positive_references: 0.07,
    l3_warmup_routine: 0.06,
  },
  // Master Cold Approach — technique + quality (10 L3s)
  l2_master_cold_approach: {
    l3_approach_volume: 0.12,
    l3_approach_frequency: 0.11,
    l3_approach_quality: 0.18,
    l3_open_in_3_seconds: 0.15,
    l3_phone_numbers: 0.12,
    l3_instadates: 0.08,
    l3_vocal_practice: 0.07,
    l3_eye_contact_holds: 0.06,
    l3_video_review: 0.05,
    l3_wing_feedback: 0.06,
  },
  // Master Conversational Game — conversion-heavy (7 L3s)
  l2_great_talker: {
    l3_phone_numbers: 0.15,
    l3_instadates: 0.15,
    l3_dates: 0.18,
    l3_response_rate: 0.15,
    l3_voice_notes: 0.12,
    l3_approach_quality: 0.13,
    l3_vocal_practice: 0.12,
  },
  // Master Seduction — escalation-heavy (6 L3s)
  l2_master_seduction: {
    l3_kiss_closes: 0.14,
    l3_lays: 0.23,
    l3_physical_escalation: 0.23,
    l3_dates: 0.18,
    l3_second_dates: 0.13,
    l3_date_leadership: 0.09,
  },
  // Attract Any Woman — broad (all daygame L3s)
  l2_attract_any: {
    l3_approach_volume: 0.05,
    l3_approach_frequency: 0.03,
    l3_session_frequency: 0.03,
    l3_consecutive_days: 0.03,
    l3_hours_in_field: 0.03,
    l3_voice_notes: 0.02,
    l3_approach_quality: 0.03,
    l3_open_in_3_seconds: 0.02,
    l3_solo_sessions: 0.02,
    l3_venues_explored: 0.02,
    l3_eye_contact_holds: 0.02,
    l3_aa_comfort_rating: 0.01,
    l3_positive_references: 0.01,
    l3_warmup_routine: 0.01,
    l3_vocal_practice: 0.02,
    l3_wing_feedback: 0.01,
    l3_video_review: 0.01,
    l3_daygame_weekly_review: 0.02,
    l3_phone_numbers: 0.05,
    l3_instadates: 0.04,
    l3_dates: 0.05,
    l3_second_dates: 0.06,
    l3_kiss_closes: 0.04,
    l3_lays: 0.05,
    l3_sustained_rotation: 0.02,
    l3_texting_initiated: 0.02,
    l3_number_to_date_conversion: 0.03,
    l3_response_rate: 0.02,
    l3_dates_planned: 0.03,
    l3_creative_dates: 0.02,
    l3_physical_escalation: 0.04,
    l3_women_dating: 0.08,
    l3_date_spots: 0.02,
    l3_date_leadership: 0.02,
    l3_boundaries_set: 0.02,
  },
  // Master Texting — texting conversion (3 L3s)
  l2_master_texting: {
    l3_texting_initiated: 0.30,
    l3_response_rate: 0.30,
    l3_number_to_date_conversion: 0.40,
  },
  // Master Dating — date execution (6 L3s)
  l2_master_dating: {
    l3_dates_planned: 0.23,
    l3_second_dates: 0.20,
    l3_creative_dates: 0.12,
    l3_physical_escalation: 0.23,
    l3_date_spots: 0.10,
    l3_date_leadership: 0.12,
  },
  // Total Dating Freedom — abundance (4 L3s)
  l2_dating_freedom: {
    l3_women_dating: 0.48,
    l3_dates_planned: 0.22,
    l3_sustained_rotation: 0.17,
    l3_boundaries_set: 0.13,
  },

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

  // ---- SOCIAL WEIGHTS ----

  // Build a Strong Inner Circle (7 L3s)
  l2_s_inner_circle: {
    l3_s_friend_hangouts: 0.18,
    l3_s_old_friends: 0.10,
    l3_s_deep_conversations: 0.18,
    l3_s_quality_time: 0.15,
    l3_s_close_friends: 0.19,
    l3_s_gatherings: 0.10,
    l3_s_organized_activities: 0.10,
  },
  // Become Socially Magnetic (7 L3s)
  l2_s_magnetic: {
    l3_s_followups: 0.10,
    l3_s_consecutive_social: 0.15,
    l3_s_conversations_total: 0.18,
    l3_s_new_conversations: 0.17,
    l3_s_social_events: 0.15,
    l3_s_total_events_attended: 0.12,
    l3_s_close_friends: 0.13,
  },
  // Master Hosting & Events (7 L3s)
  l2_s_hosting: {
    l3_s_gatherings: 0.18,
    l3_s_organized_activities: 0.15,
    l3_s_introductions: 0.12,
    l3_s_events_planned: 0.15,
    l3_s_total_hosted: 0.15,
    l3_s_social_events: 0.13,
    l3_s_plans_initiated: 0.12,
  },
  // Expand Your Network (9 L3s)
  l2_s_network: {
    l3_s_new_people: 0.17,
    l3_s_network_size: 0.13,
    l3_s_introductions_received: 0.10,
    l3_s_social_events: 0.11,
    l3_s_plans_initiated: 0.08,
    l3_s_new_conversations: 0.13,
    l3_s_total_events_attended: 0.12,
    l3_s_mentoring_given: 0.08,
    l3_s_volunteering: 0.08,
  },
  // Become a Connector (9 L3s)
  l2_s_connector: {
    l3_s_introductions: 0.16,
    l3_s_old_friends: 0.08,
    l3_s_followups: 0.11,
    l3_s_new_people: 0.15,
    l3_s_conversations_total: 0.13,
    l3_s_close_friends: 0.11,
    l3_s_mentoring_given: 0.10,
    l3_s_mentoring_received: 0.08,
    l3_s_volunteering: 0.08,
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

  // ---- LIFESTYLE WEIGHTS ----

  // Build an Adventure-Filled Life (6 L3s)
  l2_li_adventure: {
    l3_li_new_experiences: 0.20,
    l3_li_places_visited: 0.22,
    l3_li_adventures: 0.20,
    l3_li_weekend_trips: 0.15,
    l3_li_hobby_sessions: 0.13,
    l3_li_dance_classes: 0.10,
  },
  // Master a Creative Skill (5 L3s)
  l2_li_creative: {
    l3_li_hobby_sessions: 0.25,
    l3_li_instrument_hours: 0.25,
    l3_li_creative_projects: 0.20,
    l3_li_language_learning: 0.15,
    l3_li_dance_classes: 0.15,
  },
  // Create an Impressive Living Space (6 L3s)
  l2_li_living_space: {
    l3_li_home_cooked: 0.18,
    l3_li_recipes: 0.15,
    l3_li_deep_clean: 0.20,
    l3_li_home_projects: 0.22,
    l3_li_grooming: 0.13,
    l3_li_skincare: 0.12,
  },
  // Develop a Personal Style (4 L3s)
  l2_li_style: {
    l3_li_grooming: 0.28,
    l3_li_wardrobe: 0.27,
    l3_li_skincare: 0.22,
    l3_li_style_experiments: 0.23,
  },
  // Become a Great Cook (3 L3s)
  l2_li_cook: {
    l3_li_home_cooked: 0.40,
    l3_li_recipes: 0.40,
    l3_li_new_experiences: 0.20,
  },

  // ---- DAYGAME: INNER GAME WEIGHTS ----

  // Master Inner Game — identity/mindset (8 L3s)
  l2_inner_game: {
    l3_positive_references: 0.20,
    l3_aa_comfort_rating: 0.18,
    l3_consecutive_days: 0.12,
    l3_eye_contact_holds: 0.12,
    l3_solo_sessions: 0.10,
    l3_approach_volume: 0.10,
    l3_warmup_routine: 0.10,
    l3_daygame_weekly_review: 0.08,
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
 * Filter weights to active goals only, preserving original weight values.
 * Removed goals' weight is NOT redistributed — the total will be < 1.
 * This prevents "fewer goals = faster badges" gaming.
 */
export function redistributeWeights(
  weights: AchievementWeight[],
  activeGoalIds: Set<string>
): AchievementWeight[] {
  return weights.filter((w) => activeGoalIds.has(w.goalId))
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
    relationship: L3_RELATIONSHIP,
    // Personal Growth
    mindfulness: L3_PG_MINDFULNESS,
    resilience: L3_PG_RESILIENCE,
    learning: L3_PG_LEARNING,
    reflection: L3_PG_REFLECTION,
    discipline: L3_PG_DISCIPLINE,
    // Social
    social_activity: L3_SOC_ACTIVITY,
    friendships: L3_SOC_FRIENDSHIPS,
    hosting: L3_SOC_HOSTING,
    social_skills: L3_SOC_SKILLS,
    network_expansion: L3_SOC_NETWORK,
    mentorship: L3_SOC_MENTORSHIP,
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
    // Lifestyle
    hobbies_skills: L3_LIFE_HOBBIES,
    cooking_domestic: L3_LIFE_COOKING,
    adventure_travel: L3_LIFE_ADVENTURE,
    style_grooming: L3_LIFE_STYLE,
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
    case "social":
      return {
        l1Goals: L1_SOCIAL,
        l2Achievements: L2_SOC_TEMPLATES,
        l3ByCategory: getTemplatesByCategoryForArea("social"),
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
    case "lifestyle":
      return {
        l1Goals: L1_LIFESTYLE,
        l2Achievements: L2_LIFE_TEMPLATES,
        l3ByCategory: getTemplatesByCategoryForArea("lifestyle"),
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
  { sourceId: "l3_pg_meditation", targetId: "l2_overcome_aa", weight: 0.7, relationship: "supports" },
  { sourceId: "l3_pg_comfort_zone", targetId: "l3_approach_volume", weight: 0.6, relationship: "enables" },
  { sourceId: "l3_pg_cold_exposure", targetId: "l2_overcome_aa", weight: 0.5, relationship: "supports" },
  { sourceId: "l3_pg_journal", targetId: "l3_aa_comfort_rating", weight: 0.5, relationship: "supports" },
  { sourceId: "l3_pg_books", targetId: "l2_great_talker", weight: 0.4, relationship: "reinforces" },
  { sourceId: "l3_pg_morning_routine", targetId: "l3_session_frequency", weight: 0.4, relationship: "enables" },

  // Social → Daygame
  { sourceId: "l3_s_new_conversations", targetId: "l3_approach_volume", weight: 0.6, relationship: "reinforces" },
  { sourceId: "l3_s_social_events", targetId: "l2_confident", weight: 0.5, relationship: "supports" },
  { sourceId: "l3_s_deep_conversations", targetId: "l2_great_talker", weight: 0.5, relationship: "reinforces" },

  // Fitness → Daygame
  { sourceId: "l3_f_gym_frequency", targetId: "l2_confident", weight: 0.5, relationship: "supports" },
  { sourceId: "l3_f_gym_frequency", targetId: "l2_inner_game", weight: 0.4, relationship: "supports" },

  // Vices → Daygame
  { sourceId: "l3_v_porn_free_days", targetId: "l2_inner_game", weight: 0.6, relationship: "enables" },
  { sourceId: "l3_v_screen_time", targetId: "l3_session_frequency", weight: 0.3, relationship: "enables" },

  // Lifestyle → Daygame
  { sourceId: "l3_li_grooming", targetId: "l2_confident", weight: 0.3, relationship: "supports" },
  { sourceId: "l3_li_dance_classes", targetId: "l2_master_seduction", weight: 0.3, relationship: "reinforces" },

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
