/**
 * Database access for `life_answers` — the one thing, and the dated written
 * answers that will join it.
 *
 * Insert and delete only. There is no update function here and there is no
 * UPDATE policy on the table: replacing your one thing writes a new row, and
 * the old one keeps the moment it was written.
 */

import { createServerSupabaseClient } from "./supabase"

/**
 * The keys this table accepts. Mirrors the CHECK constraint in the migration.
 *
 * The four after the first are the one thing's SUPPORTS. They are not separate
 * statements: the why, the cost, the identity and the values are about the
 * current one thing, so they live in its chapter and start again when it does.
 */
export const LIFE_ANSWER_KEYS = ["one_thing", "one_why", "one_cost", "one_identity", "one_values"] as const
export type LifeAnswerKey = (typeof LIFE_ANSWER_KEYS)[number]

export interface LifeAnswerRow {
  id: string
  user_id: string
  /** Which chapter this wording belongs to. The chapter owns the dates. */
  chapter_id: string
  answer_key: string
  body: string
  answered_at: string
  created_at: string
}

const COLUMNS = "id, user_id, chapter_id, answer_key, body, answered_at, created_at"

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
  key?: LifeAnswerKey
): Promise<LifeAnswerRow[]> {
  const supabase = await createServerSupabaseClient()

  /* All keys when none is named. The step shows the sentence and its four
     supports together, and five round trips for one screen is five chances for
     them to arrive describing different chapters. */
  let query = supabase.from("life_answers").select(COLUMNS).eq("user_id", userId)
  if (key) query = query.eq("answer_key", key)

  const { data, error } = await query
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
 * A version, not a commitment. The dates it runs between live on the chapter it
 * is written into, which is why nothing here takes a deadline: amending your
 * wording must not be able to move the clock, and the only way to guarantee that
 * is for this function to have no way of expressing it.
 */
export async function addLifeAnswer(
  userId: string,
  key: LifeAnswerKey,
  body: string,
  chapterId: string
): Promise<LifeAnswerRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("life_answers")
    .insert({ user_id: userId, answer_key: key, body: body.trim(), chapter_id: chapterId })
    .select(COLUMNS)
    .single()

  if (error) {
    throw new Error(`Failed to write life answer: ${error.message}`)
  }

  return data as LifeAnswerRow
}

/* `deleteLifeAnswer` was here. A wording is no longer separately deletable:
   the history lists CHAPTERS and the bin removes a whole chapter, its wordings
   going with it by `on delete cascade` (see `deleteChapter`). The function
   survived the change unreferenced, still documented as "deleting the newest
   row makes the one before it current again" — which stopped being how current
   works when current became the newest chapter. Removed rather than left as a
   trap. Deleting a single wording is an open question in
   docs/plans/one-thing-chapters-review.md §3.2. */
