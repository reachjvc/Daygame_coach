/**
 * THE PLAN'S WEEKLY REVIEW REMINDER (Plans/life-plan-after-setup.md, Phase 5, d4).
 *
 * One row per person: on or off, the weekday and the hour. Read and written
 * with the SIGNED-IN client, so row security keeps it to its owner; the user
 * id always comes from the session, never from a request body. The clock's
 * two reads go through the service role, because the clock has no session.
 */

import { createAdminSupabaseClient, createServerSupabaseClient } from "./supabase"

export interface Reminder { pushOn: boolean; reviewDay: number; reviewHour: number }

/** The table's own defaults: off, Sunday, 19:00. */
const DEFAULT_REMINDER: Reminder = { pushOn: false, reviewDay: 7, reviewHour: 19 }

export async function readReminder(userId: string): Promise<Reminder> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("life_plan_reminders")
    .select("push_on, review_day, review_hour")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`Failed to read your reminder: ${error.message}`)
  if (!data) return { ...DEFAULT_REMINDER }
  const row = data as { push_on: boolean; review_day: number; review_hour: number }
  return { pushOn: row.push_on, reviewDay: row.review_day, reviewHour: row.review_hour }
}

/** Writes only the keys given; a missing one keeps its stored value, or the table default on a new row. */
export async function writeReminder(userId: string, patch: Partial<Reminder>): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() }
  if (patch.pushOn !== undefined) row.push_on = patch.pushOn
  if (patch.reviewDay !== undefined) row.review_day = patch.reviewDay
  if (patch.reviewHour !== undefined) row.review_hour = patch.reviewHour
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("life_plan_reminders").upsert(row, { onConflict: "user_id" })
  if (error) throw new Error(`Failed to save your reminder: ${error.message}`)
}

export interface ReminderDue { user_id: string; local_day: string; review_day: number }

/** The reminders due at `now`, from `plan_reviews_due`. Each row is sent only to its own user. */
export async function remindersDueAsServer(limit: number, now: Date): Promise<ReminderDue[]> {
  const { data, error } = await createAdminSupabaseClient().rpc("plan_reviews_due", { p_limit: limit, p_now: now.toISOString() })
  if (error) throw new Error(`Failed to read the reminders due: ${error.message}`)
  return (data ?? []) as ReminderDue[]
}

/** Whether that week's review has anything written in it: a yes or no, never its text. */
export async function weekReviewWrittenAsServer(userId: string, periodStart: string): Promise<boolean> {
  const { data, error } = await createAdminSupabaseClient().rpc("plan_week_review_written", { p_user: userId, p_start: periodStart })
  if (error) throw new Error(`Failed to check the week's review: ${error.message}`)
  return data === true
}
