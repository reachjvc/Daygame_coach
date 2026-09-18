"use client"

import { useEffect } from "react"

/**
 * TELLS THE ACCOUNT WHAT ZONE THE BROWSER IS IN — ONCE, AND ONLY IF NOBODY HAS SAID.
 *
 * WHY IT EXISTS. `profiles.timezone` defaults to 'UTC', which is not a
 * timezone anybody lives in — it is the app saying nobody has told it. Every
 * screen that files a workout by date read that default as a real answer, so
 * an account in Copenhagen logging a session at half eleven at night had it
 * filed as tomorrow's, and the week strip lit a day that had not happened.
 *
 * New accounts are fixed at the source: the sign-up form sends the browser's
 * zone and the signup trigger stores it. This is for everyone who signed up
 * before that, which is everyone.
 *
 * THE THREE RULES IT WILL NOT BREAK.
 *
 * 1. It never overwrites a zone somebody chose, or one already detected. The
 *    server's `timezone_source` decides, not this component — a zone typed in
 *    Settings from a laptop abroad must survive being opened on a phone at
 *    home, and this code cannot tell those apart.
 * 2. Once per browser session, so switching between tabs does not write. The
 *    flag is in `sessionStorage`; every read and write is wrapped because a
 *    private window can throw on either.
 * 3. Signed out it does nothing. The GET answers 401 and that is the end of it.
 *
 * WHY IT IS MOUNTED IN THE ROOT LAYOUT. It is the only shell every signed-in
 * page shares, and the fault it fixes shows up on whichever page the person
 * opens first. Mounting it on the gym screens alone would fix the gym and
 * leave tracking, sleep and weight still filing by a zone nobody set.
 */

const ONCE_PER_SESSION = "clock-sync-done"

function alreadyTried(): boolean {
  try {
    return window.sessionStorage.getItem(ONCE_PER_SESSION) === "1"
  } catch {
    // Storage blocked. Running again next page load costs one GET, which is
    // better than not running at all.
    return false
  }
}

function markTried(): void {
  try {
    window.sessionStorage.setItem(ONCE_PER_SESSION, "1")
  } catch {
    /* see above */
  }
}

/** A zone the browser names but `Intl` cannot resolve is not worth storing. */
function browserZone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!zone) return null
    new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date())
    return zone
  } catch {
    return null
  }
}

export function ClockSync() {
  useEffect(() => {
    if (alreadyTried()) return
    markTried()

    const zone = browserZone()
    if (!zone) return

    void (async () => {
      try {
        const res = await fetch("/api/settings/time-preferences")
        if (!res.ok) return // 401 signed out, or the read failed. Either way: nothing.
        const prefs = (await res.json()) as { timezone?: string | null; timezone_source?: string }

        // The whole point: only when nobody has said.
        if (prefs.timezone_source !== "signup_default") return
        if (prefs.timezone === zone) return

        await fetch("/api/settings/time-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: zone, source: "detected" }),
        })
      } catch {
        // A failed sync means the account keeps the zone it had. Nothing is
        // shown, because nothing the person did has failed.
      }
    })()
  }, [])

  return null
}
