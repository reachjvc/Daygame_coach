// @vitest-environment jsdom
/**
 * THE RUNNING ROW IN THE PC LIST HAS ■, WHICH STOPS IT (Phase 8 Toggl-parity
 * audit of Plans/toggl-parity.md).
 *
 * The row that is running lost its ▶ (nothing to continue), which left an
 * empty slot; Toggl Track's web list shows a red ■ there that stops it. It
 * stops now, waits for the check like every Stop, and says so with Undo.
 * Named "Stop this timer", not the bar's "Stop timer": two buttons with one
 * name in one page are one too many for anyone finding them by name.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 10, 5, 15, 0, 0, 0)
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
const main = () => within(screen.getByRole("main"))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  Element.prototype.scrollIntoView = vi.fn()
  window.history.replaceState(null, "", "/test/toggl")
  const copy = startTimer(
    baseState({ entries: [entry(1, "2026-11-05", "09:00", "10:00", { description: "email" })] }),
    { description: "deep work", projectId: null, taskId: null, tagIds: [], billable: false },
    new Date(2026, 10, 5, 14, 0).toISOString(),
  ).state
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

test("■ on the running row stops it now, with Undo", async () => {
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Tracker" })
  const stops = main().getAllByRole("button", { name: "Stop this timer" })
  expect(stops.length, "one ■, on the running row only").toBe(1)
  expect(stops[0].closest("[data-row-actions]"), "not in the row's ▶ slot").toBeTruthy()
  expect(stops[0].getAttribute("title")).toBe("Stop timer")

  fireEvent.click(stops[0])
  await waitFor(() => expect(stored().entries.find((e) => e.description === "deep work")?.stop).toBe(NOW.toISOString()))
  const toast = await screen.findByText(/^Stopped “deep work”/)
  act(() => {
    fireEvent.click(within(toast.parentElement as HTMLElement).getByRole("button", { name: /Undo/ }))
  })
  await waitFor(() => expect(stored().entries.find((e) => e.description === "deep work")?.stop).toBeNull())
})
