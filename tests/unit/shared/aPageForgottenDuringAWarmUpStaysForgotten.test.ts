// @vitest-environment node
/**
 * A PAGE FORGOTTEN WHILE A WARM-UP FETCHES ITS SCRIPTS STAYS FORGOTTEN (alpha
 * run p12, programs-live-format "a workout that is over is not kept").
 *
 * A warm-up stores a page only once every script it names is stored (rule 3),
 * which can take seconds. The live workout was thrown away on another phone in
 * that time, the next visit was sent elsewhere and the stored copy was dropped;
 * then the warm-up finished and stored the page it had fetched before, with
 * the workout still open on it. With no signal the finished workout came back.
 */

import { describe, expect, test, vi } from "vitest"

const ORIGIN = "https://app.test"
const LIVE = "/training/live"

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

describe("a warm-up racing a forget", () => {
  test("a workout thrown away while the warm-up fetched its scripts is not stored afterwards", async () => {
    const listeners: Record<string, Listener[]> = {}
    const store = new Map<string, Map<string, Response>>()
    let workoutOpen = true
    let releaseScript: () => void = () => {}
    const scriptHeld = new Promise<void>((resolve) => (releaseScript = resolve))
    vi.stubGlobal("self", {
      addEventListener: (type: string, fn: Listener) => (listeners[type] ??= []).push(fn),
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() },
      location: { href: `${ORIGIN}/sw.js?v=build1`, origin: ORIGIN },
    })
    vi.stubGlobal("caches", fakeCaches(store))
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = String(typeof input === "string" ? input : (input as { url: string }).url)
        if (url.includes("/_next/static/")) {
          await scriptHeld
          return new Response("js")
        }
        if (url.includes(LIVE)) {
          if (!workoutOpen) return { type: "opaqueredirect", status: 0, ok: false, redirected: false } as unknown as Response
          return new Response('<html>Bench Press<script src="/_next/static/chunks/live.js"></script></html>')
        }
        return new Response("ok")
      }),
    )
    vi.resetModules()
    // @ts-expect-error — a classic worker script, not a module; imported for its side effects only
    await import("@/public/sw.js")

    const fire = (type: string, event: Record<string, unknown> = {}) => {
      const pending: Promise<unknown>[] = []
      let response: Promise<Response> | undefined
      for (const fn of listeners[type] ?? []) {
        fn({ ...event, waitUntil: (p: Promise<unknown>) => pending.push(p), respondWith: (p: Promise<Response>) => (response = p) })
      }
      return { done: async () => { await response?.catch(() => undefined); await Promise.allSettled(pending) } }
    }

    // A warm-up starts with the workout open; its script is slow to come.
    const warm = fire("message", { data: { type: "warm-shell" } })
    await new Promise((r) => setTimeout(r, 10))

    // Thrown away elsewhere; the next visit is sent elsewhere and the copy goes.
    workoutOpen = false
    await fire("fetch", { request: { url: ORIGIN + LIVE, method: "GET", mode: "navigate", destination: "document" } }).done()

    // The script arrives and the warm-up finishes.
    releaseScript()
    await warm.done()

    const held = [...store.values()].some((entries) => entries.has(ORIGIN + LIVE))
    expect(held, "the finished workout's page was stored again by the warm-up").toBe(false)
  })
})
