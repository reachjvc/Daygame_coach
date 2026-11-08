// @vitest-environment jsdom
/**
 * THE PHONE'S REPORTS TAB, TOGGL'S SHORT SCREEN (Plans/toggl-parity.md
 * Phase 4, D-PHONE-REPORTS).
 *
 * A date chip that opens a sheet (Today · Yesterday · This week · Last week ·
 * This month · Last month, and a month grid); "Tracked hours" with the total,
 * and billable and amount only when there are any; bars per day; "Group by
 * Projects | Clients" with a donut and its list; "Details" opens today's full
 * reports, every tab kept; ⬇ downloads the range.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

// Monday 10 August 2026; the week starts on Monday
const NOW = new Date(2026, 7, 12, 15, 0, 0, 0)

async function openReports(copy: TimetrackState) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("max-width"), media: query, addEventListener: () => {}, removeEventListener: () => {} }))
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
  fireEvent.click(within(screen.getByRole("navigation", { name: "Sections" })).getByRole("button", { name: "Reports" }))
}

const main = () => within(screen.getByRole("main"))

function week() {
  return baseState({
    entries: [
      entry(1, "2026-08-10", "09:00", "11:00", { description: "Build", projectId: "30", billable: false }),
      entry(2, "2026-08-11", "09:00", "10:30", { description: "Plan", projectId: "31", billable: false }),
      // last week
      entry(3, "2026-08-04", "09:00", "10:00", { description: "Old", projectId: "31", billable: false }),
    ],
  })
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
  vi.restoreAllMocks()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("the Reports tab", () => {
  test("This week: Tracked hours with the total, no billable or amount when there are none, bars and a donut", async () => {
    await openReports(week())
    expect(main().getByRole("button", { name: /This week/ })).toBeTruthy()
    const card = within(main().getByRole("region", { name: "Tracked hours" }))
    expect(card.getByText("3:30")).toBeTruthy()
    expect(card.queryByText(/Billable/)).toBeNull()
    expect(card.queryByText(/Amount/)).toBeNull()
    expect(main().getByRole("radio", { name: "Projects" }).getAttribute("aria-checked")).toBe("true")
    expect(main().getByText("Alpha")).toBeTruthy()
    expect(main().getByText("Beta")).toBeTruthy()
  })

  test("billable and amount show once there are any", async () => {
    const copy = week()
    copy.entries[0] = { ...copy.entries[0], billable: true }
    await openReports(copy)
    const card = within(main().getByRole("region", { name: "Tracked hours" }))
    expect(card.getByText("Billable")).toBeTruthy()
    expect(card.getByText("Amount")).toBeTruthy()
  })

  test("the date sheet: Last week changes the numbers", async () => {
    await openReports(week())
    fireEvent.click(main().getByRole("button", { name: /This week/ }))
    const sheet = within(screen.getByRole("dialog", { name: "Date range" }))
    for (const name of ["Today", "Yesterday", "This week", "Last week", "This month", "Last month"]) expect(sheet.getByRole("button", { name })).toBeTruthy()
    fireEvent.click(sheet.getByRole("button", { name: "Last week" }))
    expect(within(main().getByRole("region", { name: "Tracked hours" })).getByText("1:00")).toBeTruthy()
  })

  test("the month grid picks a range: a first day, then a last", async () => {
    await openReports(week())
    fireEvent.click(main().getByRole("button", { name: /This week/ }))
    const sheet = within(screen.getByRole("dialog", { name: "Date range" }))
    fireEvent.click(sheet.getByRole("button", { name: "2026-08-04" }))
    fireEvent.click(sheet.getByRole("button", { name: "2026-08-10" }))
    fireEvent.click(sheet.getByRole("button", { name: "Done" }))
    expect(within(main().getByRole("region", { name: "Tracked hours" })).getByText("3:00")).toBeTruthy()
  })

  test("the month grid is headed by the weekdays, from the person's first day of the week", async () => {
    await openReports(week())
    fireEvent.click(main().getByRole("button", { name: /This week/ }))
    const sheet = screen.getByRole("dialog", { name: "Date range" })
    const letters = [...sheet.querySelectorAll("[data-weekday]")].map((el) => el.textContent)
    expect(letters).toEqual(["M", "T", "W", "T", "F", "S", "S"])
  })

  test("the date sheet is headed Cancel · ‹ month › · Done, as Toggl's (H25 help_28 f010); Cancel changes nothing", async () => {
    await openReports(week())
    fireEvent.click(main().getByRole("button", { name: /This week/ }))
    const sheet = screen.getByRole("dialog", { name: "Date range" })
    const header = sheet.querySelector("[data-sheet-header]") as HTMLElement
    expect([...header.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim())).toEqual([
      "Cancel",
      "Previous month",
      "Next month",
      "Done",
    ])
    expect(header.textContent).toContain("August 2026")
    fireEvent.click(within(sheet).getByRole("button", { name: "2026-08-04" }))
    fireEvent.click(within(header).getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog", { name: "Date range" })).toBeNull()
    expect(within(main().getByRole("region", { name: "Tracked hours" })).getByText("3:30")).toBeTruthy()
  })

  test("Group by Clients", async () => {
    await openReports(week())
    fireEvent.click(main().getByRole("radio", { name: "Clients" }))
    expect(main().getByText("Acme")).toBeTruthy()
  })

  test("Details opens the full reports, every tab kept", async () => {
    await openReports(week())
    fireEvent.click(main().getByRole("button", { name: "Details" }))
    for (const tab of ["Summary", "Detailed", "Workload", "Profitability"]) expect(main().getAllByRole("button", { name: tab }).length).toBeGreaterThan(0)
    fireEvent.click(main().getByRole("button", { name: /Back to the short report/ }))
    expect(main().getByRole("region", { name: "Tracked hours" })).toBeTruthy()
  })

  test("⬇ downloads the range", async () => {
    const files: Blob[] = []
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn((blob: Blob) => (files.push(blob), "blob:report")), revokeObjectURL: vi.fn() }))
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    await openReports(week())
    fireEvent.click(within(screen.getAllByRole("banner")[0]).getByRole("button", { name: "Download this report" }))
    expect(clicked).toHaveBeenCalled()
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(files[0])
    })
    expect(text).toContain("Alpha")
  })
})
