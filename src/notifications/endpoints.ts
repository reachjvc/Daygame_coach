/**
 * WHICH ADDRESSES THE SERVER WILL SEND A NOTIFICATION TO.
 *
 * The server POSTs to whatever address a browser hands it when notifications
 * are switched on. Taken on trust, that is a way to make this server call any
 * URL on the internet, or on its own network. So only the push services the
 * major browsers actually use are accepted (Plans/thought.md, "Security").
 *
 *   Chrome, Edge-on-Android, Samsung, Opera, Brave   fcm.googleapis.com
 *   Firefox                                          updates.push.services.mozilla.com
 *   Safari (macOS and iPhone)                        web.push.apple.com
 *   Edge on Windows                                  *.notify.windows.com
 */

const EXACT = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"])
const SUFFIXES = [".notify.windows.com", ".push.apple.com"]

export function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1000) return false
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false
  const host = url.hostname.toLowerCase()
  return EXACT.has(host) || SUFFIXES.some((s) => host.endsWith(s) && host.length > s.length)
}

export interface SubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
}

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/

/** A browser's `PushSubscription.toJSON()`, checked. Null when it is not one we will send to. */
export function readSubscription(value: unknown): SubscriptionInput | null {
  if (!value || typeof value !== "object") return null
  const v = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  if (!isAllowedPushEndpoint(v.endpoint)) return null
  const p256dh = v.keys?.p256dh
  const auth = v.keys?.auth
  if (typeof p256dh !== "string" || typeof auth !== "string") return null
  if (!B64URL.test(p256dh) || p256dh.length > 200 || !B64URL.test(auth) || auth.length > 100) return null
  return { endpoint: v.endpoint, p256dh, auth }
}

/** A short, readable name for a device, from its browser's own description. Never sent anywhere else. */
export function deviceLabel(userAgent: string, installed: boolean): string {
  const ua = userAgent
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android phone"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows PC"
            : /Linux/.test(ua)
              ? "Linux"
              : "Device"
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "browser"
  return installed ? `${device} · installed app` : `${device} · ${browser}`
}
