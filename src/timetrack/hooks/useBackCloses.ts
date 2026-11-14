"use client"

/**
 * ANDROID'S BACK CLOSES WHAT IS OPEN, NOT THE TRACKER (audit 2026-11-14, b04).
 *
 * A panel or sheet that is not an address of its own (the calendar block's
 * panel, the report's date sheet) left the tracker on Back. While `open`, one
 * history step on the same address is held; Back takes it and calls `close`.
 * Closed any other way, the step is taken back so Back is not spent twice.
 */

import { useEffect, useRef } from "react"

export function useBackCloses(open: boolean, close: () => void): void {
  const closeNow = useRef(close)
  closeNow.current = close
  useEffect(() => {
    if (!open) return
    const marker = `back-closes-${Math.random().toString(36).slice(2)}`
    window.history.pushState({ timetrack: "panel", marker }, "", window.location.href)
    let popped = false
    const onPop = () => {
      popped = true
      closeNow.current()
    }
    window.addEventListener("popstate", onPop)
    return () => {
      window.removeEventListener("popstate", onPop)
      const state = window.history.state as { marker?: string } | null
      if (!popped && state?.marker === marker) window.history.back()
    }
  }, [open])
}
