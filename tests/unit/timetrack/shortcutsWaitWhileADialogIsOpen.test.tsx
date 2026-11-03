// @vitest-environment jsdom
/**
 * THE ONE-KEY SHORTCUTS DO NOTHING WHILE A DIALOG OR A MENU IS OPEN.
 *
 * `s` stops the timer, `n` starts one, `c` continues the last entry and `1`–`9`
 * start a favorite. They were held back only while a text box had focus, so
 * with a dialog open and focus on one of its buttons — the detail sheet's
 * close button, the shortcuts list itself — a stray `s` stopped the timer
 * behind it (getting-around #7 in Plans/time-tracker-like-toggl.md).
 *
 * The whole tracker is mounted, signed out, as the lab at /test/toggl is.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { liveEntries, runningEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 10, 3, 15, 0, 0, 0)

function stored(): TimetrackState {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  const finished = baseState({ entries: [entry(1, "2026-11-03", "09:00", "10:00", { description: "planning" })] })
  const running = startTimer(
    finished,
    { description: "writing", projectId: null, taskId: null, tagIds: [], billable: false },
    new Date(2026, 10, 3, 14, 0).toISOString(),
  ).state
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(running))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

async function mount() {
  render(<TogglLab />)
  await screen.findByLabelText("Stop timer")
}

describe("with nothing open", () => {
  test("s stops the timer, so the tests below are not passing by doing nothing", async () => {
    await mount()
    act(() => {
      fireEvent.keyDown(document.body, { key: "s" })
    })
    expect(runningEntry(stored())).toBeNull()
  })
})

describe("with a dialog open", () => {
  test("s pressed on the shortcuts list's own button leaves the timer running", async () => {
    await mount()
    fireEvent.keyDown(document.body, { key: "?", shiftKey: true })
    const dialog = screen.getByText("Keyboard shortcuts").closest("[role=dialog]") as HTMLElement
    expect(dialog, "the shortcuts list is not a dialog").toBeTruthy()

    act(() => {
      fireEvent.keyDown(within(dialog).getByRole("button", { name: "Close" }), { key: "s" })
    })

    expect(runningEntry(stored()), "a key pressed inside a dialog stopped the timer behind it").not.toBeNull()
  })

  test("s pressed on the page behind an open detail sheet leaves the timer running", async () => {
    await mount()
    fireEvent.click(screen.getAllByLabelText("More actions for this time entry")[0])
    fireEvent.click(screen.getByRole("button", { name: "Edit details…" }))
    expect(screen.getByText("Time entry details")).toBeTruthy()

    act(() => {
      fireEvent.keyDown(document.body, { key: "s" })
    })

    expect(runningEntry(stored())).not.toBeNull()
  })
})

describe("with a menu open", () => {
  test("c does not continue an entry", async () => {
    await mount()
    act(() => {
      fireEvent.keyDown(document.body, { key: "s" })
    })
    const before = liveEntries(stored()).length
    fireEvent.click(screen.getAllByLabelText("More actions for this time entry")[0])

    act(() => {
      fireEvent.keyDown(screen.getByRole("button", { name: "Duplicate" }), { key: "c" })
    })

    expect(runningEntry(stored()), "a key pressed in an open menu started a timer").toBeNull()
    expect(liveEntries(stored())).toHaveLength(before)
  })
})
