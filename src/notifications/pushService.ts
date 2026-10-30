/**
 * SENDING A NOTIFICATION TO A PERSON'S SWITCHED-ON DEVICES.
 *
 * Shared plumbing (Plans/thought.md, R7). The payload is encrypted for each
 * device by `web-push` with that device's own keys; the push service (Google,
 * Mozilla, Apple, Microsoft) can route it but cannot read it.
 *
 * EVERY SEND IS SHORT-LIVED, URGENT AND REPLACES THE LAST ONE.
 *   - TTL 10 minutes: a reminder that could not be delivered by then is
 *     dropped by the push service rather than arriving an hour late.
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
  openSend,
  readNotificationSecret,
  recordDeviceOutcome,
  type SendKind,
} from "@/src/db/notificationsRepo"

export const PUSH_TTL_SECONDS = 600

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

/** What a push service's answer means for the device. 404 and 410 mean the address is dead for good. */
export function outcomeOf(statusCode: number | undefined): DeviceOutcome {
  if (statusCode !== undefined && statusCode >= 200 && statusCode < 300) return "ok"
  if (statusCode === 404 || statusCode === 410) return "gone"
  return "failed"
}

export interface SendResult {
  /** Null when the person has no switched-on device: nothing was sent, and nothing recorded. */
  sendId: string | null
  devices: number
  delivered: number
  removed: number
}

/**
 * Send one notification to every switched-on device of this person, record
 * the send and each device's outcome, and remove devices that are gone.
 * `build` receives the send's id so the payload can carry it.
 */
export async function sendToPerson(userId: string, kind: SendKind, build: (sendId: string) => PushPayload, now: Date = new Date()): Promise<SendResult> {
  const vapid = await pushKeys()
  if (!vapid) throw new PushNotConfigured()

  const devices = await devicesForSending(userId)
  // No device, no send: a row here would count as a reminder nobody could answer.
  if (devices.length === 0) return { sendId: null, devices: 0, delivered: 0, removed: 0 }
  const sendId = await openSend(userId, kind, now)
  const payload = JSON.stringify(build(sendId))

  let delivered = 0
  let removed = 0
  await Promise.all(
    devices.map(async (d) => {
      let outcome: DeviceOutcome
      try {
        const res = await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, {
          TTL: PUSH_TTL_SECONDS,
          urgency: "high",
          topic: kind === "test" ? "test" : "thought-prompt",
          vapidDetails: { subject: subject(), publicKey: vapid.publicKey, privateKey: vapid.privateKey },
          timeout: 10_000,
        })
        outcome = outcomeOf(res.statusCode)
      } catch (error) {
        outcome = outcomeOf((error as { statusCode?: number }).statusCode)
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
