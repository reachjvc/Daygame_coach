"use client"

import { createPortal } from "react-dom"
import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

/**
 * LOG OUT, LOADED WHEN IT IS WANTED (Plans/tests-green-and-fast.md, F3).
 *
 * `LogOutButton` pulls the time tracker's sync code, the audit queue and the
 * Supabase client into its chunk (it must look at what is waiting to be sent
 * before it lets anyone go). Drawn in the frame of every signed-in page, that
 * made every first screen carry about 75 KB nobody had asked for yet.
 *
 * So the frame draws the same button from a light stand-in, and the real one
 * (`LogOutButton`, unchanged) is fetched in this order, whichever comes first:
 *   1. a pointer, a touch or focus comes near the button;
 *   2. `FETCH_AFTER_MS` after the page has loaded, when the browser is idle:
 *      the first screen is done by then, and this is what keeps Log Out
 *      working for somebody who loses signal before touching it (Log Out with
 *      no signal must still name what is waiting; it cannot fetch code then);
 *   3. the press itself. A press made before the real one has arrived is not
 *      lost: it is replayed as soon as it mounts.
 *
 * If the code cannot be fetched at all (no signal in the first seconds, then a
 * press), nothing is logged out and nothing is lost: the button says so and a
 * second press tries again. Nothing is removed; it is only loaded later.
 */

import { isChunkFetchFailure } from "./chunkFetchFailure"
import { FETCH_AFTER_MS } from "./logOutFetchDelay"

type Press = { onClick: () => void; busy: boolean }

const loadReal = () => import("./LogOutButton")

export function LazyLogOutButton({ children }: { children: (press: Press) => ReactNode }) {
  const [wanted, setWanted] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const pressed = useRef(false)
  const Real = useMemo(() => lazy(() => loadReal().then((m) => ({ default: m.LogOutButton }))), [attempt])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let idle: number | undefined
    const start = () => {
      timer = setTimeout(() => {
        const go = () => void loadReal().catch(() => {})
        if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(go, { timeout: 5000 })
        else go()
      }, FETCH_AFTER_MS)
    }
    if (document.readyState === "complete") start()
    else window.addEventListener("load", start, { once: true })
    return () => {
      window.removeEventListener("load", start)
      clearTimeout(timer)
      if (idle !== undefined) window.cancelIdleCallback?.(idle)
    }
  }, [])

  if (!wanted) {
    const warm = () => void loadReal().catch(() => {})
    return (
      <span className="contents" onPointerEnter={warm} onFocusCapture={warm} onTouchStart={warm}>
        {children({
          busy: false,
          onClick: () => {
            pressed.current = true
            setWanted(true)
          },
        })}
      </span>
    )
  }
  const again = (
    <>
      {children({
        busy: false,
        onClick: () => {
          pressed.current = true
          setAttempt((n) => n + 1)
        },
      })}
      {/* Seen, not only heard. Fixed to the screen through a portal (the header is blurred, which would pin a fixed child to itself), so nothing in the header moves; above the phone's tab bar */}
      {createPortal(
      <p
        role="alert"
        data-testid="log-out-not-loaded"
        className="fixed inset-x-4 bottom-20 z-[60] rounded-md border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive shadow-lg sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-sm"
      >
        Log Out could not load, probably because there is no signal. You are still signed in and nothing was lost. Press Log Out to try again.
      </p>,
      document.body,
      )}
    </>
  )
  return (
    <FailedToLoad fallback={again} key={attempt}>
      <Suspense fallback={children({ busy: true, onClick: () => {} })}>
        <Real>{(press) => <Replay press={press} pressed={pressed}>{children}</Replay>}</Real>
      </Suspense>
    </FailedToLoad>
  )
}

/** Catches only the fetch of the real button's code failing; any other error goes on to the error page. A fresh `key` starts again. */
class FailedToLoad extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean; other: unknown }> {
  state = { failed: false, other: null as unknown }
  static getDerivedStateFromError(error: unknown) {
    return isChunkFetchFailure(error) ? { failed: true, other: null } : { failed: false, other: error ?? new Error("Log Out failed") }
  }
  render() {
    if (this.state.other) throw this.state.other
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Hands the real button's press to the frame's markup, and presses it once if the person already did. */
function Replay({
  press,
  pressed,
  children,
}: {
  press: Press
  pressed: { current: boolean }
  children: (press: Press) => ReactNode
}) {
  const latest = useRef(press.onClick)
  latest.current = press.onClick
  useEffect(() => {
    if (!pressed.current) return
    pressed.current = false
    latest.current()
  }, [pressed])
  return <>{children(press)}</>
}
