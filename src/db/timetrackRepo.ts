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
import { emptyRows, TIMETRACK_TABLES, type TimetrackRows } from "./timetrackTypes"

/** Tables whose rows are identified by something other than a single `id` */
const COMPOSITE_KEYS: Partial<Record<keyof TimetrackRows, string>> = {
  timetrack_entry_tags: "entry_id,tag_id",
  timetrack_settings: "user_id",
}

/**
 * What to sort by when paging, for the tables that are not keyed by `id`.
 *
 * IT MUST BE UNIQUE, AND `entry_id` IS NOT. `src/db/paging.ts` states the rule
 * this broke: "order by something unique — if rows tie on the sort key, the
 * database may put the same row in both pages and neither page has the one it
 * displaced." An entry with three tags is three rows sharing one `entry_id`, so
 * a workspace with more than 1,000 tag links could come back with a link
 * duplicated and another missing. The duplicate then became two identical
 * `(entry_id, tag_id)` rows in one upsert — "ON CONFLICT DO UPDATE command
 * cannot affect row a second time" — which fails the batch every time it is
 * retried, while `isolateRefusedRows` splits the pair apart, finds both halves
 * fine, and names nothing for the browser to drop.
 *
 * `.order("entry_id,tag_id")` does NOT do this: Supabase reads that as one
 * column name. It takes a chained `.order()` per column.
 */
const ORDER_KEY: Partial<Record<keyof TimetrackRows, string[]>> = {
  timetrack_entry_tags: ["entry_id", "tag_id"],
  timetrack_settings: ["user_id"],
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
 * Everything of this user's that changed after `since`. Omit `since` for a full
 * download — that is what a new device does on its first load.
 */
export async function pullTimetrackRows(userId: string, since?: string | null): Promise<PullResult> {
  const supabase = await createServerSupabaseClient()
  const rows = emptyRows()
  const cursor = new Date().toISOString()

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
      if (since && !NO_UPDATED_AT.has(table)) query = query.gt("updated_at", since)
      // A stable order, or two pages can return the same row and miss another.
      // Not every table is keyed by `id`: settings has one row per person and
      // the tag links are keyed by the pair they join.
      for (const column of ORDER_KEY[table] ?? ["id"]) query = query.order(column, { ascending: true })

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

export interface PushResult {
  applied: number
  cursor: string
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

/**
 * Write this user's changed rows. Anything already there with the same id is
 * replaced, so sending the same change twice is harmless — which matters,
 * because a phone that loses signal mid-send will send again.
 *
 * `user_id` is overwritten with the caller's own id on every row. A client
 * cannot smuggle in a row belonging to somebody else even if it tries, and RLS
 * would refuse it a second time if it did.
 */
export async function pushTimetrackRows(userId: string, rows: Partial<TimetrackRows>): Promise<PushResult> {
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
   */
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
    const onConflict = COMPOSITE_KEYS[table] ?? "id"

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
    const keyColumns = onConflict.split(",")
    for (const row of owned) {
      const key = keyColumns.map((column) => String(row[column])).join(",")
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
        refused.map((row) => String((row as { id?: unknown }).id ?? "")).filter(Boolean),
        `Could not write ${table}: ${error.message}`,
      )
    }
    applied += owned.length
  }

  return { applied, cursor: new Date().toISOString() }
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
