/**
 * Types for the Goals slice
 */

import type { LucideIcon } from "lucide-react"
import type { GoalPeriod, LinkedMetric } from "@/src/db/goalTypes"

// Re-export types from DB layer for convenience
export type {
  GoalType,
  GoalPeriod,
  GoalTrackingType,
  GoalNature,
  GoalDisplayCategory,
  LinkedMetric,
  UserGoalRow,
  UserGoalInsert,
  UserGoalUpdate,
  GoalWithProgress,
  GoalTreeNode,
  GoalPhase,
} from "@/src/db/goalTypes"

// Re-export const arrays, Zod schemas, and type guards from goalEnums
export {
  GOAL_TYPES, GOAL_DISPLAY_CATEGORIES, LINKED_METRICS, GOAL_NATURES,
  GOAL_PERIODS, GOAL_TRACKING_TYPES, GOAL_PHASES,
  GoalTypeSchema, GoalDisplayCategorySchema, LinkedMetricSchema,
  GoalNatureSchema, GoalPeriodSchema, GoalTrackingTypeSchema, GoalPhaseSchema,
  isKnownDisplayCategory, isKnownGoalType, isKnownGoalPhase,
  isKnownLinkedMetric, isKnownGoalPeriod, isKnownTrackingType, isKnownGoalNature,
} from "@/src/db/goalEnums"

/**
 * A user-added goal that isn't part of the static framework. Its value/date/
 * milestone state lives in `targetOverrides[id]`; its title lives in `labels[id]`.
 */
export interface CustomTarget {
  id: string
  pillarId: string
  unit: string
  /** Set when the goal sits under a user-written CARD (see CustomCard); unset = a
   * loose goal directly under the area. Grouping is a planning aid — on save both
   * kinds land under the pillar's "Your own goals" container. */
  cardId?: string
}

/** A routine card the user wrote themselves, holding their own goals. */
export interface CustomCard {
  id: string
  pillarId: string
}

/**
 * Serializable state of the new-goals flow (Focus → Goals → Summary). This is
 * what the flow POSTs to persist and what GET returns to rehydrate it.
 *
 * `labels` holds user-renamed titles keyed by framework id (pillar / objective /
 * target / custom-target). `customTargets` holds user-added goals.
 */
export interface NewGoalsFlowState {
  pillars: string[]
  objectives: string[]
  targetOverrides: Record<string, import("./data/newGoalFramework").TargetOverride>
  labels?: Record<string, string>
  customTargets?: CustomTarget[]
}

/**
 * Predefined life area IDs
 */
export type LifeAreaId =
  | "daygame"
  | "health_fitness"
  | "career_business"
  | "personal_growth"
  | "vices_elimination"
  | "custom"
  | (string & {})

/**
 * Goal suggestion template for a life area
 */
export interface GoalSuggestion {
  title: string
  defaultTarget: number
  defaultPeriod: GoalPeriod
  linkedMetric?: LinkedMetric
  featured?: boolean
}

/**
 * Configuration for a life area — colors, icon, suggestions
 */
export interface LifeAreaConfig {
  id: string
  name: string
  icon: LucideIcon
  hex: string
  color: string
  bgColor: string
  borderColor: string
  progressColor: string
  suggestions: GoalSuggestion[]
  sortOrder: number
}

/**
 * Input mode for goal progress entry
 */
export type InputMode = "boolean" | "buttons" | "direct-entry"

/**
 * Celebration tier based on goal time horizon
 */
export type CelebrationTier = "subtle" | "toast" | "confetti-small" | "confetti-full" | "confetti-epic"

/**
 * View modes for the Goals Hub
 */
export type GoalViewMode = "today" | "hierarchy" | "tree" | "tree-of-life" | "orrery" | "daily" | "strategic" | "standard" | "time-horizon"

/**
 * Filter state for goals list/views
 */
export interface GoalFilterState {
  lifeArea: string | null
  timeHorizon: string | null
  status: string | null
  search: string
}

// ============================================================================
// Curve Theme Types
// ============================================================================

/**
 * Visual theme for the milestone curve editor.
 */
export type CurveThemeId = "zen" | "cyberpunk" | "orrery"

// ============================================================================
// Milestone Ladder & Curve Types
// ============================================================================

/**
 * Configuration for generating a milestone ladder.
 * The curve maps step indices to values between start and target.
 */
export interface MilestoneLadderConfig {
  start: number
  target: number
  steps: number
  curveTension: number
  controlPoints?: CurveControlPoint[]
  /**
   * Manually fixed milestones the user has edited. The generator pins these
   * exact values and flows the *unpinned* milestones in the gaps between them
   * ("freeze edited, flow the rest"). Pins on step 0 / last step are ignored —
   * those endpoints are `start` / `target`.
   */
  pins?: MilestonePin[]
}

/**
 * A user-pinned milestone: a fixed value at a specific step the auto-curve
 * must honour instead of recomputing.
 */
export interface MilestonePin {
  step: number
  value: number
}

/**
 * A draggable control point on the curve editor.
 * Coordinates are normalized 0–1 (x = position along steps, y = position along value range).
 */
export interface CurveControlPoint {
  x: number
  y: number
}

/**
 * A single generated milestone in the ladder.
 */
export interface GeneratedMilestone {
  step: number
  rawValue: number
  value: number
}

// ============================================================================
// Habit Ramp & Date Derivation Types
// ============================================================================

/**
 * One step in a habit ramp schedule.
 * E.g., "Do 10 approaches/week for 4 weeks, then 15/week for 4 weeks, ..."
 */
export interface HabitRampStep {
  frequencyPerWeek: number
  durationWeeks: number
}

/**
 * A milestone with its estimated completion date derived from a habit ramp.
 */
export interface RampMilestoneDate {
  milestoneValue: number
  estimatedDate: Date
  weekNumber: number
  cumulativeAtDate: number
}

// ============================================================================
// Goal Graph & Template Types
// ============================================================================

/**
 * Goal graph level in the hierarchy.
 * 0 = life dream, 1 = major life goal, 2 = transformation/mastery, 3 = specific skill/metric
 */
export type GoalGraphLevel = 0 | 1 | 2 | 3

/**
 * Goal template type — milestone_ladder or habit_ramp.
 */
export type GoalTemplateType = "milestone_ladder" | "habit_ramp"

/**
 * Priority classification for onboarding — controls which goals are auto-enabled.
 * core: first 3-4 foundational goals per area (auto-enabled)
 * progressive: intermediate goals (shown but off by default)
 * niche: specialized goals (collapsed/hidden until expanded)
 */
export type GoalPriority = "core" | "progressive" | "niche"

/**
 * A goal template in the static goal graph catalog.
 * Used by "Just get me started" to generate user goals from a template.
 */
export interface GoalTemplate {
  id: string
  title: string
  level: GoalGraphLevel
  nature: "input" | "outcome"
  lifeArea: string
  displayCategory: GoalDisplayCategory | null
  templateType: GoalTemplateType | null
  defaultMilestoneConfig: MilestoneLadderConfig | null
  defaultRampSteps: HabitRampStep[] | null
  linkedMetric: LinkedMetric
  priority: GoalPriority
  requiresOptIn: boolean
  graduation_criteria: string | null
  blindSpotTool: boolean
}

/**
 * An edge in the goal graph: parent fans out into children.
 */
export interface GoalGraphEdge {
  parentId: string
  childId: string
}

/**
 * A section in the hierarchy display — one L1 goal with its achievements and L3 categories.
 */
export interface HierarchySection {
  l1Goal: GoalWithProgress
  achievements: GoalWithProgress[]
  categories: Partial<Record<GoalDisplayCategory, GoalWithProgress[]>>
  unknownCategories: Record<string, GoalWithProgress[]>
  uncategorized: GoalWithProgress[]
}

/**
 * State for a single goal in the fan-out preview.
 * Tracks whether the user wants this goal and any target overrides.
 */
export interface PreviewGoalState {
  enabled: boolean
  targetValue: number
  milestoneConfig?: MilestoneLadderConfig
}

// ============================================================================
// Badge Engine Types
// ============================================================================

/**
 * Badge tier levels, from unearned to mythic.
 * 6 earned tiers: iron → bronze → silver → gold → diamond → mythic.
 */
export type BadgeTier = "none" | "iron" | "bronze" | "silver" | "gold" | "diamond" | "mythic"

/**
 * Status of a single L2 badge, computed from threshold requirements.
 */
export interface BadgeStatus {
  badgeId: string
  title: string
  tierName: string
  progress: number
  tier: BadgeTier
  unlocked: boolean
}

/**
 * A single threshold requirement for a badge tier.
 * The user's cumulative count for that L3 must reach `value`.
 */
export interface BadgeTierRequirement {
  templateId: string
  value: number
}

/**
 * Requirements for one tier of a badge.
 * ALL requirements must be met to unlock this tier.
 */
export interface BadgeTierConfig {
  tier: BadgeTier
  name: string
  requirements: BadgeTierRequirement[]
}

/**
 * Full badge configuration with tiered threshold requirements.
 * Tiers ordered bronze → diamond; engine checks highest first.
 */
export interface BadgeConfig {
  l2Id: string
  tiers: BadgeTierConfig[]
}

// ============================================================================
// Time-of-Day Types (Phase 6.5)
// ============================================================================

export type TimeOfDayBracket = "morning" | "afternoon" | "evening" | "night"

export interface WeeklyRhythm {
  activeDays: number
  peakBracket: TimeOfDayBracket | null
  bracketCounts: Record<TimeOfDayBracket, number>
}

// ============================================================================
// Pacing Types (Phase 6.7)
// ============================================================================

export type PacingStatus = "ahead" | "on-pace" | "behind"

export interface PacingInfo {
  actualRate: number
  projectedRate: number
  pacingRatio: number
  status: PacingStatus
  daysActive: number
}

// ============================================================================
// Tier Upgrade Types (Phase 6.8)
// ============================================================================

export interface TierUpgradeEvent {
  badgeId: string
  badgeTitle: string
  previousTier: BadgeTier
  newTier: BadgeTier
}

// ============================================================================
// Milestone Celebration Types (Phase 6.3)
// ============================================================================

export interface MilestoneCelebrationData {
  milestoneNumber: number
  totalMilestones: number
  ladderPosition: number
  currentValue: number
  milestoneValue: number
  projectedNext: string | null
  badgeTierUpgrade: TierUpgradeEvent | null
}

// ============================================================================
// Weekly Review Types (Phase 6.9)
// ============================================================================

export interface WeeklyGoalMomentum {
  goalId: string
  title: string
  completionRate: number
  trend: "improving" | "stable" | "declining"
  goalNature: "input" | "outcome" | null
}

export interface PhaseTransitionEvent {
  goalId: string
  goalTitle: string
  previousPhase: GoalPhase | null
  newPhase: GoalPhase
}

export interface WeeklyReviewData {
  overallMomentumScore: number
  goalsCompleted: number
  goalsTotal: number
  bestDay: string | null
  worstDay: string | null
  milestonesHit: number
  goalMomentum: WeeklyGoalMomentum[]
  tierUpgrades: TierUpgradeEvent[]
  phaseTransitions: PhaseTransitionEvent[]
}

// ============================================================================
// Tree of Life Types
// ============================================================================

/**
 * Data returned by the tree-of-life endpoint — combines goals + values
 */
export interface TreeOfLifeData {
  tree: GoalTreeNode[]
  goals: GoalWithProgress[]
  roots: CoreValueRoot[] | null
  aspirational: string[] | null
  soilDensity: number
  alignmentMap: Record<string, string[]>
}

/**
 * A core value displayed as a tree root
 */
export interface CoreValueRoot {
  id: string
  rank: number
}

/**
 * Positioned node for the canvas tree layout
 */
export interface TreeLayoutNode {
  id: string
  type: "trunk" | "branch" | "leaf" | "root" | "crown"
  x: number
  y: number
  width: number
  height: number
  color: string
  label: string
  progress: number
  goalLevel: number | null
  lifeArea: string
  parentId: string | null
  children: string[]
  isComplete: boolean
  streak: number
  phase: string | null
  alignedValues: string[]
}

/**
 * Root node in the layout (core values)
 */
export interface TreeLayoutRoot {
  id: string
  valueId: string
  rank: number
  x: number
  y: number
  thickness: number
  connectedBranches: string[]
}

/**
 * Full layout output from the layout engine
 */
export interface TreeLayout {
  nodes: TreeLayoutNode[]
  roots: TreeLayoutRoot[]
  bounds: { width: number; height: number }
  groundY: number
}

// ============================================================================
// Cross-Area Connection Types (Phase 3.4)
// ============================================================================

export type CrossAreaRelationship = "supports" | "reinforces" | "enables"

export interface CrossAreaEdge {
  sourceId: string
  targetId: string
  weight: number
  relationship: CrossAreaRelationship
}

// ============================================================================
// Goal Setup Wizard Types (Phase 4)
// ============================================================================

export type DaygamePath = "fto" | "abundance"

export interface SetupCustomGoal {
  id: string
  title: string
  categoryId: string
  target: number
  period: string
}

export interface SetupCustomCategory {
  id: string
  name: string
}

export interface GoalSetupSelections {
  path: DaygamePath | null
  selectedAreas: Set<string>
  selectedL1s: Set<string>
  selectedGoalIds: Set<string>
  targets: Record<string, number>
  curveConfigs: Record<string, MilestoneLadderConfig>
  rampConfigs: Record<string, HabitRampStep[]>
  rampEnabled: Set<string>
  customGoals: SetupCustomGoal[]
  customCategories: SetupCustomCategory[]
  targetDates: Record<string, string>
  goalDates: Record<string, string>
}

// ============================================================================
// Multi-Period Stats (Rollup Layer)
// ============================================================================

export interface GoalPeriodStats {
  weekCompleted: number
  weekTotal: number
  monthCompleted: number
  monthTotal: number
  yearCompleted: number
  yearTotal: number
  monthDelta: number | null
  yearDelta: number | null
}

// ============================================================================
// Will Gate & Bottleneck Types (Diagnostic Layer)
// ============================================================================

export interface WillGateResult {
  gateTriggered: boolean
  ratio: number
  message: string
}

export interface BottleneckResult {
  willGate: WillGateResult | null
  bottleneckGoalId: string | null
  description: string
  recommendedFocus: string
}

// ---------------------------------------------------------------------------
// Vision → plan (test page /test/vision-plan) — see docs/plans/vision-to-plan-test-page.md
// ---------------------------------------------------------------------------

/** A clause of the user's vision text, offsets into the original string. */
export interface VisionSpan {
  text: string
  start: number
  end: number
}

/**
 * One distinct thing the user's vision statement is asking for — a clause (or
 * merged adjacent clauses) routed to a life area, optionally with the framework
 * objective it matched. Derived deterministically from browser embeddings.
 */
export interface VisionIntent {
  id: string
  /** The user's own words for this intent (merged clauses joined with " · "). */
  text: string
  pillarId: string
  pillarLabel: string
  pillarColor: string
  /** Best-matching framework objective within the pillar, if strong enough. */
  objectiveId: string | null
  objectiveLabel: string | null
  /** Cosine score of the winning taxonomy item (relative signal, not a %). */
  confidence: number
  /** Source clauses, for highlighting the vision text. */
  spans: VisionSpan[]
}

export interface VisionIntentResult {
  intents: VisionIntent[]
  /** Clauses that didn't land on any life area (filler or unmatched). */
  unmatched: VisionSpan[]
}

/** One ordered step of the morning ritual (PLM layer) — checklist item, not a goal habit. */
export interface VisionRitualItem {
  id: string
  title: string
  /** Rough duration — the preset compositions sum to ~15/30/60 minutes. */
  minutes: number
}

/** The user's assembled morning ritual — an ORDERED daily checklist, tracked
 * separately from goal habits (it never enters the balancer). */
export interface VisionRitual {
  items: VisionRitualItem[]
  /** Which preset seeded it (15/30/60) — null once assembled by hand. */
  preset: 15 | 30 | 60 | null
  /** v10 — ISO date the ritual was (re)designed: drives the 30-day install
   * counter and the ~30-day rotation nudge ("menu, not checklist"). */
  builtAt?: string
  /** v10 — the ritual MATRIX beyond mornings: weekly per-area rituals
   * ("Money Tuesday", relationship journal), due on their weekday. */
  weekly?: VisionWeeklyRitual[]
}

/** One weekly-cadence ritual tied to a life area, due on a fixed weekday. */
export interface VisionWeeklyRitual {
  id: string
  title: string
  /** Blueprint area it maintains, or null for whole-life rituals. */
  areaId: string | null
  /** 0=Mon … 6=Sun. */
  weekday: number
  /** v11 — fires every OTHER week (his relationship journal is bi-weekly). */
  everyOtherWeek?: boolean
  /** v16 — monthly cadence: due on this day of month (1-28); weekday ignored. */
  monthlyDay?: number
}

/** A free-text item the user added to one day's plan (RPM could-do list). */
export interface VisionAdhocItem {
  id: string
  title: string
  done: boolean
}

/** One day's RPM plan: starred "must items" (≤5) + ad-hoc could-do items. */
export interface VisionDayPlan {
  /** Habit/task/adhoc ids the user starred as today's musts (80/20). Max 5. */
  mustIds: string[]
  adhoc: VisionAdhocItem[]
  /** v9 RPM anatomy — pillarId → TODAY'S fresh reason for that area block
   * ("write 3 fresh reasons daily — re-deriving them IS the conditioning"). */
  blockReasons?: Record<string, string>
}

/** One committed outcome for next week, tied to a Blueprint area, with its why
 * (Stefan's weekly ritual: "what are my outcomes... and why do I want that"). */
export interface VisionWeeklyOutcome {
  areaId: string
  outcome: string
  why: string
  /** v10 — the weekday (0=Mon…6=Sun) it's scheduled into; an outcome without
   * a slot is a wish ("what doesn't get scheduled doesn't happen"). */
  weekday?: number
}

/** One Weekly Evaluation Ritual (PLM): rate every life area, note, pick a focus. */
export interface VisionWeeklyReview {
  /** ISO date of the reviewed week's first day (startDate-anchored weeks). */
  weekStart: string
  /** pillarId → 1-10 self-rating. */
  areaRatings: Record<string, number>
  note: string
  /** Life area to lean into next week, or null. */
  focusPillarId: string | null
  /** M4 reflection prompts — "whatever gets rewarded gets repeated". */
  magicMoment?: string
  accomplishment?: string
  lesson?: string
  /** v11 — the fractal review's middle question: the week's biggest challenge
   * and its ROOT cause (95% solution, 5% problem). */
  challenge?: string
  /** Next week's committed outcomes (max 3), each with its why. */
  outcomes?: VisionWeeklyOutcome[]
  /** v10 — capture-everything: head emptied at review time, each item tagged
   * to the area it belongs to (RPM Capture→Categorize). */
  captures?: Array<{ text: string; areaId: string | null }>
}

/**
 * The per-area layer of the Life Plan (PLM v3) — Stefan gives EVERY area a
 * compelling custom name ("Physical Power — World Class Health and Fitness"),
 * its own purpose, and its own identity/role, on top of the area vision
 * ("your 10", stored in VisionPlanState.yourTens).
 */
export interface VisionAreaPlan {
  /** Compelling custom name for the area — language that drives you. */
  name?: string
  /** Why this area matters to you (the area-level why). */
  purpose?: string
  /** Who you are in this area ("I'm an athlete", "I'm a world-class coach"). */
  identity?: string
  /** v10 — the maintenance floor while OTHER areas hold focus (consented
   * drift has a contract: "health 45-60 min/day" even in a money season). */
  maintenance?: string
  /** v17 — "why work on this area NOW?" (the area's why-work, distinct from
   * `purpose` which is why the area matters at all). */
  whyWork?: string
  /** v17 — the soft layer AUTHORED INSIDE this area. The record key is the
   * provenance, so the global view is a pure roll-up (softLayerRollup) and
   * life-wide-only entries stay in VisionPlanState's own lists. */
  values?: string[]
  affirmations?: string[]
  incantations?: string[]
  rules?: string[]
}

/** The Driving Force (PLM M1) — created after the vision, re-read daily/weekly:
 * one non-negotiable master purpose + reason words + "I am..." identity lines. */
export interface VisionDrivingForce {
  /** The single overarching life-purpose statement (non-negotiable). */
  purpose: string
  /** Rapid-fire reason words ("the reasons are the fuel"). */
  reasons: string[]
  /** Identity statements ("Who am I committed to being?"), each "I am..." */
  identity: string[]
  /** v6 — one-sentence mission statement (VAK template, BE + DO/GIVE, energy test). */
  mission?: string
  /** v6 — Code of Conduct: standards for how you show up ("to be fun, loving, disciplined…"). */
  conduct?: string[]
  /** v9 — the Primary Question: the habitual question rewritten so its
   * presupposition empowers (his, PPlaK8y4PzA: "How can I appreciate and
   * enjoy my life even more, while feeling even more fully alive and growing
   * and making a difference?"). */
  primaryQuestion?: string
}

/** Monthly-report verdict per goal — Stefan's observed status taxonomy. */
export type VisionGoalVerdict =
  | "achieved"
  | "on-track"
  | "over-achieved"
  | "likely-miss"
  | "not-started"
  | "modified"
  | "cancelled"
  | "rescheduled"

/** A confirmed verdict + its reason ("every non-achieved status carries a reason"). */
export interface VisionVerdictEntry {
  verdict: VisionGoalVerdict
  reason: string
  /** v9 — the prescriptive fix committed for a miss: name it as a SYSTEM
   * ("failures → owned reason → fix that becomes a named system"). */
  fix?: string
}

/** Evening reflection (Five Minute Journal PM + Productivity Planner close). */
export interface VisionEveningReflection {
  /** "Three amazing things that happened today" (free text). */
  amazing: string
  /** "How could I have made today better?" */
  better: string
  /** Productivity Planner-style 1-10 end-of-day self-score. */
  dayScore?: number
  /** v11 — the NIGHTLY magic-moment jar: one line, every evening (the jar is
   * a daily ritual in his system, not a weekly one). */
  magicMoment?: string
}

/** Tracking history for the vision-plan sandbox (M6) — what the user checked off. */
export interface VisionProgress {
  /** ISO date (YYYY-MM-DD) tracking started — day 0 of the balanced schedule. */
  startDate: string
  /** habitId → ISO dates it was completed on. */
  completions: Record<string, string[]>
  /** Task ids checked off. */
  tasksDone: string[]
  /** ISO dates the user read their vision (daily vision review, PLM). */
  visionReviews?: string[]
  /** ISO date → ritual item ids completed that day. */
  ritualCompletions?: Record<string, string[]>
  /** ISO date → that day's RPM plan (musts + ad-hoc items). */
  dayPlans?: Record<string, VisionDayPlan>
  /** Completed Weekly Evaluation Rituals, one per weekStart. */
  weeklyReviews?: VisionWeeklyReview[]
  /** ISO date → evening reflection (M5). */
  eveningReflections?: Record<string, VisionEveningReflection>
  /** "YYYY-MM" → goalId → confirmed report verdict (M6). */
  reportVerdicts?: Record<string, Record<string, VisionVerdictEntry>>
  /** v9 — numeric RESULT logging for milestone goals: goalId → dated readings
   * (his reports show GOAL / RESULT / PROGRESS with exact numbers). */
  measureLogs?: Record<string, VisionMeasureLog[]>
}

/** One dated numeric reading of a milestone goal's measure. */
export interface VisionMeasureLog {
  date: string
  value: number
}

/**
 * Everything the vision-plan sandbox persists (M5) — one lossless state object
 * in localStorage; the balanced schedule and track rows are always DERIVED from
 * it, never stored, so nothing can drift.
 */
export interface VisionPlanState {
  vision: string
  intents: VisionIntent[]
  goals: VisionGoalDraft[]
  /** Goal ids in priority order (first = highest). */
  priorityIds: string[]
  dailyBudget: number
  /** True once the user confirmed the plan and tracking started. */
  confirmed: boolean
  /** Present once tracking has started (set at confirm). */
  progress?: VisionProgress
  /** Pillar ids in the user's drag order (first = highest priority area). */
  areaOrder?: string[]
  /** Pillar ids the user has toggled OFF — their goals are hidden, not deleted. */
  deselectedAreas?: string[]
  /** The assembled morning ritual (PLM layer) — absent until the user builds one. */
  ritual?: VisionRitual
  /** M0 — ISO date the user took the Commit to Mastery pledge. */
  committedAt?: string
  /** M0 — ranked value hierarchy, first = most important (elicited BEFORE vision). */
  values?: string[]
  /** v5 — ranked AWAY-FROM values (emotional states avoided; #1 shapes decisions most). */
  awayValues?: string[]
  /** M1 — master purpose + reasons + identity, re-read daily. */
  drivingForce?: VisionDrivingForce
  /** M2 — Blueprint area id → what YOUR 10 looks like (the wheel's reference). */
  yourTens?: Record<string, string>
  /** v3 — Blueprint area id → the area's own name/purpose/identity (Life Plan). */
  areaPlans?: Record<string, VisionAreaPlan>
  /** v4 — the season's 1-3 domino areas ("which area, conquered, lifts all the others?"). */
  focusAreaIds?: string[]
  /** v6 — the user's own incantation cards (added on top of the canon deck). */
  incantations?: string[]
  /** v8 — 1-3yr wants circled out of the vision brainstorm, waiting to be
   * qualified into goals (his workshop: brainstorm → circle → qualify). */
  goalInbox?: string[]
  /** v8 — the name spoken in the Manifesto ("My name is ___ and I am the
   * master of my life"). */
  manifestoName?: string
  /** v9 — the user's OWN credo lines, added on top of his skeleton (his
   * meta-pattern: mine is the worked example — design your own). */
  manifestoLines?: string[]
  /** v10 — habit-breaking letters (thank-you + goodbye), one pair per habit. */
  letters?: Array<{ habit: string; thankYou: string; goodbye: string; date: string }>
  /** v10 — 30-day one-day-at-a-time counters; a slip restarts startDate. */
  counters?: Array<{ label: string; startDate: string }>
  /** v13 — engineered value-rules ("I feel X anytime I…" / "I experience X
   * only if I were to consistently…"), read daily; Robbins/DWD lineage. */
  valueRules?: string[]
  /** v14 — user-added rooms on the vision wheel, beyond the canonical 12
   * (renames of canonical rooms live in areaPlans[id].name). */
  customAreas?: Array<{ id: string; label: string; color: string }>
  /** v15 — wants typed into wheel rooms, first-class: each carries its room
   * (area authoritative) and feeds goal drafting directly — they are NOT
   * flattened into the vision prose. */
  wheelWants?: Array<{ id: string; areaId: string; text: string }>
  /** M1 room journey — today's self-rating per room (0-10), captured in the
   * room's "locate yourself" beat before tracking starts; the first weekly
   * evaluation measures against it. */
  baselineRatings?: Record<string, number>
  /** v17 — area id → ISO date the CURRENT baselineRatings value was set.
   * Re-rating during create overwrites both: pre-commit is a design session,
   * not a tracking log — the history that matters is progress.weeklyReviews. */
  baselineRatedAt?: Record<string, string>
  /** v17 — area id → what YOUR 0 looks like: the opposite pole of your 10, so
   * a rating measures against both ends instead of against nothing. */
  yourZeros?: Record<string, string>
  /** v17 — life-wide affirmations (the global peer of values / incantations /
   * valueRules; per-area ones live in areaPlans[id].affirmations). */
  affirmations?: string[]
  /** v17 — how deep the user is going in each area this pass. Absent = "later".
   * Commitment stays 12/12 (the manifesto); attention scopes to a few. */
  areaScope?: Record<string, "deep" | "sketched" | "later">
}

/** One pickable habit template in the routine library (M10). */
export interface RoutineTemplate {
  id: string
  title: string
  /** Sensible default frequency — editable like any habit once added. */
  daysPerWeek: number
}

/**
 * A category of common activities (morning routine, workouts, …) the vision
 * may not have surfaced. Picks fold into ONE goal per category, owned by the
 * category's primary life area (first pillarId).
 */
export interface RoutineCategory {
  id: string
  label: string
  /** Life areas this category advances — first = primary (owns the goal). */
  pillarIds: string[]
  /** The created goal's "why". */
  why: string
  items: RoutineTemplate[]
}

/** Per-goal rollup at a point in time (M6). */
export interface VisionGoalRollup {
  goalId: string
  /** Habit instances completed to date / expected to date. */
  done: number
  expected: number
  /** done/expected capped at 1 (1 when nothing expected yet). */
  adherence: number
  tasksDone: number
  tasksTotal: number
  /** 0-100 blended progress. */
  percent: number
  pace: PacingStatus
}

/** Options for the cross-goal balancer (M4). */
export interface BalanceOpts {
  /** Max habit-instances per day at steady state. Default 4. */
  dailyBudget?: number
  /** Weeks over which capacity ramps up linearly (Fabulous dosing). Default 4. */
  rampWeeks?: number
}

/** A habit placed on the calendar by the balancer. */
export interface BalancedHabit {
  habitId: string
  goalId: string
  title: string
  pillarColor: string
  daysPerWeek: number
  /** 1-based week the habit activates — null means it did NOT fit the budget
   * (surfaced as overflow, never silently dropped). */
  startWeek: number | null
  /** Leveled weekday slots (0=Mon … 6=Sun), length === daysPerWeek when scheduled. */
  weekdays: number[]
}

/** A one-time task placed on the calendar (goal activation offset applied). */
export interface BalancedTask {
  taskId: string
  goalId: string
  title: string
  /** Absolute day offset from plan start. */
  dueDay: number
  /** 1-based week containing dueDay. */
  week: number
}

export interface BalancedWeek {
  week: number
  /** Habit-instances per week once this week's activations are live. */
  load: number
  /** Effective capacity for this week (ramped). */
  cap: number
  /** Habits that come online this week. */
  startingHabitIds: string[]
}

/** The balanced, dosed schedule across ALL goals — the market-gap piece. */
export interface BalancedPlan {
  habits: BalancedHabit[]
  tasks: BalancedTask[]
  weeks: BalancedWeek[]
  overflowHabitIds: string[]
  steadyLoad: number
  weeklyCap: number
  dailyBudget: number
  /** Steady-state instances per weekday after leveling (0=Mon … 6=Sun). */
  dayLoads: number[]
}

/** A recurring behaviour inside a vision goal — always scheduled (Dreamfora lesson). */
export interface VisionHabit {
  id: string
  title: string
  /** Target frequency, 1-7 days per week. */
  daysPerWeek: number
  /** Provenance: the curated framework target this habit mirrors, or null/absent
   * when it's a pure AI suggestion (badged as such in the UI). */
  sourceTargetId?: string | null
  /** M11: named training days (Push / Pull / Chest Day A …) this habit cycles
   * through — slot k of the week runs days[k % days.length]. Null/absent = a
   * plain habit. */
  routine?: HabitRoutine | null
}

/** One named day inside a habit's routine (M11). */
export interface RoutineDay {
  id: string
  name: string
}

/** A habit's designed day rotation — order matters (slot 1 of the week = first day). */
export interface HabitRoutine {
  days: RoutineDay[]
}

/** A pickable workout split template (M11) — pre-named days + a sensible frequency. */
export interface WorkoutSplit {
  id: string
  label: string
  /** Day names in cycle order. */
  days: string[]
  /** Default daysPerWeek applied on pick (clamped 1-7). */
  recommendedPerWeek: number
}

/** A one-time action inside a vision goal. */
export interface VisionTask {
  id: string
  title: string
  /** Due N days after the plan starts. */
  dueOffsetDays: number
}

/** The measurable ladder for a milestone_ladder goal — maps 1:1 onto MilestoneLadderConfig. */
export interface VisionMeasure {
  unit: string
  start: number
  target: number
  steps: number
}

/**
 * v17 — vision goals have a third shape on top of the two template types: an
 * ACHIEVEMENT is binary (you did it or you didn't) and carries no number — a
 * first muscle-up, a driver's licence, quitting smoking. Its rungs are named
 * checkpoints stored as `tasks`, so it needs no new progress math: goalRollup,
 * balancePlan and expectedToDate already run on habits + tasks, not on type.
 *
 * Deliberately NOT folded into GoalTemplateType — that type is shared with
 * goalsService / treeGenerationService, which have no achievement concept.
 */
export type VisionGoalType = GoalTemplateType | "achievement"

/**
 * A concrete goal drafted by the LLM from the vision's intents (M2/M3) —
 * framework-grounded: pillar always real, objective from the framework menu or
 * null for a custom goal. `why` is the Lifetick-style motivation, editable.
 * Decomposition (M3): habits + tasks always; measure for milestone_ladder,
 * rampSteps for habit_ramp.
 */
export interface VisionGoalDraft {
  id: string
  title: string
  pillarId: string
  pillarLabel: string
  pillarColor: string
  objectiveId: string | null
  objectiveLabel: string | null
  type: VisionGoalType
  why: string
  /** Which vision intents this goal came from (LLM may merge or re-route them). */
  sourceIntentIds: string[]
  habits: VisionHabit[]
  tasks: VisionTask[]
  measure: VisionMeasure | null
  rampSteps: HabitRampStep[] | null
  /** Optional user-set "achieve by" date (YYYY-MM-DD) — fed to AI refinement. */
  targetDate?: string | null
  /** M3 — the goal as an affirmation sentence ("I will easily…"). Editable. */
  smartSentence?: string | null
  /** M3 — belief 0-10 that this goal is achievable; <7 → shrink it (Stefan's rule). */
  beliefLevel?: number | null
  /** v4 — desire 0-10; belief AND desire must both clear 7 or reshape the goal. */
  desireLevel?: number | null
  /** M3 — the pain-why: "what will it cost you if you DON'T achieve this?" */
  painWhy?: string | null
  /** v3 — Blueprint area this goal was created FOR (Life Plan per-area goals).
   * When set, the goal feeds ONLY this area; when absent, it feeds every area
   * its pillar maps to. */
  areaId?: string | null
  /** v9 — the reward you'll give yourself when it lands (celebration is half
   * of "whatever gets rewarded gets repeated"). */
  reward?: string | null
  /** v9 — the stake: what you forfeit / must do if you miss (consequence). */
  stake?: string | null
  /** v9 — obstacle pre-mortem: what will try to stop you, and the counter. */
  obstacles?: string | null
  /** v9 — the 100-Reasons exercise: rapid-fire reasons this goal must happen
   * (aim 100; the first ~10 are the surface, the gold is past 30). */
  reasonsList?: string[]
  /** v11 — the feeling clause of his template ("…creating [feeling]"). */
  feeling?: string | null
  /** v17 — goals THIS goal FEEDS (downstream, cross-area expected). Outward
   * direction matches the authoring gesture: you finish an area and say "this
   * feeds the money goal I already wrote", never re-opening the target.
   * Acyclic by construction — addGoalEdge refuses an edge that closes a loop. */
  feedsGoalIds?: string[]
  /** v17 — "Who else does this goal serve?" */
  whoItServes?: string | null
  /** v17 — "What does this make possible that isn't possible now?" */
  unlocks?: string | null
  /** v17 — "What's the smallest first move you can make this week?" */
  firstStep?: string | null
}
