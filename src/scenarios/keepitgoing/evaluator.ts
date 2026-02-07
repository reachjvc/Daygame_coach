/**
 * Keep It Going - Evaluator
 *
 * Evaluates user responses for statement usage vs interview mode.
 * Supports both Danish and English.
 */

import type { EvaluationResult } from "../types"
import type { Language, ResponseQuality, CloseOutcome } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Definitions
// ─────────────────────────────────────────────────────────────────────────────

const PATTERNS: Record<
  Language,
  {
    statement: RegExp[]
    interview: RegExp[]
    digging: RegExp[]
    tryHard: RegExp[]
  }
> = {
  da: {
    statement: [
      /du virker/i,
      /du ser ud/i,
      /lad mig gætte/i,
      /jeg får/i,
      /det forklarer/i,
      /du har den der/i,
      /du minder mig om/i,
      /jeg tror du/i,
      /du er typen/i,
    ],
    interview: [
      /^hvad /i,
      /^hvor /i,
      /^hvorfor /i,
      /^hvornår /i,
      /laver du\?/i,
      /bor du\?/i,
      /hedder du\?/i,
      /studerer du\?/i,
      /kommer du fra\?/i,
    ],
    digging: [
      /kan du lide/i,
      /er det kedeligt/i,
      /hvorfor det/i,
      /hvad fik dig til/i,
      /er du i det for/i,
      /savner du/i,
      /hvad er det bedste/i,
      /hvad er det værste/i,
    ],
    tryHard: [/mystisk/i, /hemmeligheder/i, /der er noget ved dig/i, /du har en energi/i, /speciel/i],
  },
  en: {
    statement: [
      /you seem/i,
      /you look like/i,
      /let me guess/i,
      /i get/i,
      /that explains/i,
      /you have that/i,
      /you strike me/i,
      /you remind me/i,
      /i bet you/i,
      /you're the type/i,
    ],
    interview: [
      /^what /i,
      /^where /i,
      /^why /i,
      /^when /i,
      /do you do\?/i,
      /do you live\?/i,
      /is your name\?/i,
      /do you study\?/i,
      /are you from\?/i,
    ],
    digging: [
      /do you like/i,
      /do you enjoy/i,
      /is it boring/i,
      /why.s that/i,
      /what got you into/i,
      /are you in it for/i,
      /do you miss/i,
      /what's the best/i,
      /what's the worst/i,
    ],
    tryHard: [
      /mysterious/i,
      /secrets/i,
      /something about you/i,
      /you have an energy/i,
      /special/i,
      /unique/i,
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation Functions
// ─────────────────────────────────────────────────────────────────────────────

interface EvaluationChecks {
  hasStatement: boolean
  hasInterview: boolean
  hasDigging: boolean
  hasTryHard: boolean
  tooLong: boolean
  hasQuestion: boolean
}

function analyzeMessage(userMessage: string, language: Language): EvaluationChecks {
  const patterns = PATTERNS[language]
  const msg = userMessage.trim()

  return {
    hasStatement: patterns.statement.some((p) => p.test(msg)),
    hasInterview: patterns.interview.some((p) => p.test(msg)),
    hasDigging: patterns.digging.some((p) => p.test(msg)),
    hasTryHard: patterns.tryHard.some((p) => p.test(msg)),
    tooLong: msg.length > 150,
    hasQuestion: msg.includes("?"),
  }
}

function calculateScore(checks: EvaluationChecks): number {
  let score = 5

  if (checks.hasStatement) score += 2
  if (checks.hasDigging) score += 2
  if (checks.hasInterview && !checks.hasDigging) score -= 2
  if (checks.hasTryHard) score -= 1
  if (checks.tooLong) score -= 1
  if (!checks.hasQuestion && !checks.hasStatement) score -= 1

  return Math.max(1, Math.min(10, score))
}

function buildFeedback(checks: EvaluationChecks, language: Language): string {
  if (language === "da") {
    if (checks.hasStatement && checks.hasDigging) return "Godt! Statement + graver dybere."
    if (checks.hasStatement) return "Godt statement. Prøv at grave dybere næste gang."
    if (checks.hasDigging) return "Godt spørgsmål. Tilføj et statement først."
    if (checks.hasInterview) return "Interview mode. Brug statements i stedet for spørgsmål."
    if (checks.hasTryHard) return "Lidt for smooth. Vær mere direkte."
    if (checks.tooLong) return "For langt. Hold det kortere og mere punchy."
    return "Prøv et statement eller cold read."
  }

  // English
  if (checks.hasStatement && checks.hasDigging) return "Good! Statement + digging deeper."
  if (checks.hasStatement) return "Good statement. Try digging deeper next time."
  if (checks.hasDigging) return "Good question. Add a statement first."
  if (checks.hasInterview) return "Interview mode. Use statements instead of questions."
  if (checks.hasTryHard) return "A bit too smooth. Be more direct."
  if (checks.tooLong) return "Too long. Keep it shorter and punchier."
  return "Try a statement or cold read."
}

function buildStrengths(checks: EvaluationChecks, language: Language): string[] {
  const strengths: string[] = []

  if (checks.hasStatement) {
    strengths.push(language === "da" ? "Brugte statement" : "Used statement")
  }
  if (checks.hasDigging) {
    strengths.push(language === "da" ? "Gravede dybere" : "Dug deeper")
  }
  if (!checks.hasTryHard && !checks.tooLong && (checks.hasStatement || checks.hasDigging)) {
    strengths.push(language === "da" ? "Autentisk" : "Authentic")
  }

  return strengths.slice(0, 2)
}

function buildImprovements(checks: EvaluationChecks, language: Language): string[] {
  const improvements: string[] = []

  if (checks.hasInterview && !checks.hasDigging) {
    improvements.push(language === "da" ? "Undgå interview-spørgsmål" : "Avoid interview questions")
  }
  if (checks.hasTryHard) {
    improvements.push(language === "da" ? "For try-hard" : "Too try-hard")
  }
  if (checks.tooLong) {
    improvements.push(language === "da" ? "Hold det kortere" : "Keep it shorter")
  }
  if (!checks.hasStatement && !checks.hasDigging) {
    improvements.push(language === "da" ? "Brug statements" : "Use statements")
  }

  return improvements.slice(0, 2)
}

export function getSuggestedLine(language: Language): string {
  if (language === "da") {
    return 'Prøv: "Du virker som en der [observation]." i stedet for at spørge.'
  }
  return 'Try: "You seem like someone who [observation]." instead of asking.'
}

export function evaluateKeepItGoingResponse(
  userMessage: string,
  language: Language
): EvaluationResult {
  const checks = analyzeMessage(userMessage, language)
  const score = calculateScore(checks)
  const feedback = buildFeedback(checks, language)
  const strengths = buildStrengths(checks, language)
  const improvements = buildImprovements(checks, language)

  const suggestedNextLine = score < 5 ? getSuggestedLine(language) : undefined

  return {
    small: { score, feedback },
    milestone: {
      score,
      feedback,
      strengths,
      improvements,
      suggestedNextLine,
    },
  }
}

export function getResponseQuality(score: number): ResponseQuality {
  if (score >= 7) return "positive"
  if (score >= 5) return "neutral"
  if (score >= 3) return "deflect"
  return "skeptical"
}

export function getCloseOutcome(averageScore: number): CloseOutcome {
  if (averageScore >= 6) return "success"
  if (averageScore >= 4) return "hesitant"
  return "decline"
}
