// @vitest-environment jsdom
/**
 * LEAVING WITH A TIMER RUNNING LEAVES THE NEXT PAGE'S TAB TITLE ALONE.
 *
 * While a timer runs the tab reads "0:42:10 · writing", like Toggl. On the way
 * out the tracker put its own name back — but by then the router had already
 * written the next page's title, so the Dashboard's tab said "Time"
 * (getting-around #11 in Plans/time-tracker-like-toggl.md). React writes the
 * new page's <title> while it commits the navigation, and only afterwards runs
 * the tracker's clean-up; the test does the same two steps in that order.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { startTimer } from "@/src/timetrack/timetrackService"

import { baseState } from "./helpers"

const NOW = new Date(2026, 10, 3, 15, 0, 0, 0)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  const withTimer = startTimer(
    baseState(),
    { description: "writing", projectId: null, taskId: null, tagIds: [], billable: false },
    new Date(2026, 10, 3, 14, 0).toISOString(),
  ).state
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimer))
  document.title = "Time Log"
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

test("the tab shows the running clock while you are in the tracker", async () => {
  render(<TogglLab />)
  await screen.findAllByLabelText("Stop timer")
  expect(document.title).toBe("1:00:00 · writing")
})

test("the page you go to keeps its own title", async () => {
  const view = render(<TogglLab />)
  await screen.findAllByLabelText("Stop timer")

  document.title = "Dashboard"
  view.unmount()

  expect(document.title).toBe("Dashboard")
})

test("stopping the timer while you are still here puts the tracker's name back", async () => {
  render(<TogglLab />)
  await screen.findAllByLabelText("Stop timer")
  screen.getAllByLabelText("Stop timer")[0].click()
  await screen.findAllByLabelText("Start timer")
  expect(document.title).toBe("Time Log")
})
