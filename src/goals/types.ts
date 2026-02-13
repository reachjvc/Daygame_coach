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
  LinkedMetric,
  UserGoalRow,
  UserGoalInsert,
  UserGoalUpdate,
  GoalWithProgress,
  GoalTreeNode,
} from "@/src/db/goalTypes"

/**
 * Predefined life area IDs
 */
export type LifeAreaId =
  | "daygame"
  | "dating"
  | "health_fitness"
  | "career_business"
  | "social"
  | "personal_growth"
  | "finances"
  | "mindfulness"
  | "education"
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
export type GoalViewMode = "standard" | "time-horizon"

/**
 * Filter state for goals list/views
 */
export interface GoalFilterState {
  lifeArea: string | null
  timeHorizon: string | null
  status: string | null
  search: string
}
