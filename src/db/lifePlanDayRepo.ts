/**
 * THE DAY HALF OF LIFE MASTERY, ON THE ACCOUNT.
 *
 * Every read and write of `life_plan_days`, `life_plan_day_ratings`,
 * `life_plan_day_ticks` and `life_plan_day_journal`. Nothing outside this file
 * touches them.
 *
 * ----------------------------------------------------------------------------
 * WHY THIS IS NOT PART OF `lifePlanRepo.ts`, which owns the other 21 tables.
 *
 * A plan is REPLACED on every save. A day is APPENDED TO. `save_life_plan`
 * deletes any row whose id is absent from the payload, and carries a guard
 * naming these four tables as ones it may never reach — because the browser
 * sends the whole plan on a debounce and a browser that has not opened the
 * Today step has no ticks to send. One shared write path and a year of
 * journalling goes on the floor the first time somebody edits a goal on a
 * second device.
 *
 * ----------------------------------------------------------------------------
 * EVERY READ IS PAGED, and the bound is on the visible chain rather than in a
 * variable. Twelve areas rated daily is ~4,400 rows a year in the ratings table
 * alone, so this passes Supabase's silent 1,000-row ceiling inside three
 * months. `readAllRows` orders by a unique column so paging cannot skip a row
 * or return one twice.
 *
 * ----------------------------------------------------------------------------
 * ABSENT IS NOT NULL. A patch changes only the keys it carries. Omitting
 * `ratings` cannot empty a day's ratings; `null` inside `ratings` clears one.
 * The difference is what lets two devices write different parts of one day
 * without either erasing the other's.
 */

import { createServerSupabaseClient } from "./supabase"
import { readAllRows } from "./paging"
import type {
  DayJournalRow,
  DayPatch,
  DayRatingRow,
  DayRow,
  DayRows,
  DayTickRow,
} from "./lifePlanDayTypes"

/**
 * The UUID each part of the plan has, keyed by the plan's own id.
 *
 * The browser talks in its own ids (`g7`, `lm_health`, `s3`) and never learns
 * the UUIDs; resolving them is the server's job, so a day write cannot be
 * rejected for a foreign key the browser could not have known about.
 */
export async function readNodeIds(userId: string, planId: string): Promise<Map<string, string>> {
  const supabase = await createServerSupabaseClient()
  const rows = await readAllRows<{ id: string; local_id: string }>("the plan's ids", (from, to) =>
    supabase
      .from("life_plan_nodes")
      .select("id, local_id")
      .eq("plan_id", planId)
      .eq("user_id", userId)
      .order("id")
      .range(from, to),
  )
  return new Map(rows.map((r) => [r.local_id, r.id]))
}

/** Every day this plan has, with what was rated, ticked and written on each. */
export async function readDayRows(userId: string, planId: string): Promise<DayRows> {
  const supabase = await createServerSupabaseClient()

  const days = await readAllRows<DayRow>("your days", (from, to) =>
    supabase
      .from("life_plan_days")
      .select("id, user_id, plan_id, on_date, note")
      .eq("plan_id", planId)
      .eq("user_id", userId)
      .order("on_date")
      .order("id")
      .range(from, to),
  )

  // The children hang off a day rather than a plan, so they are read by owner
  // and narrowed to this plan's days below. One account has one plan today, so
  // this reads nothing extra; it is written this way so a second plan per
  // account stays a migration rather than a rewrite.
  const [ratings, ticks, journal] = await Promise.all([
    readAllRows<DayRatingRow>("your ratings", (from, to) =>
      supabase
        .from("life_plan_day_ratings")
        .select("user_id, day_id, area_id, rating")
        .eq("user_id", userId)
        .order("day_id")
        .order("area_id")
        .range(from, to),
    ),
    readAllRows<DayTickRow>("your ticks", (from, to) =>
      supabase
        .from("life_plan_day_ticks")
        .select("user_id, day_id, node_id")
        .eq("user_id", userId)
        .order("day_id")
        .order("node_id")
        .range(from, to),
    ),
    readAllRows<DayJournalRow>("your journal", (from, to) =>
      supabase
        .from("life_plan_day_journal")
        .select("id, user_id, day_id, local_id, asked, body")
        .eq("user_id", userId)
        .order("id")
        .range(from, to),
    ),
  ])

  const mine = new Set(days.map((d) => d.id))
  return {
    days,
    ratings: ratings.filter((r) => mine.has(r.day_id)),
    ticks: ticks.filter((r) => mine.has(r.day_id)),
    journal: journal.filter((r) => mine.has(r.day_id)),
  }
}

/**
 * Write one day.
 *
 * `ids` maps the plan's own ids to node UUIDs and is resolved by the caller, so
 * this function never guesses: an id it cannot resolve is the caller's to
 * refuse, loudly, rather than something to drop quietly here. The journal is
 * the exception and stores the plan's id verbatim — that is what lets an answer
 * outlive the question it answered.
 *
 * Not a transaction. Each cell is its own row and its own last write, so a
 * half-applied patch leaves some cells updated and none corrupted — and two
 * devices ticking different things both win. The one thing that must happen
 * first is the day row, because everything else points at it.
 */
export async function saveDay(
  userId: string,
  planId: string,
  patch: DayPatch,
  ids: Map<string, string>,
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  // The day row first, and its note only when the patch carries one — an
  // omitted note must not blank a line somebody wrote on another device.
  const dayRow: Record<string, unknown> = { user_id: userId, plan_id: planId, on_date: patch.date }
  if (patch.note !== undefined) dayRow.note = patch.note ?? ""

  const day = await supabase
    .from("life_plan_days")
    .upsert(dayRow, { onConflict: "plan_id,on_date" })
    .select("id")
    .single()
  if (day.error) throw new Error(`Failed to open that day: ${day.error.message}`)
  const dayId = (day.data as { id: string }).id

  if (patch.ratings) {
    const set = Object.entries(patch.ratings).filter(([, v]) => v !== null)
    const clear = Object.entries(patch.ratings).filter(([, v]) => v === null).map(([k]) => ids.get(k)!)
    if (set.length > 0) {
      const { error } = await supabase.from("life_plan_day_ratings").upsert(
        set.map(([local, rating]) => ({ user_id: userId, day_id: dayId, area_id: ids.get(local)!, rating })),
        { onConflict: "day_id,area_id" },
      )
      if (error) throw new Error(`Failed to save that rating: ${error.message}`)
    }
    if (clear.length > 0) {
      const { error } = await supabase
        .from("life_plan_day_ratings")
        .delete()
        .eq("day_id", dayId)
        .eq("user_id", userId)
        .in("area_id", clear)
      if (error) throw new Error(`Failed to clear that rating: ${error.message}`)
    }
  }

  if (patch.ticks) {
    const on = Object.entries(patch.ticks).filter(([, v]) => v).map(([k]) => ids.get(k)!)
    const off = Object.entries(patch.ticks).filter(([, v]) => !v).map(([k]) => ids.get(k)!)
    if (on.length > 0) {
      const { error } = await supabase.from("life_plan_day_ticks").upsert(
        on.map((node_id) => ({ user_id: userId, day_id: dayId, node_id })),
        { onConflict: "day_id,node_id" },
      )
      if (error) throw new Error(`Failed to save that tick: ${error.message}`)
    }
    if (off.length > 0) {
      const { error } = await supabase
        .from("life_plan_day_ticks")
        .delete()
        .eq("day_id", dayId)
        .eq("user_id", userId)
        .in("node_id", off)
      if (error) throw new Error(`Failed to take that tick back: ${error.message}`)
    }
  }

  if (patch.journal) {
    // The plan's own id, stored verbatim and never resolved. An answer whose
    // question has since been deleted still reads back, which is the rule this
    // table was reshaped for.
    const written = Object.entries(patch.journal).filter(([, body]) => body.trim())
    const cleared = Object.entries(patch.journal).filter(([, body]) => !body.trim()).map(([k]) => k)
    if (written.length > 0) {
      const { error } = await supabase.from("life_plan_day_journal").upsert(
        written.map(([local_id, body]) => ({
          user_id: userId,
          day_id: dayId,
          local_id,
          asked: patch.asked?.[local_id] ?? "",
          body,
        })),
        { onConflict: "day_id,local_id" },
      )
      if (error) throw new Error(`Failed to save what you wrote: ${error.message}`)
    }
    if (cleared.length > 0) {
      const { error } = await supabase
        .from("life_plan_day_journal")
        .delete()
        .eq("day_id", dayId)
        .eq("user_id", userId)
        .in("local_id", cleared)
      if (error) throw new Error(`Failed to clear what you wrote: ${error.message}`)
    }
  }
}
