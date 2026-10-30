/**
 * THOUGHT FREQUENCIES, ON THE ACCOUNT.
 *
 * Every read and write of `thoughts`, `thought_logs`, `thought_reframes` and
 * `thought_settings` made on behalf of the signed-in person (Plans/thought.md).
 * The server's clock reads through `notificationsRepo` and the functions
 * marked "server" below, which use the service role.
 *
 * THE OWNER IS STAMPED HERE, FROM THE SESSION, as in `viceRepo`: every row
 * written gets `user_id` from the authenticated id, and every read filters by
 * it, so the scoping survives the day row security is left behind.
 *
 * COUNTS COME FROM THE DATABASE (`thought_counts`), never from reading the
 * logs here: a read is capped at 1,000 rows without saying so, and one
 * thought passes that in about two weeks of reminders.
 */

import { createAdminSupabaseClient, createServerSupabaseClient } from "./supabase"
import { chunkIds, readAllRows } from "./paging"
import { normalizeThought } from "@/src/thoughts/thoughtsService"
import {
  DEFAULT_SETTINGS,
  type FrequencyStats,
  type LogInput,
  type Reframe,
  type Thought,
  type ThoughtCounts,
  type ThoughtSettings,
} from "@/src/thoughts/types"
import type { ReframeInput } from "@/src/thoughts/thoughtsService"

type Paged<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

interface ThoughtRow {
  id: string
  text: string
  norm: string
  pinned: boolean
  archived_at: string | null
  merged_into: string | null
  created_at: string
}

interface CountRow {
  thought_id: string
  today: number
  week: number
  month: number
  total: number
  first_at: string | null
  last_at: string | null
}

interface ReframeRow {
  id: string
  thought_id: string
  text: string
  belief_before: number | null
  belief_after: number | null
  evidence: string
  friend: string
  created_at: string
  updated_at: string
}

interface SettingsRow {
  reminders_on: boolean
  interval_minutes: number
  quiet_start: number | null
  quiet_end: number | null
  active_days: number
  paused_until: string | null
  show_thoughts: boolean
  reframe_after_days: number
}

const THOUGHT_COLUMNS = "id, text, norm, pinned, archived_at, merged_into, created_at"
const REFRAME_COLUMNS = "id, thought_id, text, belief_before, belief_after, evidence, friend, created_at, updated_at"
const SETTINGS_COLUMNS =
  "reminders_on, interval_minutes, quiet_start, quiet_end, active_days, paused_until, show_thoughts, reframe_after_days"

const iso = (value: string | null): string | null => (value === null ? null : new Date(value).toISOString())

const NO_COUNTS: ThoughtCounts = { today: 0, week: 0, month: 0, total: 0, firstAt: null, lastAt: null }

/** A thought the person asked for that is not theirs, or no longer exists. */
export class ThoughtNotFound extends Error {
  constructor() {
    super("That thought no longer exists")
  }
}

/** Wording the database refuses for good (a check constraint): retrying cannot help. */
export class ThoughtRefused extends Error {
  constructor() {
    super("That thought could not be saved as written")
  }
}

/** A rewording that would make two live thoughts with the same words. */
export class ThoughtWordingTaken extends Error {
  constructor(public readonly existingId: string) {
    super("You already have a thought with these words")
  }
}

function toReframe(r: ReframeRow): Reframe {
  return {
    id: r.id,
    thoughtId: r.thought_id,
    text: r.text,
    beliefBefore: r.belief_before,
    beliefAfter: r.belief_after,
    evidence: r.evidence,
    friend: r.friend,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }
}

function toSettings(r: SettingsRow | null): ThoughtSettings {
  if (!r) return { ...DEFAULT_SETTINGS }
  return {
    remindersOn: r.reminders_on,
    intervalMinutes: r.interval_minutes as ThoughtSettings["intervalMinutes"],
    quietStart: r.quiet_start,
    quietEnd: r.quiet_end,
    activeDays: r.active_days,
    pausedUntil: iso(r.paused_until),
    showThoughts: r.show_thoughts,
    reframeAfterDays: r.reframe_after_days,
  }
}

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>> | ReturnType<typeof createAdminSupabaseClient>

/** Thoughts with their counts and current reframe, through whichever client is given. */
async function readThoughtsWith(supabase: Client, userId: string, timezone: string, now: Date): Promise<Thought[]> {
  const [rows, counts, reframes] = await Promise.all([
    readAllRows<ThoughtRow>("your thoughts", (from, to) =>
      supabase
        .from("thoughts")
        .select(THOUGHT_COLUMNS)
        .eq("user_id", userId)
        .is("merged_into", null)
        .order("id", { ascending: true })
        .range(from, to) as unknown as Paged<ThoughtRow>,
    ),
    readAllRows<CountRow>("how often each thought came", (from, to) =>
      supabase
        .rpc("thought_counts", { p_tz: timezone, p_now: now.toISOString(), p_user: userId })
        .order("thought_id", { ascending: true })
        .range(from, to) as unknown as Paged<CountRow>,
    ),
    readAllRows<ReframeRow>("your reframes", (from, to) =>
      supabase
        .from("thought_reframes")
        .select(REFRAME_COLUMNS)
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, to) as unknown as Paged<ReframeRow>,
    ),
  ])

  const countsById = new Map(counts.map((c) => [c.thought_id, c]))
  const reframesById = new Map<string, ReframeRow[]>()
  for (const r of reframes) {
    const list = reframesById.get(r.thought_id) ?? []
    list.push(r)
    reframesById.set(r.thought_id, list)
  }

  return rows.map((row) => {
    const c = countsById.get(row.id)
    const own = (reframesById.get(row.id) ?? []).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    return {
      id: row.id,
      text: row.text,
      pinned: row.pinned,
      archived: row.archived_at !== null,
      createdAt: new Date(row.created_at).toISOString(),
      counts: c
        ? { today: c.today, week: c.week, month: c.month, total: c.total, firstAt: iso(c.first_at), lastAt: iso(c.last_at) }
        : { ...NO_COUNTS },
      reframe: own.length > 0 ? toReframe(own[0]) : null,
      reframeCount: own.length,
    }
  })
}

/** Every live thought of this person, with counts in their own day. */
export async function readThoughts(userId: string, timezone: string, now: Date = new Date()): Promise<Thought[]> {
  return readThoughtsWith(await createServerSupabaseClient(), userId, timezone, now)
}

/** Server: the same, for the clock, which has no session. */
export async function readThoughtsAsServer(userId: string, timezone: string, now: Date = new Date()): Promise<Thought[]> {
  return readThoughtsWith(createAdminSupabaseClient(), userId, timezone, now)
}

/**
 * THE LIVE THOUGHT A WORDING OR AN OLD ID NOW MEANS.
 *
 * A merged thought's row stays, pointing at the thought it went into (see the
 * migration), so both an old id queued offline and an old wording typed again
 * resolve to the survivor. Null when there is none.
 */
async function liveIdFor(supabase: Client, userId: string, by: { id: string } | { norm: string }): Promise<string | null> {
  const query = supabase.from("thoughts").select("id, merged_into").eq("user_id", userId)
  const { data, error } = await ("id" in by ? query.eq("id", by.id) : query.eq("norm", by.norm))
  if (error) throw new Error(`Failed to look up a thought: ${error.message}`)
  const rows = (data ?? []) as { id: string; merged_into: string | null }[]
  const live = rows.find((r) => r.merged_into === null)
  if (live) return live.id
  return rows[0]?.merged_into ?? null
}

/**
 * Add a thought, or find the one these words already are.
 *
 * Typing a wording that exists returns that thought (un-archiving it: typing
 * it again is how an archived thought comes back) rather than refusing, so a
 * person can never make a duplicate and never sees an error for trying.
 */
export async function createThought(userId: string, id: string, text: string): Promise<{ id: string; created: boolean }> {
  const supabase = await createServerSupabaseClient()
  const norm = normalizeThought(text)

  const existing = await liveIdFor(supabase, userId, { norm })
  if (existing) {
    await supabase.from("thoughts").update({ archived_at: null, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("id", existing).not("archived_at", "is", null)
    return { id: existing, created: false }
  }

  const { error } = await supabase.from("thoughts").insert({ id, user_id: userId, text, norm })
  if (!error) return { id, created: true }
  // Two devices adding the same words at once: the other one won, use it. A
  // retry of this same request lands here too, on its own id.
  if (error.code === "23505") {
    const winner = await liveIdFor(supabase, userId, { norm })
    if (winner) return { id: winner, created: false }
    const same = await liveIdFor(supabase, userId, { id })
    if (same) return { id: same, created: false }
  }
  if (error.code === "23514") throw new ThoughtRefused()
  throw new Error(`Failed to add a thought: ${error.message}`)
}

/**
 * STORE LOGS, EACH ONCE.
 *
 * A device sends a log again whenever it is not sure the first send arrived;
 * the id it minted makes the second one a no-op (`ignoreDuplicates` is
 * `ON CONFLICT DO NOTHING`). A log for a thought since merged lands on the
 * survivor; a log for a thought since deleted is dropped, because the person
 * deleted that history on purpose. A reminder id that is not theirs is
 * cleared rather than refusing the tap.
 */
export async function insertLogs(
  userId: string,
  logs: LogInput[],
): Promise<{ stored: number; dropped: number; inserted: string[] }> {
  if (logs.length === 0) return { stored: 0, dropped: 0, inserted: [] }
  const supabase = await createServerSupabaseClient()

  // Every thought id in the batch, resolved in one read per 200 ids rather
  // than one per id: a batch of 500 random ids was 500 round trips.
  const resolved = new Map<string, string | null>()
  const asked = [...new Set(logs.map((l) => l.thoughtId).filter((x): x is string => x !== null))]
  for (const ids of chunkIds(asked)) {
    const { data, error } = await supabase.from("thoughts").select("id, merged_into").eq("user_id", userId).in("id", ids)
    if (error) throw new Error(`Failed to look up thoughts: ${error.message}`)
    for (const r of (data ?? []) as { id: string; merged_into: string | null }[]) resolved.set(r.id, r.merged_into ?? r.id)
  }
  const promptIds = [...new Set(logs.map((l) => l.promptId).filter((x): x is string => x !== null))]
  const knownPrompts = new Set<string>()
  if (promptIds.length > 0) {
    const { data, error } = await supabase.from("notification_sends").select("id").eq("user_id", userId).in("id", promptIds)
    if (error) throw new Error(`Failed to look up reminders: ${error.message}`)
    for (const r of (data ?? []) as { id: string }[]) knownPrompts.add(r.id)
  }

  const rows = []
  let dropped = 0
  for (const log of logs) {
    const thoughtId = log.thoughtId === null ? null : resolved.get(log.thoughtId) ?? null
    if (log.thoughtId !== null && thoughtId === null) {
      dropped++
      continue
    }
    rows.push({
      id: log.id,
      user_id: userId,
      thought_id: thoughtId,
      at: log.at,
      source: log.source,
      prompt_id: log.promptId !== null && knownPrompts.has(log.promptId) ? log.promptId : null,
    })
  }
  if (rows.length === 0) return { stored: 0, dropped, inserted: [] }

  // `select` after an ignoring upsert returns only the rows it actually
  // inserted: a log that was already here (a retry) is not in the answer, and
  // the page uses that to know which taps its last read could not include.
  const { data, error } = await supabase
    .from("thought_logs")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
    .select("id")
  if (error) throw new Error(`Failed to save what you logged: ${error.message}`)
  const inserted = ((data ?? []) as { id: string }[]).map((r) => r.id)

  // Logging an archived thought brings it back: the person is having it again.
  const logged = [...new Set(rows.map((r) => r.thought_id).filter((x): x is string => x !== null))]
  for (const ids of chunkIds(logged)) {
    const { error: unarchive } = await supabase
      .from("thoughts")
      .update({ archived_at: null, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("id", ids)
      .not("archived_at", "is", null)
    if (unarchive) throw new Error(`Failed to bring a thought back: ${unarchive.message}`)
  }
  return { stored: inserted.length, dropped, inserted }
}

/** How far back `readRecentLogIds` looks. A tap confirmed longer ago than this is in any read. */
export const RECENT_LOG_MINUTES = 15

/**
 * The ids of this person's logs stored in the last few minutes (at most 1,000;
 * a person does not tap 1,000 thoughts in 15 minutes). The page reads this
 * before its counts to know which just-sent taps they already include.
 */
export async function readRecentLogIds(userId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  const since = new Date(Date.now() - RECENT_LOG_MINUTES * 60_000).toISOString()
  const { data, error } = await supabase
    .from("thought_logs")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000)
  if (error) throw new Error(`Failed to read your recent logs: ${error.message}`)
  return ((data ?? []) as { id: string }[]).map((r) => r.id)
}

/** Undo: remove one log. Removing one that is already gone is not an error. */
export async function deleteLog(userId: string, logId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("thought_logs").delete().eq("user_id", userId).eq("id", logId)
  if (error) throw new Error(`Failed to undo: ${error.message}`)
}

/** The newest log of any thought (or "nothing notable"), for the reminder timer (Q17). */
export async function lastLogAt(userId: string, asServer = false): Promise<string | null> {
  const supabase = asServer ? createAdminSupabaseClient() : await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("thought_logs")
    .select("at")
    .eq("user_id", userId)
    .order("at", { ascending: false })
    .limit(1)
  if (error) throw new Error(`Failed to read your last log: ${error.message}`)
  const row = (data ?? [])[0] as { at: string } | undefined
  return row ? new Date(row.at).toISOString() : null
}

export interface ThoughtPatch {
  text?: string
  pinned?: boolean
  archived?: boolean
}

/**
 * Change a thought's wording, pin or archive it. Rewording keeps every log
 * and reframe: it is still the same thought. A wording that another live
 * thought already has is refused with that thought's id, so the screen can
 * offer to merge instead.
 */
export async function updateThought(userId: string, id: string, patch: ThoughtPatch): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.text !== undefined) {
    row.text = patch.text
    row.norm = normalizeThought(patch.text)
  }
  if (patch.pinned !== undefined) row.pinned = patch.pinned
  if (patch.archived !== undefined) row.archived_at = patch.archived ? new Date().toISOString() : null

  const { data, error } = await supabase
    .from("thoughts")
    .update(row)
    .eq("user_id", userId)
    .eq("id", id)
    .is("merged_into", null)
    .select("id")
  if (error?.code === "23505" && typeof row.norm === "string") {
    const other = await liveIdFor(supabase, userId, { norm: row.norm })
    throw new ThoughtWordingTaken(other ?? "")
  }
  if (error) throw new Error(`Failed to change the thought: ${error.message}`)
  if ((data ?? []).length === 0) throw new ThoughtNotFound()
}

/**
 * Merge `fromId` into `intoId`: one transaction in the database
 * (`merge_thought`), which takes the owner from the session itself and finds
 * nothing that is not theirs.
 */
export async function mergeThoughts(fromId: string, intoId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.rpc("merge_thought", { p_from: fromId, p_into: intoId })
  if (error?.code === "P0002") throw new ThoughtNotFound()
  if (error) throw new Error(`Failed to merge: ${error.message}`)
}

/**
 * DELETE A THOUGHT AND ITS WHOLE HISTORY: its logs, its reframes and the
 * wordings merged into it go with it (foreign keys, ON DELETE CASCADE). Only
 * ever called from the person's own confirm on the thought's sheet (Q18).
 */
export async function deleteThought(userId: string, id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.from("thoughts").delete().eq("user_id", userId).eq("id", id).select("id")
  if (error) throw new Error(`Failed to delete the thought: ${error.message}`)
  if ((data ?? []).length === 0) throw new ThoughtNotFound()
}

/**
 * Save a reframe: a new one, or an edit of one by its id. The thought must be
 * a live thought of this person.
 */
export async function saveReframe(userId: string, input: ReframeInput): Promise<Reframe> {
  const supabase = await createServerSupabaseClient()
  const thoughtId = await liveIdFor(supabase, userId, { id: input.thoughtId })
  if (!thoughtId) throw new ThoughtNotFound()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("thought_reframes")
    .upsert(
      {
        id: input.id,
        user_id: userId,
        thought_id: thoughtId,
        text: input.text,
        belief_before: input.beliefBefore,
        belief_after: input.beliefAfter,
        evidence: input.evidence,
        friend: input.friend,
        updated_at: now,
      },
      { onConflict: "id" },
    )
    .select(REFRAME_COLUMNS)
    .single()
  if (error) throw new Error(`Failed to save the reframe: ${error.message}`)
  return toReframe(data as ReframeRow)
}

/** Every reframe of one thought, newest first. */
export async function readReframes(userId: string, thoughtId: string): Promise<Reframe[]> {
  const supabase = await createServerSupabaseClient()
  const rows = await readAllRows<ReframeRow>("the thought's reframes", (from, to) =>
    supabase
      .from("thought_reframes")
      .select(REFRAME_COLUMNS)
      .eq("user_id", userId)
      .eq("thought_id", thoughtId)
      .order("id", { ascending: true })
      .range(from, to) as unknown as Paged<ReframeRow>,
  )
  return rows.map(toReframe).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** The person's settings, or the defaults when they have never saved any. */
export async function readSettings(userId: string, asServer = false): Promise<ThoughtSettings> {
  const supabase = asServer ? createAdminSupabaseClient() : await createServerSupabaseClient()
  const { data, error } = await supabase.from("thought_settings").select(SETTINGS_COLUMNS).eq("user_id", userId).maybeSingle()
  if (error) throw new Error(`Failed to read your reminder settings: ${error.message}`)
  return toSettings(data as SettingsRow | null)
}

export async function writeSettings(userId: string, s: ThoughtSettings): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("thought_settings").upsert(
    {
      user_id: userId,
      reminders_on: s.remindersOn,
      interval_minutes: s.intervalMinutes,
      quiet_start: s.quietStart,
      quiet_end: s.quietEnd,
      active_days: s.activeDays,
      paused_until: s.pausedUntil,
      show_thoughts: s.showThoughts,
      reframe_after_days: s.reframeAfterDays,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
  if (error) throw new Error(`Failed to save your reminder settings: ${error.message}`)
}

/** When a reminder last reached a push service for this person (the page's "last delivered"). */
export async function lastDeliveredAt(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("notification_sends")
    .select("sent_at")
    .eq("user_id", userId)
    .gt("delivered", 0)
    .order("sent_at", { ascending: false })
    .limit(1)
  if (error) throw new Error(`Failed to read your reminders: ${error.message}`)
  const row = (data ?? [])[0] as { sent_at: string } | undefined
  return row ? new Date(row.sent_at).toISOString() : null
}

/**
 * The Frequencies tab's numbers (`thought_frequency_stats`): one call, one
 * JSON answer, every count from the same instant, none capped at 1,000 rows.
 */
export async function readFrequencyStats(timezone: string, now: Date = new Date()): Promise<FrequencyStats> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc("thought_frequency_stats", { p_tz: timezone, p_now: now.toISOString() })
  if (error) throw new Error(`Failed to count your thoughts: ${error.message}`)
  const raw = data as FrequencyStats
  return {
    ...raw,
    reframes: raw.reframes.map((r) => ({
      ...r,
      reframedAt: new Date(r.reframedAt).toISOString(),
      beforeDays: Number(r.beforeDays),
      afterDays: Number(r.afterDays),
    })),
  }
}
