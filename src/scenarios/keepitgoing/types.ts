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
}

// ─────────────────────────────────────────────────────────────────────────────
// Response Types
// ─────────────────────────────────────────────────────────────────────────────

export type ResponseQuality = "positive" | "neutral" | "deflect" | "skeptical"

export type CloseOutcome = "success" | "hesitant" | "decline"
