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

/**
 * Predefined life area IDs
 */
export type LifeAreaId =
  | "daygame"
  | "health_fitness"
  | "career_business"
  | "social"
  | "personal_growth"
  | "lifestyle"
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
export type GoalViewMode = "daily" | "strategic" | "standard" | "time-horizon"

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
export type CurveThemeId = "zen" | "cyberpunk"

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
// Achievement Types
// ============================================================================

/**
 * How much a single L3 goal contributes to an L2 achievement.
 * Weights across all contributing goals should sum to 1.
 */
export interface AchievementWeight {
  goalId: string
  weight: number
}

/**
 * Computed progress for an achievement badge.
 */
export interface AchievementProgressResult {
  progressPercent: number
  contributingGoals: {
    goalId: string
    weight: number
    goalProgress: number
    contribution: number
  }[]
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
 * Default achievement weight for an L3 goal contributing to an L2 achievement.
 */
export interface DefaultAchievementWeight {
  achievementId: string
  goalId: string
  weight: number
}

/**
 * A section in the hierarchy display — one L1 goal with its achievements and L3 categories.
 */
export interface HierarchySection {
  l1Goal: GoalWithProgress
  achievements: GoalWithProgress[]
  categories: Partial<Record<GoalDisplayCategory, GoalWithProgress[]>>
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
 * Badge tier thresholds for L2 achievement progress.
 * 0-24% = none, 25% = bronze, 50% = silver, 75% = gold, 100% = diamond
 */
export type BadgeTier = "none" | "bronze" | "silver" | "gold" | "diamond"

/**
 * Status of a single L2 badge, computed from weighted L3 goal progress.
 */
export interface BadgeStatus {
  badgeId: string
  title: string
  progress: number
  tier: BadgeTier
  unlocked: boolean
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
  path: DaygamePath
  selectedAreas: Set<string>
  selectedGoalIds: Set<string>
  targets: Record<string, number>
  curveConfigs: Record<string, MilestoneLadderConfig>
  customGoals: SetupCustomGoal[]
  customCategories: SetupCustomCategory[]
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
