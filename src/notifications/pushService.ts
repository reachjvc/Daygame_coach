/**
 * SENDING A NOTIFICATION TO A PERSON'S SWITCHED-ON DEVICES.
 *
 * Shared plumbing (Plans/thought.md, R7). The payload is encrypted for each
 * device by `web-push` with that device's own keys; the push service (Google,
 * Mozilla, Apple, Microsoft) can route it but cannot read it.
 *
 * EVERY SEND IS SHORT-LIVED, URGENT AND REPLACES THE LAST ONE.
 *   - TTL 10 minutes: a reminder that could not be delivered by then is
 *     dropped by the push service rather than arriving an hour late. The
 *     running timer's pushes keep 12 hours (TIMER_PUSH_TTL_SECONDS, below).
 *   - Urgency high: the best chance a website gets past battery saving.
 *   - Topic: the push service keeps only the newest undelivered message per
 *     topic, and the worker shows each under one tag, so thirty unanswered
 *     reminders are never thirty notifications.
 *
 * The keys come from the vault (`notification_secret`), once per server
 * instance. A server with no keys stored refuses to send and says so; it never
 * invents keys, because a new key pair silently orphans every device already
 * registered with the old one.
 */

import webpush from "web-push"
import {
  closeSend,
  devicesForSending,
  devicesForTimer,
  openSend,
  readNotificationSecret,
  recordDeviceOutcome,
  type SendKind,
} from "@/src/db/notificationsRepo"

export const PUSH_TTL_SECONDS = 600

/**
 * THE RUNNING TIMER LIVES LONGER. A reminder ten minutes late is noise, but
 * "● Gym · since 17:05" is the state of things, and the phone that was off
 * all evening should still show it when it comes back. The topic keeps only
 * the newest undelivered one, so a stop sent after the start replaces it at
 * the push service and a stale "running" is never delivered after a "stopped".
 */
export const TIMER_PUSH_TTL_SECONDS = 12 * 3600
/**
 * The plan's weekly review reminder keeps 6 hours: it is sent once a week and
 * never again, so a phone without signal at 19:00 should still get it that evening.
 */
export const REVIEW_PUSH_TTL_SECONDS = 6 * 3600

/** What the worker shows. `actions` are buttons on the notification (Android and laptops only). */
export interface PushPayload {
  title: string
  body: string
  /** Where tapping it goes. */
  url: string
  /** One tag per kind, so a new one replaces the last on screen. */
  tag: string
  /** The send's row id, carried back by whatever the person answers. */
  promptId?: string
  actions?: { id: string; title: string }[]
  /** No sound and no vibration. Left out: the worker's default, which rings. */
  silent?: boolean
  /** Ring again when it replaces one with the same tag. Left out: the worker's default, which does. */
  renotify?: boolean
  /**
   * "timetrack-running": the worker's Stop button and tap go to the timer.
   * "audit-ping": "Same as before" and "Mute 1 h" post to /api/audit/ping.
   */
  kind?: "timetrack-running" | "audit-ping" | "audit-end"
  /** The audit quarter a ping asks about (its start, ISO). */
  slotAt?: string
  /** The ping's send id, carried back by its buttons. */
  sendId?: string
  /** The time entry a timer notification is about, for its Stop button. */
  entryId?: string
  /** The timer's name, for the worker's own "Stop saved · Gym" when it has no signal. */
  name?: string
}

/** Which devices a kind goes to: pings to the ping switch, the timer to the timer switch. */
function isTimerKind(kind: SendKind): boolean {
  return kind === "timetrack-running" || kind === "timetrack-alert"
}

function topicOf(kind: SendKind): string {
  if (isTimerKind(kind)) return "timer-running"
  return kind
}

export class PushNotConfigured extends Error {
  constructor() {
    super("Notifications are not set up on this server yet")
  }
}

let keys: Promise<{ publicKey: string; privateKey: string } | null> | null = null

/** The public half, for a browser subscribing. Null when the vault has no keys. */
export async function pushKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
  keys ??= Promise.all([readNotificationSecret("push_vapid_public"), readNotificationSecret("push_vapid_private")]).then(
    ([publicKey, privateKey]) => (publicKey && privateKey ? { publicKey, privateKey } : null),
  )
  const result = await keys.catch(() => null)
  // A failed read (database briefly away) is not remembered: the next call asks again.
  if (result === null) keys = null
  return result
}

/**
 * The address the push services may contact about this sender. It must be a
 * `mailto:` or an https URL; the site's own address is used, not a person's
 * email, so no inbox is published to Google, Mozilla or Apple.
 */
function subject(): string {
  const site = process.env.NEXT_PUBLIC_APP_URL
  return site && site.startsWith("https://") ? site : "https://daygame-coach.vercel.app"
}

export type DeviceOutcome = "ok" | "gone" | "failed"

/**
 * What a push service's answer means for the device. 404 and 410 mean the
 * address is dead for good.
 *
 * SO DO 401 AND 403: the service refuses this server's key for this address,
 * which happens when the subscription was made with an earlier key pair (alpha
 * prove-slow-01). No retry can reach it; kept, the device stayed listed as
 * getting pings that never arrived. Removed, the page offers "Turn on pings
 * for this device" again, which subscribes with the current key.
 */
export function outcomeOf(statusCode: number | undefined): DeviceOutcome {
  if (statusCode !== undefined && statusCode >= 200 && statusCode < 300) return "ok"
  if (statusCode === 404 || statusCode === 410) return "gone"
  if (isKeyRefused(statusCode)) return "gone"
  return "failed"
}

function isKeyRefused(statusCode: number | undefined): boolean {
  return statusCode === 401 || statusCode === 403
}

export interface SendResult {
  /** Null when the person has no switched-on device: nothing was sent, and nothing recorded. */
  sendId: string | null
  devices: number
  delivered: number
  removed: number
  /** The send log already holds this alert for this entry, so nothing was sent again. */
  alreadySent?: boolean
}

/**
 * Send one notification to every switched-on device of this person, record
 * the send and each device's outcome, and remove devices that are gone.
 * `build` receives the send's id so the payload can carry it.
 *
 * WHICH SWITCH COUNTS DEPENDS ON THE KIND. Reminders and tests go to devices
 * with reminders on; the running timer and its alert go to devices with "Show
 * the running timer" on, and to no other — so a payload carrying an entry's
 * description never reaches a device that did not ask for it.
 */
export async function sendToPerson(
  userId: string,
  kind: SendKind,
  build: (sendId: string) => PushPayload,
  now: Date = new Date(),
  options: { entryId?: string } = {},
): Promise<SendResult> {
  const vapid = await pushKeys()
  if (!vapid) throw new PushNotConfigured()

  const timer = isTimerKind(kind)
  const devices = timer ? await devicesForTimer(userId) : await devicesForSending(userId)
  // No device, no send: a row here would count as a reminder nobody could answer.
  if (devices.length === 0) return { sendId: null, devices: 0, delivered: 0, removed: 0 }
  const sendId = await openSend(userId, kind, now, options.entryId)
  if (sendId === null) return { sendId: null, devices: devices.length, delivered: 0, removed: 0, alreadySent: true }
  const payload = JSON.stringify(build(sendId))

  let delivered = 0
  let removed = 0
  await Promise.all(
    devices.map(async (d) => {
      let outcome: DeviceOutcome
      try {
        const res = await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, {
          TTL: timer ? TIMER_PUSH_TTL_SECONDS : kind === "plan-review" ? REVIEW_PUSH_TTL_SECONDS : PUSH_TTL_SECONDS,
          urgency: "high",
          topic: topicOf(kind),
          vapidDetails: { subject: subject(), publicKey: vapid.publicKey, privateKey: vapid.privateKey },
          timeout: 10_000,
        })
        outcome = outcomeOf(res.statusCode)
      } catch (error) {
        outcome = outcomeOf((error as { statusCode?: number }).statusCode)
        // Every device refusing the key at once means this server's keys are wrong, not the devices'.
        if (isKeyRefused((error as { statusCode?: number }).statusCode)) {
          console.error("[push] key refused, device removed", (error as { statusCode?: number }).statusCode ?? "no answer")
        }
        if (outcome === "failed") {
          // The service's status only: the endpoint is a secret and never logged.
          console.error("[push] send failed", (error as { statusCode?: number }).statusCode ?? "no answer")
        }
      }
      if (outcome === "ok") delivered++
      if (outcome === "gone") removed++
      await recordDeviceOutcome(d.id, outcome).catch((e) =>
        console.error("[push] could not record an outcome", e instanceof Error ? e.message : "unknown"),
      )
    }),
  )

  await closeSend(sendId, { devices: devices.length, delivered, removed })
  return { sendId, devices: devices.length, delivered, removed }
}
