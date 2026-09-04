/**
 * Database access for `life_chapters` — what you committed to, and when it runs.
 *
 * Insert, read and delete only. There is no update function here and there is no
 * UPDATE policy on the table: a chapter's dates are what every countdown is
 * measured against, so being unable to move them in place is the guarantee.
 * Changing your mind opens a new chapter; it never edits an old one.
 */

import { createServerSupabaseClient } from "./supabase"

/** The statements that can have chapters. Mirrors the CHECK in the migration. */
export const STATEMENT_KEYS = ["one_thing"] as const
export type StatementKey = (typeof STATEMENT_KEYS)[number]

export interface LifeChapterRow {
  id: string
  user_id: string
  statement_key: string
  started_on: string
  due_on: string
  /** The chapter this one continues, when a deadline moved. Null = a fresh start. */
  continues_id: string | null
  opened_at: string
  created_at: string
}

const COLUMNS = "id, user_id, statement_key, started_on, due_on, continues_id, opened_at, created_at"

/**
 * Every chapter of one statement, newest first.
 *
 * The whole list in one query rather than a "current" call and a "history" call:
 * there are a handful per person per year, and two queries would be two chances
 * for the page and its history to disagree about which one you are on.
 */
export async function getChapters(userId: string, key: StatementKey): Promise<LifeChapterRow[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("life_chapters")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("statement_key", key)
    // id breaks the tie when two chapters share an instant, so "which one am I
    // on" is never undefined and never flickers between two rows.
    .order("opened_at", { ascending: false })
    .order("id", { ascending: false })

  if (error) throw new Error(`Failed to read chapters: ${error.message}`)
  return (data ?? []) as LifeChapterRow[]
}

/**
 * Open a new chapter.
 *
 * `startedOn` and `dueOn` are YYYY-MM-DD worked out by the caller in the USER's
 * timezone. The database has no default for either on purpose: `current_date`
 * would be the server's UTC guess, which is the bug that rolled weekly counters
 * over on the wrong day.
 */
export async function openChapter(
  userId: string,
  key: StatementKey,
  startedOn: string,
  dueOn: string,
  continuesId: string | null = null,
): Promise<LifeChapterRow> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("life_chapters")
    .insert({
      user_id: userId,
      statement_key: key,
      started_on: startedOn,
      due_on: dueOn,
      continues_id: continuesId,
    })
    .select(COLUMNS)
    .single()

  if (error) throw new Error(`Failed to open a chapter: ${error.message}`)
  return data as LifeChapterRow
}

/**
 * Delete one of your own chapters, and every version written in it.
 *
 * The versions go with it — `chapter_id` is `on delete cascade` — because a
 * wording with no chapter has no dates and no meaning. Deleting the newest
 * chapter makes the one before it current again, which is what "undo the one I
 * just started" needs.
 */
export async function deleteChapter(userId: string, id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from("life_chapters")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) throw new Error(`Failed to delete that chapter: ${error.message}`)
}
