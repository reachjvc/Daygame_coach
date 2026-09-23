/**
 * THE BLACK BOX'S ROWS, AS THE DATABASE HOLDS THEM.
 *
 * Snake case and nothing else: this file describes the two tables, not the
 * record the app works in. The mapping between the two lives in `viceRepo.ts`
 * and nowhere else, so a column rename is one file.
 *
 * THE THREE KINDS OF TIME ARE THREE DIFFERENT THINGS HERE TOO, and the whole
 * module has already had one bug from muddling them:
 *   - `started_on` / `ended_on` — a calendar day in the person's own calendar,
 *     `YYYY-MM-DD`, no zone, because a day has none.
 *   - `at` — the night something happened, in the person's own wall clock, with
 *     NO trailing `Z`. A report filed at 23:30 in Berlin must not become
 *     tomorrow, which is what a zone would do to it.
 *   - `updated_at` / `deleted_at` — sync bookkeeping, compared across devices
 *     that may be in different places, so true UTC instants ending in `Z`.
 */

import type { ViceEndingId } from "@/src/vice/types"

export interface ViceAttemptRow {
  /** Minted on the device, never by the database. */
  id: string
  user_id: string
  vice_id: string
  label: string
  started_on: string
  started_by: string
  structure: string[]
  ended_on: string | null
  /** The report that ended it. Deliberately not a foreign key — see the migration. */
  ended_by_report_id: string | null
  updated_at: string
  deleted_at: string | null
}

export interface ViceReportRow {
  id: string
  user_id: string
  attempt_id: string
  at: string
  went_through: boolean
  thought: string
  ending: ViceEndingId
  closeness: number | null
  with_whom: string
  /** `where` is reserved in SQL. */
  where_at: string
  factors: string[]
  did_instead: string
  updated_at: string
  deleted_at: string | null
}

/** Both tables' rows, as one delta travels. */
export interface ViceRows {
  attempts: ViceAttemptRow[]
  reports: ViceReportRow[]
}

export function emptyViceRows(): ViceRows {
  return { attempts: [], reports: [] }
}

/**
 * The columns each table has, named once.
 *
 * Used to build the select list rather than `select("*")`, so a column added to
 * the table later cannot silently start arriving in the app untyped — and so
 * the reader can see what a row is without opening the migration.
 */
export const VICE_ATTEMPT_COLUMNS = [
  "id",
  "user_id",
  "vice_id",
  "label",
  "started_on",
  "started_by",
  "structure",
  "ended_on",
  "ended_by_report_id",
  "updated_at",
  "deleted_at",
] as const

export const VICE_REPORT_COLUMNS = [
  "id",
  "user_id",
  "attempt_id",
  "at",
  "went_through",
  "thought",
  "ending",
  "closeness",
  "with_whom",
  "where_at",
  "factors",
  "did_instead",
  "updated_at",
  "deleted_at",
] as const
