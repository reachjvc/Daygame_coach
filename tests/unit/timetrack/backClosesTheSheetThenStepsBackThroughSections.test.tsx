// @vitest-environment jsdom
/**
 * BACK CLOSES THE SHEET, THEN STEPS BACK THROUGH THE SECTIONS. A RELOAD KEEPS
 * THE SECTION, AND A LINK CAN OPEN ONE.
 *
 * The sections (Timer, Calendar, Reports, …) and the entry sheet lived only in
 * the tracker's memory. So Android's Back button left the tracker instead of
 * closing the sheet, a reload on Settings landed on Timer, no link could open
 * Calendar, and a shared report's `?report=` stayed in the address and forced
 * Reports on every reload after it (getting-around #3 and #12, design rule D8
 * in Plans/time-tracker-like-toggl.md).
 *
 * The whole tracker is mounted, signed out, as the lab at /test/toggl is. The
 * browser's own history does the stepping: `history.back()` fires the same
 * `popstate` the Back button does.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { SCREEN_KEY, STORAGE_KEY } from "@/src/timetrack/config"
import { defaultReportConfig, encodeReportConfig } from "@/src/timetrack/reportsService"
import { runningEntry } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 10, 3, 15, 0, 0, 0)
const LAB = "/test/toggl"

function stored(): TimetrackState {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
}

/** Which section the phone's own bar marks as the one you are on ("More" for Manage and Settings) */
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

function sheetOpen(): boolean {
  return screen.queryByRole("dialog", { name: "Time entry details" }) !== null
}

async function back() {
  await act(async () => {
    // the browser steps history on its own schedule; wait for the step itself, not a guess at its time
    const stepped = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }))
    window.history.back()
    await stepped
  })
}

async function forward() {
  await act(async () => {
    const stepped = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }))
    window.history.forward()
    await stepped
  })
}

async function mount(address: string) {
  window.history.pushState(null, "", address)
  const view = render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
  return view
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  // the calendar scrolls to the working day; jsdom has no layout to scroll
  Element.prototype.scrollIntoView = vi.fn()
  const state = baseState({ entries: [entry(1, "2026-11-03", "09:00", "10:00", { description: "planning" })] })
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("Back", () => {
  test("closes the sheet, then steps back through the sections", async () => {
    await mount(LAB)
    expect(section()).toBe("Timer")

    tapSection("Calendar")
    expect(window.location.search).toBe("?view=calendar")
    expect(section()).toBe("Calendar")

    fireEvent.click(screen.getByTitle(/^planning ·/))
    expect(sheetOpen()).toBe(true)
    expect(new URLSearchParams(window.location.search).get("entry")).toBe("1")

    await back()
    await waitFor(() => expect(sheetOpen(), "Back left the sheet open").toBe(false))
    expect(window.location.search).toBe("?view=calendar")
    expect(section()).toBe("Calendar")

    await back()
    await waitFor(() => expect(section()).toBe("Timer"))
    expect(window.location.pathname).toBe(LAB)
    expect(window.location.search).toBe("")

    // and Forward goes the other way, as it does on every other page
    await forward()
    await waitFor(() => expect(section()).toBe("Calendar"))
  })

  test("after the sheet's own Close, Back steps a section instead of opening the sheet again", async () => {
    await mount(LAB)
    tapSection("Calendar")
    fireEvent.click(screen.getByTitle(/^planning ·/))
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    await waitFor(() => expect(sheetOpen()).toBe(false))
    await waitFor(() => expect(window.location.search).toBe("?view=calendar"))

    await back()
    await waitFor(() => expect(section()).toBe("Timer"))
    expect(sheetOpen()).toBe(false)
  })

  test("switching to the section you are already on adds no step", async () => {
    await mount(LAB)
    tapSection("Calendar")
    tapSection("Calendar")
    await back()
    await waitFor(() => expect(section()).toBe("Timer"))
  })
})

describe("the address", () => {
  test("a reload on Settings stays on Settings", async () => {
    const first = await mount(LAB)
    fireEvent.click(screen.getByRole("button", { name: "More" }))
    fireEvent.click(within(screen.getByRole("dialog", { name: "More" })).getByRole("button", { name: "Settings" }))
    expect(window.location.search).toBe("?view=settings")
    first.unmount()

    // a reload: the same address, a fresh tracker
    render(<TogglLab />)
    await screen.findByRole("navigation", { name: "Sections" })
    expect(section()).toBe("More")
    expect(window.location.search).toBe("?view=settings")
  })

  test("a link can open a section, whatever was open last time", async () => {
    window.localStorage.setItem(SCREEN_KEY, "calendar")
    await mount(`${LAB}?view=projects`)
    expect(section()).toBe("Projects")
  })

  test("a link can open an entry's sheet", async () => {
    await mount(`${LAB}?view=calendar&entry=1`)
    expect(section()).toBe("Calendar")
    expect(sheetOpen()).toBe(true)
  })

  test("an address with no section opens on Timer in a browser that remembers nothing", async () => {
    await mount(LAB)
    expect(section()).toBe("Timer")
  })

  test("a shared report opens Reports once, and leaves no ?report= behind to force it again", async () => {
    const config = defaultReportConfig("2026-11-03", 1, baseState().workspace.rounding)
    const first = await mount(`${LAB}?report=${encodeURIComponent(encodeReportConfig(config))}`)
    expect(section()).toBe("Reports")
    expect(window.location.search).not.toContain("report=")

    tapSection("Timer")
    first.unmount()
    render(<TogglLab />)
    await screen.findByRole("navigation", { name: "Sections" })
    expect(section(), "a reload after leaving Reports went back to Reports").toBe("Timer")
  })

  test("a start link still starts its timer, and does not start it again on reload", async () => {
    const first = await mount(`${LAB}?start=1&description=from%20a%20link`)
    await waitFor(() => expect(runningEntry(stored())?.description).toBe("from a link"))
    expect(window.location.search).not.toContain("start=")
    const id = runningEntry(stored())!.id
    first.unmount()

    render(<TogglLab />)
    await screen.findByRole("navigation", { name: "Sections" })
    expect(runningEntry(stored())?.id).toBe(id)
  })
})
