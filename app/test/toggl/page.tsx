"use client"

import { useEffect, useState } from "react"

import { browserOwner } from "@/src/timetrack/browserOwner"
import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { ACCOUNT_KEY } from "@/src/timetrack/config"

/**
 * THE LAB DOES NOT SHOW AN ACCOUNT'S TRACKER.
 *
 * This page uses the same browser keys as `/time` and does not know who is
 * signed in, so after a session ended it showed that person's entries to
 * whoever opened it, signed out (a privacy audit, 2026-11-04). When this
 * browser's copy belongs to an account (`browserOwner`), the tracker is not
 * drawn here at all — not read, not written. After Log Out the copy is gone and
 * the lab works as before. Development only (`app/test/layout.tsx`).
 */
export default function TogglTestPage() {
  // undefined until read in the browser: the server cannot know, and must not draw the tracker
  const [owned, setOwned] = useState<boolean | undefined>(undefined)
  useEffect(() => {
    const read = () => setOwned(Boolean(browserOwner()))
    read()
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACCOUNT_KEY) read()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  if (owned === undefined) return null
  if (owned) {
    return (
      <main className="mx-auto max-w-md p-6 text-sm text-muted-foreground">
        <h1 className="mb-2 text-base font-semibold text-foreground">Time Log</h1>
        <p>
          This browser holds a signed-in account&apos;s time tracker, so the lab does not show it. Open Time Log from the app,
          or log out first to use the lab.
        </p>
      </main>
    )
  }
  return <TogglLab />
}
