/**
 * THE DAY HALF OF A LIFE MASTERY PLAN, AS ROWS.
 *
 * Kept apart from `lifePlanTypes.ts` on purpose, and the separation is the
 * point rather than tidiness: **the whole-plan save must never be able to reach
 * these tables.** That is rule 4 of the deployment plan the owner approved, it
 * is enforced in `save_life_plan` by a guard that names them, and a shared type
 * file is how the two halves start sharing a mapper and then a write.
 *
 * A plan is REPLACED on every save; a day is APPENDED TO. One keystroke in the
 * plan must not be able to wipe a year of journal.
 */

/** One day somebody opened, with the line they wrote about it. */
export interface DayRow {
  id: string
  user_id: string
  plan_id: string
  /** The person's own calendar day, in their account's timezone. */
  on_date: string
  note: string
}

/** That day's 0-10 for one area. */
export interface DayRatingRow {
  user_id: string
  day_id: string
  area_id: string
  rating: number
}

/** One thing ticked off on that day. */
export interface DayTickRow {
  user_id: string
  day_id: string
  node_id: string
}

/**
 * One answer written on that day.
 *
 * `local_id` is the plan's own id for whatever asked — a field (`f3`) or a
 * routine step (`s7`) — and NOT a foreign key, which is what lets an answer
 * outlive the question. `asked` is the question's words on the day it was
 * answered, which is a different fact from the question's words now.
 */
export interface DayJournalRow {
  id: string
  user_id: string
  day_id: string
  local_id: string
  asked: string
  body: string
}

/** Everything the day half holds for one plan, as it comes off the database. */
export interface DayRows {
  days: DayRow[]
  ratings: DayRatingRow[]
  ticks: DayTickRow[]
  journal: DayJournalRow[]
}

/**
 * What one day's save is allowed to change.
 *
 * **Absent is not null, and that is the whole shape of it.** A key that is not
 * present is not touched; `null` inside a present map clears that one cell. A
 * payload that omits `ratings` cannot empty a day's ratings, which is the same
 * rule the whole-plan save follows and for the same reason — the browser that
 * has not drawn a screen yet must not be able to erase what another one wrote.
 */
export interface DayPatch {
  /** The account's calendar day this is about. */
  date: string
  /** The line about the day. `null` clears it. */
  note?: string | null
  /** Plan-local area id to 0-10, or `null` to clear that area's rating. */
  ratings?: Record<string, number | null>
  /** Plan-local id to whether it is ticked. `false` removes the tick. */
  ticks?: Record<string, boolean>
  /** Plan-local id to what was written. `""` removes the answer. */
  journal?: Record<string, string>
  /** The words of each question being answered, for the ones in `journal`. */
  asked?: Record<string, string>
}
