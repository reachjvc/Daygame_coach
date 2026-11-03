/**
 * One device running the real sync hook, driven from a test.
 *
 * `apply` is what a tap does: an update to the workspace, committed the way the
 * tracker commits one. `latest` is what the screen would show. Rendering a second
 * one after unmounting the first is a phone closing the app and opening it again:
 * the queue it left in this browser's storage is read back, as in the product.
 */

import { useCallback, useEffect, useState } from "react"
import { act, render } from "@testing-library/react"
import { vi } from "vitest"

import { useTimetrackSync } from "@/src/timetrack/hooks/useTimetrackSync"
import type { TimetrackState } from "@/src/timetrack/types"

type Update = (current: TimetrackState) => TimetrackState

function Device({
  initial,
  onState,
  onApply,
}: {
  initial: TimetrackState
  onState: (state: TimetrackState) => void
  onApply: (apply: (update: Update) => void) => void
}) {
  const [state, setState] = useState<TimetrackState | null>(null)
  useEffect(() => setState(initial), [initial])
  useEffect(() => {
    if (state) onState(state)
  }, [state, onState])
  const apply = useCallback((update: Update) => setState((current) => (current ? update(current) : current)), [])
  useEffect(() => onApply(apply), [apply, onApply])
  const replace = useCallback((next: TimetrackState) => setState(next), [])
  const toast = useCallback(() => {}, [])
  useTimetrackSync({ state, setState: apply, replaceState: replace, pushToast: toast })
  return null
}

export function renderDevice(initial: TimetrackState) {
  let latest = initial
  let applyRef: ((update: Update) => void) | null = null
  const view = render(
    <Device initial={initial} onState={(state) => (latest = state)} onApply={(apply) => (applyRef = apply)} />,
  )
  return {
    latest: () => latest,
    /**
     * Inside `act`, so the change commits and its effects run now, as after a
     * tap. Outside it, React leaves the effects for the end of the NEXT `act` —
     * the upload's 800ms debounce then starts from whenever that is, and a test
     * waiting 1.5s after the tap was measuring the harness, not the hook.
     */
    apply: (update: Update) => {
      const apply = applyRef
      if (!apply) throw new Error("the device has not mounted yet")
      act(() => apply(update))
    },
    unmount: () => view.unmount(),
  }
}

/** Let the hook's own timers run: the debounce, the retries, answers landing. The caller owns fake timers. */
export async function wait(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}
