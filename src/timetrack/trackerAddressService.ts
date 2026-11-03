/**
 * THE TRACKER'S SECTION AND ITS OPEN SHEET, IN THE ADDRESS (D8 in
 * Plans/time-tracker-like-toggl.md).
 *
 * `?view=calendar` is the section and `?entry=<id>` the entry whose sheet is
 * open. They lived only in the tracker's memory, so Android's Back button left
 * the tracker instead of closing the sheet, a reload on Settings landed on
 * Timer, and no link could open Calendar (getting-around #3).
 *
 * Timer is the address with no `view`, so the old links — `/time`, a start
 * link, a shared report — keep working. Everything else a link carried
 * (`?start=1&description=…`, `?report=…`) is used once on arrival and is not
 * written back, so a reload does not start the timer again or force Reports
 * (getting-around #12).
 *
 * Pure functions of the address: `TogglLab` decides when to push or replace a
 * history step, and the browser's own Back and Forward do the rest.
 */

import type { Id } from "./types"

export const SECTIONS = ["timer", "calendar", "reports", "projects", "manage", "settings"] as const

export type Section = (typeof SECTIONS)[number]

const KNOWN = new Set<string>(SECTIONS)

export interface TrackerAddress {
  /** null when the address names no section, or one this tracker does not have */
  section: Section | null
  /** the entry whose sheet is open, or null */
  entryId: Id | null
}

export function readTrackerAddress(search: string): TrackerAddress {
  const params = new URLSearchParams(search)
  const view = params.get("view")
  const entry = params.get("entry")
  return {
    section: view !== null && KNOWN.has(view) ? (view as Section) : null,
    entryId: entry ? entry : null,
  }
}

/**
 * The address for a section and sheet, on the tracker's own path.
 *
 * Built from nothing rather than edited, on purpose: what a link brought with it
 * (`start`, `description`, `report`, …) has been used by the time anything is
 * written here, and keeping it is exactly what forced Reports on every reload.
 */
export function trackerAddressFor(pathname: string, address: { section: Section; entryId: Id | null }): string {
  const params = new URLSearchParams()
  if (address.section !== "timer") params.set("view", address.section)
  if (address.entryId !== null) params.set("entry", address.entryId)
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

/**
 * Where to go when the tracker's back control is pressed: how many history steps
 * back the page before the tracker is, and its path.
 *
 * Read from the browser's Navigation API (Chrome, Edge, and so the owner's
 * Android phone), which lists this tab's same-site history. Every step on the
 * tracker's own path is skipped — the sections and the sheet are steps now — so
 * one tap leaves the tracker, as the control promises. The sign-in pages are not
 * somewhere to go back to. Null when there is no such page, or the browser
 * cannot say: the caller then uses its fixed fallback, the Dashboard.
 */
export function pageBeforeTracker(
  trackerPath: string,
  history: { entries: { url: string | null }[]; currentIndex: number } | null,
  origin: string,
): { steps: number; path: string } | null {
  if (!history) return null
  for (let i = history.currentIndex - 1; i >= 0; i--) {
    const url = history.entries[i]?.url
    if (!url) return null
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return null
    }
    if (parsed.origin !== origin) return null
    if (parsed.pathname === trackerPath) continue
    if (parsed.pathname === "/auth" || parsed.pathname.startsWith("/auth/")) return null
    return { steps: history.currentIndex - i, path: parsed.pathname }
  }
  return null
}
