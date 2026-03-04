"use client"

import { useState } from "react"
import { useHistoryBarrier } from "@/src/shared/HistoryBarrierContext"

/**
 * Like useState, but pushes a browser history entry when the value
 * differs from its initial value.  Pressing browser-back resets the
 * state to `initial` instead of navigating away from the page.
 *
 * Use this for any React state that swaps a major portion of the
 * visible UI (sub-views, overlays, wizards, etc.).
 *
 * Multiple useBackableState hooks on the same page stack in LIFO
 * order automatically via the HistoryBarrierContext.
 */
export function useBackableState<T>(initial: T) {
  const [value, setValue] = useState<T>(initial)
  useHistoryBarrier(value !== initial, () => setValue(initial))
  return [value, setValue] as const
}
