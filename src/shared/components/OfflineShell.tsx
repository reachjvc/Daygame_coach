"use client"

/**
 * Registers the service worker that lets a page be OPENED without a connection.
 *
 * MOUNTED BY EVERY PAGE THAT NEEDS TO SURVIVE NO SIGNAL, which is why it lives
 * in `shared/` rather than in the time tracker where it was written. Two pages
 * mount it today — the tracker and the Black Box — and `SHELL_PATHS` in
 * `public/sw.js` is the list of what the worker will actually keep. Mounting
 * this on a page that is not in that list registers the worker and stores
 * nothing for that page, which is a quiet no-op rather than an error: the list
 * in the worker is the decision, and this is only what asks for it.
 *
 * Only in a production build: in development the dev server streams updates,
 * and a worker sitting in front of that serves a version of the app that no
 * longer exists. That is a stated condition, not a silent one — in development
 * any worker previously installed is removed rather than left to rot, by
 * `StaleWorkerCleanup` in the root layout.
 */

import { useEffect } from "react"

export function OfflineShell() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    /* Development cleanup lives in `StaleWorkerCleanup`, mounted in the root
       layout. It was here, which meant a leftover worker was removed only if you
       happened to open the one page that mounted this — and left controlling
       every other page of the dev server if you did not. */
    if (process.env.NODE_ENV !== "production") return

    /* THE BUILD ID IS NOT OPTIONAL, AND A MISSING ONE IS NOT A DEFAULT.
       It names the worker's cache, and that is what makes a new build install a
       new worker and throw the old build's pages away. Two builds that both
       call themselves the same thing register a byte-identical URL: the browser
       sees no change, never reinstalls, and every past build's pages pile up
       under one name — exactly the fault rule 5 in public/sw.js exists to fix.
       So a build with no id gets no offline support and says so, rather than
       quietly sharing a cache with the last one. NEXT_PUBLIC_BUILD_ID is set in
       next.config.mjs, which reports "unknown" when it cannot ask git. */
    const version = process.env.NEXT_PUBLIC_BUILD_ID
    if (!version || version === "unknown") {
      console.error(
        "Offline support is off: this build has no build id, so its offline store could not be told apart from the previous build's. Set NEXT_PUBLIC_BUILD_ID at build time.",
      )
      return
    }

    void navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(version)}`)
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        /* "I am on screen for whoever is signed in now." Signing in and out are
           client-side transitions, so the worker almost never sees a navigation
           to /auth/ and its URL rule alone would rarely fire. This is what
           actually keeps one person's stored shells from being the next
           person's, and it refills the store after an expiry-driven clear. The
           worker re-warms every shell path, not only the page that asked. */
        registration.active?.postMessage({ type: "warm-shell" })
      })
      .catch((error) => {
        // worth seeing: it means the app will not open offline. It does not stop
        // anything else working, so it is reported rather than thrown.
        console.error("Offline support could not be enabled:", error)
      })
  }, [])

  return null
}
