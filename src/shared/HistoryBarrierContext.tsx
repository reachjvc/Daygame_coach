"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"

interface Barrier {
  id: number
  onBack: () => void
}

interface HistoryBarrierContextValue {
  /** Push a barrier onto the stack. Pushes a history entry. Returns barrier id. */
  push: (onBack: () => void) => number
  /**
   * Remove a barrier by id. If found in the stack (programmatic close),
   * splices it out, suppresses the next popstate, and calls history.back()
   * to consume the orphaned history entry. If not found (already consumed
   * by popstate), no-ops.
   */
  remove: (id: number) => void
  /**
   * Discard a barrier from the internal stack WITHOUT calling history.back().
   * Use this on component unmount during page navigation — the navigation
   * itself handles the history stack, and calling history.back() would
   * undo the navigation.
   */
  discard: (id: number) => void
  /**
   * Remove several barriers at once, consuming their history entries with ONE
   * `history.go(-n)` rather than n separate `history.back()` calls.
   *
   * Why it exists: a browser may coalesce rapid same-tick traversals into fewer
   * navigations. n calls to back() would then fire fewer than n popstate events,
   * leaving the suppression counter above zero -- and the user's next real Back
   * press would be swallowed. go(-n) is a single traversal and a single popstate,
   * so exactly one suppression is needed. Raised by code review against the
   * per-step barrier stack, where a flow can drop several levels in one move.
   */
  removeMany: (ids: number[]) => void
  /**
   * Drop a barrier whose entry something else has already pushed a page on top
   * of (a link in a sheet). Its entry cannot be taken out of the middle of the
   * history, so a later Back that lands on it steps over it.
   */
  abandon: (id: number) => void
}

const HistoryBarrierContext = createContext<HistoryBarrierContextValue | null>(null)

let nextBarrierId = 1

export function HistoryBarrierProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<Barrier[]>([])
  const suppressCountRef = useRef(0)
  const deadRef = useRef(new Set<number>())

  useEffect(() => {
    const handlePopState = () => {
      if (suppressCountRef.current > 0) {
        suppressCountRef.current--
        return
      }

      // Landed on an abandoned barrier's entry: the same page, nothing to do
      // there, so take the Back on past it. Suppressed, because the step after
      // it lands on an entry nobody left.
      const landed = (window.history.state as { __barrier?: unknown } | null)?.__barrier
      if (typeof landed === "number" && deadRef.current.has(landed)) {
        suppressCountRef.current++
        window.history.back()
        return
      }

      const stack = stackRef.current
      if (stack.length === 0) return

      const top = stack.pop()!
      top.onBack()
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const push = useCallback((onBack: () => void): number => {
    const id = nextBarrierId++
    stackRef.current.push({ id, onBack })
    window.history.pushState({ __barrier: id }, "")
    return id
  }, [])

  const remove = useCallback((id: number) => {
    const stack = stackRef.current
    const index = stack.findIndex((b) => b.id === id)
    if (index === -1) return

    stack.splice(index, 1)
    suppressCountRef.current++
    window.history.back()
  }, [])

  const removeMany = useCallback((ids: number[]) => {
    const stack = stackRef.current
    let removed = 0
    for (const id of ids) {
      const index = stack.findIndex((b) => b.id === id)
      if (index === -1) continue
      stack.splice(index, 1)
      removed++
    }
    if (removed === 0) return
    // One traversal, therefore one popstate, therefore one suppression.
    suppressCountRef.current++
    window.history.go(-removed)
  }, [])

  const discard = useCallback((id: number) => {
    const stack = stackRef.current
    const index = stack.findIndex((b) => b.id === id)
    if (index === -1) return
    stack.splice(index, 1)
  }, [])

  const abandon = useCallback((id: number) => {
    discard(id)
    deadRef.current.add(id)
  }, [discard])

  const value = useMemo(
    () => ({ push, remove, removeMany, discard, abandon }),
    [push, remove, removeMany, discard, abandon],
  )

  return (
    <HistoryBarrierContext.Provider value={value}>
      {children}
    </HistoryBarrierContext.Provider>
  )
}

/**
 * One history entry per level of depth, for flows that go more than one step deep.
 *
 * `useHistoryBarrier` takes a boolean, so it can only ever hold ONE entry. A
 * five-step flow that used it got one entry for all five steps: the flag flipped
 * false->true on leaving step 1 and stayed true. Measured on the live site
 * 2026-09-07, from step 3: the first Back went to step 2, the second threw the
 * user into step 5, the third into step 4 -- the browser had fallen through our
 * single entry into whatever URLs came before, and the flow re-read ?step= from
 * them. On Safari the second Back left the flow entirely, losing every answer.
 *
 * `depth` is how many Backs should stay inside the flow -- the step index, so 0
 * on the first screen. Pressing Back `depth` times walks back one screen at a
 * time; one more leaves the page, which is where the user came from.
 *
 * The ordering that matters: when popstate consumes an entry the provider has
 * already dropped it, so the callback drops OUR record of it BEFORE calling
 * onBack. Otherwise onBack lowers the depth, the effect sees a stack longer than
 * the depth, and "removes" an entry that is already gone -- which calls
 * history.back() a second time and skips a screen.
 */
export function useHistoryBarrierStack(depth: number, onBack: () => void) {
  const ctx = useContext(HistoryBarrierContext)
  if (!ctx) {
    throw new Error("useHistoryBarrierStack must be used within a HistoryBarrierProvider")
  }

  const idsRef = useRef<number[]>([])
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  // Never negative: `steps.indexOf(step)` returns -1 for a step that is not in
  // the list, and an unclamped -1 spins the shrink loop forever on an empty array.
  const target = Math.max(0, Math.floor(depth) || 0)

  useEffect(() => {
    while (idsRef.current.length < target) {
      const id = ctx.push(() => {
        idsRef.current.pop()
        onBackRef.current()
      })
      idsRef.current.push(id)
    }
    // Shrinking happens when the flow moved back on its own -- the in-page Back
    // button, or a jump of several steps -- so the orphaned entries have to be
    // consumed. Batched into one traversal: see removeMany.
    if (idsRef.current.length > target) {
      const dropped = idsRef.current.splice(target)
      ctx.removeMany(dropped)
    }
  }, [target, ctx])

  // On unmount the navigation itself owns the history stack; calling back() here
  // would undo it. Same reasoning as useHistoryBarrier's cleanup.
  useEffect(() => {
    return () => {
      for (const id of idsRef.current) ctx.discard(id)
      idsRef.current = []
    }
  }, [ctx])
}

/**
 * Intercepts the browser back button for in-page sub-views.
 *
 * When `active` is true, pushes a history entry. When the user presses
 * browser back, calls `onBack` instead of navigating away.
 *
 * When `active` becomes false (either via onBack or programmatically),
 * the pushed history entry is cleaned up automatically.
 *
 * Multiple barriers on one page stack in LIFO order.
 */
export function useHistoryBarrier(active: boolean, onBack: () => void) {
  const ctx = useContext(HistoryBarrierContext)
  if (!ctx) {
    throw new Error("useHistoryBarrier must be used within a HistoryBarrierProvider")
  }

  const barrierIdRef = useRef<number | null>(null)
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    if (active && barrierIdRef.current === null) {
      const id = ctx.push(() => onBackRef.current())
      barrierIdRef.current = id
    }

    if (!active && barrierIdRef.current !== null) {
      const id = barrierIdRef.current
      barrierIdRef.current = null
      ctx.remove(id)
    }
  }, [active, ctx])

  // Cleanup on unmount: discard barrier from stack without calling
  // history.back(). During navigation (e.g. server action redirect),
  // calling history.back() would undo the navigation itself.
  useEffect(() => {
    return () => {
      if (barrierIdRef.current !== null) {
        const id = barrierIdRef.current
        barrierIdRef.current = null
        ctx.discard(id)
      }
    }
  }, [ctx])
}

/**
 * BACK CLOSES A SHEET (alpha p10-sheets-01). Android's Back, or the browser's,
 * with a sheet open left the page: a changed audit answer was lost, and on a
 * page opened from a ping Back left the app. Like the time tracker's own entry
 * sheet, an open sheet is one step in the history: Back takes the step and
 * closes the sheet.
 *
 * Closed any other way (X, Escape, a tap outside, the caller unmounting it),
 * the step is taken back so it is not left behind as a dead Back press, and
 * only when it is still the newest entry: a link in the sheet has pushed its
 * page on top by then, and stepping back would undo the link. `leaving()` says
 * a link was followed; that entry is abandoned instead (see `abandon`).
 *
 * Unlike the other hooks here it works without a provider, doing nothing, so a
 * component test can render a sheet on its own.
 */
export function useBackCloses(open: boolean, onClose: () => void): { leaving: () => void } {
  const ctx = useContext(HistoryBarrierContext)
  const idRef = useRef<number | null>(null)
  const leavingRef = useRef(false)
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  const release = useCallback(() => {
    const id = idRef.current
    if (id === null || !ctx) return
    idRef.current = null
    const newest = (window.history.state as { __barrier?: unknown } | null)?.__barrier === id
    if (newest && !leavingRef.current) ctx.remove(id)
    else ctx.abandon(id)
    leavingRef.current = false
  }, [ctx])

  useEffect(() => {
    if (!ctx) return
    if (open && idRef.current === null) {
      leavingRef.current = false
      idRef.current = ctx.push(() => {
        idRef.current = null
        onCloseRef.current()
      })
    } else if (!open) {
      release()
    }
  }, [open, ctx, release])

  // Unmounted while open (a caller that mounts the sheet only while it is
  // open). Deferred one task: React's development double-mount runs this
  // cleanup and the effect again at once, and the effect cancels it. A page
  // navigation has pushed its own entry by the time it runs, so `release`
  // leaves the history alone then.
  useEffect(() => {
    if (unmountTimer.current !== null) {
      clearTimeout(unmountTimer.current)
      unmountTimer.current = null
    }
    return () => {
      unmountTimer.current = setTimeout(() => {
        unmountTimer.current = null
        release()
      }, 0)
    }
  }, [release])

  return useMemo(() => ({ leaving: () => { leavingRef.current = true } }), [])
}
