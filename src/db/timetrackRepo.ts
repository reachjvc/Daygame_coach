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
    let query = supabase.from(table).select("*").eq("user_id", userId)
    if (since && !NO_UPDATED_AT.has(table)) query = query.gt("updated_at", since)
    const { data, error } = await query
    if (error) throw new Error(`Could not read ${table}: ${error.message}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(rows as any)[table] = data ?? []
  }

  return { rows, cursor }
}

export interface PushResult {
  applied: number
  cursor: string
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

  // Workspaces first: everything else points at one, and a foreign key does not
  // care that the row it needs is three lines further down the payload.
  const ordered = [...TIMETRACK_TABLES].sort((a, b) => {
    const rank = (t: string) =>
      t === "timetrack_workspaces" ? 0 : t === "timetrack_projects" ? 1 : t === "timetrack_tasks" ? 2 : t === "timetrack_entries" ? 3 : 4
    return rank(a) - rank(b)
  })

  for (const table of ordered) {
    const incoming = rows[table]
    if (!incoming || incoming.length === 0) continue

    const owned = incoming.map((row) => {
      const withOwner = { ...row, user_id: userId } as Record<string, unknown>
      if (table === "timetrack_workspaces") withOwner.id = workspaceId
      else if ("workspace_id" in withOwner) withOwner.workspace_id = workspaceId
      return withOwner
    })
    const onConflict = COMPOSITE_KEYS[table] ?? "id"
    const { error } = await supabase.from(table).upsert(owned, { onConflict })
    if (error) throw new Error(`Could not write ${table}: ${error.message}`)
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
