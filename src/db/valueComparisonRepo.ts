import { createServerSupabaseClient } from "./supabase"

/**
 * Database row type for value_comparisons table.
 */
export type ValueComparisonRow = {
  id: string
  user_id: string
  value_a_id: string
  value_b_id: string
  chosen_value_id: string
  comparison_type: "pairwise" | "aspirational_vs_current"
  round_number: number
  created_at: string
}

export type ValueComparisonInsert = {
  user_id: string
  value_a_id: string
  value_b_id: string
  chosen_value_id: string
  comparison_type: "pairwise" | "aspirational_vs_current"
  round_number?: number
}

/**
 * Save a single comparison result.
 */
export async function saveComparison(
  comparison: ValueComparisonInsert
): Promise<ValueComparisonRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("value_comparisons")
    .insert(comparison)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save comparison: ${error.message}`)
  }

  return data as ValueComparisonRow
}

/**
 * Save multiple comparisons at once.
 */
export async function saveComparisons(
  comparisons: ValueComparisonInsert[]
): Promise<ValueComparisonRow[]> {
  if (comparisons.length === 0) {
    return []
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("value_comparisons")
    .insert(comparisons)
    .select()

  if (error) {
    throw new Error(`Failed to save comparisons: ${error.message}`)
  }

  return (data ?? []) as ValueComparisonRow[]
}

/**
 * Get all comparisons for a user.
 */
export async function getComparisons(userId: string): Promise<ValueComparisonRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("value_comparisons")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to get comparisons: ${error.message}`)
  }

  return (data ?? []) as ValueComparisonRow[]
}

/**
 * Get comparisons of a specific type for a user.
 */
export async function getComparisonsByType(
  userId: string,
  type: "pairwise" | "aspirational_vs_current"
): Promise<ValueComparisonRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("value_comparisons")
    .select("*")
    .eq("user_id", userId)
    .eq("comparison_type", type)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to get comparisons: ${error.message}`)
  }

  return (data ?? []) as ValueComparisonRow[]
}

/**
 * Delete all comparisons for a user (used when resetting).
 */
export async function deleteAllComparisons(userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("value_comparisons")
    .delete()
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to delete comparisons: ${error.message}`)
  }
}

/**
 * Get comparison count for analytics.
 */
export async function getComparisonCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { count, error } = await supabase
    .from("value_comparisons")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to count comparisons: ${error.message}`)
  }

  return count ?? 0
}
