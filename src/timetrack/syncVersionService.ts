/**
 * When this device's queued change meets a newer copy on the server: what each
 * side changed, and what survives. Pure functions; the hook that talks to the
 * server is `useTimetrackSync`.
 *
 * WHY THIS EXISTS (sync defect #1, Plans/time-tracker-like-toggl.md). The phone
 * holds "Gym", running, with an edit to it queued — it was offline, or asleep
 * before the upload went. The PC stops Gym. The phone wakes and sends its row,
 * and the server used to replace the whole row with it: `stopped_at: null`, and
 * the timer ran again on every device. The same with `deleted_at: null` brought
 * deleted entries back.
 *
 * THE RULE (design rule D1). Every queued row carries the server version it was
 * based on — its `BaseRecord`. The server writes the row only if that is still
 * the stored version, and otherwise hands back the stored row. This device then
 * compares field by field, three ways:
 *
 *   - a field this device did not change (mine = base) takes the server's value;
 *   - a field only this device changed (server = base) keeps this device's value;
 *   - a field both changed goes to this device, the later sender. Accepted in D1:
 *     one person is rarely editing the same field in two places at once.
 *
 * — except an entry's end, when the copy both were based on had it RUNNING. Two
 * stops of one running timer are one fact pressed twice: it ended when it was
 * first stopped. The later sender is the device that had not checked yet, and
 * its press moved the end later than the work did (see `firstStopWins`).
 *
 * and sends the result again, now based on the stored row. Objects inside a row
 * (`config`, `prefs`) are merged the same way, key by key; arrays are one value.
 *
 * Two promises sit on top, because they are the ones whose breaking cost real
 * records:
 *
 *   - A STALE COPY NEVER CLEARS `stopped_at` OR `deleted_at`. Only a device that
 *     cleared it itself — base set, mine empty — may send it empty. That holds
 *     even when the base is unknown, which is the case for a queue written by the
 *     app before this existed.
 *   - AN ENTRY'S TIMES STAY CONSISTENT. Taking the start from one side and the
 *     stop from the other recomputes the length; a stop that would fall before
 *     the start leaves the server's times standing.
 *
 * Where the other device's value is kept over one this device changed, `rebase`
 * says which (`overruled`), so the person is told (D1).
 */

import { rowKeyOf, TIMETRACK_TABLES, type TagSets, type TimetrackRows } from "@/src/db/timetrackTypes"

import { sameTagSet, stableStringify } from "./syncService"

type AnyRow = Record<string, unknown>
type TableName = keyof TimetrackRows

/**
 * What a queued row was based on. Kept with the queue, in this browser, so a
 * reload or another tab still knows.
 */
export interface BaseRecord {
  /**
   * The server's `updated_at` of the copy this row was based on, exactly as the
   * server wrote it — the version the write names. `null`: the device believes
   * the row is new.
   */
  v: string | null
  /** That copy's values, for telling which fields this device changed. `null`: unknown. */
  row: AnyRow | null
  /** For an entry: its tag ids in that copy */
  tags?: string[]
  /**
   * `row` is what an upload carried that may have been saved without this device
   * hearing of it — a row put back while it was in the air. The account may hold
   * it, at a version not known here, even when `v` is null.
   */
  sent?: true
}

/** By `${table}/${rowKey}`, the same keys `keysIn` produces */
export type Bases = Record<string, BaseRecord>

/** Tables whose rows carry no version: a link is there or not, the log is only added to */
const UNVERSIONED = new Set<TableName>(["timetrack_entry_tags", "timetrack_webhook_log"])

/** The two columns a stale copy must never empty */
const NEVER_CLEARED_BY_A_STALE_COPY = ["stopped_at", "deleted_at"] as const

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$/

/**
 * Equal as stored values. Two spellings of one instant are equal: the server
 * writes `…09:00:00+00:00` and this app `…09:00:00.000Z`, and that difference is
 * not a change anyone made.
 */
export function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "string" && typeof b === "string" && a !== b && ISO_INSTANT.test(a) && ISO_INSTANT.test(b)) {
    return Date.parse(a) === Date.parse(b)
  }
  return stableStringify(a) === stableStringify(b)
}

function isPlainObject(value: unknown): value is AnyRow {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * THE DEVICE HOLDS THIS ROW AGAIN AS IT WAS BEFORE IT WAS QUEUED: an Undo, or a
 * change put back by hand. `now` is the row as the device holds it now (absent:
 * gone from it), `base` what the queued change was based on, `tagsNow` an
 * entry's tags now. Only what this can tell says yes: a base whose copy was not
 * kept, or an entry whose tags were not, says no, and the row stays queued as it
 * always did (offline audit 2026-11-05, `anUndoWithNoSignalIsWhatTheAccountGets`).
 */
export function isBackToBase(table: TableName, now: AnyRow | undefined, base: BaseRecord, tagsNow?: readonly string[]): boolean {
  const gone = (row: AnyRow | null | undefined) => !row || Boolean(row.deleted_at)
  // the account never had it, and the device no longer has it either: created and taken back
  if (base.v === null && !base.sent) return gone(now)
  if (!base.row) return false
  if (gone(now) || gone(base.row)) return gone(now) && gone(base.row)
  if (table === "timetrack_entries" && (!base.tags || !tagsNow || !sameTagSet(base.tags, tagsNow))) return false
  const was = base.row
  // the columns the device holds; the server's own extra columns say nothing about what was done here
  return Object.keys(now!).every((column) => column === "updated_at" || column === "running_device_id" || sameValue(now![column], was[column]))
}

/** One value, three ways. `undefined` means "absent". */
export function mergeValue(base: unknown, mine: unknown, theirs: unknown): unknown {
  if (sameValue(mine, base)) return theirs
  if (sameValue(theirs, base)) return mine
  if (isPlainObject(base) && isPlainObject(mine) && isPlainObject(theirs)) {
    const out: AnyRow = {}
    for (const key of new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)])) {
      const value = mergeValue(base[key], mine[key], theirs[key])
      if (value !== undefined) out[key] = value
    }
    return out
  }
  return mine
}

/**
 * This device's row laid onto the server's: the fields it changed since `base`,
 * on top of everything else as the server has it.
 *
 * `base` null or undefined: what it was based on is unknown (a queue from before
 * versions existed, or a row sent as new that the server already had). Then this
 * device's values stand, except that it may not empty a stop or a deletion.
 *
 * The result has exactly this device's columns, so it is the same shape as every
 * other row in the queue.
 */
export function mergeRow(table: TableName, base: AnyRow | null | undefined, mine: AnyRow, theirs: AnyRow): AnyRow {
  const out: AnyRow = {}
  for (const key of Object.keys(mine)) {
    if (key === "updated_at") {
      out[key] = mine[key]
      continue
    }
    const stored = key in theirs ? theirs[key] : mine[key]
    out[key] = base ? mergeValue(base[key], mine[key], stored) : mine[key]
  }

  for (const column of NEVER_CLEARED_BY_A_STALE_COPY) {
    if (!(column in out) || out[column] != null || theirs[column] == null) continue
    const clearedHere = base != null && base[column] != null && mine[column] == null
    if (!clearedHere) out[column] = theirs[column]
  }

  if (table === "timetrack_entries") {
    firstStopWins(out, base, mine, theirs)
    settleEntry(out, mine, theirs)
  }
  return out
}

/**
 * TWO STOPS OF ONE RUNNING TIMER: THE FIRST ONE STANDS.
 *
 * The phone stops Gym; the PC tab, not yet checked, still shows it running, and
 * Stop is pressed there minutes later. Both changed the end, so the rule above
 * gave it to the later sender — the PC — and Gym ran on for minutes it never ran,
 * over the Shower the phone had started (a bug audit, 2026-11-04). Both stops
 * were made on a copy with the timer running, so they mean the same thing, and
 * the earlier one is when it ended.
 *
 * Only for a running base. An entry that had already ended and has its end
 * moved on both devices is two edits, not two presses, and keeps the rule above.
 */
function firstStopWins(out: AnyRow, base: AnyRow | null | undefined, mine: AnyRow, theirs: AnyRow): void {
  if (!base || base.stopped_at != null || mine.stopped_at == null || theirs.stopped_at == null) return
  if (!("stopped_at" in out)) return
  const mineStop = Date.parse(String(mine.stopped_at))
  const theirStop = Date.parse(String(theirs.stopped_at))
  if (Number.isNaN(mineStop) || Number.isNaN(theirStop) || theirStop >= mineStop) return
  out.stopped_at = theirs.stopped_at
  // the length that goes with that stop; `settleEntry` recomputes it if the start came from this side
  if ("duration_seconds" in out) out.duration_seconds = theirs.duration_seconds
}

/**
 * An entry's start, stop and length must agree, and a merge can take them from
 * different sides. Measured against the schema: `stopped_at >= started_at`, and
 * a stopped entry has a length.
 */
function settleEntry(out: AnyRow, mine: AnyRow, theirs: AnyRow): void {
  if (out.stopped_at == null) {
    out.duration_seconds = null
    // which device holds a running timer is the server's to say, unless the
    // server's copy is not running at all
    if (theirs.stopped_at == null && theirs.running_device_id != null && "running_device_id" in out) {
      out.running_device_id = theirs.running_device_id
    }
    return
  }
  if ("running_device_id" in out) out.running_device_id = null

  const start = Date.parse(String(out.started_at))
  const stop = Date.parse(String(out.stopped_at))
  if (Number.isNaN(start) || Number.isNaN(stop)) return
  if (stop < start) {
    // the two sides' times do not fit together: the server's stand
    out.started_at = theirs.started_at
    out.stopped_at = theirs.stopped_at
    out.duration_seconds = theirs.duration_seconds
    return
  }
  const timesFrom = (side: AnyRow) =>
    sameValue(out.started_at, side.started_at) &&
    sameValue(out.stopped_at, side.stopped_at) &&
    sameValue(out.duration_seconds, side.duration_seconds)
  const mixed = !timesFrom(mine) && !timesFrom(theirs) && !out.duration_only
  if (mixed || out.duration_seconds == null) out.duration_seconds = Math.max(0, Math.floor((stop - start) / 1000))
}

/**
 * Is there anything of this device's left in `merged`, once laid onto `theirs`?
 * `running_device_id` is not counted: every device writes its own name there for
 * a running entry, so it says nothing about what the person did.
 */
export function sameRow(merged: AnyRow, theirs: AnyRow): boolean {
  return Object.keys(merged).every(
    (key) => key === "updated_at" || key === "running_device_id" || sameValue(merged[key], theirs[key]),
  )
}

/**
 * Tags, three ways, as sets: the server's set, plus what this device added, minus
 * what it took off. With no base, the server's set stands — a set is only ever
 * queued with one, so that is a queue from before sets were sent.
 */
export function mergeTags(base: readonly string[] | undefined, mine: readonly string[], theirs: readonly string[]): string[] {
  if (!base) return [...theirs].sort()
  const added = mine.filter((tag) => !base.includes(tag))
  const removed = new Set(base.filter((tag) => !mine.includes(tag)))
  return [...new Set([...theirs.filter((tag) => !removed.has(tag)), ...added])].sort()
}

export function versionOf(row: AnyRow | undefined | null): string | null {
  return row && typeof row.updated_at === "string" ? row.updated_at : null
}

/**
 * Is version `a` older than version `b`? Both are the server's own stamps. Read
 * as instants first; two stamps in one millisecond are compared as written,
 * which for one server's output is the microseconds.
 */
export function olderThan(a: string, b: string): boolean {
  const left = Date.parse(a)
  const right = Date.parse(b)
  if (Number.isNaN(left) || Number.isNaN(right)) return false
  if (left !== right) return left < right
  return a < b
}

export interface Rebased {
  /** what still has to be sent, each row now based on the server's copy */
  send: Partial<TimetrackRows>
  /** the base of every row in `send` */
  bases: Bases
  /** the tag sets still to be sent */
  tagSets: TagSets
  /** what this device should now hold for those rows: the merge, or the server's row where nothing of ours is left */
  hold: Partial<TimetrackRows>
  /** and for those entries' tags */
  holdTags: TagSets
  /**
   * The rows where the other device's value was kept over one this device
   * changed, and which columns: what the person is told about (D1). Only rows
   * whose base is known, because without it there is no telling what was changed here.
   */
  overruled: Overruled[]
}

export interface Overruled {
  table: TableName
  key: string
  columns: string[]
  /** the other device deleted it, so nothing changed here was kept */
  deleted: boolean
}

/** Columns that say nothing about what the person did, or follow from one that does (the length from the times) */
const NOT_A_CHOICE = new Set(["updated_at", "running_device_id", "user_id", "workspace_id", "duration_seconds"])

/** The columns this device changed since `base` whose value in `result` is not this device's */
export function overruledColumns(base: AnyRow | null | undefined, mine: AnyRow, result: AnyRow): string[] {
  if (!base) return []
  return Object.keys(mine).filter(
    (key) => !NOT_A_CHOICE.has(key) && !sameValue(mine[key], base[key]) && !sameValue(result[key], mine[key]),
  )
}

const pushInto = (bucket: Partial<TimetrackRows>, table: TableName, row: AnyRow) => {
  const list = ((bucket as Record<string, AnyRow[]>)[table] ??= [])
  list.push(row)
}

/**
 * Lay a queue onto the server's current copies of its rows.
 *
 * `stored` holds the server's copy of SOME of these rows: at first contact all
 * of them (a full read), after a refused push only the refused ones. A queued
 * row with no stored copy is not touched — at first contact that means the row
 * is new; after a push it means the row was not refused. `storedTags` gives an
 * entry's tags on the server, or undefined when they are not known.
 *
 * A row is dropped from the queue when nothing of this device's is left in it,
 * including when the server's copy is deleted and the merge is too: a deleted
 * entry's other fields are nobody's business, and sending them would only write
 * to a tombstone.
 */
export function rebase(
  queued: Partial<TimetrackRows>,
  bases: Bases,
  tagSets: TagSets,
  stored: Partial<TimetrackRows>,
  storedTags: (entryId: string) => string[] | undefined,
): Rebased {
  const out: Rebased = { send: {}, bases: {}, tagSets: {}, hold: {}, holdTags: {}, overruled: [] }
  const index = new Map<string, AnyRow>()
  for (const table of TIMETRACK_TABLES) {
    for (const row of (stored[table] ?? []) as unknown as AnyRow[]) index.set(`${table}/${rowKeyOf(table, row)}`, row)
  }
  const recordFor = (table: TableName, key: string, theirs: AnyRow): BaseRecord => {
    const record: BaseRecord = { v: versionOf(theirs), row: theirs }
    if (table === "timetrack_entries") {
      const tags = storedTags(key) ?? bases[`${table}/${key}`]?.tags
      if (tags) record.tags = [...tags]
    }
    return record
  }

  for (const table of TIMETRACK_TABLES) {
    for (const mine of (queued[table] ?? []) as unknown as AnyRow[]) {
      const key = rowKeyOf(table, mine)
      const tk = `${table}/${key}`
      const theirs = index.get(tk)
      if (!theirs || UNVERSIONED.has(table)) {
        pushInto(out.send, table, mine)
        pushInto(out.hold, table, mine)
        out.bases[tk] = bases[tk] ?? { v: null, row: null }
        continue
      }
      const merged = mergeRow(table, bases[tk]?.row, mine, theirs)
      const goneThere = Boolean(theirs.deleted_at && merged.deleted_at)
      const kept = goneThere || sameRow(merged, theirs) ? theirs : merged
      // against the merge, which is the server's row on every column of ours when nothing of ours is left;
      // deleted on both sides, nothing of ours was lost
      const columns =
        goneThere && mine.deleted_at ? [] : overruledColumns(bases[tk]?.row, mine, goneThere ? theirs : merged)
      if (columns.length > 0) out.overruled.push({ table, key, columns, deleted: goneThere })
      if (kept === theirs) {
        pushInto(out.hold, table, theirs)
        continue
      }
      pushInto(out.send, table, merged)
      pushInto(out.hold, table, merged)
      out.bases[tk] = recordFor(table, key, theirs)
    }
  }

  const sentEntries = new Set(((out.send.timetrack_entries ?? []) as unknown as AnyRow[]).map((row) => String(row.id)))
  const heldEntries = new Map(((out.hold.timetrack_entries ?? []) as unknown as AnyRow[]).map((row) => [String(row.id), row]))
  for (const [entryId, mine] of Object.entries(tagSets)) {
    const tk = `timetrack_entries/${entryId}`
    const theirs = storedTags(entryId)
    if (theirs === undefined) {
      out.tagSets[entryId] = [...mine]
      out.holdTags[entryId] = [...mine]
      continue
    }
    const merged = mergeTags(bases[tk]?.tags, mine, theirs)
    out.holdTags[entryId] = merged
    if (sameTagSet(merged, theirs)) continue

    // the set travels with its entry, so the entry goes again even when nothing else about it changed
    const entry = heldEntries.get(entryId) ?? index.get(tk)
    if (!entry || entry.deleted_at) continue
    out.tagSets[entryId] = merged
    if (!sentEntries.has(entryId)) {
      pushInto(out.send, "timetrack_entries", entry)
      sentEntries.add(entryId)
      const stored = index.get(tk)
      out.bases[tk] = stored ? recordFor("timetrack_entries", entryId, stored) : (bases[tk] ?? { v: null, row: null, tags: [] })
    }
  }

  return out
}
