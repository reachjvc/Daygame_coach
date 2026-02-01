/**
 * Zod validation schemas for articles API routes.
 * Ensures all incoming data is properly validated before filesystem operations.
 */

import { z } from "zod"

// ============================================
// Security: Safe Article ID
// ============================================

/**
 * Validates article IDs to prevent path traversal attacks.
 * Only allows alphanumeric characters, hyphens, and underscores.
 */
export const SafeArticleIdSchema = z
  .string()
  .min(1, "Article ID is required")
  .max(100, "Article ID too long")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Article ID must only contain letters, numbers, hyphens, and underscores"
  )

// ============================================
// Feedback Type Enums
// ============================================

export const FeedbackTypeSchema = z.enum([
  "excellent",
  "good",
  "almost",
  "angle",
  "ai",
  "note",
  "source",
  "alternatives",
  "negative",
])

export const LearningSuggestionTypeSchema = z.enum(["positive", "anti-pattern"])

export const LearningConfidenceSchema = z.enum(["high", "medium", "low"])

// ============================================
// Phase Action Enum
// ============================================

export const PhaseActionSchema = z.enum([
  "lock-contract",
  "lock-outline",
  "lock-structure",
])

// ============================================
// Article Contract Schema
// ============================================

export const ArticleContractSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  thesis: z.string().min(1, "Thesis is required").max(500),
  targetReader: z.string().min(1, "Target reader is required").max(200),
  mustInclude: z.array(z.string().max(200)).max(20),
  mustNotInclude: z.array(z.string().max(200)).max(20),
  tone: z.string().min(1, "Tone is required").max(100),
})

// ============================================
// Outline Schema
// ============================================

export const OutlineSectionSchema = z.object({
  id: z
    .string()
    .min(1, "Section ID is required")
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Section ID must be alphanumeric"),
  purpose: z.string().min(1, "Section purpose is required").max(500),
  notes: z.string().max(1000).optional(),
})

export const ArticleOutlineSchema = z.object({
  sections: z.array(OutlineSectionSchema).min(1).max(20),
  lockedAt: z.string().datetime().optional(),
})

// ============================================
// Feedback Flag Schema
// ============================================

export const ArticleFeedbackFlagSchema = z.object({
  type: FeedbackTypeSchema,
  sectionId: z.string().min(1, "Section ID is required"),
  quote: z.string().max(500).optional(),
  note: z.string().max(2000).optional(),
})

// ============================================
// Learning Suggestion Schema
// ============================================

export const LearningSuggestionSchema = z.object({
  type: LearningSuggestionTypeSchema,
  originalFlag: ArticleFeedbackFlagSchema,
  suggestedText: z.string().min(1).max(1000),
  targetSection: z.string().min(1).max(100),
  reasoning: z.string().min(1).max(500),
  confidence: LearningConfidenceSchema,
})

// ============================================
// API Request Schemas
// ============================================

/**
 * Phase transition request (POST /api/test/articles/phase)
 */
export const PhaseTransitionRequestSchema = z
  .object({
    articleId: SafeArticleIdSchema,
    action: PhaseActionSchema,
    contract: ArticleContractSchema.optional(),
    outline: ArticleOutlineSchema.optional(),
  })
  .refine(
    (data) => {
      // Contract required for lock-contract action
      if (data.action === "lock-contract" && !data.contract) {
        return false
      }
      return true
    },
    { message: "Contract is required for lock-contract action", path: ["contract"] }
  )
  .refine(
    (data) => {
      // Outline required for lock-outline action
      if (data.action === "lock-outline" && !data.outline) {
        return false
      }
      return true
    },
    { message: "Outline is required for lock-outline action", path: ["outline"] }
  )

/**
 * Unlock structure request (POST /api/test/articles/unlock)
 */
export const UnlockStructureRequestSchema = z.object({
  articleId: SafeArticleIdSchema,
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(1000, "Reason too long"),
})

/**
 * Analyze comments request (POST /api/test/analyze-comments)
 */
export const AnalyzeCommentsRequestSchema = z.object({
  flags: z.array(ArticleFeedbackFlagSchema).min(1, "At least one flag is required"),
})

/**
 * Approve learnings request (PUT /api/test/analyze-comments)
 */
export const ApproveLearningsRequestSchema = z.object({
  approvedSuggestions: z.array(LearningSuggestionSchema),
})

// ============================================
// Type Exports (inferred from schemas)
// ============================================

export type SafeArticleId = z.infer<typeof SafeArticleIdSchema>
export type PhaseTransitionRequest = z.infer<typeof PhaseTransitionRequestSchema>
export type UnlockStructureRequest = z.infer<typeof UnlockStructureRequestSchema>
export type AnalyzeCommentsRequest = z.infer<typeof AnalyzeCommentsRequestSchema>
export type ApproveLearningsRequest = z.infer<typeof ApproveLearningsRequestSchema>
