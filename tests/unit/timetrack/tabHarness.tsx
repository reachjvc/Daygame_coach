/**
 * One browser tab running the tracker's two real hooks, driven from a test.
 *
 * `useTimetrack` keeps the workspace in this browser and tells the other tabs
 * about every change; `useTimetrackSync` keeps it in step with the account.
 * Two of these rendered at once are two tabs of ONE browser: they share
 * `localStorage` (the workspace, the upload queue and its bases), and they talk
 * through `BroadcastChannel`, which `installTabChannel` replaces with one that
 * delivers on the fake clock, so the order of messages is the test's to decide.
 */

import { useEffect } from "react"
import { act, render } from "@testing-library/react"
import { vi } from "vitest"

import { useTimetrack } from "@/src/timetrack/hooks/useTimetrack"
import { useTimetrackSync } from "@/src/timetrack/hooks/useTimetrackSync"
import type { TimetrackState } from "@/src/timetrack/types"

type Tracker = ReturnType<typeof useTimetrack>
type Sync = ReturnType<typeof useTimetrackSync>

function Tab({ onRender }: { onRender: (tracker: Tracker, sync: Sync) => void }) {
  const tracker = useTimetrack()
  const sync = useTimetrackSync({
    state: tracker.state,
    setState: tracker.setState,
    replaceState: tracker.actions.replaceState,
    pushToast: tracker.pushToast,
  })
  useEffect(() => onRender(tracker, sync))
  return null
}

export function openTab() {
  let tracker: Tracker | null = null
  let sync: Sync | null = null
  const view = render(
    <Tab
      onRender={(t, s) => {
        tracker = t
        sync = s
      }}
    />,
  )
  const ready = () => {
    if (!tracker) throw new Error("the tab has not rendered yet")
    return tracker
  }
  return {
    latest: (): TimetrackState => ready().state!,
    /** a change made in this tab, committed as a tap commits it */
    apply: (update: (current: TimetrackState) => TimetrackState) => act(() => ready().setState(update)),
    actions: () => ready().actions,
    sync: () => sync!,
    close: () => view.unmount(),
  }
}

/**
 * `BroadcastChannel` between the tabs of this test: a message reaches every
 * OTHER channel of the same name, one fake-clock tick later, in the order sent.
 */
export function installTabChannel() {
  const open = new Set<FakeChannel>()
  class FakeChannel {
    onmessage: ((event: MessageEvent) => void) | null = null
    constructor(readonly name: string) {
      open.add(this)
    }
    postMessage(data: unknown) {
      const copy = JSON.parse(JSON.stringify(data)) as unknown
      for (const other of open) {
        if (other === this || other.name !== this.name) continue
        setTimeout(() => other.onmessage?.({ data: copy } as MessageEvent), 0)
      }
    }
    close() {
      open.delete(this)
    }
  }
  vi.stubGlobal("BroadcastChannel", FakeChannel)
}
