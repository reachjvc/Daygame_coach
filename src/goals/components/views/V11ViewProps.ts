/**
 * Shared props interface for V11 experimental views.
 *
 * Unlike V10 (which only had display + increment), V11 views receive the
 * full CRUD surface so each view can be a complete goals experience:
 * discovery → setup → daily use → management → celebration.
 */

import type {
  GoalWithProgress,
  GoalTreeNode,
  LifeAreaConfig,
  GoalTemplate,
  InputMode,
  CelebrationTier,
  UserGoalInsert,
} from "../../types"
import type { BatchGoalInsert } from "../../treeGenerationService"
import type { ProjectedDateInfo } from "../../goalsService"

export interface V11ViewProps {
  // ─── DATA ────────────────────────────────────────────────
  /** All goals (flattened from tree, excluding archived unless toggled) */
  goals: GoalWithProgress[]
  /** Hierarchical tree structure */
  tree: GoalTreeNode[]
  /** Life area configs with colors, icons, suggestions */
  lifeAreas: LifeAreaConfig[]
  /** Goal template catalog (L0-L3) */
  templates: GoalTemplate[]
  /** Whether data is currently loading */
  isLoading: boolean

  // ─── PROGRESS HANDLERS ──────────────────────────────────
  /** Increment a counter goal by amount (e.g., +1, +5) */
  onIncrement: (goalId: string, amount: number) => Promise<void>
  /** Set a goal's current_value directly */
  onSetValue: (goalId: string, value: number) => Promise<void>
  /** Reset a recurring goal's progress to 0 */
  onReset: (goalId: string) => Promise<void>

  // ─── CRUD HANDLERS ──────────────────────────────────────
  /** Create a single goal */
  onCreate: (goal: UserGoalInsert) => Promise<GoalWithProgress | null>
  /** Create goals in batch (from templates/setup) */
  onBatchCreate: (goals: BatchGoalInsert[]) => Promise<GoalWithProgress[]>
  /** Update an existing goal */
  onUpdate: (goalId: string, updates: Partial<UserGoalInsert>) => Promise<void>
  /** Archive a goal (soft delete) */
  onArchive: (goalId: string) => Promise<void>
  /** Permanently delete a goal */
  onDelete: (goalId: string) => Promise<void>

  // ─── CELEBRATION ────────────────────────────────────────
  /** Trigger a celebration overlay */
  onCelebrate: (tier: CelebrationTier, title: string) => void

  // ─── UTILITIES (pure, no network) ───────────────────────
  /** Determine input mode: "boolean" | "buttons" | "direct-entry" */
  getInputMode: (goal: GoalWithProgress) => InputMode
  /** Get increment button values based on target */
  getButtonIncrements: (targetValue: number) => number[]
  /** Get next milestone info for a milestone goal */
  getNextMilestoneInfo: (goal: GoalWithProgress) => { nextValue: number; remaining: number } | null
  /** Get projected completion date info */
  getProjectedDate: (goal: GoalWithProgress) => ProjectedDateInfo | null
  /** Get celebration tier for a completed goal */
  getCelebrationTier: (goal: GoalWithProgress) => CelebrationTier

  // ─── REFRESH ────────────────────────────────────────────
  /** Force refresh all goal data from the server */
  onRefresh: () => Promise<void>
}
