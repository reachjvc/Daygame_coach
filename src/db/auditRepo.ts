/**
 * THE ONLY FILE THAT READS OR WRITES THE AUDIT'S TABLES (`audit_runs`,
 * `audit_slots`; Plans/energy-audit.md).
 *
 * TWO KINDS OF FUNCTION. The first group runs on the signed-in person's own
 * connection, so row security fences it: if a bug here asked for somebody
 * else's rows, the database would return nothing. The second group, named
 * `...AsServer`, runs as the service role for the notification clock, which has
 * no session; it reads across accounts, so its caller sends each row only to
 * that row's own `userId`.
 *
 * Every read filters `.eq("user_id", userId)` and every write sets `user_id`,
 * as well as relying on row security. NOTHING THAT A PERSON TYPED (activity,
 * why) IS EVER PUT IN AN ERROR MESSAGE OR A LOG LINE: an error says which call
 * failed and the database's own `message`, never a row.
 */

import type { AnswerSource, AuditAnswer, AuditRun, AuditSlot, Review, ScaleValue } from "@/src/audit/types"
import { readAllRows } from "./paging"
import { createAdminSupabaseClient, createServerSupabaseClient } from "./supabase"

export class AuditRunNotFound extends Error {
  constructor() {
    super("No such audit")
  }
}

/** The database refused the change (a rule it holds, such as a quarter off the clock). */
export class AuditRefused extends Error {
  constructor(what = "The audit could not save that") {
    super(what)
  }
}

const DAYS_14_MS = 14 * 24 * 60 * 60_000

type RunRow = {
  id: string
  started_at: string
  ends_at: string
  ended_at: string | null
  quiet_start: number
  quiet_end: number
  muted_until: string | null
  review: unknown
  end_sent_at: string | null
}

type SlotRow = {
  id: string
  run_id: string
  slot_at: string
  activity: string
  energy: number
  growth: number
  avoiding: boolean
  why: string | null
  source: string
  time_entry_id: string | null
}

const RUN_COLUMNS = "id, started_at, ends_at, ended_at, quiet_start, quiet_end, muted_until, review, end_sent_at"
const SLOT_COLUMNS = "id, run_id, slot_at, activity, energy, growth, avoiding, why, source, time_entry_id"

const iso = (value: string): string => new Date(value).toISOString()

function toReview(raw: unknown): Review {
  const r = (raw && typeof raw === "object" ? raw : {}) as { choices?: unknown; notes?: unknown }
  return {
    choices: (r.choices && typeof r.choices === "object" ? r.choices : {}) as Review["choices"],
    notes: (r.notes && typeof r.notes === "object" ? r.notes : {}) as Review["notes"],
  }
}

function toRun(r: RunRow): AuditRun {
  return {
    id: r.id,
    startedAt: iso(r.started_at),
    endsAt: iso(r.ends_at),
    endedAt: r.ended_at ? iso(r.ended_at) : null,
    quietStart: r.quiet_start,
    quietEnd: r.quiet_end,
    mutedUntil: r.muted_until ? iso(r.muted_until) : null,
    review: toReview(r.review),
    endSentAt: r.end_sent_at ? iso(r.end_sent_at) : null,
  }
}

function toSlot(r: SlotRow): AuditSlot {
  return {
    id: r.id,
    runId: r.run_id,
    slotAt: iso(r.slot_at),
    activity: r.activity,
    energy: r.energy as ScaleValue,
    growth: r.growth as ScaleValue,
    avoiding: r.avoiding,
    why: r.why,
    source: r.source as AnswerSource,
    timeEntryId: r.time_entry_id,
  }
}

/** A database rule refused it (check, foreign key, unique): a refusal, not an outage. */
function refusal(error: { code?: string; message: string }, call: string): Error {
  if (error.code && ["23514", "23503", "23505", "22P02", "22007", "22008"].includes(error.code)) return new AuditRefused()
  return new Error(`Failed to ${call}: ${error.message}`)
}

// ---------------------------------------------------------------------------
// The signed-in person's connection
// ---------------------------------------------------------------------------

/** The person's open run: not ended, and not yet past its end. Null when none. */
export async function readOpenRun(userId: string, now: Date = new Date()): Promise<AuditRun | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("audit_runs")
    .select(RUN_COLUMNS)
    .eq("user_id", userId)
    .is("ended_at", null)
    .gt("ends_at", now.toISOString())
    .maybeSingle()
  if (error) throw new Error(`Failed to read the open audit: ${error.message}`)
  return data ? toRun(data as RunRow) : null
}

/** Every run, newest first (a person has a handful). */
export async function readRuns(userId: string): Promise<AuditRun[]> {
  const supabase = await createServerSupabaseClient()
  const rows = await readAllRows<RunRow>("your audits", (from, to) =>
    supabase.from("audit_runs").select(RUN_COLUMNS).eq("user_id", userId).order("id").range(from, to)
  )
  return rows.map(toRun).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** Every answered quarter of a run, oldest first. Paged by id, so 1,400 slots are not cut at 1,000. */
export async function readSlots(userId: string, runId: string): Promise<AuditSlot[]> {
  const supabase = await createServerSupabaseClient()
  const rows = await readAllRows<SlotRow>("your audit answers", (from, to) =>
    supabase.from("audit_slots").select(SLOT_COLUMNS).eq("user_id", userId).eq("run_id", runId).order("id").range(from, to)
  )
  return rows.map(toSlot).sort((a, b) => a.slotAt.localeCompare(b.slotAt))
}

/**
 * Start a run of 14 days. An open run that has run out is closed first, at its
 * own end, so the one-open-run index never blocks a new start. Starting twice
 * with the same id returns the run that exists. Refuses (AuditRefused) while
 * another run is still open.
 */
export async function startAuditRun(userId: string, input: { id: string; startedAt: Date }): Promise<AuditRun> {
  const supabase = await createServerSupabaseClient()
  // Close what has run out, each at its own end (an open run past its end).
  const expired = await supabase
    .from("audit_runs")
    .select("id, ends_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .lte("ends_at", input.startedAt.toISOString())
    .neq("id", input.id)
  if (expired.error) throw new Error(`Failed to read an old audit: ${expired.error.message}`)
  for (const old of (expired.data ?? []) as { id: string; ends_at: string }[]) {
    const closed = await supabase
      .from("audit_runs")
      .update({ ended_at: old.ends_at, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", old.id)
    if (closed.error) throw new Error(`Failed to close an old audit: ${closed.error.message}`)
  }

  const row = {
    id: input.id,
    user_id: userId,
    started_at: input.startedAt.toISOString(),
    ends_at: new Date(input.startedAt.getTime() + DAYS_14_MS).toISOString(),
  }
  const { data, error } = await supabase.from("audit_runs").insert(row).select(RUN_COLUMNS).single()
  if (error) {
    if (error.code === "23505") {
      const again = await supabase.from("audit_runs").select(RUN_COLUMNS).eq("user_id", userId).eq("id", input.id).maybeSingle()
      if (again.data) return toRun(again.data as RunRow)
    }
    throw refusal(error, "start the audit")
  }
  return toRun(data as RunRow)
}

export interface RunPatch {
  /** End now (sets `ended_at`). */
  endedAt?: Date
  mutedUntil?: Date | null
  quietStart?: number
  quietEnd?: number
  review?: Review
}

export async function updateRun(userId: string, runId: string, patch: RunPatch): Promise<AuditRun> {
  const change: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.endedAt !== undefined) change.ended_at = patch.endedAt.toISOString()
  if (patch.mutedUntil !== undefined) change.muted_until = patch.mutedUntil === null ? null : patch.mutedUntil.toISOString()
  if (patch.quietStart !== undefined) change.quiet_start = patch.quietStart
  if (patch.quietEnd !== undefined) change.quiet_end = patch.quietEnd
  if (patch.review !== undefined) change.review = patch.review
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("audit_runs")
    .update(change)
    .eq("user_id", userId)
    .eq("id", runId)
    .select(RUN_COLUMNS)
    .maybeSingle()
  if (error) throw refusal(error, "change the audit")
  if (!data) throw new AuditRunNotFound()
  return toRun(data as RunRow)
}

const UPSERT_AT_MOST = 200

/** Save answers. One quarter holds one answer: the same `(run, quarter)` again replaces it. */
export async function upsertSlots(userId: string, answers: AuditAnswer[]): Promise<void> {
  if (answers.length === 0) return
  if (answers.length > UPSERT_AT_MOST) throw new AuditRefused("Too many answers in one save")
  const supabase = await createServerSupabaseClient()
  const rows = answers.map((a) => ({
    id: a.id,
    user_id: userId,
    run_id: a.runId,
    slot_at: a.slotAt,
    activity: a.activity,
    energy: a.energy,
    growth: a.growth,
    avoiding: a.avoiding,
    why: a.why,
    source: a.source,
    time_entry_id: a.timeEntryId,
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from("audit_slots").upsert(rows, { onConflict: "run_id,slot_at" })
  if (error) throw refusal(error, "save the answers")
}

export async function deleteSlot(userId: string, id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from("audit_slots").delete().eq("user_id", userId).eq("id", id)
  if (error) throw new Error(`Failed to delete an answer: ${error.message}`)
}

/** The activities the person wrote most often, across every audit, most frequent first. */
export async function frequentActivities(userId: string, limit = 200): Promise<{ activity: string; count: number }[]> {
  const supabase = await createServerSupabaseClient()
  const rows = await readAllRows<{ id: string; activity: string }>("your past activities", (from, to) =>
    supabase.from("audit_slots").select("id, activity").eq("user_id", userId).order("id").range(from, to)
  )
  const counts = new Map<string, { activity: string; count: number; spellings: Map<string, number> }>()
  for (const { activity } of rows) {
    const key = activity.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()
    const entry = counts.get(key) ?? { activity, count: 0, spellings: new Map() }
    entry.count++
    entry.spellings.set(activity, (entry.spellings.get(activity) ?? 0) + 1)
    counts.set(key, entry)
  }
  return [...counts.values()]
    .map((e) => ({
      activity: [...e.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
      count: e.count,
    }))
    .sort((a, b) => b.count - a.count || a.activity.localeCompare(b.activity))
    .slice(0, limit)
}

/**
 * "Same as before" for the ping route: copies the previous quarter's activity,
 * energy, growth and "avoiding" (never its "why") to `slotAt`, with source
 * 'same'. Returns the new slot, or null when the previous quarter is
 * unanswered or this one is already answered; nothing is written then.
 */
export async function copyPreviousSlot(userId: string, runId: string, slotAt: Date, id: string): Promise<AuditSlot | null> {
  const supabase = await createServerSupabaseClient()
  const previousAt = new Date(slotAt.getTime() - 900_000).toISOString()
  const { data, error } = await supabase
    .from("audit_slots")
    .select(SLOT_COLUMNS)
    .eq("user_id", userId)
    .eq("run_id", runId)
    .in("slot_at", [previousAt, slotAt.toISOString()])
  if (error) throw new Error(`Failed to read the previous answer: ${error.message}`)
  const rows = (data ?? []) as SlotRow[]
  const previous = rows.find((r) => new Date(r.slot_at).toISOString() === previousAt)
  const already = rows.some((r) => new Date(r.slot_at).toISOString() === slotAt.toISOString())
  if (!previous || already) return null
  const insert = await supabase
    .from("audit_slots")
    .insert({
      id,
      user_id: userId,
      run_id: runId,
      slot_at: slotAt.toISOString(),
      activity: previous.activity,
      energy: previous.energy,
      growth: previous.growth,
      avoiding: previous.avoiding,
      why: null,
      source: "same",
      time_entry_id: null,
    })
    .select(SLOT_COLUMNS)
    .single()
  if (insert.error) {
    if (insert.error.code === "23505") return null
    throw refusal(insert.error, "copy the previous answer")
  }
  return toSlot(insert.data as SlotRow)
}

// ---------------------------------------------------------------------------
// The service role, for the clock
// ---------------------------------------------------------------------------

export interface PingDue {
  runId: string
  userId: string
  slotAt: string
  timezone: string
}

export async function auditPingsDueAsServer(limit: number, now: Date = new Date()): Promise<PingDue[]> {
  const { data, error } = await createAdminSupabaseClient().rpc("audit_pings_due", { p_limit: limit, p_now: now.toISOString() })
  if (error) throw new Error(`Failed to read the audit pings due: ${error.message}`)
  type Row = { run_id: string; user_id: string; slot_at: string; timezone: string }
  return ((data ?? []) as Row[]).map((r) => ({ runId: r.run_id, userId: r.user_id, slotAt: iso(r.slot_at), timezone: r.timezone }))
}

export async function auditEndsDueAsServer(limit: number, now: Date = new Date()): Promise<{ runId: string; userId: string }[]> {
  const { data, error } = await createAdminSupabaseClient().rpc("audit_ends_due", { p_limit: limit, p_now: now.toISOString() })
  if (error) throw new Error(`Failed to read the audit ends due: ${error.message}`)
  return ((data ?? []) as { run_id: string; user_id: string }[]).map((r) => ({ runId: r.run_id, userId: r.user_id }))
}

export async function markEndSentAsServer(runId: string): Promise<void> {
  const { error } = await createAdminSupabaseClient()
    .from("audit_runs")
    .update({ end_sent_at: new Date().toISOString() })
    .eq("id", runId)
  if (error) throw new Error(`Failed to record the end notice: ${error.message}`)
}

/**
 * Is `sendId` this person's ping for this quarter of this run? The ping route
 * acts only on a send that the server itself made for that quarter, so a
 * "Same as before" cannot be aimed at any other quarter. Read on the person's
 * own connection: another person's send is simply not found.
 */
export async function pingSendMatches(userId: string, sendId: string, runId: string, slotAt: Date): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("notification_sends")
    .select("id")
    .eq("user_id", userId)
    .eq("id", sendId)
    .eq("kind", "audit-ping")
    .eq("entry_id", `audit:${runId}:${Math.floor(slotAt.getTime() / 1000)}`)
    .maybeSingle()
  if (error) throw new Error(`Failed to read the ping: ${error.message}`)
  return data !== null
}
