// @vitest-environment jsdom
/**
 * REPORTS OPEN ON SUMMARY, ON "THIS WEEK", AND SAY SO (D-PC-REPORTS, Phase 6
 * of Plans/toggl-parity.md; W25 19:52).
 *
 * The range was already this week, but its button said only the two dates
 * ("2026-11-02 – 2026-11-08"), where Toggl Track's says "This week". A range
 * that is one of the presets is now named, with its dates beside the name.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { matchingPreset, presetRange } from "@/src/timetrack/reportsService"

import { baseState, entry } from "./helpers"

// a Thursday
const NOW = new Date(2026, 10, 5, 15, 0, 0, 0)

describe("matchingPreset", () => {
  test("names a range that is a preset, and nothing else", () => {
    expect(matchingPreset(presetRange("this_week", "2026-11-05", 1), "2026-11-05", 1)).toBe("this_week")
    expect(matchingPreset(presetRange("last_week", "2026-11-05", 1), "2026-11-05", 1)).toBe("last_week")
    expect(matchingPreset(presetRange("today", "2026-11-05", 1), "2026-11-05", 1)).toBe("today")
    expect(matchingPreset({ start: "2026-11-02", end: "2026-11-04" }, "2026-11-05", 1)).toBeNull()
  })
})

describe("Reports", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => {}
  })
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(NOW)
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baseState({ entries: [entry(1, "2026-11-05", "09:00", "10:00")] })))
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    window.localStorage.clear()
  })

  test("open on Summary, on This week", async () => {
    render(<TogglLab />)
    const sidebar = await screen.findByRole("navigation", { name: "Tracker" })
    fireEvent.click([...sidebar.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Reports")!)
    expect(screen.getByRole("button", { name: "Summary" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByText("This week")).toBeTruthy()
    expect(screen.getByText("2026-11-02 – 2026-11-08")).toBeTruthy()
  })
})
