// @vitest-environment node
/**
 * A NEW BUILD'S WORKER REPLACES THE OLD OFFLINE COPY ONLY WHEN ITS OWN IS
 * COMPLETE (alpha test p10-review-pings-06).
 *
 * A new worker installed while the pages loaded but their scripts failed. It
 * stored the pages without their scripts, and since the old store's pages
 * were all in the new one, activation threw the old, working copy away. With
 * no signal /audit was then a bare page that did nothing. Rule 3: a page is
 * stored with its scripts or not at all, and an old store goes only once the
 * new one holds every page WITH every script it names.
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

async function newBuildWorker(online: { value: boolean }, scriptsDown: { value: boolean }) {
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
    if (scriptsDown.value && url.includes("/_next/static/")) throw new TypeError("Failed to fetch")
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

describe("a new build's worker installed while only the scripts fail", () => {
  test("stores no page without its scripts and keeps the old copy, so /audit still works with no signal", async () => {
    const online = { value: true }
    const scriptsDown = { value: true }
    const w = await newBuildWorker(online, scriptsDown)
    await w.dispatch("install")
    await w.dispatch("activate")
    expect(w.store.get(NEW)?.has(ORIGIN + "/audit") ?? false, "a page was stored without its scripts").toBe(false)
    expect(w.store.has(OLD), "the old build's working copy was thrown away").toBe(true)
    online.value = false
    const opened = await w.dispatch("fetch", { request: page("/audit") })
    expect(await (opened as Response).text()).toContain("old.js")
    const script = await w.dispatch("fetch", { request: { url: ORIGIN + "/_next/static/chunks/old.js", method: "GET", mode: "no-cors", destination: "script" } })
    expect(await (script as Response).text()).toBe("old")
  })

  test("a page this build stored on a visit, whose scripts never came, neither drops the old store nor is shown first", async () => {
    const online = { value: true }
    const scriptsDown = { value: true }
    const w = await newBuildWorker(online, scriptsDown)
    await w.dispatch("install")
    await w.dispatch("activate")
    // visited with signal: the page itself is stored by the network-first fetch, its scripts failed
    await w.dispatch("fetch", { request: page("/audit") })
    expect(w.store.get(NEW)!.has(ORIGIN + "/audit")).toBe(true)
    await w.dispatch("message", { data: { type: "warm-shell" } })
    expect(w.store.has(OLD)).toBe(true)
    online.value = false
    const opened = await w.dispatch("fetch", { request: page("/audit") })
    expect(await (opened as Response).text()).toContain("old.js")
  })

  test("once the scripts load too, the new store is complete and the old one goes", async () => {
    const online = { value: true }
    const scriptsDown = { value: true }
    const w = await newBuildWorker(online, scriptsDown)
    await w.dispatch("install")
    await w.dispatch("activate")
    scriptsDown.value = false
    await w.dispatch("message", { data: { type: "warm-shell" } })
    expect([...w.store.keys()]).toEqual([NEW])
    expect(w.store.get(NEW)!.has(ORIGIN + "/_next/static/chunks/new.js")).toBe(true)
  })
})
