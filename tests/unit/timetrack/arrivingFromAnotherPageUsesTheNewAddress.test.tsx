// @vitest-environment jsdom
/**
 * ARRIVING FROM ANOTHER PAGE OF THE APP, THE SECTION IS THE ONE THE NEW ADDRESS NAMES.
 *
 * On a navigation inside the app the router draws the new page first and
 * writes its address into the browser afterwards. So the tracker's first render
 * still sees the page it is leaving: a link to `?view=timer` from Articles
 * opened Calendar, the section remembered from last time — found in the
 * browser, walking Phase 3 of Plans/time-tracker-like-toggl.md. Here the
 * address changes at the same moment it does in the browser: after the first
 * render, before the workspace is read.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { SCREEN_KEY, STORAGE_KEY } from "@/src/timetrack/config"

import { baseState } from "./helpers"

function section(): string {
  const bar = screen.getByRole("navigation", { name: "Sections" })
  return bar.querySelector('[aria-current="page"]')?.textContent?.trim() ?? "(none)"
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  // the calendar scrolls to the working day; jsdom has no layout to scroll
  Element.prototype.scrollIntoView = vi.fn()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baseState()))
  window.localStorage.setItem(SCREEN_KEY, "calendar")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

test("a link to Projects from another page opens Projects", async () => {
  window.history.replaceState(null, "", "/articles")
  const read = Storage.prototype.getItem
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (this: Storage, key: string) {
    // the router writes the new address once the new page has rendered
    if (key === STORAGE_KEY && window.location.pathname === "/articles") window.history.pushState(null, "", "/test/toggl?view=projects")
    return read.call(this, key)
  })

  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })

  await waitFor(() => expect(section()).toBe("Projects"))
  expect(window.location.search).toBe("?view=projects")
})
