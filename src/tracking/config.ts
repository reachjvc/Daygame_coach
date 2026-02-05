import type { ApproachOutcome, SetType } from "@/src/db/trackingTypes"

/**
 * Tracking slice configuration
 *
 * Pure constants only - no JSX/React. Following QA slice pattern.
 * JSX components (like TEMPLATE_ICONS) are in components/templateIcons.tsx
 */

// ============================================
// Approach Tags
// ============================================

export const APPROACH_TAGS = {
  time: ["day", "night"],
  social: ["solo", "with-wing"],
  movement: ["walking", "stationary"],
  location: ["street", "cafe", "store", "park", "transit"],
} as const

export type ApproachTagCategory = keyof typeof APPROACH_TAGS
export type ApproachTag = typeof APPROACH_TAGS[ApproachTagCategory][number]

// ============================================
// Outcome Options
// ============================================

export const OUTCOME_OPTIONS: { value: ApproachOutcome; label: string; emoji: string; color: string }[] = [
  { value: "blowout", label: "Blowout", emoji: "💨", color: "bg-red-500/20 text-red-500 border-red-500/30" },
  { value: "short", label: "Short", emoji: "⏱️", color: "bg-orange-500/20 text-orange-500 border-orange-500/30" },
  { value: "good", label: "Good", emoji: "👍", color: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
  { value: "number", label: "Number", emoji: "📱", color: "bg-green-500/20 text-green-500 border-green-500/30" },
  { value: "instadate", label: "Instadate", emoji: "🎉", color: "bg-purple-500/20 text-purple-500 border-purple-500/30" },
]

// ============================================
// Mood Options
// ============================================

export const MOOD_OPTIONS = [
  { value: 1, emoji: "😤", label: "Frustrated" },
  { value: 2, emoji: "🙄", label: "Meh" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🔥", label: "On fire" },
]

// ============================================
// Set Type Options
// ============================================

export const SET_TYPE_OPTIONS: { value: SetType; label: string; emoji: string; description: string }[] = [
  { value: "solo", label: "Solo", emoji: "👤", description: "Standard 1-on-1 approach" },
  { value: "two_set", label: "2-Set", emoji: "👭", description: "Two girls together" },
  { value: "three_plus", label: "Group (3+)", emoji: "👥", description: "Group of three or more" },
  { value: "mixed_group", label: "Mixed Group", emoji: "🎭", description: "Group with guys and girls" },
  { value: "mom_daughter", label: "Mom & Daughter", emoji: "👩‍👧", description: "Mother-daughter pair" },
  { value: "sisters", label: "Sisters", emoji: "👯‍♀️", description: "Sisters together" },
  { value: "tourist", label: "Tourist", emoji: "🗺️", description: "Tourist or traveler" },
  { value: "moving", label: "Moving Set", emoji: "🏃‍♀️", description: "Walking/jogging - had to stop them" },
  { value: "seated", label: "Seated", emoji: "🪑", description: "Seated at cafe, bench, etc." },
  { value: "working", label: "Working", emoji: "👔", description: "At work (barista, retail, etc.)" },
  { value: "gym", label: "Gym", emoji: "🏋️", description: "At the gym" },
  { value: "foreign_language", label: "Foreign Language", emoji: "🗣️", description: "Different language spoken" },
  { value: "celebrity_vibes", label: "Model/Celebrity", emoji: "⭐", description: "Model or celebrity lookalike" },
  { value: "double_set", label: "Double Set", emoji: "👯", description: "With wingman (2v2)" },
  { value: "triple_set", label: "Triple Set", emoji: "🎯", description: "With wing (2v3+)" },
]

// ============================================
// Voice Language Options
// ============================================

export interface VoiceLanguageOption {
  code: string
  label: string
  /** Whisper language code (ISO 639-1 or name) */
  whisperLang: string
}

export const DEFAULT_VOICE_LANGUAGE = "en-US"

export const VOICE_LANGUAGES: VoiceLanguageOption[] = [
  { code: "en-US", label: "English (US)", whisperLang: "english" },
  { code: "en-GB", label: "English (UK)", whisperLang: "english" },
  { code: "da-DK", label: "Danish", whisperLang: "danish" },
  { code: "de-DE", label: "German", whisperLang: "german" },
  { code: "es-ES", label: "Spanish", whisperLang: "spanish" },
  { code: "fr-FR", label: "French", whisperLang: "french" },
  { code: "nl-NL", label: "Dutch", whisperLang: "dutch" },
  { code: "pt-BR", label: "Portuguese (BR)", whisperLang: "portuguese" },
  { code: "sv-SE", label: "Swedish", whisperLang: "swedish" },
  { code: "pl-PL", label: "Polish", whisperLang: "polish" },
  { code: "it-IT", label: "Italian", whisperLang: "italian" },
]

export const VALID_VOICE_LANGUAGE_CODES = new Set(VOICE_LANGUAGES.map(l => l.code))

/** Get display label for a voice language code */
export function getVoiceLanguageLabel(code: string): string {
  return VOICE_LANGUAGES.find(l => l.code === code)?.label ?? code
}

/** Get Whisper language name for a voice language code */
export function getWhisperLanguage(code: string): string {
  return VOICE_LANGUAGES.find(l => l.code === code)?.whisperLang ?? "english"
}

// ============================================
// Session Settings
// ============================================

export const SESSION_CONFIG = {
  /** Minimum session duration in hours before calculating accurate approaches/hour */
  MIN_DURATION_FOR_RATE: 0.05, // 3 minutes

  /** Timer update interval in milliseconds */
  TIMER_INTERVAL_MS: 1000,

  /** Default session goal if not specified */
  DEFAULT_GOAL: 10,

  /** Goal presets for quick selection */
  GOAL_PRESETS: [5, 10, 15, 20, 30] as const,

  /**
   * Sessions older than this are considered "stale" and will be auto-closed
   * when starting a new session. This prevents zombie sessions from
   * accumulating if a user forgets to end their session.
   */
  STALE_SESSION_THRESHOLD_HOURS: 12,
} as const

// ============================================
// Stats & Milestones
// ============================================

export const MILESTONE_THRESHOLDS = {
  /** Total approach milestones */
  APPROACHES: [10, 25, 50, 100, 250, 500, 1000] as const,

  /** Session count milestones */
  SESSIONS: [5, 10, 25, 50, 100] as const,

  /** Streak milestones (consecutive days) */
  STREAKS: [3, 7, 14, 30, 60, 90] as const,

  /** Number close milestones */
  NUMBERS: [5, 10, 25, 50, 100] as const,
} as const

// ============================================
// Field Report Settings
// ============================================

export const FIELD_REPORT_CONFIG = {
  /** Maximum approaches to include in a single report */
  MAX_APPROACHES_PER_REPORT: 50,

  /** Minimum session duration to suggest field report (minutes) */
  MIN_SESSION_FOR_REPORT: 30,
} as const

// ============================================
// Session Import Layer
// ============================================

/** Reserved field IDs for session import layer (used across all templates) */
export const SESSION_IMPORT_FIELD_IDS = {
  /** Post-session mood - "How are you feeling now?" */
  POST_SESSION_MOOD: "_post_session_mood",
} as const

// ============================================
// Review Settings
// ============================================

export const REVIEW_CONFIG = {
  /** Days to look back for weekly review */
  WEEKLY_LOOKBACK_DAYS: 7,

  /** Minimum sessions for meaningful weekly review */
  MIN_SESSIONS_FOR_REVIEW: 2,
} as const

// ============================================
// Field Report Template Display
// ============================================
// MOVED to src/tracking/data/templates.ts (single source of truth)
// Import TEMPLATE_COLORS, TEMPLATE_TAGLINES from "@/src/tracking/data"

// ============================================
// Emoji Mood Options for Field Reports
// ============================================

export const MOOD_EMOJI_OPTIONS = [
  { value: 1, emoji: "😤", label: "Frustrated" },
  { value: 2, emoji: "🙄", label: "Meh" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🔥", label: "On Fire" },
] as const

// ============================================
// Custom Report Builder - Field Library
// ============================================

import type { FieldCategory, FieldDefinition, CategoryInfo } from "./types"

/**
 * Category metadata for display in the field library.
 * Icons are rendered separately via CategoryIcon component.
 */
export const CATEGORY_INFO: Record<FieldCategory, CategoryInfo> = {
  quick_capture: {
    label: "Quick Capture",
    color: "amber",
    description: "Fast fields for logging in under 30 seconds",
  },
  emotional: {
    label: "Emotional",
    color: "pink",
    description: "Track how you feel and process emotions",
  },
  analysis: {
    label: "Analysis",
    color: "indigo",
    description: "Deep dive into patterns and insights",
  },
  action: {
    label: "Action & Planning",
    color: "green",
    description: "What to do next, changes to make",
  },
  skill: {
    label: "Skill Focus",
    color: "orange",
    description: "Deliberate practice and technique",
  },
  context: {
    label: "Context",
    color: "slate",
    description: "External factors: location, time, energy",
  },
  cognitive: {
    label: "Cognitive",
    color: "violet",
    description: "Thought patterns, reframes, CBT techniques",
  },
}

/**
 * Master field library - every unique field from all templates.
 * Organized by category for the custom report builder.
 */
export const FIELD_LIBRARY: FieldDefinition[] = [
  // ============ QUICK CAPTURE ============
  // NOTE: "mood" field removed - post-session mood is now handled by SessionImportSection
  // with the standardized 5-emoji "How are you feeling now?" picker
  {
    id: "approaches",
    type: "number",
    label: "How many approaches?",
    placeholder: "0",
    min: 0,
    max: 100,
    category: "quick_capture",
    description: "Total approaches this session",
    usedIn: ["Quick Log", "Standard", "Deep Dive"],
  },
  {
    id: "what_happened",
    type: "text",
    label: "What happened?",
    placeholder: "Brief description",
    category: "quick_capture",
    description: "Factual description without judgment",
    usedIn: ["The Driscoll", "The Friend Test"],
  },
  {
    id: "best_moment",
    type: "textarea",
    label: "Best moment",
    placeholder: "What stood out positively?",
    rows: 2,
    category: "quick_capture",
    description: "Capture the highlight",
    usedIn: ["Standard", "The Pulse", "Deep Dive"],
  },
  {
    id: "what_went_well",
    type: "textarea",
    label: "What went well?",
    placeholder: "Celebrate something...",
    rows: 2,
    category: "quick_capture",
    description: "Pure positive capture",
    usedIn: ["The Win", "Voice Memo", "Well-Better-How"],
  },
  {
    id: "quick_note",
    type: "text",
    label: "Quick note",
    placeholder: "Anything worth noting?",
    category: "quick_capture",
    description: "Free-form quick note",
    usedIn: ["Quick Log"],
  },

  // ============ EMOTIONAL ============
  {
    id: "feeling_now",
    type: "select",
    label: "How are you feeling now?",
    options: ["Energized", "Neutral", "Drained", "Frustrated"],
    category: "emotional",
    description: "Post-session emotional state",
    usedIn: ["Voice Memo"],
  },
  {
    id: "feelings",
    type: "textarea",
    label: "What were you thinking and feeling?",
    placeholder: "During the interaction I felt...",
    rows: 2,
    category: "emotional",
    description: "Full emotional inventory",
    usedIn: ["Gibbs' Cycle"],
  },
  {
    id: "mad",
    type: "text",
    label: "What made you MAD?",
    placeholder: "Frustrations...",
    category: "emotional",
    description: "Frustration bucket",
    usedIn: ["Mad-Sad-Glad"],
  },
  {
    id: "sad",
    type: "text",
    label: "What made you SAD?",
    placeholder: "Disappointments...",
    category: "emotional",
    description: "Disappointment bucket",
    usedIn: ["Mad-Sad-Glad"],
  },
  {
    id: "glad",
    type: "text",
    label: "What made you GLAD?",
    placeholder: "Wins...",
    category: "emotional",
    description: "Wins bucket",
    usedIn: ["Mad-Sad-Glad"],
  },
  {
    id: "self_compassion",
    type: "textarea",
    label: "Write one kind thing to yourself",
    placeholder: "I want to remind myself that...",
    rows: 2,
    category: "emotional",
    description: "Self-compassion close",
    usedIn: ["Phoenix Protocol"],
  },
  {
    id: "feels_big",
    type: "text",
    label: "What feels big right now?",
    placeholder: "Right now it feels like...",
    category: "emotional",
    description: "Acknowledge current intensity",
    usedIn: ["Five Year View"],
  },
  {
    id: "free_write",
    type: "textarea",
    label: "Free write (no editing, no judgment)",
    placeholder: "Start writing and don't stop...",
    rows: 10,
    category: "emotional",
    description: "Unstructured emotional expression",
    usedIn: ["The Free Write"],
  },

  // ============ ANALYSIS ============
  {
    id: "why_ended",
    type: "textarea",
    label: "Why did it end?",
    placeholder: "What caused the interaction to stop?",
    rows: 3,
    category: "analysis",
    description: "Critical diagnostic question",
    usedIn: ["Standard", "Deep Dive", "Critical Question"],
  },
  {
    id: "what_learned",
    type: "text",
    label: "What did you learn?",
    placeholder: "Key insight",
    category: "analysis",
    description: "Extract the lesson",
    usedIn: ["The Driscoll", "Driscoll Model"],
  },
  {
    id: "key_takeaway",
    type: "text",
    label: "Key takeaway",
    placeholder: "One thing to remember",
    category: "analysis",
    description: "Distill the insight",
    usedIn: ["Standard", "Deep Dive", "Decision Quality"],
  },
  {
    id: "pattern_check",
    type: "textarea",
    label: "Pattern check",
    placeholder: "I'm noticing a pattern of...",
    rows: 2,
    category: "analysis",
    description: "Connect to past patterns",
    usedIn: ["Pattern Hunter"],
  },
  {
    id: "hinge_moment",
    type: "textarea",
    label: "The hinge moment",
    placeholder: "The key decision point...",
    rows: 3,
    category: "analysis",
    description: "Identify the turning point",
    usedIn: ["Deep Dive"],
  },
  {
    id: "thirty_seconds_before",
    type: "textarea",
    label: "30 seconds before",
    placeholder: "What happened leading up to it?",
    rows: 3,
    category: "analysis",
    description: "Analyze the setup",
    usedIn: ["Deep Dive", "The Rewind"],
  },
  {
    id: "not_admitting",
    type: "textarea",
    label: "What are you not admitting to yourself?",
    placeholder: "The hard truth is...",
    rows: 3,
    category: "analysis",
    description: "Radical honesty prompt",
    usedIn: ["Deep Dive"],
  },
  {
    id: "gap_analysis",
    type: "textarea",
    label: "Gap analysis: Intended vs. actual",
    placeholder: "The gaps were...",
    rows: 3,
    category: "analysis",
    description: "AAR gap identification",
    usedIn: ["Strategic AAR"],
  },
  {
    id: "root_cause",
    type: "textarea",
    label: "Root cause",
    placeholder: "The underlying reason was...",
    rows: 2,
    category: "analysis",
    description: "Dig deeper into why",
    usedIn: ["Strategic AAR"],
  },
  {
    id: "skill_vs_variance",
    type: "textarea",
    label: "Skill vs. variance",
    placeholder: "In my control: ... Outside my control: ...",
    rows: 2,
    category: "analysis",
    description: "Separate controllables",
    usedIn: ["Pattern Hunter"],
  },

  // ============ ACTION & PLANNING ============
  {
    id: "do_differently",
    type: "textarea",
    label: "What would you do differently?",
    placeholder: "Next time...",
    rows: 2,
    category: "action",
    description: "Forward-looking improvement",
    usedIn: ["Standard", "Deep Dive", "Critical Question", "Driscoll"],
  },
  {
    id: "intention",
    type: "text",
    label: "What was your intention/goal?",
    placeholder: "I wanted to...",
    category: "action",
    description: "Pre-session intention",
    usedIn: ["Quick Log", "Standard", "Deep Dive", "Intention Check"],
  },
  {
    id: "if_clause",
    type: "text",
    label: "IF this comes up again...",
    placeholder: "If I encounter...",
    category: "action",
    description: "Implementation intention trigger",
    usedIn: ["The If-Then"],
  },
  {
    id: "then_clause",
    type: "text",
    label: "THEN I will...",
    placeholder: "Then I will...",
    category: "action",
    description: "Implementation intention response",
    usedIn: ["The If-Then"],
  },
  {
    id: "start",
    type: "text",
    label: "START: One new thing to try",
    placeholder: "I'll start...",
    category: "action",
    description: "New behavior to add",
    usedIn: ["Start-Stop-Continue"],
  },
  {
    id: "stop",
    type: "text",
    label: "STOP: One thing to drop",
    placeholder: "I'll stop...",
    category: "action",
    description: "Behavior to eliminate",
    usedIn: ["Start-Stop-Continue"],
  },
  {
    id: "continue",
    type: "text",
    label: "CONTINUE: One thing working",
    placeholder: "I'll keep doing...",
    category: "action",
    description: "Behavior to maintain",
    usedIn: ["Start-Stop-Continue"],
  },
  {
    id: "action_plan",
    type: "textarea",
    label: "Action plan for next time",
    placeholder: "Next time I will specifically...",
    rows: 2,
    category: "action",
    description: "Concrete next steps",
    usedIn: ["Gibbs' Cycle", "Phoenix Protocol"],
  },
  {
    id: "one_focus",
    type: "text",
    label: "ONE thing to work on next",
    placeholder: "Next session I will focus on...",
    category: "action",
    description: "Single priority focus",
    usedIn: ["Pattern Hunter"],
  },
  {
    id: "experiment",
    type: "text",
    label: "One experiment to try",
    placeholder: "Next time I'll experiment with...",
    category: "action",
    description: "Learning-oriented action",
    usedIn: ["Learning Goal"],
  },

  // ============ SKILL FOCUS ============
  {
    id: "technique",
    type: "multiselect",
    label: "Technique practiced",
    options: ["Push-pull", "Cold read", "Statement of intent", "Compliance test", "Time bridge", "Tease", "Qualification", "Role play", "Assumption stacking", "Future projection"],
    category: "skill",
    description: "Tag techniques used",
    usedIn: ["Deep Dive"],
  },
  {
    id: "skill_targeted",
    type: "text",
    label: "What specific skill did you target?",
    placeholder: "I was working on...",
    category: "skill",
    description: "Deliberate practice focus",
    usedIn: ["The Skill Focus"],
  },
  {
    id: "concentration",
    type: "select",
    label: "Concentration level",
    options: ["1-3 Distracted", "4-6 Moderate", "7-8 Focused", "9-10 Flow state"],
    category: "skill",
    description: "Rate your focus",
    usedIn: ["The Skill Focus"],
  },
  {
    id: "feedback",
    type: "text",
    label: "What feedback did you get?",
    placeholder: "I noticed that...",
    category: "skill",
    description: "Learning signal",
    usedIn: ["The Skill Focus"],
  },
  {
    id: "one_moment",
    type: "text",
    label: "The ONE moment that mattered",
    placeholder: "The key moment was when...",
    category: "skill",
    description: "Hyper-focused analysis",
    usedIn: ["The One Thing"],
  },
  {
    id: "right_call",
    type: "select",
    label: "Was it the right call?",
    options: ["Yes", "No", "Unsure"],
    category: "skill",
    description: "Decision quality assessment",
    usedIn: ["The One Thing"],
  },
  {
    id: "perception_gap",
    type: "text",
    label: "How do you think she perceived you?",
    placeholder: "She probably thought I was...",
    category: "skill",
    description: "360-style self-assessment",
    usedIn: ["The Perception Gap"],
  },

  // ============ CONTEXT ============
  {
    id: "location",
    type: "text",
    label: "Location",
    placeholder: "Where were you?",
    category: "context",
    description: "Track where you were",
    usedIn: ["Context Check"],
  },
  {
    id: "time_of_day",
    type: "select",
    label: "Time of day",
    options: ["Morning", "Afternoon", "Evening", "Night"],
    category: "context",
    description: "When did it happen?",
    usedIn: ["Context Check"],
  },
  {
    id: "energy",
    type: "select",
    label: "Energy level",
    options: ["1-3 Low", "4-6 Medium", "7-10 High"],
    category: "context",
    description: "Pre-session energy",
    usedIn: ["Pre-Flight", "Context Check", "Pattern Hunter"],
  },
  {
    id: "pre_state",
    type: "select",
    label: "Pre-state: Mindset going in",
    options: ["1-3 Low", "4-6 Medium", "7-10 High"],
    category: "context",
    description: "Mental state entering session",
    usedIn: ["Decision Quality"],
  },
  {
    id: "helped",
    type: "text",
    label: "External factors that helped",
    placeholder: "Things that helped...",
    category: "context",
    description: "Positive external factors",
    usedIn: ["Context Check"],
  },
  {
    id: "hurt",
    type: "text",
    label: "External factors that hurt",
    placeholder: "Things that hurt...",
    category: "context",
    description: "Negative external factors",
    usedIn: ["Context Check"],
  },

  // ============ COGNITIVE (CBT) ============
  {
    id: "automatic_thoughts",
    type: "textarea",
    label: "Automatic thoughts",
    placeholder: "What went through your mind?",
    rows: 2,
    category: "cognitive",
    description: "Capture automatic thinking",
    usedIn: ["CBT Thought Diary"],
  },
  {
    id: "distortions",
    type: "select",
    label: "Cognitive distortion",
    options: ["All-or-nothing", "Overgeneralization", "Mental filter", "Disqualifying the positive", "Mind-reading", "Fortune-telling", "Catastrophizing", "Emotional reasoning", "Should statements", "Labeling", "Personalization"],
    category: "cognitive",
    description: "Identify thought traps (Burns' 10 cognitive distortions)",
    usedIn: ["CBT Thought Diary", "Quick Reframe"],
  },
  {
    id: "distortions_custom",
    type: "text",
    label: "Custom distortion",
    placeholder: "Describe your own distortion pattern...",
    category: "cognitive",
    description: "Write your own cognitive distortion if not listed",
    usedIn: ["CBT Thought Diary"],
  },
  {
    id: "evidence_for",
    type: "textarea",
    label: "Evidence FOR the thought",
    placeholder: "What supports it?",
    rows: 2,
    category: "cognitive",
    description: "Examine supporting evidence",
    usedIn: ["CBT Thought Diary"],
  },
  {
    id: "evidence_against",
    type: "textarea",
    label: "Evidence AGAINST the thought",
    placeholder: "What contradicts it?",
    rows: 2,
    category: "cognitive",
    description: "Challenge the thought",
    usedIn: ["CBT Thought Diary", "Quick Reframe"],
  },
  {
    id: "balanced_thought",
    type: "textarea",
    label: "Balanced thought",
    placeholder: "A more realistic perspective...",
    rows: 2,
    category: "cognitive",
    description: "Reframe to balanced view",
    usedIn: ["CBT Thought Diary", "Quick Reframe"],
  },
  {
    id: "friend_test",
    type: "textarea",
    label: "What would you tell a friend?",
    placeholder: "I would tell them...",
    rows: 3,
    category: "cognitive",
    description: "Self-compassion through distance",
    usedIn: ["Phoenix Protocol", "The Friend Test", "CBT Thought Diary"],
  },
  {
    id: "five_years",
    type: "text",
    label: "How will you view this in 5 years?",
    placeholder: "In 5 years I'll probably...",
    category: "cognitive",
    description: "Temporal distancing",
    usedIn: ["Five Year View"],
  },
  {
    id: "reframe",
    type: "textarea",
    label: "Reframe: Another way to see this",
    placeholder: "Another perspective could be...",
    rows: 2,
    category: "cognitive",
    description: "Alternative perspective",
    usedIn: ["Phoenix Protocol"],
  },
]

/**
 * Suggested fields for new users.
 * These appear muted in the UI but are easily addable.
 */
export const SUGGESTED_FIELD_IDS = [
  "approaches",
  "best_moment",
  "why_ended",
  "do_differently",
  "key_takeaway",
] as const

// ============================================
// Default Session Intention Suggestions
// ============================================

export const DEFAULT_SESSION_SUGGESTIONS: {
  sessionFocus: string[]
  techniqueFocus: string[]
  locations: string[]
} = {
  sessionFocus: [
    "Be more playful",
    "Hold eye contact longer",
    "Speak slower",
    "Take more pauses",
    "Be more physical",
    "Lead the conversation",
    "Show more intent",
    "Stay in set longer",
    "Be more present",
    "Express my personality more",
  ],
  techniqueFocus: [
    "Cold reads",
    "Push-pull",
    "Assumption stacking",
    "Roleplay",
    "Teasing",
    "Storytelling",
    "Qualify her",
    "Direct openers",
    "Indirect openers",
    "Situational openers",
  ],
  locations: [
    "Downtown",
    "Mall",
    "Park",
    "Coffee shop",
    "Street",
    "Bookstore",
    "Supermarket",
    "Train station",
    "University area",
    "Shopping district",
  ],
}
