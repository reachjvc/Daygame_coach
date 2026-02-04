/**
 * Template data - Single source of truth for template slugs.
 *
 * Following the milestone pattern (see milestones.ts):
 * - ALL data in one place with `as const satisfies`
 * - Types derived from data via `keyof typeof`
 * - No hardcoded strings scattered across codebase
 */

// ============================================
// Types
// ============================================

export interface SystemTemplateInfo {
  name: string
  description: string
  icon: string
  estimatedMinutes: number
}

export interface UITemplateInfo {
  name: string
  purpose: string
}

export interface TemplateColorConfig {
  bg: string
  icon: string
  gradient: string
}

// ============================================
// System Templates (seeded to DB)
// ============================================

export const SYSTEM_TEMPLATES = {
  "quick-log": {
    name: "Quick Log",
    description: "Minimum viable logging. Capture that it happened.",
    icon: "zap",
    estimatedMinutes: 1,
  },
  standard: {
    name: "Standard",
    description: "Quick learning loop. Extract the key lesson.",
    icon: "file-text",
    estimatedMinutes: 3,
  },
  "deep-dive": {
    name: "Deep Dive",
    description: "Full forensic analysis. Every detail matters.",
    icon: "microscope",
    estimatedMinutes: 10,
  },
  phoenix: {
    name: "The Phoenix",
    description: "Rise from the ashes. Every master failed here first.",
    icon: "flame",
    estimatedMinutes: 5,
  },
  "cbt-thought-diary": {
    name: "CBT Thought Diary",
    description: "Challenge automatic thoughts. Break the loop.",
    icon: "brain",
    estimatedMinutes: 20,
  },
} as const satisfies Record<string, SystemTemplateInfo>

// ============================================
// UI-Only Slugs (not in DB)
// ============================================

export const UI_TEMPLATE_SLUGS = {
  custom: {
    name: "Custom",
    purpose: "User-created templates",
  },
  favorite: {
    name: "Favorite",
    purpose: "Favorited template display",
  },
  "favorite-locked": {
    name: "Favorite (Locked)",
    purpose: "Locked favorite slot display",
  },
} as const satisfies Record<string, UITemplateInfo>

// ============================================
// Derived Types
// ============================================

/**
 * SystemTemplateSlug - Only templates seeded to database.
 * Derived from SYSTEM_TEMPLATES keys - add/remove templates from SYSTEM_TEMPLATES only.
 */
export type SystemTemplateSlug = keyof typeof SYSTEM_TEMPLATES

/**
 * UITemplateSlug - Display-only slugs for UI purposes.
 * Derived from UI_TEMPLATE_SLUGS keys.
 */
export type UITemplateSlug = keyof typeof UI_TEMPLATE_SLUGS

/**
 * TemplateSlug - All possible template slugs (system + UI).
 */
export type TemplateSlug = SystemTemplateSlug | UITemplateSlug

// ============================================
// Helper Functions
// ============================================

/**
 * Get all system template slugs as an array.
 */
export function getSystemTemplateSlugs(): SystemTemplateSlug[] {
  return Object.keys(SYSTEM_TEMPLATES) as SystemTemplateSlug[]
}

/**
 * Check if a slug is a system template.
 */
export function isSystemTemplate(slug: string): slug is SystemTemplateSlug {
  return slug in SYSTEM_TEMPLATES
}

/**
 * Get template info for a system template.
 * Returns undefined for non-system templates.
 */
export function getSystemTemplateInfo(
  slug: string
): SystemTemplateInfo | undefined {
  if (isSystemTemplate(slug)) {
    return SYSTEM_TEMPLATES[slug]
  }
  return undefined
}

// ============================================
// Template Display Order
// ============================================

/**
 * Defines the logical order for templates in the UI.
 * Lower number = appears first.
 */
export const TEMPLATE_ORDER: Record<string, number> = {
  "quick-log": 1,
  standard: 2,
  phoenix: 3,
  "deep-dive": 4,
  // cbt-thought-diary intentionally not ordered (appears after others)
}

// ============================================
// Template Colors (pure data, no JSX)
// ============================================

export const TEMPLATE_COLORS: Record<TemplateSlug, TemplateColorConfig> = {
  "quick-log": {
    bg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: "bg-amber-500 text-white",
    gradient: "from-amber-500/30 via-amber-500/10 to-orange-500/20",
  },
  standard: {
    bg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: "bg-blue-500 text-white",
    gradient: "from-blue-500/30 via-blue-500/10 to-indigo-500/20",
  },
  "deep-dive": {
    bg: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    icon: "bg-purple-500 text-white",
    gradient: "from-purple-500/30 via-purple-500/10 to-pink-500/20",
  },
  phoenix: {
    bg: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: "bg-red-500 text-white",
    gradient: "from-red-500/30 via-red-500/10 to-orange-500/20",
  },
  "cbt-thought-diary": {
    bg: "bg-indigo-600/10 text-indigo-600 border-indigo-600/20",
    icon: "bg-indigo-600 text-white",
    gradient: "from-indigo-600/30 via-indigo-600/10 to-violet-600/20",
  },
  custom: {
    bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: "bg-emerald-500 text-white",
    gradient: "from-emerald-500/30 via-emerald-500/10 to-teal-500/20",
  },
  favorite: {
    bg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    icon: "bg-rose-500 text-white",
    gradient: "from-rose-500/30 via-rose-500/10 to-pink-500/20",
  },
  "favorite-locked": {
    bg: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    icon: "bg-slate-500 text-white",
    gradient: "from-slate-500/30 via-slate-500/10 to-gray-500/20",
  },
}

// ============================================
// Template Taglines
// ============================================

export const TEMPLATE_TAGLINES: Record<SystemTemplateSlug, string> = {
  "quick-log": "30 seconds. Just the essentials.",
  standard: "The sweet spot. Learn without overthinking.",
  "deep-dive": "When you got close. Extract every lesson.",
  phoenix: "Rise from the ashes. Every master failed here first.",
  "cbt-thought-diary": "Challenge automatic thoughts. Break the loop.",
}
