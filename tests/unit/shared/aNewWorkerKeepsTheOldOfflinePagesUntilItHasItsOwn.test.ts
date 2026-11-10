// @vitest-environment node
/**
 * A NEW BUILD'S WORKER KEEPS THE OLD OFFLINE PAGES UNTIL IT HOLDS ITS OWN
 * (alpha test p9-offline-02).
 *
 * A new worker installed during a signal blip: its downloads of /audit, /time
 * and the rest failed, it activated anyway, and activation threw the previous
 * build's store away. The phone was left with no stored pages at all, and
 * /audit opened with no signal showed the browser's error page. Now an old
 * store is dropped only once the new one holds every page the old one did.
 */

import { beforeEach, describe, expect, test, vi } from "vitest"

const ORIGIN = "https://app.test"
const OLD = "app-shell-build1"
const NEW = "app-shell-build2"

type Listener = (event: unknown) => void

const keyOf = (request: { url: string } | string) => (typeof request === "string" ? new URL(request, ORIGIN).href : request.url)

function fakeCaches(store: Map<string, Map<string, Response>>) {
  const cacheFor = (name: string) => {
    if (!store.has(name)) store.set(name, new Map())
    const entries = store.get(name)!
    return {
      add: async (url: string) => {
        const res = await (globalThis.fetch as unknown as (u: string) => Promise<Response>)(url)
        if (!res.ok) throw new TypeError("add failed")
        entries.set(keyOf(url), res)
      },
      put: async (request: { url: string } | string, response: Response) => void entries.set(keyOf(request), response),
      match: async (request: { url: string } | string) => entries.get(keyOf(request))?.clone(),
      delete: async (request: { url: string } | string) => entries.delete(keyOf(request)),
    }
  }
  return {
    open: async (name: string) => cacheFor(name),
    has: async (name: string) => store.has(name),
    keys: async () => [...store.keys()],
    delete: async (name: string) => store.delete(name),
    match: async (request: { url: string } | string) => {
      for (const entries of store.values()) {
        const hit = entries.get(keyOf(request))
        if (hit) return hit.clone()
      }
      return undefined
    },
  }
}

async function newBuildWorker(online: { value: boolean }) {
  const listeners: Record<string, Listener[]> = {}
  const store = new Map<string, Map<string, Response>>()
  // the old build stored /audit with its script while the person was signed in
  store.set(
    OLD,
    new Map([
      [ORIGIN + "/audit", new Response('<html><script src="/_next/static/chunks/old.js"></script></html>')],
      [ORIGIN + "/_next/static/chunks/old.js", new Response("old")],
    ]),
  )
  const fetchMock = vi.fn(async (input: unknown) => {
    if (!online.value) throw new TypeError("Failed to fetch")
    const url = String(typeof input === "string" ? input : (input as { url: string }).url)
    if (url.includes("/audit")) return new Response('<html><script src="/_next/static/chunks/new.js"></script></html>')
    return new Response("ok")
  })
  vi.stubGlobal("self", {
    addEventListener: (type: string, fn: Listener) => (listeners[type] ??= []).push(fn),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    location: { href: `${ORIGIN}/sw.js?v=build2`, origin: ORIGIN },
  })
  vi.stubGlobal("caches", fakeCaches(store))
  vi.stubGlobal("fetch", fetchMock)
  vi.resetModules()
  // @ts-expect-error — a classic worker script, not a module; imported for its side effects only
  await import("@/public/sw.js")

  const dispatch = async (type: string, event: Record<string, unknown> = {}) => {
    const pending: Promise<unknown>[] = []
    let response: Promise<Response> | undefined
    for (const fn of listeners[type] ?? []) {
      fn({ ...event, waitUntil: (p: Promise<unknown>) => pending.push(p), respondWith: (p: Promise<Response>) => (response = p) })
    }
    await Promise.allSettled(pending)
    const settled = response === undefined ? undefined : await response.catch((e: Error) => e)
    await Promise.allSettled(pending)
    return settled
  }
  return { store, dispatch, fetchMock }
}

const page = (path: string) => ({ url: ORIGIN + path, method: "GET", mode: "navigate", destination: "document" })

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("a new build's worker installed with no signal", () => {
  test("keeps the old store, so /audit still opens with no signal", async () => {
    const online = { value: false }
    const w = await newBuildWorker(online)
    await w.dispatch("install")
    await w.dispatch("activate")
    expect(w.store.has(OLD), "the old build's offline pages were thrown away").toBe(true)
    const opened = await w.dispatch("fetch", { request: page("/audit") })
    expect(opened).toBeInstanceOf(Response)
    expect(await (opened as Response).text()).toContain("old.js")
  })

  test("drops the old store once the new one holds /audit (the page's next warm-shell)", async () => {
    const online = { value: false }
    const w = await newBuildWorker(online)
    await w.dispatch("install")
    await w.dispatch("activate")
    online.value = true
    await w.dispatch("message", { data: { type: "warm-shell" } })
    expect(w.store.has(NEW)).toBe(true)
    expect([...w.store.keys()]).toEqual([NEW])
  })

  test("with signal it replaces the old store at once, as before", async () => {
    const w = await newBuildWorker({ value: true })
    await w.dispatch("install")
    await w.dispatch("activate")
    expect([...w.store.keys()]).toEqual([NEW])
  })

  test("reaching the login page empties the old store too (rule 4)", async () => {
    const online = { value: false }
    const w = await newBuildWorker(online)
    await w.dispatch("install")
    await w.dispatch("activate")
    expect(w.store.has(OLD)).toBe(true)
    // signed out elsewhere: the visit to the login page empties every store
    await w.dispatch("fetch", { request: page("/auth/login") })
    expect([...w.store.keys()].filter((k) => k.startsWith("app-shell-"))).toEqual([])
  })

  test("a stored page the server now sends to the login page goes from the old store too (rule 4)", async () => {
    const online = { value: false }
    const w = await newBuildWorker(online)
    await w.dispatch("install")
    await w.dispatch("activate")
    online.value = true
    const signedOut = { ok: false, type: "opaqueredirect", status: 0, redirected: false, clone: () => signedOut }
    w.fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(typeof input === "string" ? input : (input as { url: string }).url)
      return (url.includes("/audit") ? signedOut : new Response("ok")) as Response
    })
    await w.dispatch("message", { data: { type: "warm-shell" } })
    for (const entries of w.store.values()) expect(entries.has(ORIGIN + "/audit"), "his /audit outlived the session").toBe(false)
  })

  test("with both stores holding a page, the newest build's copy is the one shown (review of be70cb5b)", async () => {
    const online = { value: false }
    const w = await newBuildWorker(online)
    // the old build also held /time, which the new store still lacks, so the old store stays
    w.store.get(OLD)!.set(ORIGIN + "/time", new Response("old time"))
    await w.dispatch("install")
    await w.dispatch("activate")
    w.store.get(NEW)!.set(ORIGIN + "/audit", new Response('<html><script src="/_next/static/chunks/new.js"></script></html>'))
    // with its script: a page alone does not count as held (alpha test p10-review-pings-06)
    w.store.get(NEW)!.set(ORIGIN + "/_next/static/chunks/new.js", new Response("new"))
    expect(w.store.has(OLD)).toBe(true)
    const opened = await w.dispatch("fetch", { request: page("/audit") })
    expect(await (opened as Response).text()).toContain("new.js")
    // a page only the old store holds still opens
    expect(await ((await w.dispatch("fetch", { request: page("/time") })) as Response).text()).toBe("old time")
  })
})
