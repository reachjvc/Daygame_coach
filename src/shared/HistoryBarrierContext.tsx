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
}

const HistoryBarrierContext = createContext<HistoryBarrierContextValue | null>(null)

let nextBarrierId = 1

export function HistoryBarrierProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<Barrier[]>([])
  const suppressCountRef = useRef(0)

  useEffect(() => {
    const handlePopState = () => {
      if (suppressCountRef.current > 0) {
        suppressCountRef.current--
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

  const value = useMemo(
    () => ({ push, remove, removeMany, discard }),
    [push, remove, removeMany, discard],
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
