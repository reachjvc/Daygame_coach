"use client"

/**
 * WHICH VICE THE PAGE WAS LAST SHOWING.
 *
 * A view preference, not part of the record — its own key, which nothing else
 * reads and which never touches `vice-blackbox-v1`. The same separation the old
 * module keeps for `quit-vice-version`: a view is never a container.
 *
 * It exists because the default without it is "most recently started", and that
 * is wrong in the one moment this page has to work. Somebody whose record is
 * four years of smoking adds a drinking run in August; from then on the page
 * opens on drinking, showing no chart, no numbers and — because the door is
 * per-vice and drinking has nothing filed — no door. Opening it mid-thought
 * about a cigarette then means noticing a switcher first.
 *
 * Losing it is harmless, so every read and write is wrapped: private windows,
 * cleared site data and blocked storage all fall back to the default rule.
 */

import { useCallback, useEffect, useState } from "react"

export const BLACKBOX_VIEW_KEY = "vice-blackbox-view"

export function useBlackBoxView() {
  const [viewing, setViewing] = useState<string | null>(null)

  useEffect(() => {
    try {
      setViewing(window.localStorage.getItem(BLACKBOX_VIEW_KEY))
    } catch {
      // No stored preference reachable; the newest run decides, as before.
    }
  }, [])

  const remember = useCallback((viceId: string) => {
    setViewing(viceId)
    try {
      window.localStorage.setItem(BLACKBOX_VIEW_KEY, viceId)
    } catch {
      // It still holds for this visit, which is the part that matters today.
    }
  }, [])

  return { viewing, remember }
}
