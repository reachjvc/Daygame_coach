"use client"

/**
 * Phone-sized viewport detection for the behavioral differences CSS cannot
 * express (default calendar range, whether drag gestures are enabled).
 *
 * Layout differences should use Tailwind's `sm:` variants instead — they are
 * SSR-safe. This hook starts as `false` and corrects on mount, which is fine
 * here because the lab renders a loading state until client state exists.
 */

import { useEffect, useState } from "react"

/** Tailwind's `sm` breakpoint: below this we treat the device as a phone */
export const MOBILE_BREAKPOINT = 640

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const sync = () => setIsMobile(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  return isMobile
}
