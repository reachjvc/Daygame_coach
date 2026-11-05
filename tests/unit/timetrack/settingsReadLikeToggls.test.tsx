// @vitest-environment jsdom
/**
 * SETTINGS IN TOGGL'S SECTIONS, AND ONLY SWITCHES THAT DO SOMETHING (Plans/toggl-parity.md, Phase 7).
 *
 * Toggl Track's settings group the everyday choices as Date and time, Timer
 * defaults and Notifications [V1 3:17–3:26; H25 #33, #41, #43]. Ours had one
 * "Profile" card with everything in it, and the running-timer switch three
 * cards down in Automation. Two of Toggl's switches are new here and each does
 * what it says: "First tab" picks the phone tab the tracker opens on, "Haptic
 * feedback" lets the drums and the calendar tick or stay still.
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { hapticTick, setHaptics } from "@/src/timetrack/haptics"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState } from "./helpers"

function asPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

async function open(copy: TimetrackState, address = "/test/toggl") {
  window.history.replaceState(null, "", address)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TogglLab />)
  await wait(1_500)
}

const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState

// jsdom has no layout; the sections' tab strip scrolls its tab into view
Element.prototype.scrollIntoView = () => {}

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
  setHaptics(true)
})

describe("the settings screen", () => {
  test("has Toggl's sections, each with its own choices", async () => {
    await open(baseState(), "/test/toggl?view=settings")
    const section = (name: string) => within(screen.getByRole("heading", { name }).closest("section")!)
    expect(section("Date and time").getByText("Duration display format")).toBeTruthy()
    expect(section("Date and time").getByText("First day of the week")).toBeTruthy()
    expect(section("Timer defaults").getByRole("switch", { name: "Group similar time entries" })).toBeTruthy()
    expect(section("Timer defaults").getByRole("switch", { name: "Swipe actions" })).toBeTruthy()
    expect(section("Timer defaults").getByRole("switch", { name: "Haptic feedback" })).toBeTruthy()
    expect(section("Timer defaults").getByText("First tab")).toBeTruthy()
    expect(section("Notifications").getByRole("switch", { name: "Running timer" })).toBeTruthy()
  })

  test("Haptic feedback off is kept, and the drums and calendar stay still", async () => {
    await open(baseState(), "/test/toggl?view=settings")
    fireEvent.click(screen.getByRole("switch", { name: "Haptic feedback" }))
    await wait(100)
    expect(stored().user.haptics).toBe(false)

    const vibrate = vi.fn(() => true)
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate })
    hapticTick()
    expect(vibrate).not.toHaveBeenCalled()
    setHaptics(true)
    hapticTick()
    expect(vibrate).toHaveBeenCalledWith(5)
  })
})

describe("First tab", () => {
  test("a phone opens on the tab chosen there", async () => {
    asPhone()
    const copy = baseState()
    await open({ ...copy, user: { ...copy.user, firstTab: "calendar" } })
    expect(screen.getByRole("heading", { name: "Calendar" })).toBeTruthy()
  })

  test("an address that names a section still wins", async () => {
    asPhone()
    const copy = baseState()
    await open({ ...copy, user: { ...copy.user, firstTab: "calendar" } }, "/test/toggl?view=reports")
    expect(screen.getByRole("heading", { name: "Reports" })).toBeTruthy()
  })
})
