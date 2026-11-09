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
import { normalizePhrase } from "@/src/shared/textMatch"
import { nextReviewVersion, readStoredReview, reviewToStore } from "@/src/audit/auditService"
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
  // A part stored in a shape this version refuses shows as empty rather than breaking the review; changeReview never writes over it.
  return readStoredReview(raw).review
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
  // 22P05: text the database cannot store (the NUL character), refused for good, not an outage.
  if (error.code && ["23514", "23503", "23505", "22P02", "22P05", "22007", "22008"].includes(error.code)) return new AuditRefused()
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

/** A change to the review that `changeReview` applies to what is stored; an error is a refusal a person can read. */
export type ReviewEdit = (stored: Review) => { review: Review } | { error: string }

/** Two devices clash now and then; ten saves at one moment (tested) still all land within these. */
const REVIEW_TRIES = 20
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms))

/**
 * Change the review from what is stored NOW, never from a page's old copy: two
 * devices on one review each keep what they saved (alpha fast-review-01/02).
 * The write only lands while `updated_at` is still the value read, so a save
 * from another device in between makes this read again and re-apply, instead
 * of overwriting it.
 */
export async function changeReview(userId: string, runId: string, edit: ReviewEdit): Promise<AuditRun | { error: string }> {
  const supabase = await createServerSupabaseClient()
  for (let attempt = 0; attempt < REVIEW_TRIES; attempt++) {
    const read = await supabase.from("audit_runs").select("review, updated_at").eq("user_id", userId).eq("id", runId).maybeSingle()
    if (read.error) throw new Error(`Failed to read the review: ${read.error.message}`)
    if (!read.data) throw new AuditRunNotFound()
    const row = read.data as { review: unknown; updated_at: string }
    const before = toReview(row.review)
    const next = edit(before)
    if ("error" in next) return next
    // A part that could not be read goes back exactly as stored; a change to it is refused.
    const value = reviewToStore(row.review, before, next.review)
    if ("error" in value) return value
    const { data, error } = await supabase
      .from("audit_runs")
      // Always later than the stamp read, so a writer that read before this one fails its check.
      .update({ review: value.value, updated_at: nextReviewVersion(row.updated_at, new Date()) })
      .eq("user_id", userId)
      .eq("id", runId)
      .eq("updated_at", row.updated_at)
      .select(RUN_COLUMNS)
      .maybeSingle()
    if (error) throw refusal(error, "change the review")
    if (data) return toRun(data as RunRow)
    // Another save landed in between: wait a moment, spread out, then read it and apply this change on top.
    await pause(10 + Math.random() * 40 * (attempt + 1))
  }
  throw new Error("Failed to change the review: it kept changing underneath")
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
    // The time it was answered (already on the server's clock), so a later
    // answer from another device can be told from an older one.
    updated_at: a.answeredAt ?? new Date().toISOString(),
  }))
  const { error } = await supabase.from("audit_slots").upsert(rows, { onConflict: "run_id,slot_at" })
  if (error) throw refusal(error, "save the answers")
}

/**
 * Delete one answer. With `notAfter`, only if it was not answered again after
 * that time (on another device): a delete made offline never removes a newer
 * answer. Returns whether a row went.
 */
export async function deleteSlot(userId: string, id: string, notAfter?: Date): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  let query = supabase.from("audit_slots").delete().eq("user_id", userId).eq("id", id)
  if (notAfter) query = query.lte("updated_at", notAfter.toISOString())
  const { data, error } = await query.select("id")
  if (error) throw new Error(`Failed to delete an answer: ${error.message}`)
  return (data ?? []).length > 0
}

/** When each of these quarters was last answered, by run and quarter (`<run>:<iso>`). */
export async function answeredTimes(userId: string, quarters: { runId: string; slotAt: string }[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (quarters.length === 0) return out
  const supabase = await createServerSupabaseClient()
  const byRun = new Map<string, string[]>()
  for (const q of quarters) byRun.set(q.runId, [...(byRun.get(q.runId) ?? []), q.slotAt])
  for (const [runId, slots] of byRun) {
    const { data, error } = await supabase
      .from("audit_slots")
      .select("slot_at, updated_at")
      .eq("user_id", userId)
      .eq("run_id", runId)
      .in("slot_at", slots)
    if (error) throw new Error(`Failed to read the stored answers: ${error.message}`)
    for (const r of (data ?? []) as { slot_at: string; updated_at: string }[]) {
      out.set(`${runId}:${new Date(r.slot_at).toISOString()}`, Date.parse(r.updated_at))
    }
  }
  return out
}

/** The activities the person wrote most often, across every audit, most frequent first. */
export async function frequentActivities(userId: string, limit = 200): Promise<{ activity: string; count: number }[]> {
  const supabase = await createServerSupabaseClient()
  const rows = await readAllRows<{ id: string; activity: string }>("your past activities", (from, to) =>
    supabase.from("audit_slots").select("id, activity").eq("user_id", userId).order("id").range(from, to)
  )
  const counts = new Map<string, { activity: string; count: number; spellings: Map<string, number> }>()
  for (const { activity } of rows) {
    // The same key as the review's groups (`buildReview`), so the two never disagree.
    const key = normalizePhrase(activity) || activity.trim().toLowerCase()
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
