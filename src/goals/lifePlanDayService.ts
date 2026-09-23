/**
 * THE DAY HALF, TRANSLATED AND CHECKED — WITHOUT A DATABASE OR A BROWSER.
 *
 * Everything the day route decides, as pure functions, for the same reason
 * `lifePlanSync` is pure: every way this goes wrong is a way somebody loses
 * writing they cannot get back, and a rule that lives inside a route is a rule
 * nobody can test against its cases.
 *
 * The route is the thin part. It resolves who is asking, hands the work here,
 * and turns a refusal into a status code.
 */

import type { DayPatch, DayRows } from "@/src/db/lifePlanDayTypes"
import { daysBetweenDateKeys } from "@/src/shared/dateUtils"

/** The four maps the flow keeps, as `NsPlan` holds them. */
export interface DayRecord {
  /** Date to area id to 0-10. */
  daily: Record<string, Record<string, number>>
  /** Date to the ids ticked that day. */
  logged: Record<string, string[]>
  /** Date to the line about the day. */
  notes: Record<string, string>
  /** Date to question id to what was written. */
  journal: Record<string, Record<string, string>>
}

export const DAY_LIMITS = {
  /** Matches `life_plan_days.note` and `life_plan_day_journal.body`. */
  text: 100_000,
  /** Matches `life_plan_day_journal.asked`. */
  asked: 500,
  /** Matches `life_plan_nodes.local_id` and the journal's own shape check. */
  localId: 80,
} as const

const LOCAL_ID = /^[A-Za-z0-9_:.-]+$/
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/

/** A real calendar day, rejecting the 31st of February rather than storing it. */
export function isCalendarDay(value: string): boolean {
  if (!CALENDAR_DAY.test(value)) return false
  const [y, m, d] = value.split("-").map(Number)
  const at = new Date(Date.UTC(y, m - 1, d))
  return at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d
}

/**
 * May this day be written?
 *
 * **Past days stay writable.** Back-filling the day you forgot is a real thing
 * people do, and refusing it would make the app disagree with the person about
 * their own week. What is refused is a day AHEAD of the account's own calendar:
 * that is not somebody catching up, it is a clock disagreeing, and storing it
 * would put a tick under a date the person never lived.
 *
 * Tomorrow is allowed by one day deliberately — a tab open across midnight in a
 * zone ahead of the account's is the common case, not an attack.
 */
export function dayIsWritable(date: string, accountToday: string): boolean {
  if (!isCalendarDay(date) || !isCalendarDay(accountToday)) return false
  // Counted with the one helper that already knows how to subtract two calendar
  // keys without a second timezone getting a vote. The first draft of this did
  // its own `Date.UTC` arithmetic and ended on `toISOString().slice(0, 10)`,
  // which is the same mistake `toISOString().split("T")[0]` is banned for —
  // caught here only because the guard that bans it does not scan `app/` or
  // this file's neighbours.
  return daysBetweenDateKeys(accountToday, date) <= 1
}

/**
 * The plan ids in this patch that the account has never heard of.
 *
 * Ratings and ticks name a row in the plan and must resolve to one, or the
 * write is meaningless. The JOURNAL is deliberately excluded: its whole design
 * is that an answer outlives the question, so an id the plan no longer has is
 * expected there rather than an error.
 *
 * Returned rather than thrown so the route can answer with the list — the
 * browser's cure is to save the plan and try once more, and it can only do that
 * if it is told which ids were missing.
 */
export function unknownIds(patch: DayPatch, ids: Map<string, string>): string[] {
  const named = [...Object.keys(patch.ratings ?? {}), ...Object.keys(patch.ticks ?? {})]
  return [...new Set(named.filter((id) => !ids.has(id)))]
}

/** Why this patch cannot be stored, in the app's own words. Empty when it can. */
export function whyNotWritable(patch: DayPatch, accountToday: string): string {
  if (!isCalendarDay(patch.date)) return "That is not a day."
  if (!dayIsWritable(patch.date, accountToday)) return "That day is ahead of your calendar."

  if (patch.note != null && patch.note.length > DAY_LIMITS.text) {
    return "That note is too long to save. Shorten it and it will go."
  }
  for (const [id, body] of Object.entries(patch.journal ?? {})) {
    if (body.length > DAY_LIMITS.text) return "That entry is too long to save. Shorten it and it will go."
    if (!LOCAL_ID.test(id) || id.length > DAY_LIMITS.localId) return "Something in this plan has an id it cannot be saved under."
  }
  for (const value of Object.values(patch.ratings ?? {})) {
    if (value === null) continue
    if (!Number.isInteger(value) || value < 0 || value > 10) return "A rating is a whole number from 0 to 10."
  }
  return ""
}

/**
 * Trim the question's words to what the column will take.
 *
 * Cut rather than refused: the words are a label for an answer somebody has
 * already written, and losing the answer because its question was long would be
 * the tail wagging the dog. The answer itself is refused when it is too long,
 * because that is the thing they wrote.
 */
export function fitAsked(asked: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [id, words] of Object.entries(asked ?? {})) out[id] = words.slice(0, DAY_LIMITS.asked)
  return out
}

/**
 * The rows, as the four maps the flow works in.
 *
 * A tick or a rating whose node has since been deleted is dropped here: the
 * database has already cascaded those away, and one that survives is a row
 * pointing at nothing. A JOURNAL entry is never dropped — it keys on the plan's
 * own id, and an entry whose question is gone is exactly what `journalArchive`
 * is built to show.
 */
export function dayRowsToRecord(rows: DayRows, localIdFor: Map<string, string>): DayRecord {
  const dateOf = new Map(rows.days.map((d) => [d.id, d.on_date]))
  const record: DayRecord = { daily: {}, logged: {}, notes: {}, journal: {} }

  for (const day of rows.days) if (day.note.trim()) record.notes[day.on_date] = day.note

  for (const r of rows.ratings) {
    const date = dateOf.get(r.day_id)
    const area = localIdFor.get(r.area_id)
    if (!date || !area) continue
    record.daily[date] = { ...(record.daily[date] ?? {}), [area]: r.rating }
  }

  for (const t of rows.ticks) {
    const date = dateOf.get(t.day_id)
    const local = localIdFor.get(t.node_id)
    if (!date || !local) continue
    record.logged[date] = [...(record.logged[date] ?? []), local]
  }

  for (const j of rows.journal) {
    const date = dateOf.get(j.day_id)
    if (!date || !j.body.trim()) continue
    record.journal[date] = { ...(record.journal[date] ?? {}), [j.local_id]: j.body }
  }

  return record
}

/** Whether a day record holds anything at all — the import's whole question. */
export function recordIsEmpty(record: DayRecord): boolean {
  return (
    Object.keys(record.daily).length === 0 &&
    Object.keys(record.logged).length === 0 &&
    Object.keys(record.notes).length === 0 &&
    Object.keys(record.journal).length === 0
  )
}

/**
 * One patch per day, for sending a whole browser record to the account once.
 *
 * The import is the only caller: every other write is one day, because one day
 * is what a person changes. Sorted so a partial failure stops at a knowable
 * point rather than leaving a random half of the year behind.
 */
export function recordToPatches(record: DayRecord): DayPatch[] {
  const dates = new Set([
    ...Object.keys(record.daily),
    ...Object.keys(record.logged),
    ...Object.keys(record.notes),
    ...Object.keys(record.journal),
  ])
  return [...dates].sort().map((date) => {
    const patch: DayPatch = { date }
    if (record.notes[date] !== undefined) patch.note = record.notes[date]
    if (record.daily[date]) patch.ratings = { ...record.daily[date] }
    if (record.logged[date]) patch.ticks = Object.fromEntries(record.logged[date].map((id) => [id, true]))
    if (record.journal[date]) patch.journal = { ...record.journal[date] }
    return patch
  })
}
