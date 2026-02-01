/**
 * Articles & Research slice types following vertical slice architecture.
 */

// ============================================
// Article types
// ============================================

export type ArticleTier = "flagship" | "standard" | "quick"
export type ArticlePillar = "learning" | "inner-game" | "action" | "tactics"
export type ArticleStatus = "draft" | "published" | "archived"

export interface Article {
  id: string
  slug: string
  title: string
  description: string
  content: string
  tier: ArticleTier
  pillar: ArticlePillar
  status: ArticleStatus
  readTimeMinutes: number
  isPremium: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  metadata: ArticleMetadata
}

export interface ArticleMetadata {
  keywords: string[]
  author: string
  featuredImage?: string
  relatedArticleIds?: string[]
}

// ============================================
// Content Pillar definitions
// ============================================

export interface ContentPillar {
  id: ArticlePillar
  name: string
  description: string
  breadth: "universal" | "broad" | "medium" | "narrow"
  icon: string
}

// ============================================
// Article list/card types
// ============================================

export interface ArticleCard {
  id: string
  slug: string
  title: string
  description: string
  tier: ArticleTier
  pillar: ArticlePillar
  readTimeMinutes: number
  isPremium: boolean
  publishedAt: string | null
}

// ============================================
// Filter/sort types
// ============================================

export interface ArticleFilters {
  pillar?: ArticlePillar
  tier?: ArticleTier
  isPremium?: boolean
}

export type ArticleSortBy = "newest" | "oldest" | "readTime"

// ============================================
// Feedback types for article refinement
// ============================================

/**
 * Feedback types for marking article sections during review.
 * Used in iterative refinement workflow.
 */
export type FeedbackType = "excellent" | "good" | "almost" | "angle" | "ai" | "note" | "source" | "alternatives" | "negative"

export interface FeedbackTypeConfig {
  label: string
  tooltip: string
  color: string
  bg: string
}

/**
 * Standard feedback type configurations.
 * - excellent: Extract learnings, preserve exactly
 * - good: Keep as-is, no changes needed
 * - almost: Close, needs minor tweaks
 * - angle: Wrong direction, rewrite from here onwards
 * - ai: Too obviously AI, complete rewrite needed
 * - note: Custom comment
 * - alternatives: Request 3 alternative versions
 * - negative: Anti-pattern - what NOT to do (extracted to learnings)
 */
export const FEEDBACK_TYPES: Record<FeedbackType, FeedbackTypeConfig> = {
  excellent: {
    label: "Excellent",
    tooltip: "Extract learnings from this - what makes it work?",
    color: "text-purple-600",
    bg: "bg-purple-500/20 border-purple-500/30"
  },
  good: {
    label: "Good",
    tooltip: "Keep exactly as-is, no changes needed",
    color: "text-green-600",
    bg: "bg-green-500/20 border-green-500/30"
  },
  almost: {
    label: "Almost",
    tooltip: "Close but needs minor tweaks",
    color: "text-yellow-600",
    bg: "bg-yellow-500/20 border-yellow-500/30"
  },
  angle: {
    label: "Angle",
    tooltip: "Wrong direction - rewrite everything from this point",
    color: "text-cyan-600",
    bg: "bg-cyan-500/20 border-cyan-500/30"
  },
  ai: {
    label: "AI",
    tooltip: "Too obviously AI-written, needs complete rewrite",
    color: "text-orange-600",
    bg: "bg-orange-500/20 border-orange-500/30"
  },
  note: {
    label: "Note",
    tooltip: "Add a custom comment",
    color: "text-blue-600",
    bg: "bg-blue-500/20 border-blue-500/30"
  },
  source: {
    label: "Needs Source",
    tooltip: "This content needs a source citation - BLOCKS publishing",
    color: "text-red-600 font-bold",
    bg: "bg-red-500/30 border-red-500/50 border-2"
  },
  alternatives: {
    label: "3 Alternatives",
    tooltip: "Request 3 alternative versions with different approaches",
    color: "text-pink-600",
    bg: "bg-pink-500/20 border-pink-500/30"
  },
  negative: {
    label: "Don't Do This",
    tooltip: "Anti-pattern - extract to learnings as what NOT to do",
    color: "text-rose-600",
    bg: "bg-rose-500/20 border-rose-500/30"
  }
}

export interface ArticleFeedbackFlag {
  type: FeedbackType
  quote?: string
  note?: string
  sectionId: string
}

// ============================================
// Learning Suggestion types (for AI-analyzed comments)
// ============================================

export type LearningSuggestionType = "positive" | "anti-pattern"
export type LearningConfidence = "high" | "medium" | "low"

/**
 * A suggested learning extracted from a flag comment by AI analysis.
 * Only medium/high confidence suggestions are shown to the user.
 */
export interface LearningSuggestion {
  type: LearningSuggestionType
  originalFlag: ArticleFeedbackFlag
  suggestedText: string       // The formatted learning to add to writing_style.md
  targetSection: string       // Which section (e.g., "Anti-patterns", "What We Know")
  reasoning: string           // Why AI thinks this is a learning
  confidence: LearningConfidence
}

export interface AnalyzeCommentsRequest {
  flags: ArticleFeedbackFlag[]
}

export interface AnalyzeCommentsResponse {
  suggestions: LearningSuggestion[]
}

export interface ApproveLearningsRequest {
  approvedSuggestions: LearningSuggestion[]
}

export interface ApproveLearningsResponse {
  success: boolean
  updatedSections: string[]
}

// ============================================
// Progressive Commitment types
// ============================================

/**
 * Article workflow phases for progressive commitment.
 * Phase 1: Contract - Define title, thesis, scope
 * Phase 2: Outline - Define section purposes
 * Phase 3: First Draft - Write prose
 * Phase 4: Refinement - Iterate on prose only (structure locked)
 */
export type ArticlePhase = 1 | 2 | 3 | 4

export const PHASE_LABELS: Record<ArticlePhase, string> = {
  1: "Contract",
  2: "Outline",
  3: "Draft",
  4: "Refine"
}

/**
 * Article contract - locked after Phase 1.
 * Defines the article's identity and constraints.
 */
export interface ArticleContract {
  title: string
  thesis: string              // One sentence: the core claim
  targetReader: string        // Who is this for?
  mustInclude: string[]       // Non-negotiable points
  mustNotInclude: string[]    // Explicit scope boundaries
  tone: string                // e.g., "Scientific third-person"
}

/**
 * Outline section - defines what a section must accomplish.
 */
export interface OutlineSection {
  id: string
  purpose: string             // What this section must accomplish
  notes?: string              // Optional guidance
}

/**
 * Article outline - locked after Phase 2.
 */
export interface ArticleOutline {
  sections: OutlineSection[]
  lockedAt?: string           // ISO timestamp
}

/**
 * Structure unlock record - logged when user unlocks structure in Phase 4.
 */
export interface StructureUnlock {
  timestamp: string           // ISO timestamp
  reason: string              // User-provided reason
  previousOutline: ArticleOutline  // Snapshot before unlock
}

/**
 * Phase lock timestamps.
 */
export interface PhaseLocks {
  contractLockedAt?: string   // ISO timestamp
  structureLockedAt?: string  // ISO timestamp
}

/**
 * Article manifest - source of truth for article metadata and progressive state.
 */
export interface ArticleManifest {
  // Identity
  id: string
  title: string
  status: "draft" | "published" | "archived"

  // Context for generation
  requiredContext: {
    research: string[]
    researchIndex: string
    styleGuide: string
    articleIndex: string
  }

  // Legacy section format (pre-progressive commitment)
  sections?: Array<{ id: string; topic: string }>
  keyResearchPoints?: string[]
  notes?: string

  // Progressive commitment (Phase 1+)
  phase: ArticlePhase
  phaseLocks: PhaseLocks
  contract?: ArticleContract
  outline?: ArticleOutline
  structureUnlocks: StructureUnlock[]
}

/**
 * Default contract for new articles or migration.
 */
export const DEFAULT_CONTRACT: ArticleContract = {
  title: "",
  thesis: "",
  targetReader: "",
  mustInclude: [],
  mustNotInclude: [],
  tone: "Conversational but credible"
}

/**
 * Actions for phase transitions.
 */
export type PhaseAction = "lock-contract" | "lock-outline" | "lock-structure" | "unlock-structure"

/**
 * Result of a phase transition attempt.
 */
export interface PhaseTransitionResult {
  success: boolean
  newPhase: number
  error?: string
}

// ============================================
// Draft revision types
// ============================================

export interface ArticleSection {
  id: string
  content: string
}

export interface GenerateRevisedDraftRequest {
  /** Article identifier */
  articleId: string
  /** Article title */
  title: string
  /** Original sections of the draft */
  sections: ArticleSection[]
  /** Structured feedback from the reviewer */
  feedback: ArticleFeedbackFlag[]
  /** Optional writing style guidance */
  styleGuide?: string
  /** Optional article contract for constraint checking */
  contract?: ArticleContract
}

export interface GenerateRevisedDraftResponse {
  /** The revised draft as markdown */
  draft: string
  /** Summary of changes made */
  changesSummary: string[]
  /** Processing metadata */
  meta: {
    model: string
    latencyMs: number
  }
}
