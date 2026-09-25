"use client"

/**
 * Phone-sized viewport detection for the behavioral differences CSS cannot
 * express (default calendar range, whether drag gestures are enabled).
 *
 * Layout differences should normally use Tailwind's `sm:` variants instead —
 * they are SSR-safe, and both halves are simply in the DOM. Use this hook
 * instead when rendering both halves is the cost you are trying to avoid.
 *
 * IT ANSWERS ON THE FIRST RENDER, not after it. Correcting on mount is fine
 * when the answer only picks a default; it is not fine when it picks a layout,
 * because a phone then paints one frame of the pointer-device layout first.
 * Reading `matchMedia` in the initialiser is safe for every caller here: the
 * tracker renders a loading state until client state exists, so nothing that
 * calls this is ever server-rendered and there is no markup to mismatch.
 * Anything that IS server-rendered must use the `sm:` variants instead.
 */

import { useEffect, useState } from "react"

/** Tailwind's `sm` breakpoint: below this we treat the device as a phone */
export const MOBILE_BREAKPOINT = 640

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    // `matchMedia` is absent on the server and in some test environments; a
    // pointer device is the safe assumption when nothing can be measured.
    () => (typeof window === "undefined" ? false : (window.matchMedia?.(QUERY).matches ?? false)),
  )

  useEffect(() => {
    // Not a swallowed error: some environments (jsdom, a few embedded
    // webviews) have no `matchMedia` at all. Where there is none, the answer
    // above is the only one obtainable and nothing can ever change it. This
    // used to be an unguarded call, which threw and took the whole entry list
    // down with it the first time a test rendered a component that used it.
    const query = window.matchMedia?.(QUERY)
    if (!query) return
    const sync = () => setIsMobile(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  return isMobile
}
