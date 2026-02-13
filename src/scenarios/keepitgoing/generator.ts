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
    neutralStreak: 0,
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
  /** trajectory_score from prompt_3+: model's direct interest assessment */
  trajectoryScore?: number
}

interface InterestUpdate {
  interestLevel: number
  exitRisk: number
  neutralStreak: number
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
  const { score, quality, tags, trajectoryScore } = evalResult
  const { interestLevel, exitRisk, realismNotch, turnCount, conversationPhase, neutralStreak } = context

  let newInterestLevel: number
  let exitRiskDelta = 0

  // ── Exit risk calculation (shared between both modes) ──
  // Apply per-tag exit risk deltas
  const appliedTags = (tags || [])
    .filter((t) => typeof t === "string")
    .filter((t) => Boolean(getTagEffect(t)))
    .slice(0, 2)
  for (const tag of appliedTags) {
    const effect = getTagEffect(tag)
    if (effect) {
      exitRiskDelta += effect.exitRiskDelta
    }
  }

  // Quality → exitRisk mapping
  exitRiskDelta += getQualityExitRiskDelta(quality)

  // exitRisk decay: non-negative interactions naturally ease tension
  if (quality !== "deflect" && quality !== "skeptical") {
    exitRiskDelta -= 1
  }

  // Realism notch bias
  exitRiskDelta += realismNotch

  // ── Interest calculation ──
  if (typeof trajectoryScore === "number") {
    // ── Trajectory-grounded mode (prompt_3+) ──
    // trajectory_score IS the model's interest assessment based on full conversation.
    // line_score (score) provides a small directional nudge:
    //   9-10: +1 (outstanding), 7-8: +1 (good), 5-6: 0 (maintains), 3-4: -1 (bad), 1-2: -2 (terrible)
    const lineDelta = score >= 9 ? 1 : score >= 7 ? 1 : score >= 5 ? 0 : score >= 3 ? -1 : -2
    newInterestLevel = trajectoryScore + lineDelta
  } else {
    // ── Legacy delta mode (prompt_0-2, backward compatible) ──
    let interestDelta = getScoreDelta(score)

    // Apply per-tag interest deltas (only in legacy mode)
    for (const tag of appliedTags) {
      const effect = getTagEffect(tag)
      if (effect) {
        interestDelta += effect.interestDelta
      }
    }

    // Phase-aware floor: in invest/close, score 3-4 can't drop interest
    if ((conversationPhase === "invest" || conversationPhase === "close") && score >= 3 && score <= 4) {
      interestDelta = Math.max(interestDelta, 0)
    }

    // Consecutive neutral momentum bonus: 3+ turns of score 5+ → extra +1
    const newNeutralStreakLegacy = score >= 5 ? (neutralStreak || 0) + 1 : 0
    if (newNeutralStreakLegacy >= 3 && score >= 5 && score <= 6) {
      interestDelta += 1
    }

    newInterestLevel = interestLevel + interestDelta
  }

  // Neutral streak tracking (for both modes, needed by context)
  const newNeutralStreak = score >= 5 ? (neutralStreak || 0) + 1 : 0

  // Apply pacing caps (safety valve — can't warm too fast early)
  newInterestLevel = applyPacingCap(newInterestLevel, turnCount + 1)

  // Clamp to valid ranges
  newInterestLevel = Math.max(RUBRIC.interest.min, Math.min(RUBRIC.interest.max, newInterestLevel))
  let newExitRisk = Math.max(RUBRIC.exitRisk.min, Math.min(RUBRIC.exitRisk.max, exitRisk + exitRiskDelta))

  // Check end rules
  const endCheck = checkEndRules(newInterestLevel, newExitRisk, turnCount + 1, quality)

  return {
    interestLevel: newInterestLevel,
    exitRisk: newExitRisk,
    neutralStreak: newNeutralStreak,
    isEnded: endCheck.isEnded,
    endReason: endCheck.endReason,
  }
}
