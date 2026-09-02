/**
 * Database access for `life_answers` — the one thing, and the dated written
 * answers that will join it.
 *
 * Insert and delete only. There is no update function here and there is no
 * UPDATE policy on the table: replacing your one thing writes a new row, and
 * the old one keeps the moment it was written.
 */

import { createServerSupabaseClient } from "./supabase"

/** The keys this table accepts. Mirrors the CHECK constraint in the migration. */
export const LIFE_ANSWER_KEYS = ["one_thing"] as const
export type LifeAnswerKey = (typeof LIFE_ANSWER_KEYS)[number]

export interface LifeAnswerRow {
  id: string
  user_id: string
  answer_key: string
  body: string
  answered_at: string
  due_on: string
  created_at: string
}

const COLUMNS = "id, user_id, answer_key, body, answered_at, due_on, created_at"

/**
 * Every answer to one question, newest first.
 *
 * The whole history in one query rather than a "current" call and a "history"
 * call: there are a handful of rows per person per year, and two queries would
 * be two chances for the header and the history tab to disagree about which one
 * is current.
 */
export async function getLifeAnswers(
  userId: string,
  key: LifeAnswerKey
): Promise<LifeAnswerRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("life_answers")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("answer_key", key)
    // id breaks the tie when two rows share an instant, so the order is never
    // undefined and "current" never flickers between two rows.
    .order("answered_at", { ascending: false })
    .order("id", { ascending: false })

  if (error) {
    throw new Error(`Failed to read life answers: ${error.message}`)
  }

  return (data ?? []) as LifeAnswerRow[]
}

/**
 * Write a new answer.
 *
 * `dueOn` is a YYYY-MM-DD the caller worked out in the USER's timezone — either
 * the date they picked on the form or the default horizon. The database has no
 * default for it on purpose: a `default current_date` would be the server's UTC
 * guess, which is the bug that rolled weekly counters over on the wrong day.
 */
export async function addLifeAnswer(
  userId: string,
  key: LifeAnswerKey,
  body: string,
  dueOn: string
): Promise<LifeAnswerRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("life_answers")
    .insert({ user_id: userId, answer_key: key, body: body.trim(), due_on: dueOn })
    .select(COLUMNS)
    .single()

  if (error) {
    throw new Error(`Failed to write life answer: ${error.message}`)
  }

  return data as LifeAnswerRow
}

/**
 * Delete one of your own answers, current or historical.
 *
 * Allowed on anything, by decision: the history is kept for the person's
 * benefit, so they can drop what they no longer want to see. Deleting the
 * newest row makes the one before it current again, which is the behaviour
 * "undo the thing I just wrote" needs and costs nothing to support.
 */
export async function deleteLifeAnswer(userId: string, id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("life_answers")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Failed to delete life answer: ${error.message}`)
  }
}
