/**
 * Goals slice configuration and constants
 */

import type { GoalViewMode, GoalDisplayCategory } from "./types"
import { GOAL_DISPLAY_CATEGORIES } from "./types"

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
  scenarios: "Scenario Practice",
  // Personal Growth
  mindfulness: "Mindfulness & Presence",
  resilience: "Mental Toughness",
  learning: "Learning & Knowledge",
  reflection: "Reflection & Self-Awareness",
  discipline: "Discipline & Habits",
  // Fitness
  strength: "Strength",
  training: "Training Discipline",
  nutrition: "Nutrition & Recovery",
  body_comp: "Body Composition",
  flexibility: "Flexibility & Mobility",
  endurance: "Running & Endurance",
  // Wealth
  income: "Income & Earning",
  saving: "Budgeting & Saving",
  investing: "Investing",
  career_growth: "Career Growth",
  entrepreneurship: "Entrepreneurship",
  // Vices & Elimination
  porn_freedom: "Porn & Fap Recovery",
  digital_discipline: "Digital Discipline",
  substance_control: "Substance Control",
  self_control: "Self-Control",
}

/**
 * Display order for categories, grouped by life area.
 * Categories with no goals are skipped at render time.
 */
export const CATEGORY_ORDER: GoalDisplayCategory[] = [
  // Daygame
  "field_work", "results", "dirty_dog", "texting", "dates", "relationship", "scenarios",
  // Personal Growth
  "mindfulness", "resilience", "learning", "reflection", "discipline",
  // Fitness
  "strength", "training", "nutrition", "body_comp", "flexibility", "endurance",
  // Wealth
  "income", "saving", "investing", "career_growth", "entrepreneurship",
  // Vices & Elimination
  "porn_freedom", "digital_discipline", "substance_control", "self_control",
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
// Compile-time safety: fails if a GOAL_DISPLAY_CATEGORIES value is missing from CATEGORY_LABELS
const _labelExhaustiveCheck: Record<GoalDisplayCategory, string> = CATEGORY_LABELS
void _labelExhaustiveCheck

// Compile-time safety: fails if CATEGORY_ORDER doesn't cover all known categories
const _orderExhaustiveCheck: Record<GoalDisplayCategory, true> = Object.fromEntries(
  CATEGORY_ORDER.map(c => [c, true as const])
) as Record<GoalDisplayCategory, true>
void _orderExhaustiveCheck

export const DEFAULT_FILTER_STATE = {
  lifeArea: null,
  timeHorizon: null,
  status: null,
  search: "",
} as const
