/**
 * NOTIFICATIONS THAT REACH A PHONE WITH THE APP CLOSED — the server's side.
 *
 * Shared plumbing (Plans/thought.md, R7, now serving Time and the time &
 * energy audit, Plans/energy-audit.md).
 *
 * EVERYTHING HERE RUNS AS THE SERVICE ROLE. `push_devices` has no client policy at all, on purpose: the
 * server POSTs to whatever address a device row holds, so a row written
 * straight from a browser would let anyone make the server call any URL.
 * Every function that acts for a person takes their id from the caller's
 * `requireAuth` and filters by it here; nothing takes an id from a body.
 *
 * A DEVICE'S ADDRESS NEVER LEAVES THE SERVER. `listDevices` returns labels
 * and states, never the endpoint or its keys: the address works like a
 * password for sending to that device.
 *
 * TWO SWITCHES PER DEVICE. `enabled` is "audit pings on
 * this device"; `timer_running` is the time tracker's "Show the running timer
 * on this device" (Plans/time-tracker-like-toggl.md, Phase 7). They are
 * separate choices, so a function that writes one never touches the other.
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
  /** "Show the running timer on this device" */
  timerRunning: boolean
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
 *
 * `timerRunning` left out keeps the stored setting (a new row starts off).
 */
export async function registerDevice(userId: string, device: DeviceRegistration, enabled = true, timerRunning?: boolean): Promise<string> {
  const now = new Date().toISOString()
  const row: Record<string, unknown> = {
    user_id: userId,
    endpoint: device.endpoint,
    p256dh: device.p256dh,
    auth: device.auth,
    enabled,
    failures: 0,
    updated_at: now,
  }
  // An empty label (the worker re-registering knows none) keeps the one stored.
  if (device.label) row.label = device.label
  if (timerRunning !== undefined) row.timer_running = timerRunning
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .upsert(row, { onConflict: "endpoint" })
    .select("id")
    .single()
  if (error) throw new Error(`Failed to register this device: ${error.message}`)
  return (data as { id: string }).id
}

export async function listDevices(userId: string): Promise<DeviceSummary[]> {
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .select("id, label, enabled, timer_running, last_success_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
  if (error) throw new Error(`Failed to read your devices: ${error.message}`)
  type Row = { id: string; label: string; enabled: boolean; timer_running: boolean; last_success_at: string | null; created_at: string }
  return ((data ?? []) as Row[]).map(
    (d) => ({
      id: d.id,
      label: d.label,
      enabled: d.enabled,
      timerRunning: d.timer_running,
      lastSuccessAt: d.last_success_at === null ? null : new Date(d.last_success_at).toISOString(),
      createdAt: new Date(d.created_at).toISOString(),
    }),
  )
}

/**
 * Who this browser's address is registered to, if anyone, whether it is on,
 * and the keys it was registered with (another account's device moves only for
 * a browser posting those). Server-only: the answer names another person's id, and is used only to
 * decide whether a shared browser moves to whoever is signed in now.
 */
export async function deviceByEndpoint(
  endpoint: string,
): Promise<{ id: string; userId: string; enabled: boolean; timerRunning: boolean; p256dh: string; auth: string } | null> {
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .select("id, user_id, enabled, timer_running, p256dh, auth")
    .eq("endpoint", endpoint)
    .maybeSingle()
  if (error) throw new Error(`Failed to look up this device: ${error.message}`)
  const row = data as { id: string; user_id: string; enabled: boolean; timer_running: boolean; p256dh: string; auth: string } | null
  return row
    ? { id: row.id, userId: row.user_id, enabled: row.enabled, timerRunning: row.timer_running, p256dh: row.p256dh, auth: row.auth }
    : null
}

/**
 * The browser replaced this device's address: carry the row (and whether it
 * is on) over to the new one. False when no row of this person had the old one.
 */
export async function moveDevice(userId: string, oldEndpoint: string, next: { endpoint: string; p256dh: string; auth: string }): Promise<boolean> {
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .update({ endpoint: next.endpoint, p256dh: next.p256dh, auth: next.auth, failures: 0, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("endpoint", oldEndpoint)
    .select("id")
  if (error) throw new Error(`Failed to move this device: ${error.message}`)
  return (data ?? []).length > 0
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

/** "Show the running timer on this device", on or off. False when no device of this person has that id. */
export async function setDeviceTimer(userId: string, deviceId: string, timerRunning: boolean): Promise<boolean> {
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .update({ timer_running: timerRunning, updated_at: new Date().toISOString() })
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
 * Every device of this person showing the running timer. Only these are ever
 * handed a timer push, so a device with the setting off never receives the
 * entry's description.
 */
export async function devicesForTimer(userId: string): Promise<DeviceTarget[]> {
  const { data, error } = await createAdminSupabaseClient()
    .from("push_devices")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("timer_running", true)
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
 * forever: both switches, reminders and the running timer.
 *
 * A failure below twenty switches NOTHING ON. This used to write
 * `enabled: failures < 20`, harmless while only switched-on devices were ever
 * sent to. Once the timer goes to a device with reminders off, that write
 * would have turned its reminders on with the first failed send.
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
  const change: Record<string, unknown> = { failures, updated_at: now }
  if (failures >= 20) {
    change.enabled = false
    change.timer_running = false
  }
  const { error } = await db.from("push_devices").update(change).eq("id", deviceId)
  if (error) throw new Error(`Failed to record a failed delivery: ${error.message}`)
}

/**
 * What a send was. 'timetrack-running' is the silent running/stopped timer
 * notification, 'timetrack-alert' the one alert with sound at 6 h,
 * 'audit-ping' the time & energy audit's quarter-hour question and
 * 'audit-end' its "your two weeks are done", 'plan-review' the plan's one weekly
 * review reminder. Kept in step with the
 * database's `notification_sends_kind_check`.
 */
export type SendKind = "test" | "timetrack-running" | "timetrack-alert" | "audit-ping" | "audit-end" | "plan-review"

/**
 * Open a send's row before sending, so its id can travel in the notification.
 *
 * `entryId` names the time entry a timer send is about. For an alert the
 * database takes one row per entry (`notification_sends_one_alert_per_entry`):
 * a second is refused, and this answers null, "already sent, do not send
 * again". That is how the 6 h alert rings once even when two clock ticks race.
 */
export async function openSend(userId: string, kind: Exclude<SendKind, "timetrack-alert" | "audit-ping" | "audit-end" | "plan-review">, at: Date, entryId?: string): Promise<string>
export async function openSend(userId: string, kind: SendKind, at: Date, entryId?: string): Promise<string | null>
export async function openSend(userId: string, kind: SendKind, at: Date, entryId?: string): Promise<string | null> {
  const row: Record<string, unknown> = { user_id: userId, kind, sent_at: at.toISOString() }
  if (entryId !== undefined) row.entry_id = entryId
  const { data, error } = await createAdminSupabaseClient().from("notification_sends").insert(row).select("id").single()
  if (error?.code === "23505" && (kind === "timetrack-alert" || kind === "audit-ping" || kind === "audit-end" || kind === "plan-review")) return null
  if (error) throw new Error(`Failed to record a reminder: ${error.message}`)
  return (data as { id: string }).id
}

/** A running entry, as the alert clock needs it. */
export interface RunningTimerAsServer {
  id: string
  userId: string
  description: string
  projectName: string | null
  startedAt: string
}

/**
 * The 6 h alerts due now, from `timetrack_alerts_due`: at most one per
 * person (their oldest unalerted timer), only for people with a device
 * showing the timer, only inside their 07:00–22:59, oldest first. Every rule
 * is applied in the database BEFORE the limit, so one account's entries can
 * never fill the list and keep another's alert from ringing (security
 * review, 2026-11-04). AS THE SERVICE ROLE, like everything here: the clock
 * has no session. It reads across accounts, so its caller sends each row only
 * to that row's own `userId`.
 */
export async function timerAlertsDueAsServer(limit = 200): Promise<RunningTimerAsServer[]> {
  const { data, error } = await createAdminSupabaseClient().rpc("timetrack_alerts_due", { p_limit: limit })
  if (error) throw new Error(`Failed to read the timer alerts due: ${error.message}`)
  type Row = { id: string; user_id: string; description: string; project_name: string | null; started_at: string }
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    description: r.description,
    projectName: r.project_name,
    startedAt: r.started_at,
  }))
}

export async function closeSend(sendId: string, counts: { devices: number; delivered: number; removed: number }): Promise<void> {
  const { error } = await createAdminSupabaseClient().from("notification_sends").update(counts).eq("id", sendId)
  if (error) throw new Error(`Failed to record a reminder's outcome: ${error.message}`)
}

/** The account's timezone, for the clock (which has no session to ask `settingsRepo` with). */
export async function timezoneAsServer(userId: string): Promise<string> {
  const { data, error } = await createAdminSupabaseClient().from("profiles").select("timezone").eq("id", userId).maybeSingle()
  if (error) throw new Error(`Failed to read a timezone: ${error.message}`)
  return (data as { timezone: string | null } | null)?.timezone || "UTC"
}
