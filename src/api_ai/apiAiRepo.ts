/**
 * API AI Repository
 *
 * Database access for AI usage tracking.
 * Follows repo pattern: all database operations for ai_usage_logs table.
 */

import { createServerSupabaseClient, createAdminSupabaseClient } from "@/src/db/server"
import type { AIUsageRow, AIUsageInsert } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Create (System-Only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log AI usage (system-only insert via admin client)
 * @throws Error if insert fails
 */
export async function logAIUsage(usage: AIUsageInsert): Promise<AIUsageRow> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .insert(usage)
    .select()
    .single()

  if (error) {
    console.error("Failed to log AI usage:", error)
    throw new Error(`Failed to log AI usage: ${error.message}`)
  }

  return data as AIUsageRow
}

// ─────────────────────────────────────────────────────────────────────────────
// Read (User-Scoped)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get user's AI usage logs within a time period
 * @param userId User ID
 * @param days Number of days to look back (default: 30)
 * @returns Array of usage logs, sorted by created_at DESC
 * @throws Error if query fails
 */
export async function getUserAIUsage(userId: string, days = 30): Promise<AIUsageRow[]> {
  const supabase = await createServerSupabaseClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to get AI usage: ${error.message}`)
  }

  return (data || []) as AIUsageRow[]
}

/**
 * Calculate total spending for a user (all time)
 * @param userId User ID
 * @returns Total cost in cents
 * @throws Error if query fails
 */
export async function getUserTotalSpending(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("total_cost_cents")
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to get total spending: ${error.message}`)
  }

  return (data || []).reduce((sum, row) => sum + Number(row.total_cost_cents), 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get spending summary for all users (admin only)
 * Aggregates total cost and call count per user
 * @returns Array of {user_id, total_cost_cents, total_calls}
 * @throws Error if query fails
 */
export async function getAllUsersSpending(): Promise<
  Array<{
    user_id: string
    total_cost_cents: number
    total_calls: number
  }>
> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase.from("ai_usage_logs").select("user_id, total_cost_cents")

  if (error) {
    throw new Error(`Failed to get all users spending: ${error.message}`)
  }

  // Aggregate by user
  const byUser = new Map<string, { cost: number; count: number }>()

  for (const row of data || []) {
    const existing = byUser.get(row.user_id) || { cost: 0, count: 0 }
    byUser.set(row.user_id, {
      cost: existing.cost + Number(row.total_cost_cents),
      count: existing.count + 1,
    })
  }

  return Array.from(byUser.entries()).map(([user_id, stats]) => ({
    user_id,
    total_cost_cents: stats.cost,
    total_calls: stats.count,
  }))
}

/**
 * Get detailed logs with pagination and filtering (admin only)
 */
export async function getDetailedLogs(options: {
  limit?: number
  offset?: number
  feature?: string
  days?: number
  userId?: string
}): Promise<{ logs: AIUsageRow[]; total: number }> {
  const { limit = 100, offset = 0, feature, days = 30, userId } = options
  const supabase = createAdminSupabaseClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  let query = supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact" })
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false })

  if (feature) {
    query = query.eq("feature", feature)
  }

  if (userId) {
    query = query.eq("user_id", userId)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to get detailed logs: ${error.message}`)
  }

  return { logs: (data || []) as AIUsageRow[], total: count || 0 }
}

/**
 * Get aggregated stats by feature (admin only)
 */
export async function getStatsByFeature(): Promise<
  Array<{
    feature: string
    total_calls: number
    total_cost_cents: number
    total_input_tokens: number
    total_output_tokens: number
  }>
> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("feature, total_cost_cents, input_tokens, output_tokens")

  if (error) {
    throw new Error(`Failed to get stats by feature: ${error.message}`)
  }

  const byFeature = new Map<
    string,
    { cost: number; calls: number; input: number; output: number }
  >()

  for (const row of data || []) {
    const existing = byFeature.get(row.feature) || { cost: 0, calls: 0, input: 0, output: 0 }
    byFeature.set(row.feature, {
      cost: existing.cost + Number(row.total_cost_cents),
      calls: existing.calls + 1,
      input: existing.input + Number(row.input_tokens),
      output: existing.output + Number(row.output_tokens),
    })
  }

  return Array.from(byFeature.entries()).map(([feature, stats]) => ({
    feature,
    total_calls: stats.calls,
    total_cost_cents: stats.cost,
    total_input_tokens: stats.input,
    total_output_tokens: stats.output,
  }))
}

/**
 * Get aggregated stats by scenario_id (admin only)
 */
export async function getStatsByScenario(): Promise<
  Array<{
    scenario_id: string
    total_calls: number
    total_cost_cents: number
  }>
> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("scenario_id, total_cost_cents")
    .not("scenario_id", "is", null)

  if (error) {
    throw new Error(`Failed to get stats by scenario: ${error.message}`)
  }

  const byScenario = new Map<string, { cost: number; calls: number }>()

  for (const row of data || []) {
    const scenarioId = row.scenario_id || "unknown"
    const existing = byScenario.get(scenarioId) || { cost: 0, calls: 0 }
    byScenario.set(scenarioId, {
      cost: existing.cost + Number(row.total_cost_cents),
      calls: existing.calls + 1,
    })
  }

  return Array.from(byScenario.entries()).map(([scenario_id, stats]) => ({
    scenario_id,
    total_calls: stats.calls,
    total_cost_cents: stats.cost,
  }))
}
