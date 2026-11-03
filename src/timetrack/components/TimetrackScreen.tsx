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

import { TogglLab } from "./TogglLab"
import { ROUTES } from "@/src/shared/routes"

export function TimetrackScreen() {
  // Dashboard is where the back control goes when there is no page before this one to return to
  return <TogglLab backHref={ROUTES.dashboard} backLabel="Dashboard" underAppHeader />
}
