"use client"

/**
 * A page that breaks on purpose, so the reporting can be proved rather than
 * assumed. Dev only — `/test/*` returns 404 in production.
 */

import { useState } from "react"

import { ErrorBoundary } from "@/src/shared/components/ErrorBoundary"

function Explodes({ armed }: { armed: boolean }) {
  if (armed) throw new Error("Deliberate crash from /test/crash")
  return <p className="text-sm text-muted-foreground">Nothing is broken yet.</p>
}

export default function CrashPage() {
  const [armed, setArmed] = useState(false)

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-lg font-semibold">Crash reporting check</h1>
      <p className="text-sm text-muted-foreground">
        Press the button. The panel below should be replaced by a recovery message, the rest of this page
        should keep working, and a report should reach the database.
      </p>
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="rounded-md border border-destructive/50 px-3 py-1.5 text-sm text-destructive"
      >
        Break this panel
      </button>
      <ErrorBoundary label="the test panel">
        <Explodes armed={armed} />
      </ErrorBoundary>
      <button
        type="button"
        onClick={() => {
          void Promise.reject(new Error("Deliberate unhandled rejection from /test/crash"))
        }}
        className="rounded-md border border-border px-3 py-1.5 text-sm"
      >
        Break a promise nobody catches
      </button>
    </main>
  )
}
