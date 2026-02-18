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
  mentorship: "Mentorship",
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
  // Lifestyle
  hobbies_skills: "Hobbies & Skills",
  cooking_domestic: "Cooking & Home",
  adventure_travel: "Adventure & Travel",
  style_grooming: "Style & Grooming",
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
  "social_activity", "friendships", "hosting", "social_skills", "network_expansion", "mentorship",
  // Fitness
  "strength", "training", "nutrition", "body_comp", "flexibility", "endurance",
  // Wealth
  "income", "saving", "investing", "career_growth", "entrepreneurship",
  // Vices & Elimination
  "porn_freedom", "digital_discipline", "substance_control", "self_control",
  // Lifestyle
  "hobbies_skills", "cooking_domestic", "adventure_travel", "style_grooming",
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
