/**
 * The only file that reads or writes the timetrack tables.
 *
 * IT USES THE SIGNED-IN USER'S OWN CONNECTION, not the service key. That means
 * Row Level Security applies to every statement here: if a bug in this file
 * ever asked for somebody else's rows, the database would return nothing rather
 * than trusting the question. The service key would bypass that entirely, so it
 * is deliberately not used.
 *
 * TWO OPERATIONS, NOT TWENTY: `pull` asks "what changed since I last looked?"
 * and `push` says "here is what changed on my device". Every screen in the
 * tracker goes through those two, because the app keeps its whole workspace in
 * one object — see `timetrackMapperService`.
 */

import { createServerSupabaseClient } from "./server"
import {
  emptyRows,
  pageOrderColumns,
  rowKeyColumns,
  rowKeyOf,
  TIMETRACK_TABLES,
  type PushBases,
  type TagSets,
  type TimetrackRows,
  type VersionedPushResult,
} from "./timetrackTypes"

/**
 * The conflict target for an upsert, derived from the one definition of a row's
 * identity rather than written out again here. It was a third copy of that rule.
 */
function conflictTarget(table: keyof TimetrackRows): string {
  return rowKeyColumns(table).join(",")
}


/** Rows per request when reading. The database refuses to return more than 1,000. */
const PAGE_SIZE = 1000

/** Tables with no `updated_at` to compare, so they always come back whole */
const NO_UPDATED_AT = new Set<keyof TimetrackRows>(["timetrack_entry_tags", "timetrack_webhook_log"])

export interface PullResult {
  rows: TimetrackRows
  /** Pass this back as `since` next time */
  cursor: string
}

/**
 * How far behind its checkpoint every check reaches.
 *
 * THE CHECKPOINT IS TAKEN BEFORE THE READ, and that is the right order — taken
 * after, anything written during the read would be skipped for good. But a write
 * is stamped with the moment its transaction BEGAN (`now()` in the database), and
 * it becomes visible only when it commits. A write that began just before the
 * checkpoint and committed just after this read is invisible to this read and
 * older than the next checkpoint: missed until a reload (sync defect #7,
 * Plans/time-tracker-like-toggl.md). The two clocks, this server's and the
 * database's, can also disagree by a little.
 *
 * Five seconds covers both with room to spare. What it costs is a few rows sent
 * twice, and a row sent twice is harmless: it is the server's current copy of
 * something the device already holds, and taking it again changes nothing.
 */
export const CHECK_OVERLAP_MS = 5_000

function reachBack(since: string): string {
  const at = Date.parse(since)
  return Number.isNaN(at) ? since : new Date(at - CHECK_OVERLAP_MS).toISOString()
}

/**
 * Everything of this user's that changed after `since` — reaching
 * `CHECK_OVERLAP_MS` further back, see there. Omit `since` for a full download —
 * that is what a new device does on its first load.
 */
export async function pullTimetrackRows(userId: string, since?: string | null): Promise<PullResult> {
  const supabase = await createServerSupabaseClient()
  const rows = emptyRows()
  const cursor = new Date().toISOString()
  const changedAfter = since ? reachBack(since) : null

  for (const table of TIMETRACK_TABLES) {
    /**
     * Read the whole table, a page at a time.
     *
     * WHY PAGING IS NOT OPTIONAL: an unpaged query comes back capped at 1,000
     * rows and says nothing about it — no error, no flag, just fewer rows.
     * Measured against this very database: a table holding 32,126 rows returned
     * exactly 1,000. For a tracker used daily that cap is somewhere around a
     * year and a half, after which someone's history would simply stop, on a
     * new device, with nothing to explain it.
     */
    const collected: unknown[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabase
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .range(from, from + PAGE_SIZE - 1)
      if (changedAfter && !NO_UPDATED_AT.has(table)) query = query.gt("updated_at", changedAfter)
      // A stable order, or two pages can return the same row and miss another.
      // Not every table is keyed by `id`: settings has one row per person and
      // the tag links are keyed by the pair they join.
      for (const column of pageOrderColumns(table)) query = query.order(column, { ascending: true })

      const { data, error } = await query
      if (error) throw new Error(`Could not read ${table}: ${error.message}`)
      collected.push(...(data ?? []))
      if (!data || data.length < PAGE_SIZE) break
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(rows as any)[table] = collected
  }

  return { rows, cursor }
}

/**
 * NO CURSOR HERE, DELIBERATELY.
 *
 * This used to carry one, taken after the writes — while the rows in those same
 * writes were stamped `writtenAt` from before them. Nothing read it, so it did no
 * harm; but `PullResult.cursor` is documented as "pass this back as `since` next
 * time", and the day somebody wired this one up the same way, every row another
 * device wrote during the push window would sort below the cursor and never be
 * asked for again. A cursor only means anything next to the read it came from.
 */
export interface PushResult extends Partial<Omit<VersionedPushResult, "applied">> {
  applied: number
}

/** What a device says beside its rows; see `PushBases` and `TagSets` */
export interface PushVersions {
  bases: PushBases
  tagSets?: TagSets
}

/**
 * The server refused specific rows, and can say which.
 *
 * Distinct from "the write failed" because the answer is different: a refused
 * row will be refused again for ever, so the browser must stop retrying it and
 * name it to the person. Retrying one of these is how a single mistyped end
 * time stopped an entire account from saving — the queue drains all or nothing,
 * so everything behind the bad row stayed in the browser behind a badge
 * promising it would be sent.
 */
export class TimetrackWriteRefused extends Error {
  constructor(
    readonly table: string,
    readonly ids: string[],
    message: string,
  ) {
    super(message)
    this.name = "TimetrackWriteRefused"
  }
}

/**
 * Which rows in a rejected batch the server will not take, found by halving.
 *
 * A batch is up to 400 rows and one bad one fails all of them, so the choice is
 * between telling somebody "something in here is wrong" and spending a few more
 * requests to name it. Halving costs about `2 * log2(n)` writes rather than
 * `n`, and the halves that succeed are genuinely written — so the good work
 * lands instead of waiting behind the bad row.
 *
 * `write` answers true when the batch was accepted. The budget stops a
 * pathological case (many bad rows) from turning one failure into hundreds of
 * requests; whatever has been found by then is what gets named.
 */
export async function isolateRefusedRows<T>(
  rows: T[],
  write: (batch: T[]) => Promise<boolean>,
  maxRequests = 24,
): Promise<T[]> {
  const refused: T[] = []
  let used = 0

  const walk = async (batch: T[]): Promise<void> => {
    if (batch.length === 0 || used >= maxRequests) return
    used += 1
    if (await write(batch)) return
    if (batch.length === 1) {
      refused.push(batch[0])
      return
    }
    const half = Math.floor(batch.length / 2)
    await walk(batch.slice(0, half))
    await walk(batch.slice(half))
  }

  await walk(rows)
  return refused
}

/** One table's rows, made ready to write: owned, re-pointed, and free of duplicate keys */
interface WritePart {
  table: keyof TimetrackRows
  owned: Record<string, unknown>[]
  onConflict: string
}

/**
 * Write this user's changed rows.
 *
 * With `versions` (what the app sends): each row is written only if the stored
 * row is the version the device was based on, and the answer says what was
 * written and which stored rows were newer — see `pushVersioned`. Without: the
 * old upsert, where anything already there with the same id is replaced.
 * Sending the same change twice is harmless either way — which matters, because
 * a phone that loses signal mid-send will send again: the second copy is refused
 * as stale, and the stored row it is handed back is its own first copy.
 *
 * `user_id` is overwritten with the caller's own id on every row. A client
 * cannot smuggle in a row belonging to somebody else even if it tries, and RLS
 * would refuse it a second time if it did.
 */
export async function pushTimetrackRows(
  userId: string,
  rows: Partial<TimetrackRows>,
  versions?: PushVersions,
): Promise<PushResult> {
  const supabase = await createServerSupabaseClient()
  let applied = 0

  /**
   * The server decides which workspace these rows belong to, not the caller.
   *
   * A browser with nothing saved invents a workspace before it has heard from
   * the server. Anything it creates in that moment points at an id the server
   * has never seen, and the database rejects the row — which fails the whole
   * batch, and a queue that drains all or nothing then never drains. Verified
   * against the live database: "violates foreign key constraint
   * timetrack_entries_workspace_id_fkey".
   *
   * A person has exactly one workspace, so there is no ambiguity about where a
   * row was meant to go. Rewriting the pointer here means no client version,
   * however old or confused, can produce that failure again.
   */
  const workspaceId = await resolveWorkspaceId(supabase, userId, rows)

  /**
   * ONE CLOCK DECIDES WHAT "SINCE" MEANS, AND IT IS THIS ONE.
   *
   * `pullTimetrackRows` hands out a cursor from the server clock and then asks
   * for rows with `updated_at > since`. The rows arriving here carry the
   * BROWSER's clock (`stateToRows` writes the entity's own edit time), and the
   * `_touch` triggers are `before update` only — so an INSERT kept whatever the
   * browser said. Two consequences, both silent:
   *
   *   - an entry created offline at 10:00 and uploaded at 10:10 arrives stamped
   *     10:00, so a device whose cursor is 10:05 never sees it at all;
   *   - a browser whose clock is a few minutes slow makes every row it creates
   *     invisible to every other device.
   *
   * Stamping here costs nothing and makes the comparison mean something. The
   * client's own `updated_at` is ignored by `meaningful()` when it diffs, so
   * overwriting it changes no behaviour on that side.
   */
  const writtenAt = new Date().toISOString()

  /**
   * PARENTS BEFORE CHILDREN — AND `TIMETRACK_TABLES` IS ALREADY IN THAT ORDER.
   *
   * This used to re-sort the list by a hand-written rank: workspaces 0, projects
   * 1, tasks 2, entries 3, everything else 4. `timetrack_clients` is "everything
   * else", and `timetrack_projects.client_id references timetrack_clients(id)`
   * (migration line 76) — so the sort moved projects ABOVE the clients they
   * point at, and every push carrying a new client with a project attached to it
   * raised `violates foreign key constraint timetrack_projects_client_id_fkey`.
   *
   * Two front doors: the client dropdown on the project form, and the Toggl CSV
   * import, which creates a client and its projects in the same pass. Both fit
   * in one 400-row request, so both tables always travelled together.
   *
   * And it did not retry. The browser drops refused rows from the queue and
   * records them as sent, so the project was never offered again and its tasks
   * and entries then failed their own foreign keys on the next push and were
   * dropped the same way.
   *
   * The declared order satisfies every foreign key in the schema, checked
   * against the migration itself by `theWriteOrderRespectsTheForeignKeys` — so
   * the fix is to stop rearranging it, not to add one more name to a ternary.
   *
   * Every table is checked for duplicate keys before anything is written, so a
   * batch that cannot be accepted writes nothing at all.
   */
  const parts: WritePart[] = []
  for (const table of TIMETRACK_TABLES) {
    const incoming = rows[table]
    if (!incoming || incoming.length === 0) continue

    const owned = incoming.map((row) => {
      const withOwner = { ...row, user_id: userId } as Record<string, unknown>
      if (table === "timetrack_workspaces") withOwner.id = workspaceId
      else if ("workspace_id" in withOwner) withOwner.workspace_id = workspaceId
      // the two link tables have no such column; everything else is stamped
      if (!NO_UPDATED_AT.has(table)) withOwner.updated_at = writtenAt
      return withOwner
    })
    const onConflict = conflictTarget(table)

    /**
     * TWO ROWS WITH ONE KEY IN A SINGLE UPSERT IS A DEAD END, SO SAY SO.
     *
     * Postgres answers "ON CONFLICT DO UPDATE command cannot affect row a second
     * time" and refuses the whole batch. It will refuse it again every time,
     * which on its own would be survivable — except that `isolateRefusedRows`
     * splits the pair into different halves, each half writes cleanly, so it
     * comes back having found nothing, the response names no ids, the browser
     * drops nothing, and the queue retries the same impossible payload for ever.
     * That is the "stuck until you reload" state, and it had two producers: a
     * cleared workspace sending a tombstone beside its replacement, and a
     * duplicated `(entry_id, tag_id)` pair from a tag counted twice.
     *
     * Both are fixed at their source. This is here because the cost of missing
     * the next producer is an account that silently stops saving, and because
     * quietly dropping one of the two rows would be choosing for the caller
     * without telling anyone which one lost.
     */
    const seen = new Map<string, number>()
    for (const row of owned) {
      // reported as a ROW KEY, which is what the browser matches its queue on
      const key = rowKeyOf(table, row)
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    const duplicated = [...seen].filter(([, count]) => count > 1).map(([key]) => key)
    if (duplicated.length > 0) {
      throw new TimetrackWriteRefused(
        table,
        duplicated,
        `Could not write ${table}: the same ${onConflict} appears more than once in one batch (${duplicated.slice(0, 5).join("; ")})`,
      )
    }
    parts.push({ table, owned, onConflict })
  }

  /**
   * A DEVICE THAT NAMES ITS BASES GETS THE VERSIONED WRITE.
   *
   * The upsert below replaces whatever is stored with whatever arrives, however
   * old the copy it came from — which is how a phone that slept through the PC's
   * Stop started the timer again. `timetrack_push` writes a row only if the
   * stored version is the one the device was based on, in one transaction, and
   * hands back the stored row otherwise. See `pushVersioned`.
   *
   * A caller that names none — an app version from before this, the e2e
   * helpers — still gets the upsert, unchanged. So does everybody in the window
   * between deploying this and applying the migration that creates the function.
   */
  if (versions) {
    const versioned = await pushVersioned(supabase, parts, versions)
    if (versioned) return versioned
  }

  for (const { table, owned, onConflict } of parts) {
    const { error } = await supabase.from(table).upsert(owned, { onConflict })
    if (error) {
      // Find the offending rows so the message can name them, and let the rest
      // through on the way — see `isolateRefusedRows`.
      const refused = await isolateRefusedRows(owned, async (batch) => {
        const { error: retry } = await supabase.from(table).upsert(batch, { onConflict })
        return !retry
      })
      throw new TimetrackWriteRefused(
        table,
        // ROW KEYS, not `row.id`. Three tables have no `id` column, so reporting
        // ids meant a refusal in any of them named nothing, the browser's drop
        // branch was skipped, and the row stayed queued for ever — which is how
        // one mistyped end time on a tagged entry stopped an account saving.
        refused.map((row) => rowKeyOf(table, row as Record<string, unknown>)).filter((key) => key.replace(/:/g, "") !== ""),
        `Could not write ${table}: ${error.message}`,
      )
    }
    applied += owned.length
  }

  return { applied }
}

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>

/** What `timetrack_push` returns, as JSON */
interface PushAnswer {
  applied?: number
  written?: VersionedPushResult["written"]
  conflicts?: VersionedPushResult["conflicts"]
  conflict_tags?: TagSets
}

/** What a base looks like when it came from the server: an ISO timestamp with its offset */
const SERVER_VERSION = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)$/

/**
 * A base that is not a timestamp is read as "base unknown" (null), never sent on.
 *
 * Every base the app sends came from the server, but the queue lives in the
 * browser's storage and outlives versions of this code. A string the database
 * cannot read as a time would fail the WHOLE call, every retry and every half of
 * the search for the bad row — which then names the row as refused, and the
 * browser drops it from the queue: the edit lost, for a typo in a bookkeeping
 * field. As null, the row is refused as stale instead, merged, and sent again
 * with the server's own version.
 */
function readableBases(bases: PushBases): PushBases {
  const out: PushBases = {}
  for (const [table, byKey] of Object.entries(bases ?? {})) {
    if (!byKey || typeof byKey !== "object") continue
    const clean: Record<string, string | null> = {}
    for (const [key, version] of Object.entries(byKey)) {
      const readable = typeof version === "string" && SERVER_VERSION.test(version) && !Number.isNaN(Date.parse(version))
      clean[key] = readable ? version : null
    }
    out[table as keyof TimetrackRows] = clean
  }
  return out
}

/**
 * The function is not in the database yet: PostgREST cannot find it (PGRST202),
 * or Postgres has no such function (42883). The caller falls back to the upsert,
 * so the code can go out before the migration without anything stopping saving.
 */
function functionMissing(error: { code?: string } | null): boolean {
  return error?.code === "PGRST202" || error?.code === "42883"
}

/**
 * The versioned write: every table, parents first, in ONE call to `timetrack_push`
 * — one transaction, so the version check and the write cannot be split by
 * another device's write landing between them.
 *
 * Returns null when the function does not exist yet. On any other failure, finds
 * the refused rows the way the upsert path does — table by table, halving — so a
 * refusal still names the rows the browser must drop. The calls that succeed on
 * the way are real writes, as they are on the upsert path.
 */
async function pushVersioned(supabase: Supabase, parts: WritePart[], versions: PushVersions): Promise<PushResult | null> {
  const tagSets = versions.tagSets ?? {}
  const bases = readableBases(versions.bases)
  const call = (subset: WritePart[]) =>
    supabase.rpc("timetrack_push", {
      p_batch: subset.map(({ table, owned }) => ({ table, rows: owned, bases: bases[table] ?? {} })),
      p_tag_sets: tagSets,
    })

  const total: Required<PushResult> = { applied: 0, written: {}, conflicts: {}, conflictTags: {} }
  const add = (answer: PushAnswer | null) => {
    total.applied += answer?.applied ?? 0
    for (const [table, versionsByKey] of Object.entries(answer?.written ?? {})) {
      const into = (total.written[table as keyof TimetrackRows] ??= {})
      Object.assign(into, versionsByKey)
    }
    for (const [table, stored] of Object.entries(answer?.conflicts ?? {})) {
      const into = ((total.conflicts as Record<string, unknown[]>)[table] ??= [])
      into.push(...(stored as unknown[]))
    }
    Object.assign(total.conflictTags, answer?.conflict_tags ?? {})
  }

  const whole = await call(parts)
  if (!whole.error) {
    add(whole.data as PushAnswer)
    return total
  }
  if (functionMissing(whole.error)) {
    // Saving goes on, unchecked — which is the exact defect the function exists
    // for, so it is said where somebody reading the logs will see it.
    console.warn(
      "[timetrack] timetrack_push is not in the database; writing with the old unchecked upsert. " +
        "Apply supabase/migrations/20261103120000_timetrack_versioned_writes.sql.",
    )
    return null
  }

  for (const part of parts) {
    const alone = await call([part])
    if (!alone.error) {
      add(alone.data as PushAnswer)
      continue
    }
    const refused = await isolateRefusedRows(part.owned, async (batch) => {
      const attempt = await call([{ ...part, owned: batch }])
      if (!attempt.error) add(attempt.data as PushAnswer)
      return !attempt.error
    })
    throw new TimetrackWriteRefused(
      part.table,
      refused.map((row) => rowKeyOf(part.table, row)).filter((key) => key.replace(/:/g, "") !== ""),
      `Could not write ${part.table}: ${alone.error.message}`,
    )
  }
  // every table went through on its own: whatever failed the whole did not last
  return total
}

/** Does this user have anything stored yet? Decides whether to offer the import. */
export async function timetrackIsEmpty(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await supabase
    .from("timetrack_workspaces")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    // a deleted workspace is not a workspace. Counting it means an account that
    // once had data and no longer does never gets offered the upload again.
    .is("deleted_at", null)
  if (error) throw new Error(`Could not check for existing time data: ${error.message}`)
  return (count ?? 0) === 0
}

/**
 * The one workspace this person has, made if it does not exist yet.
 *
 * `timetrack_workspaces` has a unique index allowing a single live row per
 * user, so this can never quietly produce a second one.
 */
async function resolveWorkspaceId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  rows: Partial<TimetrackRows>,
): Promise<string> {
  const { data: existing, error } = await supabase
    .from("timetrack_workspaces")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
  if (error) throw new Error(`Could not read your workspace: ${error.message}`)
  if (existing && existing.length > 0) return existing[0].id as string

  // none yet: adopt the id the client is offering, or make one
  const offered = rows.timetrack_workspaces?.[0]
  const created = {
    ...(offered ?? { name: "My Workspace", currency: "EUR", config: {} }),
    id: offered?.id ?? crypto.randomUUID(),
    user_id: userId,
    deleted_at: null,
  }
  const { error: insertError } = await supabase.from("timetrack_workspaces").upsert(created, { onConflict: "id" })
  if (insertError) throw new Error(`Could not create your workspace: ${insertError.message}`)
  return created.id as string
}
