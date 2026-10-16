/**
 * Scenario persistence — insert attempts and query aggregate stats.
 *
 * The `scenarios` table stores every evaluated scenario attempt.
 * Aggregate queries feed the badge L3s:
 *   l3_scenario_sessions → total rows
 *   l3_scenario_types_tried → distinct scenario_type count
 *   l3_scenario_high_scores → rows where score >= 7
 */

import { createAdminSupabaseClient, createServerSupabaseClient } from "./supabase"
import type { ScenarioRow, ScenarioInsert } from "./types"

// ============================================
// Insert
// ============================================

/**
 * Persist a scenario attempt after evaluation.
 *
 * As the server, not the person: the score feeds badges, so a person must not
 * be able to write one (`scenarios` has no INSERT policy). Callers pass the id
 * of the signed-in account.
 */
export async function createScenarioAttempt(
  insert: ScenarioInsert
): Promise<ScenarioRow> {
  const supabase = createAdminSupabaseClient()

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

  const { data: rows, count, error } = await supabase
    .from("scenarios")
    .select("scenario_type, score", { count: "exact" })
    .eq("user_id", userId)

  if (error) throw new Error(`Failed to read scenario stats: ${error.message}`)

  const types = new Set<string>()
  let highScoreCount = 0

  for (const row of rows ?? []) {
    if (row.scenario_type) types.add(row.scenario_type)
    if ((row.score ?? 0) >= 7) highScoreCount++
  }

  return {
    totalSessions: count ?? 0,
    uniqueTypes: types.size,
    highScoreCount,
  }
}
