/**
 * One device running the real sync hook, driven from a test.
 *
 * `apply` is what a tap does: an update to the workspace, committed the way the
 * tracker commits one. `latest` is what the screen would show. Rendering a second
 * one after unmounting the first is a phone closing the app and opening it again:
 * the queue it left in this browser's storage is read back, as in the product.
 *
 * `account` is the page knowing who is signed in, as `/time` does: the browser's
 * copy is claimed for it first (`claimBrowserCopy`, which `TimetrackScreen` runs),
 * and the hook keeps and sends that account's changes only.
 *
 * `hear` is a change that arrived from another tab of this browser rather than
 * a tap here, as `useTimetrack` tells the hook (`fromAnotherTab`).
 */

import { useCallback, useEffect, useState } from "react"
import { act, render } from "@testing-library/react"
import { vi } from "vitest"

import { claimBrowserCopy } from "@/src/timetrack/browserOwner"
import { useTimetrackSync } from "@/src/timetrack/hooks/useTimetrackSync"
import type { TimetrackState } from "@/src/timetrack/types"

type Update = (current: TimetrackState) => TimetrackState

type Sync = ReturnType<typeof useTimetrackSync>

function Device({
  initial,
  onState,
  onApply,
  onSync,
  onToast,
  account,
  fromAnotherTab,
}: {
  account?: string
  fromAnotherTab: (state: TimetrackState) => boolean
  initial: TimetrackState
  onState: (state: TimetrackState) => void
  onApply: (apply: (update: Update) => void) => void
  onSync: (sync: Sync) => void
  onToast: (text: string) => void
}) {
  const [state, setState] = useState<TimetrackState | null>(null)
  useEffect(() => setState(initial), [initial])
  useEffect(() => {
    if (state) onState(state)
  }, [state, onState])
  const apply = useCallback((update: Update) => setState((current) => (current ? update(current) : current)), [])
  useEffect(() => onApply(apply), [apply, onApply])
  const replace = useCallback((next: TimetrackState) => setState(next), [])
  const toast = useCallback((text: string) => onToast(text), [onToast])
  const sync = useTimetrackSync({ state, setState: apply, replaceState: replace, pushToast: toast, account, fromAnotherTab })
  useEffect(() => {
    onSync(sync)
  })
  return null
}

export function renderDevice(initial: TimetrackState, { account }: { account?: string } = {}) {
  if (account) claimBrowserCopy(account)
  let latest = initial
  let applyRef: ((update: Update) => void) | null = null
  let syncRef: Sync | null = null
  const toasts: string[] = []
  const onToast = (text: string) => toasts.push(text)
  const heard = new WeakSet<TimetrackState>()
  const fromAnotherTab = (state: TimetrackState) => heard.has(state)
  const view = render(
    <Device
      initial={initial}
      onState={(state) => (latest = state)}
      onApply={(apply) => (applyRef = apply)}
      onSync={(sync) => (syncRef = sync)}
      onToast={onToast}
      account={account}
      fromAnotherTab={fromAnotherTab}
    />,
  )
  return {
    latest: () => latest,
    /** what the hook hands the screen: the badge's status, the check, `checkNow` */
    sync: () => {
      if (!syncRef) throw new Error("the device has not rendered yet")
      return syncRef
    },
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
    /** every toast the hook has shown on this device, oldest first */
    toasts: () => [...toasts],
    /** A change another tab of this browser made, heard here: not this device's own edit */
    hear: (update: Update) => {
      const apply = applyRef
      if (!apply) throw new Error("the device has not mounted yet")
      act(() =>
        apply((current) => {
          const next = update(current)
          heard.add(next)
          return next
        }),
      )
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
