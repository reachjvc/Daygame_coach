"use client"

/**
 * NOTIFICATIONS, FROM THE BROWSER'S SIDE (shared plumbing, Plans/thought.md R7).
 *
 * WHAT A BROWSER CAN DO DECIDES WHAT THE PAGE OFFERS:
 *   - "needs-install": an iPhone or iPad outside the Home Screen app. Apple
 *     allows web notifications nowhere else (iOS 16.4+), so the page shows the
 *     install steps instead of an "on" switch that could never work.
 *   - "unsupported": no worker or no push in this browser.
 *   - "dev": the development server, which removes the worker on purpose
 *     (StaleWorkerCleanup); reminders are tested on a production build.
 *   - "ready".
 *
 * PERMISSION IS ONLY EVER ASKED FROM A TAP. A browser silently refuses a
 * permission asked for on page load, and a site whose request was refused can
 * never ask again; the person has to undo it in their settings.
 */

export type PushSupport = "ready" | "needs-install" | "unsupported" | "dev"

export function isAppleTouch(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

/** Opened from the Home Screen / as an installed app, rather than in a browser tab. */
export function isInstalledApp(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported"
  if (isAppleTouch() && !isInstalledApp()) return "needs-install"
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported"
  if (process.env.NODE_ENV !== "production") return "dev"
  return "ready"
}

export function permission(): NotificationPermission | "unsupported" {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission
}

/**
 * The site's worker, registered the way `OfflineShell` registers it (same
 * URL, so the same registration), or null when there is none to be had.
 */
export async function workerRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  if (pushSupport() !== "ready") return null
  const version = process.env.NEXT_PUBLIC_BUILD_ID
  if (!version || version === "unknown") return null
  try {
    await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(version)}`)
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])
  } catch {
    return null
  }
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** This browser's subscription, made with the server's public key if it has none yet. */
export async function subscribe(registration: ServiceWorkerRegistration, publicKey: string): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
}

/** This browser's address, if it has one, without registering anything. */
export async function currentEndpoint(): Promise<string | null> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null
    const registration = await navigator.serviceWorker.getRegistration()
    const sub = await registration?.pushManager.getSubscription()
    return sub?.endpoint ?? null
  } catch {
    return null
  }
}

/**
 * SIGNING OUT: this browser stops receiving the person's reminders. Run by
 * both Log Out buttons (src/shared/offlineCopies.ts) while the session still
 * exists. Never throws and never waits long: a sign-out must not hang on it.
 */
export async function forgetThisDevice(): Promise<void> {
  const endpoint = await currentEndpoint()
  if (!endpoint) return
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    await fetch("/api/notifications/devices/forget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer))
  } catch {
    // No signal: the address stays registered until the push service reports
    // it gone or the next person to sign in here takes it over, switched off.
  }
}
