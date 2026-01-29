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
export type FeedbackType = "excellent" | "good" | "almost" | "angle" | "ai" | "note"

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
  }
}

export interface ArticleFeedbackFlag {
  type: FeedbackType
  quote?: string
  note?: string
  sectionId: string
}

// ============================================
// Content alternatives (AI generation)
// ============================================

export type ContentUnit = "sentence" | "paragraph" | "section"

export interface ContentAlternative {
  /** The alternative content */
  content: string
  /** What approach/angle this alternative takes */
  approach: string
  /** Brief explanation of why this works */
  rationale: string
}

export interface GenerateAlternativesRequest {
  /** The original content to generate alternatives for */
  originalContent: string
  /** What type of content unit this is */
  unit: ContentUnit
  /** Optional surrounding context for better alternatives */
  context?: {
    /** What comes before this content */
    before?: string
    /** What comes after this content */
    after?: string
    /** The article title/topic */
    articleTitle?: string
    /** The article pillar for tone guidance */
    pillar?: ArticlePillar
  }
}

export interface GenerateAlternativesResponse {
  alternatives: ContentAlternative[]
  /** Processing metadata */
  meta: {
    model: string
    latencyMs: number
  }
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
