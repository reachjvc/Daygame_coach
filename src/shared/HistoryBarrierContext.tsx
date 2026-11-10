"use client"

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime"

interface Barrier {
  id: number
  onBack: () => void
  /** An open sheet's step (useBackCloses), not a page's own sub-view. */
  sheet?: boolean
}

interface HistoryBarrierContextValue {
  /** Push a barrier onto the stack. Pushes a history entry. Returns barrier id. */
  push: (onBack: () => void, sheet?: boolean) => number
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
  /**
   * Run a navigation once the open sheets' steps are taken back, so it leaves
   * the history as if no sheet had pushed one. See `leaveSheets`.
   */
  leaveSheets: (navigate: () => void) => void
}

const HistoryBarrierContext = createContext<HistoryBarrierContextValue | null>(null)

let nextBarrierId = 1

export function HistoryBarrierProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<Barrier[]>([])
  const suppressCountRef = useRef(0)
  const deadRef = useRef(new Set<number>())
  /**
   * Sheets' steps already taken back, by Back or by closing (p10-retest-02).
   * The entry stays ahead of the page, so Forward lands on it: nothing to
   * reopen there, and the next Back would be a dead press. A Forward onto one
   * is taken back off it.
   */
  const spentRef = useRef(new Set<number>())
  /** Navigations waiting for `leaveSheets`' traversal to land. */
  const afterPopRef = useRef<(() => void)[]>([])
  /**
   * The address the last Back/Forward landed on; null once a link from a
   * sheet has gone to a page above an abandoned step. Tells a Forward onto
   * that step (from the page under it, the same address) from a Back onto it.
   */
  const lastHrefRef = useRef<string | null>(null)
  /**
   * Steps opened while one of our own traversals is on its way, not written
   * yet (p10-retest-01). A row of one sheet that opens another closes the
   * first in the same moment: its step's history.back() is still on its way
   * when the second sheet would push, and the browser took that Back from
   * where it was when asked, so it landed on the page's own entry, under the
   * new step. The new sheet stayed open with no step of its own, and Back left
   * the page. Written once the traversal has landed.
   */
  const unwrittenRef = useRef<number[]>([])

  const writeWaiting = useCallback(() => {
    if (suppressCountRef.current > 0) return
    const ids = unwrittenRef.current
    unwrittenRef.current = []
    for (const id of ids) window.history.pushState({ __barrier: id }, "")
  }, [])

  const runAfterPop = useCallback(() => {
    const queued = afterPopRef.current
    if (queued.length === 0) return
    afterPopRef.current = []
    // A task later: Next's own popstate listener restores the page the
    // traversal landed on, and a navigation started before that restore is
    // cancelled by it (app-router-instance: a restore pre-empts a navigation).
    setTimeout(() => {
      for (const navigate of queued) navigate()
    }, 0)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const cameFrom = lastHrefRef.current
      lastHrefRef.current = window.location.href

      if (suppressCountRef.current > 0) {
        suppressCountRef.current--
        writeWaiting()
        runAfterPop()
        return
      }

      // Landed on an abandoned barrier's entry: the same page, nothing to do
      // there, so take the press on past it, the way it was going: Forward
      // from the page under it (the same address) goes on to the page the
      // link opened, Back goes on down. Suppressed, because the step after it
      // lands on an entry nobody left.
      const landed = (window.history.state as { __barrier?: unknown } | null)?.__barrier
      if (typeof landed === "number" && deadRef.current.has(landed)) {
        suppressCountRef.current++
        if (cameFrom === window.location.href) window.history.forward()
        else window.history.back()
        return
      }

      if (typeof landed === "number" && spentRef.current.has(landed)) {
        suppressCountRef.current++
        window.history.back()
        return
      }

      const stack = stackRef.current
      if (stack.length === 0) return

      const top = stack.pop()!
      if (top.sheet) spentRef.current.add(top.id)
      top.onBack()
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [runAfterPop, writeWaiting])

  const push = useCallback((onBack: () => void, sheet = false): number => {
    const id = nextBarrierId++
    stackRef.current.push({ id, onBack, sheet })
    if (suppressCountRef.current > 0) unwrittenRef.current.push(id)
    else window.history.pushState({ __barrier: id }, "")
    return id
  }, [])

  /** Forget a step not written yet; true when it was one. */
  const unwrite = useCallback((id: number) => {
    const at = unwrittenRef.current.indexOf(id)
    if (at === -1) return false
    unwrittenRef.current.splice(at, 1)
    return true
  }, [])

  const remove = useCallback((id: number) => {
    const stack = stackRef.current
    const index = stack.findIndex((b) => b.id === id)
    if (index === -1) return

    const [gone] = stack.splice(index, 1)
    if (unwrite(id)) return // no entry to take back
    if (gone.sheet) spentRef.current.add(id)
    suppressCountRef.current++
    window.history.back()
  }, [unwrite])

  const removeMany = useCallback((ids: number[]) => {
    const stack = stackRef.current
    let removed = 0
    for (const id of ids) {
      const index = stack.findIndex((b) => b.id === id)
      if (index === -1) continue
      stack.splice(index, 1)
      if (!unwrite(id)) removed++
    }
    if (removed === 0) return
    // One traversal, therefore one popstate, therefore one suppression.
    suppressCountRef.current++
    window.history.go(-removed)
  }, [unwrite])

  const discard = useCallback((id: number) => {
    const stack = stackRef.current
    const index = stack.findIndex((b) => b.id === id)
    if (index === -1) return
    stack.splice(index, 1)
    unwrite(id)
  }, [unwrite])

  const abandon = useCallback((id: number) => {
    discard(id)
    deadRef.current.add(id)
    lastHrefRef.current = null
  }, [discard])

  /**
   * NAVIGATING FROM AN OPEN SHEET (alpha p9: "Change this program" and "Open
   * it in the box" did nothing; after "End program" Back showed the ended
   * program). A row that closes its sheet and calls router.replace at once:
   * the close took the sheet's step back, and that Back's popstate made Next
   * restore the page and cancel the replace still on its way. A replace that
   * did land took the sheet's step's place, so the page under it, the ended
   * program, stayed one Back behind.
   *
   * So the sheets' steps go first, in one traversal, the sheets close as if
   * Back had been pressed, and the navigation starts once that traversal has
   * landed: the history is as if no sheet had pushed a step. Only sheets: a
   * page's own sub-view steps are the page's to manage. Nothing waits when no
   * sheet's step is the newest entry.
   */
  const leaveSheets = useCallback((navigate: () => void) => {
    if (afterPopRef.current.length > 0) {
      // a traversal is already on its way (a second tap): after it, in order
      afterPopRef.current.push(navigate)
      return
    }
    const stack = stackRef.current
    const newest = (window.history.state as { __barrier?: unknown } | null)?.__barrier
    if (stack.length === 0 || !stack[stack.length - 1].sheet || stack[stack.length - 1].id !== newest) {
      navigate()
      return
    }
    const closing: Barrier[] = []
    while (stack.length > 0 && stack[stack.length - 1].sheet) closing.push(stack.pop()!)
    // A Forward must not land back on them, should a replace leave them above.
    for (const b of closing) deadRef.current.add(b.id)
    afterPopRef.current.push(navigate)
    suppressCountRef.current++
    window.history.go(-closing.length)
    for (const b of closing) b.onBack()
    // The popstate always comes for a same-document traversal; should it not,
    // the navigation still happens, not lost.
    setTimeout(() => {
      if (afterPopRef.current.length === 0) return
      suppressCountRef.current = Math.max(0, suppressCountRef.current - 1)
      writeWaiting()
      runAfterPop()
    }, 1000)
  }, [runAfterPop, writeWaiting])

  const value = useMemo(
    () => ({ push, remove, removeMany, discard, abandon, leaveSheets }),
    [push, remove, removeMany, discard, abandon, leaveSheets],
  )

  // Every router.push/replace under the provider goes through leaveSheets, so
  // no sheet row has to know it is in a sheet. Links do not use this router
  // (next/link navigates on its own); BottomSheet abandons the step for them.
  const router = useContext(AppRouterContext)
  const sheetSafeRouter = useMemo<AppRouterInstance | null>(
    () =>
      router && {
        ...router,
        push: (href, options) => leaveSheets(() => router.push(href, options)),
        replace: (href, options) => leaveSheets(() => router.replace(href, options)),
      },
    [router, leaveSheets],
  )

  const provided = (
    <HistoryBarrierContext.Provider value={value}>
      {children}
    </HistoryBarrierContext.Provider>
  )
  return sheetSafeRouter ? (
    <AppRouterContext.Provider value={sheetSafeRouter}>{provided}</AppRouterContext.Provider>
  ) : (
    provided
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
 * Close every open sheet (and question) at once, their steps taken back in one
 * traversal, then run `then`. Without a provider it just runs `then`; the
 * caller still closes its own layers, which is a no-op when this has already.
 */
export function useLeaveSheets(): (then: () => void) => void {
  const ctx = useContext(HistoryBarrierContext)
  return ctx ? ctx.leaveSheets : runNow
}
const runNow = (then: () => void) => then()

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
  const unmountPending = useRef(false)
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

  // IN THE SAME COMMIT AS THE CLOSE, not a passive effect (alpha run p12). A
  // passive effect ran ~12 ms after Escape; a page load started in that time
  // (an address typed, a full-page link, a reload) was then cancelled by this
  // step's history.back(), which the browser reports as an aborted load.
  useLayoutEffect(() => {
    if (!ctx) return
    if (open && idRef.current === null) {
      leavingRef.current = false
      idRef.current = ctx.push(() => {
        idRef.current = null
        onCloseRef.current()
      }, true)
    } else if (!open) {
      release()
    }
  }, [open, ctx, release])

  // Unmounted while open (a caller that mounts the sheet only while it is
  // open). Deferred to a microtask, after the commit: React's development
  // double-mount runs this cleanup and the effect again at once, and the effect
  // cancels it. A page navigation has pushed its own entry by then (Next writes
  // the history in an insertion effect of the same commit), so `release` leaves
  // the history alone. Not a timer: a page load started in that gap would be
  // cancelled by the step's history.back() (see above).
  useLayoutEffect(() => {
    unmountPending.current = false
    return () => {
      unmountPending.current = true
      queueMicrotask(() => {
        if (!unmountPending.current) return
        unmountPending.current = false
        release()
      })
    }
  }, [release])

  return useMemo(() => ({ leaving: () => { leavingRef.current = true } }), [])
}
