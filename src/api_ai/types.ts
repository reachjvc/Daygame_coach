/**
 * API AI Types
 *
 * All types for AI API usage tracking and budget management.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Feature Types
// ─────────────────────────────────────────────────────────────────────────────

export type AIFeature = "keep-it-going" | "openers-evaluator" | "qa" | "articles"

export type AIOperation = "evaluate" | "generate_response" | "generate_close" | "generate_advice"

// ─────────────────────────────────────────────────────────────────────────────
// Model Types
// ─────────────────────────────────────────────────────────────────────────────

export type ModelName =
  | "claude-3-5-haiku-20241022"
  | "claude-3-5-sonnet-20241022"
  | "claude-haiku-4-5-20251001"
  | "claude-opus-4-5-20251101"

// ─────────────────────────────────────────────────────────────────────────────
// Database Row Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AIUsageRow {
  id: string
  user_id: string
  feature: AIFeature
  scenario_id: string | null
  operation: AIOperation
  model: ModelName
  input_tokens: number
  output_tokens: number
  cache_creation_tokens: number
  cache_read_tokens: number
  input_cost_cents: number
  output_cost_cents: number
  cache_creation_cost_cents: number
  cache_read_cost_cents: number
  total_cost_cents: number
  response_time_ms: number | null
  error: string | null
  created_at: string
  // Prompt/response content for debugging
  system_prompt: string | null
  user_prompt: string | null
  ai_response: string | null
}

export interface AIUsageInsert {
  user_id: string
  feature: AIFeature
  scenario_id?: string
  operation: AIOperation
  model: ModelName
  input_tokens: number
  output_tokens: number
  cache_creation_tokens?: number
  cache_read_tokens?: number
  input_cost_cents: number
  output_cost_cents: number
  cache_creation_cost_cents?: number
  cache_read_cost_cents?: number
  total_cost_cents: number
  response_time_ms?: number
  error?: string
  // Prompt/response content for debugging
  system_prompt?: string
  user_prompt?: string
  ai_response?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget & Warning Types
// ─────────────────────────────────────────────────────────────────────────────

export type WarningLevel = "none" | "low" | "medium" | "high" | "critical" | "exceeded"

export interface UserSpendingSummary {
  user_id: string
  total_cost_cents: number
  total_cost_dollars: number
  total_calls: number
  by_feature: Record<AIFeature, number>
  budget_limit_cents: number
  remaining_cents: number
  usage_percentage: number
  warning_level: WarningLevel
}

export interface BudgetStatus {
  withinBudget: boolean
  totalSpentCents: number
  remainingCents: number
  usagePercentage: number
  warningLevel: WarningLevel
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost Calculation Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
}

export interface CostBreakdown {
  inputCostCents: number
  outputCostCents: number
  cacheCreationCostCents: number
  cacheReadCostCents: number
  totalCostCents: number
}
