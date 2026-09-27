/**
 * What changed, and who wins when two sides disagree.
 *
 * Pure functions only — no network, no clock, no storage. The hook that does
 * the talking is `useTimetrackSync`; everything decidable is decided here so it
 * can be tested without a server.
 *
 * THE RULE FOR CONFLICTS, and why it is enough:
 *
 * Two devices editing the same entry in the same second is the hard case, and
 * it needs a special kind of data structure to solve properly. One person
 * cannot do it — you are not in two places at once — so the rule is simply the
 * newest edit to a given row wins, judged by `updated_at`.
 *
 * The exception that matters: a row this device has changed but not yet sent
 * ("dirty") is never overwritten by what the server sends back. Otherwise a
 * slow upload would lose the edit that caused it.
 *
 * A DELETED THING LEAVES A NOTE. When something disappears from the app's
 * state, the change we send is not "nothing" — it is the row with `deleted_at`
 * set. A device that was offline during the deletion would otherwise see a row
 * it still has, decide the server has forgotten it, and helpfully upload it
 * again.
 */

import { emptyRows, TIMETRACK_TABLES, type TimetrackRows } from "@/src/db/timetrackTypes"

type TableName = keyof TimetrackRows
type AnyRow = Record<string, unknown>

/** How a row is identified in the table it belongs to */
export function rowKey(table: TableName, row: AnyRow): string {
  if (table === "timetrack_entry_tags") return `${String(row.entry_id)}:${String(row.tag_id)}`
  if (table === "timetrack_settings") return String(row.user_id)
  return String(row.id)
}

/**
 * Tables a deletion cannot travel for, with the reason each one is on the list.
 *
 * THIS SET IS THE ONLY COPY OF THE RULE. It used to be three table names
 * written inline in `diffRows`, while `safeToSend` counted its "how much is
 * live on the server" total over *every* table — so the two halves counted
 * different populations and the guard could not fire. Measured on a workspace
 * of five entries and one tag: a change set deleting all seven deletable rows
 * scored 7 against a live total of 9, and `safeToSend` answered `{ok: true}` to
 * the exact catastrophe it exists to refuse.
 *
 *  - `timetrack_entry_tags` and `timetrack_webhook_log` have no `deleted_at`
 *    column at all.
 *  - `timetrack_settings` is one row per person, which cannot be deleted and
 *    also has no such column. Sending a tombstone for it fails the whole batch,
 *    and a queue that drains all-or-nothing then never drains.
 *  - `timetrack_workspaces` has the column, but a tombstone for it cannot
 *    survive the journey: `reattachToWorkspace` and `pushTimetrackRows` both
 *    rewrite a workspace row's id to the one workspace the person owns, so a
 *    tombstone arrives pointing at the very row it travelled beside — one
 *    primary key, twice, in one upsert, which Postgres refuses outright. The
 *    `deleted_at` column stays where it is: `timetrackIsEmpty` reads it, and a
 *    migration or an admin may still set it. Nothing the browser does will.
 */
const NO_TOMBSTONE = new Set<TableName>([
  "timetrack_entry_tags",
  "timetrack_webhook_log",
  "timetrack_settings",
  "timetrack_workspaces",
])

/** Can a deletion in this table be expressed as a row with `deleted_at` set? */
export function canTombstone(table: TableName): boolean {
  return !NO_TOMBSTONE.has(table)
}

function indexOf(table: TableName, rows: AnyRow[]): Map<string, AnyRow> {
  return new Map(rows.map((row) => [rowKey(table, row), row]))
}

/** Ignore bookkeeping when asking "did this actually change?" */
function meaningful(row: AnyRow): string {
  const rest: AnyRow = {}
  for (const [key, value] of Object.entries(row)) {
    if (key !== "updated_at") rest[key] = value
  }
  return JSON.stringify(rest, Object.keys(rest).sort())
}

export interface RowDiff {
  changed: Partial<TimetrackRows>
  /** How many rows are in `changed`, including tombstones */
  count: number
}

/**
 * Rows that are new, altered, or newly gone, comparing what we last sent with
 * what the app holds now. `previous` of null means "we have sent nothing yet",
 * so everything counts as new — that is the first upload.
 */
export function diffRows(previous: TimetrackRows | null, next: TimetrackRows, deletedAtIso: string): RowDiff {
  const changed: Partial<TimetrackRows> = {}
  let count = 0

  for (const table of TIMETRACK_TABLES) {
    const before = previous ? indexOf(table, previous[table] as unknown as AnyRow[]) : new Map<string, AnyRow>()
    const after = indexOf(table, next[table] as unknown as AnyRow[])
    const out: AnyRow[] = []

    for (const [key, row] of after) {
      const old = before.get(key)
      if (!old || meaningful(old) !== meaningful(row)) out.push(row)
    }

    // gone from the app: send the row back with a note saying when it went
    for (const [key, row] of before) {
      if (after.has(key)) continue
      if (!canTombstone(table)) continue
      if ((row as { deleted_at?: string | null }).deleted_at) continue
      out.push({ ...row, deleted_at: deletedAtIso })
    }

    if (out.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(changed as any)[table] = out
      count += out.length
    }
  }

  return { changed, count }
}

/** Every row key in a change set, so the caller knows what is still in flight */
export function keysIn(rows: Partial<TimetrackRows>): Set<string> {
  const keys = new Set<string>()
  for (const table of TIMETRACK_TABLES) {
    for (const row of (rows[table] ?? []) as unknown as AnyRow[]) {
      keys.add(`${table}/${rowKey(table, row)}`)
    }
  }
  return keys
}

/**
 * Fold what the server sent into what we hold. A row we have changed and not
 * yet sent is left alone; everything else takes the server's version.
 */
export function mergeIncoming(
  local: TimetrackRows,
  incoming: Partial<TimetrackRows>,
  dirty: Set<string>,
): TimetrackRows {
  const merged = emptyRows()

  for (const table of TIMETRACK_TABLES) {
    const byKey = indexOf(table, local[table] as unknown as AnyRow[])
    for (const row of (incoming[table] ?? []) as unknown as AnyRow[]) {
      const key = rowKey(table, row)
      if (dirty.has(`${table}/${key}`)) continue
      if ((row as { deleted_at?: string | null }).deleted_at) {
        byKey.delete(key)
        continue
      }
      byKey.set(key, row)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(merged as any)[table] = [...byKey.values()]
  }

  return merged
}

/** Combine two change sets, the later one winning per row */
export function mergeChangeSets(
  first: Partial<TimetrackRows>,
  second: Partial<TimetrackRows>,
): Partial<TimetrackRows> {
  const out: Partial<TimetrackRows> = {}
  for (const table of TIMETRACK_TABLES) {
    const a = (first[table] ?? []) as unknown as AnyRow[]
    const b = (second[table] ?? []) as unknown as AnyRow[]
    if (a.length === 0 && b.length === 0) continue
    const byKey = indexOf(table, a)
    for (const row of b) byKey.set(rowKey(table, row), row)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(out as any)[table] = [...byKey.values()]
  }
  return out
}

export function countRows(rows: Partial<TimetrackRows>): number {
  let total = 0
  for (const table of TIMETRACK_TABLES) total += (rows[table] ?? []).length
  return total
}

/**
 * Would sending this wipe the account?
 *
 * THE INCIDENT THIS EXISTS FOR: a server payload arrived with no usable
 * workspace row. The mapper read that as "there is nothing here" and handed
 * back an empty workspace; the very next diff compared empty-workspace against
 * the server and produced a deletion for every entry the user had. A real entry
 * was deleted before this guard existed.
 *
 * The mapper no longer does that. This is the second lock on the same door,
 * because the cost of being wrong once is somebody's history:
 *
 *  - a device that has not successfully read the server yet may not delete
 *    anything at all. It does not know what exists.
 *  - a change set that swaps the workspace for a different one AND empties it
 *    is refused outright. See below for why both halves are needed.
 *
 * WHY NOT SIMPLY "REFUSE A CHANGE SET THAT DELETES EVERYTHING": because a
 * person is allowed to do that. The entry list has a select-all and a
 * delete-this-whole-day, both with an undo toast, so "every entry I have is now
 * a tombstone" is an ordinary Tuesday. A guard on the count alone refuses it,
 * the badge goes red, and a reload brings back the entries the person just
 * deleted on purpose — a worse bug than the one being guarded against, and one
 * that fires on a real action rather than on a rare fault.
 *
 * What the incident had and a deliberate deletion does not is a DIFFERENT
 * WORKSPACE. The mapper invented a fresh one, so the change set carried a
 * workspace row whose id the server had never seen, next to tombstones for
 * everything the old one held. No user action produces that: deleting entries
 * keeps the workspace you are in, and "Clear this workspace" now keeps its own
 * record too (`resetWorkspace`), which is what makes this test possible.
 *
 * So the signature is "you are pointing at a workspace I do not have, and
 * everything I do have is to be deleted". Stated plainly because it is narrow:
 * a future bug that empties an account while keeping its workspace id is
 * indistinguishable here from the select-all above, and this will not catch it.
 */
export function safeToSend(
  changed: Partial<TimetrackRows>,
  serverRows: TimetrackRows | null,
  adopted: boolean,
): { ok: true } | { ok: false; deletes: number } {
  let deletes = 0
  for (const table of TIMETRACK_TABLES) {
    for (const row of (changed[table] ?? []) as unknown as AnyRow[]) {
      if ((row as { deleted_at?: string | null }).deleted_at) deletes++
    }
  }
  if (deletes === 0) return { ok: true }
  if (!adopted) return { ok: false, deletes }

  /**
   * Count the same population the tombstones come from.
   *
   * Totalling every table meant the comparison could not be met: the settings
   * row and every tag link are always live and can never be deleted, so
   * `deletes` was structurally smaller than `liveOnServer` no matter what the
   * change set said.
   */
  let liveOnServer = 0
  if (serverRows) {
    for (const table of TIMETRACK_TABLES) {
      if (!canTombstone(table)) continue
      for (const row of serverRows[table] as unknown as AnyRow[]) {
        if (!(row as { deleted_at?: string | null }).deleted_at) liveOnServer++
      }
    }
  }

  if (liveOnServer >= 3 && deletes >= liveOnServer && swapsTheWorkspace(changed, serverRows)) {
    return { ok: false, deletes }
  }
  return { ok: true }
}

/**
 * Does this change set point at a workspace the server does not have?
 *
 * `pushTimetrackRows` rewrites every `workspace_id` to the one workspace the
 * person owns, so a fresh workspace id in a change set is never a second
 * workspace — it is a sign the state was rebuilt from nothing.
 */
function swapsTheWorkspace(changed: Partial<TimetrackRows>, serverRows: TimetrackRows | null): boolean {
  const offered = (changed.timetrack_workspaces ?? []) as unknown as AnyRow[]
  const live = offered.filter((row) => !(row as { deleted_at?: string | null }).deleted_at)
  if (live.length === 0) return false
  // nothing known to compare against: a workspace arriving with deletions is
  // the shape of the incident, so treat it as the incident
  if (!serverRows) return true
  const known = new Set(
    (serverRows.timetrack_workspaces as unknown as AnyRow[])
      .filter((row) => !(row as { deleted_at?: string | null }).deleted_at)
      .map((row) => String(row.id)),
  )
  if (known.size === 0) return false
  return live.some((row) => !known.has(String(row.id)))
}

/**
 * Break a change set into requests that are safe to send.
 *
 * A person with a year of tracked time has thousands of rows, and sending them
 * as one request risks the whole upload being refused for its size — the worst
 * possible outcome, because nothing arrives and the reason is a number in a
 * server log. Batches also mean a failure halfway through still leaves the
 * earlier batches saved.
 *
 * Order is preserved across batches: workspaces and projects go before the
 * entries that point at them, or the database rejects rows for referring to
 * something it has not been told about yet.
 */
export function splitIntoBatches(rows: Partial<TimetrackRows>, maxRows: number): Partial<TimetrackRows>[] {
  if (countRows(rows) <= maxRows) return [rows]

  const batches: Partial<TimetrackRows>[] = []
  let current: Partial<TimetrackRows> = {}
  let currentCount = 0

  for (const table of TIMETRACK_TABLES) {
    const all = (rows[table] ?? []) as unknown as AnyRow[]
    for (let i = 0; i < all.length; i += maxRows) {
      const slice = all.slice(i, i + maxRows)
      if (currentCount + slice.length > maxRows && currentCount > 0) {
        batches.push(current)
        current = {}
        currentCount = 0
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(current as any)[table] = [...(((current as any)[table] ?? []) as AnyRow[]), ...slice]
      currentCount += slice.length
    }
  }
  if (currentCount > 0) batches.push(current)
  return batches
}

/**
 * Clean a queue that was written by an older, buggier version of this code.
 *
 * A queue drains all or nothing: one row the database refuses fails the whole
 * batch, and every later change piles up behind it forever. That happened —
 * a tombstone was queued for `timetrack_settings`, which has no `deleted_at`
 * column, and from then on nothing that browser did was ever saved.
 *
 * The code that produced it is fixed. This repairs the queues it already wrote,
 * because a browser that is stuck stays stuck until something unsticks it.
 */
export function repairPending(rows: Partial<TimetrackRows>): Partial<TimetrackRows> {
  const settings = rows.timetrack_settings
  if (!settings || settings.length === 0) return rows

  const cleaned = settings
    .filter((row) => !(row as unknown as AnyRow).deleted_at)
    .map((row) => {
      const copy: AnyRow = {}
      for (const [key, value] of Object.entries(row as unknown as AnyRow)) {
        if (key !== "deleted_at" && key !== "created_at") copy[key] = value
      }
      return copy as unknown as TimetrackRows["timetrack_settings"][number]
    })

  return { ...rows, timetrack_settings: cleaned }
}


/**
 * Make every row belong to the workspace the app is actually showing.
 *
 * This app has one workspace per person. A browser that starts fresh mints a
 * new one, and if it then adopts the server's, anything created in between
 * still points at the one it invented — a workspace the server may never have
 * heard of. The database rejects the row for referring to nothing, the batch
 * fails, and because a queue drains all or nothing, nothing is saved again.
 * Verified: "violates foreign key constraint timetrack_entries_workspace_id_fkey".
 *
 * Rewriting the pointer is safe precisely because there is only one workspace:
 * there is no other place the row could have meant.
 */
export function reattachToWorkspace(
  rows: Partial<TimetrackRows>,
  workspaceId: string,
): Partial<TimetrackRows> {
  const out: Partial<TimetrackRows> = {}
  for (const table of TIMETRACK_TABLES) {
    const list = rows[table] as unknown as AnyRow[] | undefined
    if (!list || list.length === 0) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(out as any)[table] =
      table === "timetrack_workspaces"
        ? /**
           * A WORKSPACE TOMBSTONE CANNOT SURVIVE HAVING ITS ID REWRITTEN.
           *
           * Rewriting `id` on every row here means a change set holding both a
           * tombstone for the old workspace and a live row for the new one
           * arrives as two rows with the SAME primary key. One upsert, one key,
           * twice: "ON CONFLICT DO UPDATE command cannot affect row a second
           * time" — the whole batch refused, for ever, and `isolateRefusedRows`
           * names nothing because each half succeeds on its own. A queue with no
           * way out but a reload.
           *
           * And if the halves DO land, order decides: the tombstone is emitted
           * second by `diffRows`, so it would soft-delete the person's only
           * workspace. `timetrackIsEmpty` then reads the account as new and
           * offers the import again.
           *
           * Dropping the tombstone loses nothing. Once the id is rewritten it no
           * longer refers to the workspace that went away — it refers to the one
           * being kept.
           */
          list
            .filter((row) => !(row as { deleted_at?: string | null }).deleted_at)
            .map((row) => ({ ...row, id: workspaceId }))
        : list.map((row) => ("workspace_id" in row ? { ...row, workspace_id: workspaceId } : row))
  }
  return out
}
