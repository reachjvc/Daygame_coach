// @vitest-environment jsdom
/**
 * THE APP'S OWN "TIME" LINK OPENS THE TIMER, EVEN FROM ANOTHER SECTION OF THE TRACKER.
 *
 * On the PC the app's top bar shows on Time (D9 in
 * Plans/time-tracker-like-toggl.md). On Calendar, a click on its "Time" link
 * changed the address to `/time` — which means Timer — and the screen stayed on
 * Calendar: the tracker read its address on arrival and on Back or Forward,
 * and a link to the page you are on is neither. The click looked dead, and the
 * next Back changed nothing (found by the 2026-11-04 audit).
 *
 * Next's router writes that address with `history.pushState` and tells the page
 * through `useSearchParams`, which is what this stands in for: the address
 * changes, and the hook's subscribers draw again.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useSyncExternalStore } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"

import { baseState, entry } from "./helpers"

const LAB = "/test/toggl"

const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search)),
}))

/** A Next `<Link>` to `address`: the router pushes it, and the search-params hook draws again */
function followAppLink(address: string) {
  act(() => {
    window.history.pushState({ __NA: true }, "", address)
    for (const listener of listeners) listener()
  })
}

function section(): string {
  const bar = screen.getByRole("navigation", { name: "Sections" })
  return bar.querySelector('[aria-current="page"]')?.textContent?.trim() ?? "(none)"
}

function tapSection(label: "Timer" | "Calendar" | "Reports" | "Projects") {
  const bar = screen.getByRole("navigation", { name: "Sections" })
  const button = [...bar.querySelectorAll("button")].find((b) => b.textContent?.trim() === label)
  expect(button, `no ${label} in the phone bar`).toBeTruthy()
  fireEvent.click(button!)
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  // the calendar scrolls to the working day; jsdom has no layout to scroll
  Element.prototype.scrollIntoView = vi.fn()
  const state = baseState({ entries: [entry(1, "2026-11-03", "09:00", "10:00", { description: "planning" })] })
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.history.replaceState(null, "", LAB)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

test("a link to Time from Calendar opens the timer", async () => {
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
  tapSection("Calendar")
  expect(section()).toBe("Calendar")

  followAppLink(LAB)
  expect(section(), "the address said Timer and the screen stayed on Calendar").toBe("Timer")
})

test("a link to a section from another section opens it", async () => {
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })

  followAppLink(`${LAB}?view=projects`)
  expect(section()).toBe("Projects")
})

test("the tracker's own steps are not mistaken for a link", async () => {
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
  tapSection("Reports")
  // the tracker's own pushState reaches the hook too; it must change nothing
  act(() => {
    for (const listener of listeners) listener()
  })
  expect(section()).toBe("Reports")
  expect(window.location.search).toBe("?view=reports")
})
