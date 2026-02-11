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
  // New step completion flags
  values_completed: boolean
  shadow_completed: boolean
  peak_experience_completed: boolean
  hurdles_completed: boolean
  cutting_completed: boolean
  // Shadow step data
  shadow_response: string | null
  shadow_inferred_values: InferredValue[] | null
  // Peak experience step data
  peak_experience_response: string | null
  peak_experience_inferred_values: InferredValue[] | null
  // Hurdles step data
  hurdles_response: string | null
  hurdles_inferred_values: InferredValue[] | null
  // Prioritization flow data
  essential_selection: string[] | null  // Values marked as essential (before elimination)
  // Final results
  final_core_values: CoreValue[] | null
  aspirational_values: { id: string }[] | null
  // Legacy fields (kept for backward compatibility during migration)
  step1_completed?: boolean
  step2_completed?: boolean
  step3_completed?: boolean
  deathbed_response?: string | null
  deathbed_inferred_values?: InferredValue[] | null
  // Timestamps
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

  // Apply defaults for new columns that may not exist in DB yet
  return applyDefaults(data as InnerGameProgressRow)
}

/**
 * Apply defaults for new columns during migration period.
 */
function applyDefaults(row: InnerGameProgressRow): InnerGameProgressRow {
  return {
    ...row,
    // Map legacy fields to new fields if new fields are missing
    values_completed: row.values_completed ?? row.step1_completed ?? false,
    shadow_completed: row.shadow_completed ?? false,
    peak_experience_completed: row.peak_experience_completed ?? false,
    hurdles_completed: row.hurdles_completed ?? row.step2_completed ?? false,
    cutting_completed: row.cutting_completed ?? false,
    shadow_response: row.shadow_response ?? null,
    shadow_inferred_values: row.shadow_inferred_values ?? null,
    peak_experience_response: row.peak_experience_response ?? null,
    peak_experience_inferred_values: row.peak_experience_inferred_values ?? null,
    essential_selection: row.essential_selection ?? null,
  }
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

  return applyDefaults(data as InnerGameProgressRow)
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

  return applyDefaults(data as InnerGameProgressRow)
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

  return applyDefaults(result as InnerGameProgressRow)
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
      values_completed: false,
      shadow_completed: false,
      peak_experience_completed: false,
      hurdles_completed: false,
      cutting_completed: false,
      shadow_response: null,
      shadow_inferred_values: null,
      peak_experience_response: null,
      peak_experience_inferred_values: null,
      hurdles_response: null,
      hurdles_inferred_values: null,
      essential_selection: null,
      final_core_values: null,
      aspirational_values: null,
      // Reset legacy fields too
      step1_completed: false,
      step2_completed: false,
      step3_completed: false,
      deathbed_response: null,
      deathbed_inferred_values: null,
    })
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to reset progress: ${error.message}`)
  }

  return applyDefaults(data as InnerGameProgressRow)
}

export type SectionName = "values" | "shadow" | "peak_experience" | "hurdles" | "cutting"

/**
 * Reset a specific section and all dependent sections.
 * Cascade order: values → shadow → peak_experience → hurdles → cutting
 *
 * Note: This only resets the progress table. Caller must also clear related tables:
 * - values: delete from user_values
 * - cutting: delete from value_comparisons
 */
export async function resetSection(
  userId: string,
  section: SectionName
): Promise<InnerGameProgressRow> {
  const supabase = await createServerSupabaseClient()

  // Build update object based on section and cascade
  const updates: InnerGameProgressUpdate = {}

  // Cascade: resetting earlier sections also resets later ones
  if (section === "values") {
    updates.current_step = 1 // VALUES step
    updates.current_substep = 0
    updates.values_completed = false
    updates.step1_completed = false // legacy
  }
  if (section === "values" || section === "shadow") {
    updates.shadow_completed = false
    updates.shadow_response = null
    updates.shadow_inferred_values = null
  }
  if (section === "values" || section === "shadow" || section === "peak_experience") {
    updates.peak_experience_completed = false
    updates.peak_experience_response = null
    updates.peak_experience_inferred_values = null
  }
  if (section === "values" || section === "shadow" || section === "peak_experience" || section === "hurdles") {
    updates.hurdles_completed = false
    updates.hurdles_response = null
    updates.hurdles_inferred_values = null
    updates.step2_completed = false // legacy
  }
  // Cutting is always reset (last in chain)
  updates.cutting_completed = false
  updates.essential_selection = null
  updates.final_core_values = null
  updates.aspirational_values = null

  const { data, error } = await supabase
    .from("inner_game_progress")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to reset section: ${error.message}`)
  }

  return applyDefaults(data as InnerGameProgressRow)
}
