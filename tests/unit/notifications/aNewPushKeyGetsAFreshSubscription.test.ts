// @vitest-environment jsdom
/**
 * AFTER THE SERVER'S PUSH KEY CHANGES, PINGS STILL ARRIVE (alpha prove-slow-01).
 *
 * The test vault was reset, so the server signed with a new key pair. "Turn on
 * pings for this device" kept the browser's old subscription, made with the
 * old public key, and registered it again: every ping to that phone was then
 * refused by the push service, while Settings listed it as getting pings.
 *
 *   - A subscription made with another key (or one whose key the browser does
 *     not tell, and that was not made here) is replaced, by "Turn on" and,
 *     without a tap, by every page that opens with notifications allowed.
 *   - The device's row follows the browser to its new address (`oldEndpoint`),
 *     keeping its switches and label. The move is kept on the phone until the
 *     server has answered 2xx, so a registration lost to no signal or a server
 *     error is sent again at the next open (security review, sev 2).
 *   - A browser left with no subscription (the new one refused after the old
 *     was dropped) subscribes again at the next opens; after three refusals
 *     the server is told to drop the old address, so Settings stops naming
 *     the device and the page offers to turn pings on.
 *   - The server: a push service that refuses the key (401/403) is only a
 *     failure, never a removal. Were the server's own key pair wrong, one ping
 *     round would otherwise delete every device.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { claimThisDevice, movedFrom, subscribe } from "@/src/notifications/pushClient"
import { outcomeOf } from "@/src/notifications/pushService"

// Two public keys of a real key's shape (65 bytes, base64url); only their bytes matter here.
const keyOf = (fill: number) => Buffer.from(new Uint8Array(65).fill(fill)).toString("base64url")
const NEW_KEY = keyOf(4)
const OLD_KEY = keyOf(7)
const OLD = "https://fcm.googleapis.com/fcm/send/old"

function bytes(base64url: string): ArrayBuffer {
  return new Uint8Array(Buffer.from(base64url, "base64url")).buffer
}

type Sub = {
  endpoint: string
  options: { applicationServerKey: ArrayBuffer | null }
  unsubscribe: () => Promise<boolean>
  toJSON: () => { endpoint: string; keys: { p256dh: string; auth: string } }
}

/**
 * A browser with notifications allowed, subscribed with `key` (null: one that
 * does not tell its key), and a server answering as `server` says. Its state
 * lives on across `claimThisDevice` calls, which are page loads.
 */
function aBrowser(key: string | null) {
  vi.stubEnv("NODE_ENV", "production")
  vi.stubGlobal("Notification", { permission: "granted" })
  vi.stubGlobal("PushManager", function PushManager() {})
  const browser = {
    current: null as Sub | null,
    made: 0,
    unsubscribed: [] as string[],
    /** How many of the next subscribe calls the browser refuses. */
    refuseSubscribe: 0,
    server: { publicKey: NEW_KEY as string | null, down: false, registerStatus: 200 },
  }
  const sub = (endpoint: string, k: string | null): Sub => ({
    endpoint,
    options: { applicationServerKey: k === null ? null : bytes(k) },
    unsubscribe: async () => {
      browser.unsubscribed.push(endpoint)
      browser.current = null
      return true
    },
    toJSON: () => ({ endpoint, keys: { p256dh: `p-${endpoint.slice(-4)}`, auth: "a" } }),
  })
  browser.current = sub(OLD, key)
  const registration = {
    pushManager: {
      getSubscription: async () => browser.current,
      subscribe: async (options: { applicationServerKey: Uint8Array }) => {
        if (browser.refuseSubscribe > 0) {
          browser.refuseSubscribe--
          throw new DOMException("push service unavailable", "AbortError")
        }
        browser.made++
        expect(Buffer.from(options.applicationServerKey).toString("base64url")).toBe(NEW_KEY)
        browser.current = sub(`https://fcm.googleapis.com/fcm/send/new-${browser.made}`, NEW_KEY)
        return browser.current
      },
    },
    getNotifications: async () => [],
  }
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: async () => registration } })
  const fetch = vi.fn(async (url: string) => {
    if (browser.server.down) throw new TypeError("Failed to fetch")
    if (url === "/api/notifications/key") {
      const k = browser.server.publicKey
      return Response.json(k ? { publicKey: k } : { error: "not set up" }, { status: k ? 200 : 503 })
    }
    if (url === "/api/notifications/devices") return Response.json({ id: "d1", enabled: true, timerRunning: false }, { status: browser.server.registerStatus })
    return Response.json({ ok: true })
  })
  vi.stubGlobal("fetch", fetch)
  const bodies = (path: string) =>
    (fetch.mock.calls as unknown as [string, RequestInit | undefined][])
      .filter(([url, init]) => url === path && init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init?.body)) as { intent: string; subscription: { endpoint: string }; oldEndpoint?: string; endpoint?: string })
  return {
    browser,
    registration: registration as unknown as ServiceWorkerRegistration,
    /** What each page load registered, and which address it asked the row to come from. */
    registered: () => bodies("/api/notifications/devices").map((b) => ({ endpoint: b.subscription.endpoint, oldEndpoint: b.oldEndpoint ?? null })),
    forgotten: () => bodies("/api/notifications/devices/forget").map((b) => b.endpoint),
    reset: () => fetch.mockClear(),
  }
}

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined })
})

describe("turning pings on in a browser that already has a subscription", () => {
  it("keeps the subscription made with the server's current key", async () => {
    const b = aBrowser(NEW_KEY)
    expect((await subscribe(b.registration, NEW_KEY)).endpoint).toBe(OLD)
    expect(b.browser.unsubscribed).toEqual([])
    expect(b.browser.made).toBe(0)
  })

  it("replaces one made with an earlier key, and names the old address so the device moves (switches and label kept)", async () => {
    const b = aBrowser(OLD_KEY)
    const fresh = await subscribe(b.registration, NEW_KEY)
    expect(b.browser.unsubscribed).toEqual([OLD])
    expect(fresh.endpoint).toBe("https://fcm.googleapis.com/fcm/send/new-1")
    expect(movedFrom(fresh)).toBe(OLD)
    // moved, not forgotten: the forget would drop the row and its switches
    expect(b.forgotten()).toEqual([])
  })

  it("replaces one whose key the browser does not tell", async () => {
    const b = aBrowser(null)
    await subscribe(b.registration, NEW_KEY)
    expect(b.browser.unsubscribed).toEqual([OLD])
  })
})

describe("a page opening with notifications allowed", () => {
  it("subscribes fresh when the key changed, moves the device, and is done once the server said yes", async () => {
    const b = aBrowser(OLD_KEY)
    expect(await claimThisDevice()).toBe("ok")
    expect(b.browser.unsubscribed).toEqual([OLD])
    expect(b.registered()).toEqual([{ endpoint: "https://fcm.googleapis.com/fcm/send/new-1", oldEndpoint: OLD }])
    expect(b.forgotten()).toEqual([])
    b.reset()
    await claimThisDevice()
    expect(b.registered()).toEqual([{ endpoint: "https://fcm.googleapis.com/fcm/send/new-1", oldEndpoint: null }])
  })

  it("sends the move again at each open until the server answers 2xx (no signal, then a server error)", async () => {
    const b = aBrowser(OLD_KEY)
    // the key is read, the browser subscribes, then the signal drops
    const fetchKey = vi.mocked(fetch)
    fetchKey.mockImplementationOnce(async () => Response.json({ publicKey: NEW_KEY })).mockImplementationOnce(async () => {
      throw new TypeError("Failed to fetch")
    })
    expect(await claimThisDevice()).toBe("failed")
    b.reset()
    b.browser.server.registerStatus = 500
    expect(await claimThisDevice()).toBe("failed")
    expect(b.registered()).toEqual([{ endpoint: "https://fcm.googleapis.com/fcm/send/new-1", oldEndpoint: OLD }])
    b.reset()
    b.browser.server.registerStatus = 200
    expect(await claimThisDevice()).toBe("ok")
    expect(b.registered()).toEqual([{ endpoint: "https://fcm.googleapis.com/fcm/send/new-1", oldEndpoint: OLD }])
    b.reset()
    await claimThisDevice()
    expect(b.registered()[0].oldEndpoint).toBeNull()
    expect(b.browser.made).toBe(1)
  })

  it("subscribes again at the next open when the browser refused the new subscription, and the device still moves", async () => {
    const b = aBrowser(OLD_KEY)
    b.browser.refuseSubscribe = 1
    await claimThisDevice()
    expect(b.browser.current).toBeNull()
    b.reset()
    expect(await claimThisDevice()).toBe("ok")
    expect(b.registered()).toEqual([{ endpoint: "https://fcm.googleapis.com/fcm/send/new-1", oldEndpoint: OLD }])
  })

  it("after three refused tries, tells the server the old address gets nothing, so the device stops being listed", async () => {
    const b = aBrowser(OLD_KEY)
    b.browser.refuseSubscribe = 99
    await claimThisDevice() // the replacement: refused
    await claimThisDevice() // retry 1
    expect(b.forgotten()).toEqual([])
    await claimThisDevice() // retry 2
    await claimThisDevice() // retry 3: given up
    expect(b.forgotten()).toEqual([OLD])
    b.reset()
    await claimThisDevice()
    expect(b.forgotten()).toEqual([])
    expect(b.registered()).toEqual([])
  })

  it("leaves a subscription made with the current key alone", async () => {
    const b = aBrowser(NEW_KEY)
    expect(await claimThisDevice()).toBe("ok")
    expect(b.browser.unsubscribed).toEqual([])
    expect(b.registered()).toEqual([{ endpoint: OLD, oldEndpoint: null }])
  })

  it("replaces one whose key the browser does not tell once, then trusts the one it made", async () => {
    const b = aBrowser(null)
    await claimThisDevice()
    expect(b.browser.made).toBe(1)
    await claimThisDevice()
    expect(b.browser.made).toBe(1)
  })

  it("changes nothing when the server's key cannot be read (no signal, or no keys)", async () => {
    const offline = aBrowser(OLD_KEY)
    offline.browser.server.down = true
    expect(await claimThisDevice()).toBe("failed")
    expect(offline.browser.unsubscribed).toEqual([])
    vi.unstubAllGlobals()
    const noKeys = aBrowser(OLD_KEY)
    noKeys.browser.server.publicKey = null
    await claimThisDevice()
    expect(noKeys.browser.unsubscribed).toEqual([])
  })
})

describe("a push service refusing the server's key", () => {
  it("is a failure, never a removal: only a dead address (404/410) removes the device", () => {
    expect(outcomeOf(401)).toBe("failed")
    expect(outcomeOf(403)).toBe("failed")
    expect(outcomeOf(404)).toBe("gone")
    expect(outcomeOf(410)).toBe("gone")
  })
})
