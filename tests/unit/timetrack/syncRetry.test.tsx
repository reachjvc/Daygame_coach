/**
 * WHAT THE UPLOAD DOES WHEN IT CANNOT REACH THE SERVER.
 *
 * Measured in a browser on 2026-09-26, against the product route:
 *
 *   - offline with one change queued: **25 POSTs in 20.0 seconds**, gaps
 *     850–865ms, flat, no growth — while the file's own backoff says 2s
 *     doubling to 60s;
 *   - with the server answering 401: **23 POSTs in 20 seconds**, each refused,
 *     although the code says in a comment that retrying a 401 is pointless and
 *     it stops;
 *   - and a change made while a request was in the air sat unsent for sixteen
 *     seconds with nothing in flight, until an unrelated edit flushed it.
 *
 * One cause behind all three: every flush sets `status`, and the effect that
 * schedules flushes *depends* on `status`, so each attempt re-arms the next one
 * 800ms later and the backoff never gets to decide anything.
 *
 * These tests drive the hook with a stubbed server and fake timers. They advance
 * with `advanceTimersByTimeAsync` — `advanceTimersByTime` leaves the stubbed
 * fetch promise unresolved, so no retry is ever scheduled and every one of these
 * passes while proving nothing.
 */

import { StrictMode, useCallback, useEffect, useState } from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { useTimetrackSync } from "@/src/timetrack/hooks/useTimetrackSync"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

const USER = "user-1"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
})

function localState(): TimetrackState {
  return baseState({
    entries: [entry(1, "2026-08-09", "09:00", "10:00", { description: "morning writing" })],
  })
}

interface Server {
  posts: number
  postTimes: number[]
  /** what a POST answers; change it mid-test to simulate a server coming back */
  postReply: () => { ok: boolean; status: number }
}

function stubServer(rows: unknown): Server {
  const server: Server = {
    posts: 0,
    postTimes: [],
    postReply: () => ({ ok: true, status: 200 }),
  }
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === "POST") {
        server.posts++
        server.postTimes.push(Date.now())
        const reply = server.postReply()
        if (!reply.ok && reply.status === 0) throw new Error("network down")
        return { ...reply, json: async () => ({ error: "nope" }) }
      }
      return { ok: true, status: 200, json: async () => ({ rows, cursor: NOW_ISO, empty: false, userId: USER }) }
    }),
  )
  return server
}

/**
 * Drives the hook and exposes one button that makes a real, queueable change.
 *
 * THE CALLBACKS ARE STABLE ON PURPOSE, and this is not a detail. `useTimetrack`
 * hands the real hook `useCallback`-wrapped functions, so the change-watcher
 * effect re-runs only when `state` or `status` changes. A harness that rebuilds
 * `pushToast` every render re-runs that effect on every render instead — which
 * CLEARS its own 800ms timer before it can fire, so the backoff looks like the
 * only scheduler and the browser's once-a-second loop never appears. The first
 * version of this file did exactly that and reported four sends where the
 * product made twenty-five.
 */
function Harness({ initial }: { initial: TimetrackState }) {
  const [state, setState] = useState<TimetrackState | null>(null)
  useEffect(() => setState(initial), [initial])

  const apply = useCallback(
    (updater: (current: TimetrackState) => TimetrackState) =>
      setState((current) => (current ? updater(current) : current)),
    [],
  )
  const replace = useCallback((next: TimetrackState) => setState(next), [])
  const toast = useCallback(() => {}, [])

  const sync = useTimetrackSync({ state, setState: apply, replaceState: replace, pushToast: toast })

  return (
    <>
    <button
      data-testid="second"
      onClick={() =>
        setState((current) =>
          current ? { ...current, workspace: { ...current.workspace, name: `renamed ${Date.now()}` } } : current,
        )
      }
    >
      second
    </button>
    <button
      data-testid="edit"
      onClick={() =>
        setState((current) =>
          current
            ? {
                ...current,
                entries: current.entries.map((e, i) =>
                  i === 0 ? { ...e, description: `${e.description}!`, at: new Date().toISOString() } : e,
                ),
              }
            : current,
        )
      }
    >
      {sync.status}
    </button>
    </>
  )
}

async function settle(ms = 100) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function mount(server: Server, initial = localState()) {
  const view = render(<Harness initial={initial} />)
  await settle(200)
  server.posts = 0
  server.postTimes = []
  return view
}

describe("a server that cannot be reached is not asked once a second", () => {
  test("a failing send backs off instead of re-arming an 800ms timer", async () => {
    const initial = localState()
    const server = stubServer(stateToRows(initial, USER))
    const view = await mount(server, initial)

    server.postReply = () => ({ ok: false, status: 0 }) // network failure
    await act(async () => view.getByTestId("edit").click())
    await settle(15_000)

    // 2s, 4s, 8s — three retries after the first attempt, not seventeen
    expect(server.posts, "a failing server was asked too often").toBeLessThanOrEqual(4)
    expect(server.posts, "it stopped asking altogether").toBeGreaterThan(1)
  })

  test("and the gaps grow rather than staying flat", async () => {
    const initial = localState()
    const server = stubServer(stateToRows(initial, USER))
    const view = await mount(server, initial)

    server.postReply = () => ({ ok: false, status: 0 })
    await act(async () => view.getByTestId("edit").click())
    await settle(15_000)

    const gaps = server.postTimes.slice(1).map((t, i) => t - server.postTimes[i])
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i], `gap ${i} did not grow: ${gaps.join(", ")}`).toBeGreaterThan(gaps[i - 1])
    }
  })
})

describe("a session that has ended is asked once", () => {
  test("a 401 stops the retry rather than repeating it every second", async () => {
    const initial = localState()
    const server = stubServer(stateToRows(initial, USER))
    const view = await mount(server, initial)

    server.postReply = () => ({ ok: false, status: 401 })
    await act(async () => view.getByTestId("edit").click())
    await settle(20_000)

    expect(server.posts, "a signed-out session was asked more than once").toBe(1)
  })

  test("and a change made after signing out is queued, not sent", async () => {
    const initial = localState()
    const server = stubServer(stateToRows(initial, USER))
    const view = await mount(server, initial)

    server.postReply = () => ({ ok: false, status: 401 })
    await act(async () => view.getByTestId("edit").click())
    await settle(3_000)
    const afterFirst = server.posts

    await act(async () => view.getByTestId("edit").click())
    await settle(10_000)

    expect(server.posts).toBe(afterFirst)
  })
})

describe("the queue keeps draining after a failure", () => {
  test("a NEW edit is still sent once the server is back", async () => {
    /**
     * The landmine this test exists for: `retryAt.current` is only ever
     * `clearTimeout`-ed, never set to null, so any guard that reads it as "a
     * retry is pending" would mute every later edit for the life of the page
     * after one failed send.
     */
    const initial = localState()
    const server = stubServer(stateToRows(initial, USER))
    const view = await mount(server, initial)

    server.postReply = () => ({ ok: false, status: 0 })
    await act(async () => view.getByTestId("edit").click())
    await settle(3_000)

    server.postReply = () => ({ ok: true, status: 200 })
    await settle(10_000) // the backoff's own retry gets it through
    const afterRecovery = server.posts

    await act(async () => view.getByTestId("edit").click())
    await settle(3_000)

    expect(server.posts, "a later edit never reached the server").toBeGreaterThan(afterRecovery)
  })

  test("a change made while a request is in the air is sent when it lands", async () => {
    /**
     * Reproduced in a browser: with one POST held open for four seconds, a
     * second change sat unsent for sixteen seconds with nothing in flight. The
     * request finishes, sets the status it already had — React bails, the
     * effect does not re-run, and the remainder waits for an unrelated edit.
     */
    const initial = localState()
    const server = stubServer(stateToRows(initial, USER))
    const view = await mount(server, initial)

    let release: (() => void) | null = null
    server.postReply = () => ({ ok: true, status: 200 })
    const slowFetch = vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === "POST") {
        server.posts++
        if (server.posts === 1) await new Promise<void>((resolve) => (release = resolve))
        return { ok: true, status: 200, json: async () => ({}) }
      }
      return { ok: true, status: 200, json: async () => ({ rows: {}, cursor: NOW_ISO, empty: false, userId: USER }) }
    })
    vi.stubGlobal("fetch", slowFetch)

    await act(async () => view.getByTestId("edit").click())
    await settle(1_000) // first POST is now in the air
    await act(async () => view.getByTestId("edit").click()) // queued behind it
    await settle(500)

    await act(async () => {
      release?.()
      await vi.advanceTimersByTimeAsync(3_000)
    })

    expect(server.posts, "the change queued during the request was never sent").toBeGreaterThan(1)
  })
})

describe("a first contact that fails", () => {
  test("is tried again, instead of stranding the page until a reload", async () => {
    /**
     * `ready` stops the first-contact effect running twice, and on failure
     * nothing set it back — so `userId` and `cursor` stayed unset, which means
     * no upload and no pull can even start. A flaky moment at open left the
     * tracker working locally and silently never syncing, with only a reload to
     * recover. The badge does say something is wrong; nothing says it will stay
     * wrong.
     */
    const initial = localState()
    let attempts = 0
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string }) => {
        if (init?.method === "POST") return { ok: true, status: 200, json: async () => ({}) }
        attempts += 1
        if (attempts === 1) throw new Error("the network was not there yet")
        return {
          ok: true,
          status: 200,
          json: async () => ({ rows: stateToRows(initial, USER), cursor: NOW_ISO, empty: false, userId: USER }),
        }
      }),
    )

    const view = render(<Harness initial={initial} />)
    await settle(500)
    expect(attempts, "the first attempt never happened").toBe(1)
    expect(view.getByTestId("edit").textContent).not.toBe("synced")

    // the backoff's own second go
    await settle(6_000)

    expect(attempts, "it never asked again").toBeGreaterThan(1)
    expect(view.getByTestId("edit").textContent, "it never recovered without a reload").toBe("synced")
  })
})

describe("a row the server will never accept", () => {
  test("is taken out of the queue, so the next edit is not stuck behind it", async () => {
    /**
     * The first version of this stopped the automatic retry and left the row in
     * the queue — which only moved the retry from a timer to the user's
     * keystrokes. Every later edit re-sent the refused row, got the same 400,
     * raised another toast, and did not reach the server either. The badge
     * stayed non-zero for ever.
     *
     * Worse, the stuck key is in `pending`, so every pull marks it dirty while
     * the cursor moves past it: the other device's correction for that same row
     * is discarded and never asked for again. One mistyped time, two devices
     * permanently disagreeing.
     */
    const initial = localState()
    const server = stubServer(stateToRows(initial, USER))
    const view = await mount(server, initial)

    const refusedId = initial.entries[0].id
    let posts: { table: string; rows: Record<string, unknown>[] }[] = []
    server.postReply = () => ({ ok: true, status: 200 })
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string; body?: string }) => {
        if (init?.method === "POST") {
          const body = JSON.parse(init.body ?? "{}") as { rows?: Record<string, Record<string, unknown>[]> }
          // every table, not just entries: the second edit writes a workspace
          // row, and a probe that only watches one table reports a working
          // upload as a silent one
          for (const [table, rows] of Object.entries(body.rows ?? {})) posts.push({ table, rows })
          const entries = body.rows?.timetrack_entries ?? []
          if (entries.some((row) => row.id === refusedId)) {
            return {
              ok: false,
              status: 400,
              json: async () => ({
                error: 'violates check constraint "timetrack_entries_stop_after_start"',
                table: "timetrack_entries",
                ids: [refusedId],
              }),
            }
          }
          return { ok: true, status: 200, json: async () => ({}) }
        }
        return { ok: true, status: 200, json: async () => ({ rows: {}, cursor: NOW_ISO, empty: false, userId: USER }) }
      }),
    )

    // the edit the server refuses
    await act(async () => view.getByTestId("edit").click())
    await settle(3_000)
    expect(
      posts.some((p) => p.rows.some((r) => r.id === refusedId)),
      "the refused row was never sent",
    ).toBe(true)

    // now a second, unrelated edit
    posts = []
    await act(async () => view.getByTestId("second").click())
    await settle(3_000)

    // Scoped to the table as well as the id: in these fixtures the workspace
    // and the first entry are both id "1", so an id-only check reported a
    // working quarantine as broken.
    const rowsSent = posts.flatMap((p) => p.rows.map((row) => ({ table: p.table, id: String(row.id) })))
    expect(rowsSent.length, "nothing was sent at all after the refusal").toBeGreaterThan(0)
    expect(
      rowsSent.some((row) => row.table === "timetrack_entries" && row.id === refusedId),
      "the refused row was sent again, so the next edit is stuck behind it",
    ).toBe(false)
  })
})

describe("the double-invoked effects React runs in development", () => {
  test("do not switch the whole sync off", async () => {
    /**
     * React mounts, cleans up and mounts again in development. A flag that is
     * only ever set true in a cleanup — `unmounted.current = true`, added to
     * stop retry chains outliving the page — is therefore true from the first
     * render onwards, and every fetch and flush returned at its first line.
     *
     * What that looked like in the product: no first contact, no status badge,
     * nothing queued, nothing uploaded, and a workspace that existed in one
     * browser only — 767 rows there, 764 on the account. The next successful
     * load then replaced the local copy with the server's, so the work made
     * while it was off was discarded.
     *
     * The owner's product IS the dev server, so this was not a development
     * inconvenience. It was the feature, off, silently, for an hour.
     */
    const initial = localState()
    const server = stubServer(stateToRows(initial, USER))

    render(
      <StrictMode>
        <Harness initial={initial} />
      </StrictMode>,
    )
    await settle(400)

    const asked = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls
    expect(asked.length, "the tracker never spoke to the server at all").toBeGreaterThan(0)
    expect(server.posts + asked.length).toBeGreaterThan(0)
  })
})
