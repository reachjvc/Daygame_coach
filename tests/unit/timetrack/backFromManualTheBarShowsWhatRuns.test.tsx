// @vitest-environment jsdom
/**
 * BACK FROM MANUAL MODE, THE BAR SHOWS WHAT IS RUNNING.
 *
 * Manual mode adds a finished entry through the same description box the
 * running bar uses. Adding one emptied the box, and switching back to the
 * timer left it empty over a timer still running as "still running" — found
 * by the 24-hour soak (bug E3 of the 2026-11-04 audit). The next commit of
 * that box would have renamed the running entry to nothing.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const NOON = new Date(2026, 10, 4, 12, 0, 0)

function running(): TimetrackState {
  return startTimer(
    baseState(),
    { description: "still running", projectId: null, taskId: null, tagIds: [], billable: false },
    new Date(2026, 10, 4, 11, 0, 0).toISOString(),
  ).state
}

function stored(): TimetrackState {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOON)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(running()))
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

test("adding an entry by hand, then going back to the timer, shows the running entry's name", async () => {
  render(<TogglLab />)
  const main = within(await screen.findByRole("main"))
  const box = () => main.getByPlaceholderText("What are you working on?") as HTMLInputElement
  await waitFor(() => expect(box().value).toBe("still running"))

  fireEvent.click(main.getByRole("button", { name: "Toggle timer or manual mode" }))
  fireEvent.change(box(), { target: { value: "added by hand" } })
  const start = main.getAllByLabelText("Start time")[0]
  const end = main.getAllByLabelText("End time")[0]
  fireEvent.change(start, { target: { value: "06:00" } })
  fireEvent.blur(start)
  fireEvent.change(end, { target: { value: "06:20" } })
  fireEvent.blur(end)
  fireEvent.click(main.getByRole("button", { name: "Add" }))
  await waitFor(() => expect(stored().entries.map((e) => e.description)).toContain("added by hand"))

  fireEvent.click(main.getByRole("button", { name: "Toggle timer or manual mode" }))
  await main.findByRole("button", { name: "Stop timer" })
  expect(box().value, "the bar was empty over a running timer").toBe("still running")
  expect(stored().entries.find((e) => e.duration < 0)?.description).toBe("still running")
})
