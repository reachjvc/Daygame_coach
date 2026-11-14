// @vitest-environment jsdom
/**
 * LEAVING THE TRACKER AND COMING BACK FORGETS NOTHING.
 *
 * Each arrival used to start from scratch: Pomodoro began a fresh 25 minutes,
 * the "Nothing is tracking" reminder and the forgotten-timer warning both said
 * their piece again, and a description typed but not started — or a manual
 * entry half filled in — was wiped (getting-around #9 in
 * Plans/time-tracker-like-toggl.md). Each test leaves (unmount) and comes back
 * (a fresh mount), which is what tapping Dashboard and then Time does.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

/** A Tuesday afternoon */
const NOW = new Date(2026, 10, 3, 15, 0, 0, 0)

function store(state: TimetrackState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function running(state: TimetrackState, description: string, startedAt: Date): TimetrackState {
  return startTimer(state, { description, projectId: null, taskId: null, tagIds: [], billable: false }, startedAt.toISOString()).state
}

async function arrive() {
  const view = render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
  // the effects that warn and remind run on the first ticks after the workspace lands
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
  return view
}

function header(): string {
  return screen.getByRole("heading", { name: "Time Log" }).closest("header")?.textContent ?? ""
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("Pomodoro", () => {
  test("five minutes away from a 25-minute focus leaves 20 minutes, not a fresh 25", async () => {
    const pomodoro = { enabled: true, workMinutes: 25, breakMinutes: 5, autoContinue: false, notify: false }
    store(running(baseState({ pomodoro }), "writing", new Date(2026, 10, 3, 14, 59)))
    const first = await arrive()
    expect(header()).toContain("Focus 0:25:00")
    first.unmount()

    vi.setSystemTime(new Date(2026, 10, 3, 15, 5, 0, 0))
    await arrive()
    expect(header()).toContain("Focus 0:20:00")
  })
})

describe("the tracking reminder", () => {
  const reminders = { enabled: true, days: [2], fromHour: 9, toHour: 17, everyMinutes: 30 }

  test("does not say it again a minute later just because you came back", async () => {
    store(baseState({ reminders }))
    const first = await arrive()
    expect(screen.getAllByText(/Nothing is tracking/)).toHaveLength(1)
    first.unmount()

    vi.setSystemTime(new Date(2026, 10, 3, 15, 1, 0, 0))
    await arrive()
    expect(screen.queryByText(/Nothing is tracking/), "the reminder fired again on arrival").toBeNull()
  })

  test("still says it again once its interval has passed", async () => {
    store(baseState({ reminders }))
    const first = await arrive()
    first.unmount()

    vi.setSystemTime(new Date(2026, 10, 3, 15, 31, 0, 0))
    await arrive()
    expect(screen.getAllByText(/Nothing is tracking/)).toHaveLength(1)
  })
})

describe("the forgotten-timer warning", () => {
  test("is said once for a timer, not on every arrival", async () => {
    store(running(baseState(), "night shift", new Date(2026, 10, 3, 2, 0)))
    const first = await arrive()
    expect(screen.getAllByText(/has been running for 13 hours/)).toHaveLength(1)
    first.unmount()

    vi.setSystemTime(new Date(2026, 10, 3, 15, 10, 0, 0))
    await arrive()
    expect(screen.queryByText(/has been running for/), "the same warning again, for the same timer").toBeNull()
  })
})

describe("what you typed and did not start", () => {
  test("a description typed into the timer bar is still there", async () => {
    store(baseState({ entries: [entry(1, "2026-11-03", "09:00", "10:00", { description: "planning" })] }))
    const first = await arrive()
    fireEvent.change(screen.getByPlaceholderText("What are you working on?"), { target: { value: "draft words" } })
    first.unmount()

    await arrive()
    expect((screen.getByPlaceholderText("What are you working on?") as HTMLInputElement).value).toBe("draft words")
  })

  test("a description that was started is not brought back as a draft once it stops", async () => {
    store(baseState())
    const first = await arrive()
    fireEvent.change(screen.getByPlaceholderText("What are you working on?"), { target: { value: "started words" } })
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }))
    fireEvent.click(screen.getAllByRole("button", { name: "Stop timer" })[0])
    first.unmount()

    await arrive()
    expect((screen.getByPlaceholderText("What are you working on?") as HTMLInputElement).value).toBe("")
  })

  test("a manual entry half filled in is still in manual mode, with its times", async () => {
    store(baseState())
    const first = await arrive()
    fireEvent.click(screen.getByRole("button", { name: "Toggle timer or manual mode" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Start time" }), { target: { value: "08:15" } })
    fireEvent.change(screen.getByRole("textbox", { name: "End time" }), { target: { value: "08:45" } })
    first.unmount()

    await arrive()
    expect((screen.getByRole("textbox", { name: "Start time" }) as HTMLInputElement).value).toBe("08:15")
    expect((screen.getByRole("textbox", { name: "End time" }) as HTMLInputElement).value).toBe("08:45")
  })
})
