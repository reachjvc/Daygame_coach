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
 *   - The server side: a push service that refuses the key (401/403), like one
 *     that says the address is dead (404/410), removes the device, so Settings
 *     no longer names it as getting pings.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { subscribe } from "@/src/notifications/pushClient"
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
  it("counts as a dead address, which removes the device", () => {
    expect(outcomeOf(401)).toBe("gone")
    expect(outcomeOf(403)).toBe("gone")
    // a passing hiccup is still only a failure
    expect(outcomeOf(429)).toBe("failed")
    expect(outcomeOf(500)).toBe("failed")
  })
})
