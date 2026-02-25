/**
 * Scenario persistence — insert attempts and query aggregate stats.
 *
 * The `scenarios` table stores every evaluated scenario attempt.
 * Aggregate queries feed the badge L3s:
 *   l3_scenario_sessions → total rows
 *   l3_scenario_types_tried → distinct scenario_type count
 *   l3_scenario_high_scores → rows where evaluation.score >= 7
 */

import { createServerSupabaseClient } from "./supabase"
import type { ScenarioRow, ScenarioInsert } from "./types"

// ============================================
// Insert
// ============================================

/**
 * Persist a scenario attempt after evaluation.
 * The evaluation JSONB must always have a top-level `score` field (1-10).
 */
export async function createScenarioAttempt(
  insert: ScenarioInsert
): Promise<ScenarioRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("scenarios")
    .insert(insert)
    .select()
    .single()

  if (error) throw new Error(`Failed to insert scenario attempt: ${error.message}`)
  return data as ScenarioRow
}

// ============================================
// Aggregate Queries (for badge L3s)
// ============================================

export interface ScenarioStats {
  totalSessions: number
  uniqueTypes: number
  highScoreCount: number
}

/**
 * Get aggregate scenario stats for a user.
 * Used by badge engine to compute l3_scenario_sessions, l3_scenario_types_tried, l3_scenario_high_scores.
 *
 * Note: fetches all rows for the user to compute aggregates in JS. This is fine
 * for expected volumes (<1000 rows per user). For higher scale, migrate to a
 * Postgres RPC with COUNT(DISTINCT ...) and COUNT(*) FILTER (...).
 */
export async function getScenarioStats(userId: string): Promise<ScenarioStats> {
  const supabase = await createServerSupabaseClient()

  const { data: rows, count } = await supabase
    .from("scenarios")
    .select("scenario_type, evaluation", { count: "exact" })
    .eq("user_id", userId)

  const types = new Set<string>()
  let highScoreCount = 0

  if (rows) {
    for (const row of rows) {
      if (row.scenario_type) types.add(row.scenario_type)
      const evaluation = row.evaluation as Record<string, unknown> | null
      const score = typeof evaluation?.score === "number" ? evaluation.score : 0
      if (score >= 7) highScoreCount++
    }
  }

  return {
    totalSessions: count ?? 0,
    uniqueTypes: types.size,
    highScoreCount,
  }
}
