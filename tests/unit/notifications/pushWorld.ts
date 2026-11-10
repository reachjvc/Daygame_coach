/**
 * ONE BROWSER, ITS TABS, AND THE SERVER'S DEVICE ROWS, for the tests of a
 * device moving to a new push address (alpha p9-pings).
 *
 * The browser behaves as Chrome does: `unsubscribe()` drops the registration's
 * current subscription whichever object it is called on, and a page may hold
 * an object for an address already dropped. The page's posts go to the real
 * devices route; its rows live in `world.rows`, and `ping()` answers for each
 * switched-on row as a push service would: 410 for a dropped address, 403 for
 * one made with an earlier server key.
 *
 * The state is kept on `globalThis` so a second tab (the client module
 * imported again after `vi.resetModules`) shares it.
 *
 * A test file mocks the repo and the session with what this exports:
 *   vi.mock("@/src/db/notificationsRepo", async () => (await import("./pushWorld")).fakeRepo)
 *   vi.mock("@/src/db/auth", async () => (await import("./pushWorld")).fakeAuth)
 */

import { vi } from "vitest"

const keyOf = (fill: number) => Buffer.from(new Uint8Array(65).fill(fill)).toString("base64url")
export const NEW_KEY = keyOf(4)
export const OLD_KEY = keyOf(7)
export const OLD = "https://fcm.googleapis.com/fcm/send/old"

export interface Row {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  enabled: boolean
  timerRunning: boolean
  failures: number
  /** The key the browser's subscription at this address was made with. */
  madeWith: string
  /** The push service said the address is gone: the switches it had then (recordDeviceOutcome "gone"). */
  gone?: { enabled: boolean; timerRunning: boolean } | null
}

type Sub = {
  endpoint: string
  options: { applicationServerKey: ArrayBuffer | null }
  unsubscribe: () => Promise<boolean>
  toJSON: () => { endpoint: string; keys: { p256dh: string; auth: string } }
}

interface World {
  rows: Map<string, Row>
  user: string
  current: Sub | null
  /** The key each address was made with; an address not here was dropped. */
  live: Map<string, string>
  made: number
  serverKey: string
  /** What the devices route answers instead of running: a status, or "abort" (no signal). */
  devicesFail: number | "abort" | null
  nextId: number
}

const g = globalThis as typeof globalThis & { __pushWorld?: World }
export const world: World = (g.__pushWorld ??= {
  rows: new Map(),
  user: "me",
  current: null,
  live: new Map(),
  made: 0,
  serverKey: NEW_KEY,
  devicesFail: null,
  nextId: 1,
})

const byEndpoint = (endpoint: string) => [...world.rows.values()].find((r) => r.endpoint === endpoint) ?? null

export const fakeRepo = {
  deviceByEndpoint: async (endpoint: string) => {
    const r = byEndpoint(endpoint)
    return r ? { id: r.id, userId: r.userId, enabled: r.gone?.enabled ?? r.enabled, timerRunning: r.gone?.timerRunning ?? r.timerRunning, p256dh: r.p256dh, auth: r.auth, failures: r.failures } : null
  },
  registerDevice: async (userId: string, d: { endpoint: string; p256dh: string; auth: string }, enabled = true, timerRunning?: boolean) => {
    const r = byEndpoint(d.endpoint)
    const id = r?.id ?? `d${world.nextId++}`
    world.rows.set(id, {
      id,
      userId,
      endpoint: d.endpoint,
      p256dh: d.p256dh,
      auth: d.auth,
      enabled,
      timerRunning: timerRunning ?? r?.timerRunning ?? false,
      failures: 0,
      madeWith: world.live.get(d.endpoint) ?? "",
      gone: null,
    })
    return id
  },
  // `restore`: as the repo, switches turned off by twenty failures come back in the move's own write
  moveDevice: async (userId: string, from: string, next: { endpoint: string; p256dh: string; auth: string }, restore?: { enabled: boolean; timerRunning: boolean }) => {
    const r = byEndpoint(from)
    if (!r || r.userId !== userId) return false
    const failures = r.failures
    Object.assign(r, { endpoint: next.endpoint, p256dh: next.p256dh, auth: next.auth, failures: 0, madeWith: world.live.get(next.endpoint) ?? "" })
    if (r.gone) Object.assign(r, { ...r.gone, gone: null })
    if (restore && failures >= 20 && !r.enabled && !r.timerRunning) Object.assign(r, restore)
    return true
  },
  listDevices: async (userId: string) =>
    [...world.rows.values()]
      .filter((r) => r.userId === userId && !r.gone)
      .map((r) => ({ id: r.id, label: "phone", enabled: r.enabled, timerRunning: r.timerRunning, lastSuccessAt: null, createdAt: "2026-11-10T00:00:00.000Z" })),
  removeDevice: async (userId: string, by: { endpoint: string } | { id: string }) => {
    const r = "id" in by ? world.rows.get(by.id) : byEndpoint(by.endpoint)
    if (r && r.userId === userId) world.rows.delete(r.id)
  },
}

export const fakeAuth = { requireAuth: async () => ({ success: true, userId: world.user, supabase: {} }) }

/** One ping round, as the push services answer it. A dropped address marks its row gone, switches off, as the repo does. */
export function ping(): { delivered: number; removed: number } {
  let delivered = 0
  let removed = 0
  for (const r of [...world.rows.values()].filter((r) => r.enabled && !r.gone)) {
    const key = world.live.get(r.endpoint)
    if (key === undefined) {
      Object.assign(r, { gone: { enabled: r.enabled, timerRunning: r.timerRunning }, enabled: false, timerRunning: false })
      removed++
    } else if (key !== world.serverKey) {
      r.failures++
      if (r.failures >= 20) Object.assign(r, { enabled: false, timerRunning: false })
    } else {
      delivered++
    }
  }
  return { delivered, removed }
}

const bytes = (base64url: string) => new Uint8Array(Buffer.from(base64url, "base64url")).buffer

function sub(endpoint: string, key: string): Sub {
  return {
    endpoint,
    options: { applicationServerKey: bytes(key) },
    unsubscribe: async () => {
      // Chrome drops the registration's subscription, whichever object asks
      if (world.current) world.live.delete(world.current.endpoint)
      world.current = null
      return true
    },
    toJSON: () => ({ endpoint, keys: { p256dh: `p-${endpoint.split("/").pop()}`, auth: "a" } }),
  }
}

/** A tiny one-at-a-time lock with the shape of `navigator.locks`. */
function aLockManager() {
  const tails = new Map<string, Promise<unknown>>()
  return {
    request: <T>(name: string, work: () => Promise<T>): Promise<T> => {
      const before = tails.get(name) ?? Promise.resolve()
      const run = before.then(work, work)
      tails.set(name, run.catch(() => undefined))
      return run
    },
  }
}

/**
 * A browser subscribed at OLD with `key`, the person's row there with these
 * switches, notifications allowed. `locks`: the browser has the Web Locks API.
 */
export function aWorld({
  key = OLD_KEY,
  row = { enabled: true, timerRunning: true } as { enabled: boolean; timerRunning: boolean } | null,
  locks = true,
  post,
  forget,
}: {
  key?: string
  row?: { enabled: boolean; timerRunning: boolean } | null
  locks?: boolean
  post: (req: Request) => Promise<Response>
  forget?: (req: Request) => Promise<Response>
}) {
  Object.assign(world, { rows: new Map(), user: "me", live: new Map([[OLD, key]]), made: 0, serverKey: NEW_KEY, devicesFail: null, nextId: 1 })
  world.current = sub(OLD, key)
  if (row) world.rows.set("d0", { id: "d0", userId: "me", endpoint: OLD, p256dh: "p-old", auth: "a", failures: 0, madeWith: key, ...row })
  vi.stubEnv("NODE_ENV", "production")
  vi.stubGlobal("Notification", { permission: "granted" })
  vi.stubGlobal("PushManager", function PushManager() {})
  const registration = {
    pushManager: {
      getSubscription: async () => world.current,
      subscribe: async (options: { applicationServerKey: Uint8Array }) => {
        const k = Buffer.from(options.applicationServerKey).toString("base64url")
        if (world.current) {
          if (world.live.get(world.current.endpoint) === k) return world.current
          throw new DOMException("a subscription with another key exists", "InvalidStateError")
        }
        world.made++
        const endpoint = `https://fcm.googleapis.com/fcm/send/new-${world.made}`
        world.live.set(endpoint, k)
        world.current = sub(endpoint, k)
        return world.current
      },
    },
    getNotifications: async () => [],
  }
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: async () => registration, register: async () => registration, ready: Promise.resolve(registration) },
  })
  Object.defineProperty(navigator, "locks", { configurable: true, value: locks ? aLockManager() : undefined })
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    // let the other tab run in between, as a network would
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (url === "/api/notifications/key") return Response.json({ publicKey: world.serverKey })
    if (url === "/api/notifications/devices" && init?.method === "POST") {
      if (world.devicesFail === "abort") throw new TypeError("Failed to fetch")
      if (world.devicesFail !== null) return Response.json({ error: "no" }, { status: world.devicesFail })
      return post(new Request("http://x/api/notifications/devices", { method: "POST", body: init.body, headers: { "Content-Type": "application/json" } }))
    }
    if (url === "/api/notifications/devices/forget" && forget) {
      return forget(new Request("http://x/api/notifications/devices/forget", { method: "POST", body: init?.body, headers: { "Content-Type": "application/json" } }))
    }
    return Response.json({ ok: true })
  })
  vi.stubGlobal("fetch", fetch)
  return {
    fetch,
    /** What each registration asked to move from. */
    posted: () =>
      (fetch.mock.calls as unknown as [string, RequestInit | undefined][])
        .filter(([url, init]) => url === "/api/notifications/devices" && init?.method === "POST")
        .map(([, init]) => JSON.parse(String(init?.body)) as { subscription: { endpoint: string }; oldEndpoint?: string }),
  }
}

/** The rows of the signed-in person that are not gone, as the test reads them. */
export const rowsOf = (userId: string) => [...world.rows.values()].filter((r) => r.userId === userId && !r.gone)

export function leaveTheWorld() {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined })
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined })
}
