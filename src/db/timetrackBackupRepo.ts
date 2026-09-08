/**
 * Taking a copy of everything, and putting it back.
 *
 * WHY THIS IS SEPARATE FROM `timetrackRepo`: that one reads as the signed-in
 * user, so the database itself refuses anything that is not theirs. A backup
 * has to read whole tables, so this one uses the server's key — which bypasses
 * those rules entirely. That is the reason it lives in its own file with this
 * warning on it, and why nothing in the app imports it. Scripts only.
 *
 * A BACKUP NOBODY HAS RESTORED FROM IS A BELIEF, NOT A BACKUP. The restore
 * half is here for that reason, and there is a test that runs the whole round
 * trip against a real Postgres.
 */

import { createAdminSupabaseClient } from "./server"
import { TIMETRACK_TABLES, type TimetrackRows } from "./timetrackTypes"

/** Rows per request. The database refuses to return more than 1,000 at a time. */
const PAGE_SIZE = 1000

/** Not keyed by `id`, so paging has to sort by something else */
const ORDER_KEY: Partial<Record<keyof TimetrackRows, string>> = {
  timetrack_entry_tags: "entry_id",
  timetrack_settings: "user_id",
}

export interface TimetrackBackup {
  /** what this file is, so a future reader is never guessing */
  format: "daygame-timetrack-backup"
  version: 1
  takenAt: string
  /** null means every user; a uuid means one person's data only */
  userId: string | null
  counts: Record<string, number>
  tables: Record<string, unknown[]>
}

/**
 * Read everything, a page at a time. Paging is not optional: an unpaged read
 * comes back capped at 1,000 rows and says nothing about it, which would make
 * a backup that looks complete and is not — the worst possible kind.
 */
export async function exportTimetrack(userId: string | null = null): Promise<TimetrackBackup> {
  const supabase = createAdminSupabaseClient()
  const tables: Record<string, unknown[]> = {}
  const counts: Record<string, number> = {}

  for (const table of TIMETRACK_TABLES) {
    const rows: unknown[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabase
        .from(table)
        .select("*")
        .range(from, from + PAGE_SIZE - 1)
        .order(ORDER_KEY[table] ?? "id", { ascending: true })
      if (userId) query = query.eq("user_id", userId)

      const { data, error } = await query
      if (error) throw new Error(`Could not read ${table}: ${error.message}`)
      rows.push(...(data ?? []))
      if (!data || data.length < PAGE_SIZE) break
    }
    tables[table] = rows
    counts[table] = rows.length
  }

  return {
    format: "daygame-timetrack-backup",
    version: 1,
    takenAt: new Date().toISOString(),
    userId,
    counts,
    tables,
  }
}

/** Refuse anything that is not recognisably one of our backups. */
export function assertRestorable(backup: unknown): asserts backup is TimetrackBackup {
  const b = backup as Partial<TimetrackBackup>
  if (b?.format !== "daygame-timetrack-backup") {
    throw new Error("That file is not a timetrack backup.")
  }
  if (b.version !== 1) {
    throw new Error(`That backup says version ${String(b.version)}; this code understands version 1.`)
  }
  if (!b.tables || typeof b.tables !== "object") {
    throw new Error("That backup has no tables in it.")
  }
  for (const table of TIMETRACK_TABLES) {
    if (!Array.isArray(b.tables[table])) {
      throw new Error(`That backup is missing the ${table} table, so restoring it would lose data.`)
    }
  }
}

export interface RestoreResult {
  written: Record<string, number>
  total: number
}

/**
 * Put a backup back. Rows are matched by their own ids, so restoring twice
 * changes nothing the second time.
 *
 * IT DOES NOT DELETE ANYTHING. A restore that cleared the table first would,
 * on a half-finished run, leave someone with neither their old data nor their
 * backup. Anything created since the backup survives; anything the backup holds
 * is written over the top.
 */
export async function restoreTimetrack(backup: TimetrackBackup): Promise<RestoreResult> {
  assertRestorable(backup)
  const supabase = createAdminSupabaseClient()
  const written: Record<string, number> = {}
  let total = 0

  // parents before children, or a row is refused for pointing at something the
  // database has not been told about yet
  const order = [...TIMETRACK_TABLES].sort((a, b) => {
    const rank = (t: string) =>
      t === "timetrack_workspaces" ? 0
        : t === "timetrack_clients" ? 1
          : t === "timetrack_projects" ? 2
            : t === "timetrack_tasks" ? 3
              : t === "timetrack_tags" ? 4
                : t === "timetrack_entries" ? 5
                  : 6
    return rank(a) - rank(b)
  })

  for (const table of order) {
    const rows = backup.tables[table] as Record<string, unknown>[]
    if (!rows || rows.length === 0) {
      written[table] = 0
      continue
    }
    const onConflict =
      table === "timetrack_entry_tags" ? "entry_id,tag_id" : table === "timetrack_settings" ? "user_id" : "id"

    for (let i = 0; i < rows.length; i += PAGE_SIZE) {
      const { error } = await supabase.from(table).upsert(rows.slice(i, i + PAGE_SIZE), { onConflict })
      if (error) throw new Error(`Could not restore ${table}: ${error.message}`)
    }
    written[table] = rows.length
    total += rows.length
  }

  return { written, total }
}
