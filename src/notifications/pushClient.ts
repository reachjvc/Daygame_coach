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

function sameBytes(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.length) return false
  const view = new Uint8Array(a)
  return view.every((x, i) => x === b[i])
}

/**
 * WHICH KEY THIS BROWSER'S SUBSCRIPTION WAS MADE WITH, when the browser does
 * not tell (`options.applicationServerKey` is null in some): the address and
 * the key it was made with here. Without it, such a browser would be
 * subscribed afresh on every page open.
 */
const MADE_WITH_KEY = "push-subscription-key-v1"

function rememberKey(endpoint: string, publicKey: string): void {
  try {
    window.localStorage.setItem(MADE_WITH_KEY, JSON.stringify({ endpoint, publicKey }))
  } catch {
    // storage blocked: such a browser is checked again next time
  }
}

function madeWith(sub: PushSubscription, publicKey: string, key: Uint8Array): boolean {
  if (sameBytes(sub.options?.applicationServerKey, key)) return true
  if (sub.options?.applicationServerKey) return false
  try {
    const kept = JSON.parse(window.localStorage.getItem(MADE_WITH_KEY) ?? "null") as { endpoint?: unknown; publicKey?: unknown } | null
    return kept?.endpoint === sub.endpoint && kept?.publicKey === publicKey
  } catch {
    return false
  }
}

/**
 * A DEVICE MOVING TO A NEW ADDRESS, KEPT ON THE PHONE UNTIL THE SERVER HAS IT
 * (security review of prove-slow-01, sev 2). Replacing a subscription drops
 * the old address at the push service at once; the device's row still names
 * it until a registration with `oldEndpoint` reaches the server. Kept only in
 * memory, a registration lost to no signal or a server error left the row
 * "on" at a dead address and the new address with no row. So it is kept here
 * and named again at every page open until a 2xx answer settles it.
 *
 * `to` null: the old subscription was dropped and the new one not made yet
 * (the browser refused, or the page closed). The next opens subscribe again;
 * after GIVE_UP refusals the server is told to drop the old address, so the
 * row stops claiming pings and the page offers to turn them on.
 */
const MOVE_KEY = "push-subscription-move-v1"
const GIVE_UP = 3

interface Move {
  from: string
  to: string | null
  tries: number
}

/** Storage blocked: the move lives as long as the page does. */
let moveInMemory: Move | null = null

function readMove(): Move | null {
  try {
    const raw = window.localStorage.getItem(MOVE_KEY)
    if (raw === null) return moveInMemory
    const m = JSON.parse(raw) as Partial<Move> | null
    if (typeof m?.from !== "string" || (m.to !== null && typeof m.to !== "string")) return null
    return { from: m.from, to: m.to ?? null, tries: typeof m.tries === "number" ? m.tries : 0 }
  } catch {
    return moveInMemory
  }
}

function writeMove(m: Move | null): void {
  moveInMemory = m
  try {
    if (m) window.localStorage.setItem(MOVE_KEY, JSON.stringify(m))
    else window.localStorage.removeItem(MOVE_KEY)
  } catch {
    // storage blocked: kept in memory only
  }
}

/** The address the device's row is still at, while this browser's subscription `sub` has not been registered in its place. */
export function movedFrom(sub: PushSubscription): string | null {
  const m = readMove()
  return m && m.to === sub.endpoint ? m.from : null
}

/** The server answered 2xx to a registration naming `from` as `oldEndpoint`: the row is at the new address. */
export function moveSettled(from: string | null): void {
  if (from && readMove()?.from === from) writeMove(null)
}

/** A fresh subscription with `publicKey`, the old one (if any) dropped first: a browser refuses a new key while it stands. */
async function subscribeFresh(registration: ServiceWorkerRegistration, existing: PushSubscription | null, publicKey: string): Promise<PushSubscription> {
  if (existing) {
    // A move not settled yet keeps its first address: that is where the row is.
    const pending = readMove()
    const from = pending && pending.to === existing.endpoint ? pending.from : existing.endpoint
    writeMove({ from, to: null, tries: 0 })
    await existing.unsubscribe()
  }
  const fresh = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
  rememberKey(fresh.endpoint, publicKey)
  const m = readMove()
  if (m && m.to === null) writeMove(m.from === fresh.endpoint ? null : { ...m, to: fresh.endpoint })
  return fresh
}

async function serverKey(): Promise<string | null> {
  const key = await fetch("/api/notifications/key", { cache: "no-store" })
    .then(async (res) => (res.ok ? ((await res.json()) as { publicKey?: unknown }).publicKey : null))
    .catch(() => null)
  return typeof key === "string" ? key : null
}

/**
 * This browser's subscription, made with the server's current public key.
 *
 * A SUBSCRIPTION MADE WITH AN EARLIER KEY IS REPLACED (alpha prove-slow-01).
 * When the server's key pair changes (a rotation, a reset vault), the push
 * service refuses every message signed with the new key for a subscription
 * made with the old one. Kept and registered again, it looked switched on in
 * Settings while no ping ever arrived. One whose key the browser does not
 * tell, and that was not made here with this key, is replaced too: it cannot
 * be shown to match. The caller registers it naming `movedFrom(sub)`, so the
 * device's row moves with its switches and label rather than starting again.
 */
export async function subscribe(registration: ServiceWorkerRegistration, publicKey: string): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription()
  if (existing && madeWith(existing, publicKey, keyBytes(publicKey))) return existing
  return subscribeFresh(registration, existing, publicKey)
}

type PageSubscription = { subscription: PushSubscription; oldEndpoint: string | null }
let checking: Promise<PageSubscription | null> | null = null

/**
 * THIS BROWSER'S SUBSCRIPTION AS A PAGE OPENS, A KEY CHANGE HEALED WITHOUT A
 * TAP. With notifications already allowed, a subscription made with another
 * key than the server's (or one not shown to match) is replaced at once, and
 * `oldEndpoint` is returned until the server has the move (`moveSettled`), so
 * the "refresh" registration moves the device's row to the new address with
 * its switches as they were. A browser left with no subscription by a refused
 * replacement subscribes again here (see MOVE_KEY). A key that cannot be read
 * (no signal, no keys on the server) changes nothing. Null when there is no
 * subscription; never throws.
 *
 * One check per page at a time: the layout's claim and a screen's device
 * hook both ask as the page opens, and two replacements would race.
 */
export function subscriptionForPage(registration: ServiceWorkerRegistration): Promise<PageSubscription | null> {
  checking ??= (async (): Promise<PageSubscription | null> => {
    try {
      const existing = await registration.pushManager.getSubscription()
      const pending = readMove()
      if (!existing) {
        if (!pending || pending.to !== null) {
          if (pending) writeMove(null) // the new subscription is gone too: nothing left to move to
          return null
        }
        // The old one was dropped and the new one never made: try again.
        const publicKey = await serverKey()
        if (!publicKey) return null
        try {
          const fresh = await subscribeFresh(registration, null, publicKey)
          return { subscription: fresh, oldEndpoint: movedFrom(fresh) }
        } catch {
          const tries = pending.tries + 1
          if (tries >= GIVE_UP) {
            // The row must stop claiming pings: the page then offers to turn them on.
            await forgetEndpoint(pending.from)
            writeMove(null)
          } else {
            writeMove({ ...pending, tries })
          }
          return null
        }
      }
      if (pending && pending.to === null) {
        // Subscribed, but the page closed before that was noted; or the old one was never dropped.
        writeMove(existing.endpoint === pending.from ? null : { ...pending, to: existing.endpoint })
      }
      const publicKey = await serverKey()
      if (!publicKey || madeWith(existing, publicKey, keyBytes(publicKey))) {
        return { subscription: existing, oldEndpoint: movedFrom(existing) }
      }
      const fresh = await subscribeFresh(registration, existing, publicKey)
      return { subscription: fresh, oldEndpoint: movedFrom(fresh) }
    } catch {
      // A replacement that failed: the next page open tries again (MOVE_KEY).
      const sub = await registration.pushManager.getSubscription().catch(() => null)
      return sub ? { subscription: sub, oldEndpoint: movedFrom(sub) } : null
    }
  })().finally(() => {
    checking = null
  })
  return checking
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
  await forgetEndpoint(endpoint)
}

/** Ask the server to remove the signed-in person's device at `endpoint`. Never throws; waits 3 s at most. */
async function forgetEndpoint(endpoint: string): Promise<void> {
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
 * Never throws; asks nothing of a browser that never allowed notifications
 * ("none"). "failed": not registered (no signal, a server error), tried again
 * at the next page load.
 */
export async function claimThisDevice(): Promise<"ok" | "failed" | "none"> {
  if (pushSupport() !== "ready" || permission() !== "granted") return "none"
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const here = registration ? await subscriptionForPage(registration) : null
    if (!here) return "none"
    const res = await fetch("/api/notifications/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: here.subscription.toJSON(),
        intent: "refresh",
        label: deviceLabel(navigator.userAgent, isInstalledApp()),
        // a subscription replaced for a new server key: the device's row follows it
        ...(here.oldEndpoint ? { oldEndpoint: here.oldEndpoint } : {}),
      }),
    })
    // Not registered: a move still waiting is sent again at the next open (MOVE_KEY).
    if (!res.ok) return "failed"
    moveSettled(here.oldEndpoint)
    /**
     * AND THE PREVIOUS PERSON'S TIMER ON THE SCREEN GOES TOO. Their pushes stop
     * reaching this browser, their "stopped" one included, so a running timer
     * shown before now stayed, naming what they were doing (security review,
     * 2026-11-05, low). The timer off here now: whatever it shows is not this
     * person's to see.
     */
    const answer = (await res.json().catch(() => ({}))) as { timerRunning?: unknown }
    if (answer.timerRunning === false) {
      for (const shown of (await registration?.getNotifications({ tag: "timer-running" })) ?? []) shown.close()
    }
    return "ok"
  } catch {
    // no worker or no signal: the next page load asks again
    return "failed"
  }
}
