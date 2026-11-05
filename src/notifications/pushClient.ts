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

import { deviceLabel } from "./endpoints"

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
 * SIGNING OUT, THE TIME TRACKER'S PART: the running-timer notification comes
 * off this screen — it names what the person is doing — and a Stop still
 * waiting for signal in the worker (`timer-stops`, public/sw.js) is dropped.
 * That stop holds the timer's name too, and after sign-out it could only ever
 * be sent with the next person's session, which the server refuses. Never
 * throws.
 */
export async function forgetTimerOnThisDevice(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    for (const n of (await registration?.getNotifications({ tag: "timer-running" })) ?? []) n.close()
  } catch {
    // no worker, or nothing shown
  }
  try {
    if (typeof indexedDB !== "undefined") indexedDB.deleteDatabase("timer-stops")
  } catch {
    // storage blocked: nothing was kept there
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

/**
 * A SIGNED-IN PAGE TAKES THIS BROWSER'S PUSH ADDRESS FOR WHOEVER IS SIGNED IN.
 *
 * A session that ends without Log Out — it expires, the cookies are cleared —
 * leaves the address registered as the previous person's device, and the
 * server went on sending them their running timer here, by name, after
 * somebody else had signed in. Only Time › Settings and Thoughts asked the
 * server to take it over (`usePushDevice`), so the next person saw the previous
 * one's pushes until they happened to open one of those (account-switching
 * audit, Phase 8; `theNextPersonTakesOverThisBrowsersPushAddress`).
 *
 * Asked once per page load by the (app) layout. The server's "refresh" answer
 * is the one those screens already get: somebody else's device moves to whoever
 * is signed in with both switches off, the person's own keeps its switches, and
 * an address with no device is not registered. Chosen over unsubscribing at
 * sign-in, which would also take the same person's own notifications away each
 * time they signed in again, and would need every way of signing in to do it.
 * Never throws; asks nothing of a browser that never allowed notifications.
 */
export async function claimThisDevice(): Promise<void> {
  if (pushSupport() !== "ready" || permission() !== "granted") return
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const sub = await registration?.pushManager.getSubscription()
    if (!sub) return
    const res = await fetch("/api/notifications/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), intent: "refresh", label: deviceLabel(navigator.userAgent, isInstalledApp()) }),
    })
    /**
     * AND THE PREVIOUS PERSON'S TIMER ON THE SCREEN GOES TOO. Their pushes stop
     * reaching this browser, their "stopped" one included, so a running timer
     * shown before now stayed, naming what they were doing (security review,
     * 2026-11-05, low). The timer off here now: whatever it shows is not this
     * person's to see.
     */
    const answer = res.ok ? ((await res.json().catch(() => ({}))) as { timerRunning?: unknown }) : {}
    if (answer.timerRunning === false) {
      for (const shown of (await registration?.getNotifications({ tag: "timer-running" })) ?? []) shown.close()
    }
  } catch {
    // no worker or no signal: the next page load asks again
  }
}
