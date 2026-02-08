/**
 * API AI Service - Business Logic Layer
 *
 * This service provides the public API for AI usage tracking and budget management.
 * API routes and scenarios should import from this service, not directly from apiAiRepo.
 */

import { MODEL_PRICING, USER_BUDGET_CENTS, getWarningLevel } from "./config"
import {
  logAIUsage as repoLogAIUsage,
  getUserAIUsage as repoGetUserAIUsage,
  getUserTotalSpending as repoGetUserTotalSpending,
  getAllUsersSpending as repoGetAllUsersSpending,
} from "./apiAiRepo"
import { createAdminSupabaseClient } from "@/src/db/server"
import type {
  AIUsageInsert,
  ModelName,
  UserSpendingSummary,
  AIFeature,
  TokenUsage,
  CostBreakdown,
  BudgetStatus,
  WarningLevel,
} from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Cost Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate cost in cents from token usage
 * @param model Model name (determines pricing)
 * @param usage Token usage from AI SDK
 * @returns Cost breakdown in cents
 */
export function calculateCost(model: ModelName, usage: TokenUsage): CostBreakdown {
  const pricing = MODEL_PRICING[model]

  // Convert per-million-token pricing to per-token, then to cents
  const inputCostCents = (usage.inputTokens / 1_000_000) * pricing.input * 100
  const outputCostCents = (usage.outputTokens / 1_000_000) * pricing.output * 100
  const cacheCreationCostCents =
    ((usage.cacheCreationTokens || 0) / 1_000_000) * pricing.cacheWrite * 100
  const cacheReadCostCents = ((usage.cacheReadTokens || 0) / 1_000_000) * pricing.cacheRead * 100

  return {
    inputCostCents,
    outputCostCents,
    cacheCreationCostCents,
    cacheReadCostCents,
    totalCostCents:
      inputCostCents + outputCostCents + cacheCreationCostCents + cacheReadCostCents,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if user is within budget
 * @param userId User ID
 * @returns Budget status with warning level
 */
export async function checkUserBudget(userId: string): Promise<BudgetStatus> {
  const totalSpentCents = await repoGetUserTotalSpending(userId)
  const remainingCents = USER_BUDGET_CENTS - totalSpentCents
  const usagePercentage = totalSpentCents / USER_BUDGET_CENTS
  const warningLevel = getWarningLevel(usagePercentage)

  return {
    withinBudget: remainingCents > 0,
    totalSpentCents,
    remainingCents: Math.max(0, remainingCents),
    usagePercentage,
    warningLevel,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage Logging
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log AI usage with automatic cost calculation
 * @param params AI call details
 */
export async function logAIUsage(params: {
  userId: string
  feature: AIFeature
  scenarioId?: string
  model: ModelName
  operation: string
  usage: TokenUsage
  responseTimeMs?: number
  error?: string
  // Prompt/response content for debugging
  systemPrompt?: string
  userPrompt?: string
  aiResponse?: string
}): Promise<void> {
  const costs = calculateCost(params.model, params.usage)

  const insert: AIUsageInsert = {
    user_id: params.userId,
    feature: params.feature,
    scenario_id: params.scenarioId,
    operation: params.operation as any,
    model: params.model,
    input_tokens: params.usage.inputTokens,
    output_tokens: params.usage.outputTokens,
    cache_creation_tokens: params.usage.cacheCreationTokens || 0,
    cache_read_tokens: params.usage.cacheReadTokens || 0,
    input_cost_cents: costs.inputCostCents,
    output_cost_cents: costs.outputCostCents,
    cache_creation_cost_cents: costs.cacheCreationCostCents,
    cache_read_cost_cents: costs.cacheReadCostCents,
    total_cost_cents: costs.totalCostCents,
    response_time_ms: params.responseTimeMs,
    error: params.error,
    system_prompt: params.systemPrompt,
    user_prompt: params.userPrompt,
    ai_response: params.aiResponse,
  }

  await repoLogAIUsage(insert)
}

// ─────────────────────────────────────────────────────────────────────────────
// User Spending Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get comprehensive spending summary for a user
 * @param userId User ID
 * @returns Spending summary with budget info and breakdown by feature
 */
export async function getUserSpendingSummary(userId: string): Promise<UserSpendingSummary> {
  const usage = await repoGetUserAIUsage(userId, 30)

  const totalCostCents = usage.reduce((sum, log) => sum + Number(log.total_cost_cents), 0)
  const byFeature: Record<AIFeature, number> = {} as any

  for (const log of usage) {
    byFeature[log.feature] = (byFeature[log.feature] || 0) + Number(log.total_cost_cents)
  }

  const remainingCents = USER_BUDGET_CENTS - totalCostCents
  const usagePercentage = totalCostCents / USER_BUDGET_CENTS
  const warningLevel = getWarningLevel(usagePercentage)

  return {
    user_id: userId,
    total_cost_cents: totalCostCents,
    total_cost_dollars: totalCostCents / 100,
    total_calls: usage.length,
    by_feature: byFeature,
    budget_limit_cents: USER_BUDGET_CENTS,
    remaining_cents: Math.max(0, remainingCents),
    usage_percentage: usagePercentage,
    warning_level: warningLevel,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get spending summary for all users (admin only)
 * @returns Array of user spending summaries
 */
export async function getAllUsersSpendingSummary() {
  return repoGetAllUsersSpending()
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────

export type LoggingDiagnostics = {
  tableExists: boolean
  canInsert: boolean
  canQuery: boolean
  error: string | null
  testRecordId: string | null
  testRecord?: any
}

export type UserLoggingDiagnostics = {
  userId: string
  userExists: boolean
  userEmail?: string
  canInsert: boolean
  insertError: string | null
  testRecordId: string | null
  testRecord?: any
  costCalculation?: {
    inputCostCents: number
    outputCostCents: number
    totalCostCents: number
    totalCostDollars: number
  }
}

/**
 * Test AI usage logging functionality with full diagnostics
 * @returns Diagnostic results from table check, insert, query, and cleanup
 */
export async function testLogging(): Promise<{
  success: boolean
  message: string
  diagnostics: LoggingDiagnostics
}> {
  const diagnostics: LoggingDiagnostics = {
    tableExists: false,
    canInsert: false,
    canQuery: false,
    error: null,
    testRecordId: null,
  }

  try {
    const supabase = createAdminSupabaseClient()

    // Step 1: Check if table exists
    const { data: tables, error: tableError } = await supabase
      .from("ai_usage_logs")
      .select("id")
      .limit(1)

    if (tableError) {
      diagnostics.error = `Table check failed: ${tableError.message}`
      return {
        success: false,
        message: "AI usage logging test failed",
        diagnostics,
      }
    }

    diagnostics.tableExists = true

    // Step 2: Try to insert a test record
    const testUserId = "00000000-0000-0000-0000-000000000000" // Test UUID

    try {
      await logAIUsage({
        userId: testUserId,
        feature: "keep-it-going",
        scenarioId: "test-diagnostic",
        model: "claude-3-5-haiku-20241022",
        operation: "evaluate",
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
        },
        responseTimeMs: 1000,
      })

      diagnostics.canInsert = true
    } catch (insertError: any) {
      diagnostics.error = `Insert failed: ${insertError.message}`
      return {
        success: false,
        message: "AI usage logging test failed",
        diagnostics,
      }
    }

    // Step 3: Query back the test record
    const { data: testRecord, error: queryError } = await supabase
      .from("ai_usage_logs")
      .select("*")
      .eq("user_id", testUserId)
      .eq("scenario_id", "test-diagnostic")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (queryError) {
      diagnostics.error = `Query failed: ${queryError.message}`
      return {
        success: false,
        message: "AI usage logging test failed",
        diagnostics,
      }
    }

    diagnostics.canQuery = true
    diagnostics.testRecordId = testRecord?.id
    diagnostics.testRecord = testRecord

    // Clean up: Delete test record
    await supabase.from("ai_usage_logs").delete().eq("id", testRecord.id)

    return {
      success: true,
      message: "AI usage logging is working correctly!",
      diagnostics,
    }
  } catch (error: any) {
    diagnostics.error = error.message
    return {
      success: false,
      message: "AI usage logging test failed",
      diagnostics,
    }
  }
}

/**
 * Test AI usage logging for a specific user
 * @param userId User ID to test with
 * @returns Diagnostic results with user verification and logging test
 */
export async function testUserLogging(userId: string): Promise<{
  success: boolean
  message?: string
  diagnostics: UserLoggingDiagnostics
  nextSteps?: string[]
}> {
  const diagnostics: UserLoggingDiagnostics = {
    userId,
    userExists: false,
    canInsert: false,
    insertError: null,
    testRecordId: null,
  }

  try {
    const supabase = createAdminSupabaseClient()

    // Step 1: Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)

    if (authError) {
      diagnostics.insertError = `User not found in auth.users: ${authError.message}`
      return { success: false, diagnostics }
    }

    diagnostics.userExists = true
    diagnostics.userEmail = authUser.user?.email

    // Step 2: Insert test AI usage log
    try {
      await logAIUsage({
        userId,
        feature: "keep-it-going",
        scenarioId: "test-diagnostic-real-user",
        model: "claude-3-5-haiku-20241022",
        operation: "evaluate",
        usage: {
          inputTokens: 44000,
          outputTokens: 150,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
        },
        responseTimeMs: 1500,
      })

      diagnostics.canInsert = true
    } catch (insertError: any) {
      diagnostics.insertError = insertError.message
      return { success: false, diagnostics }
    }

    // Step 3: Query back the test record
    const { data: testRecord, error: queryError } = await supabase
      .from("ai_usage_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("scenario_id", "test-diagnostic-real-user")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (queryError) {
      diagnostics.insertError = `Query failed: ${queryError.message}`
      return { success: false, diagnostics }
    }

    diagnostics.testRecordId = testRecord?.id
    diagnostics.testRecord = testRecord
    diagnostics.costCalculation = {
      inputCostCents: testRecord.input_cost_cents,
      outputCostCents: testRecord.output_cost_cents,
      totalCostCents: testRecord.total_cost_cents,
      totalCostDollars: Number(testRecord.total_cost_cents) / 100,
    }

    return {
      success: true,
      message: "Successfully inserted test AI usage log!",
      diagnostics,
      nextSteps: [
        "Check /api/admin/api-ai-usage to see if the test record appears",
        "If this works, the issue is that the scenario isn't calling logAIUsage",
        "Check your Next.js server console for errors when using keep-it-going",
      ],
    }
  } catch (error: any) {
    diagnostics.insertError = error.message
    return { success: false, diagnostics }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export types for convenience
// ─────────────────────────────────────────────────────────────────────────────

export type { UserSpendingSummary, AIFeature, AIOperation, ModelName, WarningLevel } from "./types"
