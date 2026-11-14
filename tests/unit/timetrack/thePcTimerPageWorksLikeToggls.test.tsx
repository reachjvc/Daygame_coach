// @vitest-environment jsdom
/**
 * THE PC'S TIMER PAGE, LAID OUT AND WORKING LIKE TOGGL TRACK'S WEB APP
 * (Phase 5 of Plans/toggl-parity.md: D-PC-SHELL, D-PC-RUNNING, D-PC-LIST,
 * D-PC-MANUAL, D-PC-KEYS, D-SWITCHED).
 *
 * jsdom has no `matchMedia`, so the tracker takes it for a PC (`useIsMobile`),
 * which is the layout these are about. The whole tracker is mounted, signed
 * out, as the lab at /test/toggl is.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { SHORTCUTS, STORAGE_KEY, TIMER_VIEW_KEY } from "@/src/timetrack/config"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

// a Thursday: the Monday week is 2–8 Nov, W45
const NOW = new Date(2026, 10, 5, 15, 0, 0, 0)
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).toISOString()

function history(): TimetrackState {
  return baseState({
    entries: [
      entry(1, "2026-11-05", "09:00", "10:00", { description: "email" }),
      entry(2, "2026-11-04", "09:00", "11:00", { description: "wednesday work" }),
      entry(3, "2026-10-27", "09:00", "10:30", { description: "last week's work" }),
    ],
  })
}

function withRunning(): TimetrackState {
  return startTimer(history(), { description: "deep work", projectId: null, taskId: null, tagIds: [], billable: false }, at(5, 14)).state
}

const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
const main = () => within(screen.getByRole("main"))
const sidebar = () => screen.getByRole("navigation", { name: "Tracker" })
const views = () => within(screen.getByRole("group", { name: "Timer view" }))
const press = (key: string) =>
  act(() => {
    fireEvent.keyDown(document.body, { key })
  })

async function mount(copy: TimetrackState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const view = render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Tracker" })
  return view
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  Element.prototype.scrollIntoView = vi.fn()
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("the sidebar", () => {
  test("lists the sections in Toggl's order, under its headings", async () => {
    await mount(history())
    const rows = within(sidebar()).getAllByRole("button").map((b) => b.textContent?.trim())
    expect(rows).toEqual(["Timer", "Reports", "Projects", "Clients", "Tags", "Team", "Settings"])
    expect(within(sidebar()).getByText("Track")).toBeTruthy()
    expect(within(sidebar()).getByText("Analyze")).toBeTruthy()
    expect(within(sidebar()).getByText("Manage")).toBeTruthy()
    expect(within(sidebar()).getByText("Admin")).toBeTruthy()
  })

  test("Clients and Tags open Manage on that part, so nothing Manage had is lost", async () => {
    await mount(history())
    fireEvent.click(within(sidebar()).getByRole("button", { name: "Tags" }))
    expect(window.location.search).toBe("?view=manage")
    expect(within(sidebar()).getByRole("button", { name: "Tags" }).getAttribute("aria-current")).toBe("page")
    fireEvent.click(within(sidebar()).getByRole("button", { name: "Clients" }))
    expect(within(sidebar()).getByRole("button", { name: "Clients" }).getAttribute("aria-current")).toBe("page")
    expect(within(sidebar()).getByRole("button", { name: "Tags" }).getAttribute("aria-current")).toBeNull()
  })

  test("while a timer runs, Timer is the running clock, and its pencil opens the running entry", async () => {
    await mount(withRunning())
    const timer = within(sidebar()).getByRole("button", { name: /^Timer, running/ })
    expect(timer.textContent).toContain("1:00:00")
    fireEvent.click(within(sidebar()).getByRole("button", { name: "Edit the running time entry" }))
    expect(screen.getByRole("dialog", { name: "Time entry details" })).toBeTruthy()
  })
})

describe("the week row", () => {
  test("starts List view at All dates, with today's and this week's totals", async () => {
    await mount(history())
    const row = document.querySelector("[data-week-row]") as HTMLElement
    expect(within(row).getByText("All dates")).toBeTruthy()
    expect(row.querySelector("[data-today-total]")?.textContent).toBe("1:00")
    expect(row.querySelector("[data-week-total]")?.textContent).toBe("3:00")
    // every date is listed, last week's too
    expect(main().getByDisplayValue("last week's work")).toBeTruthy()
  })

  test("‹ picks this week, then the week before, and the list shows only that week", async () => {
    await mount(history())
    fireEvent.click(screen.getByRole("button", { name: "Select previous period" }))
    expect(screen.getByText("This week")).toBeTruthy()
    expect(screen.getByText("· W45")).toBeTruthy()
    expect(main().queryByDisplayValue("last week's work")).toBeNull()
    expect(main().getByDisplayValue("wednesday work")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Select previous period" }))
    expect(screen.getByText("Last week")).toBeTruthy()
    expect(screen.getByText("· W44")).toBeTruthy()
    expect(main().getByDisplayValue("last week's work")).toBeTruthy()
    expect(main().queryByDisplayValue("wednesday work")).toBeNull()
    expect(document.querySelector("[data-week-total]")?.textContent).toBe("1:30")

    // T comes back
    press("t")
    expect(screen.getByText("All dates")).toBeTruthy()
  })

  test("Calendar shows the calendar on the Timer page, under the timer bar, and the choice is kept", async () => {
    const first = await mount(history())
    fireEvent.click(views().getByRole("button", { name: "Calendar" }))
    expect(views().getByRole("button", { name: "Calendar" }).getAttribute("aria-pressed")).toBe("true")
    expect(window.localStorage.getItem(TIMER_VIEW_KEY)).toBe("calendar")
    // still the Timer page: the bar is there, the address is the Timer's
    expect(main().getByPlaceholderText("What are you working on?")).toBeTruthy()
    expect(window.location.search).toBe("")
    expect(screen.getByTitle(/^email ·/)).toBeTruthy()
    expect(screen.getByText("This week")).toBeTruthy()
    first.unmount()

    await mount(history())
    expect(views().getByRole("button", { name: "Calendar" }).getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(views().getByRole("button", { name: "List view" }))
    expect(window.localStorage.getItem(TIMER_VIEW_KEY)).toBeNull()
    expect(main().getByDisplayValue("email")).toBeTruthy()
  })

  test("in Calendar, ‹ steps the calendar back a week, and T brings it to today", async () => {
    await mount(history())
    fireEvent.click(views().getByRole("button", { name: "Calendar" }))
    fireEvent.click(screen.getByRole("button", { name: "Select previous period" }))
    expect(screen.getByText("Last week")).toBeTruthy()
    expect(screen.getByTitle(/^last week's work ·/)).toBeTruthy()
    expect(screen.queryByTitle(/^email ·/)).toBeNull()

    press("t")
    expect(screen.getByText("This week")).toBeTruthy()
    expect(screen.getByTitle(/^email ·/)).toBeTruthy()
  })

  test("an old Calendar address opens the Timer page on its Calendar view", async () => {
    window.history.replaceState(null, "", "/test/toggl?view=calendar")
    await mount(history())
    expect(main().getByPlaceholderText("What are you working on?")).toBeTruthy()
    expect(screen.getByTitle(/^email ·/)).toBeTruthy()
    expect(within(sidebar()).getByRole("button", { name: "Timer" }).getAttribute("aria-current")).toBe("page")
  })
})

describe("one click on the running time", () => {
  const duration = () => main().getAllByLabelText("Duration")[0] as HTMLInputElement
  const box = () => screen.getByRole("dialog", { name: "Adjust duration" })

  test("makes it typeable and opens the box: Start, Stop greyed, the date, Stop at…, Switched at…, the drums", async () => {
    await mount(withRunning())
    fireEvent.focus(duration())
    const opened = within(box())
    expect((opened.getByLabelText("Start") as HTMLInputElement).value).toBe("14:00")
    const stop = opened.getByLabelText("Stop") as HTMLInputElement
    expect(stop.disabled).toBe(true)
    expect(stop.value).toBe("now")
    expect((opened.getByDisplayValue("2026-11-05") as HTMLInputElement).type).toBe("date")
    expect(opened.getByRole("button", { name: "Stop at…" })).toBeTruthy()
    expect(opened.getByRole("button", { name: "Switched at…" })).toBeTruthy()
    fireEvent.click(opened.getByRole("button", { name: "Turn the start on the drums" }))
    expect(opened.getAllByRole("listbox").length).toBeGreaterThan(0)
  })

  test('"90" + Enter: the timer started 90 minutes ago, still running', async () => {
    await mount(withRunning())
    fireEvent.focus(duration())
    fireEvent.change(duration(), { target: { value: "90" } })
    fireEvent.keyDown(duration(), { key: "Enter" })
    fireEvent.blur(duration())
    await waitFor(() => expect(stored().entries.find((e) => e.stop === null)?.start).toBe(at(5, 13, 30)))
    expect(screen.queryByRole("dialog", { name: "Adjust duration" })).toBeNull()
  })

  test("a start typed in the box keeps it running from there (the one rule for a typed start)", async () => {
    await mount(withRunning())
    fireEvent.focus(duration())
    const start = within(box()).getByLabelText("Start")
    fireEvent.focus(start)
    fireEvent.change(start, { target: { value: "1230" } })
    fireEvent.keyDown(start, { key: "Enter" })
    fireEvent.blur(start)
    await waitFor(() => expect(stored().entries.find((e) => e.stop === null)?.start).toBe(at(5, 12, 30)))
  })

  test("Escape closes the box", async () => {
    await mount(withRunning())
    fireEvent.focus(duration())
    expect(box()).toBeTruthy()
    fireEvent.keyDown(duration(), { key: "Escape" })
    expect(screen.queryByRole("dialog", { name: "Adjust duration" })).toBeNull()
    fireEvent.focus(duration())
    fireEvent.keyDown(within(box()).getByLabelText("Start"), { key: "Escape" })
    expect(screen.queryByRole("dialog", { name: "Adjust duration" })).toBeNull()
  })

  test("Stop at… in the box opens the Stopped at… picker", async () => {
    await mount(withRunning())
    fireEvent.focus(duration())
    fireEvent.click(within(box()).getByRole("button", { name: "Stop at…" }))
    expect(screen.getByRole("dialog", { name: /^Stop at…$/ })).toBeTruthy()
  })
})

describe("the list", () => {
  const openMenu = () => {
    const triggers = main().getAllByRole("button", { name: "More actions for this time entry" })
    fireEvent.click(triggers[0])
    return document.querySelector("[data-dropdown-panel]") as HTMLElement
  }

  test("the ⋮ menu is Toggl's, in Toggl's order, and keeps Edit details… after it", async () => {
    await mount(history())
    const panel = openMenu()
    const items = within(panel).getAllByRole("button").map((b) => b.textContent?.trim())
    expect(items).toEqual(["Split", "Pin as favorite", "Go to project", "Copy description", "Copy start link", "Duplicate", "Delete", "Edit details…"])
  })

  test("Delete asks nothing and says Toggl's words, with Undo", async () => {
    await mount(history())
    const panel = openMenu()
    fireEvent.click(within(panel).getByRole("button", { name: "Delete" }))
    await screen.findByText("The time entry was deleted.")
    expect(screen.queryByRole("dialog")).toBeNull()
    const toast = screen.getByText("The time entry was deleted.").parentElement as HTMLElement
    fireEvent.click(within(toast).getByRole("button", { name: /Undo/ }))
    await waitFor(() => expect(stored().entries.filter((e) => !e.serverDeletedAt).length).toBe(3))
  })

  test("▶ and ⋮ wait for a hover where a pointer can hover, except on the running row", async () => {
    await mount(withRunning())
    const actions = [...document.querySelectorAll("[data-row-actions]")] as HTMLElement[]
    expect(actions.length).toBeGreaterThan(1)
    const running = actions.filter((a) => !a.className.includes("pointer-fine:opacity-0"))
    expect(running.length).toBe(1)
    expect(actions.filter((a) => a.className.includes("pointer-fine:group-hover/row:opacity-100")).length).toBe(actions.length - 1)
  })
})

describe("manual mode", () => {
  test("the switch beside ▶, or M, gives Toggl Track's manual bar: What have you done?, start → stop, +", async () => {
    await mount(history())
    const bar = main()
    const toggles = bar.getAllByRole("button", { name: "Toggle timer or manual mode" })
    expect(toggles.length).toBe(1)
    // beside the main button, after it
    const start = bar.getByRole("button", { name: "Start timer" })
    expect(start.compareDocumentPosition(toggles[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    press("m")
    const field = bar.getByPlaceholderText("What have you done?")
    const add = bar.getByRole("button", { name: "Add time entry" })
    expect(add.getAttribute("title")).toBe("Add time entry")
    const startBox = bar.getAllByLabelText("Start time")[0]
    const endBox = bar.getAllByLabelText("End time")[0]
    expect(startBox.compareDocumentPosition(endBox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.change(field, { target: { value: "reading" } })
    fireEvent.change(startBox, { target: { value: "11:00" } })
    fireEvent.change(endBox, { target: { value: "11:45" } })
    fireEvent.click(add)
    await waitFor(() => expect(stored().entries.find((e) => e.description === "reading")).toMatchObject({ start: at(5, 11), stop: at(5, 11, 45) }))

    // M again is the timer
    press("m")
    expect(bar.getByPlaceholderText("What are you working on?")).toBeTruthy()
  })
})

describe("the shortcut list", () => {
  test("has T beside S, N, M, C and 1–9, and never says Toggl", async () => {
    await mount(history())
    expect(SHORTCUTS.map((s) => s.keys)).toEqual(expect.arrayContaining(["S", "N", "M", "C", "T", "1 … 9", "Shift + ?"]))
    act(() => {
      fireEvent.keyDown(document.body, { key: "?", shiftKey: true })
    })
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" })
    expect(within(dialog).getByText("T")).toBeTruthy()
    expect(within(dialog).getByText("Go to today (in the calendar)")).toBeTruthy()
    expect(dialog.textContent).not.toMatch(/toggl/i)
  })

  test("T does nothing while a field has focus", async () => {
    await mount(history())
    fireEvent.click(screen.getByRole("button", { name: "Select previous period" }))
    expect(screen.getByText("This week")).toBeTruthy()
    const field = main().getByPlaceholderText("What are you working on?")
    field.focus()
    act(() => {
      fireEvent.keyDown(field, { key: "t" })
    })
    expect(screen.getByText("This week")).toBeTruthy()
  })
})
