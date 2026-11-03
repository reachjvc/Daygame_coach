// @vitest-environment jsdom
/**
 * MENUS NEAR THE BOTTOM OF A PHONE KNOW HOW TALL THE TRACKER'S BOTTOM BAR IS.
 *
 * Every dropdown reads `--panel-bottom-inset` to decide whether it has room to
 * open downward. The tracker measured its bottom bar once, on its first render
 * — when it was still showing "Loading your time…" and the bar did not exist —
 * so the inset stayed 0px and menus near the bottom opened under the bar,
 * where taps land on the navigation instead (getting-around #10 in
 * Plans/time-tracker-like-toggl.md). jsdom lays nothing out, so the bar's
 * height is given to it here, as a phone would.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"

import { baseState } from "./helpers"

const BAR_HEIGHT = 64

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute("aria-label") === "Sections" ? BAR_HEIGHT : 0
  })
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baseState()))
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  window.localStorage.clear()
  document.documentElement.style.removeProperty("--panel-bottom-inset")
})

test("once the bar is on screen, the inset is its height", async () => {
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
  await waitFor(() =>
    expect(document.documentElement.style.getPropertyValue("--panel-bottom-inset")).toBe(`${BAR_HEIGHT}px`),
  )
})

test("leaving the tracker gives the inset back to the rest of the app", async () => {
  const view = render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
  view.unmount()
  expect(document.documentElement.style.getPropertyValue("--panel-bottom-inset")).toBe("0px")
})
