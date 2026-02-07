/**
 * Keep It Going - Scenario Generator
 *
 * Generates conversation continuation scenarios where the user
 * practices keeping the vibe alive without interview mode.
 */

import { SITUATIONS } from "./data/situations"
import type { Language, ConversationPhase, KeepItGoingContext } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i)
  }
  return hash
}

// Close patterns
const CLOSE_PATTERNS: Record<Language, RegExp[]> = {
  da: [
    /hvad er dit nummer/i,
    /giv mig dit nummer/i,
    /lad os tage en kaffe/i,
    /skal vi bytte numre/i,
    /jeg skal videre/i,
    /kan jeg få dit nummer/i,
    /skriv til mig/i,
  ],
  en: [
    /what's your number/i,
    /give me your number/i,
    /let's grab coffee/i,
    /should we exchange numbers/i,
    /i gotta go/i,
    /can i get your number/i,
    /text me/i,
  ],
}

function isCloseAttempt(userMessage: string, language: Language): boolean {
  return CLOSE_PATTERNS[language].some((p) => p.test(userMessage))
}

export function getPhase(turnCount: number, userMessage: string, language: Language): ConversationPhase {
  if (isCloseAttempt(userMessage, language)) return "close"

  if (turnCount <= 4) return "hook"
  if (turnCount <= 12) return "vibe"
  if (turnCount <= 18) return "invest"
  return "close"
}

// ─────────────────────────────────────────────────────────────────────────────
// Generator Functions
// ─────────────────────────────────────────────────────────────────────────────

export function generateKeepItGoingScenario(seed: string, language: Language = "en"): KeepItGoingContext {
  const index = Math.abs(hashSeed(seed)) % SITUATIONS.length
  const situation = SITUATIONS[index]

  return {
    situation,
    language,
    turnCount: 0,
    conversationPhase: "hook",
    consecutiveHighScores: 0,
    averageScore: 0,
    totalScore: 0,
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
  score: number
): KeepItGoingContext {
  const newTurnCount = context.turnCount + 1
  const newTotalScore = context.totalScore + score
  const newAverageScore = newTotalScore / newTurnCount
  const newConsecutiveHighScores = score >= 7 ? context.consecutiveHighScores + 1 : 0
  const newPhase = getPhase(newTurnCount, userMessage, context.language)

  return {
    ...context,
    turnCount: newTurnCount,
    conversationPhase: newPhase,
    consecutiveHighScores: newConsecutiveHighScores,
    averageScore: newAverageScore,
    totalScore: newTotalScore,
  }
}
