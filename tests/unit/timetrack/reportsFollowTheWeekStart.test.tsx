// @vitest-environment jsdom
/**
 * REPORTS' "THIS WEEK" IS THE WEEK THE PERSON'S WEEK START SAYS.
 *
 * Found by the heavy-user audit of 2026-11-04 (D7): with Sunday chosen as the first
 * day of the week, the Timer said "This week 55.61 h" while Reports showed Monday to
 * Sunday and 39.18 h. The report's range is made once, on arrival — before the
 * account's settings have loaded, and never again — so it kept whichever week start
 * the browser opened with.
 *
 * A range that IS this week (or last week) under the old start now moves with the
 * setting. A range somebody picked by hand is theirs and stays.
 *
 * The whole tracker is mounted, signed out, as the lab at /test/toggl is.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { defaultReportConfig, followWeekStart } from "@/src/timetrack/reportsService"

import { baseState, entry } from "./helpers"

// a Wednesday: the Monday week is 11-02..11-08, the Sunday week 11-01..11-07
const NOW = new Date(2026, 10, 4, 15, 0, 0, 0)

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(baseState({ entries: [entry(1, "2026-11-01", "09:00", "10:00", { description: "sunday work" })] })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

const nav = (name: string) => {
  const buttons = screen.getAllByRole("button", { name }).filter((b) => b.closest("nav"))
  fireEvent.click(buttons[0])
}

describe("Reports' This week", () => {
  test("follows a week start changed in Settings", async () => {
    render(<TogglLab />)
    await screen.findByDisplayValue("sunday work")

    nav("Reports")
    expect(screen.getByText("2026-11-02 – 2026-11-08"), "the Monday week, before the change").toBeTruthy()

    nav("Settings")
    const field = screen.getByText("First day of the week").closest("label") as HTMLElement
    fireEvent.change(field.querySelector("select")!, { target: { value: "0" } })

    nav("Reports")
    expect(
      screen.queryByText("2026-11-01 – 2026-11-07"),
      "Reports still shows the Monday week after Sunday was chosen",
    ).toBeTruthy()
  })
})

describe("followWeekStart", () => {
  const rounding = { enabled: false, mode: "nearest" as const, minutes: 15 }

  test("moves this week and last week to the new start", () => {
    const monday = defaultReportConfig("2026-11-04", 1, rounding)
    expect(followWeekStart(monday, "2026-11-04", 1, 0).filters.range).toEqual({ start: "2026-11-01", end: "2026-11-07" })

    const lastWeek = { ...monday, filters: { ...monday.filters, range: { start: "2026-10-26", end: "2026-11-01" } } }
    expect(followWeekStart(lastWeek, "2026-11-04", 1, 0).filters.range).toEqual({ start: "2026-10-25", end: "2026-10-31" })
  })

  test("leaves a range picked by hand alone", () => {
    const monday = defaultReportConfig("2026-11-04", 1, rounding)
    const picked = { ...monday, filters: { ...monday.filters, range: { start: "2026-10-01", end: "2026-10-31" } } }
    expect(followWeekStart(picked, "2026-11-04", 1, 0)).toBe(picked)
  })
})
