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
import { rowToAttempt, rowToReport } from "@/src/vice/blackbox/blackBoxRows"
import { contentKey } from "@/src/vice/blackbox/viceSyncService"
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
   * the `.range()` is visible ON the chain to a reader. The table name
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
/** A stamp further ahead of the server's clock than this is a device whose clock is wrong; it is pulled back to this. */
export const MAX_AHEAD_MS = 5 * 60 * 1000

/** A stamp no later than `now + MAX_AHEAD_MS`. An unparseable one is left for the database to refuse. */
export function clampStamp(value: string | null, now: Date): string | null {
  if (value === null) return null
  const at = Date.parse(value)
  const limit = now.getTime() + MAX_AHEAD_MS
  return Number.isNaN(at) || at <= limit ? value : new Date(limit).toISOString()
}

type Stamped = { id: string; updated_at: string; deleted_at: string | null }

/**
 * Split what a device sent into the rows to write and the account's copies of the ones it refused.
 *
 * A device that has been open for hours can send a row it edited before another device edited the same row. An
 * unconditional upsert puts the older version over the newer one: edits are lost and removals come back (a tombstone
 * is just a newer row). The same rule the browser merge follows: the later stamp wins; on an equal stamp the larger
 * content key wins on both sides, so they never keep swapping. A refused row's account copy goes back to the device,
 * which merges it and says something newer was already saved.
 */
export function splitNewer<T extends Stamped>(incoming: T[], held: T[], key: (row: T) => string): { write: T[]; skipped: T[] } {
  const had = new Map(held.map((h) => [h.id, h]))
  const write: T[] = []
  const skipped: T[] = []
  for (const r of incoming) {
    const h = had.get(r.id)
    if (h === undefined) {
      write.push(r)
      continue
    }
    const a = toIsoZ(r.updated_at)
    const b = toIsoZ(h.updated_at)
    if (a > b || (a === b && key(r) > key(h))) write.push(r)
    else if (a === b && key(r) === key(h)) write.push(r) // the same row again: harmless
    else skipped.push(h)
  }
  return { write, skipped }
}

const LOOKUP_CHUNK = 100

async function heldRows<T>(table: "vice_attempts" | "vice_reports", userId: string, ids: string[]): Promise<T[]> {
  const supabase = await createServerSupabaseClient()
  const out: T[] = []
  for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", userId).in("id", ids.slice(i, i + LOOKUP_CHUNK))
    if (error) throw new Error(`Failed to read ${table} before writing: ${error.message}`)
    out.push(...((data ?? []) as T[]))
  }
  return out
}

/** A row's content for the equal-stamp tie, in the app's own field names so the browser and the account agree. */
const attemptKey = (r: ViceAttemptRow) => contentKey(rowToAttempt(canonical(r)))
const reportKey = (r: ViceReportRow) => contentKey(rowToReport(canonical(r)))

/** What a write did: the account's newer copies of the rows it refused. */
export interface WriteResult {
  skipped: ViceRows
}

export async function writeViceRows(userId: string, rows: ViceRows, now: Date = new Date()): Promise<WriteResult> {
  const supabase = await createServerSupabaseClient()
  const clamp = <T extends Stamped>(r: T): T => ({ ...r, updated_at: clampStamp(r.updated_at, now) ?? r.updated_at, deleted_at: clampStamp(r.deleted_at, now) })

  const attemptsIn = rows.attempts.map(clamp)
  const heldA = attemptsIn.length > 0 ? await heldRows<ViceAttemptRow>("vice_attempts", userId, attemptsIn.map((a) => a.id)) : []
  const a = splitNewer(attemptsIn, heldA, attemptKey)
  if (a.write.length > 0) {
    const owned = a.write.map((x) => ({ ...x, user_id: userId }))
    const { error } = await supabase.from("vice_attempts").upsert(owned, { onConflict: "id" })
    if (error) throw new Error(`Failed to write vice attempts: ${error.message}`)
  }

  const reportsIn = rows.reports.map(clamp)
  const heldR = reportsIn.length > 0 ? await heldRows<ViceReportRow>("vice_reports", userId, reportsIn.map((r) => r.id)) : []
  const r = splitNewer(reportsIn, heldR, reportKey)
  if (r.write.length > 0) {
    const owned = r.write.map((x) => ({ ...x, user_id: userId }))
    const { error } = await supabase.from("vice_reports").upsert(owned, { onConflict: "id" })
    if (error) throw new Error(`Failed to write vice reports: ${error.message}`)
  }
  return { skipped: { attempts: a.skipped.map(canonical), reports: r.skipped.map(canonical) } }
}
