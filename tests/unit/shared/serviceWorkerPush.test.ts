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
    expect(w.shown[0].options.data).toMatchObject({ url: `${ORIGIN}/audit` })
  })
})

describe("the audit ping (Plans/energy-audit.md, D-BUTTONS)", () => {
  const PING = {
    kind: "audit-ping",
    title: "Time & energy audit",
    body: "What did you do from 10:00 to 10:15?",
    url: "/audit?answer=2026-11-09T09:00:00.000Z&send=s1",
    tag: "audit-ping",
    slotAt: "2026-11-09T09:00:00.000Z",
    sendId: "s1",
    actions: [
      { id: "same", title: "Same as before" },
      { id: "mute", title: "Mute 1 h" },
    ],
  }

  test("keeps kind, quarter and send, and shows both buttons", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf(PING))
    expect(w.shown[0].title).toBe("Time & energy audit")
    expect(w.shown[0].options).toMatchObject({
      body: "What did you do from 10:00 to 10:15?",
      tag: "audit-ping",
      data: { kind: "audit-ping", slotAt: PING.slotAt, sendId: "s1", url: `${ORIGIN}${PING.url}` },
      actions: [
        { action: "same", title: "Same as before" },
        { action: "mute", title: "Mute 1 h" },
      ],
    })
  })

  for (const action of ["same", "mute"] as const) {
    test(`"${action}" posts to the server and shows its answer, silently`, async () => {
      const w = await loadWorker()
      await w.dispatch("push", pushOf(PING))
      w.fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ title: "Time & energy audit", body: "Saved for 10:00–10:15 (same as before)" }), { status: 200 }))
      await w.dispatch("notificationclick", { action, notification: { data: w.shown[0].options.data, close: vi.fn() } })
      const [url, init] = w.fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit]
      expect(url).toBe("/api/audit/ping")
      expect(init).toMatchObject({ method: "POST", credentials: "same-origin" })
      expect(JSON.parse(init.body as string)).toEqual({ action, slotAt: PING.slotAt, sendId: "s1" })
      expect(w.shown.at(-1)!.options).toMatchObject({ body: "Saved for 10:00–10:15 (same as before)", tag: "audit-ping", silent: true })
      expect(w.opened).toEqual([])
    })
  }

  test("when the post fails, it shows 'Not saved. Tap to answer.', and a tap then opens the sheet", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf(PING))
    w.fetchMock.mockRejectedValueOnce(new TypeError("offline"))
    await w.dispatch("notificationclick", { action: "same", notification: { data: w.shown[0].options.data, close: vi.fn() } })
    const last = w.shown.at(-1)!
    expect(last.options.body).toBe("Not saved. Tap to answer.")
    await w.dispatch("notificationclick", { action: "", notification: { data: last.options.data, close: vi.fn() } })
    expect(w.opened).toEqual([`${ORIGIN}${PING.url}`])
  })

  test("a refusal (409) also says 'Not saved. Tap to answer.'", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf(PING))
    w.fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ title: "Time & energy audit", body: "Not saved. Tap to answer." }), { status: 409 }))
    await w.dispatch("notificationclick", { action: "same", notification: { data: w.shown[0].options.data, close: vi.fn() } })
    expect(w.shown.at(-1)!.options.body).toBe("Not saved. Tap to answer.")
  })

  test("a tap on the ping itself opens the answer sheet", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf(PING))
    await w.dispatch("notificationclick", { action: "", notification: { data: w.shown[0].options.data, close: vi.fn() } })
    expect((w.fetchMock.mock.calls as unknown as [string][]).filter(([u]) => String(u).includes("/api/audit"))).toEqual([])
    expect(w.opened).toEqual([`${ORIGIN}${PING.url}`])
  })
})
