/**
 * Database repository for Lair (customizable dashboard)
 *
 * All database access for user_lair_config table.
 */

import { createServerSupabaseClient } from "./supabase"
import type {
  UserLairConfigRow,
  UserLairConfigInsert,
  UserLairConfigUpdate,
  UserLairLayout,
} from "./lairTypes"
import { DEFAULT_LAIR_LAYOUT } from "@/src/lair/config"

// ============================================
// Get User Layout
// ============================================

/**
 * Get user's lair layout. Returns default layout if none exists.
 */
export async function getUserLairConfig(userId: string): Promise<UserLairLayout> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("user_lair_config")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    // No config exists yet - return default
    if (error.code === "PGRST116") {
      return DEFAULT_LAIR_LAYOUT
    }
    throw new Error(`Failed to get lair config: ${error.message}`)
  }

  return (data as UserLairConfigRow).layout
}

// ============================================
// Save User Layout
// ============================================

/**
 * Save user's lair layout (upsert).
 */
export async function saveUserLairConfig(
  userId: string,
  layout: UserLairLayout
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("user_lair_config")
    .upsert(
      {
        user_id: userId,
        layout: layout,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

  if (error) {
    throw new Error(`Failed to save lair config: ${error.message}`)
  }
}

// ============================================
// Reset to Default
// ============================================

/**
 * Reset user's lair layout to default.
 */
export async function resetUserLairConfig(userId: string): Promise<void> {
  await saveUserLairConfig(userId, DEFAULT_LAIR_LAYOUT)
}
