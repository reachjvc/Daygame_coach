/**
 * WHAT THE BROWSER DOES WITH A REFUSAL IT CANNOT MATCH.
 *
 * A 4xx means "this will never be accepted", so the browser drops the named rows
 * from its queue and sends the rest. Two ways that went wrong, both measured:
 *
 *  - it matched `String(row.id)`, and three tables have no `id` column. A refusal
 *    in one of them matched nothing, so nothing was dropped — and the row sat in
 *    the queue for ever, taking every later edit down with it, because a batch is
 *    all or nothing. That is how one mistyped end time on a TAGGED entry stopped
 *    an account saving for good. A reload does not help: the queue is read back
 *    from `localStorage`, and "Reload to resync" is the only thing the person is
 *    told.
 *
 *  - the immediate re-flush fired whenever the server named ANYTHING, whether or
 *    not a row was actually dropped. A name the browser could not match therefore
 *    became one request per round trip, for ever, with an error toast each time:
 *    4,201 POSTs in five simulated seconds. Same family as the 19,201-POST
 *    incident, third occurrence.
 */

import { useCallback, useEffect, useState } from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { useTimetrackSync } from "@/src/timetrack/hooks/useTimetrackSync"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { PENDING_KEY } from "@/src/timetrack/config"

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

function Harness({ initial, onState }: { initial: TimetrackState; onState: (s: TimetrackState) => void }) {
  const [state, setState] = useState<TimetrackState | null>(null)
  useEffect(() => setState(initial), [initial])
  useEffect(() => { if (state) onState(state) }, [state, onState])
  const apply = useCallback((u: (c: TimetrackState) => TimetrackState) => setState((c) => (c ? u(c) : c)), [])
  const replace = useCallback((next: TimetrackState) => setState(next), [])
  const toasts: string[] = []
  const toast = useCallback((text: string) => { toasts.push(text) }, [])
  const sync = useTimetrackSync({ state, setState: apply, replaceState: replace, pushToast: toast })
  return (
    <>
      <span data-testid="pending">{sync.pendingCount}</span>
      <button data-testid="edit" onClick={() => apply((c) => ({ ...c, workspace: { ...c.workspace, name: `renamed ${Date.now()}` } }))}>edit</button>
      {/*
        A real tag LINK, which is the row the refusal names. The first version of the
        test below clicked `edit` instead — which renames the workspace — so the queue
        held a `timetrack_workspaces` row while the refusal named
        `timetrack_entry_tags`, nothing could match in either version of the code, and
        the test passed identically against the bug and the fix.
      */}
      <button
        data-testid="tag-second-entry"
        onClick={() =>
          apply((c) => ({
            ...c,
            entries: c.entries.map((e, i) => (i === 1 ? { ...e, tagIds: [...e.tagIds, "50"], at: new Date().toISOString() } : e)),
          }))
        }
      >
        tag
      </button>
    </>
  )
}

/** A server that adopts, then refuses every POST with the given table and names. */
function stubRefusing(adoption: unknown, table: string, ids: string[]) {
  let posts = 0
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { method?: string }) => {
    if (init?.method === "POST") {
      posts++
      return { ok: false, status: 400, statusText: "Bad Request", json: async () => ({ error: "refused", table, ids }) }
    }
    if (String(url).includes("since=")) return { ok: true, status: 200, json: async () => ({ rows: {}, cursor: NOW_ISO }) }
    return { ok: true, status: 200, json: async () => ({ rows: adoption, cursor: NOW_ISO, empty: false, userId: USER }) }
  }))
  return { posts: () => posts }
}

const withATag = () =>
  baseState({
    entries: [
      entry(1, "2026-08-10", "09:00", "10:00", { description: "a client call", tagIds: ["50"] }),
      entry(2, "2026-08-11", "09:00", "10:00", { description: "another call", tagIds: [] }),
    ],
  })

describe("a refusal naming rows in a table with no id column", () => {
  /**
   * This is the case the whole change exists for: `timetrack_entry_tags` is keyed by
   * the pair it joins, so a refusal used to name `""` and the browser could never
   * find the row to drop. The queue then held it for ever and took every later edit
   * down with it, because a batch is all or nothing.
   *
   * The first version of this test clicked a button that renames the WORKSPACE while
   * the refusal named `timetrack_entry_tags`, so nothing could match in either
   * version of the code — it passed against the bug and against the fix, and its two
   * assertions were "at least one POST happened" and "the state is truthy". A
   * reviewer caught it by running it against the pre-fix hook. What it needed was to
   * queue the row the refusal actually names.
   */
  test("drops the named tag link, and the work behind it still gets through", async () => {
    const initial = withATag()
    const refusedKey = `2:50` // the pair the second entry's new tag makes
    stubRefusing(stateToRows(initial, USER), "timetrack_entry_tags", [refusedKey])
    let latest = initial
    const view = render(<Harness initial={initial} onState={(s) => (latest = s)} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })

    // the tag link the server will refuse
    await act(async () => { view.getByTestId("tag-second-entry").click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })

    const queued = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? "{}") as Record<string, unknown[]>
    const links = (queued.timetrack_entry_tags ?? []) as { entry_id: string; tag_id: string }[]
    expect(
      links.some((l) => `${l.entry_id}:${l.tag_id}` === refusedKey),
      "the refused link is still queued, so every later edit will be refused behind it",
    ).toBe(false)
    expect(latest.entries[1].tagIds, "the tag was taken off the entry in the browser too").toContain("50")
  })

  test("and an ordinary edit made afterwards reaches the server", async () => {
    const initial = withATag()
    const server = stubRefusing(stateToRows(initial, USER), "timetrack_entry_tags", ["2:50"])
    const view = render(<Harness initial={initial} onState={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })

    await act(async () => { view.getByTestId("tag-second-entry").click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    const afterRefusal = server.posts()

    await act(async () => { view.getByTestId("edit").click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })

    expect(server.posts(), "nothing written after the refusal was even offered").toBeGreaterThan(afterRefusal)
  })
})

describe("a refusal whose names match nothing in the queue", () => {
  test("does not turn into a request per round trip", async () => {
    /**
     * The flood. `"e9:t9"` is a well-formed row key for a row this browser does
     * not have, which is exactly the case the old code treated as "something was
     * dropped, send the rest now".
     */
    const initial = withATag()
    const server = stubRefusing(stateToRows(initial, USER), "timetrack_entry_tags", ["e9:t9"])
    render(<Harness initial={initial} onState={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })

    const view = document.querySelector('[data-testid="edit"]') as HTMLButtonElement
    await act(async () => { view.click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(server.posts(), `${server.posts()} POSTs in five seconds`).toBeLessThan(5)
  })

  test("and neither does a refusal that names nothing at all", async () => {
    const initial = withATag()
    const server = stubRefusing(stateToRows(initial, USER), "timetrack_entry_tags", [])
    render(<Harness initial={initial} onState={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })

    const view = document.querySelector('[data-testid="edit"]') as HTMLButtonElement
    await act(async () => { view.click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(server.posts(), `${server.posts()} POSTs in five seconds`).toBeLessThan(5)
  })
})

describe("one mistyped end time on a TAGGED entry", () => {
  /**
   * THE WHOLE CHAIN, WHICH IS WHAT MADE THIS WORTH FIXING.
   *
   *  1. The person logs a client call with a tag and mistypes the end time. The
   *     entry is refused by its check constraint. That part already worked: the
   *     server isolates it, names it by id, and the browser drops it.
   *  2. The orphan `(entry_id, tag_id)` link is still queued — a different table,
   *     untouched by step 1 — and now fails its foreign key. The server used to
   *     name it `""`, so the browser's drop branch was skipped and it stayed.
   *  3. Every ordinary edit afterwards joined the same all-or-nothing batch and
   *     was refused with it. Nothing that account wrote reached the server again,
   *     and reloading cannot help because the queue is read back from
   *     localStorage — while "Reload to resync" is the only thing the person is
   *     told.
   *
   * The server now reports row keys, so step 2 drops like step 1. This asserts
   * step 3: the ordinary work afterwards arrives.
   */
  test("does not stop everything written afterwards from reaching the server", async () => {
    const accepted: string[] = []
    const initial = withATag()

    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === "POST") {
        const rows = (JSON.parse(init.body ?? "{}") as { rows?: Record<string, Record<string, unknown>[]> }).rows ?? {}

        // the entry with the impossible times, refused by a check constraint
        if ((rows.timetrack_entries ?? []).some((r) => r.id === "99")) {
          return { ok: false, status: 400, json: async () => ({ error: "check constraint", table: "timetrack_entries", ids: ["99"] }) }
        }
        // its orphan tag link, refused by a foreign key — named as a ROW KEY now
        if ((rows.timetrack_entry_tags ?? []).some((r) => r.entry_id === "99")) {
          return { ok: false, status: 400, json: async () => ({ error: "fkey", table: "timetrack_entry_tags", ids: ["99:50"] }) }
        }
        for (const list of Object.values(rows)) for (const row of list) accepted.push(String(row.id ?? `${row.entry_id}:${row.tag_id}`))
        return { ok: true, status: 200, json: async () => ({}) }
      }
      if (String(url).includes("since=")) return { ok: true, status: 200, json: async () => ({ rows: {}, cursor: NOW_ISO }) }
      return { ok: true, status: 200, json: async () => ({ rows: stateToRows(initial, USER), cursor: NOW_ISO, empty: false, userId: USER }) }
    }))

    function Chain() {
      const [state, setState] = useState<TimetrackState | null>(null)
      useEffect(() => setState(initial), [])
      const apply = useCallback((u: (c: TimetrackState) => TimetrackState) => setState((c) => (c ? u(c) : c)), [])
      const replace = useCallback((next: TimetrackState) => setState(next), [])
      useTimetrackSync({ state, setState: apply, replaceState: replace, pushToast: useCallback(() => {}, []) })
      return (
        <>
          <button
            data-testid="mistype"
            onClick={() =>
              apply((c) => ({
                ...c,
                // an end before its start, with a tag on it
                entries: [...c.entries, { ...c.entries[0], id: "99", description: "client call", tagIds: ["50"], start: "2026-08-10T11:00:00.000Z", stop: "2026-08-10T10:00:00.000Z" }],
              }))
            }
          >
            mistype
          </button>
          <button data-testid="note" onClick={() => apply((c) => ({ ...c, workspace: { ...c.workspace, name: `note ${Date.now()}` } }))}>note</button>
        </>
      )
    }

    const view = render(<Chain />)
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })

    await act(async () => { view.getByTestId("mistype").click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    accepted.length = 0
    // an hour of ordinary work afterwards
    for (let i = 0; i < 3; i++) {
      await act(async () => { view.getByTestId("note").click() })
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    }

    expect(
      accepted.length,
      "nothing written after the mistype reached the server — the account has stopped saving",
    ).toBeGreaterThan(0)
  })
})
