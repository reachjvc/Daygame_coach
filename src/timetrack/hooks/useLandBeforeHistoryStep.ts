"use client"

/**
 * LAND AN EDIT BEFORE BACK OR FORWARD MOVES THE PAGE.
 *
 * A field that holds an edit for a moment (`useDebouncedCommit`,
 * `useStagedEdit`) also lands it when it unmounts. When Back leaves the whole
 * tracker that is too late: the workspace that would store the edit and queue
 * it for the server is being taken down in the same moment, and the write
 * arrives nowhere. A description typed a moment before Back was lost
 * (Plans/time-tracker-like-toggl.md, Phase 3, "edits on Back").
 *
 * WHY NOT `popstate`. The router's own `popstate` listener was attached when the
 * app started, and it takes the page down inside that event: measured in
 * Chrome, a listener the tracker attached later — capture phase or not — was
 * never reached. The Navigation API's `navigate` event fires before any of
 * that, for every Back and Forward, while the page is still whole. `flushSync`
 * makes the edit's state update, and the effects that store it and queue it
 * for the server, finish inside the event, before the router moves.
 *
 * `popstate` (capture phase) stays as the fallback for a browser without the
 * Navigation API, where it helps whenever the router is slower than it is in
 * Chrome. Landing twice is harmless: each caller's `land` does nothing once
 * nothing is pending.
 */

import { useEffect, useRef } from "react"
import { flushSync } from "react-dom"

export function useLandBeforeHistoryStep(land: () => void): void {
  const latest = useRef(land)
  latest.current = land

  useEffect(() => {
    const run = () => flushSync(() => latest.current())
    const onNavigate = (event: Event) => {
      if ((event as Event & { navigationType?: string }).navigationType === "traverse") run()
    }
    const navigation = (window as { navigation?: EventTarget }).navigation
    navigation?.addEventListener("navigate", onNavigate)
    window.addEventListener("popstate", run, { capture: true })
    return () => {
      navigation?.removeEventListener("navigate", onNavigate)
      window.removeEventListener("popstate", run, { capture: true })
    }
  }, [])
}
