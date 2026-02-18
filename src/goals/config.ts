/**
 * Goals slice configuration and constants
 */

import type { GoalViewMode, GoalDisplayCategory } from "./types"

/**
 * Human-readable label for each display category.
 * Used by GoalTreePreview, GoalCategorySection, GoalCatalogPicker, GoalHierarchyView.
 */
export const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  // Daygame
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
  // Personal Growth
  mindfulness: "Mindfulness & Presence",
  resilience: "Mental Toughness",
  learning: "Learning & Knowledge",
  reflection: "Reflection & Self-Awareness",
  discipline: "Discipline & Habits",
  // Social
  social_activity: "Social Activity",
  friendships: "Friendships",
  hosting: "Hosting & Events",
  social_skills: "Social Skills",
  network_expansion: "Network Expansion",
  // Fitness
  strength: "Strength",
  training: "Training Discipline",
  nutrition: "Nutrition & Recovery",
  body_comp: "Body Composition",
  // Wealth
  income: "Income & Earning",
  saving: "Budgeting & Saving",
  investing: "Investing",
  career_growth: "Career Growth",
}

/**
 * Display order for categories, grouped by life area.
 * Categories with no goals are skipped at render time.
 */
export const CATEGORY_ORDER: GoalDisplayCategory[] = [
  // Daygame
  "field_work", "results", "dirty_dog", "texting", "dates", "relationship",
  // Personal Growth
  "mindfulness", "resilience", "learning", "reflection", "discipline",
  // Social
  "social_activity", "friendships", "hosting", "social_skills", "network_expansion",
  // Fitness
  "strength", "training", "nutrition", "body_comp",
  // Wealth
  "income", "saving", "investing", "career_growth",
]

/**
 * View mode labels and icons for the ViewSwitcher
 */
export const VIEW_MODE_CONFIG: Record<GoalViewMode, { label: string; description: string }> = {
  daily: { label: "Daily", description: "Action-focused view for this week's goals" },
  strategic: { label: "Strategic", description: "Full hierarchy with achievements and categories" },
  standard: { label: "Standard", description: "Life area cards with progress overview" },
  "time-horizon": { label: "Time Horizon", description: "Goals grouped by time horizon with expandable chains" },
}

/**
 * Time horizon labels in order from longest to shortest
 */
export const TIME_HORIZONS = [
  "Life",
  "Multi-Year",
  "This Year",
  "This Quarter",
  "This Month",
  "This Week",
  "Today",
] as const

/**
 * Default filter state
 */
export const DEFAULT_FILTER_STATE = {
  lifeArea: null,
  timeHorizon: null,
  status: null,
  search: "",
} as const
