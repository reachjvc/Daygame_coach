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
  // Claude 3.5 Haiku's own prices. Until 2026-11-28 this row held Claude 3
  // Haiku's ($0.25 / $1.25), which counted every call at under a third of its
  // real price.
  "claude-3-5-haiku-20241022": {
    input: 0.8,
    output: 4.0,
    cacheWrite: 1.0,
    cacheRead: 0.08,
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

/**
 * EVERY FEATURE THAT CALLS CLAUDE, AND ITS PER-USER SPEND CAP (USD CENTS, ALL TIME).
 *
 * The owner sets these numbers. Each starts at the Scenarios chat's 20 cents.
 * A person's calls in one feature stop once that feature's spend would pass
 * its cap. Every call goes through src/api_ai/aiGuard.ts, which checks this
 * list; a new AI feature needs its own line here before it can call Claude.
 *
 * "scenario-lab" and "vision-plan" run on the Claude program (Max
 * subscription), which bills no tokens: their spend is the price the program
 * reports for the tokens it used, and its own hidden instructions make each
 * call cost several cents.
 */
export const AI_SPEND_CAPS_CENTS = {
  "keep-it-going": USER_BUDGET_CENTS, // Scenarios chat
  "scenario-lab": USER_BUDGET_CENTS, // Scenario Lab (test page)
  "vision-plan": USER_BUDGET_CENTS, // Vision plan (test pages only, off on the live site)
} as const satisfies Record<string, number>

export type CappedAIFeature = keyof typeof AI_SPEND_CAPS_CENTS

/** What a person sees when a feature's cap is reached. */
export const AI_CAP_REACHED_MESSAGE =
  "You've used all your AI practice for now. Message us if you'd like more."

// ─────────────────────────────────────────────────────────────────────────────
// Booking a call before it runs (src/api_ai/aiGuard.ts)
//
// A call books its expected cost first, so calls fired together cannot all
// slip under the cap. The guess is meant to be high; the real price replaces it
// the moment the call returns.
// ─────────────────────────────────────────────────────────────────────────────

/** Prompt characters per token when guessing a call's cost. Real text runs about 4 in English. */
export const ESTIMATE_CHARS_PER_TOKEN = 3

/** The Claude program adds its own instructions to every prompt: tokens to add to the guess. */
export const CLI_OVERHEAD_TOKENS = 30_000

/** The Claude program has no output limit to read: output tokens to assume for the guess. */
export const CLI_OUTPUT_TOKENS_GUESS = 1_500

/**
 * Prices for a model this table does not list (and for the Claude program,
 * whose model is not reported up front): the most expensive row, so a guess
 * or a count is never too low.
 */
export function pricingFor(model: string): (typeof MODEL_PRICING)[ModelName] {
  const known = MODEL_PRICING[model as ModelName]
  if (known) return known
  const rows = Object.values(MODEL_PRICING)
  return {
    input: Math.max(...rows.map((r) => r.input)),
    output: Math.max(...rows.map((r) => r.output)),
    cacheWrite: Math.max(...rows.map((r) => r.cacheWrite)),
    cacheRead: Math.max(...rows.map((r) => r.cacheRead)),
  }
}

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
