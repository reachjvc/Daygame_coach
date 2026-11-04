// @vitest-environment jsdom
/**
 * THE TRACKER'S BACK CONTROL RETURNS TO THE PAGE YOU CAME FROM, AND ON THE PC
 * THE APP'S OWN HEADER TAKES THE PLACE OF THE TRACKER'S TOP ROW.
 *
 * "← Dashboard" was written into the tracker by hand, so coming from Thoughts
 * it sent you to the Dashboard, not back to Thoughts (getting-around #4,
 * design rule D9 in Plans/time-tracker-like-toggl.md). Now it steps back past
 * every section you visited inside the tracker, to the page before it, and
 * says that page's name. When there is no such page to step back to — opened
 * from a bookmark, or a browser that cannot say — it is the Dashboard, as before.
 *
 * On the PC the app's header is drawn above the tracker (`AppFrame`), so the
 * tracker's own "← Dashboard · Time" row would be a second bar saying the same
 * thing; there it is for phones only. jsdom draws no CSS, so "for phones only"
 * is read from the `sm:hidden` class that does it.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TimetrackScreen } from "@/src/timetrack/components/TimetrackScreen"
import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { ROUTES } from "@/src/shared/routes"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 10, 3, 15, 0, 0, 0)
const ORIGIN = "http://localhost:3000"

/** The browser's Navigation API, as Chrome and Edge give it: what this tab visited, in order */
function visited(paths: string[]) {
  const entries = paths.map((p, index) => ({ url: `${ORIGIN}${p}`, index, key: String(index) }))
  vi.stubGlobal("navigation", {
    entries: () => entries,
    currentEntry: entries[entries.length - 1],
  })
}

function backControl(): HTMLAnchorElement {
  const header = screen.getByRole("heading", { name: "Time" }).closest("header")!
  const link = [...header.querySelectorAll("a")].find((a) => a.textContent?.includes("←"))
  expect(link, "no back control in the tracker's header").toBeTruthy()
  return link as HTMLAnchorElement
}

async function mount(node: React.ReactNode, address: string = ROUTES.time) {
  window.history.pushState(null, "", address)
  render(node)
  await screen.findByRole("navigation", { name: "Sections" })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  const state = baseState({ entries: [entry(1, "2026-11-03", "09:00", "10:00", { description: "planning" })] })
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("the back control", () => {
  test("coming from Thoughts, it says Thoughts and goes back there", async () => {
    visited([ROUTES.dashboard, ROUTES.thoughts, ROUTES.time])
    const go = vi.spyOn(window.history, "go").mockImplementation(() => {})
    await mount(<TimetrackScreen account="user-1" />)

    await waitFor(() => expect(backControl().textContent).toContain("Thoughts"))
    fireEvent.click(backControl())
    expect(go).toHaveBeenCalledWith(-1)
  })

  test("after visiting sections inside the tracker, one tap still leaves it", async () => {
    visited([ROUTES.thoughts, ROUTES.time, `${ROUTES.time}?view=calendar`, `${ROUTES.time}?view=reports`])
    const go = vi.spyOn(window.history, "go").mockImplementation(() => {})
    await mount(<TimetrackScreen account="user-1" />, `${ROUTES.time}?view=reports`)

    await waitFor(() => expect(backControl().textContent).toContain("Thoughts"))
    fireEvent.click(backControl())
    expect(go).toHaveBeenCalledWith(-3)
  })

  test("opened with nothing before it, it is the Dashboard link it always was", async () => {
    visited([ROUTES.time])
    const go = vi.spyOn(window.history, "go")
    await mount(<TimetrackScreen account="user-1" />)

    const link = backControl()
    expect(link.textContent).toContain("Dashboard")
    expect(link.getAttribute("href")).toBe(ROUTES.dashboard)
    expect(go).not.toHaveBeenCalled()
  })

  test("coming from the sign-in page, it does not send you back to sign in", async () => {
    visited(["/auth/login", ROUTES.time])
    await mount(<TimetrackScreen account="user-1" />)
    expect(backControl().textContent).toContain("Dashboard")
  })

  test("in a browser without the Navigation API, it is the Dashboard link", async () => {
    await mount(<TimetrackScreen account="user-1" />)
    expect(backControl().textContent).toContain("Dashboard")
    expect(backControl().getAttribute("href")).toBe(ROUTES.dashboard)
  })
})

describe("on the PC, under the app's header", () => {
  test("the tracker's own back control is for phones only, and its title is only read aloud there", async () => {
    await mount(<TimetrackScreen account="user-1" />)
    expect(backControl().className.split(/\s+/)).toContain("sm:hidden")
    // still the page's heading: hidden from sight, not removed
    expect(screen.getByRole("heading", { name: "Time" }).className.split(/\s+/)).toContain("sm:sr-only")
  })

  test("the lab page has no app header above it, so it keeps its own row everywhere", async () => {
    await mount(<TogglLab />, "/test/toggl")
    expect(backControl().className.split(/\s+/)).not.toContain("sm:hidden")
    expect(screen.getByRole("heading", { name: "Time" }).className.split(/\s+/)).not.toContain("sm:sr-only")
  })
})
