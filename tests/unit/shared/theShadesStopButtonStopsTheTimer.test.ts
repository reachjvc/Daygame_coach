// @vitest-environment node
/**
 * THE RUNNING-TIMER NOTIFICATION, FROM THE WORKER'S SIDE (public/sw.js,
 * the notification half; Plans/time-tracker-like-toggl.md, Phase 7, item 2).
 *
 * Loaded with a fake `self` the way tests/unit/shared/serviceWorkerPush.test.ts
 * loads it, plus a small in-memory IndexedDB (where a stop tapped with no
 * signal waits) and a fake Background Sync. Each test is one promise:
 *
 *   - the timer's pushes are silent and do not renotify, because the payload
 *     says so; reminders keep ringing as they always did;
 *   - Stop posts the entry and the TAP time, and shows what the server said;
 *   - with no signal the stop waits, keeping the tap time, and is sent by
 *     Background Sync, or by the app the next time it opens;
 *   - tapping the notification itself opens the timer.
 */

import { afterEach, describe, expect, test, vi } from "vitest"

const ORIGIN = "https://app.test"

type Listener = (event: unknown) => void

/** Just enough IndexedDB for the worker: one store, keyed by `entryId`. */
function fakeIndexedDb() {
  const stores = new Map<string, Map<string, unknown>>()
  const request = <T>(run: () => T) => {
    const req: { result?: T; error?: unknown; onsuccess?: () => void; onerror?: () => void } = {}
    queueMicrotask(() => {
      try {
        req.result = run()
        req.onsuccess?.()
      } catch (error) {
        req.error = error
        req.onerror?.()
      }
    })
    return req
  }
  const db = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string) => void stores.set(name, new Map()),
    close: () => undefined,
    transaction: (name: string) => {
      const tx: { oncomplete?: () => void; onerror?: () => void; onabort?: () => void; error: unknown; objectStore: (n: string) => unknown } = {
        error: null,
        objectStore: () => {
          const store = stores.get(name)!
          return {
            get: (key: string) => request(() => store.get(key)),
            put: (value: { entryId: string }) => request(() => void store.set(value.entryId, structuredClone(value))),
            delete: (key: string) => request(() => void store.delete(key)),
            getAll: () => request(() => [...store.values()].map((v) => structuredClone(v))),
          }
        },
      }
      // completes once every request queued in it has run (they run on microtasks)
      setTimeout(() => tx.oncomplete?.(), 0)
      return tx
    },
  }
  return {
    stores,
    open: () => {
      const req: { result?: typeof db; onupgradeneeded?: () => void; onsuccess?: () => void; onerror?: () => void } = {}
      queueMicrotask(() => {
        req.result = db
        if (!stores.has("stops")) req.onupgradeneeded?.()
        req.onsuccess?.()
      })
      return req
    },
  }
}

async function loadWorker({ backgroundSync = true } = {}) {
  const listeners: Record<string, Listener[]> = {}
  const shown: { title: string; options: Record<string, unknown> }[] = []
  const opened: string[] = []
  const syncTags: string[] = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => new Response(JSON.stringify({ url, method: init?.method }), { status: 200 }))
  const idb = fakeIndexedDb()

  vi.stubGlobal("self", {
    addEventListener: (type: string, fn: Listener) => (listeners[type] ??= []).push(fn),
    skipWaiting: vi.fn(),
    location: { href: `${ORIGIN}/sw.js?v=b1`, origin: ORIGIN },
    crypto: { randomUUID: () => "11111111-2222-4333-8444-555555555555" },
    registration: {
      showNotification: async (title: string, options: Record<string, unknown>) => void shown.push({ title, options }),
      pushManager: { subscribe: vi.fn() },
      ...(backgroundSync ? { sync: { register: async (tag: string) => void syncTags.push(tag) } } : {}),
    },
    clients: {
      claim: vi.fn(),
      matchAll: async () => [],
      openWindow: async (url: string) => void opened.push(url),
    },
  })
  vi.stubGlobal("caches", { open: async () => ({ put: vi.fn(), add: vi.fn() }), keys: async () => [], delete: vi.fn(), match: vi.fn() })
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal("indexedDB", { open: idb.open })

  vi.resetModules()
  // @ts-expect-error — a classic worker script, imported for its side effects only
  await import("@/public/sw.js")

  /** Every listener's `waitUntil`, settled: a rejected one is how a sync asks to be tried again. */
  const dispatch = async (type: string, event: Record<string, unknown>) => {
    const pending: Promise<unknown>[] = []
    for (const fn of listeners[type] ?? []) fn({ ...event, waitUntil: (p: Promise<unknown>) => pending.push(p) })
    return Promise.allSettled(pending)
  }
  const queued = () => [...(idb.stores.get("stops")?.values() ?? [])] as { entryId: string; at: string }[]
  return { dispatch, shown, opened, fetchMock, syncTags, queued }
}

const pushOf = (payload: unknown) => ({ data: { json: () => payload } })

const RUNNING = {
  title: "● Gym · since 17:05",
  body: "Time tracker",
  url: "/time?view=timer",
  tag: "timer-running",
  kind: "timetrack-running",
  entryId: "gym-1",
  name: "Gym",
  silent: true,
  renotify: false,
  actions: [{ id: "stop", title: "Stop" }],
}

/** The notification the worker showed for RUNNING, as the click handler receives it. */
async function shownTimer() {
  const w = await loadWorker()
  await w.dispatch("push", pushOf(RUNNING))
  return { w, notification: { data: w.shown[0].options.data, close: vi.fn() } }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("the timer's pushes", () => {
  test("are silent and do not renotify when the payload says so, under the timer's own tag, with Stop", async () => {
    const { w } = await shownTimer()
    expect(w.shown[0].title).toBe("● Gym · since 17:05")
    expect(w.shown[0].options).toMatchObject({
      tag: "timer-running",
      silent: true,
      renotify: false,
      actions: [{ action: "stop", title: "Stop" }],
      data: { url: `${ORIGIN}/time?view=timer`, kind: "timetrack-running", entryId: "gym-1" },
    })
  })

  test("the 6 h alert rings: not silent, renotifying", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf({ ...RUNNING, silent: false, renotify: true }))
    expect(w.shown[0].options).toMatchObject({ silent: false, renotify: true, tag: "timer-running" })
  })

  test("a reminder that says nothing about sound rings as reminders always did", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf({ title: "Test notification", body: "Tap.", url: "/settings", tag: "test" }))
    expect(w.shown[0].options).toMatchObject({ silent: false, renotify: true, tag: "test" })
  })

  test("a timer notification never offers its Stop as a thought to log", async () => {
    const { w } = await shownTimer()
    expect(w.shown[0].options.data).toMatchObject({ labels: {} })
  })
})

describe("tapping the notification itself", () => {
  test("opens the timer", async () => {
    const { w, notification } = await shownTimer()
    await w.dispatch("notificationclick", { action: "", notification })
    expect(w.opened).toEqual([`${ORIGIN}/time?view=timer`])
    expect(w.fetchMock).not.toHaveBeenCalled()
  })

  test("opens the timer when the payload names another site", async () => {
    const w = await loadWorker()
    await w.dispatch("push", pushOf({ ...RUNNING, url: "https://evil.example/" }))
    expect(w.shown[0].options.data).toMatchObject({ url: `${ORIGIN}/time?view=timer` })
  })
})

describe("Stop", () => {
  test("posts the entry and the time of the tap, and shows what the server said", async () => {
    const { w, notification } = await shownTimer()
    w.fetchMock.mockResolvedValueOnce(Response.json({ outcome: "stopped", title: "Stopped · Gym 1:12", body: "17:05–18:17" }))
    const before = Date.now()
    await w.dispatch("notificationclick", { action: "stop", notification })

    expect(w.fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = w.fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("/api/timetrack/stop")
    expect(init).toMatchObject({ method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" } })
    const body = JSON.parse(String(init.body))
    expect(body.entryId).toBe("gym-1")
    expect(Date.parse(body.at)).toBeGreaterThanOrEqual(before - 1)
    expect(Date.parse(body.at)).toBeLessThanOrEqual(Date.now())
    expect(typeof body.sentAt).toBe("string")
    expect(w.shown.slice(1).map((n) => [n.title, n.options.body, n.options.tag, n.options.silent])).toEqual([
      ["Stopped · Gym 1:12", "17:05–18:17", "timer-running", true],
    ])
  })

  test("says so when the timer had already been stopped elsewhere", async () => {
    const { w, notification } = await shownTimer()
    w.fetchMock.mockResolvedValueOnce(Response.json({ outcome: "already-stopped", title: "Already stopped at 18:00", body: "Gym" }, { status: 409 }))
    await w.dispatch("notificationclick", { action: "stop", notification })
    expect(w.shown[1].title).toBe("Already stopped at 18:00")
    expect(w.queued()).toEqual([])
  })

  test("signed out, it says it did not stop and offers the timer", async () => {
    const { w, notification } = await shownTimer()
    w.fetchMock.mockResolvedValueOnce(Response.json({ error: "Authentication required" }, { status: 401 }))
    await w.dispatch("notificationclick", { action: "stop", notification })
    expect(w.shown[1].title).toBe("Not stopped")
    expect(w.shown[1].options.data).toMatchObject({ url: `${ORIGIN}/time?view=timer` })
    expect(w.queued()).toEqual([])
  })
})

describe("Stop with no signal", () => {
  test("waits with the tap time, asks for Background Sync, and says so", async () => {
    const { w, notification } = await shownTimer()
    w.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await w.dispatch("notificationclick", { action: "stop", notification })

    const [stop] = w.queued()
    expect(stop).toMatchObject({ entryId: "gym-1" })
    expect(w.syncTags).toEqual(["timetrack-stop"])
    expect(w.shown[1].title).toBe("Stop saved")
  })

  test("Background Sync sends it later with the TAP time, not the time the signal came back", async () => {
    const { w, notification } = await shownTimer()
    w.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await w.dispatch("notificationclick", { action: "stop", notification })
    const tappedAt = w.queued()[0].at

    w.fetchMock.mockResolvedValueOnce(Response.json({ outcome: "stopped", title: "Stopped · Gym 1:12", body: "17:05–18:17" }))
    const results = await w.dispatch("sync", { tag: "timetrack-stop" })

    expect(results.every((r) => r.status === "fulfilled")).toBe(true)
    const body = JSON.parse(String((w.fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body))
    expect(body).toMatchObject({ entryId: "gym-1", at: tappedAt })
    expect(w.queued()).toEqual([])
    expect(w.shown.at(-1)?.title).toBe("Stopped · Gym 1:12")
  })

  test("a sync while still offline fails, so the browser tries again, and the stop keeps waiting", async () => {
    const { w, notification } = await shownTimer()
    w.fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    await w.dispatch("notificationclick", { action: "stop", notification })
    const results = await w.dispatch("sync", { tag: "timetrack-stop" })
    expect(results.some((r) => r.status === "rejected")).toBe(true)
    expect(w.queued()).toHaveLength(1)
  })

  test("a server that is down is treated like no signal: the stop waits", async () => {
    const { w, notification } = await shownTimer()
    w.fetchMock.mockResolvedValueOnce(new Response("{}", { status: 503 }))
    await w.dispatch("notificationclick", { action: "stop", notification })
    expect(w.queued()).toHaveLength(1)
  })

  test("tapping Stop twice offline keeps the first tap", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-11-04T17:17:00Z"))
    const { w, notification } = await shownTimer()
    w.fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    await w.dispatch("notificationclick", { action: "stop", notification })
    vi.setSystemTime(new Date("2026-11-04T17:30:00Z"))
    await w.dispatch("notificationclick", { action: "stop", notification })
    expect(w.queued().map((s) => s.at)).toEqual(["2026-11-04T17:17:00.000Z"])
  })

  test("the next timer push sends it, after showing itself, so the stop's answer is what stays on screen", async () => {
    const { w, notification } = await shownTimer()
    w.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await w.dispatch("notificationclick", { action: "stop", notification })
    const tappedAt = w.queued()[0].at

    w.fetchMock.mockResolvedValueOnce(Response.json({ outcome: "stopped", title: "Stopped · Gym 1:12", body: "17:05–18:17" }))
    await w.dispatch("push", pushOf(RUNNING))

    const body = JSON.parse(String((w.fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body))
    expect(body).toMatchObject({ entryId: "gym-1", at: tappedAt })
    expect(w.queued()).toEqual([])
    expect(w.shown.slice(-2).map((n) => n.title)).toEqual(["● Gym · since 17:05", "Stopped · Gym 1:12"])
  })

  test("a reminder's push does not send waiting stops", async () => {
    const { w, notification } = await shownTimer()
    w.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await w.dispatch("notificationclick", { action: "stop", notification })
    await w.dispatch("push", pushOf({ title: "Test notification", tag: "test" }))
    expect(w.fetchMock).toHaveBeenCalledTimes(1)
    expect(w.queued()).toHaveLength(1)
  })

  test("a second tap with signal sends the FIRST tap's time, and the waiting stop is done", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-11-04T17:17:00Z"))
    const { w, notification } = await shownTimer()
    w.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await w.dispatch("notificationclick", { action: "stop", notification })

    vi.setSystemTime(new Date("2026-11-04T17:40:00Z"))
    w.fetchMock.mockResolvedValueOnce(Response.json({ outcome: "stopped", title: "Stopped · Gym 1:12", body: "17:05–18:17" }))
    await w.dispatch("notificationclick", { action: "stop", notification })

    const body = JSON.parse(String((w.fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body))
    expect(body.at).toBe("2026-11-04T17:17:00.000Z")
    expect(w.queued()).toEqual([])
  })

  test("with no Background Sync, the app's next open sends it", async () => {
    const w = await loadWorker({ backgroundSync: false })
    await w.dispatch("push", pushOf(RUNNING))
    w.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await w.dispatch("notificationclick", { action: "stop", notification: { data: w.shown[0].options.data, close: vi.fn() } })
    expect(w.queued()).toHaveLength(1)

    w.fetchMock.mockResolvedValueOnce(Response.json({ outcome: "stopped", title: "Stopped · Gym 1:12", body: "17:05–18:17" }))
    await w.dispatch("message", { data: { type: "send-queued-stops" } })
    expect(w.fetchMock).toHaveBeenCalledTimes(2)
    expect(w.queued()).toEqual([])
  })
})
