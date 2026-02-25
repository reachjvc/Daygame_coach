/**
 * Shared mock data for tour variant test pages.
 * Provides pre-hydrated state so tours have real content to highlight.
 */

import { GOAL_TEMPLATES, getTemplatesByCategoryForArea } from "@/src/goals/data/goalGraph"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import type {
  GoalTemplate,
  LifeAreaConfig,
  MilestoneLadderConfig,
  HabitRampStep,
  SetupCustomGoal,
  SetupCustomCategory,
  DaygamePath,
} from "@/src/goals/types"

/* ── Catalog data (static, no API needed) ────────────────── */

export const lifeAreas: LifeAreaConfig[] = LIFE_AREAS

const categories = getTemplatesByCategoryForArea("daygame")
export const daygameByCategory: { category: string; goals: GoalTemplate[] }[] =
  Object.entries(categories)
    .filter(([, goals]) => goals && goals.length > 0)
    .map(([category, goals]) => ({ category, goals: goals! }))

export const daygameL3Goals: GoalTemplate[] = GOAL_TEMPLATES.filter(
  (t) => t.lifeArea === "daygame" && t.level === 3
)

/* ── Pre-hydrated user state ─────────────────────────────── */

export const mockPath: DaygamePath = "fto"

/** Life areas user has enabled (daygame is implicit) */
export const mockSelectedAreas = new Set(["health_fitness", "personal_growth"])

/** Goals the user has toggled on — mix of core + progressive */
export const mockSelectedGoals = new Set([
  // field_work
  "l3_approach_volume",
  "l3_approach_frequency",
  "l3_session_frequency",
  // results
  "l3_phone_numbers",
  "l3_dates",
  // texting
  "l3_texting_initiated",
  // dates
  "l3_dates_planned",
  // dirty_dog (one to show curve editor)
  "l3_kiss_closes",
  // life area goals (health_fitness suggestions)
  "health_fitness_s0",
  "health_fitness_s1",
  // life area goals (personal_growth suggestions)
  "personal_growth_s0",
])

/** Targets user has customized */
export const mockTargets: Record<string, number> = {
  l3_approach_volume: 500,
  l3_phone_numbers: 30,
  l3_dates: 20,
  l3_kiss_closes: 15,
}

/** Curve configs for milestone goals */
export const mockCurveConfigs: Record<string, MilestoneLadderConfig> = {
  l3_approach_volume: { start: 1, target: 500, steps: 12, curveTension: 0 },
  l3_phone_numbers: { start: 1, target: 30, steps: 8, curveTension: 0 },
}

/** Ramp configs for habit goals */
export const mockRampConfigs: Record<string, HabitRampStep[]> = {
  l3_approach_frequency: [
    { frequencyPerWeek: 10, durationWeeks: 12 },
    { frequencyPerWeek: 15, durationWeeks: 12 },
    { frequencyPerWeek: 25, durationWeeks: 24 },
  ],
  l3_session_frequency: [
    { frequencyPerWeek: 3, durationWeeks: 48 },
  ],
}

/** Which goals have ramp enabled */
export const mockRampEnabled = new Set([
  "l3_approach_frequency",
  "l3_session_frequency",
])

/** Custom goals user has added */
export const mockCustomGoals: SetupCustomGoal[] = [
  { id: "cg_1_1700000000", title: "Daily meditation", categoryId: "personal_growth", target: 7 },
]

/** Custom categories user has added */
export const mockCustomCategories: SetupCustomCategory[] = [
  { id: "cc_1_1700000001", name: "Side Projects", goals: [] },
]

/** Per-area target dates */
export const mockTargetDates: Record<string, string> = {
  daygame: "2026-12-31",
}

/** Per-goal dates */
export const mockGoalDates: Record<string, string> = {
  l3_approach_volume: "2026-06-30",
  l3_dates: "2026-09-30",
}
