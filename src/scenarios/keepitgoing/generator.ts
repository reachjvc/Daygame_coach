/**
 * Keep It Going - Scenario Generator
 *
 * Generates conversation continuation scenarios where the user
 * practices keeping the vibe alive without interview mode.
 */

import { SITUATIONS } from "./data/situations"
import { hashSeed } from "../shared/seeding"
import type { Language, ConversationPhase, KeepItGoingContext, ResponseQuality } from "./types"

export function getPhase(turnCount: number): ConversationPhase {
  if (turnCount <= 4) return "hook"
  if (turnCount <= 12) return "vibe"
  if (turnCount <= 18) return "invest"
  return "close"
}

// ─────────────────────────────────────────────────────────────────────────────
// Generator Functions
// ─────────────────────────────────────────────────────────────────────────────

export function generateKeepItGoingScenario(
  seed: string,
  language: Language = "en",
  situationId?: string
): KeepItGoingContext {
  // If situationId provided, find that situation; otherwise use seed-based random
  let situation = situationId
    ? SITUATIONS.find((s) => s.id === situationId)
    : undefined

  if (!situation) {
    const index = Math.abs(hashSeed(seed)) % SITUATIONS.length
    situation = SITUATIONS[index]
  }

  return {
    situation,
    language,
    turnCount: 0,
    conversationPhase: "hook",
    consecutiveHighScores: 0,
    averageScore: 0,
    totalScore: 0,
    usedResponses: {
      positive: [],
      neutral: [],
      deflect: [],
      skeptical: [],
    },
  }
}

export function generateKeepItGoingIntro(context: KeepItGoingContext): string {
  const { situation, language } = context
  const lang = language

  const locationLabel = lang === "da" ? "STED" : "LOCATION"
  const youOpenedLabel = lang === "da" ? "DU ÅBNEDE" : "YOU OPENED"
  const herLabel = lang === "da" ? "HENDE" : "HER"
  const yourTurnLabel = lang === "da" ? "Din tur." : "Your turn."

  return `**${locationLabel}:** ${situation.location[lang]}. ${situation.setup[lang]}

**${youOpenedLabel}:** "${situation.yourOpener[lang]}"

**${herLabel}:** ${situation.herFirstResponse[lang]}

---
${yourTurnLabel}`
}

export function updateContext(
  context: KeepItGoingContext,
  userMessage: string,
  score: number,
  usedResponse?: { quality: ResponseQuality; index: number }
): KeepItGoingContext {
  const newTurnCount = context.turnCount + 1
  const newTotalScore = context.totalScore + score
  const newAverageScore = newTotalScore / newTurnCount
  const newConsecutiveHighScores = score >= 7 ? context.consecutiveHighScores + 1 : 0
  const newPhase = getPhase(newTurnCount)

  // Track used response for deduplication
  const newUsedResponses = usedResponse
    ? {
        ...context.usedResponses,
        [usedResponse.quality]: [...context.usedResponses[usedResponse.quality], usedResponse.index],
      }
    : context.usedResponses

  return {
    ...context,
    turnCount: newTurnCount,
    conversationPhase: newPhase,
    consecutiveHighScores: newConsecutiveHighScores,
    averageScore: newAverageScore,
    totalScore: newTotalScore,
    usedResponses: newUsedResponses,
  }
}
