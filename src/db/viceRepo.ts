/**
 * THE BLACK BOX, ON THE ACCOUNT.
 *
 * Every read and write of `vice_attempts` and `vice_reports`. Nothing outside
 * this file touches them — the same rule the rest of `src/db` lives by, and the
 * reason the platform move (vision item 36) rewrites twelve files instead of
 * the app.
 *
 * ----------------------------------------------------------------------------
 * EVERY READ IS PAGED, FROM THE FIRST LINE. This record's entire promise is
 * that it accumulates for years, so it is precisely the thing that outgrows a
 * page: Supabase returns at most 1,000 rows and says NOTHING about the ones it
 * dropped — no error, no flag, just a shorter list. That has already cost this
 * project real data twice, once silently deleting the later sets of every
 * workout. A truncated Black Box would quietly shorten somebody's history and
 * every number computed from it. `readAllRows` orders by `id` so paging cannot
 * skip a row.
 *
 * ----------------------------------------------------------------------------
 * THE OWNER IS STAMPED HERE, FROM THE SESSION, AND NEVER TAKEN FROM THE BODY.
 * Every row written gets `user_id` overwritten with the authenticated id
 * whatever the client sent, and every read is filtered by it. The row-level
 * security policies say the same thing, and the belt and the braces are not
 * redundant: the 66 policies are deleted rather than ported when the platform
 * moves, and this scoping is what survives that day.
 *
 * ----------------------------------------------------------------------------
 * NOTHING HERE DELETES. A removal is an `UPDATE` setting `deleted_at`, written
 * by the app like any other change. A device that was offline when something
 * was removed has to be able to learn that it went; a row that simply vanished
 * would be re-uploaded by that device as something the server had forgotten.
 */

import { createServerSupabaseClient } from "./supabase"
import { readAllRows } from "./paging"
import {
  VICE_ATTEMPT_COLUMNS,
  VICE_REPORT_COLUMNS,
  type ViceAttemptRow,
  type ViceReportRow,
  type ViceRows,
} from "./viceTypes"

const ATTEMPTS = VICE_ATTEMPT_COLUMNS.join(", ")
const REPORTS = VICE_REPORT_COLUMNS.join(", ")

/**
 * Everything on this account that changed after `since`.
 *
 * `since` is an exclusive lower bound, so a client that has already taken a row
 * stamped exactly at its watermark does not take it again on every sync
 * forever. Null means "everything", which is the first read on a new device.
 *
 * TOMBSTONES ARE RETURNED, not filtered. They are the mechanism by which a
 * deletion reaches a device that was asleep when it happened; `forVice` in the
 * service drops them before anything is drawn.
 */
export async function readViceRows(userId: string, since: string | null): Promise<ViceRows> {
  const supabase = await createServerSupabaseClient()

  /**
   * One table's delta, paged.
   *
   * Written as one whole chain per case rather than built up in a variable, so
   * the `.range()` is visible ON the chain — to a reader, and to the
   * architecture test that refuses a read with no upper bound. The table name
   * is a parameter for the same reason it is next door in `lifePlanRepo`: the
   * generated client types do not know these tables yet.
   */
  const delta = <T>(table: string, columns: string) =>
    readAllRows<T>(table, (from, to) =>
      // The cast is the price of a table the generated client types do not know
      // yet. It is narrowed to the shape `readAllRows` needs — `{ data, error }`
      // — rather than to `any`, so the rest of the chain stays checked.
      (since === null
        ? supabase.from(table).select(columns).eq("user_id", userId)
            .order("id", { ascending: true }).range(from, to)
        : supabase.from(table).select(columns).eq("user_id", userId).gt("updated_at", since)
            .order("id", { ascending: true }).range(from, to)
      ) as unknown as PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
    )

  const [attempts, reports] = await Promise.all([
    delta<ViceAttemptRow>("vice_attempts", ATTEMPTS),
    delta<ViceReportRow>("vice_reports", REPORTS),
  ])

  return { attempts: attempts.map(canonical), reports: reports.map(canonical) }
}

/**
 * THE DATABASE'S SPELLING OF AN INSTANT IS NOT JAVASCRIPT'S, AND THE MERGE
 * COMPARES STRINGS.
 *
 * Postgres hands a `timestamptz` back as `2026-09-23T10:00:02+00:00`. The app
 * writes `2026-09-23T10:00:02.000Z`. They are the SAME INSTANT and they are not
 * the same text — and `+` sorts before `.`, so the round-tripped copy compares
 * as OLDER than the identical local one.
 *
 * `viceSyncService` resolves a conflict by `updatedAt > updatedAt` on purpose:
 * string comparison of canonical UTC is exact, needs no parsing, and cannot
 * throw. That holds only while every stamp is spelled the same way. Left
 * unconverted, a row that had been to the server and back would lose every
 * merge against its own local twin, so a device would re-send the same rows
 * forever and two devices would never converge on an edit.
 *
 * Found by driving the real route against the real tables — no unit test with a
 * fake database could have produced Postgres's spelling.
 *
 * This is the boundary where the database's format becomes the app's, so it is
 * the only correct place for it: the sync layer must never have to know that
 * two spellings of one instant exist.
 */
function canonical<T extends { updated_at: string; deleted_at: string | null }>(row: T): T {
  return {
    ...row,
    updated_at: toIsoZ(row.updated_at),
    deleted_at: row.deleted_at === null ? null : toIsoZ(row.deleted_at),
  }
}

/** An instant, spelled the one way the app spells it. Unparseable text is left alone. */
function toIsoZ(value: string): string {
  const at = Date.parse(value)
  return Number.isNaN(at) ? value : new Date(at).toISOString()
}

/** Whether this account holds any Black Box rows at all. */
export async function accountHasViceRows(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await supabase
    .from("vice_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
  if (error) throw new Error(`Failed to count vice attempts: ${error.message}`)
  return (count ?? 0) > 0
}

/**
 * Write the rows a device is sending.
 *
 * ATTEMPTS BEFORE REPORTS, ALWAYS. A report's foreign key is
 * `(attempt_id, user_id)` against `vice_attempts`, so a report arriving in the
 * same push as the run it belongs to is rejected unless the run lands first.
 * A lapse is exactly that push: one new report and the run it ended.
 *
 * `onConflict: "id"` makes this an upsert rather than an insert, which is what
 * a sync needs — the same row is sent again whenever it changes, and an edit
 * made on a second device is an update here, not a duplicate.
 */
export async function writeViceRows(userId: string, rows: ViceRows): Promise<void> {
  const supabase = await createServerSupabaseClient()

  if (rows.attempts.length > 0) {
    const owned = rows.attempts.map((a) => ({ ...a, user_id: userId }))
    const { error } = await supabase.from("vice_attempts").upsert(owned, { onConflict: "id" })
    if (error) throw new Error(`Failed to write vice attempts: ${error.message}`)
  }

  if (rows.reports.length > 0) {
    const owned = rows.reports.map((r) => ({ ...r, user_id: userId }))
    const { error } = await supabase.from("vice_reports").upsert(owned, { onConflict: "id" })
    if (error) throw new Error(`Failed to write vice reports: ${error.message}`)
  }
}
