"use client"

/**
 * A NEW BUILD IS LOADED WHEN IT IS SAFE (Plans/time-log-phone.md 2.2, C5).
 *
 * The installed app on a phone is put away, not closed, so it could run
 * yesterday's code for days after a deploy. Each time the tracker comes back
 * into view it asks `/api/healthz` which build the server runs. When that is
 * not this page's build:
 *
 *   - nothing open and nothing waiting to sync: the page reloads at once;
 *   - otherwise `ready` turns on, and the tracker shows a slim
 *     "Updated · Tap to reload" bar. A reload with a sheet open would drop
 *     what was being typed there; the sync queue itself is kept on disk.
 *
 * A page with no build id of its own (a test, an odd local build) never asks.
 */

import { useCallback, useEffect, useRef, useState } from "react"

export const HEALTHZ_PATH = "/api/healthz"

/** Is something open that a reload would throw away: a sheet, a dialog, a question? */
function somethingOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
}

export function useNewBuild(pendingCount: number): { ready: boolean; reload: () => void } {
  const [ready, setReady] = useState(false)
  const pending = useRef(pendingCount)
  pending.current = pendingCount
  const asking = useRef(false)

  const reload = useCallback(() => window.location.reload(), [])

  useEffect(() => {
    const own = process.env.NEXT_PUBLIC_BUILD_ID
    if (!own) return
    const check = async () => {
      if (document.visibilityState !== "visible" || asking.current) return
      asking.current = true
      try {
        const response = await fetch(HEALTHZ_PATH, { cache: "no-store" })
        const body = (await response.json().catch(() => null)) as { buildId?: unknown } | null
        const served = typeof body?.buildId === "string" ? body.buildId : null
        if (!served || served === own) return
        if (!somethingOpen() && pending.current === 0) {
          window.location.reload()
          return
        }
        setReady(true)
      } catch {
        // offline or the server is restarting: the next return to the page asks again
      } finally {
        asking.current = false
      }
    }
    document.addEventListener("visibilitychange", check)
    window.addEventListener("pageshow", check)
    return () => {
      document.removeEventListener("visibilitychange", check)
      window.removeEventListener("pageshow", check)
    }
  }, [])

  return { ready, reload }
}
