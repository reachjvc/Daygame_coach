import type { ConfidenceResult, RetrievedChunk } from "./types"

/**
 * Compute confidence score based on retrieval quality and policy compliance.
 * This is NOT "LLM guessing its own correctness" - it's computed from measurable factors.
 */
export function computeConfidence(
  chunks: RetrievedChunk[],
  _answer: string,
  policyViolations: string[] = []
): ConfidenceResult {
  const retrievalStrength = computeRetrievalStrength(chunks)
  const sourceConsistency = computeSourceConsistency(chunks)
  const policyCompliance = computePolicyCompliance(policyViolations)

  // Overall score is weighted average of factors
  const score = Math.min(
    1.0,
    Math.max(
      0.0,
      retrievalStrength * 0.5 + sourceConsistency * 0.3 + policyCompliance * 0.2
    )
  )

  return {
    score: Math.round(score * 100) / 100,
    factors: {
      retrievalStrength: Math.round(retrievalStrength * 100) / 100,
      sourceConsistency: Math.round(sourceConsistency * 100) / 100,
      policyCompliance: Math.round(policyCompliance * 100) / 100,
    },
  }
}

/**
 * Compute retrieval strength from chunk relevance scores.
 * Higher average similarity = higher confidence that we found relevant content.
 */
function computeRetrievalStrength(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 0

  const scores = chunks.map((c) => c.relevanceScore)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

  // Normalize: 0.5 similarity -> 0.0 strength, 1.0 similarity -> 1.0 strength
  // This maps the typical range [0.5, 1.0] to [0.0, 1.0]
  return Math.max(0, Math.min(1, (avgScore - 0.5) * 2))
}

/**
 * Compute source consistency - how consistent the chunks are with each other.
 * For now, this is a simple heuristic based on number of chunks and score variance.
 */
function computeSourceConsistency(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 0
  if (chunks.length === 1) return 0.7 // Single source = moderate consistency

  const scores = chunks.map((c) => c.relevanceScore)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

  // Low variance in scores = consistent sources
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)

  // Lower standard deviation = higher consistency
  // stdDev of 0 -> 1.0 consistency, stdDev of 0.2+ -> 0.5 consistency
  const consistency = Math.max(0.5, 1 - stdDev * 2.5)

  // Bonus for having multiple relevant sources
  const multiSourceBonus = Math.min(0.2, (chunks.length - 1) * 0.05)

  return Math.min(1, consistency + multiSourceBonus)
}

/**
 * Compute policy compliance score.
 * 1.0 if no violations, reduced for each violation.
 */
function computePolicyCompliance(violations: string[]): number {
  if (violations.length === 0) return 1.0

  // Each violation reduces score by 0.2
  return Math.max(0, 1.0 - violations.length * 0.2)
}

/**
 * Detect potential policy violations in the answer.
 * Returns list of violation descriptions.
 */
export function detectPolicyViolations(answer: string): string[] {
  const violations: string[] = []

  // Check for potential harmful content patterns
  const harmfulPatterns = [
    { pattern: /\b(manipulat|deceiv|trick|exploit)\w*\b/i, violation: "potential manipulation advice" },
    { pattern: /ignore\s+(her\s+)?(boundaries|consent|no)/i, violation: "boundary violation advice" },
  ]

  for (const { pattern, violation } of harmfulPatterns) {
    if (pattern.test(answer)) {
      violations.push(violation)
    }
  }

  return violations
}

/**
 * Get a human-readable confidence label.
 */
export function getConfidenceLabel(score: number): "high" | "medium" | "low" {
  if (score >= 0.7) return "high"
  if (score >= 0.4) return "medium"
  return "low"
}
