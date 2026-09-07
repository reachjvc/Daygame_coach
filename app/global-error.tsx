"use client"

/**
 * The last resort: something broke so early that even the layout could not
 * render. Next requires this file to carry its own <html> and <body>.
 *
 * It still reports. A crash this severe is the one you most need to know about,
 * and it is the one a person is least likely to describe accurately.
 */

import { useEffect } from "react"

import { reportError } from "@/src/shared/errorReportService"

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    reportError(error, { severity: "error" })
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b1120", color: "#e7eef2", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: "32rem", margin: "0 auto", padding: "4rem 1.5rem", lineHeight: 1.6 }}>
          <h1 style={{ fontSize: "1.4rem", margin: "0 0 .5rem" }}>This page could not load</h1>
          <p style={{ margin: "0 0 1.5rem", color: "#93a3ac" }}>
            The fault has been reported. Anything you had saved is safe.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#ff5c39", color: "#0b1120", border: 0, borderRadius: 8,
              padding: ".7rem 1.2rem", fontSize: "1rem", cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
