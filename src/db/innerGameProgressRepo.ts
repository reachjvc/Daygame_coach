import { createServerSupabaseClient } from "./supabase"

/**
 * Database row type for inner_game_progress table.
 */
export type InnerGameProgressRow = {
  id: string
  user_id: string
  current_step: number
  current_substep: number
  welcome_dismissed: boolean
  step1_completed: boolean
  step2_completed: boolean
  step3_completed: boolean
  cutting_completed: boolean
  hurdles_response: string | null
  hurdles_inferred_values: InferredValue[] | null
  deathbed_response: string | null
  deathbed_inferred_values: InferredValue[] | null
  final_core_values: CoreValue[] | null
  aspirational_values: { id: string }[] | null
  created_at: string
  updated_at: string
}

export type InferredValue = {
  id: string
  reason: string
}

export type CoreValue = {
  id: string
  rank: number
}

export type InnerGameProgressInsert = Partial<Omit<InnerGameProgressRow, "id" | "created_at" | "updated_at">> & {
  user_id: string
}

export type InnerGameProgressUpdate = Partial<Omit<InnerGameProgressRow, "id" | "user_id" | "created_at" | "updated_at">>

/**
 * Get user's inner game progress. Returns null if no progress exists.
 */
export async function getProgress(userId: string): Promise<InnerGameProgressRow | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("inner_game_progress")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    // PGRST116 = no rows found
    if (error.code === "PGRST116") {
      return null
    }
    throw new Error(`Failed to get progress: ${error.message}`)
  }

  return data as InnerGameProgressRow
}

/**
 * Create initial progress record for a user.
 */
export async function createProgress(userId: string): Promise<InnerGameProgressRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("inner_game_progress")
    .insert({ user_id: userId })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create progress: ${error.message}`)
  }

  return data as InnerGameProgressRow
}

/**
 * Get or create progress record for a user.
 */
export async function getOrCreateProgress(userId: string): Promise<InnerGameProgressRow> {
  const existing = await getProgress(userId)
  if (existing) {
    return existing
  }
  return createProgress(userId)
}

/**
 * Update user's progress.
 */
export async function updateProgress(
  userId: string,
  updates: InnerGameProgressUpdate
): Promise<InnerGameProgressRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("inner_game_progress")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update progress: ${error.message}`)
  }

  return data as InnerGameProgressRow
}

/**
 * Upsert progress - create if not exists, update if exists.
 */
export async function upsertProgress(
  userId: string,
  data: InnerGameProgressUpdate
): Promise<InnerGameProgressRow> {
  const supabase = await createServerSupabaseClient()

  const { data: result, error } = await supabase
    .from("inner_game_progress")
    .upsert(
      { user_id: userId, ...data },
      { onConflict: "user_id" }
    )
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to upsert progress: ${error.message}`)
  }

  return result as InnerGameProgressRow
}

/**
 * Reset user's progress to initial state.
 */
export async function resetProgress(userId: string): Promise<InnerGameProgressRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("inner_game_progress")
    .update({
      current_step: 0,
      current_substep: 0,
      welcome_dismissed: false,
      step1_completed: false,
      step2_completed: false,
      step3_completed: false,
      cutting_completed: false,
      hurdles_response: null,
      hurdles_inferred_values: null,
      deathbed_response: null,
      deathbed_inferred_values: null,
      final_core_values: null,
      aspirational_values: null,
    })
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to reset progress: ${error.message}`)
  }

  return data as InnerGameProgressRow
}
