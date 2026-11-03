/**
 * An account on a fake server that keeps the promises the real one makes.
 *
 * It answers `/api/timetrack/sync` the way the route does over the database:
 *
 *  - GET with no `since`: every row, tombstones included.
 *  - GET with `since`: the rows changed after it, plus the whole tag-link table,
 *    which has no `updated_at` and so always comes back whole.
 *  - POST carrying `bases`: the versioned write, `timetrack_push`. A row is written
 *    only if the stored `updated_at` is exactly the base the device sent, or if
 *    there is no such row yet. Otherwise the stored row comes back under
 *    `conflicts`, untouched. An entry's tag set replaces its links, and only when
 *    the entry itself was written in the same request.
 *  - POST without `bases`: the old whole-row upsert, which is what the route still
 *    does for a caller that sends none — and what every client did before Phase 2.
 *    `strict` turns that off, for a test about a server that only versions.
 *
 * The OTHER device is played by calling `stop`, `remove`, `edit` and `untag`
 * directly, which is what its writes amount to here.
 *
 * Stamps look like Postgres's own (`…12:00:01.000456+00:00`), microseconds and
 * all, so a client that rounded a base to milliseconds would be refused here the
 * way the database would refuse it.
 */

import { emptyRows, rowKeyOf, TIMETRACK_TABLES, type TimetrackRows } from "@/src/db/timetrackTypes"

type AnyRow = Record<string, unknown>
type Table = keyof TimetrackRows

const UNVERSIONED = new Set<Table>(["timetrack_workspaces", "timetrack_webhook_log"])
const NO_UPDATED_AT = new Set<Table>(["timetrack_entry_tags", "timetrack_webhook_log"])

interface PushBody {
  rows?: Partial<Record<Table, AnyRow[]>>
  bases?: Partial<Record<Table, Record<string, string | null>>>
  tagSets?: Record<string, string[]>
}

export interface FakeAccountOptions {
  /** refuse a write that carries no base, as the database function does */
  strict?: boolean
  userId?: string
}

export function fakeAccount(initial: TimetrackRows, options: FakeAccountOptions = {}) {
  const userId = options.userId ?? "user-1"
  let tick = 0
  const stamp = () => {
    tick += 1
    const ms = Date.parse("2026-08-10T12:00:00.000Z") + tick * 1000
    return `${new Date(ms).toISOString().slice(0, 23)}456+00:00`
  }

  const tables = new Map<Table, Map<string, AnyRow>>()
  for (const table of TIMETRACK_TABLES) tables.set(table, new Map())
  const put = (table: Table, row: AnyRow) => tables.get(table)!.set(rowKeyOf(table, row), row)

  const created = stamp()
  for (const table of TIMETRACK_TABLES) {
    for (const row of (initial[table] ?? []) as unknown as AnyRow[]) {
      put(table, NO_UPDATED_AT.has(table) ? { ...row } : { ...row, updated_at: created })
    }
  }

  let online = true
  let conflictCount = 0
  let gate: Promise<void> | null = null
  const posts: { versioned: boolean; body: PushBody }[] = []

  const linksOf = (entryId: string) =>
    [...tables.get("timetrack_entry_tags")!.values()]
      .filter((link) => link.entry_id === entryId)
      .map((link) => String(link.tag_id))
      .sort()

  const read = (since: string | null): TimetrackRows => {
    const out = emptyRows() as unknown as Record<Table, AnyRow[]>
    for (const table of TIMETRACK_TABLES) {
      out[table] = [...tables.get(table)!.values()]
        .filter((row) => !since || NO_UPDATED_AT.has(table) || Date.parse(String(row.updated_at)) > Date.parse(since))
        .map((row) => ({ ...row }))
    }
    return out as unknown as TimetrackRows
  }

  const push = (body: PushBody) => {
    const versioned = body.bases !== undefined || options.strict === true
    posts.push({ versioned: body.bases !== undefined, body })
    const now = stamp()
    const written: Partial<Record<Table, Record<string, string>>> = {}
    const conflicts: Partial<Record<Table, AnyRow[]>> = {}
    const conflictTags: Record<string, string[]> = {}
    const writtenEntries = new Set<string>()
    const refused = new Set<string>()
    const tagSets = body.tagSets ?? {}
    let applied = 0

    for (const table of TIMETRACK_TABLES) {
      const list = body.rows?.[table] ?? []
      if (table === "timetrack_entry_tags") {
        for (const link of list) {
          const entryId = String(link.entry_id)
          if (versioned && (refused.has(entryId) || entryId in tagSets)) continue
          put(table, { ...link, user_id: userId })
          applied += 1
        }
        continue
      }
      for (const row of list) {
        const key = rowKeyOf(table, row)
        const current = tables.get(table)!.get(key)
        const base = body.bases?.[table]?.[key]
        const stamped = NO_UPDATED_AT.has(table) ? {} : { updated_at: now }
        const fresh = !current
        const allowed = !versioned || fresh || UNVERSIONED.has(table) || (base != null && base === current?.updated_at)
        if (!allowed) {
          conflictCount += 1
          ;(conflicts[table] ??= []).push({ ...current })
          if (table === "timetrack_entries") {
            refused.add(key)
            conflictTags[key] = linksOf(key)
          }
          continue
        }
        put(table, { ...(current ?? {}), ...row, user_id: table === "timetrack_settings" ? row.user_id : userId, ...stamped })
        applied += 1
        if (!NO_UPDATED_AT.has(table)) (written[table] ??= {})[key] = now
        if (table === "timetrack_entries") writtenEntries.add(key)
      }
    }

    if (versioned) {
      for (const [entryId, tags] of Object.entries(tagSets)) {
        if (!writtenEntries.has(entryId)) continue
        const links = tables.get("timetrack_entry_tags")!
        for (const [key, link] of links) if (link.entry_id === entryId && !tags.includes(String(link.tag_id))) links.delete(key)
        for (const tag of tags) put("timetrack_entry_tags", { entry_id: entryId, tag_id: tag, user_id: userId })
      }
    }

    return versioned ? { applied, written, conflicts, conflictTags } : { applied }
  }

  const fetchStub = async (url: string, init?: { method?: string; body?: string }) => {
    if (gate && init?.method === "POST") await gate
    if (!online) throw new TypeError("Failed to fetch")
    if (init?.method === "POST") {
      const answer = push(JSON.parse(init.body ?? "{}") as PushBody)
      return { ok: true, status: 200, json: async () => answer }
    }
    const since = new URL(String(url), "http://localhost").searchParams.get("since")
    const rows = read(since)
    return { ok: true, status: 200, json: async () => ({ rows, cursor: stamp(), empty: false, userId }) }
  }

  const row = (table: Table, key: string) => tables.get(table)!.get(key) as AnyRow | undefined

  return {
    fetch: fetchStub,
    get online() {
      return online
    },
    set online(value: boolean) {
      online = value
    },
    /** how many rows were refused as stale, ever */
    get conflicts() {
      return conflictCount
    },
    posts,
    row,
    entry: (id: string) => row("timetrack_entries", id),
    linksOf,
    /** Hold every POST until the returned function is called */
    holdPosts(): () => void {
      let release: () => void = () => {}
      gate = new Promise<void>((resolve) => (release = resolve))
      return () => {
        gate = null
        release()
      }
    },

    // --- the other device ---------------------------------------------------
    stop(entryId: string, at: string) {
      const current = row("timetrack_entries", entryId)!
      const started = Date.parse(String(current.started_at))
      put("timetrack_entries", {
        ...current,
        stopped_at: at,
        duration_seconds: Math.max(0, Math.floor((Date.parse(at) - started) / 1000)),
        running_device_id: null,
        updated_at: stamp(),
      })
    },
    remove(table: Table, key: string) {
      const current = row(table, key)!
      const at = stamp()
      put(table, { ...current, deleted_at: at, updated_at: at })
    },
    edit(table: Table, key: string, patch: AnyRow) {
      put(table, { ...row(table, key)!, ...patch, updated_at: stamp() })
    },
    /** The other device takes a tag off: the link goes, and the entry is written with it */
    untag(entryId: string, tagId: string) {
      tables.get("timetrack_entry_tags")!.delete(`${entryId}:${tagId}`)
      put("timetrack_entries", { ...row("timetrack_entries", entryId)!, updated_at: stamp() })
    },
  }
}

export type FakeAccount = ReturnType<typeof fakeAccount>
