// New Goal Framework — static data & types
// Icons are referenced by string name (Lucide component names), NOT imported here.

import type { LinkedMetric } from "@/src/db/goalEnums"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoalPrimitive = 'volume' | 'skill' | 'target' | 'habit' | 'stage'
export type GoalRole = 'driver' | 'metric'
export type CommitmentLevel = 'light' | 'moderate' | 'heavy'

/**
 * How a milestone target's *starting* value relates to its target — so a preset
 * can pick a sensible "where you are now" that scales with the chosen target,
 * instead of a frozen start that only makes sense for beginners.
 *
 * - cumulative: lifetime/total counts → you start near zero and accumulate.
 * - strength/reps/distance: you're chasing a gain, so start a fraction below target.
 * - bodymass/bodyfat/pace: lower is better, so start above the target.
 * - bodymass_gain: higher is better (bulking, measurements growing) → start below target.
 * - income/rate: a level you grow into, start a fraction below.
 */
export type MetricKind =
  | 'cumulative' | 'strength' | 'reps' | 'distance'
  | 'bodymass' | 'bodymass_gain' | 'bodyfat' | 'pace' | 'income' | 'rate'

/**
 * Derive a sensible starting value for a milestone target given its (level-
 * specific) target value. Returns the smart "current level" a preset should
 * seed. Cumulative metrics return 0 (caller keeps the authored baseline).
 */
export function deriveStartValue(kind: MetricKind, target: number): number {
  const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5)
  switch (kind) {
    case 'strength': return round5(target * 0.7)          // chasing a ~40% gain
    case 'reps':     return Math.max(1, Math.round(target * 0.6))
    case 'distance': return Math.max(1, Math.round(target * 0.5))
    case 'bodymass': return Math.round(target * 1.13)     // ~13% heavier now
    case 'bodymass_gain': return Math.max(1, Math.round(target * 0.88)) // ~12% to gain
    case 'bodyfat':  return target + 7                    // ~7 pp to lose
    case 'pace':     return Math.round(target * 1.25)     // ~25% slower now
    case 'income':   return Math.max(0, Math.round((target * 0.3) / 100) * 100)
    case 'rate':     return Math.max(1, Math.round(target * 0.5))
    case 'cumulative':
    default:         return 0
  }
}

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
  /** Hidden matcher-only vocabulary: a plain-language restatement of the goal plus
   *  the many ways people actually phrase it. Embedded for intake matching, NEVER
   *  shown to the user. Keep it human/feeling language (not coach-jargon) and
   *  distinct per goal so areas don't collide. */
  soundsLike: string
}

export interface SharedDriver {
  id: string; label: string; primitive: GoalPrimitive; unit: string
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null
  milestoneConfig: { start: number; target: number; steps: number; curveTension: number } | null
  /** Tracking metric this driver maps to, so persisted goals auto-update from
   * logged activity (syncLinkedGoals). Only set where a computable metric exists. */
  linkedMetric?: LinkedMetric
}

export interface FrameworkTarget {
  id: string; objectiveId: string; label: string
  primitive: GoalPrimitive; role: GoalRole; unit: string; defaultEnabled: boolean
  sharedDriverId: string | null
  milestoneConfig: { start: number; target: number; steps: number; curveTension: number } | null
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null
  stageSteps: string[] | null
  /** For milestone targets: how the start scales with the target (see deriveStartValue). */
  metricKind?: MetricKind
  /** Tracking metric this target maps to (auto-sync). Usually inherited from the
   * shared driver; set directly only for non-shared targets with a real metric. */
  linkedMetric?: LinkedMetric
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
  { id: "disciplined", label: "Free of Vices", description: "Disciplined, in control, free of compulsions", icon: "Ban", pillarIds: ["vices"] },
]

export const PILLARS: Pillar[] = [
  { id: "health", label: "Health", tagline: "Build your body", icon: "Dumbbell", color: "#22c55e", glowColor: "rgba(34,197,94,0.3)", values: ["discipline", "vitality", "resilience"] },
  { id: "wealth", label: "Wealth", tagline: "Build your empire", icon: "Landmark", color: "#a855f7", glowColor: "rgba(168,85,247,0.3)", values: ["ambition", "independence", "focus"] },
  { id: "relations", label: "Relations", tagline: "Build your connections", icon: "Heart", color: "#f97316", glowColor: "rgba(249,115,22,0.3)", values: ["courage", "connection", "charisma"] },
  { id: "meaning", label: "Meaning", tagline: "Build your character", icon: "Compass", color: "#eab308", glowColor: "rgba(234,179,8,0.3)", values: ["growth", "presence", "wisdom"] },
  // Vices maps to the canonical `vices_elimination` life area (Ban icon, red).
  { id: "vices", label: "Vices", tagline: "Break what holds you back", icon: "Ban", color: "#f43f5e", glowColor: "rgba(244,63,94,0.3)", values: ["discipline", "willpower", "freedom"] },
]

export const SHARED_DRIVERS: SharedDriver[] = [
  { id: "sd_gym", label: "Gym Sessions", primitive: "volume", unit: "/week", rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 8 }, { frequencyPerWeek: 4, durationWeeks: 12 }, { frequencyPerWeek: 5, durationWeeks: 24 }], milestoneConfig: null, linkedMetric: "gym_sessions_weekly" },
  { id: "sd_protein", label: "Protein Target", primitive: "habit", unit: "days/week", rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], milestoneConfig: null },
  { id: "sd_approaches", label: "Approaches", primitive: "volume", unit: "/week", rampSteps: [{ frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 10, durationWeeks: 12 }, { frequencyPerWeek: 15, durationWeeks: 12 }, { frequencyPerWeek: 20, durationWeeks: 24 }], milestoneConfig: null, linkedMetric: "approaches_weekly" },
  { id: "sd_meditation", label: "Meditation", primitive: "habit", unit: "days/week", rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], milestoneConfig: null },
  { id: "sd_journaling", label: "Journaling", primitive: "habit", unit: "days/week", rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 8 }, { frequencyPerWeek: 5, durationWeeks: 12 }, { frequencyPerWeek: 7, durationWeeks: 24 }], milestoneConfig: null },
]

export const OBJECTIVES: Objective[] = [
  // Health
  { id: "obj_strong", pillarId: "health", label: "Get Strong", description: "Build serious strength through progressive overload", icon: "Dumbbell", successPreview: "Bench 100kg · Squat 140kg · Deadlift 180kg", commitment: "heavy", values: ["strength", "discipline"], soundsLike: "Getting physically stronger and lifting heavier weights. want to get strong, build strength, lift heavier, get powerful, strong as hell, deadlift squat bench, powerlifting, hit the gym and get strong, feel strong" },
  { id: "obj_body", pillarId: "health", label: "Transform Your Body", description: "Change your physical composition and appearance", icon: "Scaling", successPreview: "Target weight · Low body fat · Photoshoot ready", commitment: "moderate", values: ["transformation", "patience"], soundsLike: "Changing how my body looks — leaner, more defined, better physique. lose weight, get lean, lose fat, get shredded, look good naked, change my body, drop body fat, get a six pack, abs, transform my physique, get aesthetic, look better" },
  { id: "obj_endurance", pillarId: "health", label: "Build Endurance", description: "Cardio capacity and conditioning", icon: "Wind", successPreview: "500km run · 4x/week cardio · Sub-25min 5k", commitment: "moderate", values: ["endurance", "resilience"], soundsLike: "Cardio fitness and stamina — running, conditioning, not getting winded. get fit, build stamina, run longer, better cardio, stop getting out of breath, run a 5k, run a marathon, conditioning, endurance, fitness" },
  { id: "obj_calisthenics", pillarId: "health", label: "Master Your Bodyweight", description: "Calisthenics: pull, push, and skill work — no gym needed", icon: "PersonStanding", successPreview: "20 pull-ups · First muscle-up · Freestanding handstand", commitment: "heavy", values: ["strength", "control"], soundsLike: "Bodyweight skills and control without a gym — pull-ups, push-ups, handstands. calisthenics, bodyweight training, pull ups, muscle up, handstand, train without a gym, street workout, gymnastic strength, body control" },
  { id: "obj_mobility", pillarId: "health", label: "Move Without Pain", description: "Flexibility, mobility, and joint health you'll feel daily", icon: "StretchHorizontal", successPreview: "Touch your toes · Flat deep squat · Front splits", commitment: "moderate", values: ["mobility", "vitality"], soundsLike: "Flexibility, mobility and moving without pain or stiffness. stop hurting, fix my back, get flexible, touch my toes, mobility, joint pain, feeling stiff, move better, no more pain, stretch more, loosen up" },
  { id: "obj_muscle", pillarId: "health", label: "Build Muscle", description: "Lean bulk: eat in a surplus, lift, and add real size", icon: "Beef", successPreview: "+10kg lean mass · Bigger arms · Stronger lifts", commitment: "heavy", values: ["growth", "consistency"], soundsLike: "Building muscle size and mass — getting bigger, bulking up. build muscle, get bigger, gain mass, bulk up, put on size, gain weight, get jacked, bigger arms, muscle growth, get swole" },
  { id: "obj_active", pillarId: "health", label: "Stay Active Daily", description: "Build a healthy, moving lifestyle — no gym required", icon: "Accessibility", successPreview: "10k steps/day · Moving daily · Lower resting heart rate", commitment: "light", values: ["vitality", "consistency"], soundsLike: "An active everyday lifestyle — moving more, walking, healthy without the gym. be more active, move more, stop being lazy, get off the couch, healthier lifestyle, walk more, stay in shape, daily movement, feel good in my body, more energy, get healthy" },
  { id: "obj_recovery", pillarId: "health", label: "Sleep & Recover", description: "Master sleep and recovery so everything else compounds", icon: "BedDouble", successPreview: "8h sleep · Consistent schedule · Wake up refreshed", commitment: "light", values: ["vitality", "resilience"], soundsLike: "Better sleep and recovery — resting well, waking up refreshed instead of tired. sleep better, fix my sleep, stop being tired, more rest, wake up refreshed, insomnia, recover properly, sleep schedule, stop feeling exhausted, more energy" },
  // Relations
  { id: "obj_girlfriend", pillarId: "relations", label: "Get a Girlfriend", description: "Find someone great through volume and skill development", icon: "Heart", successPreview: "Approaches → Numbers → Dates → Exclusive", commitment: "heavy", values: ["courage", "persistence"], soundsLike: "Finding a real loving relationship — a girlfriend, a partner, someone to share life with. get a girlfriend, find a partner, find love, someone i love, wake up next to someone i love, stop being lonely, a real relationship, meet someone special, settle down, find the one, want to be loved, not be single anymore, a loving partner" },
  { id: "obj_abundance", pillarId: "relations", label: "Date Abundantly", description: "Build an abundant dating life with options", icon: "Users", successPreview: "Consistent approaches · Strong text game · Active rotation", commitment: "heavy", values: ["confidence", "charisma"], soundsLike: "An active dating life with options — meeting lots of women and going on dates. date more, meet women, dating life, more options, more matches, go on lots of dates, abundance with women, dating apps, talk to more girls, get more dates, play the field, casual dating" },
  { id: "obj_inner", pillarId: "relations", label: "Build Inner Game", description: "Bulletproof mindset and emotional resilience", icon: "Brain", successPreview: "Daily meditation · Journaling · Anxiety mastered", commitment: "moderate", values: ["presence", "resilience"], soundsLike: "Confidence and emotional resilience socially and with women — beating anxiety and self-doubt. more confident, social confidence, stop being nervous around women, approach anxiety, self doubt, believe in myself, less shy, get out of my head, inner confidence, self esteem, fear of rejection, stop caring what people think" },
  // Wealth
  { id: "obj_income", pillarId: "wealth", label: "Build Income", description: "Grow your earning power through focused work", icon: "TrendingUp", successPreview: "Deep work mastery · First client → $5k → $10k month", commitment: "moderate", values: ["ambition", "focus"], soundsLike: "Earning more money through a job, skills, or freelancing. make more money, earn more, higher income, get a raise, make money online, freelance, side hustle, get clients, increase my income, better job, make money from my skills, six figures, earn a living" },
  { id: "obj_freedom", pillarId: "wealth", label: "Financial Freedom", description: "Build lasting financial independence", icon: "Shield", successPreview: "Emergency fund → Debt-free → Fully invested", commitment: "heavy", values: ["independence", "discipline"], soundsLike: "Long-term financial security — savings, getting out of debt, investing, not worrying about money. financial freedom, get out of debt, save money, invest, retire early, financial security, stop living paycheck to paycheck, build wealth, passive income, money in the bank, never worry about money, financially independent" },
  { id: "obj_business", pillarId: "wealth", label: "Start a Business", description: "Build your own business — from idea to real, profitable revenue", icon: "Rocket", successPreview: "Idea → First sale → Profitable → $10k+/mo", commitment: "heavy", values: ["ambition", "ownership"], soundsLike: "Starting and growing your own business — from idea to profit. start a business, my own business, build a business, be my own boss, work for myself, entrepreneur, start a startup, launch a product, my own company, build something of my own, get my business going, make it profitable, dollars a month in profit, first paying customer, scale my business" },
  // Meaning
  { id: "obj_practice", pillarId: "meaning", label: "Daily Practice", description: "Build grounding daily rituals that compound", icon: "Sunrise", successPreview: "Meditation · Reading · Journaling → Unbreakable", commitment: "moderate", values: ["presence", "wisdom"], soundsLike: "Grounding daily rituals — meditation, journaling, mindfulness, inner calm. meditate, journaling, mindfulness, daily routine, morning routine, inner peace, be present, calm my mind, spiritual practice, grounding habits, stop overthinking, feel centered, be more disciplined" },
  { id: "obj_growth", pillarId: "meaning", label: "Continuous Growth", description: "Never stop learning and evolving", icon: "BookOpen", successPreview: "Courses · Skills · Mastery → Teaching", commitment: "light", values: ["growth", "curiosity"], soundsLike: "Always learning and bettering yourself — skills, reading, self-improvement. learn new things, self improvement, keep growing, read more, learn a skill, better myself, personal growth, never stop learning, develop myself, become my best self, level up, work on myself" },
  { id: "obj_purpose", pillarId: "meaning", label: "Find Your Purpose", description: "Build a life with direction and meaning you're excited to wake up to", icon: "Compass", successPreview: "Clear direction · A vision that pulls you · Excited to wake up", commitment: "moderate", values: ["purpose", "vision"], soundsLike: "Finding direction, purpose and a life you're excited to wake up to. find my purpose, feel alive, excited about life, a life worth living, a future worth living, find direction, find meaning, know why i'm here, build something meaningful, stop feeling lost, feel fulfilled, live with intention, a vision for my life, wake up excited, make my life count" },
  // Vices — alcohol is split into two paths (Get Sober vs Drink Less), like the
  // Girlfriend vs Abundance split in Relations, so the user picks their approach.
  { id: "obj_nofap", pillarId: "vices", label: "Quit Porn", description: "Break the porn habit and reclaim your drive", icon: "ShieldOff", successPreview: "90 days free · urges mastered · real intimacy", commitment: "heavy", values: ["discipline", "freedom"], soundsLike: "Quitting porn and compulsive masturbation. quit porn, stop watching porn, nofap, porn addiction, stop fapping, beat porn, no more porn, reclaim my drive, porn free, stop the porn habit" },
  { id: "obj_sober", pillarId: "vices", label: "Get Sober", description: "Cut alcohol out completely and stay clean", icon: "Ban", successPreview: "Dry months · clear mornings · sober for good", commitment: "heavy", values: ["clarity", "willpower"], soundsLike: "Quitting alcohol completely — total sobriety. quit drinking, get sober, stop drinking, give up alcohol, sobriety, alcohol free, stop drinking completely, no more alcohol, stay dry, stop being a drunk" },
  { id: "obj_drinkless", pillarId: "vices", label: "Drink Less", description: "Stay under a healthy limit without quitting entirely", icon: "Wine", successPreview: "Within limit · dry days stacking · in control", commitment: "moderate", values: ["moderation", "control"], soundsLike: "Cutting back on alcohol without fully quitting — drinking in moderation. drink less, cut back on drinking, moderate my drinking, fewer drinks, drink in moderation, control my drinking, less alcohol, dry days, stop binge drinking" },
  { id: "obj_screen", pillarId: "vices", label: "Reclaim Attention", description: "Escape the scroll and use screens with intention", icon: "Smartphone", successPreview: "Under your limit · social-free days · focused", commitment: "moderate", values: ["focus", "presence"], soundsLike: "Less screen time and social media — escaping the scroll, regaining focus. less screen time, stop scrolling, social media addiction, phone addiction, off my phone, doomscrolling, reclaim my attention, stop wasting time online, digital detox, stop being distracted, focus better" },
  { id: "obj_clean_diet", pillarId: "vices", label: "Kill the Junk", description: "Quit junk food, sugar, and nicotine for good", icon: "Cigarette", successPreview: "Junk-free weeks · sugar broken · smoke-free", commitment: "moderate", values: ["health", "discipline"], soundsLike: "Quitting junk food, sugar, nicotine and other consumption habits. quit sugar, stop eating junk, eat clean, quit smoking, quit vaping, stop nicotine, junk food, cut out sugar, stop snacking, kill my bad habits, stop eating crap" },
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
  { id: "tmpl_calisthenics", pillarId: "health", label: "Calisthenics", description: "Bodyweight mastery: pull-ups, dips, muscle-up, handstand", icon: "Activity",
    objectiveIds: ["obj_calisthenics"],
    targetOverrides: { t_cal_sessions: true, t_cal_protein: true, t_cal_mobility: true, t_pullups_cal: true, t_pushups_cal: true, t_dips_cal: true, t_pistol_cal: true, t_lsit_cal: true, t_handstand_cal: true, t_muscleup_cal: true, t_cal_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_pullups_cal: 5, t_pushups_cal: 20, t_dips_cal: 8, t_pistol_cal: 2, t_lsit_cal: 10 } },
      { label: "Intermediate", targetValues: { t_pullups_cal: 12, t_pushups_cal: 40, t_dips_cal: 20, t_pistol_cal: 5, t_lsit_cal: 20 } },
      { label: "Advanced", targetValues: { t_pullups_cal: 20, t_pushups_cal: 60, t_dips_cal: 30, t_pistol_cal: 10, t_lsit_cal: 45 } },
    ] },
  { id: "tmpl_mobility", pillarId: "health", label: "Mobility & Flexibility", description: "Stretch, do yoga, and unlock toes → squat → splits", icon: "Wind",
    objectiveIds: ["obj_mobility"],
    targetOverrides: { t_stretch_mob: true, t_yoga_mob: true, t_mob_hours: true, t_sitreach: true, t_squat_hold: true, t_splits_skill: true, t_mob_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_sitreach: 5, t_squat_hold: 30, t_mob_hours: 50 } },
      { label: "Intermediate", targetValues: { t_sitreach: 12, t_squat_hold: 60, t_mob_hours: 150 } },
      { label: "Advanced", targetValues: { t_sitreach: 20, t_squat_hold: 120, t_mob_hours: 300 } },
    ] },
  { id: "tmpl_bulk", pillarId: "health", label: "Lean Bulk", description: "Eat in a surplus, lift, and add lean muscle mass", icon: "Dumbbell",
    objectiveIds: ["obj_muscle"],
    targetOverrides: { t_gym_muscle: true, t_protein_muscle: true, t_surplus_muscle: true, t_bodyweight_gain: true, t_mass_gained: true, t_arms: true, t_bench_muscle: true, t_mindmuscle: true, t_muscle_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_bodyweight_gain: 75, t_mass_gained: 5, t_arms: 36, t_bench_muscle: 60 } },
      { label: "Intermediate", targetValues: { t_bodyweight_gain: 82, t_mass_gained: 10, t_arms: 40, t_bench_muscle: 90 } },
      { label: "Advanced", targetValues: { t_bodyweight_gain: 90, t_mass_gained: 15, t_arms: 43, t_bench_muscle: 110 } },
    ] },
  { id: "tmpl_cut", pillarId: "health", label: "Summer Cut", description: "Strip fat: track calories, drop body fat, lean out", icon: "Flame",
    objectiveIds: ["obj_body"],
    targetOverrides: { t_gym_body: true, t_protein_body: true, t_cal_tracking: true, t_bodyfat: true, t_waist: true, t_bodyweight: true, t_progress_photos: true, t_sleep: true, t_body_stages: true, t_bench: false, t_squat: false, t_deadlift: false },
    levels: [
      { label: "Beginner", targetValues: { t_bodyfat: 18, t_bodyweight: 85, t_waist: 88, t_progress_photos: 12 } },
      { label: "Intermediate", targetValues: { t_bodyfat: 14, t_bodyweight: 80, t_waist: 82, t_progress_photos: 24 } },
      { label: "Advanced", targetValues: { t_bodyfat: 10, t_bodyweight: 76, t_waist: 78, t_progress_photos: 52 } },
    ] },
  { id: "tmpl_c25k", pillarId: "health", label: "Couch to 5K", description: "Start running from zero — build to a non-stop 5k", icon: "Footprints",
    objectiveIds: ["obj_endurance"],
    targetOverrides: { t_cardio_sessions: true, t_hydration: true, t_total_km: true, t_longest_run: true, t_5k_time: true, t_pacing: true, t_endurance_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_total_km: 50, t_longest_run: 3, t_5k_time: 35 } },
      { label: "Intermediate", targetValues: { t_total_km: 150, t_longest_run: 5, t_5k_time: 30 } },
      { label: "Advanced", targetValues: { t_total_km: 300, t_longest_run: 8, t_5k_time: 27 } },
    ] },
  { id: "tmpl_marathon", pillarId: "health", label: "Marathon Builder", description: "Long-distance base, big mileage, race-day ready", icon: "Medal",
    objectiveIds: ["obj_endurance"],
    targetOverrides: { t_cardio_sessions: true, t_hydration: true, t_total_km: true, t_longest_run: true, t_5k_time: true, t_pacing: true, t_consec_cardio: true, t_endurance_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_total_km: 300, t_longest_run: 15, t_5k_time: 28 } },
      { label: "Intermediate", targetValues: { t_total_km: 800, t_longest_run: 30, t_5k_time: 24 } },
      { label: "Advanced", targetValues: { t_total_km: 1500, t_longest_run: 42, t_5k_time: 21 } },
    ] },
  { id: "tmpl_active", pillarId: "health", label: "Active Lifestyle", description: "No gym needed: daily steps, move every day, healthier heart", icon: "TrendingUp",
    objectiveIds: ["obj_active"],
    targetOverrides: { t_steps_active: true, t_move_active: true, t_step_count: true, t_resting_hr: true, t_active_streak: true, t_active_stages: true, t_active_lifetime: true, t_active_energy: true },
    levels: [
      { label: "Beginner", targetValues: { t_step_count: 6000, t_resting_hr: 70, t_active_streak: 8, t_active_lifetime: 120, t_active_energy: 6 } },
      { label: "Intermediate", targetValues: { t_step_count: 8000, t_resting_hr: 62, t_active_streak: 26, t_active_lifetime: 250, t_active_energy: 7 } },
      { label: "Advanced", targetValues: { t_step_count: 12000, t_resting_hr: 55, t_active_streak: 52, t_active_lifetime: 365, t_active_energy: 8 } },
    ] },
  { id: "tmpl_recovery", pillarId: "health", label: "Sleep & Recovery", description: "Fix your sleep: consistent schedule, wind down, wake refreshed", icon: "Sunrise",
    objectiveIds: ["obj_recovery"],
    targetOverrides: { t_sleep_schedule: true, t_winddown: true, t_no_screen_bed: true, t_sleep_hours: true, t_sleep_streak: true, t_recovery_stages: true, t_restful_nights: true, t_sleep_hygiene: true },
    levels: [
      { label: "Beginner", targetValues: { t_sleep_streak: 8, t_restful_nights: 60 } },
      { label: "Intermediate", targetValues: { t_sleep_streak: 26, t_restful_nights: 120 } },
      { label: "Advanced", targetValues: { t_sleep_streak: 52, t_restful_nights: 200 } },
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
    targetOverrides: { t_deep_work: true, t_weekly_review: true, t_monthly_income: true, t_income_stages: true, t_sales_skill: true, t_offers_made: true, t_clients: true, t_monthly_profit: true },
    levels: [
      { label: "Beginner", targetValues: { t_deep_work: 200, t_monthly_income: 3000, t_clients: 5, t_monthly_profit: 1000 } },
      { label: "Intermediate", targetValues: { t_deep_work: 500, t_monthly_income: 7000, t_clients: 15, t_monthly_profit: 5000 } },
      { label: "Advanced", targetValues: { t_deep_work: 1000, t_monthly_income: 15000, t_clients: 30, t_monthly_profit: 12000 } },
    ] },
  { id: "tmpl_fi", pillarId: "wealth", label: "Financial Independence", description: "Save aggressively, invest consistently, build net worth", icon: "Shield",
    objectiveIds: ["obj_income", "obj_freedom"],
    targetOverrides: { t_deep_work: true, t_weekly_review: true, t_monthly_income: true, t_income_stages: true, t_budget: true, t_savings_habit: true, t_net_worth: true, t_savings_rate: true, t_freedom_stages: true, t_debt_payoff: true, t_emergency_fund: true, t_invested_total: true },
    levels: [
      { label: "Beginner", targetValues: { t_deep_work: 200, t_monthly_income: 3000, t_net_worth: 25, t_savings_rate: 15, t_debt_payoff: 5, t_emergency_fund: 1, t_invested_total: 10 } },
      { label: "Intermediate", targetValues: { t_deep_work: 500, t_monthly_income: 7000, t_net_worth: 100, t_savings_rate: 25, t_debt_payoff: 15, t_emergency_fund: 3, t_invested_total: 50 } },
      { label: "Advanced", targetValues: { t_deep_work: 1000, t_monthly_income: 15000, t_net_worth: 500, t_savings_rate: 40, t_debt_payoff: 30, t_emergency_fund: 6, t_invested_total: 150 } },
    ] },

  { id: "tmpl_business", pillarId: "wealth", label: "Start a Business", description: "From idea to first sale to a profitable business", icon: "Rocket",
    objectiveIds: ["obj_business"],
    targetOverrides: { t_biz_build: true, t_biz_outreach: true, t_biz_customers: true, t_biz_revenue: true, t_biz_profit: true, t_biz_skill: true, t_biz_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_biz_build: 200, t_biz_customers: 10, t_biz_revenue: 2000, t_biz_profit: 1000 } },
      { label: "Intermediate", targetValues: { t_biz_build: 500, t_biz_customers: 50, t_biz_revenue: 10000, t_biz_profit: 6000 } },
      { label: "Advanced", targetValues: { t_biz_build: 1000, t_biz_customers: 200, t_biz_revenue: 30000, t_biz_profit: 15000 } },
    ] },

  // Meaning templates
  { id: "tmpl_mindful", pillarId: "meaning", label: "Mindful Life", description: "Daily meditation, journaling, and reading", icon: "Sunrise",
    objectiveIds: ["obj_practice"],
    targetOverrides: { t_med_practice: true, t_journal_practice: true, t_reading: true, t_books: true, t_practice_stages: true, t_med_streak: true, t_presence_skill: true },
    levels: [
      { label: "Beginner", targetValues: { t_books: 12, t_med_streak: 30 } },
      { label: "Intermediate", targetValues: { t_books: 30, t_med_streak: 100 } },
      { label: "Advanced", targetValues: { t_books: 52, t_med_streak: 365 } },
    ] },
  { id: "tmpl_polymath", pillarId: "meaning", label: "Continuous Learner", description: "Courses, skills, and deep practice", icon: "BookOpen",
    objectiveIds: ["obj_practice", "obj_growth"],
    targetOverrides: { t_med_practice: true, t_reading: true, t_books: true, t_learning_hours: true, t_skill_practice: true, t_courses: true, t_growth_stages: true, t_skills_mastered: true, t_projects_built: true, t_teach_skill: true },
    levels: [
      { label: "Beginner", targetValues: { t_books: 12, t_learning_hours: 100, t_courses: 5, t_skills_mastered: 2, t_projects_built: 3 } },
      { label: "Intermediate", targetValues: { t_books: 30, t_learning_hours: 300, t_courses: 12, t_skills_mastered: 5, t_projects_built: 12 } },
      { label: "Advanced", targetValues: { t_books: 52, t_learning_hours: 500, t_courses: 20, t_skills_mastered: 10, t_projects_built: 30 } },
    ] },

  { id: "tmpl_purpose", pillarId: "meaning", label: "Find Your Purpose", description: "Clarify your direction and build a life you're excited about", icon: "Compass",
    objectiveIds: ["obj_purpose"],
    targetOverrides: { t_purpose_journal: true, t_purpose_action: true, t_purpose_clarity: true, t_purpose_excited: true, t_purpose_milestones: true, t_purpose_stages: true },
    levels: [
      { label: "Beginner", targetValues: { t_purpose_excited: 30, t_purpose_milestones: 3 } },
      { label: "Intermediate", targetValues: { t_purpose_excited: 90, t_purpose_milestones: 12 } },
      { label: "Advanced", targetValues: { t_purpose_excited: 365, t_purpose_milestones: 30 } },
    ] },

  // Vices templates (levels = streak milestones, so they slot into badge tiers)
  { id: "tmpl_reboot", pillarId: "vices", label: "Porn Reboot", description: "Quit porn, daily check-ins, ride out the urges", icon: "Sunrise",
    objectiveIds: ["obj_nofap"],
    targetOverrides: { t_nofap_streak: true, t_nofap_checkin: true, t_nofap_stages: true, t_nofap_urge: true, t_nofap_replace: true },
    levels: [
      { label: "Beginner", targetValues: { t_nofap_streak: 30 } },
      { label: "Intermediate", targetValues: { t_nofap_streak: 90 } },
      { label: "Advanced", targetValues: { t_nofap_streak: 365 } },
    ] },
  { id: "tmpl_sobriety", pillarId: "vices", label: "Get Sober", description: "Cut alcohol completely and stack dry days", icon: "Shield",
    objectiveIds: ["obj_sober"],
    targetOverrides: { t_sober_streak: true, t_sober_checkin: true, t_sober_stages: true, t_sober_money: true, t_sober_trigger: true },
    levels: [
      { label: "Beginner", targetValues: { t_sober_streak: 30, t_sober_money: 500 } },
      { label: "Intermediate", targetValues: { t_sober_streak: 90, t_sober_money: 2000 } },
      { label: "Advanced", targetValues: { t_sober_streak: 365, t_sober_money: 5000 } },
    ] },
  { id: "tmpl_moderation", pillarId: "vices", label: "Mindful Drinking", description: "Stay under your limit, stack alcohol-free days", icon: "Target",
    objectiveIds: ["obj_drinkless"],
    targetOverrides: { t_drink_limit: true, t_drink_dry_days: true, t_drink_stages: true, t_drink_count: true, t_drink_money: true },
    levels: [
      { label: "Beginner", targetValues: { t_drink_dry_days: 15, t_drink_count: 10, t_drink_money: 300 } },
      { label: "Intermediate", targetValues: { t_drink_dry_days: 30, t_drink_count: 6, t_drink_money: 1000 } },
      { label: "Advanced", targetValues: { t_drink_dry_days: 60, t_drink_count: 3, t_drink_money: 2500 } },
    ] },
  { id: "tmpl_detox", pillarId: "vices", label: "Digital Detox", description: "Cap screen time, reclaim your attention", icon: "Brain",
    objectiveIds: ["obj_screen"],
    targetOverrides: { t_screen_limit: true, t_no_socials: true, t_screen_stages: true, t_screen_hours: true, t_focus_sessions: true },
    levels: [
      { label: "Beginner", targetValues: { t_no_socials: 30, t_screen_hours: 4 } },
      { label: "Intermediate", targetValues: { t_no_socials: 60, t_screen_hours: 3 } },
      { label: "Advanced", targetValues: { t_no_socials: 120, t_screen_hours: 2 } },
    ] },
  { id: "tmpl_clean", pillarId: "vices", label: "Clean Living", description: "Quit junk, sugar, and nicotine for good", icon: "Trophy",
    objectiveIds: ["obj_clean_diet"],
    targetOverrides: { t_junkfree_days: true, t_sugarfree_streak: true, t_smoke_free: true, t_diet_stages: true, t_homecooked: true, t_craving_skill: true },
    levels: [
      { label: "Beginner", targetValues: { t_sugarfree_streak: 30, t_smoke_free: 30 } },
      { label: "Intermediate", targetValues: { t_sugarfree_streak: 60, t_smoke_free: 90 } },
      { label: "Advanced", targetValues: { t_sugarfree_streak: 120, t_smoke_free: 365 } },
    ] },
]

export function getTemplatesForPillar(pillarId: string): Template[] {
  return TEMPLATES.filter(t => t.pillarId === pillarId)
}

/**
 * The most specific template that covers an objective — used to turn an intake
 * match into actually-enabled targets. Prefers the template with the fewest
 * objectives (most focused), tie-broken by the objective being its primary one.
 */
export function getPrimaryTemplateForObjective(objectiveId: string): Template | null {
  const candidates = TEMPLATES.filter(t => t.objectiveIds.includes(objectiveId))
  if (candidates.length === 0) return null
  return candidates.slice().sort((a, b) =>
    (a.objectiveIds.length - b.objectiveIds.length) ||
    ((a.objectiveIds[0] === objectiveId ? 0 : 1) - (b.objectiveIds[0] === objectiveId ? 0 : 1))
  )[0]
}

export const TARGETS: FrameworkTarget[] = [
  // =========================================================================
  // Health -> Get Strong (obj_strong)
  // =========================================================================
  { id: "t_gym_strong", objectiveId: "obj_strong", label: "Gym Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: "sd_gym", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_protein_strong", objectiveId: "obj_strong", label: "Protein Target", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_protein", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_bench", objectiveId: "obj_strong", label: "Bench Press 1RM", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 70, target: 100, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'strength' },
  { id: "t_squat", objectiveId: "obj_strong", label: "Squat 1RM", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 100, target: 140, steps: 9, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'strength' },
  { id: "t_deadlift", objectiveId: "obj_strong", label: "Deadlift 1RM", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 125, target: 180, steps: 9, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'strength' },
  { id: "t_lift_form", objectiveId: "obj_strong", label: "Lift Form", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["nail the movement pattern", "clean reps at light weight", "form holds at heavy weight", "self-correct mid-set"] },
  { id: "t_pullups", objectiveId: "obj_strong", label: "Pull-ups Max", primitive: "target", role: "metric", unit: "reps", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 12, target: 20, steps: 8, curveTension: -0.3 }, rampSteps: null, stageSteps: null, metricKind: 'reps' },
  { id: "t_ohp", objectiveId: "obj_strong", label: "Overhead Press 1RM", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 55, target: 80, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'strength' },
  { id: "t_total_workouts", objectiveId: "obj_strong", label: "Lifetime Workouts", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 500, steps: 10, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_strength_stages", objectiveId: "obj_strong", label: "Strength Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first real program", "intermediate lifts", "1000lb total", "advanced lifter"] },

  // =========================================================================
  // Health -> Transform Body (obj_body)
  // =========================================================================
  { id: "t_gym_body", objectiveId: "obj_body", label: "Gym Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: "sd_gym", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_protein_body", objectiveId: "obj_body", label: "Protein Target", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_protein", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_cal_tracking", objectiveId: "obj_body", label: "Calorie Tracking", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_bodyweight", objectiveId: "obj_body", label: "Body Weight", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 90, target: 80, steps: 6, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'bodymass' },
  { id: "t_bodyfat", objectiveId: "obj_body", label: "Body Fat %", primitive: "target", role: "metric", unit: "%", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 19, target: 12, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'bodyfat' },
  { id: "t_body_stages", objectiveId: "obj_body", label: "Body Milestones", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first pull-up", "visible abs", "run a 5k", "photoshoot ready"] },
  { id: "t_progress_photos", objectiveId: "obj_body", label: "Progress Photos", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 52, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_waist", objectiveId: "obj_body", label: "Waist Measurement", primitive: "target", role: "metric", unit: "cm", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 90, target: 80, steps: 6, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'bodymass' },
  { id: "t_sleep", objectiveId: "obj_body", label: "Sleep Quality", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 4, durationWeeks: 4 }, { frequencyPerWeek: 6, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },

  // =========================================================================
  // Health -> Build Endurance (obj_endurance)
  // =========================================================================
  { id: "t_cardio_sessions", objectiveId: "obj_endurance", label: "Cardio Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 8 }, { frequencyPerWeek: 3, durationWeeks: 12 }, { frequencyPerWeek: 4, durationWeeks: 24 }], stageSteps: null },
  { id: "t_hydration", objectiveId: "obj_endurance", label: "Hydration", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 5, durationWeeks: 4 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_total_km", objectiveId: "obj_endurance", label: "Lifetime KM Run", primitive: "volume", role: "metric", unit: "km", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 500, steps: 10, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_longest_run", objectiveId: "obj_endurance", label: "Longest Run", primitive: "target", role: "metric", unit: "km", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 11, target: 21, steps: 8, curveTension: -0.3 }, rampSteps: null, stageSteps: null, metricKind: 'distance' },
  { id: "t_pacing", objectiveId: "obj_endurance", label: "Pacing & Form", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["finish without walking", "hold a steady pace", "run negative splits", "race-day ready"] },
  { id: "t_5k_time", objectiveId: "obj_endurance", label: "5K Time", primitive: "target", role: "metric", unit: "min", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 28, target: 22, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'pace' },
  { id: "t_consec_cardio", objectiveId: "obj_endurance", label: "Consecutive Cardio Weeks", primitive: "habit", role: "metric", unit: "weeks", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 26, steps: 7, curveTension: 0.8 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_endurance_stages", objectiveId: "obj_endurance", label: "Endurance Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["survive a jog", "run 5k without stopping", "complete 10k", "half marathon"] },

  // =========================================================================
  // Health -> Master Your Bodyweight (obj_calisthenics)
  // =========================================================================
  { id: "t_cal_sessions", objectiveId: "obj_calisthenics", label: "Calisthenics Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 8 }, { frequencyPerWeek: 4, durationWeeks: 12 }, { frequencyPerWeek: 5, durationWeeks: 24 }], stageSteps: null },
  { id: "t_cal_protein", objectiveId: "obj_calisthenics", label: "Protein Target", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_protein", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_cal_mobility", objectiveId: "obj_calisthenics", label: "Mobility & Prehab", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 4 }, { frequencyPerWeek: 4, durationWeeks: 8 }, { frequencyPerWeek: 5, durationWeeks: 24 }], stageSteps: null, linkedMetric: "mobility_sessions_weekly" },
  { id: "t_pullups_cal", objectiveId: "obj_calisthenics", label: "Max Pull-ups", primitive: "target", role: "metric", unit: "reps", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 8, target: 12, steps: 8, curveTension: -0.3 }, rampSteps: null, stageSteps: null, metricKind: 'reps', linkedMetric: "pullups_max_reps" },
  { id: "t_pushups_cal", objectiveId: "obj_calisthenics", label: "Max Push-ups", primitive: "target", role: "metric", unit: "reps", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 20, target: 40, steps: 8, curveTension: -0.3 }, rampSteps: null, stageSteps: null, metricKind: 'reps' },
  { id: "t_dips_cal", objectiveId: "obj_calisthenics", label: "Max Dips", primitive: "target", role: "metric", unit: "reps", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 10, target: 20, steps: 8, curveTension: -0.3 }, rampSteps: null, stageSteps: null, metricKind: 'reps' },
  { id: "t_pistol_cal", objectiveId: "obj_calisthenics", label: "Pistol Squats (per leg)", primitive: "target", role: "metric", unit: "reps", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 5, steps: 5, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'reps' },
  { id: "t_lsit_cal", objectiveId: "obj_calisthenics", label: "L-sit Hold", primitive: "target", role: "metric", unit: "sec", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 8, target: 20, steps: 7, curveTension: -0.3 }, rampSteps: null, stageSteps: null, metricKind: 'reps' },
  { id: "t_handstand_cal", objectiveId: "obj_calisthenics", label: "Handstand", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["wall handstand 30s", "kick up to freestanding", "hold freestanding 10s+", "handstand push-up"] },
  { id: "t_muscleup_cal", objectiveId: "obj_calisthenics", label: "Muscle-up", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["strict pull-up + straight-bar dip", "explosive high pull-ups", "first bar muscle-up", "clean reps & ring muscle-up"] },
  { id: "t_cal_stages", objectiveId: "obj_calisthenics", label: "Calisthenics Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first full pull-up", "10 pull-ups + 15 dips", "first muscle-up", "planche / front lever"] },

  // =========================================================================
  // Health -> Move Without Pain (obj_mobility)
  // =========================================================================
  { id: "t_stretch_mob", objectiveId: "obj_mobility", label: "Stretching", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null, linkedMetric: "mobility_sessions_weekly" },
  { id: "t_yoga_mob", objectiveId: "obj_mobility", label: "Yoga Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 1, durationWeeks: 4 }, { frequencyPerWeek: 2, durationWeeks: 8 }, { frequencyPerWeek: 3, durationWeeks: 24 }], stageSteps: null, linkedMetric: "yoga_sessions_weekly" },
  { id: "t_mob_hours", objectiveId: "obj_mobility", label: "Lifetime Mobility Hours", primitive: "volume", role: "metric", unit: "hours", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 150, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative', linkedMetric: "flexibility_hours_cumulative" },
  { id: "t_sitreach", objectiveId: "obj_mobility", label: "Sit & Reach", primitive: "target", role: "metric", unit: "cm", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 12, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'distance' },
  { id: "t_squat_hold", objectiveId: "obj_mobility", label: "Deep Squat Hold", primitive: "target", role: "metric", unit: "sec", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 20, target: 60, steps: 7, curveTension: -0.3 }, rampSteps: null, stageSteps: null, metricKind: 'reps' },
  { id: "t_splits_skill", objectiveId: "obj_mobility", label: "Front Splits", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["palms to shins in a fold", "hands flat on the floor", "half-split to the floor", "full front splits"] },
  { id: "t_mob_stages", objectiveId: "obj_mobility", label: "Mobility Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["stiff & restricted", "touch your toes", "flat-foot deep squat", "splits & pancake"] },

  // =========================================================================
  // Health -> Build Muscle (obj_muscle) — lean bulk. bodymass_gain metrics start
  // BELOW target (you're growing into them), unlike obj_body's cutting metrics.
  // =========================================================================
  { id: "t_gym_muscle", objectiveId: "obj_muscle", label: "Gym Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: "sd_gym", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_protein_muscle", objectiveId: "obj_muscle", label: "Protein Target", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_protein", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_surplus_muscle", objectiveId: "obj_muscle", label: "Calorie Surplus Days", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null, linkedMetric: "calorie_days_hit_weekly" },
  { id: "t_bodyweight_gain", objectiveId: "obj_muscle", label: "Body Weight", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 72, target: 82, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'bodymass_gain', linkedMetric: "body_weight_current" },
  { id: "t_mass_gained", objectiveId: "obj_muscle", label: "Lean Mass Gained", primitive: "volume", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 10, steps: 6, curveTension: 0.8 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative', linkedMetric: "weight_gained_from_lowest" },
  { id: "t_arms", objectiveId: "obj_muscle", label: "Arm Measurement", primitive: "target", role: "metric", unit: "cm", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 35, target: 40, steps: 6, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'bodymass_gain' },
  { id: "t_bench_muscle", objectiveId: "obj_muscle", label: "Bench Press 1RM", primitive: "target", role: "metric", unit: "kg", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 60, target: 90, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'strength', linkedMetric: "bench_press_1rm" },
  { id: "t_mindmuscle", objectiveId: "obj_muscle", label: "Lifting Technique", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["learn the main lifts", "controlled tempo & full range", "feel the target muscle work", "progressive overload dialed in"] },
  { id: "t_muscle_stages", objectiveId: "obj_muscle", label: "Muscle Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["skinny / untrained", "filling out", "visibly bigger", "lean & muscular"] },

  // =========================================================================
  // Health -> Stay Active Daily (obj_active)
  // =========================================================================
  { id: "t_steps_active", objectiveId: "obj_active", label: "Hit Step Goal", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 4, durationWeeks: 4 }, { frequencyPerWeek: 6, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_move_active", objectiveId: "obj_active", label: "Move Every Day", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 5, durationWeeks: 4 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_step_count", objectiveId: "obj_active", label: "Daily Step Count", primitive: "target", role: "metric", unit: "steps", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 4000, target: 8000, steps: 8, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'reps' },
  { id: "t_resting_hr", objectiveId: "obj_active", label: "Resting Heart Rate", primitive: "target", role: "metric", unit: "bpm", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 75, target: 60, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'pace' },
  { id: "t_active_streak", objectiveId: "obj_active", label: "Active Weeks Streak", primitive: "habit", role: "metric", unit: "weeks", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 26, steps: 7, curveTension: 0.8 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_active_stages", objectiveId: "obj_active", label: "Active Lifestyle Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["mostly sedentary", "moving most days", "active by default", "athletic baseline"] },
  { id: "t_active_lifetime", objectiveId: "obj_active", label: "Lifetime Active Days", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 365, steps: 9, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_active_energy", objectiveId: "obj_active", label: "Daily Energy", primitive: "target", role: "metric", unit: "/10", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 4, target: 8, steps: 5, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'reps' },

  // =========================================================================
  // Health -> Sleep & Recover (obj_recovery)
  // =========================================================================
  { id: "t_sleep_schedule", objectiveId: "obj_recovery", label: "Consistent Bedtime", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 4, durationWeeks: 4 }, { frequencyPerWeek: 6, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_winddown", objectiveId: "obj_recovery", label: "Wind-Down Routine", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_no_screen_bed", objectiveId: "obj_recovery", label: "No Screens Before Bed", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_sleep_hours", objectiveId: "obj_recovery", label: "Average Sleep", primitive: "target", role: "metric", unit: "hours", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 6, target: 8, steps: 4, curveTension: 0 }, rampSteps: null, stageSteps: null, linkedMetric: "sleep_hours_avg_weekly" },
  { id: "t_sleep_streak", objectiveId: "obj_recovery", label: "Good-Sleep Week Streak", primitive: "target", role: "metric", unit: "weeks", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 26, steps: 7, curveTension: 0.8 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_recovery_stages", objectiveId: "obj_recovery", label: "Recovery Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["always exhausted", "consistent bedtime", "sleeping deeply", "wake up refreshed"] },
  { id: "t_restful_nights", objectiveId: "obj_recovery", label: "Restful Nights", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 200, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_sleep_hygiene", objectiveId: "obj_recovery", label: "Sleep Hygiene", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["wired at bedtime", "winding down nightly", "falling asleep fast", "deep restorative sleep"] },

  // =========================================================================
  // Relations -> Get a Girlfriend (obj_girlfriend)
  // =========================================================================
  { id: "t_approaches_gf", objectiveId: "obj_girlfriend", label: "Approaches", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: "sd_approaches", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_open_skill", objectiveId: "obj_girlfriend", label: "Open Cleanly", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first cold approach", "push through the nerves", "open 3+ per outing", "open anyone, anytime"] },
  { id: "t_convo_skill", objectiveId: "obj_girlfriend", label: "Hold Conversation", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["keep it alive 1 min", "flowing 3-min chat", "make her genuinely laugh", "deep rapport & connection"] },
  { id: "t_close_skill", objectiveId: "obj_girlfriend", label: "Close (Get Number)", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["ask for the number", "get a non-flake number", "close most solid convos", "closing feels natural"] },
  { id: "t_gf_funnel", objectiveId: "obj_girlfriend", label: "Dating Funnel", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first date", "first 2nd date", "dating someone", "exclusive"] },
  { id: "t_voice_notes_gf", objectiveId: "obj_girlfriend", label: "Voice Notes / Field Reports", primitive: "habit", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 8 }, { frequencyPerWeek: 3, durationWeeks: 12 }, { frequencyPerWeek: 5, durationWeeks: 24 }], stageSteps: null },
  { id: "t_solo_sessions_gf", objectiveId: "obj_girlfriend", label: "Solo Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 1, durationWeeks: 12 }, { frequencyPerWeek: 2, durationWeeks: 24 }], stageSteps: null },
  { id: "t_date_skill", objectiveId: "obj_girlfriend", label: "Date Leading", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["plan & propose a date", "lead the date with confidence", "build attraction on the date", "memorable dates that escalate"] },

  // =========================================================================
  // Relations -> Date Abundantly (obj_abundance)
  // =========================================================================
  { id: "t_approaches_ab", objectiveId: "obj_abundance", label: "Approaches", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: "sd_approaches", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_texts_ab", objectiveId: "obj_abundance", label: "Texts Sent", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 12 }, { frequencyPerWeek: 5, durationWeeks: 12 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_open_ab", objectiveId: "obj_abundance", label: "Opening Skill", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["open without a script", "consistent daily opens", "read it & adapt", "opening feels effortless"] },
  { id: "t_text_skill", objectiveId: "obj_abundance", label: "Text Game", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["keep a thread alive", "turn numbers into dates", "recover flakes & reschedule", "texting builds attraction"] },
  { id: "t_ab_funnel", objectiveId: "obj_abundance", label: "Abundance Stages", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first lay", "dating 2 women", "rotation of 3+", "true abundance"] },
  { id: "t_dates_ab", objectiveId: "obj_abundance", label: "Dates per Month", primitive: "volume", role: "metric", unit: "/month", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 8, steps: 5, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'rate' },
  { id: "t_kiss_closes", objectiveId: "obj_abundance", label: "Kiss Closes", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 25, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },

  // =========================================================================
  // Relations -> Build Inner Game (obj_inner)
  // =========================================================================
  { id: "t_meditation_inner", objectiveId: "obj_inner", label: "Meditation", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_meditation", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_journal_inner", objectiveId: "obj_inner", label: "Journaling", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_journaling", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_comfort", objectiveId: "obj_inner", label: "Comfort Zone Challenges", primitive: "volume", role: "driver", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 100, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_emotion_skill", objectiveId: "obj_inner", label: "Emotional Regulation", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["notice the emotion arising", "pause before reacting", "choose your response", "calm under real pressure"] },
  { id: "t_anxiety_stages", objectiveId: "obj_inner", label: "Approach Anxiety", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["paralysing anxiety", "nervous but moving", "mild butterflies", "calm and present"] },
  { id: "t_cold_shower", objectiveId: "obj_inner", label: "Cold Showers", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_gratitude", objectiveId: "obj_inner", label: "Gratitude Practice", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 8 }, { frequencyPerWeek: 5, durationWeeks: 12 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },

  // =========================================================================
  // Wealth -> Build Income (obj_income)
  // =========================================================================
  { id: "t_deep_work", objectiveId: "obj_income", label: "Deep Work Hours", primitive: "volume", role: "driver", unit: "hours/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 500, steps: 10, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_weekly_review", objectiveId: "obj_income", label: "Weekly Review", primitive: "habit", role: "driver", unit: "weeks", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 1, durationWeeks: 52 }], stageSteps: null },
  { id: "t_monthly_income", objectiveId: "obj_income", label: "Monthly Income", primitive: "target", role: "metric", unit: "$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 3000, target: 10000, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'income' },
  { id: "t_income_stages", objectiveId: "obj_income", label: "Income Milestones", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["first paying client", "$1k month", "$5k month", "$10k month"] },
  { id: "t_sales_skill", objectiveId: "obj_income", label: "Sales & Networking", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["deliver your first pitch", "pitch without flinching", "handle objections calmly", "close deals consistently"] },
  { id: "t_offers_made", objectiveId: "obj_income", label: "Offers Made", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 8 }, { frequencyPerWeek: 4, durationWeeks: 12 }, { frequencyPerWeek: 6, durationWeeks: 24 }], stageSteps: null },
  { id: "t_clients", objectiveId: "obj_income", label: "Paying Clients", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 30, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_monthly_profit", objectiveId: "obj_income", label: "Monthly Profit", primitive: "target", role: "metric", unit: "$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1000, target: 15000, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'income' },

  // =========================================================================
  // Wealth -> Financial Freedom (obj_freedom)
  // =========================================================================
  { id: "t_budget", objectiveId: "obj_freedom", label: "Budget Tracking", primitive: "habit", role: "driver", unit: "weeks", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 1, durationWeeks: 52 }], stageSteps: null },
  { id: "t_savings_habit", objectiveId: "obj_freedom", label: "Auto-Save", primitive: "habit", role: "driver", unit: "months", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 24, steps: 6, curveTension: 0.8 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_net_worth", objectiveId: "obj_freedom", label: "Net Worth", primitive: "target", role: "metric", unit: "k$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 100, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_savings_rate", objectiveId: "obj_freedom", label: "Savings Rate", primitive: "target", role: "metric", unit: "%", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 15, target: 30, steps: 6, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'rate' },
  { id: "t_freedom_stages", objectiveId: "obj_freedom", label: "Freedom Milestones", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["emergency fund", "debt-free", "investing regularly", "financially independent"] },
  { id: "t_debt_payoff", objectiveId: "obj_freedom", label: "Debt Paid Off", primitive: "volume", role: "metric", unit: "k$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 20, steps: 7, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_emergency_fund", objectiveId: "obj_freedom", label: "Emergency Fund", primitive: "target", role: "metric", unit: "months", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 6, steps: 6, curveTension: 0.8 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_invested_total", objectiveId: "obj_freedom", label: "Invested Total", primitive: "volume", role: "metric", unit: "k$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 50, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },

  // =========================================================================
  // Wealth -> Start a Business (obj_business)
  // =========================================================================
  { id: "t_biz_build", objectiveId: "obj_business", label: "Build Hours", primitive: "volume", role: "driver", unit: "hours/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 500, steps: 10, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_biz_outreach", objectiveId: "obj_business", label: "Customer Outreach", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 8 }, { frequencyPerWeek: 4, durationWeeks: 12 }, { frequencyPerWeek: 6, durationWeeks: 24 }], stageSteps: null },
  { id: "t_biz_customers", objectiveId: "obj_business", label: "Paying Customers", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 100, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_biz_revenue", objectiveId: "obj_business", label: "Monthly Revenue", primitive: "target", role: "metric", unit: "$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 10000, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'income' },
  { id: "t_biz_profit", objectiveId: "obj_business", label: "Monthly Profit", primitive: "target", role: "metric", unit: "$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 10000, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'income' },
  { id: "t_biz_skill", objectiveId: "obj_business", label: "Founder Skills", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["validate an idea", "land your first sale", "build a repeatable offer", "scale what works"] },
  { id: "t_biz_stages", objectiveId: "obj_business", label: "Business Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["just an idea", "first paying customer", "ramen profitable", "real, growing business"] },

  // =========================================================================
  // Meaning -> Daily Practice (obj_practice)
  // =========================================================================
  { id: "t_med_practice", objectiveId: "obj_practice", label: "Meditation", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_meditation", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_journal_practice", objectiveId: "obj_practice", label: "Journaling", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: "sd_journaling", milestoneConfig: null, rampSteps: null, stageSteps: null },
  { id: "t_reading", objectiveId: "obj_practice", label: "Reading", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 8 }, { frequencyPerWeek: 5, durationWeeks: 12 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_books", objectiveId: "obj_practice", label: "Books Read", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 50, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_practice_stages", objectiveId: "obj_practice", label: "Practice Depth", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["sporadic practice", "daily routine", "unbreakable habit", "teaching others"] },
  { id: "t_med_streak", objectiveId: "obj_practice", label: "Meditation Streak", primitive: "target", role: "metric", unit: "days", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 100, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_presence_skill", objectiveId: "obj_practice", label: "Presence", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["constantly distracted", "noticing the wandering", "returning to the breath", "present by default"] },

  // =========================================================================
  // Meaning -> Continuous Growth (obj_growth)
  // =========================================================================
  { id: "t_learning_hours", objectiveId: "obj_growth", label: "Learning Hours", primitive: "volume", role: "driver", unit: "hours/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 500, steps: 10, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_skill_practice", objectiveId: "obj_growth", label: "Skill Practice", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 8 }, { frequencyPerWeek: 4, durationWeeks: 12 }, { frequencyPerWeek: 6, durationWeeks: 24 }], stageSteps: null },
  { id: "t_courses", objectiveId: "obj_growth", label: "Courses Completed", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 1, target: 20, steps: 7, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_growth_stages", objectiveId: "obj_growth", label: "Growth Path", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["curious learner", "active practitioner", "skilled professional", "teaching & mentoring"] },
  { id: "t_skills_mastered", objectiveId: "obj_growth", label: "Skills Mastered", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 5, steps: 5, curveTension: 0.8 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_projects_built", objectiveId: "obj_growth", label: "Projects Built", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 12, steps: 7, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_teach_skill", objectiveId: "obj_growth", label: "Teaching & Sharing", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["take notes for yourself", "explain it to a friend", "write or post publicly", "teach or mentor others"] },

  // =========================================================================
  // Meaning -> Find Your Purpose (obj_purpose)
  // =========================================================================
  { id: "t_purpose_journal", objectiveId: "obj_purpose", label: "Vision Journaling", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_purpose_action", objectiveId: "obj_purpose", label: "Aligned Action", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_purpose_clarity", objectiveId: "obj_purpose", label: "Clarity of Direction", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["drifting, no direction", "exploring what matters", "a clear direction", "living it daily"] },
  { id: "t_purpose_excited", objectiveId: "obj_purpose", label: "Excited-to-Wake Days", primitive: "target", role: "metric", unit: "days", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 90, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_purpose_milestones", objectiveId: "obj_purpose", label: "Meaningful Milestones", primitive: "volume", role: "metric", unit: "total", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 12, steps: 7, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_purpose_stages", objectiveId: "obj_purpose", label: "Purpose Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["feeling lost", "searching for meaning", "found my direction", "living my purpose"] },

  // =========================================================================
  // Vices -> Quit Porn (obj_nofap). Streak metrics are cumulative (start at 0),
  // manual (no linked_metric — no tracking backend for these).
  // =========================================================================
  { id: "t_nofap_streak", objectiveId: "obj_nofap", label: "Days Porn-Free", primitive: "target", role: "metric", unit: "days", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 90, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_nofap_checkin", objectiveId: "obj_nofap", label: "Daily Check-in", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 5, durationWeeks: 4 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_nofap_stages", objectiveId: "obj_nofap", label: "Reboot Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["white-knuckling the urges", "urges getting weaker", "weeks clean", "truly free"] },
  { id: "t_nofap_urge", objectiveId: "obj_nofap", label: "Urge Control", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["urges feel overwhelming", "riding them out", "urges pass quickly", "barely tempted"] },
  { id: "t_nofap_replace", objectiveId: "obj_nofap", label: "Replacement Habit", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },

  // =========================================================================
  // Vices -> Get Sober (obj_sober)
  // =========================================================================
  { id: "t_sober_streak", objectiveId: "obj_sober", label: "Alcohol-Free Days", primitive: "target", role: "metric", unit: "days", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 90, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_sober_checkin", objectiveId: "obj_sober", label: "Stay Dry Today", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_sober_stages", objectiveId: "obj_sober", label: "Sobriety Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["cutting back", "first dry weeks", "dry months", "sober for good"] },
  { id: "t_sober_money", objectiveId: "obj_sober", label: "Money Saved", primitive: "volume", role: "metric", unit: "$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 2000, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_sober_trigger", objectiveId: "obj_sober", label: "Trigger Control", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["triggers blindside me", "spotting my triggers", "planning around them", "triggers lose their grip"] },

  // =========================================================================
  // Vices -> Drink Less (obj_drinkless) — moderation path
  // =========================================================================
  { id: "t_drink_limit", objectiveId: "obj_drinkless", label: "Days Within Limit", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 4, durationWeeks: 4 }, { frequencyPerWeek: 6, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_drink_dry_days", objectiveId: "obj_drinkless", label: "Alcohol-Free Days", primitive: "target", role: "metric", unit: "days", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 60, steps: 7, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_drink_stages", objectiveId: "obj_drinkless", label: "Moderation Path", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["drinking too much", "cutting back", "steady moderation", "effortless control"] },
  { id: "t_drink_count", objectiveId: "obj_drinkless", label: "Weekly Drink Count", primitive: "target", role: "metric", unit: "drinks", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 14, target: 4, steps: 7, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'pace' },
  { id: "t_drink_money", objectiveId: "obj_drinkless", label: "Money Saved", primitive: "volume", role: "metric", unit: "$", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 1000, steps: 7, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },

  // =========================================================================
  // Vices -> Reclaim Attention (obj_screen)
  // =========================================================================
  { id: "t_screen_limit", objectiveId: "obj_screen", label: "Days Under Screen Limit", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 4, durationWeeks: 4 }, { frequencyPerWeek: 6, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_no_socials", objectiveId: "obj_screen", label: "Social-Media-Free Days", primitive: "target", role: "metric", unit: "days", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 60, steps: 7, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_screen_stages", objectiveId: "obj_screen", label: "Attention Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["doomscrolling", "catching myself", "disciplined use", "intentional by default"] },
  { id: "t_screen_hours", objectiveId: "obj_screen", label: "Daily Screen Time", primitive: "target", role: "metric", unit: "hours", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 6, target: 2, steps: 6, curveTension: 0 }, rampSteps: null, stageSteps: null, metricKind: 'pace' },
  { id: "t_focus_sessions", objectiveId: "obj_screen", label: "Focus Sessions", primitive: "volume", role: "driver", unit: "/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },

  // =========================================================================
  // Vices -> Kill the Junk (obj_clean_diet)
  // =========================================================================
  { id: "t_junkfree_days", objectiveId: "obj_clean_diet", label: "No-Junk Days", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_sugarfree_streak", objectiveId: "obj_clean_diet", label: "Sugar-Free Streak", primitive: "target", role: "metric", unit: "days", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 60, steps: 7, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_smoke_free", objectiveId: "obj_clean_diet", label: "Smoke-Free Days", primitive: "target", role: "metric", unit: "days", defaultEnabled: false, sharedDriverId: null, milestoneConfig: { start: 0, target: 90, steps: 8, curveTension: 1.2 }, rampSteps: null, stageSteps: null, metricKind: 'cumulative' },
  { id: "t_diet_stages", objectiveId: "obj_clean_diet", label: "Clean Living Journey", primitive: "stage", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["constant cravings", "cutting back", "mostly clean", "clean by default"] },
  { id: "t_homecooked", objectiveId: "obj_clean_diet", label: "Home-Cooked Meals", primitive: "habit", role: "driver", unit: "days/week", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }, { frequencyPerWeek: 7, durationWeeks: 24 }], stageSteps: null },
  { id: "t_craving_skill", objectiveId: "obj_clean_diet", label: "Craving Control", primitive: "skill", role: "metric", unit: "", defaultEnabled: false, sharedDriverId: null, milestoneConfig: null, rampSteps: null, stageSteps: ["cravings run the show", "pausing before I give in", "cravings fade fast", "barely notice them"] },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a FrameworkTarget view of a user-added custom goal (a simple number
 * target). Its objectiveId is the synthetic `custom_obj:<pillar>` so it groups
 * under its pillar; value/start/date live in the target's override.
 */
export function makeCustomFrameworkTarget(
  id: string, pillarId: string, unit: string, label: string,
): FrameworkTarget {
  return {
    id, objectiveId: `custom_obj:${pillarId}`, label,
    primitive: "target", role: "metric", unit, defaultEnabled: true,
    sharedDriverId: null,
    milestoneConfig: { start: 0, target: 10, steps: 7, curveTension: 0 },
    rampSteps: null, stageSteps: null,
  }
}

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

export type AchievementTier = { tier: "Bronze" | "Silver" | "Gold"; value: number }

/**
 * The badge ladder a metric unlocks, derived from the Beginner / Intermediate /
 * Advanced values a template assigns the target across its levels (mapped to
 * Bronze / Silver / Gold). Returns null for targets a template never tiers
 * (drivers, stages, fixed metrics) — they have no per-level threshold. Uses the
 * first template that tiers this target, so it's a stable, representative ladder.
 */
export function getAchievementTiers(targetId: string): AchievementTier[] | null {
  const TIER_LABELS = ["Bronze", "Silver", "Gold"] as const
  for (const tmpl of TEMPLATES) {
    const tiers: AchievementTier[] = []
    tmpl.levels.forEach((lvl, i) => {
      const value = lvl.targetValues[targetId]
      const tier = TIER_LABELS[i]
      if (typeof value === "number" && tier) tiers.push({ tier, value })
    })
    if (tiers.length >= 2) return tiers
  }
  return null
}
