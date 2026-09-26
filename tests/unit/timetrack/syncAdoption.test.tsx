/**
 * WHAT HAPPENS IN THE FIRST SECOND AFTER THE TRACKER OPENS.
 *
 * This is the most dangerous code in the slice and it had no direct test — the
 * sync tests next door exercise the pure rules in `syncService`, never the hook
 * that drives them. The comments inside it record two bugs that reached real
 * data: a running timer that vanished when the server answered, and an adoption
 * that concluded every row on the server had been deleted and sent exactly that.
 *
 * The case these tests pin is the ordinary one. The usual outcome of opening the
 * tracker is that this device is already up to date, and until now that was
 * handled the expensive way: the whole workspace was replaced anyway, so every
 * screen re-rendered and the entry list was rebuilt after first paint. On a
 * phone that settle is visible.
 *
 * `replaceState` is the observable contract — it is the only thing that redraws
 * — so that is what is asserted, in both directions.
 */

import { useEffect, useState } from "react"
import { cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { PENDING_KEY } from "@/src/timetrack/config"
import { useTimetrackSync } from "@/src/timetrack/hooks/useTimetrackSync"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

const USER = "user-1"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
})

/** A workspace with real content, so "nothing differs" is a claim about something */
function localState(): TimetrackState {
  return baseState({
    entries: [
      entry(1, "2026-08-09", "09:00", "10:00", { description: "morning writing" }),
      entry(2, "2026-08-10", "11:00", "11:30", { description: "standup", projectId: "31" }),
    ],
  })
}

/**
 * Answers the hook's one GET. POSTs are accepted and ignored: whether anything
 * is uploaded is a different question from whether the screen was redrawn.
 */
function serveRows(rows: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return { ok: true, status: 200, json: async () => ({}) }
      return {
        ok: true,
        status: 200,
        json: async () => ({ rows, cursor: NOW_ISO, empty: false, userId: USER }),
      }
    }),
  )
}

function Harness({
  initial,
  onReplace,
}: {
  initial: TimetrackState
  onReplace: (next: TimetrackState) => void
}) {
  const [state, setState] = useState<TimetrackState | null>(null)
  // the real shell loads from this browser in an effect, so state starts null
  useEffect(() => setState(initial), [initial])

  const sync = useTimetrackSync({
    state,
    setState: (updater) => setState((current) => (current ? updater(current) : current)),
    replaceState: (next) => {
      onReplace(next)
      setState(next)
    },
    pushToast: () => {},
  })

  return <span data-testid="status">{sync.status}</span>
}

describe("opening the tracker when the server has nothing new", () => {
  test("does not replace the workspace, so nothing is redrawn", async () => {
    const initial = localState()
    serveRows(stateToRows(initial, USER))
    const onReplace = vi.fn()

    const { getByTestId } = render(<Harness initial={initial} onReplace={onReplace} />)
    await waitFor(() => expect(getByTestId("status").textContent).toBe("synced"))

    expect(onReplace, "the workspace was replaced with an identical copy").not.toHaveBeenCalled()
  })

  test("and it still says it is saved, rather than sitting on 'starting'", async () => {
    const initial = localState()
    serveRows(stateToRows(initial, USER))

    const { getByTestId } = render(<Harness initial={initial} onReplace={() => {}} />)
    await waitFor(() => expect(getByTestId("status").textContent).toBe("synced"))
  })

  test("nothing is queued for upload either", async () => {
    const initial = localState()
    serveRows(stateToRows(initial, USER))

    const { getByTestId } = render(<Harness initial={initial} onReplace={() => {}} />)
    await waitFor(() => expect(getByTestId("status").textContent).toBe("synced"))

    // A device that is already in step must not push its whole workspace back up
    const queued = window.localStorage.getItem(PENDING_KEY)
    expect(queued === null || queued === "{}").toBe(true)
  })
})

describe("opening the tracker when the server HAS something new", () => {
  test("replaces the workspace, because the server wins", async () => {
    const initial = localState()
    const richer: TimetrackState = {
      ...initial,
      entries: [
        ...initial.entries,
        entry(3, "2026-08-10", "14:00", "15:00", { description: "from another device" }),
      ],
    }
    serveRows(stateToRows(richer, USER))
    const onReplace = vi.fn()

    const { getByTestId } = render(<Harness initial={initial} onReplace={onReplace} />)
    await waitFor(() => expect(getByTestId("status").textContent).toBe("synced"))

    await waitFor(() => expect(onReplace).toHaveBeenCalled())
    const adopted = onReplace.mock.calls[0][0] as TimetrackState
    expect(adopted.entries.map((e) => e.description)).toContain("from another device")
  })

  /**
   * The bug the hook's own comment records: press Start inside the first second
   * and the running timer used to vanish when the server's copy landed.
   *
   * The sequence has to be the real one, which took two attempts to write. The
   * first version created the timer in the SAME state the hook first saw, which
   * makes it part of what this browser held when the page opened — and for that,
   * the server's copy is deliberately the winner. The timer has to appear AFTER
   * the hook has read the state and WHILE the response is still in the air, so
   * the response is held open until the test releases it.
   */
  test("a timer started while the server was still answering survives the answer", async () => {
    const initial = localState()

    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const rows = stateToRows(initial, USER)
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string }) => {
        if (init?.method === "POST") return { ok: true, status: 200, json: async () => ({}) }
        await held
        return { ok: true, status: 200, json: async () => ({ rows, cursor: NOW_ISO, empty: false, userId: USER }) }
      }),
    )

    let startTheTimer: () => void = () => {}

    function StartingHarness() {
      const [state, setState] = useState<TimetrackState | null>(null)
      useEffect(() => setState(initial), [])
      startTheTimer = () =>
        setState((current) =>
          current
            ? startTimer(
                current,
                { description: "pressed at once", projectId: null, taskId: null, tagIds: [], billable: false },
                "2026-08-10T12:00:00.000Z",
              ).state
            : current,
        )
      const sync = useTimetrackSync({
        state,
        setState: (updater) => setState((current) => (current ? updater(current) : current)),
        replaceState: setState,
        pushToast: () => {},
      })
      return (
        <span data-testid="status">
          {sync.status}:{state?.entries.some((e) => e.description === "pressed at once") ? "kept" : "lost"}
        </span>
      )
    }

    const { getByTestId } = render(<StartingHarness />)
    // the hook has the state and is waiting on the network
    await waitFor(() => expect(getByTestId("status").textContent).toContain("lost"))
    startTheTimer()
    await waitFor(() => expect(getByTestId("status").textContent).toContain("kept"))

    release()
    await waitFor(() => expect(getByTestId("status").textContent).toContain("synced"))
    expect(getByTestId("status").textContent, "the timer vanished when the server answered").toContain("kept")
  })
})
