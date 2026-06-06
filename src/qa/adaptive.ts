/**
 * Adaptive retrieval planning (test bench).
 *
 * Pure helpers that let retrieval scale itself to the question:
 *  - relevance floor → nothing in, nothing out
 *  - "need score" from query intent + retrieval shape → how deep to go
 *  - knee detection → take the natural cluster of relevant chunks, not a fixed N
 *  - budget escalation → spend more context + output tokens only when warranted
 *
 * No type exports here (architecture rule) — types live in types.ts.
 */

/** Default knobs. Tunable per-call via AdaptiveRetrievalConfig. */
export const DEFAULT_ADAPTIVE = {
  /** cosine floor; below this a chunk is treated as noise */
  minRelevance: 0.55,
  /** "its own" default context budget (tokens) */
  baseContextTokens: 1500,
  /** ceiling it may escalate to when depth is needed (tokens) */
  maxContextTokens: 5000,
  /** default answer budget (tokens) — modest */
  baseOutputTokens: 1024,
  /** answer budget it may escalate to for deep questions (tokens) */
  maxOutputTokens: 4096,
}

/** Rough token estimate (~4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/** Linear interpolate a→b by t∈[0,1], rounded to an int. */
export function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * Math.max(0, Math.min(1, t)))
}

const DEEP_INTENT =
  /\b(why|explain|in detail|detailed|deep|deeper|framework|mindset|psycholog|break ?down|walk me through|step by step|difference between|compare|how does|understand|nuance|theory|principle|strateg|long[- ]?term)\b/i
const QUICK_INTENT = /\b(quick|in short|tl;?dr|one ?liner|just tell me|simply|short answer)\b/i

/**
 * Compute how much depth a question needs, from query intent + retrieval shape.
 * Returns a score in [0,1] plus human-readable reasons for transparency.
 */
export function computeNeedScore(
  question: string,
  similarities: number[],
  hasExpandable: boolean
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let s = 0.3 // baseline = "standard"

  if (DEEP_INTENT.test(question)) {
    s += 0.35
    reasons.push("deep-intent phrasing (+0.35)")
  }
  if (QUICK_INTENT.test(question)) {
    s -= 0.2
    reasons.push("quick-intent phrasing (-0.20)")
  }

  const words = question.trim().split(/\s+/).filter(Boolean).length
  if (words >= 16) {
    s += 0.15
    reasons.push(`long question, ${words} words (+0.15)`)
  } else if (words <= 6) {
    s -= 0.1
    reasons.push(`short question, ${words} words (-0.10)`)
  }

  // Coverage nudge (small): depth is mainly question-driven, not corpus-driven.
  const strong = similarities.filter((x) => x >= 0.65).length
  if (strong > 0) {
    const b = Math.min(0.1, strong * 0.03)
    s += b
    reasons.push(`${strong} strong top matches (+${b.toFixed(2)})`)
  }

  if (hasExpandable) {
    s += 0.1
    reasons.push("conversational/explanatory segments present (+0.10)")
  }

  const score = Math.max(0, Math.min(1, s))
  return { score, reasons }
}

/** Label a need score. */
export function needTier(score: number): "shallow" | "standard" | "deep" {
  if (score < 0.34) return "shallow"
  if (score < 0.67) return "standard"
  return "deep"
}

/**
 * Knee detection: given scores sorted descending, return how many to keep by
 * cutting at the largest drop-off. Keeps the natural relevance cluster.
 */
export function kneeCount(scoresDesc: number[], minGap = 0.05): number {
  if (scoresDesc.length <= 1) return scoresDesc.length
  let cut = scoresDesc.length
  let maxGap = minGap
  for (let i = 1; i < scoresDesc.length; i++) {
    const gap = scoresDesc[i - 1] - scoresDesc[i]
    if (gap > maxGap) {
      maxGap = gap
      cut = i
    }
  }
  return cut
}
