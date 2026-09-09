/**
 * Goal category definitions — adapter layer
 *
 * Delegates to src/goals/data/lifeAreas.ts for the actual data.
 * Re-exports with the old interface so existing imports keep working.
 */

import type { LucideIcon } from "lucide-react"
import { LIFE_AREAS, LIFE_AREA_MAP, getLifeAreaConfig } from "@/src/goals/data/lifeAreas"
import type { GoalPeriod, LinkedMetric } from "@/src/db/goalTypes"

export interface GoalSuggestion {
  title: string
  defaultTarget: number
  defaultPeriod: GoalPeriod
  linkedMetric?: LinkedMetric
  featured?: boolean
}

export interface GoalCategoryConfig {
  id: string
  name: string
  icon: LucideIcon
  hex: string
  color: string
  bgColor: string
  borderColor: string
  progressColor: string
  suggestions: GoalSuggestion[]
}

/**
 * GOAL_CATEGORIES maps to LIFE_AREAS for backward compat.
 * New code should use LIFE_AREAS directly.
 */
export const GOAL_CATEGORIES: GoalCategoryConfig[] = LIFE_AREAS.map((area) => ({
  id: area.id,
  name: area.name,
  icon: area.icon,
  hex: area.hex,
  color: area.color,
  bgColor: area.bgColor,
  borderColor: area.borderColor,
  progressColor: area.progressColor,
  suggestions: area.suggestions,
}))

/**
 * Map for O(1) category lookup — delegates to LIFE_AREA_MAP
 */
export const GOAL_CATEGORY_MAP: Record<string, GoalCategoryConfig> =
  Object.fromEntries(GOAL_CATEGORIES.map((c) => [c.id, c]))

/**
 * Default category config for unknown categories
 */
export const DEFAULT_CATEGORY_CONFIG: Omit<GoalCategoryConfig, "id" | "name"> = (() => {
  const custom = getLifeAreaConfig("custom")
  return {
    icon: custom.icon,
    hex: custom.hex,
    color: custom.color,
    bgColor: custom.bgColor,
    borderColor: custom.borderColor,
    progressColor: custom.progressColor,
    suggestions: custom.suggestions,
  }
})()

/**
 * Get category config — delegates to getLifeAreaConfig
 */
export function getCategoryConfig(categoryId: string): GoalCategoryConfig {
  const config = getLifeAreaConfig(categoryId)
  return {
    id: config.id,
    name: config.name,
    icon: config.icon,
    hex: config.hex,
    color: config.color,
    bgColor: config.bgColor,
    borderColor: config.borderColor,
    progressColor: config.progressColor,
    suggestions: config.suggestions,
  }
}
