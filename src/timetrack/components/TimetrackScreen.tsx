"use client"

/**
 * The tracker as a page of the app, rather than as a lab page.
 *
 * It deliberately does NOT render the app's `MobileTabBar`. The tracker already
 * owns the bottom of a phone screen with its own six-section bar, and two
 * stacked bars would take 120px of an 844px screen and leave the user guessing
 * which one moves them where. The way out is the back arrow in the header,
 * which is how every other feature page in this app behaves.
 */

import { TogglLab } from "./TogglLab"

export function TimetrackScreen() {
  return <TogglLab backHref="/dashboard" backLabel="Dashboard" />
}
