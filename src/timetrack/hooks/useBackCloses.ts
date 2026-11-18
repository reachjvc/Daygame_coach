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
      if (popped) return
      if (state?.marker === marker) {
        window.history.back()
        return
      }
      // Something was stacked on top of the step (the calendar block's Edit opens a
      // sheet, which closes the panel under itself). The step cannot be taken out from
      // under it, so it is skipped when Back arrives on it: otherwise that Back press
      // changes nothing on screen (Plans/time-log-phone.md, audit b04).
      const skip = () => {
        if ((window.history.state as { marker?: string } | null)?.marker !== marker) return
        window.removeEventListener("popstate", skip)
        window.history.back()
      }
      window.addEventListener("popstate", skip)
    }
  }, [open])
}
