"use client"

import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react"

/**
 * LOG OUT, LOADED WHEN IT IS WANTED (Plans/tests-green-and-fast.md, F3).
 *
 * `LogOutButton` pulls the time tracker's sync code, the audit queue and the
 * Supabase client into its chunk (it must look at what is waiting to be sent
 * before it lets anyone go). Drawn in the frame of every signed-in page, that
 * made every first screen carry about 75 KB nobody had asked for yet.
 *
 * So the frame draws the same button from a light stand-in, and the real one
 * (`LogOutButton`, unchanged) is fetched the moment a finger or pointer comes
 * near it, or at the latest on the press itself. A press made before the real
 * one has arrived is not lost: it is replayed as soon as it mounts. Nothing is
 * removed; it is only loaded later.
 */

type Press = { onClick: () => void; busy: boolean }

const loadReal = () => import("./LogOutButton")
const RealLogOutButton = lazy(() => loadReal().then((m) => ({ default: m.LogOutButton })))

export function LazyLogOutButton({ children }: { children: (press: Press) => ReactNode }) {
  const [wanted, setWanted] = useState(false)
  const pressed = useRef(false)

  if (!wanted) {
    return (
      <span
        className="contents"
        onPointerEnter={() => void loadReal()}
        onFocusCapture={() => void loadReal()}
        onTouchStart={() => void loadReal()}
      >
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
  return (
    <Suspense fallback={children({ busy: true, onClick: () => {} })}>
      <RealLogOutButton>
        {(press) => <Replay press={press} pressed={pressed}>{children}</Replay>}
      </RealLogOutButton>
    </Suspense>
  )
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
