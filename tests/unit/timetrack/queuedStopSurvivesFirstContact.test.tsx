// @vitest-environment jsdom
/**
 * A STOP ANOTHER TAB HAS NOT SENT YET IS NOT UNDONE BY THIS TAB'S FIRST CONTACT.
 *
 * Found by the nightly WebKit lane (2026-10-14/15) and reproduced in both
 * engines by holding back one upload: tab A stops a timer, and its stop waits
 * in the shared upload queue for the debounce. A second tab opened in that
 * moment asks the account for everything, and the account still says the
 * timer is running. First contact let "the server win every row it knows
 * about", so the second tab rebuilt itself with the timer running, broadcast
 * that to tab A, and both tabs showed a stopped timer counting again.
 *
 * The queue (`PENDING_KEY`) is shared by every tab of the browser and is read
 * before first contact. A row in it is a change the server has not heard
 * about, so it is newer than the server's copy by definition, and it is laid
 * on top — the rule this tab's own changes since opening already followed.
 */

import { useCallback, useEffect, useState } from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { PENDING_KEY } from "@/src/timetrack/config"
import { useTimetrackSync } from "@/src/timetrack/hooks/useTimetrackSync"
import { diffRows } from "@/src/timetrack/syncService"
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

const stopped = entry(1, "2026-08-10", "09:00", "10:00", { description: "from tab A" })
const running = { ...stopped, stop: null, duration: -Math.floor(new Date(stopped.start).getTime() / 1000) }

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
  useTimetrackSync({ state, setState: apply, replaceState: replace, pushToast: toast })
  const timers = state?.entries.filter((e) => e.stop === null).map((e) => e.description) ?? []
  return <output data-testid="running">{JSON.stringify(timers)}</output>
}

test("first contact keeps a stop that waits in the shared queue, over the server's running copy", async () => {
  const before = baseState({ entries: [running] })
  const after = baseState({ entries: [stopped] })
  // what tab A queued when its stop was pressed, still unsent
  const queued = diffRows(stateToRows(before, USER), stateToRows(after, USER), NOW_ISO).changed
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(queued))

  // the account has not heard of the stop
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return { ok: true, status: 200, json: async () => ({}) }
      return {
        ok: true,
        status: 200,
        json: async () => ({ rows: stateToRows(before, USER), cursor: NOW_ISO, empty: false, userId: USER }),
      }
    }),
  )

  // the second tab opens on what the browser holds: the stopped entry
  const view = render(<Harness initial={after} />)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500)
  })

  expect(view.getByTestId("running").textContent, "the stopped timer came back").toBe("[]")
})
