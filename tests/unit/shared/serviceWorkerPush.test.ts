// @vitest-environment node
/**
 * THE WORKER'S NOTIFICATION HALF — the block at the end of public/sw.js.
 *
 * Loaded with a fake `self` like tests/unit/shared/serviceWorker.test.ts, with
 * a registration that records what it was asked to show, and window clients
 * that record where they were sent. Each test is one rule from that block's
 * header.
 */

import { afterEach, describe, expect, test, vi } from "vitest"

const ORIGIN = "https://app.test"

type Listener = (event: unknown) => void

async function loadWorker() {
  const listeners: Record<string, Listener[]> = {}
  const shown: { title: string; options: Record<string, unknown> }[] = []
  const navigated: string[] = []
  const opened: string[] = []
  const windows: { url: string; focus: () => Promise<unknown>; navigate: (u: string) => Promise<unknown> }[] = []
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }))

  vi.stubGlobal("self", {
    addEventListener: (type: string, fn: Listener) => (listeners[type] ??= []).push(fn),
    skipWaiting: vi.fn(),
    location: { href: `${ORIGIN}/sw.js?v=b1`, origin: ORIGIN },
    crypto: { randomUUID: () => "11111111-2222-4333-8444-555555555555" },
    registration: {
      showNotification: async (title: string, options: Record<string, unknown>) => void shown.push({ title, options }),
      pushManager: { subscribe: vi.fn() },
    },
    clients: {
      claim: vi.fn(),
      matchAll: async () => windows,
      openWindow: async (url: string) => void opened.push(url),
    },
  })
  vi.stubGlobal("caches", { open: async () => ({ put: vi.fn(), add: vi.fn() }), keys: async () => [], delete: vi.fn(), match: vi.fn() })
  vi.stubGlobal("fetch", fetchMock)

  vi.resetModules()
  // @ts-expect-error — a classic worker script, imported for its side effects only
  await import("@/public/sw.js")

  const dispatch = async (type: string, event: Record<string, unknown>) => {
    const pending: Promise<unknown>[] = []
    for (const fn of listeners[type] ?? []) fn({ ...event, waitUntil: (p: Promise<unknown>) => pending.push(p) })
    await Promise.all(pending)
  }
  const addWindow = (url: string) => {
    const w = {
      url,
      focus: async () => w,
      navigate: async (u: string) => void navigated.push(u),
    }
    windows.push(w)
  }
  return { dispatch, shown, navigated, opened, fetchMock, addWindow }
}

const pushOf = (payload: unknown) => ({ data: { json: () => payload } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("rule 1 — every push shows a notification", () => {
  test("a notification is shown with its text, its tag and where it opens", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf({ title: "Test notification", body: "Pings will look like this.", url: "/settings", tag: "test" }))
    expect(w.shown).toHaveLength(1)
    expect(w.shown[0].title).toBe("Test notification")
    expect(w.shown[0].options).toMatchObject({ tag: "test", renotify: true, data: { url: `${ORIGIN}/settings`, kind: null, slotAt: null, sendId: null } })
  })

  test("a push with no readable payload still shows the generic notification", async () => {
    const w = await loadWorker()
    await w.dispatch("push", { data: { json: () => { throw new Error("not json") } } })
    expect(w.shown[0].title).toBe("Time & energy audit")
    expect(w.shown[0].options.tag).toBe("audit-ping")
  })
})

describe("rule 4 — a tap opens the app, only ever on this site", () => {
  test("an open window is brought forward and sent to the reminder's sheet", async () => {
    const w = await loadWorker()
    w.addWindow(`${ORIGIN}/dashboard`)
    await w.dispatch("notificationclick", { action: "", notification: { data: { url: `${ORIGIN}/settings?p=1` }, close: vi.fn() } })
    expect(w.navigated).toEqual([`${ORIGIN}/settings?p=1`])
    expect(w.opened).toEqual([])
  })

  test("with no window open, one is opened", async () => {
    const w = await loadWorker()
    await w.dispatch("notificationclick", { action: "", notification: { data: { url: `${ORIGIN}/settings` }, close: vi.fn() } })
    expect(w.opened).toEqual([`${ORIGIN}/settings`])
  })

  test("an address on another site is never opened", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf({ url: "https://evil.example/phish" }))
    expect(w.shown[0].options.data).toMatchObject({ url: `${ORIGIN}/settings` })
  })
})
