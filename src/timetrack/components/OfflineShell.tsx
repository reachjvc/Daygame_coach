"use client"

/**
 * Registers the service worker that lets the tracker open without a connection.
 *
 * Only in a production build: in development the dev server streams updates,
 * and a worker sitting in front of that serves a version of the app that no
 * longer exists. That is a stated condition, not a silent one — in development
 * any worker previously installed is removed rather than left to rot.
 */

import { useEffect } from "react"

export function OfflineShell() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((all) => all.forEach((one) => void one.unregister()))
      return
    }

    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      // worth seeing: it means the app will not open offline. It does not stop
      // anything else working, so it is reported rather than thrown.
      console.error("Offline support could not be enabled:", error)
    })
  }, [])

  return null
}
