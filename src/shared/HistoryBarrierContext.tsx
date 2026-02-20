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

  const value = useMemo(() => ({ push, remove }), [push, remove])

  return (
    <HistoryBarrierContext.Provider value={value}>
      {children}
    </HistoryBarrierContext.Provider>
  )
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

  // Cleanup on unmount while active
  useEffect(() => {
    return () => {
      if (barrierIdRef.current !== null) {
        const id = barrierIdRef.current
        barrierIdRef.current = null
        ctx.remove(id)
      }
    }
  }, [ctx])
}
