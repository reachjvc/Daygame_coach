// @vitest-environment jsdom
/**
 * "GO TO ‹PROJECT›" IN AN ENTRY'S ⋮ MENU OPENS THAT PROJECT.
 *
 * It set `#project-…` in the address and nothing listened for it, so the menu
 * closed and nothing else happened — a menu item that did nothing at all
 * (getting-around #5 in Plans/time-tracker-like-toggl.md). It now switches the
 * tracker to Projects, opened on that project's own page.
 *
 * The whole tracker is mounted, signed out, as the lab at /test/toggl is.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 10, 3, 15, 0, 0, 0)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  // signed out: the sync answers 401, as it does on the lab page
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(baseState({ entries: [entry(1, "2026-11-03", "09:00", "10:00", { description: "planning", projectId: "30" })] })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.location.hash = ""
})

test("opens Projects on that project's own page", async () => {
  render(<TogglLab />)

  fireEvent.click(await screen.findByLabelText("More actions for this time entry"))
  fireEvent.click(screen.getByRole("button", { name: "Go to Alpha" }))

  expect(
    screen.queryByRole("button", { name: "← All projects" }),
    "still on the timer: the menu item changed the address and nothing else",
  ).toBeTruthy()
  expect(screen.getByRole("heading", { name: "Alpha" })).toBeTruthy()
  expect(screen.queryByLabelText("More actions for this time entry"), "the entry list is still showing").toBeNull()
})
