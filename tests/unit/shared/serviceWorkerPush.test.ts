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
  test("a reminder is shown with its text, its tag and where it opens", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf({ title: "What's on your mind?", body: "Tap to log.", url: "/thoughts?log=1&prompt=p1", tag: "thought-prompt", promptId: "p1" }))
    expect(w.shown).toHaveLength(1)
    expect(w.shown[0].title).toBe("What's on your mind?")
    expect(w.shown[0].options).toMatchObject({ tag: "thought-prompt", renotify: true, data: { url: `${ORIGIN}/thoughts?log=1&prompt=p1`, promptId: "p1" } })
  })

  test("a push with no readable payload still shows the generic reminder", async () => {
    const w = await loadWorker()
    await w.dispatch("push", { data: { json: () => { throw new Error("not json") } } })
    expect(w.shown[0].title).toBe("What's on your mind?")
    expect(w.shown[0].options.tag).toBe("thought-prompt")
  })
})

describe("rule 4 — a tap opens the app, only ever on this site", () => {
  test("an open window is brought forward and sent to the reminder's sheet", async () => {
    const w = await loadWorker()
    w.addWindow(`${ORIGIN}/dashboard`)
    await w.dispatch("notificationclick", { action: "", notification: { data: { url: `${ORIGIN}/thoughts?log=1&prompt=p1` }, close: vi.fn() } })
    expect(w.navigated).toEqual([`${ORIGIN}/thoughts?log=1&prompt=p1`])
    expect(w.opened).toEqual([])
  })

  test("with no window open, one is opened", async () => {
    const w = await loadWorker()
    await w.dispatch("notificationclick", { action: "", notification: { data: { url: `${ORIGIN}/thoughts?log=1` }, close: vi.fn() } })
    expect(w.opened).toEqual([`${ORIGIN}/thoughts?log=1`])
  })

  test("an address on another site is never opened", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf({ url: "https://evil.example/phish" }))
    expect(w.shown[0].options.data).toMatchObject({ url: `${ORIGIN}/thoughts?log=1` })
  })
})

describe("a thought button on the notification", () => {
  test("logs that thought from the worker, answering the reminder, and confirms", async () => {
    const w = await loadWorker()
    await w.dispatch("notificationclick", {
      action: "t1",
      notification: { data: { url: `${ORIGIN}/thoughts?log=1`, promptId: "p1", labels: { t1: "I am bad" } }, close: vi.fn() },
    })
    expect(w.fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = w.fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("/api/thoughts/logs")
    expect(JSON.parse(String(init.body))).toEqual({
      logs: [{ id: "11111111-2222-4333-8444-555555555555", thoughtId: "t1", at: expect.any(String), source: "prompt-action", promptId: "p1" }],
    })
    expect(w.shown.map((n) => [n.title, n.options.body])).toEqual([["Logged", "I am bad"]])
  })

  test("says so when it could not log, and offers the app", async () => {
    const w = await loadWorker()
    w.fetchMock.mockResolvedValueOnce(new Response("{}", { status: 401 }))
    await w.dispatch("notificationclick", {
      action: "t1",
      notification: { data: { promptId: "p1", labels: { t1: "I am bad" } }, close: vi.fn() },
    })
    expect(w.shown[0].title).toBe("Not logged")
    expect(w.shown[0].options.data).toMatchObject({ url: `${ORIGIN}/thoughts?log=1&prompt=p1` })
  })

  test("an action the notification did not offer is treated as a plain tap", async () => {
    const w = await loadWorker()
    await w.dispatch("notificationclick", { action: "forged", notification: { data: { labels: {} }, close: vi.fn() } })
    expect(w.fetchMock).not.toHaveBeenCalled()
    expect(w.opened).toEqual([`${ORIGIN}/thoughts?log=1`])
  })
})
