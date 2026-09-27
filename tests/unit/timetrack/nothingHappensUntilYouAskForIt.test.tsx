/**
 * TWO THINGS THE SYNC DID WITHOUT BEING ASKED.
 *
 * Both were found by driving this hook with fake timers and counting requests,
 * and both had a comment in the file claiming they could not happen.
 *
 * 1. THE IMPORT OFFER WAS DECORATION. An account with nothing stored gets a
 *    banner: "This browser has N time entries that your account does not — Show /
 *    Upload all / Not now." The branch that shows it set the baseline to `null`,
 *    and `diffRows` reads `null` as "the server has nothing, so everything is
 *    new". Setting the status on the next line flips `syncActive`, which is in the
 *    change-watcher's dependency array — so the watcher re-ran, queued the whole
 *    workspace and sent it 800ms later, with the banner still on screen and no
 *    user action of any kind. The banner is inline, not a modal, so nothing else
 *    gated it.
 *
 * 2. AN UNMOUNTED INSTANCE WROTE THE LIVE ONE'S QUEUE. `PENDING_KEY` is one key
 *    that every instance of this hook owns. Leaving the tracker with an upload in
 *    the air and coming straight back leaves the old request running; when it
 *    answers, its success path empties ITS queue and saves — over the live
 *    instance's, which by then holds a new edit. The badge said "1 waiting" while
 *    the key on disk read `{}`.
 */

import { useCallback, useEffect, useState } from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { useTimetrackSync } from "@/src/timetrack/hooks/useTimetrackSync"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

const USER = "user-1"
const PENDING_KEY = "toggl-clone:pending"

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

function Harness({ initial, onOffer }: { initial: TimetrackState; onOffer?: (has: boolean) => void }) {
  const [state, setState] = useState<TimetrackState | null>(null)
  useEffect(() => setState(initial), [initial])
  const apply = useCallback((u: (c: TimetrackState) => TimetrackState) => setState((c) => (c ? u(c) : c)), [])
  const replace = useCallback((next: TimetrackState) => setState(next), [])
  const toast = useCallback(() => {}, [])
  const sync = useTimetrackSync({ state, setState: apply, replaceState: replace, pushToast: toast })
  useEffect(() => { onOffer?.(sync.importOffer !== null) }, [sync.importOffer, onOffer])
  return (
    <>
      <span data-testid="pending">{sync.pendingCount}</span>
      <button data-testid="edit" onClick={() => apply((c) => ({ ...c, workspace: { ...c.workspace, name: `renamed ${Date.now()}` } }))}>edit</button>
    </>
  )
}

const twoEntries = () =>
  baseState({
    entries: [
      entry(1, "2026-08-10", "09:00", "10:00", { description: "one" }),
      entry(2, "2026-08-11", "09:00", "10:00", { description: "two" }),
    ],
  })

describe("an account with nothing stored yet, and the offer on screen", () => {
  test("nothing is uploaded until the person answers", async () => {
    const sent: unknown[] = []
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === "POST") {
        sent.push(JSON.parse(init.body ?? "{}"))
        return { ok: true, status: 200, json: async () => ({}) }
      }
      if (String(url).includes("since=")) return { ok: true, status: 200, json: async () => ({ rows: {}, cursor: NOW_ISO }) }
      return { ok: true, status: 200, json: async () => ({ rows: {}, cursor: NOW_ISO, empty: true, userId: USER }) }
    }))

    let sawOffer = false
    render(<Harness initial={twoEntries()} onOffer={(has) => { if (has) sawOffer = true }} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(sawOffer, "the offer never appeared, so this test asserts nothing").toBe(true)
    /**
     * THE ASSERTION IS ON THE QUEUE, NOT ON THE REQUESTS.
     *
     * The first version of this test counted POSTs and passed against the broken
     * code — because whether the queue drains within five seconds depends on what
     * else happens to trigger a flush, and nothing did here. The queue is where
     * the decision was actually made: once the workspace is in it, it goes up on
     * the next edit, the next `online` event or the next glance at the tab, and
     * "Not now" can no longer win. Asserting the later, flakier symptom is how a
     * test like this passes for months.
     */
    const queued = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? "{}") as Record<string, unknown[]>
    const queuedTables = Object.entries(queued).filter(([, rows]) => rows.length > 0).map(([table]) => table)
    expect(queuedTables, "the workspace was queued for upload before the person could answer").toEqual([])
    expect(sent, "and nothing was sent either").toEqual([])
  })

  test("and an edit made while it is still on screen sends only that edit", async () => {
    /**
     * The person is reading the banner and renames the workspace. That one change
     * is theirs to send; their two entries are still waiting on an answer.
     */
    const sent: Record<string, unknown[]>[] = []
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === "POST") {
        sent.push((JSON.parse(init.body ?? "{}") as { rows: Record<string, unknown[]> }).rows)
        return { ok: true, status: 200, json: async () => ({}) }
      }
      if (String(url).includes("since=")) return { ok: true, status: 200, json: async () => ({ rows: {}, cursor: NOW_ISO }) }
      return { ok: true, status: 200, json: async () => ({ rows: {}, cursor: NOW_ISO, empty: true, userId: USER }) }
    }))

    const view = render(<Harness initial={twoEntries()} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    await act(async () => { view.getByTestId("edit").click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })

    const entriesSent = sent.flatMap((rows) => (rows.timetrack_entries ?? []) as { id: string }[]).map((r) => r.id)
    expect(entriesSent, "the entries went up on the back of an unrelated edit").toEqual([])
    expect(sent.some((rows) => (rows.timetrack_workspaces ?? []).length > 0), "the person's own edit was not sent").toBe(true)
  })
})

describe("leaving the tracker with an upload in the air", () => {
  test("the dead instance does not empty the live instance's queue", async () => {
    /**
     * ONLY THE FIRST POST IS HELD, AND THAT DETAIL IS THE TEST.
     *
     * The first version of this held every POST behind one shared resolver, so the
     * second instance's request replaced the handle on the first — releasing it
     * freed the wrong request, the dead instance's answer never arrived, and the
     * test passed against the broken code AND against both fixes. It asserted
     * nothing at all. What has to be arranged is precisely: A's request still in
     * the air, B mounted and holding a queued edit, and then A's answer landing.
     */
    let releaseFirst: (() => void) | null = null
    let posts = 0
    /**
     * The adoption answer is a COMPLETE row set — what the server actually sends.
     * An earlier version answered `{}`, which is not "the same as what this
     * browser holds" but "an empty account": adoption then replaced the workspace
     * with a fresh one and the sequence under test never occurred. The test passed,
     * green, against both the broken code and the fix.
     */
    const held = twoEntries()
    const serverCopy = stateToRows(held, USER)
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { method?: string }) => {
      if (init?.method === "POST") {
        posts++
        if (posts === 1) await new Promise<void>((resolve) => (releaseFirst = resolve))
        return { ok: true, status: 200, json: async () => ({}) }
      }
      if (String(url).includes("since=")) return { ok: true, status: 200, json: async () => ({ rows: {}, cursor: NOW_ISO }) }
      return { ok: true, status: 200, json: async () => ({ rows: serverCopy, cursor: NOW_ISO, empty: false, userId: USER }) }
    }))

    // A edits, and its upload is held in the air
    const a = render(<Harness initial={held} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    await act(async () => { a.getByTestId("edit").click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(posts, "A's upload never went out, so nothing is in the air to race").toBe(1)

    // the person navigates away from the tracker and comes straight back
    act(() => { a.unmount() })
    const b = render(<Harness initial={held} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    await act(async () => { b.getByTestId("edit").click() })
    // 400ms: queued, still inside the 800ms debounce, so B has sent nothing
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })

    const beforeTheGhost = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? "{}") as Record<string, unknown[]>
    expect(
      Object.values(beforeTheGhost).some((rows) => rows.length > 0),
      "B had nothing queued, so there is nothing for the dead instance to destroy",
    ).toBe(true)

    // now A's request finally answers, on behalf of a component that is gone
    await act(async () => { releaseFirst?.(); await vi.advanceTimersByTimeAsync(50) })

    const afterTheGhost = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? "{}") as Record<string, unknown[]>
    expect(
      Object.values(afterTheGhost).some((rows) => rows.length > 0),
      "the unmounted instance emptied the live instance's queue — the badge promises work that is no longer on disk",
    ).toBe(true)
  })
})
