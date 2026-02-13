/**
 * Keep It Going - Types
 *
 * All types for the keep-it-going scenario module.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Language Types
// ─────────────────────────────────────────────────────────────────────────────

export type Language = "da" | "en"

// ─────────────────────────────────────────────────────────────────────────────
// Situation Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Situation {
  id: string
  location: { da: string; en: string }
  setup: { da: string; en: string }
  yourOpener: { da: string; en: string }
  herFirstResponse: { da: string; en: string }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────────────────────────────────────

export type ConversationPhase = "hook" | "vibe" | "invest" | "close"

export interface KeepItGoingContext {
  situation: Situation
  language: Language
  turnCount: number
  conversationPhase: ConversationPhase
  consecutiveHighScores: number
  averageScore: number
  totalScore: number
  /** Track used response indices to avoid repetition */
  usedResponses: Record<ResponseQuality, number[]>

  // Realistic response state (from data/woman-responses/final)
  /** Woman's current interest level (1-10, starts at 4 = guarded) */
  interestLevel: number
  /** Risk of her ending the conversation (0-3, starts at 0) */
  exitRisk: number
  /** Difficulty notch: -1 = easier, 0 = realistic, 1 = harder */
  realismNotch: -1 | 0 | 1
  /** Consecutive turns scoring 5+ (for momentum bonus) */
  neutralStreak: number
  /** Whether the conversation has ended (she left) */
  isEnded: boolean
  /** Reason the conversation ended, if applicable */
  endReason?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Response Types
// ─────────────────────────────────────────────────────────────────────────────

export type ResponseQuality = "positive" | "neutral" | "deflect" | "skeptical"

export type CloseOutcome = "success" | "hesitant" | "decline"

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EvalResult {
  score: number
  feedback: string
  quality: ResponseQuality
  tags: string[]
  /** trajectory_score from prompt_3+: her current interest level based on full conversation */
  trajectoryScore?: number
  /** trajectory_signals from prompt_3+: explanation of trajectory assessment */
  trajectorySignals?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Realistic Profiles Types
// ─────────────────────────────────────────────────────────────────────────────

export type InterestBucket = "cold" | "guarded" | "curious" | "interested"

export interface BucketProfile {
  interestRange: [number, number]
  wordCount: { min: number; max: number; mean: number }
  questionRateMax: number
  questionBackRate: number
  shouldAskBack: boolean
  deflectRateTarget: number
  busyRateTarget: number
  testRateTarget: number
  exitRateTarget: number
  flirtRate: number
  exitChancePerTurn: number
  styleNotes: string
}

export interface TagEffect {
  interestDelta: number
  exitRiskDelta: number
  description: string
}
