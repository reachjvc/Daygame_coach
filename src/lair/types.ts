/**
 * Lair slice types
 *
 * The Lair is a user-customizable dashboard with drag-drop widgets.
 */

import type { ComponentType } from "react"
import type {
  UserLairConfigRow,
  UserLairLayout,
  TabConfig,
  UserWidgetConfig,
} from "@/src/db/lairTypes"

// Re-export database types that UI needs
export type { UserLairConfigRow, UserLairLayout, TabConfig, UserWidgetConfig }

// ============================================
// Widget Definition (Registry)
// ============================================

export type WidgetSize = "small" | "medium" | "large" | "full"

export type WidgetCategory =
  | "progress"    // XP, streaks, milestones
  | "tracking"    // Sessions, approaches, stats
  | "practice"    // Scenarios, Q&A
  | "goals"       // User goals
  | "reflection"  // Reports, reviews, values
  | "account"     // Settings, subscription

export interface WidgetDefinition {
  id: string
  name: string
  description: string
  category: WidgetCategory
  size: WidgetSize
  component: ComponentType<WidgetProps>
  /** Widget shows premium-locked state if user doesn't have access */
  premium?: boolean
  /** Data sources this widget needs (for documentation) */
  requiresData?: string[]
}

// ============================================
// Widget Component Props
// ============================================

export interface WidgetProps {
  /** Whether widget is in collapsed state */
  collapsed: boolean
  /** Callback to toggle collapsed state */
  onToggleCollapse: () => void
  /** Whether we're in edit mode (drag handles visible) */
  isEditMode: boolean
}

// ============================================
// Edit Mode State
// ============================================

export interface LairEditState {
  isEditMode: boolean
  activeTabId: string
  hasUnsavedChanges: boolean
}

// ============================================
// Lair Page State
// ============================================

export interface LairState {
  layout: UserLairLayout | null
  isLoading: boolean
  error: string | null
  editState: LairEditState
}
