/**
 * Realistic Woman Response Profiles and Rubric
 *
 * TypeScript exports of the frozen v1 artifacts from data/woman-responses/final/
 * These constants drive interest-level-aware response generation and evaluation.
 */

import type { InterestBucket, BucketProfile, TagEffect } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// PROFILES (from data/woman-responses/final/profiles.json)
// ─────────────────────────────────────────────────────────────────────────────

export const PROFILES = {
  version: 1,
  global: {
    maxSentences: 2,
    actions: {
      required: false,
      maxPerMessage: 1,
      style: "use *actions* sparingly; no novel-length stage directions",
    },
    noEarlyFlirtTurns: 3,
  },
  notches: {
    "-1": { label: "slightly easier", interestDeltaBias: 0, exitRiskBias: -1 },
    "0": { label: "average realistic (MVP)", interestDeltaBias: 0, exitRiskBias: 0 },
    "1": { label: "slightly harder", interestDeltaBias: 0, exitRiskBias: 1 },
  },
  buckets: {
    cold: {
      interestRange: [1, 3] as [number, number],
      wordCount: { min: 1, max: 8, mean: 7.5 },
      questionRateMax: 0.05,
      questionBackRate: 0.0,
      shouldAskBack: false,
      deflectRateTarget: 0.7,
      busyRateTarget: 0.15,
      testRateTarget: 0.05,
      exitRateTarget: 0.15,
      flirtRate: 0.0,
      exitChancePerTurn: 0.15,
      styleNotes: "short, unimpressed, can ignore, can leave. No questions back.",
    },
    guarded: {
      interestRange: [4, 5] as [number, number],
      wordCount: { min: 2, max: 14, mean: 7.5 },
      questionRateMax: 0.22,
      questionBackRate: 0.16,
      shouldAskBack: false,
      deflectRateTarget: 0.08,
      busyRateTarget: 0.1,
      testRateTarget: 0.1,
      exitRateTarget: 0.04,
      flirtRate: 0.0,
      exitChancePerTurn: 0.04,
      styleNotes: "polite but not investing; answers can be vague",
    },
    curious: {
      interestRange: [6, 7] as [number, number],
      wordCount: { min: 6, max: 20, mean: 10 },
      questionRateMax: 0.24,
      questionBackRate: 0.17,
      shouldAskBack: true,
      deflectRateTarget: 0.01,
      busyRateTarget: 0.05,
      testRateTarget: 0.1,
      exitRateTarget: 0.0,
      flirtRate: 0.14,
      exitChancePerTurn: 0,
      styleNotes: "engaged; asks a question sometimes; may be playful but not 'in love'",
    },
    interested: {
      interestRange: [8, 10] as [number, number],
      wordCount: { min: 8, max: 25, mean: 12.3 },
      questionRateMax: 0.31,
      questionBackRate: 0.22,
      shouldAskBack: true,
      deflectRateTarget: 0.0,
      busyRateTarget: 0.0,
      testRateTarget: 0.08,
      exitRateTarget: 0.0,
      flirtRate: 0.47,
      exitChancePerTurn: 0,
      styleNotes: "warm/playful; flirts openly; may qualify herself or initiate; still realistic",
    },
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// RUBRIC (from data/woman-responses/final/rubric.json)
// ─────────────────────────────────────────────────────────────────────────────

export const RUBRIC = {
  version: 1,
  interest: { start: 4, min: 1, max: 10 },
  exitRisk: { start: 0, min: 0, max: 3 },
  pacing: {
    noInterestedBeforeTurn: 4,
    maxInterestBeforeTurn: [
      { turnMax: 2, maxInterest: 6 },
      { turnMax: 4, maxInterest: 7 },
    ],
  },
  scoreToInterestDelta: [
    { minScore: 9, maxScore: 10, delta: 2 },
    { minScore: 7, maxScore: 8, delta: 1 },
    { minScore: 5, maxScore: 6, delta: 0 },
    { minScore: 3, maxScore: 4, delta: -1 },
    { minScore: 1, maxScore: 2, delta: -2 },
  ],
  tags: {
    threading: {
      interestDelta: 1,
      exitRiskDelta: -1,
      description: "References or builds on her previous statement",
    },
    cold_read: {
      interestDelta: 1,
      exitRiskDelta: 0,
      description: "Makes an assumption about her personality/vibe",
    },
    tease: {
      interestDelta: 1,
      exitRiskDelta: 0,
      description: "Playful push-pull that makes her laugh or react",
    },
    interview_question: {
      interestDelta: -1,
      exitRiskDelta: 1,
      description: "Logical question without play (where from, what do you do)",
    },
    too_long: {
      interestDelta: -1,
      exitRiskDelta: 1,
      description: "Overly wordy, more than 2 sentences, or monologuing",
    },
    try_hard: {
      interestDelta: -1,
      exitRiskDelta: 1,
      description: "Needy, seeking validation, over-complimenting",
    },
    sexual_too_soon: {
      interestDelta: -2,
      exitRiskDelta: 2,
      description: "Sexual comment before interest >= 7",
    },
    creepy: {
      interestDelta: -3,
      exitRiskDelta: 3,
      description: "Uncomfortable, invasive, or violating boundaries",
    },
    ignored_soft_exit: {
      interestDelta: -1,
      exitRiskDelta: 2,
      description: "She said 'I have to go' or similar but he continued pressing",
    },
  },
  endRules: [
    {
      when: "exitRisk >= 3",
      endConversation: true,
      reason: "she is done / uncomfortable",
    },
    {
      when: "interestLevel <= 2 && exitRisk >= 2",
      endConversation: true,
      reason: "low interest + annoyance",
    },
    {
      when: "interestLevel <= 3 && turn >= 3 && quality == 'deflect'",
      endConversation: true,
      reason: "cold and not warming up",
    },
  ],
  qualityToExitRisk: {
    positive: -1,
    neutral: 0,
    deflect: 1,
    skeptical: 1,
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the interest bucket name for a given interest level
 */
export function getInterestBucket(interest: number): InterestBucket {
  if (interest <= 3) return "cold"
  if (interest <= 5) return "guarded"
  if (interest <= 7) return "curious"
  return "interested"
}

/**
 * Get the profile configuration for a given bucket
 */
export function getBucketProfile(bucket: InterestBucket): BucketProfile {
  return PROFILES.buckets[bucket]
}

/**
 * Get the interest delta for a given score
 */
export function getScoreDelta(score: number): number {
  for (const rule of RUBRIC.scoreToInterestDelta) {
    if (score >= rule.minScore && score <= rule.maxScore) {
      return rule.delta
    }
  }
  return 0
}

/**
 * Get the effect of a tag on interest and exit risk
 */
export function getTagEffect(tag: string): TagEffect | null {
  const tagEffects = RUBRIC.tags as Record<string, TagEffect>
  return tagEffects[tag] || null
}

/**
 * Get the exit risk delta for a given quality
 */
export function getQualityExitRiskDelta(quality: string): number {
  const mapping = RUBRIC.qualityToExitRisk as Record<string, number>
  return mapping[quality] ?? 0
}

/**
 * Apply pacing constraints to cap interest based on turn number
 */
export function applyPacingCap(interest: number, turnCount: number): number {
  for (const rule of RUBRIC.pacing.maxInterestBeforeTurn) {
    if (turnCount <= rule.turnMax) {
      return Math.min(interest, rule.maxInterest)
    }
  }
  return interest
}

/**
 * Check if conversation should end based on current state
 */
export function checkEndRules(
  interestLevel: number,
  exitRisk: number,
  turnCount: number,
  quality: string
): { isEnded: boolean; endReason?: string } {
  // Rule 1: exitRisk >= 3
  if (exitRisk >= 3) {
    return { isEnded: true, endReason: "she is done / uncomfortable" }
  }

  // Rule 2: low interest + annoyance
  if (interestLevel <= 2 && exitRisk >= 2) {
    return { isEnded: true, endReason: "low interest + annoyance" }
  }

  // Rule 3: cold and not warming up after turn 3
  if (interestLevel <= 3 && turnCount >= 3 && quality === "deflect") {
    return { isEnded: true, endReason: "cold and not warming up" }
  }

  return { isEnded: false }
}
