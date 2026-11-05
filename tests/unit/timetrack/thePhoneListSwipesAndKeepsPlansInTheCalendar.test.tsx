// @vitest-environment jsdom
/**
 * THE PHONE LIST, PHASE 3 OF Plans/toggl-parity.md: SWIPES, PLANS, AND WHAT
 * THE FINDABILITY RUN STUMBLED ON.
 *
 * Swipe a row right past three quarters of its width to continue it (the
 * running one stops), left to delete it with Undo; a finger going up or down
 * is a scroll and nothing moves; Settings has "Swipe actions", on. A planned
 * entry is in the calendar, not a row, until it starts — its day still says
 * how much is planned. The running row has no ▷ (a tester read it as the
 * timer's control), and the sync dot says what it means when tapped.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { swipeAction, swipeAxis } from "@/src/timetrack/phoneListService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 7, 10, 12, 0, 0, 0)
const ROW_WIDTH = 400

function stored(): TimetrackState {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
}

async function open(copy: TimetrackState) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
}

const main = () => within(screen.getByRole("main"))
const row = (text: string) => main().getByText(text).closest("[data-swipe-row]") as HTMLElement

const finger = { pointerId: 4, pointerType: "touch", isPrimary: true, button: 0 }
function swipe(el: HTMLElement, dx: number, dy = 0) {
  fireEvent.pointerDown(el, { ...finger, clientX: 200, clientY: 300 })
  for (let i = 1; i <= 8; i++) fireEvent.pointerMove(el, { ...finger, clientX: 200 + (dx * i) / 8, clientY: 300 + (dy * i) / 8 })
  fireEvent.pointerUp(el, { ...finger, clientX: 200 + dx, clientY: 300 + dy })
}

function history() {
  return baseState({
    entries: [
      entry(1, "2026-08-10", "09:00", "10:00", { description: "Email" }),
      entry(2, "2026-08-10", "10:00", "11:00", { description: "Write report" }),
      // planned: tomorrow
      entry(3, "2026-08-11", "10:00", "11:30", { description: "Gym" }),
    ],
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  Element.prototype.scrollIntoView = vi.fn()
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return { x: 0, y: 0, top: 0, left: 0, right: ROW_WIDTH, bottom: 60, width: ROW_WIDTH, height: 60, toJSON: () => ({}) } as DOMRect
  })
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

describe("the swipe, as rules", () => {
  test("only past three quarters of the row, and only when clearly sideways", () => {
    expect(swipeAction(300, ROW_WIDTH)).toBe("continue")
    expect(swipeAction(299, ROW_WIDTH)).toBeNull()
    expect(swipeAction(-300, ROW_WIDTH)).toBe("delete")
    expect(swipeAxis(4, 3)).toBeNull()
    expect(swipeAxis(40, 10)).toBe("x")
    expect(swipeAxis(30, 40)).toBe("y")
  })
})

describe("a row swiped", () => {
  test("right past 75% continues it", async () => {
    await open(history())
    swipe(row("Email"), 320)
    await waitFor(() => expect(stored().entries.find((e) => e.stop === null)?.description).toBe("Email"))
  })

  test("right stops the running one", async () => {
    await open(startTimer(history(), { description: "Call", projectId: null, taskId: null, tagIds: [], billable: false }, new Date(2026, 7, 10, 11, 30).toISOString()).state)
    swipe(row("Write report"), 320)
    await waitFor(() => expect(stored().entries.find((e) => e.stop === null)?.description).toBe("Write report"))
    expect(stored().entries.find((e) => e.description === "Call")?.stop).not.toBeNull()
  })

  test("left past 75% deletes it, with Undo", async () => {
    await open(history())
    swipe(row("Email"), -320)
    await waitFor(() => expect(stored().entries.find((e) => e.id === "1")).toBeUndefined())
    expect(screen.getByText("Time entry was deleted")).toBeTruthy()
    fireEvent.click(within(screen.getByTestId("undo-bar")).getByRole("button", { name: /Undo/ }))
    await waitFor(() => expect(stored().entries.find((e) => e.id === "1")).toBeTruthy())
  })

  test("half way does nothing, and a scroll up or down never moves it", async () => {
    await open(history())
    swipe(row("Email"), 200)
    swipe(row("Email"), 80, 300)
    swipe(row("Email"), -60, -300)
    expect(stored().entries.filter((e) => e.stop === null)).toHaveLength(0)
    expect(stored().entries.find((e) => e.id === "1")).toBeTruthy()
    expect(row("Email").querySelector("[data-swipe-face]")?.getAttribute("style") ?? "").not.toMatch(/translateX\((?!0px)/)
  })

  test("does nothing when Swipe actions is off in Settings", async () => {
    await open(history())
    fireEvent.click(screen.getByRole("button", { name: "Settings and more" }))
    fireEvent.click(within(screen.getByRole("dialog", { name: "Settings and more" })).getByRole("button", { name: "Settings" }))
    const toggle = screen.getByRole("switch", { name: "Swipe actions" })
    expect(toggle.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(toggle)
    fireEvent.click(within(screen.getByRole("navigation", { name: "Sections" })).getByRole("button", { name: "Timer" }))
    swipe(row("Email"), 320)
    swipe(row("Email"), -320)
    expect(stored().entries.filter((e) => e.stop === null)).toHaveLength(0)
    expect(stored().entries.find((e) => e.id === "1")).toBeTruthy()
  })
})

describe("a delete's Undo (findability 2026-11-05: it vanished while being read, and the tap landed on a ▶)", () => {
  const undoBar = () => screen.queryByTestId("undo-bar")

  test("sits in the bottom bar, above the bar's own controls, where no row is under it", async () => {
    await open(history())
    swipe(row("Email"), -320)
    const bar = await screen.findByTestId("undo-bar")
    expect(bar.textContent).toContain("Time entry was deleted")
    // inside the block that holds the timer bar and the tabs, which the list is padded clear of
    expect(bar.closest("[data-bottom-block]")).toBe(screen.getByTestId("run-bar").closest("[data-bottom-block]"))
  })

  test("stays past ten seconds, and goes at thirty", async () => {
    await open(history())
    // the tracker opens on real timers; the Undo's own clock is the fake one
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] })
    vi.setSystemTime(NOW)
    swipe(row("Email"), -320)
    expect(undoBar()).toBeTruthy()
    act(() => vi.advanceTimersByTime(12_000))
    expect(undoBar(), "gone while it was still being read").toBeTruthy()
    act(() => vi.advanceTimersByTime(19_000))
    expect(undoBar()).toBeNull()
  })

  test("goes with the next change, and a newer delete replaces it: one at a time", async () => {
    await open(history())
    swipe(row("Email"), -320)
    swipe(row("Write report"), -320)
    expect(screen.getAllByTestId("undo-bar")).toHaveLength(1)
    // its Undo is the newer delete's
    fireEvent.click(within(screen.getByTestId("undo-bar")).getByRole("button", { name: /Undo/ }))
    await waitFor(() => expect(stored().entries.find((e) => e.id === "2")).toBeTruthy())
    expect(stored().entries.find((e) => e.id === "1")).toBeUndefined()
    expect(undoBar()).toBeNull()

    swipe(row("Write report"), -320)
    expect(undoBar()).toBeTruthy()
    // a start is a change: the Undo goes
    fireEvent.click(within(screen.getByTestId("run-bar")).getByRole("button", { name: "Start timer" }))
    await waitFor(() => expect(undoBar()).toBeNull())
  })
})

describe("planned entries (D-PLANNED)", () => {
  test("are not rows until they start; their day says what is planned, and points to the calendar", async () => {
    await open(history())
    expect(main().queryByText("Gym")).toBeNull()
    expect(main().getByText("0:00 · 1:30 planned")).toBeTruthy()
    fireEvent.click(main().getByRole("button", { name: "See in calendar" }))
    expect(window.location.search).toBe("?view=calendar")
  })
})

describe("what the findability run stumbled on", () => {
  test("the running entry is the bar's, not a row (Toggl, V1 2:02; H25 f001), and the day still counts it", async () => {
    await open(startTimer(history(), { description: "Call", projectId: null, taskId: null, tagIds: [], billable: false }, new Date(2026, 7, 10, 11, 30).toISOString()).state)
    expect(main().queryByText("Call"), "the running entry is also a row").toBeNull()
    expect(within(screen.getByTestId("run-bar")).getByText("Call")).toBeTruthy()
    // 1:00 + 1:00 finished, and the half hour running: our day total counts it (a deliberate difference)
    expect(main().getByText("Today").parentElement?.textContent).toContain("2:30")
    expect(within(row("Email")).getByRole("button", { name: "Continue this entry" })).toBeTruthy()
  })

  test("a group whose only live member runs shows nothing until it stops", async () => {
    const copy = startTimer(baseState({ entries: [] }), { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false }, new Date(2026, 7, 10, 11, 30).toISOString()).state
    await open(copy)
    expect(main().queryByText("Gym")).toBeNull()
    expect(main().queryByText("Today")).toBeNull()
  })

  test("the sync dot is named, and a tap says what it means", async () => {
    await open(history())
    const dot = within(screen.getAllByRole("banner")[0]).getByRole("button", { name: /^This device only\./ })
    fireEvent.click(dot)
    expect(await screen.findByText(/This device only\. Sign in to keep your time on every device/)).toBeTruthy()
  })
})
