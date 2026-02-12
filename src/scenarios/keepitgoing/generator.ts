/**
 * Keep It Going - Scenario Generator
 *
 * Generates conversation continuation scenarios where the user
 * practices keeping the vibe alive without interview mode.
 */

import { SITUATIONS } from "./data/situations"
import { hashSeed } from "../shared/seeding"
import type { Language, ConversationPhase, KeepItGoingContext, ResponseQuality } from "./types"
import {
  RUBRIC,
  getScoreDelta,
  getTagEffect,
  getQualityExitRiskDelta,
  applyPacingCap,
  checkEndRules,
} from "./realisticProfiles"

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
    // Realistic response state (initialized from RUBRIC)
    interestLevel: RUBRIC.interest.start,
    exitRisk: RUBRIC.exitRisk.start,
    realismNotch: 0,
    isEnded: false,
    endReason: undefined,
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

// ─────────────────────────────────────────────────────────────────────────────
// Realistic Interest Updates (from rubric)
// ─────────────────────────────────────────────────────────────────────────────

interface EvalResultForRubric {
  score: number
  quality: string
  tags: string[]
}

interface InterestUpdate {
  interestLevel: number
  exitRisk: number
  isEnded: boolean
  endReason?: string
}

/**
 * Update interest and exit risk based on evaluation result and rubric rules.
 * This is the core realism engine that makes her responses authentic.
 */
export function updateInterestFromRubric(
  context: KeepItGoingContext,
  evalResult: EvalResultForRubric
): InterestUpdate {
  const { score, quality, tags } = evalResult
  const { interestLevel, exitRisk, realismNotch, turnCount } = context

  // 1. Base delta from score
  let interestDelta = getScoreDelta(score)
  let exitRiskDelta = 0

  // 2. Apply per-tag deltas
  const appliedTags = (tags || [])
    .filter((t) => typeof t === "string")
    .filter((t) => Boolean(getTagEffect(t)))
    .slice(0, 2)
  for (const tag of appliedTags) {
    const effect = getTagEffect(tag)
    if (effect) {
      interestDelta += effect.interestDelta
      exitRiskDelta += effect.exitRiskDelta
    }
  }

  // 3. Apply quality → exitRisk mapping
  exitRiskDelta += getQualityExitRiskDelta(quality)

  // 3b. exitRisk decay: non-negative interactions naturally ease tension
  if (quality !== "deflect" && quality !== "skeptical") {
    exitRiskDelta -= 1
  }

  // 4. Apply realism notch bias (harder notch = more exit risk)
  exitRiskDelta += realismNotch

  // 5. Calculate new values
  let newInterestLevel = interestLevel + interestDelta
  let newExitRisk = exitRisk + exitRiskDelta

  // 6. Apply pacing caps (can't warm too fast early)
  newInterestLevel = applyPacingCap(newInterestLevel, turnCount + 1)

  // 7. Clamp to valid ranges
  newInterestLevel = Math.max(RUBRIC.interest.min, Math.min(RUBRIC.interest.max, newInterestLevel))
  newExitRisk = Math.max(RUBRIC.exitRisk.min, Math.min(RUBRIC.exitRisk.max, newExitRisk))

  // 8. Check end rules
  const endCheck = checkEndRules(newInterestLevel, newExitRisk, turnCount + 1, quality)

  return {
    interestLevel: newInterestLevel,
    exitRisk: newExitRisk,
    isEnded: endCheck.isEnded,
    endReason: endCheck.endReason,
  }
}
