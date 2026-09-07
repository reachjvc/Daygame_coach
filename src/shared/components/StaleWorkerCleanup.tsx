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

/** Remembers that we already reloaded once, so a stuck worker cannot loop. */
const RELOADED_KEY = "stale-worker-cleanup:reloaded"

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

      console.warn(
        `Removed ${all.length} leftover service worker(s) and their cached files. ` +
          `They came from a production build on this same address and can serve stale ` +
          `styles and fonts over the dev server.`,
      )

      /* THE PAGE ON SCREEN WAS SERVED BY THE WORKER WE JUST KILLED.
         Unregistering does not un-serve it: this document, its stylesheet and
         its fonts may all have come from the stale cache, which is the whole
         symptom. Reload once so what is on screen is what the dev server
         actually returns — otherwise the fix requires the person to know to
         press reload, which is how it went unnoticed in the first place.

         Once, and only once. `sessionStorage` is the guard: if unregistering
         ever fails, a worker that is still there on the next pass must not
         start a reload loop. Development only, so a lost form field is a fair
         price for not shipping a "please clear your browser" instruction. */
      if (!navigator.serviceWorker.controller) return
      try {
        if (sessionStorage.getItem(RELOADED_KEY)) {
          console.warn("A service worker is still controlling this page after cleanup — not reloading again.")
          return
        }
        sessionStorage.setItem(RELOADED_KEY, "1")
      } catch {
        // Private mode, or storage disabled: skip the reload rather than risk a
        // loop with no way to remember that we already tried.
        return
      }
      location.reload()
    })
  }, [])

  return null
}
