// @vitest-environment jsdom
/**
 * THE PHONE'S TIMER TAB AND ITS BOTTOM BAR, LIKE TOGGL TRACK'S ANDROID APP
 * (Plans/toggl-parity.md Phase 1, D-PHONE-SHELL, D-START).
 *
 * A header "Timer" with ← (where you came from), the sync state, ⊕ and ⚙;
 * "List view | Pomodoro"; "YOUR ACTIVITY" with the week; days with totals;
 * rows with ▶. At the bottom, above three tabs, a bar: idle "I'm working on…"
 * and a round ▶ that starts at once; running, the time, the name and the
 * project with a round ■ that stops in one tap. ⚙ holds Projects, Clients,
 * Tags, Settings, Import and export. The PC keeps its own layout.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 7, 10, 12, 0, 0, 0)
const LAB = "/test/toggl"

function stored(): TimetrackState {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
}

function asPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

async function open(copy: TimetrackState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
}

const bar = () => screen.getByTestId("run-bar")
/** the tracker's own header comes first; a screen may have headers of its own */
const header = () => screen.getAllByRole("banner")[0]
const sections = () => screen.getByRole("navigation", { name: "Sections" })

function withHistory() {
  return baseState({
    entries: [
      entry(1, "2026-08-10", "09:00", "10:00", { description: "Email" }),
      entry(2, "2026-08-10", "10:00", "10:30", { description: "" }),
      entry(3, "2026-08-09", "17:00", "18:00", { description: "Gym", projectId: "31" }),
    ],
  })
}

async function back() {
  await act(async () => {
    const stepped = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }))
    window.history.back()
    await stepped
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  Element.prototype.scrollIntoView = vi.fn()
  window.history.replaceState(null, "", LAB)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("the header", () => {
  test("says Timer, has a way back, the sync state, ⊕ and ⚙", async () => {
    asPhone()
    await open(withHistory())
    const top = header()
    expect(within(top).getByRole("heading", { name: "Timer" })).toBeTruthy()
    expect(within(top).getByRole("link", { name: /←/ })).toBeTruthy()
    expect(within(top).getByRole("button", { name: "Add a past time entry" })).toBeTruthy()
    expect(within(top).getByRole("button", { name: "Settings and more" })).toBeTruthy()
    // the page still has its one heading, for the browser tests and a screen reader
    expect(screen.getByRole("heading", { name: /^Time$/ })).toBeTruthy()
  })

  test("has List view and Pomodoro, and Pomodoro lives there", async () => {
    asPhone()
    await open(withHistory())
    const tabs = screen.getByRole("tablist")
    expect(within(tabs).getAllByRole("tab").map((t) => t.textContent?.trim())).toEqual(["List view", "Pomodoro"])
    fireEvent.click(within(tabs).getByRole("tab", { name: /Pomodoro/ }))
    expect(screen.getByRole("switch", { name: "Use Pomodoro" })).toBeTruthy()
  })
})

describe("the list", () => {
  test("says YOUR ACTIVITY and the week, then days with totals and rows with ▶", async () => {
    asPhone()
    await open(withHistory())
    const main = within(screen.getByRole("main"))
    expect(main.getByText("Your activity")).toBeTruthy()
    expect(main.getByText(/This week/)).toBeTruthy()
    expect(main.getByText("Today")).toBeTruthy()
    expect(main.getByText("Yesterday")).toBeTruthy()
    expect(main.getByText("Email")).toBeTruthy()
    // an empty name reads as Toggl's does
    expect(main.getByText("Add description")).toBeTruthy()
    expect(main.getAllByRole("button", { name: "Continue this entry" }).length).toBeGreaterThanOrEqual(3)
    // Group similar entries moved to Settings
    expect(main.queryByLabelText("Group similar entries")).toBeNull()
  })

  test("a row's ⋮ still holds Duplicate, Split, favorites, the start link, Select and Delete", async () => {
    asPhone()
    await open(withHistory())
    fireEvent.click(within(screen.getByRole("main")).getAllByRole("button", { name: "More actions for this time entry" })[0])
    const menu = document.querySelector("[data-dropdown-panel]") as HTMLElement
    for (const name of ["Duplicate", "Split in two", "Add to favorites", "Copy start link", "Select", "Delete"]) {
      expect(within(menu).getByRole("button", { name: new RegExp(name) }), name).toBeTruthy()
    }
  })
})

describe("the bar at the bottom", () => {
  test("idle: I'm working on… and a round ▶ that starts at once with no name", async () => {
    asPhone()
    await open(withHistory())
    expect(within(bar()).getByRole("button", { name: /I’m working on…|I'm working on…/ })).toBeTruthy()
    fireEvent.click(within(bar()).getByRole("button", { name: "Start timer" }))
    await waitFor(() => expect(stored().entries.some((e) => e.stop === null)).toBe(true))
    expect(stored().entries.find((e) => e.stop === null)?.description).toBe("")
  })

  test("running: the time, the name, the project and client, and ■ stops it in one tap", async () => {
    asPhone()
    const running = startTimer(withHistory(), { description: "Call", projectId: "30", taskId: null, tagIds: [], billable: true }, new Date(2026, 7, 10, 11, 0).toISOString()).state
    await open(running)
    expect(within(bar()).getByText("1:00:00")).toBeTruthy()
    expect(within(bar()).getByText("Call")).toBeTruthy()
    expect(within(bar()).getByText(/Alpha/)).toBeTruthy()
    expect(within(bar()).getByText(/Acme/)).toBeTruthy()
    fireEvent.click(within(bar()).getByRole("button", { name: "Stop timer" }))
    await waitFor(() => expect(stored().entries.some((e) => e.stop === null)).toBe(false))
  })

  test("is there on Calendar and Reports too, above three tabs", async () => {
    asPhone()
    await open(withHistory())
    expect(within(sections()).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Timer", "Calendar", "Reports"])
    fireEvent.click(within(sections()).getByRole("button", { name: "Calendar" }))
    expect(within(header()).getByRole("heading", { name: "Calendar" })).toBeTruthy()
    expect(bar()).toBeTruthy()
    fireEvent.click(within(sections()).getByRole("button", { name: "Reports" }))
    expect(bar()).toBeTruthy()
  })
})

describe("⚙", () => {
  test("holds Projects, Clients, Tags, Settings, Import and export, each today's screen", async () => {
    asPhone()
    await open(withHistory())
    fireEvent.click(screen.getByRole("button", { name: "Settings and more" }))
    const sheet = screen.getByRole("dialog", { name: "Settings and more" })
    expect(within(sheet).getAllByRole("button").map((b) => b.textContent?.trim()).filter((t) => t !== "")).toEqual(
      expect.arrayContaining(["Projects", "Clients", "Tags", "Settings", "Import and export"]),
    )
    fireEvent.click(within(sheet).getByRole("button", { name: "Projects" }))
    expect(within(header()).getByRole("heading", { name: "Projects" })).toBeTruthy()
    expect(window.location.search).toBe("?view=projects")

    fireEvent.click(screen.getByRole("button", { name: "Settings and more" }))
    fireEvent.click(within(screen.getByRole("dialog", { name: "Settings and more" })).getByRole("button", { name: "Import and export" }))
    expect(window.location.search).toBe("?view=settings")
    expect(screen.getAllByRole("button", { name: /Upload this browser|Export|Import/ }).length).toBeGreaterThan(0)
  })

  test("Back steps back from a ⚙ screen to the tab you were on", async () => {
    asPhone()
    await open(withHistory())
    fireEvent.click(screen.getByRole("button", { name: "Settings and more" }))
    fireEvent.click(within(screen.getByRole("dialog", { name: "Settings and more" })).getByRole("button", { name: "Settings" }))
    expect(within(header()).getByRole("heading", { name: "Settings" })).toBeTruthy()
    await back()
    await waitFor(() => expect(within(header()).getByRole("heading", { name: "Timer" })).toBeTruthy())
  })
})

test("the PC keeps its own timer bar", async () => {
  await open(withHistory())
  expect(within(screen.getByRole("main")).getByPlaceholderText("What are you working on?")).toBeTruthy()
  expect(screen.queryByTestId("run-bar")).toBeNull()
})
