/**
 * NOTIFICATIONS THAT REACH A PHONE WITH THE APP CLOSED — the server's side.
 *
 * Shared plumbing (Plans/thought.md, R7): Thought Frequencies is the first
 * user, the time tracker and the gym's rest timer are meant to be next.
 *
 * EVERYTHING HERE RUNS AS THE SERVICE ROLE. `push_devices` and
 * `thought_prompt_schedule` have no client policy at all, on purpose: the
 * server POSTs to whatever address a device row holds, so a row written
 * straight from a browser would let anyone make the server call any URL.
 * Every function that acts for a person takes their id from the caller's
 * `requireAuth` and filters by it here; nothing takes an id from a body.
 *
 * A DEVICE'S ADDRESS NEVER LEAVES THE SERVER. `listDevices` returns labels
 * and states, never the endpoint or its keys: the address works like a
 * password for sending to that device.
 */

import { createAdminSupabaseClient } from "./supabase"

export type SecretName = "push_vapid_public" | "push_vapid_private" | "notifications_clock_secret"

/** One secret from Supabase Vault, through `notification_secret`. Null when it was never stored. */
export async function readNotificationSecret(name: SecretName): Promise<string | null> {
  const { data, error } = await createAdminSupabaseClient().rpc("notification_secret", { p_name: name })
  if (error) throw new Error(`Failed to read a notification key: ${error.message}`)
  return typeof data === "string" && data.length > 0 ? data : null
}

export interface DeviceRegistration {
  endpoint: string
  p256dh: string
  auth: string
  label: string
}

/** What a person may see about their devices. */
export interface DeviceSummary {
  id: string
  label: string
  enabled: boolean
  lastSuccessAt: string | null
  createdAt: string
}

/** What the sender needs. Server-side only. */
export interface DeviceTarget {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Register (or re-register) this browser for this person.
 *
 * Keyed on the endpoint, which names one browser profile. A second person
 * signing in on the same browser takes the row over: the first person's
 * reminders must not keep arriving on a screen that is no longer theirs.
 */
export async function registerDevice(userId: string, device: DeviceRegistration): Promise<string> {
  const now = new Date().toISOString()
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .upsert(
      {
        user_id: userId,
        endpoint: device.endpoint,
        p256dh: device.p256dh,
        auth: device.auth,
        label: device.label,
        enabled: true,
        failures: 0,
        updated_at: now,
      },
      { onConflict: "endpoint" },
    )
    .select("id")
    .single()
  if (error) throw new Error(`Failed to register this device: ${error.message}`)
  return (data as { id: string }).id
}

export async function listDevices(userId: string): Promise<DeviceSummary[]> {
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .select("id, label, enabled, last_success_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
  if (error) throw new Error(`Failed to read your devices: ${error.message}`)
  return ((data ?? []) as { id: string; label: string; enabled: boolean; last_success_at: string | null; created_at: string }[]).map(
    (d) => ({
      id: d.id,
      label: d.label,
      enabled: d.enabled,
      lastSuccessAt: d.last_success_at === null ? null : new Date(d.last_success_at).toISOString(),
      createdAt: new Date(d.created_at).toISOString(),
    }),
  )
}

/** The id of this person's device with this endpoint, if registered to them. */
export async function deviceIdForEndpoint(userId: string, endpoint: string): Promise<string | null> {
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .maybeSingle()
  if (error) throw new Error(`Failed to look up this device: ${error.message}`)
  return (data as { id: string } | null)?.id ?? null
}

export async function setDeviceEnabled(userId: string, deviceId: string, enabled: boolean): Promise<boolean> {
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", deviceId)
    .select("id")
  if (error) throw new Error(`Failed to change this device: ${error.message}`)
  return (data ?? []).length > 0
}

/** Remove a device by id, or by its endpoint (signing out knows only the endpoint). */
export async function removeDevice(userId: string, by: { id: string } | { endpoint: string }): Promise<void> {
  const query = createAdminSupabaseClient().from("push_devices").delete().eq("user_id", userId)
  const { error } = await ("id" in by ? query.eq("id", by.id) : query.eq("endpoint", by.endpoint))
  if (error) throw new Error(`Failed to remove this device: ${error.message}`)
}

/** Every switched-on device of this person, with what is needed to send to it. */
export async function devicesForSending(userId: string): Promise<DeviceTarget[]> {
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("enabled", true)
  if (error) throw new Error(`Failed to read devices to send to: ${error.message}`)
  return (data ?? []) as DeviceTarget[]
}

/**
 * WHAT HAPPENED TO ONE SEND TO ONE DEVICE.
 *
 * `gone`: the push service said this address no longer exists (404/410), so
 * the row is deleted; it can never work again, and the browser registers a
 * new one when the page is next opened. `failed`: anything else; counted, and
 * a device that fails twenty times in a row is switched off rather than tried
 * forever.
 */
export async function recordDeviceOutcome(deviceId: string, outcome: "ok" | "gone" | "failed"): Promise<void> {
  const db = createAdminSupabaseClient()
  const now = new Date().toISOString()
  if (outcome === "gone") {
    const { error } = await db.from("push_devices").delete().eq("id", deviceId)
    if (error) throw new Error(`Failed to remove a dead device: ${error.message}`)
    return
  }
  if (outcome === "ok") {
    const { error } = await db.from("push_devices").update({ failures: 0, last_success_at: now }).eq("id", deviceId)
    if (error) throw new Error(`Failed to record a delivery: ${error.message}`)
    return
  }
  const { data, error: readError } = await db.from("push_devices").select("failures").eq("id", deviceId).maybeSingle()
  if (readError) throw new Error(`Failed to record a failed delivery: ${readError.message}`)
  const failures = Math.min(((data as { failures: number } | null)?.failures ?? 0) + 1, 32767)
  const { error } = await db
    .from("push_devices")
    .update({ failures, enabled: failures < 20, updated_at: now })
    .eq("id", deviceId)
  if (error) throw new Error(`Failed to record a failed delivery: ${error.message}`)
}

export type SendKind = "thought-prompt" | "test"

/** Open a send's row before sending, so its id can travel in the notification. */
export async function openSend(userId: string, kind: SendKind, at: Date): Promise<string> {
  const { data, error } = await createAdminSupabaseClient()
    .from("notification_sends")
    .insert({ user_id: userId, kind, sent_at: at.toISOString() })
    .select("id")
    .single()
  if (error) throw new Error(`Failed to record a reminder: ${error.message}`)
  return (data as { id: string }).id
}

export async function closeSend(sendId: string, counts: { devices: number; delivered: number; removed: number }): Promise<void> {
  const { error } = await createAdminSupabaseClient().from("notification_sends").update(counts).eq("id", sendId)
  if (error) throw new Error(`Failed to record a reminder's outcome: ${error.message}`)
}

// ---------------------------------------------------------------------------
// THE THOUGHTS REMINDER SCHEDULE. Here rather than in thoughtsRepo because it
// is server-only, like everything else in this file.
// ---------------------------------------------------------------------------

export interface PromptSchedule {
  nextDueAt: string | null
  lastSentAt: string | null
}

export async function readPromptSchedule(userId: string): Promise<PromptSchedule> {
  const { data, error } = await createAdminSupabaseClient()
    .from("thought_prompt_schedule")
    .select("next_due_at, last_sent_at")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`Failed to read the reminder schedule: ${error.message}`)
  const row = data as { next_due_at: string | null; last_sent_at: string | null } | null
  return {
    nextDueAt: row?.next_due_at ? new Date(row.next_due_at).toISOString() : null,
    lastSentAt: row?.last_sent_at ? new Date(row.last_sent_at).toISOString() : null,
  }
}

/** Write the next due time; `sentAt` also records that a reminder just went out. */
export async function writePromptSchedule(userId: string, nextDueAt: Date | null, sentAt?: Date): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    next_due_at: nextDueAt === null ? null : nextDueAt.toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (sentAt) row.last_sent_at = sentAt.toISOString()
  const { error } = await createAdminSupabaseClient().from("thought_prompt_schedule").upsert(row, { onConflict: "user_id" })
  if (error) throw new Error(`Failed to write the reminder schedule: ${error.message}`)
}

/**
 * Take every reminder due at `now`, each by exactly one caller
 * (`claim_due_thought_prompts`). A taken row is not due again for `leaseSeconds`
 * unless the sender writes its real next time first.
 */
export async function claimDuePrompts(now: Date, leaseSeconds: number, limit: number): Promise<{ userId: string; dueAt: string }[]> {
  const { data, error } = await createAdminSupabaseClient().rpc("claim_due_thought_prompts", {
    p_now: now.toISOString(),
    p_lease: `${leaseSeconds} seconds`,
    p_limit: limit,
  })
  if (error) throw new Error(`Failed to claim due reminders: ${error.message}`)
  return ((data ?? []) as { user_id: string; due_at: string }[]).map((r) => ({ userId: r.user_id, dueAt: r.due_at }))
}

/** The account's timezone, for the clock (which has no session to ask `settingsRepo` with). */
export async function timezoneAsServer(userId: string): Promise<string> {
  const { data, error } = await createAdminSupabaseClient().from("profiles").select("timezone").eq("id", userId).maybeSingle()
  if (error) throw new Error(`Failed to read a timezone: ${error.message}`)
  return (data as { timezone: string | null } | null)?.timezone || "UTC"
}
