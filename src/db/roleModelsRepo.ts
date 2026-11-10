/**
 * YOUR COUNCIL'S ROWS (Plans/role-models.md, Phase 7).
 *
 * Read and written with the SIGNED-IN client, so row security keeps every row to
 * its owner; the user id always comes from the session, never from a request
 * body. The catalogue itself is files (src/role-models/data), not here.
 */

import type { CouncilMember } from "@/src/role-models/councilTypes"

import { createAdminSupabaseClient, createServerSupabaseClient } from "./supabase"

interface Row { role_model_id: string; position: number; taken_values: string[]; added_at: string }

const toMember = (r: Row): CouncilMember => ({
  roleModelId: r.role_model_id,
  position: r.position,
  takenValues: r.taken_values,
  addedAt: r.added_at,
})

/** Thrown when the database refuses a sixth member. */
export class CouncilFullError extends Error {}

export async function readCouncil(userId: string): Promise<CouncilMember[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("user_role_models")
    .select("role_model_id, position, taken_values, added_at")
    .eq("user_id", userId)
    .order("position")
    .order("role_model_id")
  if (error) throw new Error(`Failed to read your council: ${error.message}`)
  return ((data ?? []) as Row[]).map(toMember)
}

/** Adds a member, or changes the values taken from one already there (his position stays). */
export async function saveCouncilMember(
  userId: string,
  pick: { roleModelId: string; takenValues: string[]; position: number },
  isNew: boolean,
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = isNew
    ? await supabase.from("user_role_models").insert({
        user_id: userId,
        role_model_id: pick.roleModelId,
        position: pick.position,
        taken_values: pick.takenValues,
      })
    : await supabase
        .from("user_role_models")
        .update({ taken_values: pick.takenValues })
        .eq("user_id", userId)
        .eq("role_model_id", pick.roleModelId)
  if (error?.message.includes("council_full")) throw new CouncilFullError("council full")
  if (error) throw new Error(`Failed to save your council: ${error.message}`)
}

export async function removeCouncilMember(userId: string, roleModelId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("user_role_models").delete().eq("user_id", userId).eq("role_model_id", roleModelId)
  if (error) throw new Error(`Failed to remove from your council: ${error.message}`)
}

/** Writes each member's new position. */
export async function writeCouncilOrder(userId: string, positions: Map<string, number>): Promise<void> {
  const supabase = await createServerSupabaseClient()
  for (const [roleModelId, position] of positions) {
    const { error } = await supabase
      .from("user_role_models")
      .update({ position })
      .eq("user_id", userId)
      .eq("role_model_id", roleModelId)
    if (error) throw new Error(`Failed to reorder your council: ${error.message}`)
  }
}

// ------------------------------------------------- value of the week, reminder

/** The council's settings (Phase 12): the week's value, and the daily reminder. Off until chosen. */
export interface CouncilSettings {
  weekValue: string | null
  /** The Monday of the week the value was chosen for. */
  weekOf: string | null
  remindOn: boolean
  remindHour: number
}

const DEFAULT_SETTINGS: CouncilSettings = { weekValue: null, weekOf: null, remindOn: false, remindHour: 8 }

export async function readCouncilSettings(userId: string): Promise<CouncilSettings> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("user_role_model_settings")
    .select("week_value, week_of, remind_on, remind_hour")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`Failed to read your council settings: ${error.message}`)
  if (!data) return { ...DEFAULT_SETTINGS }
  const r = data as { week_value: string | null; week_of: string | null; remind_on: boolean; remind_hour: number }
  return { weekValue: r.week_value, weekOf: r.week_of, remindOn: r.remind_on, remindHour: r.remind_hour }
}

/** Writes only the keys given; a missing one keeps its stored value, or the default on a new row. */
export async function writeCouncilSettings(userId: string, patch: Partial<CouncilSettings>): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() }
  if (patch.weekValue !== undefined) row.week_value = patch.weekValue
  if (patch.weekOf !== undefined) row.week_of = patch.weekOf
  if (patch.remindOn !== undefined) row.remind_on = patch.remindOn
  if (patch.remindHour !== undefined) row.remind_hour = patch.remindHour
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("user_role_model_settings").upsert(row, { onConflict: "user_id" })
  if (error) throw new Error(`Failed to save your council settings: ${error.message}`)
}

export interface WeekMark { day: string; value: string; lived: boolean }

/** The marks from `from` to `to`, both "YYYY-MM-DD" and included. */
export async function readWeekMarks(userId: string, from: string, to: string): Promise<WeekMark[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("user_role_model_week_marks")
    .select("day, value, lived")
    .eq("user_id", userId)
    .gte("day", from)
    .lte("day", to)
    .order("day")
  if (error) throw new Error(`Failed to read your marks: ${error.message}`)
  return (data ?? []) as WeekMark[]
}

/** One day's mark: lived it, or fell short. `null` takes the mark back. */
export async function writeWeekMark(userId: string, day: string, value: string, lived: boolean | null): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } =
    lived === null
      ? await supabase.from("user_role_model_week_marks").delete().eq("user_id", userId).eq("day", day)
      : await supabase
          .from("user_role_model_week_marks")
          .upsert({ user_id: userId, day, value, lived, marked_at: new Date().toISOString() }, { onConflict: "user_id,day" })
  if (error) throw new Error(`Failed to save your mark: ${error.message}`)
}

export interface CouncilReminderDue { user_id: string; local_day: string; tz: string }

/** The council reminders due at `now`, from `council_reminders_due`. Each row is sent only to its own user. */
export async function councilRemindersDueAsServer(limit: number, now: Date): Promise<CouncilReminderDue[]> {
  const { data, error } = await createAdminSupabaseClient().rpc("council_reminders_due", { p_limit: limit, p_now: now.toISOString() })
  if (error) throw new Error(`Failed to read the council reminders due: ${error.message}`)
  return (data ?? []) as CouncilReminderDue[]
}

/** One person's council, read by the clock (no session). Only ids and order. */
export async function readCouncilAsServer(userId: string): Promise<CouncilMember[]> {
  const { data, error } = await createAdminSupabaseClient()
    .from("user_role_models")
    .select("role_model_id, position, taken_values, added_at")
    .eq("user_id", userId)
    .order("position")
  if (error) throw new Error(`Failed to read a council: ${error.message}`)
  return ((data ?? []) as Row[]).map(toMember)
}
