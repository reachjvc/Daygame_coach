/**
 * Types for the Goals slice
 */

import type { LucideIcon } from "lucide-react"
import type { GoalPeriod, LinkedMetric } from "@/src/db/goalTypes"
import type {
  LdiCadenceId,
  LdiEnergyMark,
  LdiOdysseyKind,
  LdiProjectStatus,
  LdiSessionId,
} from "@/src/goals/data/lifeDirection"
import type { PairwiseState } from "@/src/goals/data/valuesFramework"

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
/**
 * v23 — the weekly review as it is being written, before it is saved.
 * Persisted on every keystroke so leaving the page mid-review no longer throws
 * the whole thing away. Every field is optional except the week it belongs to.
 */
export interface VisionWeeklyDraft {
  weekStart: string
  areaRatings: Record<string, number>
  note?: string
  focusPillarId?: string | null
  magicMoment?: string
  accomplishment?: string
  lesson?: string
  challenge?: string
  outcomes?: VisionWeeklyOutcome[]
  captures?: Array<{ text: string; areaId: string | null }>
  savedAt: string
}

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
  /** v23 — the habitual question the primary question REPLACED. Kept so the
   * user can see what they rewrote away from; that contrast is the exercise. */
  primaryQuestionOld?: string
  /** v23 — the mission's three parts, kept separately so "rewrite it" can
   * repopulate the boxes instead of demanding all three be retyped. */
  missionParts?: { name: string; be: string; doGive: string }
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
  // v21 — the outcomes he actually reports that our taxonomy had no word for.
  // Without these, every non-hit collapses to "missed", which is not how he
  // talks about his own 80-90% year.
  | "pushed"
  | "reshaped"
  | "displaced"
  | "paused"
  | "deferred-by-choice"

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
  /** v23 — the in-progress weekly review, saved as it is typed. Cleared when
   * the review is saved for real. */
  weeklyDraft?: VisionWeeklyDraft
  /** v23 — the last date the daily loop was opened, so roll-over covers every
   * day the user was away instead of only yesterday. */
  lastSeen?: string
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
  /** v4 — the season's 1-3 domino areas ("which area, conquered, lifts all the others?").
   * v19: this is now a PROJECTION of `areaRank` — its top `focusCount` entries.
   * Written only by setAreaPriority(); never assign it directly. */
  focusAreaIds?: string[]
  /** v20 — single or partnered; picks which relationship toolkit to show. */
  relationshipStatus?: "single" | "partnered" | "unset"
  /** v20 — approach-ladder reps by rung level. */
  approachReps?: Record<string, number>
  /** v21 — limiting beliefs being worked, with their reference counts. */
  beliefs?: Array<{
    id: string
    old: string
    replacement?: string
    useful?: boolean
    evidence?: string[]
    references?: string[]
    startedAt?: string
  }>
  /** v21 — the divergent phase: raw brainstormed wants with a horizon number
   * and whether they were circled into this year's set. */
  rawWants?: Array<{ id: string; text: string; years: 1 | 3 | 5 | 10 | 20 | null; circled: boolean }>
  /** v20 — guided-build sessions completed (ids from GUIDE_SESSIONS). */
  guideDone?: string[]
  /** v20 — the annual debrief he treats as a prerequisite to goal setting.
   * Good strictly first; the no-"but" rule is enforced in the UI copy. */
  yearDebrief?: { good: string[]; challenges: string[]; lessons: string[] }
  /** v19 — every area in the user's priority order for this season. The single
   * source of truth for area priority: "focus" and "maintenance" are tiers of
   * this list, not separate state. */
  areaRank?: string[]
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
  /** v17 — life-wide affirmations (the global peer of values / incantations /
   * valueRules; per-area ones live in areaPlans[id].affirmations). */
  affirmations?: string[]
  /** v17 — how deep the user is going in each area this pass. Absent = "later".
   * Commitment stays 12/12 (the manifesto); attention scopes to a few. */
  areaScope?: Record<string, "deep" | "sketched" | "later">
  /** v23 — the raw vision prose as typed, when it differs from the ANALYSED
   * `vision`. The Guide's vision textarea writes this. */
  visionDraft?: string
  /** v23 — the morning-ritual audit worksheet (the acts you already do, marked
   * empowering or draining). The draining ones are what the designed ritual is
   * replacing, so they have to survive alongside it. */
  ritualAudit?: Array<{ id: string; text: string; mark: "up" | "down" | null }>
  /** v23 — the rules exercise's worksheet: the rule as your head states it,
   * beside its rewrite. `valueRules` keeps only the rewrites. */
  ruleWork?: Array<{ id: string; value: string; old: string; rewritten?: string }>
  /** v23 — approach-session debriefs. */
  sessionJournals?: Array<{ id: string; date: string; reps: string; body: string; felt: string; her: string; next: string }>
  /** v25 — question ids the intake has revealed. A question lands here when it
   * is answered AND when it is waved past with "I'm not sure yet", which is how
   * an unanswered question can still let the next one appear. Order is reveal
   * order, so it doubles as the trail of how far the user got. */
  intakeSeen?: string[]
  /** v25 — Blueprint area id → what YOUR 0 looks like. The source teaches the 0
   * in the same breath as the 10 ("what is the ten for you and then what is a
   * zero for you"), and the weekly wheel needs both ends to mean anything. */
  yourZeros?: Record<string, string>
  /** v25 — the Perfect Day exercise: one day, years out, written hour by hour.
   * It is the on-ramp when the vision box is too big to start, and it is its own
   * artifact because it gets re-read on its own.
   *
   * The rest of the goal qualification stack (desire, reward, stake, obstacles,
   * pain-why, the sentence) already lives on VisionGoalDraft. Do not add a
   * parallel store for it here. */
  perfectDay?: string
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
  /**
   * M8 — a stand-in, not a chosen action. Every goal is created with one habit
   * so it has something on the calendar, and for a target or a finish line
   * that habit is auto-titled "Work toward: <the goal>", which is not a thing
   * anyone can actually do. Marking it lets the card ask for the real actions
   * instead of showing a placeholder as though the user had written it.
   */
  placeholder?: boolean
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

/** The measurable ladder for a milestone_ladder goal — maps 1:1 onto MilestoneLadderConfig.
 *
 * `start` may be GREATER than `target`: body fat, race times, debt and ranks all
 * improve downward. Every consumer of this type must read direction from the
 * pair, never assume start < target (see `measureDirection`). */
export interface VisionMeasure {
  unit: string
  start: number
  target: number
  steps: number
  /** M6 — how the measure is worked, when the number alone doesn't say it:
   * "3×6-8", "5/3/1", "AMRAP". Display-only; no progress math reads it. Kept
   * off the title so the title stays the movement's name. */
  protocol?: string
}

/**
 * M7 — where a written line actually belongs. A goal list is not a list of
 * goals: it mixes in identity statements, standing rules, and outcomes nobody
 * controls. Each has a real home in state already; intake's job is to OFFER
 * the route, never to take it silently.
 */
export type GoalRoute = "goal" | "identity" | "rule" | "horizon-want"

export const GOAL_ROUTES: readonly GoalRoute[] = ["goal", "identity", "rule", "horizon-want"] as const

/**
 * What intake made of one written line. `route` is a SUGGESTION — the review
 * screen defaults to "goal" and offers the alternative beside it, because a
 * mis-route on a real goal is worse than no routing at all.
 */
export interface GoalReading {
  title: string
  type: VisionGoalType
  why: string
  daysPerWeek: number
  measure: VisionMeasure | null
  targetDate: string | null
  /** M7 — the suggested destination, with the cue that triggered it. */
  route: GoalRoute
  /** The literal matched text that produced a non-"goal" route; null otherwise.
   * Shown to the user so the suggestion is inspectable, never magic. */
  routeCue: string | null
  /** M3 — set when the line names a MONTHLY rhythm. A monthly cadence is not a
   * weekly habit; it belongs in `VisionWeeklyRitual.monthlyDay`. Flagged rather
   * than silently rounded to "once a week". */
  monthly?: boolean
}

/** One line of a pasted goal list, as read by `parseGoalList`. */
export interface GoalListRow {
  id: string
  /** The line exactly as the user wrote it. */
  raw: string
  reading: GoalReading
  /** Blueprint area from the nearest preceding heading, or null when unresolved
   * — the review screen REQUIRES the user to resolve these before accepting. */
  areaId: string | null
  /** The heading text this row sat under, for display ("Health", "Dating"). */
  heading: string | null
  /** M9 — id of the row this one is indented under, when the list nests. */
  parentRowId: string | null
}

/** The full reading of a pasted list. Pure — writes nothing. */
export interface GoalListParse {
  rows: GoalListRow[]
  /** Headings we could not map to any Blueprint area, in order of appearance. */
  unresolvedHeadings: string[]
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
}

// ---------------------------------------------------------------------------
// The simple Life Mastery flow (/test/life-mastery).
//
// Three screens: your why, your areas, then a why per goal. Deliberately its
// own shape rather than a slice of VisionPlanState — that state carries the
// whole daily/weekly/monthly system and none of it belongs here. Nothing in
// this flow touches the database; it lives in localStorage.
// ---------------------------------------------------------------------------

export type LifeMasteryStepId = "why" | "areas" | "goals"

/** One goal, written in an area on step 2 and qualified on step 3. */
export interface SimpleGoal {
  id: string
  /** A Blueprint area id, or a custom area the user added. */
  areaId: string
  title: string
  /** Why you want it. The one field step 3 exists for. */
  why: string
  /** What it costs you if you do not do it. */
  painWhy: string
  /** YYYY-MM-DD, or null while it is open. */
  targetDate: string | null
  /** 0-10 that you can do it. Under 7 the goal wants shrinking. */
  beliefLevel: number | null
  /** 0-10 that you want it. Under 7 the goal wants dropping. */
  desireLevel: number | null
  /** The goal as one sentence, starting with "I will easily". */
  sentence: string
}

/** A user's changes to one of the twelve Blueprint areas. */
export interface SimpleAreaEdit {
  /** A name that means something to them. Absent means the Blueprint name. */
  label?: string
  /** Areas they are not working on this year. They stay, greyed. */
  hidden?: boolean
}

/** An area the user added themselves, on top of the twelve. */
export interface SimpleCustomArea {
  id: string
  label: string
  color: string
}

export interface LifeMasteryPlan {
  version: 1
  /** Step 1, keyed by WHY_QUESTIONS id. Every answer is plain text. */
  answers: Record<string, string>
  areaEdits: Record<string, SimpleAreaEdit>
  customAreas: SimpleCustomArea[]
  goals: SimpleGoal[]
  /**
   * Monotonic id counters. Deriving the next id from the highest id in the
   * list hands a deleted goal's id to the next one written, and anything
   * keyed by that id (a React row, an open editor) then shows the dead goal's
   * state on the new one. These only ever go up.
   */
  goalSeq: number
  areaSeq: number
  /** How far out the vision sits: 5, 10 or 20 years. His own range. */
  horizonYears: number
  /** ISO timestamp of the last change, for the saved indicator. */
  updatedAt: string | null
}

/** An area as the flow renders it: Blueprint area or custom, edits applied. */
export interface ResolvedArea {
  id: string
  label: string
  /** Empty for custom areas. */
  sublabel: string
  color: string
  textColor: string
  hidden: boolean
  custom: boolean
  /** True when the user renamed it away from the Blueprint name. */
  renamed: boolean
}

export interface LifeMasteryProgress {
  visionAnswered: boolean
  whyAnswered: boolean
  /** How many of the seven ladder rungs carry an answer. */
  rungsAnswered: number
  goals: number
  areasWithGoals: number
  goalsWithWhy: number
  /** Steps that are done, in flow order. */
  done: Record<LifeMasteryStepId, boolean>
}

// ---------------------------------------------------------------------------
// The North Star flow (/test/life-mastery).
//
// Four tabs, in the order the work happens: your north star, the areas of your
// life plus the routines under them, your goals, then the review that rates
// where you actually are and checks the goals against it.
//
// Its own shape rather than a slice of VisionPlanState. That state carries the
// whole daily / weekly / monthly system, and none of it belongs here. Nothing
// in this flow touches the database; it lives in localStorage.
// ---------------------------------------------------------------------------

/**
 * Three tabs. "plan" was folded into "now" — they were the same wheel opening
 * the same dialog, one of them additionally listing the goals and routines.
 */
export type NorthStarTabId = "star" | "now" | "review"

/** One area of life. The four defaults ship with the flow and are editable. */
export interface NsArea {
  id: string
  label: string
  /** One line under the name, so a renamed area still says what it covers. */
  sublabel: string
  color: string
  /** True when the user added it themselves. */
  custom: boolean
}

/**
 * How a routine runs.
 *   sequence — an ordered stack you walk top to bottom (morning, night).
 *   weekly   — a set of habits with their own days-per-week (workouts, work).
 */
export type NsRoutineKind = "sequence" | "weekly"

export interface NsRoutineStep {
  id: string
  title: string
  /** Rough length, for the "~25 min" readout. Sequence routines only. */
  minutes: number
  /** Weekly routines only: how many days a week this one step runs. */
  daysPerWeek: number
  /** Set when the step came from a library, for the coverage badges. */
  dimension: "mind" | "body" | "spirit" | null
}

/** A named training day inside a workout split. */
export interface NsSplitDay {
  id: string
  name: string
}

export interface NsRoutine {
  id: string
  label: string
  /** Which library this routine draws from. Key into ROUTINE_BLUEPRINTS. */
  blueprintId: string
  kind: NsRoutineKind
  /** The area this routine serves, or null when it serves all of them. */
  areaId: string | null
  /**
   * The other areas this routine lifts.
   *
   * A morning routine is filed under nothing in particular and quietly carries
   * mind, emotions, health and spirituality. Naming that is the difference
   * between "I have a morning routine somewhere" and seeing, inside Emotions,
   * that something already runs there every day.
   */
  serves: string[]
  steps: NsRoutineStep[]
  /** Sequence routines: how many mornings a week you run the whole stack. */
  daysPerWeek: number
  /** Training days in order, when this routine is a workout week. */
  splitDays: NsSplitDay[]
}

/** What could stop you, and what you will do when it does. */
export interface NsObstacle {
  id: string
  what: string
  counter: string
}

/**
 * One limiting belief, worked through the procedure: name it, ask whether it
 * is useful rather than whether it is true, find the counter-evidence, write
 * the replacement.
 */
export interface NsBelief {
  id: string
  old: string
  /** Whether they judged the old belief useful. "Yes" is a real answer that
   * ends the exercise, so it is recorded rather than assumed. */
  useful: boolean | null
  evidence: string
  replacement: string
}

/** A named checkpoint on a finish-line goal. Its rungs, since it has no number. */
export interface NsCheckpoint {
  id: string
  title: string
  done: boolean
}

export interface NsGoal {
  id: string
  areaId: string
  title: string
  /** Target, practice or finish line. Flippable at any time. */
  type: VisionGoalType
  /** Why you want it. The fuel. */
  why: string
  /** What it costs you if you never do it. */
  painWhy: string
  /** The goal as one sentence, starting "I will easily". */
  sentence: string
  targetDate: string | null
  /** 0-10 that you can do it. Under 7 the goal wants shrinking. */
  beliefLevel: number | null
  /** 0-10 that you want it. Under 7 the goal wants dropping. */
  desireLevel: number | null
  /** Target goals: what the numbers are counted in. "kg", "a month", "%". */
  unit: string
  /**
   * Target goals: where you are now, where you are going, and the curve of
   * milestones between the two. The numbers live here and nowhere else, so a
   * start edited on the curve and a start edited in the row can never disagree.
   */
  ladder: MilestoneLadderConfig | null
  /** Practice goals: the steady-state weekly load. */
  daysPerWeek: number
  /** Practice goals: the ease-in phases before steady state. */
  rampSteps: HabitRampStep[] | null
  /**
   * The actions. What you will actually DO about this on a Tuesday, as opposed
   * to the outcome the title names. Same shape as the full lab's habits, so the
   * lab's `goalNeedsAction` reads it directly. A goal that names somewhere to
   * end up and nothing you can do is the commonest way a plan dies quietly.
   */
  habits: VisionHabit[]
  /**
   * The reasons drill: rapid-fire reasons this has to happen. The first ten are
   * the surface; the ones worth having start after that.
   */
  reasonsList: string[]
  /** The feeling clause of the sentence template ("…creating unstoppable energy"). */
  feeling: string
  /** Finish-line goals: the checkpoints that stand in for milestones. */
  checkpoints: NsCheckpoint[]
  /** Bigger goals this one feeds. Acyclic by construction. */
  feedsGoalIds: string[]
  /** What you give yourself when it lands. */
  reward: string
  /** What you forfeit if you miss. */
  stake: string
  obstacles: NsObstacle[]
  beliefs: NsBelief[]
  /** The values this one goal asks of you. */
  values: string[]
  /**
   * Where this goal's current number comes from.
   *
   * `null` is the default and means you move the number yourself. `daily_area`
   * means the page already has it: the goal's current value is the rolling
   * average of the daily 0-10 ratings for its own area, so "raise my average
   * emotional state to an 8" scores itself off the ratings you are already
   * making instead of asking you to copy a figure across.
   *
   * Only meaningful on a target goal, which is the only shape with a number to
   * climb. Kept on the goal rather than derived from the title, because two
   * goals in the same area can want different sources.
   */
  metric: NsGoalMetricSource | null
  /**
   * Other areas this one goal lifts, beyond the area it is filed under.
   *
   * Some goals are not confined to their box. Quitting one thing makes four
   * areas easier at once, and a goal that only ever shows up under Vices reads
   * as a small thing you are doing on the side. Listed here, it shows up inside
   * every area it actually serves.
   */
  serves: string[]
}

/** Where a target goal's current value is read from. */
export type NsGoalMetricSource = "daily_area"

/** The review answers for one area. */
export interface NsAreaReview {
  /** What a 10 looks like here, in your own words. His "vision" for the area. */
  ten: string
  /**
   * Why this area matters to you. His "purpose", per area.
   *
   * "I have my vision, I have my purpose, but I also have a vision and a purpose
   * for each area of my life, and I have goals for each area as well"
   * (Rw2qaMltFcY). We had the vision, the goals and the rituals per area and no
   * purpose, which is the one of the four that decides whether the other three
   * survive a bad month.
   */
  purpose: string
  /**
   * Where you are in this area right now, in your own words. Optional.
   *
   * The rating says it was a 4. This says what a 4 felt like, which is the part
   * nobody remembers six months later and the part that makes the next rating
   * mean something.
   */
  snapshot: string
  /** Your own rating for the last two weeks, 0-10. */
  fortnight: number | null
  /** Whether you say your current goals actually aim at your 10. */
  goalsAim: "yes" | "no" | null
  /** What could stop you in this area. */
  blockers: string
  /** The values this area asks of you. */
  values: string[]
  /** Who you are when this area is handled. */
  identity: string
}

export interface NsPlan {
  version: 1
  /** How far out the north star sits: 5, 10 or 20 years. */
  horizonYears: number
  /** The north star itself, one paragraph, present tense. */
  northStar: string
  /** The optional ladder answers that assemble into the paragraph. */
  rungs: Record<string, string>
  areas: NsArea[]
  routines: NsRoutine[]
  goals: NsGoal[]
  /** Keyed by area id. */
  review: Record<string, NsAreaReview>
  /** Whole-life review answers, keyed by REVIEW_PROMPTS id. */
  answers: Record<string, string>
  /**
   * The values you have been living by so far, in no particular order.
   *
   * The first half of the values exercise, and the diagnosis in it. "Why do you
   * have the life that you have" is answered by this list, and the interesting
   * part is the diff between it and `values`. Unordered on purpose: ranking the
   * past is work with no payoff.
   */
  currentValues: string[]
  /** The values you are choosing for the life in the paragraph, in order. */
  values: string[]
  /**
   * Goal ids in priority order, first = highest. Same invariant as the full
   * lab's `priorityIds`: it covers every goal exactly once, so a goal's rank is
   * just its index. Kept on the plan rather than as a number on each goal, so
   * two goals can never both claim to be number three.
   */
  priorityIds: string[]
  /**
   * The one thing for this season.
   *
   * Separate from being ranked number one, and worth its own field. Rank one is
   * the most important goal on a list of twenty. This is the goal that, if it
   * happened, would make several of the others easier or unnecessary — the one
   * you would keep if you had to drop everything else this quarter. Usually a
   * goal, occasionally an area with nothing written under it yet, so it holds
   * either kind of id.
   */
  seasonFocusId: string | null
  /** Daily self-ratings. Date (YYYY-MM-DD) to area id to 0-10. */
  daily: Record<string, Record<string, number>>
  /** Monotonic id counter. Never reused, so a deleted row's id never comes back. */
  seq: number
  updatedAt: string | null
}

/** What the flow knows about how far along a plan is. */
export interface NsProgress {
  starWritten: boolean
  areas: number
  routines: number
  routineSteps: number
  goals: number
  goalsWithWhy: number
  goalsQualified: number
  /** Goals naming an outcome with nothing you could do about it. */
  goalsNeedingAction: number
  areasWithGoals: number
  areasRated: number
  areasWithTen: number
  done: Record<NorthStarTabId, boolean>
}

/** One option in a routine's step library. */
export interface RoutineBlueprintStep {
  id: string
  title: string
  /** Rough length. Used by sequence routines. */
  minutes: number
  /** Suggested days a week. Used by weekly routines. */
  daysPerWeek: number
  dimension: "mind" | "body" | "spirit" | null
}

/**
 * A ready-made stack for a routine. Named rather than keyed by minutes, so a
 * preset can be "the full ritual as the program teaches it" and not only a
 * length.
 */
export interface RoutinePreset {
  id: string
  label: string
  /** One line under the label, so picking one is a choice and not a guess. */
  note: string
  stepIds: string[]
}

/** A routine template: its library, its presets, and what it is for. */
export interface RoutineBlueprint {
  id: string
  label: string
  kind: NsRoutineKind
  /** One line on why this routine earns its place in the stack. */
  why: string
  /** Which seed area it serves by default, or null for all of them. */
  areaSeedId: string | null
  /**
   * The other areas this routine measurably lifts.
   *
   * A morning routine is not a health routine. It is the thing that carries
   * mind, emotions, health and spirituality at once, and filing it under one of
   * those, or under none, hides that. Listed so an area can show what already
   * runs inside it before a single goal is written there.
   */
  servesAreaIds: string[]
  /** The ready-made stacks offered on the card. Never empty. */
  presets: RoutinePreset[]
  library: RoutineBlueprintStep[]
  /** True when this routine offers the training-split designer. */
  split: boolean
  /** Sequence routines: how many days a week the stack runs by default. */
  daysPerWeek: number
  /**
   * The steps the routine ARRIVES with, in order. A routine card that opens
   * empty is a second blank page, and the whole point of shipping a template
   * library is that you start from something and edit it down.
   */
  defaultStepIds: string[]
  /** The split a training week arrives with, when it has one. */
  defaultSplitId: string | null
}

/** A whole-life question on the review tab. */
export interface NsReviewPrompt {
  id: string
  question: string
  help: string
  placeholder: string
  /** Rendered as one line per entry rather than a paragraph. */
  list?: boolean
}

// =====================================================================
// Life Direction Intensive
//
// A six-session process with its own state. Deliberately separate from
// NsPlan, LifeMasteryPlan and VisionPlanState: those three already refuse
// to merge with each other, and a fourth shape that borrowed fields from
// all of them would inherit every one of their ambiguities.
//
// The rule that governs this block: a field is either STRUCTURAL (an id,
// an index, a timestamp, something we derived) or AUTHORED (the user's own
// words and judgements). Authored fields start empty and are never filled
// on the user's behalf.
// =====================================================================

/** One thing that took up time in the last fortnight, and how it left them. */
export interface LdiEnergyEntry {
  id: string
  /** AUTHORED. */
  label: string
  /** AUTHORED. Null until marked. */
  mark: LdiEnergyMark | null
}

/** Declared once in session 0, enforced everywhere after it. */
export interface LdiConstraints {
  /** AUTHORED. Hours a week available for deliberate work. Null until answered. */
  weeklyHours: number | null
  /** AUTHORED. */
  money: string
  dependants: string
  health: string
  nonNegotiables: string
}

/** One of the three five-year futures, with its comparison scores. */
export interface LdiOdyssey {
  kind: LdiOdysseyKind
  /** AUTHORED. */
  title: string
  body: string
  /** AUTHORED. Scores keyed by LDI_ODYSSEY_SCORES id. Absent until rated. */
  scores: Record<string, number>
  /** AUTHORED. Whether the getting-there appeals, not only the arrival. */
  processAppeals: boolean | null
}

/** The values work: elicited, then ranked by forced comparison. */
export interface LdiValues {
  /** AUTHORED. What they named, before ranking. */
  candidates: string[]
  /** STRUCTURAL. The ranker's state. Null until ranking starts. */
  pairwise: PairwiseState | null
  /** STRUCTURAL. Frozen result once ranking completes, best first. */
  ranked: string[]
  /** AUTHORED. States they are organising their life to avoid. */
  away: string[]
}

export interface LdiFearSetting {
  /** AUTHORED. */
  option: string
  worst: string
  prevent: string
  repair: string
  benefits: string
  costInaction: string
}

/** One item from the divergent dump, later tagged with a horizon. */
export interface LdiDream {
  id: string
  /** AUTHORED. */
  text: string
  /** AUTHORED. One of LDI_HORIZONS. Null until tagged. */
  horizonYears: number | null
  /** AUTHORED. Which area it belongs to. Null until assigned. */
  areaId: string | null
}

/** A goal in the eleven-field shape, plus the gates that guard it. */
export interface LdiGoal {
  id: string
  /** STRUCTURAL. */
  areaId: string
  /** AUTHORED. */
  title: string
  /** AUTHORED. Keyed by LDI_GOAL_FIELDS id. Missing keys are unanswered. */
  fields: Record<string, string>
  /** AUTHORED. Percentages, null until answered. */
  realismTheory: number | null
  realismPractice: number | null
  /** AUTHORED. Nought to ten. */
  surpriseIfFailed: number | null
  /** AUTHORED. The weekly countable that shows the work is happening. */
  leadIndicator: string
  /** AUTHORED. */
  status: LdiProjectStatus
  /** STRUCTURAL. Which dream it came from, when it came from one. */
  sourceDreamId: string | null
}

/** A block on the ideal week grid. */
export interface LdiWeekBlock {
  id: string
  /** STRUCTURAL. */
  day: string
  slot: string
  /** AUTHORED. */
  label: string
  /** STRUCTURAL. Set when the block was placed for a specific goal. */
  goalId: string | null
  /** AUTHORED. Rough hours this block occupies, for the budget check. */
  hours: number
}

export interface LdiAccountability {
  /** AUTHORED. */
  who: string
  when: string
  what: string
}

export interface LdiPrototype {
  id: string
  /** AUTHORED. */
  assumption: string
  test: string
  signal: string
  date: string | null
}

/** The whole intensive. One object, serialised to localStorage. */
export interface LdiPlan {
  /** STRUCTURAL. Schema version, for the load migration path. */
  v: number

  // session 0
  /** AUTHORED. Keyed by LDI_INTAKE_ITEMS id. Missing means unanswered. */
  intake: Record<string, number>
  /** AUTHORED. Keyed by area id, nought to ten. Missing means unrated. */
  wheel: Record<string, number>
  energy: LdiEnergyEntry[]
  constraints: LdiConstraints

  // session 1
  /** AUTHORED. Keyed by LDI_REFLECT_PROMPTS id. */
  reflect: Record<string, string>
  /** AUTHORED. One area per domain. */
  focusAreaIds: string[]

  // session 2
  /** AUTHORED. Keyed by LDI_NORTH_STAR_PROMPTS id. */
  northStar: Record<string, string>
  /** AUTHORED. Keyed by LDI_LEGACY_PROMPTS id. */
  legacy: Record<string, string>
  /** AUTHORED. Keyed by eulogy stem index. */
  eulogy: Record<string, string>
  odyssey: LdiOdyssey[]
  values: LdiValues
  fear: LdiFearSetting

  // session 3
  dreams: LdiDream[]
  /** AUTHORED. Keyed by area id. */
  celebrations: Record<string, string>
  /** AUTHORED. The active few. Capped deliberately. */
  portfolioAreaIds: string[]
  /** AUTHORED. Hours a week per area id. */
  budget: Record<string, number>

  // session 4
  goals: LdiGoal[]

  // session 5
  week: LdiWeekBlock[]
  /** AUTHORED. Which loops they committed to. */
  cadences: LdiCadenceId[]
  accountability: LdiAccountability
  prototypes: LdiPrototype[]

  /** STRUCTURAL. Sessions the user has explicitly marked finished. */
  finished: LdiSessionId[]
  /**
   * STRUCTURAL. Sessions the user chose to enter without finishing the one
   * before. Recorded rather than hidden: the checks still read as unmet and
   * the session list shows the override, so nothing here inflates progress.
   */
  overrides: LdiSessionId[]
  /** STRUCTURAL. */
  seq: number
  updatedAt: string
}

/** Per-session completion, derived from evidence rather than from visits. */
export interface LdiSessionProgress {
  id: LdiSessionId
  /** How many of this session's required pieces have real answers. */
  done: number
  total: number
  /** True when every required piece is answered. */
  complete: boolean
  /** True when the user may start it: the previous session is complete. */
  unlocked: boolean
  /** True when it is open only because the user chose to skip ahead. */
  overridden: boolean
}

export interface LdiProgress {
  sessions: LdiSessionProgress[]
  done: number
  total: number
  /** The first session that is unlocked and not yet complete. */
  nextSessionId: LdiSessionId | null
}
