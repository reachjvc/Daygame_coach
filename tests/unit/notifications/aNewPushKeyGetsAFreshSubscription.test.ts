// @vitest-environment jsdom
/**
 * AFTER THE SERVER'S PUSH KEY CHANGES, PINGS STILL ARRIVE (alpha prove-slow-01).
 *
 * The test vault was reset, so the server signed with a new key pair. "Turn on
 * pings for this device" kept the browser's old subscription, made with the
 * old public key, and registered it again: every ping to that phone was then
 * refused by the push service, while Settings listed it as getting pings.
 *
 *   - The browser side: a subscription made with another key (or one whose key
 *     the browser does not tell) is unsubscribed and made fresh, and the old
 *     address is forgotten on the server so it is not listed twice.
 *   - Without a tap: every page that opens with notifications allowed checks
 *     the key the same way and, when it differs, subscribes fresh and moves
 *     the device's row to the new address (`oldEndpoint`), keeping its
 *     switches. A key change heals itself on the next open.
 *   - The server side: a push service that refuses the key (401/403) is only
 *     a failure, never a removal. Were the server's own key pair wrong, one
 *     ping round would otherwise delete every device.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { claimThisDevice, subscribe } from "@/src/notifications/pushClient"
import { outcomeOf } from "@/src/notifications/pushService"

// Two public keys of a real key's shape (65 bytes, base64url); only their bytes matter here.
const keyOf = (fill: number) => Buffer.from(new Uint8Array(65).fill(fill)).toString("base64url")
const NEW_KEY = keyOf(4)
const OLD_KEY = keyOf(7)

function bytes(base64url: string): ArrayBuffer {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out.buffer
}

function aBrowserSubscribedWith(key: string | null) {
  const unsubscribed: string[] = []
  const existing = {
    endpoint: "https://fcm.googleapis.com/fcm/send/old",
    options: { applicationServerKey: key === null ? null : bytes(key), userVisibleOnly: true },
    unsubscribe: async () => {
      unsubscribed.push("old")
      return true
    },
  }
  const fresh = { endpoint: "https://fcm.googleapis.com/fcm/send/new", options: { applicationServerKey: bytes(NEW_KEY) } }
  const made: { applicationServerKey: Uint8Array }[] = []
  const registration = {
    pushManager: {
      getSubscription: async () => existing,
      subscribe: async (options: { applicationServerKey: Uint8Array }) => {
        made.push(options)
        return fresh
      },
    },
  } as unknown as ServiceWorkerRegistration
  const fetch = vi.fn(async () => Response.json({ ok: true }))
  vi.stubGlobal("fetch", fetch)
  return { registration, existing, fresh, unsubscribed, made, fetch }
}

const forgotten = (fetch: ReturnType<typeof aBrowserSubscribedWith>["fetch"]) =>
  (fetch.mock.calls as unknown as [string, RequestInit][])
    .filter(([url]) => url === "/api/notifications/devices/forget")
    .map(([, init]) => (JSON.parse(String(init.body)) as { endpoint: string }).endpoint)

afterEach(() => vi.unstubAllGlobals())

describe("turning pings on in a browser that already has a subscription", () => {
  it("keeps the subscription made with the server's current key", async () => {
    const b = aBrowserSubscribedWith(NEW_KEY)
    expect(await subscribe(b.registration, NEW_KEY)).toBe(b.existing)
    expect(b.unsubscribed).toEqual([])
    expect(b.made).toEqual([])
    expect(forgotten(b.fetch)).toEqual([])
  })

  it("replaces one made with an earlier key, and forgets the old address on the server", async () => {
    const b = aBrowserSubscribedWith(OLD_KEY)
    expect(await subscribe(b.registration, NEW_KEY)).toBe(b.fresh)
    expect(b.unsubscribed).toEqual(["old"])
    expect(b.made).toHaveLength(1)
    expect(Array.from(b.made[0].applicationServerKey)).toEqual(Array.from(new Uint8Array(bytes(NEW_KEY))))
    expect(forgotten(b.fetch)).toEqual(["https://fcm.googleapis.com/fcm/send/old"])
  })

  it("replaces one whose key the browser does not tell", async () => {
    const b = aBrowserSubscribedWith(null)
    expect(await subscribe(b.registration, NEW_KEY)).toBe(b.fresh)
    expect(b.unsubscribed).toEqual(["old"])
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

describe("a page opening with notifications allowed", () => {
  function aSignedInBrowser(subscribedWith: string | null, server: { publicKey?: string; down?: boolean } = { publicKey: NEW_KEY }) {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubGlobal("Notification", { permission: "granted" })
    vi.stubGlobal("PushManager", function PushManager() {})
    const unsubscribed: string[] = []
    const made: unknown[] = []
    const old = {
      endpoint: "https://fcm.googleapis.com/fcm/send/old",
      options: { applicationServerKey: subscribedWith === null ? null : bytes(subscribedWith) },
      unsubscribe: async () => (unsubscribed.push("old"), true),
      toJSON: () => ({ endpoint: "https://fcm.googleapis.com/fcm/send/old", keys: { p256dh: "BOld", auth: "aOld" } }),
    }
    const fresh = {
      endpoint: "https://fcm.googleapis.com/fcm/send/new",
      options: { applicationServerKey: bytes(NEW_KEY) },
      unsubscribe: async () => true,
      toJSON: () => ({ endpoint: "https://fcm.googleapis.com/fcm/send/new", keys: { p256dh: "BNew", auth: "aNew" } }),
    }
    let current: typeof old | typeof fresh = old
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: async () => ({
          pushManager: {
            getSubscription: async () => current,
            subscribe: async (options: unknown) => {
              made.push(options)
              current = fresh
              return fresh
            },
          },
          getNotifications: async () => [],
        }),
      },
    })
    const fetch = vi.fn(async (url: string) => {
      if (url === "/api/notifications/key") {
        if (server.down) throw new TypeError("Failed to fetch")
        return Response.json(server.publicKey ? { publicKey: server.publicKey } : { error: "not set up" }, { status: server.publicKey ? 200 : 503 })
      }
      return Response.json({ id: "d1", enabled: true, timerRunning: false })
    })
    vi.stubGlobal("fetch", fetch)
    const posted = () =>
      (fetch.mock.calls as unknown as [string, RequestInit | undefined][])
        .filter(([url, init]) => url === "/api/notifications/devices" && init?.method === "POST")
        .map(([, init]) => JSON.parse(String(init?.body)) as { intent: string; subscription: { endpoint: string }; oldEndpoint?: string })
    return { unsubscribed, made, posted, fetch }
  }

  beforeEach(() => window.localStorage.clear())
  afterEach(() => {
    vi.unstubAllEnvs()
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined })
  })

  it("subscribes fresh when the key changed, and moves the device to the new address", async () => {
    const b = aSignedInBrowser(OLD_KEY)
    await claimThisDevice()
    expect(b.unsubscribed).toEqual(["old"])
    expect(b.made).toHaveLength(1)
    expect(b.posted()).toEqual([
      expect.objectContaining({ intent: "refresh", subscription: expect.objectContaining({ endpoint: "https://fcm.googleapis.com/fcm/send/new" }), oldEndpoint: "https://fcm.googleapis.com/fcm/send/old" }),
    ])
    // a move keeps the row and its switches: nothing is forgotten
    expect(b.fetch.mock.calls.some(([url]) => url === "/api/notifications/devices/forget")).toBe(false)
  })

  it("leaves a subscription made with the current key alone", async () => {
    const b = aSignedInBrowser(NEW_KEY)
    await claimThisDevice()
    expect(b.unsubscribed).toEqual([])
    expect(b.made).toEqual([])
    expect(b.posted()).toEqual([expect.objectContaining({ intent: "refresh", subscription: expect.objectContaining({ endpoint: "https://fcm.googleapis.com/fcm/send/old" }) })])
    expect(b.posted()[0].oldEndpoint).toBeUndefined()
  })

  it("replaces one whose key the browser does not tell once, then trusts the one it made", async () => {
    const b = aSignedInBrowser(null)
    await claimThisDevice()
    expect(b.made).toHaveLength(1)
    // the next open: the browser still does not tell the key, but this one was made here with it
    await claimThisDevice()
    expect(b.made).toHaveLength(1)
  })

  it("changes nothing when the server's key cannot be read (no signal, or no keys)", async () => {
    for (const server of [{ down: true }, {}]) {
      const b = aSignedInBrowser(OLD_KEY, server)
      await claimThisDevice()
      expect(b.unsubscribed).toEqual([])
      expect(b.made).toEqual([])
      vi.unstubAllGlobals()
    }
  })
})
