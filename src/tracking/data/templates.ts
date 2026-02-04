/**
 * Template data - Single source of truth for system templates.
 *
 * System templates are served directly from code (no database seeding needed).
 * User-created custom templates are still stored in the database.
 *
 * Following the milestone pattern (see milestones.ts):
 * - ALL data in one place
 * - Types derived from data
 * - No sync issues between code and database
 */

import type { TemplateField, FieldReportTemplateRow } from "@/src/db/trackingTypes"

// ============================================
// Types
// ============================================

export interface SystemTemplateData {
  name: string
  description: string
  icon: string
  estimatedMinutes: number
  staticFields: TemplateField[]
  dynamicFields: TemplateField[]
  activeDynamicFields: string[]
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
// System Templates (served from code, no DB)
// ============================================

export const SYSTEM_TEMPLATES = {
  "quick-log": {
    name: "Quick Log",
    description: "Minimum viable logging. Capture that it happened.",
    icon: "zap",
    estimatedMinutes: 2,
    staticFields: [
      {
        id: "approaches",
        type: "number",
        label: "Approaches",
        placeholder: "How many?",
        min: 0,
      },
      {
        id: "intention",
        type: "text",
        label: "What was your intention/goal?",
        placeholder: "What were you trying to do?",
      },
      {
        id: "best_moment",
        type: "textarea",
        label: "Best moment",
        placeholder: "What stood out positively?",
        rows: 2,
      },
      {
        id: "quick_note",
        type: "text",
        label: "Quick note",
        placeholder: "Anything worth noting?",
      },
    ],
    dynamicFields: [
      {
        id: "conversation",
        type: "textarea",
        label: "Add conversation",
        placeholder: "Me: ...\nHer: ...",
        rows: 6,
      },
    ],
    activeDynamicFields: [],
  },

  standard: {
    name: "Standard",
    description: "Quick learning loop. Extract the key lesson.",
    icon: "file-text",
    estimatedMinutes: 4,
    staticFields: [
      {
        id: "approaches",
        type: "number",
        label: "Approaches",
        placeholder: "How many?",
        min: 0,
      },
      {
        id: "intention",
        type: "text",
        label: "What was your intention/goal?",
        placeholder: "What were you trying to do?",
      },
      {
        id: "best_moment",
        type: "textarea",
        label: "Best moment",
        placeholder: "What stood out positively?",
        rows: 2,
      },
      {
        id: "why_ended",
        type: "textarea",
        label: "Your best interaction - why did it end?",
        placeholder: "Compare to your intention...",
        rows: 3,
      },
      {
        id: "do_differently",
        type: "textarea",
        label: "What would you do differently?",
        placeholder: "If you could replay it...",
        rows: 2,
      },
      {
        id: "key_takeaway",
        type: "text",
        label: "Key takeaway",
        placeholder: "One thing to remember",
      },
    ],
    dynamicFields: [
      {
        id: "conversation",
        type: "textarea",
        label: "Add conversation for AI analysis",
        placeholder: "Me: ...\nHer: ...",
        rows: 8,
      },
    ],
    activeDynamicFields: [],
  },

  "deep-dive": {
    name: "Deep Dive",
    description: "Full forensic analysis for notable sessions.",
    icon: "microscope",
    estimatedMinutes: 15,
    staticFields: [
      {
        id: "approaches",
        type: "number",
        label: "Approaches",
        placeholder: "How many?",
        min: 0,
      },
      {
        id: "intention",
        type: "text",
        label: "What was your intention/goal?",
        placeholder: "What were you trying to do?",
      },
      {
        id: "best_moment",
        type: "textarea",
        label: "Best moment",
        placeholder: "What stood out positively?",
        rows: 2,
      },
      {
        id: "conversation",
        type: "textarea",
        label: "Conversation",
        placeholder: "Me: ...\nHer: ...",
        rows: 8,
      },
      {
        id: "technique",
        type: "multiselect",
        label: "Technique practiced",
        options: [
          "Push-pull",
          "Cold read",
          "Statement of intent",
          "Compliance test",
          "Time bridge",
          "Tease",
          "Qualification",
          "Role play",
          "Assumption stacking",
          "Future projection",
        ],
      },
      {
        id: "thirty_seconds_before",
        type: "textarea",
        label: "What happened in the 30 seconds before the key moment?",
        placeholder: "The lead-up often reveals more than the moment itself...",
        rows: 3,
      },
      {
        id: "hinge_moment",
        type: "textarea",
        label: "The hinge moment (where it could have gone differently)",
        placeholder: "Describe the decision point...",
        rows: 3,
      },
      {
        id: "why_ended",
        type: "textarea",
        label: "Why did it end?",
        placeholder: "Compare to your intention...",
        rows: 3,
      },
      {
        id: "do_differently",
        type: "textarea",
        label: "What would you do differently?",
        placeholder: "If you could replay it...",
        rows: 2,
      },
      {
        id: "sticking_point",
        type: "select",
        label: "Did your sticking point show up?",
        options: ["Yes", "No"],
      },
      {
        id: "sticking_point_detail",
        type: "textarea",
        label: "If yes, describe",
        placeholder: "What happened?",
        rows: 2,
      },
      {
        id: "not_admitting",
        type: "textarea",
        label: "What are you not admitting to yourself?",
        placeholder: "Be honest - this is private...",
        rows: 3,
      },
      {
        id: "key_takeaway",
        type: "text",
        label: "Key takeaway",
        placeholder: "One thing to remember",
      },
    ],
    dynamicFields: [],
    activeDynamicFields: [],
  },

  phoenix: {
    name: "The Phoenix",
    description: "Turn harsh rejections into growth fuel",
    icon: "flame",
    estimatedMinutes: 5,
    staticFields: [
      {
        id: "approaches",
        type: "number",
        label: "Approaches",
        placeholder: "How many?",
        min: 0,
      },
      {
        id: "what_happened",
        type: "textarea",
        label: "What happened? (factual, without judgment)",
        placeholder: "Describe what actually occurred...",
        rows: 3,
      },
      {
        id: "how_it_made_you_feel",
        type: "textarea",
        label: "How it made you feel",
        placeholder: "Emotional processing - be honest...",
        rows: 3,
      },
      {
        id: "why_it_happened",
        type: "textarea",
        label: "Why it might have happened",
        placeholder: "Analysis without self-blame...",
        rows: 3,
      },
      {
        id: "tell_friend",
        type: "textarea",
        label: "What would you tell a friend who had this experience?",
        placeholder: "Be compassionate with yourself...",
        rows: 2,
      },
      {
        id: "do_it_again",
        type: "select",
        label: "Would you do it again?",
        options: ["Yes, definitely", "Yes, with adjustments", "Need to think about it", "Probably not"],
      },
      {
        id: "key_takeaway",
        type: "text",
        label: "Key takeaway",
        placeholder: "One thing to remember",
      },
    ],
    dynamicFields: [],
    activeDynamicFields: [],
  },

  "cbt-thought-diary": {
    name: "CBT Thought Diary",
    description: "Identify and reframe negative thought patterns",
    icon: "brain",
    estimatedMinutes: 20,
    staticFields: [
      {
        id: "approaches",
        type: "number",
        label: "Approaches",
        placeholder: "How many?",
        min: 0,
      },
      {
        id: "situation",
        type: "textarea",
        label: "1. Situation: What happened? (objective facts only)",
        placeholder: "The factual situation was...",
        rows: 2,
      },
      {
        id: "automatic_thoughts",
        type: "textarea",
        label: "2. Automatic Thoughts: What went through your mind?",
        placeholder: "I thought to myself...",
        rows: 2,
      },
      {
        id: "emotions",
        type: "text",
        label: "3. Emotions: What did you feel? Rate intensity (0-100)",
        placeholder: "e.g., Anxious (70), Embarrassed (50)",
      },
      {
        id: "distortions",
        type: "select",
        label: "4. Cognitive Distortions: Which apply?",
        options: [
          "All-or-nothing",
          "Catastrophizing",
          "Mind-reading",
          "Overgeneralization",
          "Discounting positives",
          "Multiple/Other",
        ],
      },
      {
        id: "evidence_for",
        type: "textarea",
        label: "5. Evidence FOR the thought: What supports it being true?",
        placeholder: "Evidence that supports this thought...",
        rows: 2,
      },
      {
        id: "evidence_against",
        type: "textarea",
        label: "6. Evidence AGAINST: What contradicts it? What would you tell a friend?",
        placeholder: "Evidence against this thought / what I'd tell a friend...",
        rows: 2,
      },
      {
        id: "balanced_thought",
        type: "textarea",
        label: "7. Balanced Thought: More realistic perspective",
        placeholder: "A more balanced way to see this is...",
        rows: 2,
      },
      {
        id: "outcome",
        type: "text",
        label: "8. Outcome: How do you feel now? (0-100)",
        placeholder: "e.g., Anxious (30), Hopeful (60)",
      },
    ],
    dynamicFields: [],
    activeDynamicFields: [],
  },
} as const satisfies Record<string, SystemTemplateData>

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
 * SystemTemplateSlug - Only system templates (served from code).
 * Derived from SYSTEM_TEMPLATES keys.
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
): SystemTemplateData | undefined {
  if (isSystemTemplate(slug)) {
    return SYSTEM_TEMPLATES[slug]
  }
  return undefined
}

/**
 * Convert a system template to FieldReportTemplateRow format.
 * This allows system templates to be used interchangeably with DB templates.
 */
export function systemTemplateToRow(slug: SystemTemplateSlug): FieldReportTemplateRow {
  const template = SYSTEM_TEMPLATES[slug]
  return {
    id: `system-${slug}`, // Synthetic ID for system templates
    user_id: null,
    name: template.name,
    slug: slug,
    description: template.description,
    icon: template.icon,
    estimated_minutes: template.estimatedMinutes,
    is_system: true,
    base_template_id: null,
    static_fields: template.staticFields as TemplateField[],
    dynamic_fields: template.dynamicFields as TemplateField[],
    active_dynamic_fields: template.activeDynamicFields as string[],
    created_at: "2024-01-01T00:00:00Z", // Static date for system templates
    updated_at: "2024-01-01T00:00:00Z",
  }
}

/**
 * Get all system templates as FieldReportTemplateRow format.
 */
export function getSystemTemplatesAsRows(): FieldReportTemplateRow[] {
  return getSystemTemplateSlugs().map(systemTemplateToRow)
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
  "cbt-thought-diary": 5,
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
