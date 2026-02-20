/**
 * Shared data layer for V5 goal setup variants.
 *
 * Reads real goal templates from goalGraph.ts and provides both:
 * - Tree model data (L0→L1→L2→L3) for variants A/B/C/H/J
 * - Flat model data (L0→L1→L3 + badges) for variants D/E/F/I/G
 *
 * Also provides mock progress data for summary/preview screens.
 */

import { useMemo } from "react"
import {
  GOAL_TEMPLATES,
  getChildren,
  getTemplatesByCategoryForArea,
} from "@/src/goals/data/goalGraph"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { computeAllBadges } from "@/src/goals/badgeEngineService"
import type { GoalTemplate, LifeAreaConfig, BadgeStatus, GoalWithProgress } from "@/src/goals/types"

// ============================================================================
// Types
// ============================================================================

export interface AreaGoalData {
  lifeArea: LifeAreaConfig
  l1Goals: GoalTemplate[]
  l2Goals: GoalTemplate[]
  l3Goals: GoalTemplate[]
  categories: Record<string, GoalTemplate[]>
}

export interface TreeModelData {
  areas: AreaGoalData[]
  getChildrenOf: (parentId: string) => GoalTemplate[]
}

export interface FlatModelData {
  areas: AreaGoalData[]
  /** Simulated badges computed from mock L3 progress */
  badges: BadgeStatus[]
}

export interface MockGoalProgress {
  templateId: string
  title: string
  currentValue: number
  targetValue: number
  progressPercent: number
}

// ============================================================================
// Mock Progress Generator
// ============================================================================

/** Generate mock progress for summary/preview screens */
function generateMockProgress(templates: GoalTemplate[]): MockGoalProgress[] {
  return templates
    .filter((t) => t.level === 3)
    .map((t, i) => {
      const target = t.defaultMilestoneConfig?.target ?? 10
      // Pseudo-random but deterministic progress per template
      const seed = (i * 7 + 3) % 10
      const pct = Math.min(seed * 10 + 5, 95)
      const current = Math.round((target * pct) / 100)
      return {
        templateId: t.id,
        title: t.title,
        currentValue: current,
        targetValue: target,
        progressPercent: pct,
      }
    })
}

/** Convert mock progress to GoalWithProgress shape for badge engine */
function toMockGoalsWithProgress(mocks: MockGoalProgress[]): GoalWithProgress[] {
  const now = new Date().toISOString()
  return mocks.map((m) => ({
    id: `mock_${m.templateId}`,
    user_id: "mock",
    title: m.title,
    category: "daygame",
    life_area: "daygame",
    goal_type: "milestone" as const,
    tracking_type: "counter" as const,
    goal_nature: "outcome" as const,
    period: "weekly" as const,
    target_value: m.targetValue,
    current_value: m.currentValue,
    goal_level: 3,
    template_id: m.templateId,
    parent_goal_id: null,
    display_category: null,
    linked_metric: null,
    created_at: now,
    updated_at: now,
    period_start_date: now,
    custom_end_date: null,
    target_date: null,
    description: null,
    is_active: true,
    is_archived: false,
    current_streak: 0,
    best_streak: 0,
    position: 0,
    milestone_config: null,
    ramp_steps: null,
    progress_percentage: m.progressPercent,
    is_complete: m.currentValue >= m.targetValue,
    days_remaining: null,
  }))
}

// ============================================================================
// Area Data Builder
// ============================================================================

function buildAreaData(lifeArea: LifeAreaConfig): AreaGoalData {
  const categories = getTemplatesByCategoryForArea(lifeArea.id)

  const allTemplates = GOAL_TEMPLATES.filter((t) => t.lifeArea === lifeArea.id)
  const l1Goals = allTemplates.filter((t) => t.level === 1)
  const l2Goals = allTemplates.filter((t) => t.level === 2)
  const l3Goals = allTemplates.filter((t) => t.level === 3)

  return {
    lifeArea,
    l1Goals,
    l2Goals,
    l3Goals,
    categories: categories as Record<string, GoalTemplate[]>,
  }
}

// ============================================================================
// Hooks
// ============================================================================

/** Tree model: L0→L1→L2→L3 with full hierarchy navigation */
export function useTreeModelData(): TreeModelData {
  return useMemo(() => {
    const areas = LIFE_AREAS.map(buildAreaData)
    return {
      areas,
      getChildrenOf: getChildren,
    }
  }, [])
}

/** Flat model: L0→L1→L3 (no L2 in tree) + badges as separate gamification layer */
export function useFlatModelData(): FlatModelData {
  return useMemo(() => {
    const areas = LIFE_AREAS.map(buildAreaData)

    // Generate mock progress for all daygame L3s to compute badges
    const daygameArea = areas.find((a) => a.lifeArea.id === "daygame")
    const mockProgress = daygameArea ? generateMockProgress(daygameArea.l3Goals) : []
    const mockGoals = toMockGoalsWithProgress(mockProgress)
    const badges = computeAllBadges(mockGoals)

    return { areas, badges }
  }, [])
}

/** Mock progress data for summary/preview screens */
export function useMockProgress(lifeAreaId?: string): MockGoalProgress[] {
  return useMemo(() => {
    const templates = lifeAreaId
      ? GOAL_TEMPLATES.filter((t) => t.lifeArea === lifeAreaId)
      : GOAL_TEMPLATES
    return generateMockProgress(templates)
  }, [lifeAreaId])
}

/** All life areas config */
export function useLifeAreas(): LifeAreaConfig[] {
  return LIFE_AREAS
}

// ============================================================================
// Daygame Path Helpers
// ============================================================================

export type DaygamePath = "fto" | "abundance"

/** Get L1 goal templates for a specific daygame path */
export function getDaygamePathL1(path: DaygamePath): GoalTemplate[] {
  const l1s = GOAL_TEMPLATES.filter((t) => t.lifeArea === "daygame" && t.level === 1)
  if (path === "fto") return l1s.filter((t) => t.id.includes("one_person"))
  return l1s.filter((t) => t.id.includes("abundance"))
}

/** Get L3 goals for daygame (same for both paths currently, filtered by category) */
export function getDaygameL3ByCategory(): Record<string, GoalTemplate[]> {
  return getTemplatesByCategoryForArea("daygame") as Record<string, GoalTemplate[]>
}
