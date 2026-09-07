"use client"

/**
 * IN DEVELOPMENT, REMOVE ANY SERVICE WORKER — ON EVERY PAGE, NOT JUST TWO.
 *
 * `OfflineShell` already did this, and it was mounted in exactly one place: the
 * time tracker. So a worker installed by a PRODUCTION build was cleared if you
 * happened to open the tracker, and left running on every other page of the dev
 * server if you did not. Reproduced 2026-09-07: register the worker, reload
 * /dashboard, and `navigator.serviceWorker.controller` is still set.
 *
 * That is not a hypothetical. `npm start` serves a production build on port
 * 3000 — the same origin as `npm run dev` — so anyone who has ever run one, or
 * a CI-mode Playwright run, has that worker installed against their dev server.
 * The worker it installed cached every file it ever fetched, forever, and served
 * them whenever a request failed to connect. A dev server restart is exactly
 * such a failure, and the app then draws itself from a build that no longer
 * exists: chunks that 404, and a webfont that never arrives.
 *
 * What that looked like: the whole site rendered about 28% too large, as though
 * zoomed in. `next/font` generates two metric-matched stand-ins, both
 * `local(Arial)` — `Geist Fallback` at `size-adjust: 104.76%` and
 * `Geist Mono Fallback` at `134.59%` — and `globals.css` named the MONO one in
 * the SANS stack. So every missing webfont meant Arial at 134.59%. Invisible on
 * a Linux CI box, which has no Arial at all.
 *
 * Kept apart from `OfflineShell`, which is about the tracker working offline.
 * This is about the dev server not being lied to, and it belongs to every page.
 */

import { useEffect } from "react"

export function StaleWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

    void navigator.serviceWorker.getRegistrations().then(async (all) => {
      if (all.length === 0) return
      await Promise.all(all.map((one) => one.unregister()))

      /* Unregistering stops the worker; it does not empty what it stored, and a
         stale stylesheet in Cache Storage outlives the thing that put it there. */
      if ("caches" in window) {
        const names = await caches.keys()
        await Promise.all(names.map((name) => caches.delete(name)))
      }

      // Said out loud: the page currently on screen was served by that worker,
      // so what is being looked at is not necessarily what the dev server sent.
      console.warn(
        `Removed ${all.length} leftover service worker(s) and their cached files. ` +
          `They came from a production build on this same address and can serve stale ` +
          `styles and fonts over the dev server. Reload to see what the dev server ` +
          `actually returns.`,
      )
    })
  }, [])

  return null
}
