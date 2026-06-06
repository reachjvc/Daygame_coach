// New Goal Framework — static data & types
// Icons are referenced by string name (Lucide component names), NOT imported here.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoalPrimitive = 'volume' | 'skill' | 'target' | 'habit' | 'stage'
export type GoalRole = 'driver' | 'metric'
export type CommitmentLevel = 'light' | 'moderate' | 'heavy'

/** A manual edit to a single milestone in a ladder (value pin and/or its own date). */
export interface MilestoneEdit {
  value?: number
  date?: string
}

/**
 * Per-target runtime state held in the goal flow. `milestoneEdits` is keyed by
 * milestone step index — each entry is a user override that freezes that
 * milestone's value (the auto-curve flows the rest around it) and/or sets its
 * own checkpoint date.
 */
export interface TargetOverride {
  enabled: boolean
  value: number
  /** User-edited starting value (their *current* level — calibration). When
   * unset, the ladder starts from the target's authored `milestoneConfig.start`. */
  startValue?: number
  steps: number
  curveTension: number
  targetDate: string
  milestoneEdits?: Record<number, MilestoneEdit>
  /** User-edited habit/volume-driver ramp schedule. When set, overrides the
   * target's (or shared driver's) default ramp. Lives in the flow's state so it
   * survives navigating between steps. */
  rampSteps?: { frequencyPerWeek: number; durationWeeks: number }[]
}

export interface IdentityAspect {
  id: string; label: string; description: string; icon: string; pillarIds: string[]
}

export interface Pillar {
  id: string; label: string; tagline: string; icon: string; color: string; glowColor: string; values: string[]
}

export interface Objective {
  id: string; pillarId: string; label: string; description: string; icon: string
  successPreview: string; commitment: CommitmentLevel; values: string[]
}

export interface SharedDriver {
  id: string; label: string; primitive: GoalPrimitive; unit: string
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null
  milestoneConfig: { start: number; target: number; steps: number; curveTension: number } | null
}

export interface FrameworkTarget {
  id: string; objectiveId: string; label: string
  primitive: GoalPrimitive; role: GoalRole; unit: string; defaultEnabled: boolean
  sharedDriverId: string | null
  milestoneConfig: { start: number; target: number; steps: number; curveTension: number } | null
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null
  stageSteps: string[] | null
}

export interface PrimitiveMeta {
  label: string; color: string; iconName: string; roleDefault: GoalRole
}

export interface TemplateLevel {
  label: string  // "Beginner", "Intermediate", "Advanced"
  targetValues: Record<string, number>  // targetId → target value override (for milestoneConfig.target or ramp final frequency)
}

export interface Template {
  id: string
  pillarId: string
  label: string
  description: string
  icon: string
  objectiveIds: string[]  // which objectives to auto-select
  targetOverrides: Record<string, boolean>  // targetId → enabled override (true=force on, false=force off)
  levels: TemplateLevel[]
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

export const PRIMITIVE_META: Record<GoalPrimitive, PrimitiveMeta> = {
  volume: { label: "Volume", color: "#3b82f6", iconName: "TrendingUp", roleDefault: "driver" },
  skill:  { label: "Skill",  color: "#8b5cf6", iconName: "Zap",        roleDefault: "metric" },
  target: { label: "Target", color: "#f59e0b", iconName: "Target",     roleDefault: "metric" },
  habit:  { label: "Habit",  color: "#10b981", iconName: "Repeat",     roleDefault: "driver" },
  stage:  { label: "Stage",  color: "#ec4899", iconName: "Milestone",  roleDefault: "metric" },
}

export const IDENTITY_ASPECTS: IdentityAspect[] = [
  { id: "powerful", label: "Physically Powerful", description: "Strong, disciplined, in peak physical shape", icon: "Dumbbell", pillarIds: ["health"] },
  { id: "free", label: "Financially Free", description: "Independent, abundant, building real wealth", icon: "Landmark", pillarIds: ["wealth"] },
  { id: "magnetic", label: "Socially Magnetic", description: "Confident, attractive, naturally connecting", icon: "Heart", pillarIds: ["relations"] },
  { id: "purposeful", label: "Deeply Purposeful", description: "Grounded, growing, living with meaning", icon: "Compass", pillarIds: ["meaning"] },
]

export const PILLARS: Pillar[] = [
  { id: "health", label: "Health", tagline: "Build your body", icon: "Dumbbell", color: "#22c55e", glowColor: "rgba(34,197,94,0.3)", values: ["discipline", "vitality", "resilience"] },
  { id: "wealth", label: "Wealth", tagline: "Build your empire", icon: "Landmark", color: "#a855f7", glowColor: "rgba(168,85,247,0.3)", values: ["ambition", "independence", "focus"] },
  { id: "relations", label: "Relations", tagline: "Build your connections", icon: "Heart", color: "#f97316", glowColor: "rgba(249,115,22,0.3)", values: ["courage", "connection", "charisma"] },
  { id: "meaning", label: "Meaning", tagline: "Build your character", icon: "Compass", color: "#eab308", glowColor: "rgba(234,179,8,0.3)", values: ["growth", "presence", "wisdom"] },
]

export const SHARED_DRIVERS: SharedDriver[] = [
  { id: "sd_gym", label: "Gym Sessions", primitive: "volume", unit: "/week", rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 8 }, { frequencyPerWeek: 4, durationWeeks: 12 }, { frequencyPerWeek: 5, durationWeeks: 24 }], milestoneConfig: null },
  { id: "sd_protein", label: "Protein Target", primitive: "habit", unit: "days/week", rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], milestoneConfig: null },
  { id: "sd_approaches", label: "Approaches", primitive: "volume", unit: "/week", rampSteps: [{ frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 10, durationWeeks: 12 }, { frequencyPerWeek: 15, durationWeeks: 12 }, { frequencyPerWeek: 20, durationWeeks: 24 }], milestoneConfig: null },
  { id: "sd_meditation", label: "Meditation", primitive: "habit", unit: "days/week", rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], milestoneConfig: null },
  { id: "sd_journaling", label: "Journaling", primitive: "habit", unit: "days/week", rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 8 }, { frequencyPerWeek: 5, durationWeeks: 12 }, { frequencyPerWeek: 7, durationWeeks: 24 }], milestoneConfig: null },
]

export const OBJECTIVES: Objective[] = [
  // Health
  { id: "obj_strong", pillarId: "health", label: "Get Strong", description: "Build serious strength through progressive overload", icon: "Dumbbell", successPreview: "Bench 100kg · Squat 140kg · Deadlift 180kg", commitment: "heavy", values: ["strength", "discipline"] },
  { id: "obj_body", pillarId: "health", label: "Transform Your Body", description: "Change your physical composition and appearance", icon: "Scaling", successPreview: "Target weight · Low body fat · Photoshoot ready", commitment: "moderate", values: ["transformation", "patience"] },
  { id: "obj_endurance", pillarId: "health", label: "Build Endurance", description: "Cardio capacity and conditioning", icon: "Wind", successPreview: "500km run · 4x/week cardio · Sub-25min 5k", commitment: "moderate", values: ["endurance", "resilience"] },
  // Relations
  { id: "obj_girlfriend", pillarId: "relations", label: "Get a Girlfriend", description: "Find someone great through volume and skill development", icon: "Heart", successPreview: "Approaches → Numbers → Dates → Exclusive", commitment: "heavy", values: ["courage", "persistence"] },
  { id: "obj_abundance", pillarId: "relations", label: "Date Abundantly", description: "Build an abundant dating life with options", icon: "Users", successPreview: "Consistent approaches · Strong text game · Active rotation", commitment: "heavy", values: ["confidence", "charisma"] },
  { id: "obj_inner", pillarId: "relations", label: "Build Inner Game", description: "Bulletproof mindset and emotional resilience", icon: "Brain", successPreview: "Daily meditation · Journaling · Anxiety mastered", commitment: "moderate", values: ["presence", "resilience"] },
  // Wealth
  { id: "obj_income", pillarId: "wealth", label: "Build Income", description: "Grow your earning power through focused work", icon: "TrendingUp", successPreview: "Deep work mastery · First client → $5k → $10k month", commitment: "moderate", values: ["ambition", "focus"] },
  { id: "obj_freedom", pillarId: "wealth", label: "Financial Freedom", description: "Build lasting financial independence", icon: "Shield", successPreview: "Emergency fund → Debt-free → Fully invested", commitment: "heavy", values: ["independence", "discipline"] },
  // Meaning
  { id: "obj_practice", pillarId: "meaning", label: "Daily Practice", description: "Build grounding daily rituals that compound", icon: "Sunrise", successPreview: "Meditation · Reading · Journaling → Unbreakable", commitment: "moderate", values: ["presence", "wisdom"] },
  { id: "obj_growth", pillarId: "meaning", label: "Continuous Growth", description: "Never stop learning and evolving", icon: "BookOpen", successPreview: "Courses → Skills → Mastery → Teaching", commitment: "light", values: ["growth", "curiosity"] },
]

export const TEMPLATES: Template[] = [
  // Health templates
  { id: "tmpl_strength", pillarId: "health", label: "Strength Focus", description: "Powerlifting-style: big 3 lifts + gym consistency", icon: "Dumbbell",
    objectiveIds: ["obj_strong"],
    targetOverrides: { t_gym_strong: true, t_protein_strong: true, t_bench: true, t_squat: true, t_deadlift: true, t_lift_form: false, t_pullups: true, t_ohp: true, t_total_workouts: true, t_strength_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_bench: 60, t_squat: 80, t_deadlift: 100, t_pullups: 5, t_ohp: 40, t_total_workouts: 200 } },
      { label: "Intermediate", targetValues: { t_bench: 100, t_squat: 140, t_deadlift: 180, t_pullups: 15, t_ohp: 60, t_total_workouts: 500 } },
      { label: "Advanced", targetValues: { t_bench: 140, t_squat: 200, t_deadlift: 220, t_pullups: 25, t_ohp: 80, t_total_workouts: 1000 } },
    ] },
  { id: "tmpl_transform", pillarId: "health", label: "Body Transformation", description: "Lose fat, build muscle, track everything", icon: "Scaling",
    objectiveIds: ["obj_strong", "obj_body"],
    targetOverrides: { t_gym_strong: true, t_gym_body: true, t_protein_strong: true, t_protein_body: true, t_cal_tracking: true, t_bench: true, t_squat: false, t_deadlift: false, t_bodyweight: true, t_bodyfat: true, t_body_stages: true, t_lift_form: false, t_waist: true, t_sleep: true, t_progress_photos: true },
    levels: [
      { label: "Beginner", targetValues: { t_bench: 60, t_bodyweight: 85, t_bodyfat: 18, t_waist: 88, t_progress_photos: 12 } },
      { label: "Intermediate", targetValues: { t_bench: 100, t_bodyweight: 78, t_bodyfat: 14, t_waist: 82, t_progress_photos: 52 } },
      { label: "Advanced", targetValues: { t_bench: 120, t_bodyweight: 75, t_bodyfat: 10, t_waist: 78, t_progress_photos: 100 } },
    ] },
  { id: "tmpl_athlete", pillarId: "health", label: "Complete Athlete", description: "Strength + endurance + body comp — the full package", icon: "Trophy",
    objectiveIds: ["obj_strong", "obj_body", "obj_endurance"],
    targetOverrides: { t_gym_strong: true, t_gym_body: true, t_protein_strong: true, t_protein_body: true, t_bench: true, t_squat: true, t_deadlift: true, t_bodyweight: true, t_body_stages: true, t_cardio_sessions: true, t_total_km: true, t_longest_run: true, t_pullups: true, t_5k_time: true, t_endurance_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_bench: 60, t_squat: 80, t_deadlift: 100, t_pullups: 5, t_bodyweight: 85, t_total_km: 100, t_longest_run: 5, t_5k_time: 30 } },
      { label: "Intermediate", targetValues: { t_bench: 100, t_squat: 140, t_deadlift: 180, t_pullups: 15, t_bodyweight: 80, t_total_km: 500, t_longest_run: 15, t_5k_time: 24 } },
      { label: "Advanced", targetValues: { t_bench: 140, t_squat: 200, t_deadlift: 220, t_pullups: 25, t_bodyweight: 75, t_total_km: 1000, t_longest_run: 42, t_5k_time: 20 } },
    ] },

  // Relations templates
  { id: "tmpl_girlfriend", pillarId: "relations", label: "Find The One", description: "Volume + skills → dates → girlfriend", icon: "Heart",
    objectiveIds: ["obj_girlfriend", "obj_inner"],
    targetOverrides: { t_approaches_gf: true, t_open_skill: true, t_convo_skill: true, t_close_skill: true, t_gf_funnel: true, t_meditation_inner: true, t_journal_inner: false, t_comfort: true, t_emotion_skill: true, t_anxiety_stages: true, t_voice_notes_gf: true, t_date_skill: true },
    levels: [
      { label: "Beginner", targetValues: { t_comfort: 25 } },
      { label: "Intermediate", targetValues: { t_comfort: 50 } },
      { label: "Advanced", targetValues: { t_comfort: 100 } },
    ] },
  { id: "tmpl_abundance", pillarId: "relations", label: "Abundance Path", description: "Build options, master text game, date multiple", icon: "Users",
    objectiveIds: ["obj_abundance", "obj_inner"],
    targetOverrides: { t_approaches_ab: true, t_texts_ab: true, t_open_ab: true, t_text_skill: true, t_ab_funnel: true, t_meditation_inner: true, t_comfort: true, t_anxiety_stages: true, t_dates_ab: true, t_kiss_closes: true },
    levels: [
      { label: "Beginner", targetValues: { t_dates_ab: 3, t_kiss_closes: 5 } },
      { label: "Intermediate", targetValues: { t_dates_ab: 6, t_kiss_closes: 15 } },
      { label: "Advanced", targetValues: { t_dates_ab: 10, t_kiss_closes: 30 } },
    ] },
  { id: "tmpl_inner_only", pillarId: "relations", label: "Inner Game First", description: "Build the foundation before approaching", icon: "Brain",
    objectiveIds: ["obj_inner"],
    targetOverrides: { t_meditation_inner: true, t_journal_inner: true, t_comfort: true, t_emotion_skill: true, t_anxiety_stages: true, t_cold_shower: true, t_gratitude: true },
    levels: [
      { label: "Beginner", targetValues: { t_comfort: 20 } },
      { label: "Intermediate", targetValues: { t_comfort: 50 } },
      { label: "Advanced", targetValues: { t_comfort: 100 } },
    ] },

  // Wealth templates
  { id: "tmpl_hustle", pillarId: "wealth", label: "Income Builder", description: "Deep work + sales skills → growing revenue", icon: "TrendingUp",
    objectiveIds: ["obj_income"],
    targetOverrides: { t_deep_work: true, t_weekly_review: true, t_monthly_income: true, t_income_stages: true, t_sales_skill: true },
    levels: [
      { label: "Beginner", targetValues: { t_deep_work: 200, t_monthly_income: 3000 } },
      { label: "Intermediate", targetValues: { t_deep_work: 500, t_monthly_income: 7000 } },
      { label: "Advanced", targetValues: { t_deep_work: 1000, t_monthly_income: 15000 } },
    ] },
  { id: "tmpl_fi", pillarId: "wealth", label: "Financial Independence", description: "Save aggressively, invest consistently, build net worth", icon: "Shield",
    objectiveIds: ["obj_income", "obj_freedom"],
    targetOverrides: { t_deep_work: true, t_weekly_review: true, t_monthly_income: true, t_income_stages: true, t_budget: true, t_savings_habit: true, t_net_worth: true, t_savings_rate: true, t_freedom_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_deep_work: 200, t_monthly_income: 3000, t_net_worth: 25, t_savings_rate: 15 } },
      { label: "Intermediate", targetValues: { t_deep_work: 500, t_monthly_income: 7000, t_net_worth: 100, t_savings_rate: 25 } },
      { label: "Advanced", targetValues: { t_deep_work: 1000, t_monthly_income: 15000, t_net_worth: 500, t_savings_rate: 40 } },
    ] },

  // Meaning templates
  { id: "tmpl_mindful", pillarId: "meaning", label: "Mindful Life", description: "Daily meditation, journaling, and reading", icon: "Sunrise",
    objectiveIds: ["obj_practice"],
    targetOverrides: { t_med_practice: true, t_journal_practice: true, t_reading: true, t_books: true, t_practice_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_books: 12 } },
      { label: "Intermediate", targetValues: { t_books: 30 } },
      { label: "Advanced", targetValues: { t_books: 52 } },
    ] },
  { id: "tmpl_polymath", pillarId: "meaning", label: "Continuous Learner", description: "Courses, skills, and deep practice", icon: "BookOpen",
    objectiveIds: ["obj_practice", "obj_growth"],
    targetOverrides: { t_med_practice: true, t_reading: true, t_books: true, t_learning_hours: true, t_skill_practice: true, t_courses: true, t_growth_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_books: 12, t_learning_hours: 100, t_courses: 5 } },
      { label: "Intermediate", targetValues: { t_books: 30, t_learning_hours: 300, t_courses: 12 } },
      { label: "Advanced", targetValues: { t_books: 52, t_learning_hours: 500, t_courses: 20 } },
    ] },
]

export function getTemplatesForPillar(pillarId: string): Template[] {
  return TEMPLATES.filter(t => t.pillarId === pillarId)
}

export const TARGETS: FrameworkTarget[] = [
  // =========================================================================
  // Health -> Get Strong (obj_strong)
  // =========================================================================
  { id: "t_gym_strong", objectiveId: "obj_strong", label: "Gym Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: "sd_gym", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_protein_strong", objectiveId: "obj_strong", label: "Protein Target", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_protein", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_bench", objectiveId: "obj_strong", label: "Bench Press 1RM", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 40, target: 100, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null },
  { id: "t_squat", objectiveId: "obj_strong", label: "Squat 1RM", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 60, target: 140, steps: 9, curveTension: 0 }, rampSteps: null, stageSteps: null },
  { id: "t_deadlift", objectiveId: "obj_strong", label: "Deadlift 1RM", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 60, target: 180, steps: 9, curveTension: 0 }, rampSteps: null, stageSteps: null },
  { id: "t_lift_form", objectiveId: "obj_strong", label: "Lift Form", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["learning basics", "consistent form", "coaching others"] },
  { id: "t_pullups", objectiveId: "obj_strong", label: "Pull-ups Max", primitive: "target", role: "metric", unit: "reps", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 20, steps: 8, curveTension: -0.3 }, rampSteps: null, stageSteps: null },
  { id: "t_ohp", objectiveId: "obj_strong", label: "Overhead Press 1RM", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 20, target: 80, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null },
  { id: "t_total_workouts", objectiveId: "obj_strong", label: "Lifetime Workouts", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 500, steps: 10, curveTension: 1.2 }, rampSteps: null, stageSteps: null },
  { id: "t_strength_stages", objectiveId: "obj_strong", label: "Strength Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first real program", "intermediate lifts", "1000lb total", "advanced lifter"] },

  // =========================================================================
  // Health -> Transform Body (obj_body)
  // =========================================================================
  { id: "t_gym_body", objectiveId: "obj_body", label: "Gym Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: "sd_gym", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_protein_body", objectiveId: "obj_body", label: "Protein Target", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_protein", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_cal_tracking", objectiveId: "obj_body", label: "Calorie Tracking", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_bodyweight", objectiveId: "obj_body", label: "Body Weight", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 90, target: 80, steps: 6, curveTension: 0 }, rampSteps: null, stageSteps: null },
  { id: "t_bodyfat", objectiveId: "obj_body", label: "Body Fat %", primitive: "target", role: "metric", unit: "%", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 25, target: 12, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null },
  { id: "t_body_stages", objectiveId: "obj_body", label: "Body Milestones", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first pull-up", "visible abs", "run a 5k", "photoshoot ready"] },
  { id: "t_progress_photos", objectiveId: "obj_body", label: "Progress Photos", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 52, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null },
  { id: "t_waist", objectiveId: "obj_body", label: "Waist Measurement", primitive: "target", role: "metric", unit: "cm", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 95, target: 80, steps: 6, curveTension: 0 }, rampSteps: null, stageSteps: null },
  { id: "t_sleep", objectiveId: "obj_body", label: "Sleep Quality", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 4, durationWeeks: 4 }, { frequencyPerWeek: 6, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },

  // =========================================================================
  // Health -> Build Endurance (obj_endurance)
  // =========================================================================
  { id: "t_cardio_sessions", objectiveId: "obj_endurance", label: "Cardio Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 8 }, { frequencyPerWeek: 3, durationWeeks: 12 }, { frequencyPerWeek: 4, durationWeeks: 24 }], stageSteps: null },
  { id: "t_hydration", objectiveId: "obj_endurance", label: "Hydration", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 5, durationWeeks: 4 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_total_km", objectiveId: "obj_endurance", label: "Lifetime KM Run", primitive: "volume", role: "metric", unit: "km", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 500, steps: 10, curveTension: 1.2 }, rampSteps: null, stageSteps: null },
  { id: "t_longest_run", objectiveId: "obj_endurance", label: "Longest Run", primitive: "target", role: "metric", unit: "km", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 21, steps: 8, curveTension: -0.3 }, rampSteps: null, stageSteps: null },
  { id: "t_pacing", objectiveId: "obj_endurance", label: "Pacing & Form", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["survive the run", "consistent pace", "negative splits", "race ready"] },
  { id: "t_5k_time", objectiveId: "obj_endurance", label: "5K Time", primitive: "target", role: "metric", unit: "min", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 35, target: 22, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null },
  { id: "t_consec_cardio", objectiveId: "obj_endurance", label: "Consecutive Cardio Weeks", primitive: "habit", role: "metric", unit: "weeks", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 26, steps: 7, curveTension: 0.8 }, rampSteps: null, stageSteps: null },
  { id: "t_endurance_stages", objectiveId: "obj_endurance", label: "Endurance Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["survive a jog", "run 5k without stopping", "complete 10k", "half marathon"] },

  // =========================================================================
  // Relations -> Get a Girlfriend (obj_girlfriend)
  // =========================================================================
  { id: "t_approaches_gf", objectiveId: "obj_girlfriend", label: "Approaches", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: "sd_approaches", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_open_skill", objectiveId: "obj_girlfriend", label: "Open Cleanly", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first approach", "stay 30 seconds", "open 3 per outing", "natural opener"] },
  { id: "t_convo_skill", objectiveId: "obj_girlfriend", label: "Hold Conversation", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["survive 1 min", "3 min conversation", "get a real laugh", "deep rapport"] },
  { id: "t_close_skill", objectiveId: "obj_girlfriend", label: "Close (Get Number)", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first number", "non-flake number", "5 solid numbers", "close naturally"] },
  { id: "t_gf_funnel", objectiveId: "obj_girlfriend", label: "Dating Funnel", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first date", "first 2nd date", "dating someone", "exclusive"] },
  { id: "t_voice_notes_gf", objectiveId: "obj_girlfriend", label: "Voice Notes / Field Reports", primitive: "habit", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 8 }, { frequencyPerWeek: 3, durationWeeks: 12 }, { frequencyPerWeek: 5, durationWeeks: 24 }], stageSteps: null },
  { id: "t_solo_sessions_gf", objectiveId: "obj_girlfriend", label: "Solo Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 1, durationWeeks: 12 }, { frequencyPerWeek: 2, durationWeeks: 24 }], stageSteps: null },
  { id: "t_date_skill", objectiveId: "obj_girlfriend", label: "Date Leading", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first date planned", "confident date leader", "creative memorable dates"] },

  // =========================================================================
  // Relations -> Date Abundantly (obj_abundance)
  // =========================================================================
  { id: "t_approaches_ab", objectiveId: "obj_abundance", label: "Approaches", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: "sd_approaches", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_texts_ab", objectiveId: "obj_abundance", label: "Texts Sent", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 12 }, { frequencyPerWeek: 5, durationWeeks: 12 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_open_ab", objectiveId: "obj_abundance", label: "Opening Skill", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first approach", "consistent openers", "natural and varied"] },
  { id: "t_text_skill", objectiveId: "obj_abundance", label: "Text Game", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first text exchange", "number→date conversion", "flake-proof texting"] },
  { id: "t_ab_funnel", objectiveId: "obj_abundance", label: "Abundance Stages", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first lay", "dating 2 women", "rotation of 3+", "true abundance"] },
  { id: "t_dates_ab", objectiveId: "obj_abundance", label: "Dates per Month", primitive: "volume", role: "metric", unit: "/month", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 8, steps: 5, curveTension: 0 }, rampSteps: null, stageSteps: null },
  { id: "t_kiss_closes", objectiveId: "obj_abundance", label: "Kiss Closes", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 25, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null },

  // =========================================================================
  // Relations -> Build Inner Game (obj_inner)
  // =========================================================================
  { id: "t_meditation_inner", objectiveId: "obj_inner", label: "Meditation", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_meditation", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_journal_inner", objectiveId: "obj_inner", label: "Journaling", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_journaling", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_comfort", objectiveId: "obj_inner", label: "Comfort Zone Challenges", primitive: "volume", role: "driver", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 100, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null },
  { id: "t_emotion_skill", objectiveId: "obj_inner", label: "Emotional Regulation", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["awareness of emotions", "pause before reacting", "choosing response", "equanimity under pressure"] },
  { id: "t_anxiety_stages", objectiveId: "obj_inner", label: "Approach Anxiety", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["paralysing anxiety", "nervous but moving", "mild butterflies", "calm and present"] },
  { id: "t_cold_shower", objectiveId: "obj_inner", label: "Cold Showers", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_gratitude", objectiveId: "obj_inner", label: "Gratitude Practice", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 8 }, { frequencyPerWeek: 5, durationWeeks: 12 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },

  // =========================================================================
  // Wealth -> Build Income (obj_income)
  // =========================================================================
  { id: "t_deep_work", objectiveId: "obj_income", label: "Deep Work Hours", primitive: "volume", role: "driver", unit: "hours/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 500, steps: 10, curveTension: 1.2 }, rampSteps: null, stageSteps: null },
  { id: "t_weekly_review", objectiveId: "obj_income", label: "Weekly Review", primitive: "habit", role: "driver", unit: "weeks", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 1, durationWeeks: 52 }], stageSteps: null },
  { id: "t_monthly_income", objectiveId: "obj_income", label: "Monthly Income", primitive: "target", role: "metric", unit: "$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 10000, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null },
  { id: "t_income_stages", objectiveId: "obj_income", label: "Income Milestones", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first paying client", "$1k month", "$5k month", "$10k month"] },
  { id: "t_sales_skill", objectiveId: "obj_income", label: "Sales & Networking", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first pitch", "comfortable selling", "consistent closer"] },

  // =========================================================================
  // Wealth -> Financial Freedom (obj_freedom)
  // =========================================================================
  { id: "t_budget", objectiveId: "obj_freedom", label: "Budget Tracking", primitive: "habit", role: "driver", unit: "weeks", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 1, durationWeeks: 52 }], stageSteps: null },
  { id: "t_savings_habit", objectiveId: "obj_freedom", label: "Auto-Save", primitive: "habit", role: "driver", unit: "months", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 24, steps: 6, curveTension: 0.8 }, rampSteps: null, stageSteps: null },
  { id: "t_net_worth", objectiveId: "obj_freedom", label: "Net Worth", primitive: "target", role: "metric", unit: "k$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 100, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null },
  { id: "t_savings_rate", objectiveId: "obj_freedom", label: "Savings Rate", primitive: "target", role: "metric", unit: "%", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 5, target: 30, steps: 6, curveTension: 0 }, rampSteps: null, stageSteps: null },
  { id: "t_freedom_stages", objectiveId: "obj_freedom", label: "Freedom Milestones", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["emergency fund", "debt-free", "investing regularly", "financially independent"] },

  // =========================================================================
  // Meaning -> Daily Practice (obj_practice)
  // =========================================================================
  { id: "t_med_practice", objectiveId: "obj_practice", label: "Meditation", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_meditation", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_journal_practice", objectiveId: "obj_practice", label: "Journaling", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_journaling", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_reading", objectiveId: "obj_practice", label: "Reading", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 8 }, { frequencyPerWeek: 5, durationWeeks: 12 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_books", objectiveId: "obj_practice", label: "Books Read", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 50, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null },
  { id: "t_practice_stages", objectiveId: "obj_practice", label: "Practice Depth", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["sporadic practice", "daily routine", "unbreakable habit", "teaching others"] },

  // =========================================================================
  // Meaning -> Continuous Growth (obj_growth)
  // =========================================================================
  { id: "t_learning_hours", objectiveId: "obj_growth", label: "Learning Hours", primitive: "volume", role: "driver", unit: "hours/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 500, steps: 10, curveTension: 1.2 }, rampSteps: null, stageSteps: null },
  { id: "t_skill_practice", objectiveId: "obj_growth", label: "Skill Practice", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 8 }, { frequencyPerWeek: 4, durationWeeks: 12 }, { frequencyPerWeek: 6, durationWeeks: 24 }], stageSteps: null },
  { id: "t_courses", objectiveId: "obj_growth", label: "Courses Completed", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 20, steps: 7, curveTension: 1.2 }, rampSteps: null, stageSteps: null },
  { id: "t_growth_stages", objectiveId: "obj_growth", label: "Growth Path", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["curious learner", "active practitioner", "skilled professional", "teaching & mentoring"] },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getObjectivesForPillar(pillarId: string): Objective[] {
  return OBJECTIVES.filter(o => o.pillarId === pillarId)
}

export function getTargetsForObjective(objectiveId: string): FrameworkTarget[] {
  return TARGETS.filter(t => t.objectiveId === objectiveId)
}

export function getDriversForObjective(objectiveId: string): FrameworkTarget[] {
  return getTargetsForObjective(objectiveId).filter(t => t.role === 'driver')
}

export function getMetricsForObjective(objectiveId: string): FrameworkTarget[] {
  return getTargetsForObjective(objectiveId).filter(t => t.role === 'metric')
}

export function getSharedDriver(id: string): SharedDriver | undefined {
  return SHARED_DRIVERS.find(d => d.id === id)
}

export function getObjectivesForSharedDriver(driverId: string): Objective[] {
  const objectiveIds = [...new Set(
    TARGETS.filter(t => t.sharedDriverId === driverId).map(t => t.objectiveId)
  )]
  return objectiveIds.map(id => OBJECTIVES.find(o => o.id === id)!).filter(Boolean)
}
