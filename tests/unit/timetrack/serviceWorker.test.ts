// @vitest-environment node
/**
 * THE SERVICE WORKER'S CONTRACT — what it may store, what it may answer, and
 * when it must forget.
 *
 * The failure this prevents: the first version of public/sw.js sat in front of
 * every page on the site, stored every page it saw (signed-in dashboard and
 * settings included) under one fixed cache name, and answered ANY page that
 * failed to load with the time tracker's HTML at that page's address. Nothing
 * tested any of that; the only test of offline support checked that
 * `register()` was called.
 *
 * The worker is loaded here with a fake `self`, `caches` and `fetch`, and its
 * fetch handler is driven with plain request objects — no browser needed. Each
 * test is one rule from the header of public/sw.js.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const ORIGIN = "https://app.test"
const SHELL = "/dashboard/time"

type Listener = (event: unknown) => void

interface Harness {
  listeners: Record<string, Listener[]>
  /** cache name → request url → response */
  store: Map<string, Map<string, Response>>
  fetchMock: ReturnType<typeof vi.fn>
  skipWaiting: ReturnType<typeof vi.fn>
  claim: ReturnType<typeof vi.fn>
}

function fakeCaches(store: Harness["store"]) {
  const cacheFor = (name: string) => {
    if (!store.has(name)) store.set(name, new Map())
    const entries = store.get(name)!
    return {
      add: async (url: string) => {
        const res = await (globalThis.fetch as unknown as (u: string) => Promise<Response>)(url)
        entries.set(new URL(url, ORIGIN).href, res)
      },
      put: async (request: { url: string } | string, response: Response) => {
        // warmShell puts by path string; the fetch handler puts by request
        const key = typeof request === "string" ? new URL(request, ORIGIN).href : request.url
        entries.set(key, response)
      },
    }
  }
  return {
    open: async (name: string) => cacheFor(name),
    keys: async () => [...store.keys()],
    delete: async (name: string) => store.delete(name),
    match: async (request: { url: string }) => {
      for (const entries of store.values()) {
        const hit = entries.get(request.url)
        if (hit) return hit
      }
      return undefined
    },
  }
}

async function loadWorker(version: string | null): Promise<Harness> {
  const listeners: Record<string, Listener[]> = {}
  const store: Harness["store"] = new Map()
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(typeof input === "string" ? input : (input as { url: string }).url)
    if (url.includes(SHELL)) {
      return new Response('<html><script src="/_next/static/chunks/main.js"></script></html>', { status: 200 })
    }
    return new Response("ok", { status: 200 })
  })
  const skipWaiting = vi.fn()
  const claim = vi.fn()

  vi.stubGlobal("self", {
    addEventListener: (type: string, fn: Listener) => (listeners[type] ??= []).push(fn),
    skipWaiting,
    clients: { claim },
    location: { href: `${ORIGIN}/sw.js${version === null ? "" : `?v=${version}`}`, origin: ORIGIN },
  })
  vi.stubGlobal("caches", fakeCaches(store))
  vi.stubGlobal("fetch", fetchMock)

  vi.resetModules()
  // @ts-expect-error — a classic worker script, not a module; imported for its side effects only
  await import("@/public/sw.js")
  return { listeners, store, fetchMock, skipWaiting, claim }
}

/** Fire one event and wait for whatever the handler scheduled. */
async function dispatch(h: Harness, type: string, event: Record<string, unknown>) {
  const pending: Promise<unknown>[] = []
  let response: Promise<Response> | undefined
  const full = {
    ...event,
    waitUntil: (p: Promise<unknown>) => pending.push(p),
    respondWith: (p: Promise<Response>) => {
      response = p
    },
  }
  for (const fn of h.listeners[type] ?? []) fn(full)
  await Promise.allSettled(pending)
  const settled = response === undefined ? undefined : await response.catch((e: Error) => e)
  // a cache.put scheduled from inside the fetch handler's `then` is a second wave
  await Promise.allSettled(pending)
  return { response: settled, respondedAtAll: response !== undefined }
}

const page = (path: string) => ({ url: ORIGIN + path, method: "GET", mode: "navigate", destination: "document" })
const asset = (path: string, destination = "script") => ({ url: ORIGIN + path, method: "GET", mode: "no-cors", destination })

async function installed(version = "build1") {
  const h = await loadWorker(version)
  await dispatch(h, "install", {})
  await dispatch(h, "activate", {})
  // install fetched the four shell URLs; every scenario below starts clean
  h.fetchMock.mockClear()
  return h
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("rule 4 — one store per build", () => {
  test("the store is named after the build id in the registration URL", async () => {
    const h = await installed("abc1234")
    expect([...h.store.keys()]).toEqual(["timetrack-shell-abc1234"])
  })

  test("a registration with no build id is named as such, never blank", async () => {
    const h = await installed(null as unknown as string)
    expect([...h.store.keys()]).toEqual(["timetrack-shell-unversioned"])
  })

  test("activating a new build throws the previous build's store away", async () => {
    const h = await loadWorker("build2")
    h.store.set("timetrack-shell-build1", new Map())
    h.store.set("somebody-elses-cache", new Map())
    await dispatch(h, "install", {})
    await dispatch(h, "activate", {})
    expect([...h.store.keys()]).toEqual(["timetrack-shell-build2"])
    expect(h.claim).toHaveBeenCalled()
  })
})

describe("rule 2 — only the tracker page is stored, only at its own address", () => {
  test("the tracker page is stored after a successful load and answered from the store when the network fails", async () => {
    const h = await installed()
    h.fetchMock.mockResolvedValueOnce(new Response("<html>tracker</html>", { status: 200 }))
    await dispatch(h, "fetch", { request: page("/dashboard/time") })

    h.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    const { response } = await dispatch(h, "fetch", { request: page("/dashboard/time") })
    expect(response).toBeInstanceOf(Response)
    expect(await (response as Response).text()).toBe("<html>tracker</html>")
  })

  test("any other page is never stored and never answered — the browser is left to it", async () => {
    const h = await installed()
    h.fetchMock.mockResolvedValueOnce(new Response("<html>settings</html>", { status: 200 }))
    const first = await dispatch(h, "fetch", { request: page("/dashboard/settings") })
    expect(first.respondedAtAll).toBe(false)
    expect(h.fetchMock).not.toHaveBeenCalled()

    const stored = [...h.store.values()].flatMap((m) => [...m.keys()])
    expect(stored.some((u) => u.includes("/dashboard/settings"))).toBe(false)
  })

  test("a failed load of another page is NOT answered with the tracker", async () => {
    // The original defect, verbatim: settings failing to load came up as the tracker.
    const h = await installed()
    h.store.get("timetrack-shell-build1")!.set(ORIGIN + "/dashboard/time", new Response("<html>tracker</html>"))
    h.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    const { respondedAtAll } = await dispatch(h, "fetch", { request: page("/preferences") })
    expect(respondedAtAll).toBe(false)
  })

  test("the tracker is stored only when the network answered — a 500 is passed through, not stored", async () => {
    const h = await installed()
    h.store.get("timetrack-shell-build1")!.clear()
    h.fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }))
    const { response } = await dispatch(h, "fetch", { request: page("/dashboard/time") })
    expect((response as Response).status).toBe(500)
    expect(h.store.get("timetrack-shell-build1")!.size).toBe(0)
  })
})

describe("rule 3 — the shell is stored with its scripts or not at all", () => {
  test("install stores the scripts the shell page names, not just its HTML", async () => {
    // HTML alone was a trap: after a deploy the stored page named chunks that
    // went out with the previous build's cache, so the offline launch drew the
    // timer and nothing worked.
    const h = await installed()
    const stored = [...h.store.get("timetrack-shell-build1")!.keys()]
    expect(stored).toContain(ORIGIN + "/dashboard/time")
    expect(stored).toContain(ORIGIN + "/_next/static/chunks/main.js")
  })

  test("a shell fetched while signed out is not stored — the login page never lands under the tracker's address", async () => {
    // `cache.add` followed the 307 and filed the login page as the tracker.
    // `warmShell` asks with redirect: "manual", so it arrives ok === false.
    const h = await loadWorker("build1")
    h.fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(typeof input === "string" ? input : (input as { url: string }).url)
      // What a `redirect: "manual"` fetch of a 307 actually yields: an opaque
      // redirect. `new Response(null, {status: 0})` is a RangeError, so it has
      // to be modelled by hand — and it must be modelled, because a mock that
      // throws makes this test pass whether the guard is there or not.
      if (url.includes(SHELL)) {
        return {
          type: "opaqueredirect",
          status: 0,
          ok: false,
          redirected: false,
          clone() {
            return this
          },
          text: async () => "",
        }
      }
      return new Response("ok", { status: 200 })
    })
    await dispatch(h, "install", {})
    await dispatch(h, "activate", {})
    const stored = [...(h.store.get("timetrack-shell-build1")?.keys() ?? [])]
    expect(stored).not.toContain(ORIGIN + "/dashboard/time")
  })

  test("the tracker's warm-shell message re-fills a store that was emptied", async () => {
    const h = await installed()
    await dispatch(h, "fetch", { request: page("/auth/login") })
    expect(h.store.has("timetrack-shell-build1")).toBe(false)

    await dispatch(h, "message", { data: { type: "warm-shell" } })
    const stored = [...(h.store.get("timetrack-shell-build1")?.keys() ?? [])]
    expect(stored).toContain(ORIGIN + "/dashboard/time")
    expect(stored).toContain(ORIGIN + "/_next/static/chunks/main.js")
  })

  test("a message that is not warm-shell does nothing", async () => {
    const h = await installed()
    h.store.get("timetrack-shell-build1")!.clear()
    await dispatch(h, "message", { data: { type: "something-else" } })
    expect(h.store.get("timetrack-shell-build1")!.size).toBe(0)
  })
})

describe("rule 4 — nothing signed-in outlives a sign-in", () => {
  test("a request for the tracker that came back as the login page is not stored as the tracker", async () => {
    const h = await installed()
    h.store.get("timetrack-shell-build1")!.clear()
    const login = new Response("<html>login</html>", { status: 200 })
    Object.defineProperty(login, "redirected", { value: true })
    h.fetchMock.mockResolvedValueOnce(login)
    await dispatch(h, "fetch", { request: page("/dashboard/time") })
    expect(h.store.get("timetrack-shell-build1")!.size).toBe(0)
  })

  test("reaching the login page empties the store", async () => {
    const h = await installed()
    h.store.get("timetrack-shell-build1")!.set(ORIGIN + "/dashboard/time", new Response("<html>tracker for user A</html>"))
    const { respondedAtAll } = await dispatch(h, "fetch", { request: page("/auth/login") })
    expect(respondedAtAll).toBe(false)
    expect(h.store.has("timetrack-shell-build1")).toBe(false)
  })
})

describe("assets and the API", () => {
  test("a static asset is stored so the shell can draw itself offline", async () => {
    const h = await installed()
    h.fetchMock.mockResolvedValueOnce(new Response("js", { status: 200 }))
    await dispatch(h, "fetch", { request: asset("/_next/static/chunks/main.js") })
    expect(h.store.get("timetrack-shell-build1")!.has(ORIGIN + "/_next/static/chunks/main.js")).toBe(true)
  })

  test("nothing under /api is touched", async () => {
    const h = await installed()
    const { respondedAtAll } = await dispatch(h, "fetch", { request: asset("/api/timetrack/sync", "") })
    expect(respondedAtAll).toBe(false)
    expect(h.fetchMock).not.toHaveBeenCalled()
  })

  test("another site's requests are not touched", async () => {
    const h = await installed()
    const { respondedAtAll } = await dispatch(h, "fetch", {
      request: { url: "https://supabase.example/rest/v1/x", method: "GET", mode: "cors", destination: "" },
    })
    expect(respondedAtAll).toBe(false)
  })

  test("only GET is ever handled", async () => {
    const h = await installed()
    const { respondedAtAll } = await dispatch(h, "fetch", {
      request: { url: ORIGIN + "/dashboard/time", method: "POST", mode: "navigate", destination: "document" },
    })
    expect(respondedAtAll).toBe(false)
  })
})
