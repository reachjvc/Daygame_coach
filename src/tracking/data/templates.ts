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

import type { TemplateField, FieldReportTemplateRow, ReviewTemplateRow, ReviewType } from "@/src/db/trackingTypes"

// ============================================
// Types
// ============================================

export interface SystemTemplateData {
  name: string
  description: string
  icon: string
  estimatedMinutes: number
  /** Fields always shown in the form. To add a new field to a template, add it HERE. */
  staticFields: TemplateField[]
  /**
   * Fields available for user activation. These are NOT rendered unless their ID
   * is also listed in activeDynamicFields. If you want a field to actually show
   * up in the form, put it in staticFields instead.
   */
  dynamicFields: TemplateField[]
  /** IDs from dynamicFields that are active by default. Empty = none shown. */
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
      {
        id: "conversation",
        type: "textarea",
        label: "Conversation (optional)",
        placeholder: "Me: ...\nHer: ...",
        rows: 6,
        multiple: true,
        allowAudio: true,
      },
    ],
    dynamicFields: [],
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
      {
        id: "conversation",
        type: "textarea",
        label: "Conversation (optional)",
        placeholder: "Me: ...\nHer: ...",
        rows: 8,
        multiple: true,
        allowAudio: true,
      },
    ],
    dynamicFields: [],
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
        multiple: true,
        allowAudio: true,
      },
      {
        id: "key_takeaway",
        type: "text",
        label: "Key takeaway",
        placeholder: "One thing to remember",
      },
      {
        id: "technique",
        type: "multiselect",
        label: "Technique practiced",
        allowCustom: true,
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
        label: "What might you be avoiding or downplaying?",
        placeholder: "Sometimes the real lesson is hiding in plain sight...",
        rows: 3,
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
          "Overgeneralization",
          "Mental filter",
          "Disqualifying the positive",
          "Mind-reading",
          "Fortune-telling",
          "Catastrophizing",
          "Emotional reasoning",
          "Should statements",
          "Labeling",
          "Personalization",
        ],
      },
      {
        id: "distortions_custom",
        type: "text",
        label: "Other distortion (optional)",
        placeholder: "e.g., Social comparison, Control fallacy...",
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
      {
        id: "conversation",
        type: "textarea",
        label: "Conversation (optional)",
        placeholder: "Me: ...\nHer: ...",
        rows: 8,
        multiple: true,
        allowAudio: true,
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
  "deep-dive": 3,
  "cbt-thought-diary": 4,
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
  "cbt-thought-diary": "Challenge automatic thoughts. Break the loop.",
}

// ============================================
// Review Templates (Weekly/Monthly/Quarterly)
// ============================================

export interface SystemReviewTemplateData {
  name: string
  description: string
  icon: string
  estimatedMinutes: number
  reviewType: ReviewType
  staticFields: TemplateField[]
  dynamicFields: TemplateField[]
  activeDynamicFields: string[]
}

export const SYSTEM_REVIEW_TEMPLATES = {
  "quick-win": {
    name: "The Quick Win",
    description: "5 minutes. Celebrate wins, capture one lesson, set your focus.",
    icon: "zap",
    estimatedMinutes: 5,
    reviewType: "weekly" as ReviewType,
    staticFields: [
      {
        id: "wins",
        type: "textarea",
        label: "3 wins this week (any area of life)",
        placeholder: "1. ...\n2. ...\n3. ...",
        rows: 4,
      },
      {
        id: "lesson",
        type: "textarea",
        label: "1 lesson learned",
        placeholder: "What did this week teach you?",
        rows: 2,
      },
      {
        id: "next_focus",
        type: "text",
        label: "Next week's single focus",
        placeholder: "One thing to prioritize...",
      },
    ],
    dynamicFields: [],
    activeDynamicFields: [],
  },

  "operator": {
    name: "The Operator",
    description: "10 minutes. Pattern recognition, self-advice, strategic planning.",
    icon: "target",
    estimatedMinutes: 10,
    reviewType: "weekly" as ReviewType,
    staticFields: [
      {
        id: "went_well",
        type: "textarea",
        label: "What went well? (life + game)",
        placeholder: "Wins, progress, good moments...",
        rows: 3,
      },
      {
        id: "patterns",
        type: "textarea",
        label: "What patterns am I noticing?",
        placeholder: "Recurring themes, habits, tendencies...",
        rows: 3,
      },
      {
        id: "advice_to_past",
        type: "textarea",
        label: "What would I tell last-week-me?",
        placeholder: "Knowing what you know now...",
        rows: 2,
      },
      {
        id: "numbers_snapshot",
        type: "textarea",
        label: "Numbers snapshot (optional)",
        placeholder: "Sessions, approaches, outcomes...",
        rows: 2,
      },
      {
        id: "next_commitment",
        type: "text",
        label: "Next week's commitment",
        placeholder: "Specific, measurable...",
      },
    ],
    dynamicFields: [],
    activeDynamicFields: [],
  },

  "deep-thinker": {
    name: "The Deep Thinker",
    description: "15-20 minutes. Full reflection across all life areas with strategic adjustments.",
    icon: "brain",
    estimatedMinutes: 18,
    reviewType: "weekly" as ReviewType,
    staticFields: [
      {
        id: "wins_all_areas",
        type: "textarea",
        label: "Wins across all life areas",
        placeholder: "Game, career, fitness, relationships, personal growth...",
        rows: 4,
      },
      {
        id: "lessons_insights",
        type: "textarea",
        label: "Lessons & insights",
        placeholder: "What did you learn or realize?",
        rows: 3,
      },
      {
        id: "behavior_patterns",
        type: "textarea",
        label: "Patterns in behavior/results",
        placeholder: "What keeps showing up?",
        rows: 3,
      },
      {
        id: "emotional_state",
        type: "select",
        label: "Emotional/mental state check",
        options: ["Thriving", "Good", "Neutral", "Struggling", "Burned out"],
      },
      {
        id: "gratitude",
        type: "textarea",
        label: "Gratitude moment",
        placeholder: "What are you grateful for this week?",
        rows: 2,
      },
      {
        id: "strategic_adjustments",
        type: "textarea",
        label: "Strategic adjustments",
        placeholder: "What will you do differently?",
        rows: 3,
      },
      {
        id: "detailed_commitment",
        type: "textarea",
        label: "Detailed commitment",
        placeholder: "Primary goal for next week...",
        rows: 2,
      },
      {
        id: "stretch_goal",
        type: "text",
        label: "Stretch goal",
        placeholder: "If everything goes well...",
      },
    ],
    dynamicFields: [],
    activeDynamicFields: [],
  },

  "scaling-weekly": {
    name: "Scaling Weekly",
    description: "10 minutes. Solution-focused scaling questions.",
    icon: "sliders",
    estimatedMinutes: 10,
    reviewType: "weekly" as ReviewType,
    staticFields: [
      {
        id: "scaling",
        type: "slider",
        label: "Where are you this week? (1-10)",
        min: 1,
        max: 10,
      },
      {
        id: "whats_working",
        type: "textarea",
        label: "What's keeping you from being lower?",
        placeholder: "What's going well...",
        rows: 2,
      },
      {
        id: "one_point_higher",
        type: "textarea",
        label: "What would one point higher look like?",
        placeholder: "Specific, achievable...",
        rows: 2,
      },
      {
        id: "best_moment",
        type: "textarea",
        label: "Best moment this week",
        placeholder: "What stood out?",
        rows: 2,
      },
      {
        id: "blocker",
        type: "textarea",
        label: "What's in your way?",
        placeholder: "Be honest...",
        rows: 2,
      },
    ],
    dynamicFields: [],
    activeDynamicFields: [],
  },

  "six-phase": {
    name: "Six-Phase Review",
    description: "20 minutes. Ground, appreciate, examine, process, orient, close.",
    icon: "clipboard-check",
    estimatedMinutes: 20,
    reviewType: "weekly" as ReviewType,
    staticFields: [
      {
        id: "current_state",
        type: "select",
        label: "How are you feeling right now?",
        options: ["Connected & grounded", "Activated / anxious", "Shut down / low energy"],
      },
      {
        id: "glad_moment",
        type: "textarea",
        label: "What's one moment from this week you're most glad happened?",
        placeholder: "Something that mattered...",
        rows: 2,
      },
      {
        id: "strength_used",
        type: "text",
        label: "What strength did you use this week?",
        placeholder: "e.g., courage, persistence, humor...",
      },
      {
        id: "better_than_expected",
        type: "textarea",
        label: "What went better than expected?",
        placeholder: "A pleasant surprise...",
        rows: 2,
      },
      {
        id: "scaling",
        type: "slider",
        label: "Where are you with your focus area? (1-10)",
        min: 1,
        max: 10,
      },
      {
        id: "whats_working",
        type: "textarea",
        label: "What's keeping you from being lower?",
        placeholder: "What's going well...",
        rows: 2,
      },
      {
        id: "blockers",
        type: "textarea",
        label: "What's in your way right now? What are you avoiding?",
        placeholder: "Be honest with yourself...",
        rows: 2,
      },
      {
        id: "input_check",
        type: "select",
        label: "Did you do the actions you committed to?",
        options: ["Yes, fully", "Partially", "Not really", "No commitment last week"],
      },
      {
        id: "challenge_lesson",
        type: "textarea",
        label: "What challenged you this week, and what did it teach you?",
        placeholder: "The hard thing and the lesson...",
        rows: 3,
      },
      {
        id: "benefit_finding",
        type: "textarea",
        label: "Is there anything useful you're taking from this? (It's okay if not yet.)",
        placeholder: "Optional - don't force it",
        rows: 2,
      },
      {
        id: "next_week_focus",
        type: "textarea",
        label: "What's one thing you want to focus on next week?",
        placeholder: "One clear focus...",
        rows: 2,
      },
      {
        id: "experiment",
        type: "text",
        label: "What small experiment would you like to try?",
        placeholder: "Something testable...",
      },
      {
        id: "looking_forward",
        type: "text",
        label: "What are you looking forward to enjoying next week?",
        placeholder: "End on something positive...",
      },
      {
        id: "one_sentence",
        type: "text",
        label: "This week in one sentence...",
        placeholder: "Capture the essence",
      },
    ],
    dynamicFields: [],
    activeDynamicFields: [],
  },
} as const satisfies Record<string, SystemReviewTemplateData>

export type SystemReviewTemplateSlug = keyof typeof SYSTEM_REVIEW_TEMPLATES

/**
 * Get all system review template slugs as an array.
 */
export function getSystemReviewTemplateSlugs(): SystemReviewTemplateSlug[] {
  return Object.keys(SYSTEM_REVIEW_TEMPLATES) as SystemReviewTemplateSlug[]
}

/**
 * Check if a slug is a system review template.
 */
export function isSystemReviewTemplate(slug: string): slug is SystemReviewTemplateSlug {
  return slug in SYSTEM_REVIEW_TEMPLATES
}

/**
 * Get template info for a system review template.
 */
export function getSystemReviewTemplateInfo(
  slug: string
): SystemReviewTemplateData | undefined {
  if (isSystemReviewTemplate(slug)) {
    return SYSTEM_REVIEW_TEMPLATES[slug]
  }
  return undefined
}

/**
 * Convert a system review template to ReviewTemplateRow format.
 */
export function systemReviewTemplateToRow(slug: SystemReviewTemplateSlug): ReviewTemplateRow {
  const template = SYSTEM_REVIEW_TEMPLATES[slug]
  return {
    id: `system-${slug}`,
    user_id: null,
    name: template.name,
    slug: slug,
    description: template.description,
    icon: template.icon,
    estimated_minutes: template.estimatedMinutes,
    review_type: template.reviewType,
    is_system: true,
    base_template_id: null,
    static_fields: template.staticFields as TemplateField[],
    dynamic_fields: template.dynamicFields as TemplateField[],
    active_dynamic_fields: template.activeDynamicFields as string[],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  }
}

/**
 * Get all system review templates as ReviewTemplateRow format.
 */
export function getSystemReviewTemplatesAsRows(reviewType?: ReviewType): ReviewTemplateRow[] {
  return getSystemReviewTemplateSlugs()
    .map(systemReviewTemplateToRow)
    .filter(t => !reviewType || t.review_type === reviewType)
}
