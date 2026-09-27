/**
 * ASKING THE SERVER WHAT CHANGED MUST NOT UNDO WHAT YOU JUST DID.
 *
 * The owner pressed Stop and had to press it again. Reproduced on the product
 * route: a timer stopped, then came back running a second later with no input
 * at all — and the same in reverse, a timer started and then un-started.
 *
 * THE RACE. `pull` asks "what changed since my cursor", and the server answers
 * with rows as they were when it read them. `mergeIncoming` then takes the
 * server's version of every row EXCEPT those still queued for upload — there is
 * no comparison of which is newer. So:
 *
 *   1. the pull's GET goes out; the server reads the entry, still running;
 *   2. you press Stop — the entry stops, and is queued;
 *   3. the queue flushes and clears, so the row is no longer "queued";
 *   4. the answer from step 1 arrives and overwrites your stop with the running
 *      copy the server had before you pressed anything.
 *
 * It was almost invisible until the pull interval was repaired, because pulls
 * were starved to roughly none while anybody was working. Fixing that made a
 * dormant race a daily one.
 */

import { useCallback, useEffect, useState } from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { useTimetrackSync } from "@/src/timetrack/hooks/useTimetrackSync"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { isRunning, startTimer, stopTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

const USER = "user-1"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

beforeEach(() => window.localStorage.clear())

/** A workspace whose only entry is running — the shape you are about to stop. */
function withARunningTimer(): TimetrackState {
  const base = baseState({ entries: [entry(1, "2026-08-09", "09:00", "10:00", { description: "already tracked" })] })
  return startTimer(base, { description: "the one you stop", projectId: null, taskId: null, tagIds: [], billable: false }, NOW_ISO).state
}

interface Server {
  /** resolves the pull's GET, so the test decides when the stale answer lands */
  releasePull: () => void
  pullAsked: () => boolean
}

/** A server whose pulls are answered by hand, in whatever order the test wants. */
function stubSlowPulls(adoptionRows: unknown, answers: unknown[]) {
  const gates: Array<() => void> = []
  let asked = 0
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return { ok: true, status: 200, json: async () => ({}) }
      if (String(url).includes("since=")) {
        const mine = asked++
        await new Promise<void>((resolve) => gates.push(resolve))
        return {
          ok: true,
          status: 200,
          json: async () => ({ rows: answers[Math.min(mine, answers.length - 1)], cursor: `2026-08-10T12:00:0${mine}.000Z` }),
        }
      }
      return { ok: true, status: 200, json: async () => ({ rows: adoptionRows, cursor: NOW_ISO, empty: false, userId: USER }) }
    }),
  )
  return { answer: (i: number) => gates[i]?.(), asked: () => asked }
}

function stubServer(adoptionRows: unknown, staleRows: unknown): Server {
  let release: (() => void) | null = null
  let asked = false
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return { ok: true, status: 200, json: async () => ({}) }
      if (String(url).includes("since=")) {
        // the pull. Held open until the test lets it answer.
        asked = true
        await new Promise<void>((resolve) => (release = resolve))
        return { ok: true, status: 200, json: async () => ({ rows: staleRows, cursor: NOW_ISO }) }
      }
      return { ok: true, status: 200, json: async () => ({ rows: adoptionRows, cursor: NOW_ISO, empty: false, userId: USER }) }
    }),
  )
  return { releasePull: () => release?.(), pullAsked: () => asked }
}

function Harness({
  initial,
  onState,
  onReplace,
}: {
  initial: TimetrackState
  onState: (s: TimetrackState) => void
  onReplace?: (s: TimetrackState) => void
}) {
  const [state, setState] = useState<TimetrackState | null>(null)
  useEffect(() => setState(initial), [initial])
  useEffect(() => {
    if (state) onState(state)
  }, [state, onState])

  const apply = useCallback(
    (updater: (current: TimetrackState) => TimetrackState) => setState((c) => (c ? updater(c) : c)),
    [],
  )
  const replace = useCallback(
    (next: TimetrackState) => {
      onReplace?.(next)
      setState(next)
    },
    [onReplace],
  )
  const toast = useCallback(() => {}, [])
  useTimetrackSync({ state, setState: apply, replaceState: replace, pushToast: toast })

  return (
    <button data-testid="stop" onClick={() => apply((current) => stopTimer(current, new Date().toISOString()).state)}>
      stop
    </button>
  )
}

describe("a pull that was already in flight when you pressed Stop", () => {
  test("does not put the timer back", async () => {
    const running = withARunningTimer()
    // what the server read BEFORE the stop: the entry, still running
    const server = stubServer(stateToRows(running, USER), stateToRows(running, USER))

    let latest: TimetrackState = running
    const view = render(<Harness initial={running} onState={(s) => (latest = s)} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    // the pull goes out while the timer is still running
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(server.pullAsked(), "the pull never went out, so this test proves nothing").toBe(true)

    // you press Stop, and it is uploaded and acknowledged
    await act(async () => {
      view.getByTestId("stop").click()
      await new Promise((r) => setTimeout(r, 1200))
    })
    expect(latest.entries.some(isRunning), "the stop did not even apply locally").toBe(false)

    // now the answer from before the stop finally lands
    await act(async () => {
      server.releasePull()
      await new Promise((r) => setTimeout(r, 300))
    })

    expect(
      latest.entries.some(isRunning),
      "the pull's stale answer restarted the timer you had just stopped",
    ).toBe(false)
  })
})

describe("a pull that brings nothing new", () => {
  test("does not redraw the workspace for an echo of your own writes", async () => {
    /**
     * After this device uploads anything, the next pull's answer contains that
     * very row — so this used to replace the whole workspace, swapping every
     * object and rebuilding the list, for no change at all. A full redraw at
     * the moment of a tap is a tap that lands on a node that no longer exists,
     * which is the other half of "I had to press Stop twice".
     */
    const state = baseState({ entries: [entry(1, "2026-08-09", "09:00", "10:00", { description: "already tracked" })] })
    const rows = stateToRows(state, USER)
    const server = stubServer(rows, rows) // the pull answers with what we already hold

    const replaced = vi.fn()
    render(<Harness initial={state} onState={() => {}} onReplace={replaced} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    replaced.mockClear()

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
      await new Promise((r) => setTimeout(r, 20))
      server.releasePull()
      await new Promise((r) => setTimeout(r, 300))
    })

    expect(replaced, "the workspace was redrawn for rows it already had").not.toHaveBeenCalled()
  })
})

describe("two pulls in flight at once", () => {
  test("the older answer does not overwrite the newer one", async () => {
    /**
     * `pull` had no guard against being asked twice over — and the tab-focus
     * handler, the sixty-second interval and coming back online can all ask.
     * Two answers then applied in whatever order they arrived, so the one
     * computed FIRST could land LAST and undo what the second one carried.
     * Same family as the stale answer above, one device further out: this is
     * another device's change being reverted rather than your own.
     */
    const held = baseState({ entries: [entry(1, "2026-08-09", "09:00", "10:00", { description: "as it was" })] })
    const older = stateToRows(held, USER)
    const newer = stateToRows(
      baseState({ entries: [entry(1, "2026-08-09", "09:00", "10:00", { description: "changed on the other device" })] }),
      USER,
    )
    // pull 1 will answer with the OLD text, pull 2 with the NEW text
    const server = stubSlowPulls(older, [older, newer])

    let latest: TimetrackState = held
    render(<Harness initial={held} onState={(s) => (latest = s)} />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    // two pulls go out before either answers
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
      await new Promise((r) => setTimeout(r, 10))
      document.dispatchEvent(new Event("visibilitychange"))
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(server.asked(), "only one pull went out, so this test proves nothing").toBeGreaterThan(1)

    // The NEWER one answers first and is allowed to COMMIT — separate `act`
    // blocks on purpose, because inside one block React batches both answers
    // into a single render and the second one compares against a state that
    // has not happened yet. That batching is a property of the test harness,
    // not of a browser, and it hid this bug on the first attempt.
    await act(async () => {
      server.answer(1)
      await new Promise((r) => setTimeout(r, 150))
    })
    await act(async () => {
      server.answer(0)
      await new Promise((r) => setTimeout(r, 250))
    })

    expect(
      latest.entries[0].description,
      "an answer computed earlier overwrote a later one",
    ).toBe("changed on the other device")
  })
})
