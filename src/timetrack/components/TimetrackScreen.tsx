"use client"

/**
 * The tracker as a page of the app, rather than as a lab page.
 *
 * On a phone it deliberately does NOT get the app's `MobileTabBar`. The tracker
 * already owns the bottom of a phone screen with its own section bar, and two
 * stacked bars would take 120px of an 844px screen and leave the user guessing
 * which one moves them where. The way out on a phone is the back arrow in the
 * tracker's header, which returns to the page you came from.
 *
 * On a PC the app's header is drawn above it like on every other page, and the
 * tracker drops its own "← Dashboard · Time" row (`underAppHeader`; D9 in
 * Plans/time-tracker-like-toggl.md). That decision is recorded in
 * `PHONE_BAR_HIDDEN_PREFIXES` (`components/navTabs.ts`), not only here: a
 * guard checks that every tab destination either renders the bar or says in
 * writing that it does not.
 */

import Link from "next/link"
import { useEffect, useState } from "react"

import { TogglLab } from "./TogglLab"
import { ROUTES } from "@/src/shared/routes"

import {
  SIGNED_OUT_HERE,
  browserOwner,
  claimBrowserCopy,
  ownerChangedUnderneath,
  startAgain,
  whenSigningOut,
} from "../browserOwner"
import { ACCOUNT_KEY } from "../config"

/**
 * `account` is who the server says is signed in, asked when this page was
 * rendered. Before the tracker below reads anything this browser kept, the copy
 * is claimed for that account: another person's is removed, never shown, never
 * sent (`claimBrowserCopy`). In a state initialiser, so it runs before the
 * children's own initialisers read the timer bar and the background memory; it
 * does the same thing however often it runs.
 *
 * And if another tab then claims the browser for somebody else, this page starts
 * again rather than carry on as the previous person.
 *
 * LOG OUT, HERE OR IN ANOTHER TAB, STOPS THE TRACKER AND SAYS SO — it does not
 * reload. Reloading in the seconds before the sign-out finished found the
 * session still valid and claimed the browser again, downloading the account
 * into a browser that was being left; and in the tab that logged out, a sign-out
 * that failed with no signal left a tracker that silently saved nothing (a code
 * review, 2026-11-04). Signing in again opens a fresh one.
 */
export function TimetrackScreen({ account }: { account: string }) {
  useState(() => claimBrowserCopy(account))
  const [loggedOut, setLoggedOut] = useState<"here" | "elsewhere" | null>(null)
  useEffect(() => {
    const look = () => {
      if (browserOwner() === SIGNED_OUT_HERE) setLoggedOut((current) => current ?? "elsewhere")
      else if (ownerChangedUnderneath(account)) startAgain()
    }
    const onStorage = (event: StorageEvent) => {
      // `key` null: the whole storage was cleared
      if (event.key !== null && event.key !== ACCOUNT_KEY) return
      look()
    }
    // brought back from the back-forward cache, frozen through whatever happened meanwhile: a
    // frozen page hears no storage events, so it asks on the way back in, before anyone reads it
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) look()
    }
    const stopListening = whenSigningOut(() => setLoggedOut("here"))
    window.addEventListener("storage", onStorage)
    window.addEventListener("pageshow", onPageShow)
    return () => {
      stopListening()
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [account])
  if (loggedOut) {
    return (
      <main className="mx-auto max-w-md p-6 text-sm text-muted-foreground">
        <h1 className="mb-2 text-base font-semibold text-foreground">Time</h1>
        <p>
          {loggedOut === "here" ? "You logged out." : "You logged out in another tab."} This browser no longer keeps your
          time.
        </p>
        <p className="mt-3">
          <Link href="/auth/login" className="text-primary underline underline-offset-4">
            Sign in again
          </Link>
        </p>
      </main>
    )
  }
  // Dashboard is where the back control goes when there is no page before this one to return to
  return <TogglLab account={account} backHref={ROUTES.dashboard} backLabel="Dashboard" underAppHeader />
}
