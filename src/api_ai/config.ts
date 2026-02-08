/**
 * API AI Configuration
 *
 * Model pricing, user budgets, and warning thresholds.
 */

import type { ModelName, WarningLevel } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Model Pricing (USD per million tokens)
// Source: https://www.anthropic.com/pricing
// ─────────────────────────────────────────────────────────────────────────────

export const MODEL_PRICING: Record<
  ModelName,
  {
    input: number // USD per 1M input tokens
    output: number // USD per 1M output tokens
    cacheWrite: number // USD per 1M cache write tokens
    cacheRead: number // USD per 1M cache read tokens
  }
> = {
  "claude-3-5-haiku-20241022": {
    input: 0.25,
    output: 1.25,
    cacheWrite: 0.30,
    cacheRead: 0.03,
  },
  "claude-3-5-sonnet-20241022": {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  "claude-haiku-4-5-20251001": {
    input: 1.0,
    output: 5.0,
    cacheWrite: 1.25,
    cacheRead: 0.1,
  },
  "claude-opus-4-5-20251101": {
    input: 5.0,
    output: 25.0,
    cacheWrite: 6.25,
    cacheRead: 0.5,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// User Budget Limits
// ─────────────────────────────────────────────────────────────────────────────

// User budget: $0.20 (1/50 of $10)
export const USER_BUDGET_CENTS = 20

// ─────────────────────────────────────────────────────────────────────────────
// Warning Thresholds
// ─────────────────────────────────────────────────────────────────────────────

export const WARNING_THRESHOLDS = {
  low: 0.2, // 20% of budget used
  medium: 0.4, // 40% of budget used
  high: 0.6, // 60% of budget used
  critical: 0.8, // 80% of budget used
  exceeded: 0.9, // 90% of budget used
} as const

/**
 * Determine warning level based on usage percentage
 */
export function getWarningLevel(usagePercentage: number): WarningLevel {
  if (usagePercentage >= 1.0) return "exceeded"
  if (usagePercentage >= WARNING_THRESHOLDS.exceeded) return "critical"
  if (usagePercentage >= WARNING_THRESHOLDS.critical) return "high"
  if (usagePercentage >= WARNING_THRESHOLDS.high) return "medium"
  if (usagePercentage >= WARNING_THRESHOLDS.medium) return "low"
  return "none"
}
