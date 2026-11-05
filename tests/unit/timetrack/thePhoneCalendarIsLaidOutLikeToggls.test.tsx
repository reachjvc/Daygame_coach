// @vitest-environment jsdom
/**
 * THE PHONE'S CALENDAR TAB, LIKE TOGGL TRACK'S (Plans/toggl-parity.md Phase 4,
 * D-PHONE-CAL).
 *
 * "WEDNESDAY, DEC 10" with the day's total; a week strip with today marked,
 * a tap on a day goes there; the hour grid. A tap on a block selects it, with
 * handles, and a panel: name, project, start – end, Delete · Edit · Duplicate ·
 * Continue, Cancel — on a running one Discard · Edit · Stop; Edit opens the
 * one sheet. A still hold on empty space makes 30 minutes, or fills a gap of
 * two hours or less; a dragged edge lands on a quarter hour or a neighbour's
 * edge, whichever is closer.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { LONG_PRESS_MS } from "@/src/timetrack/calendarService"
import { CalendarView } from "@/src/timetrack/components/CalendarView"
import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { CALENDAR_ZOOMS, STORAGE_KEY } from "@/src/timetrack/config"
import { dayLine, heldBlock, snapToQuarterOrEdge, weekStrip } from "@/src/timetrack/phoneCalendarService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 7, 10, 15, 0, 0, 0)
const NOW_SEC = epochSeconds(NOW.toISOString())
const HOUR_PX = CALENDAR_ZOOMS.find((z) => z.id === "comfortable")!.hourHeight
const MINUTE_PX = HOUR_PX / 60
const y = (h: number, m = 0) => (h * 60 + m) * MINUTE_PX
const at = (h: number, m = 0, day = 10) => new Date(2026, 7, day, h, m, 0, 0).toISOString()
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState

function asPhone() {
  window.matchMedia = vi.fn((query: string) => ({ matches: query.includes("max-width"), media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] })
  vi.setSystemTime(NOW)
  asPhone()
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
  Element.prototype.scrollIntoView = vi.fn()
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const el = this as HTMLElement
    const top = el.hasAttribute("data-block") ? parseFloat(el.style.top) || 0 : 0
    const height = parseFloat(el.style.height) || 0
    return { top, bottom: top + height, height, left: 0, right: 300, width: 300, x: 0, y: top, toJSON: () => ({}) } as DOMRect
  })
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (window as unknown as Record<string, unknown>).matchMedia
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("the rules", () => {
  test("the day line and the week strip", () => {
    expect(dayLine("2025-12-10")).toBe("Wednesday, Dec 10")
    expect(weekStrip("2026-08-12", 1).map((d) => `${d.letter}${d.date}`)).toEqual(["M10", "T11", "W12", "T13", "F14", "S15", "S16"])
    expect(weekStrip("2026-08-12", 0)[0]).toMatchObject({ letter: "S", date: 9 })
  })

  test("a quarter hour or a neighbour's edge, whichever is closer — and the edge is the neighbour's own instant", () => {
    const edge = { minutes: 10 * 60 + 20 + 40 / 60, at: at(10, 20).replace(":00.000Z", ":40.000Z") }
    expect(snapToQuarterOrEdge(10 * 60 + 22, [])).toEqual({ minutes: 10 * 60 + 15, at: null })
    expect(snapToQuarterOrEdge(10 * 60 + 22, [edge])).toEqual(edge)
    expect(snapToQuarterOrEdge(10 * 60 + 29, [edge])).toEqual({ minutes: 10 * 60 + 30, at: null })
  })

  test("a still hold makes 30 minutes, or fills a gap of two hours or less", () => {
    const span = (startMin: number, endMin: number, start = `s${startMin}`, end = `e${endMin}`) => ({ startMin, endMin, start, end })
    expect(heldBlock([], 10 * 60 + 7)).toEqual({ from: 600, to: 630, fromAt: null, toAt: null })
    // a gap is filled to the neighbours' own instants, seconds and all
    const around = [span(9 * 60, 10 * 60 + 0.5), span(11 * 60 + 30, 12 * 60)]
    expect(heldBlock(around, 10 * 60 + 40)).toEqual({ from: 600.5, to: 690, fromAt: "e600.5", toAt: "s690" })
    const far = [span(6 * 60, 7 * 60), span(12 * 60, 13 * 60)]
    expect(heldBlock(far, 10 * 60 + 40)).toEqual({ from: 630, to: 660, fromAt: null, toAt: null })
    // cut short where the next one begins: there, exactly
    expect(heldBlock([span(615, 700), span(0, 60)], 600)).toEqual({ from: 600, to: 615, fromAt: null, toAt: "s615" })
  })
})

/** CalendarView with the phone's options, its state held as the tracker holds it */
function phoneCalendar(initial: TimetrackState, selectedId: string | null = null) {
  let current = initial
  function Tracker() {
    const [state, set] = useState(initial)
    const write = (updater: (s: TimetrackState) => TimetrackState) => {
      current = updater(current)
      set(current)
    }
    return (
      <CalendarView
        state={state}
        setState={write}
        nowSec={NOW_SEC}
        pushToast={vi.fn()}
        onEditEntry={vi.fn()}
        onOpenIntegrations={vi.fn()}
        anchor="2026-08-10"
        onAnchor={vi.fn()}
        phone={{ selectedId }}
      />
    )
  }
  const view = render(<Tracker />)
  const column = () => view.container.querySelector<HTMLElement>("[data-day-column]")!
  const touch = { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 150 }
  const finger = {
    down: (el: HTMLElement, clientY: number) => fireEvent.pointerDown(el, { ...touch, clientY, button: 0, buttons: 1 }),
    hold: () => act(() => vi.advanceTimersByTime(LONG_PRESS_MS)),
    slide: (fromY: number, toY: number, steps = 12) => {
      for (let i = 1; i <= steps; i++) fireEvent.pointerMove(column(), { ...touch, clientY: fromY + ((toY - fromY) * i) / steps, buttons: 1 })
    },
    up: (clientY: number) => fireEvent.pointerUp(column(), { ...touch, clientY }),
  }
  const live = () => current.entries.filter((e) => !e.serverDeletedAt)
  return { view, column, finger, live }
}

describe("on the hour grid", () => {
  test("a still hold on empty space makes 30 minutes", () => {
    const cal = phoneCalendar(baseState({ entries: [] }))
    cal.finger.down(cal.column(), y(10, 7))
    cal.finger.hold()
    cal.finger.up(y(10, 7))
    expect(cal.live().map((e) => [e.start, e.stop])).toEqual([[at(10), at(10, 30)]])
  })

  test("a still hold in a gap of two hours or less fills it", () => {
    const cal = phoneCalendar(baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00"), entry(2, "2026-08-10", "11:30", "12:00")] }))
    cal.finger.down(cal.column(), y(10, 40))
    cal.finger.hold()
    cal.finger.up(y(10, 40))
    expect(cal.live().find((e) => e.id !== "1" && e.id !== "2")).toMatchObject({ start: at(10), stop: at(11, 30) })
  })

  test("a dragged edge lands on a neighbour's edge when that is closer than the quarter hour", () => {
    const cal = phoneCalendar(baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00"), entry(2, "2026-08-10", "10:20", "11:00")] }))
    const block = cal.view.container.querySelector<HTMLElement>('[data-block][title^="work "]')!
    // the bottom edge of 09:00–10:00, dragged to 10:22
    cal.finger.down(block, y(10) - 2)
    cal.finger.hold()
    cal.finger.slide(y(10) - 2, y(10, 22) - 2)
    cal.finger.up(y(10, 22) - 2)
    expect(cal.live().find((e) => e.id === "1")?.stop).toBe(at(10, 20))
  })

  test("an edge snapped to a neighbour lands on the neighbour's own instant, seconds included", () => {
    const next = { ...entry(2, "2026-08-10", "10:20", "11:00"), start: new Date(2026, 7, 10, 10, 20, 40).toISOString() }
    const cal = phoneCalendar(baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00"), next] }))
    const block = cal.view.container.querySelector<HTMLElement>('[data-block][title^="work "]')!
    cal.finger.down(block, y(10) - 2)
    cal.finger.hold()
    cal.finger.slide(y(10) - 2, y(10, 21) - 2)
    cal.finger.up(y(10, 21) - 2)
    // not 10:20 or 10:21: exactly where the next one begins, so the list marks no gap
    expect(cal.live().find((e) => e.id === "1")?.stop).toBe(next.start)
  })

  test("a still hold in a gap fills it to the neighbours' own instants", () => {
    const before = { ...entry(1, "2026-08-10", "09:00", "10:00"), stop: new Date(2026, 7, 10, 10, 0, 25).toISOString() }
    const cal = phoneCalendar(baseState({ entries: [before, entry(2, "2026-08-10", "11:30", "12:00")] }))
    cal.finger.down(cal.column(), y(10, 40))
    cal.finger.hold()
    cal.finger.up(y(10, 40))
    expect(cal.live().find((e) => e.id !== "1" && e.id !== "2")).toMatchObject({ start: before.stop, stop: at(11, 30) })
  })

  test("a held block moved lands its start on the quarter hour, its length kept exactly, even with seconds (heavy-history audit)", () => {
    const odd = { ...entry(1, "2026-08-10", "01:20", "01:45"), start: new Date(2026, 7, 10, 1, 20, 40).toISOString(), stop: new Date(2026, 7, 10, 1, 45, 40).toISOString(), duration: 25 * 60 }
    const cal = phoneCalendar(baseState({ entries: [odd] }))
    const block = cal.view.container.querySelector<HTMLElement>("[data-block]")!
    cal.finger.down(block, y(1, 33))
    cal.finger.hold()
    cal.finger.slide(y(1, 33), y(1, 43))
    cal.finger.up(y(1, 43))
    // not 01:29:40–01:54:40: the move added fractional minutes and the clock dropped the fraction
    expect(cal.live()[0]).toMatchObject({ start: at(1, 30), stop: at(1, 55) })
  })

  test("the selected block is drawn with its handles", () => {
    const cal = phoneCalendar(baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00")] }), "1")
    const block = cal.view.container.querySelector<HTMLElement>("[data-block]")!
    expect(block.getAttribute("data-selected")).toBe("true")
    expect(block.querySelectorAll("[data-handle]")).toHaveLength(2)
  })
})

async function openTab(copy: TimetrackState) {
  // the whole tracker runs on real timers; only the clock is held
  vi.useRealTimers()
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  render(<TogglLab />)
  await screen.findByRole("navigation", { name: "Sections" })
  fireEvent.click(within(screen.getByRole("navigation", { name: "Sections" })).getByRole("button", { name: "Calendar" }))
}

const panel = () => within(screen.getByRole("region", { name: "Selected time entry" }))

describe("the Calendar tab", () => {
  test("a day line with the total, a week strip with today, and a tap on a day goes there", async () => {
    await openTab(baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { description: "Email" })] }))
    const line = document.querySelector("[data-day-header]") as HTMLElement
    expect(line.textContent).toContain("Monday, Aug 10")
    expect(line.textContent).toContain("1:00")
    const strip = within(screen.getByRole("group", { name: "Week" }))
    expect(strip.getAllByRole("button")).toHaveLength(9)
    expect(strip.getByRole("button", { current: "date" }).textContent).toContain("10")
    fireEvent.click(document.querySelector('[data-day="2026-08-12"]') as HTMLElement)
    expect((document.querySelector("[data-day-header]") as HTMLElement).textContent).toContain("Wednesday, Aug 12")
  })

  test("a tap on a block selects it and opens the panel; Edit opens the sheet", async () => {
    await openTab(baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { description: "Email" })] }))
    fireEvent.click(document.querySelector('[data-block][title^="Email "]') as HTMLElement)
    expect(panel().getByText("Email")).toBeTruthy()
    expect(panel().getByText("09:00 – 10:00")).toBeTruthy()
    expect(within(panel().getByRole("group", { name: "Actions" })).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Delete", "Edit", "Duplicate", "Continue"])
    expect(panel().getByRole("button", { name: "Cancel" })).toBeTruthy()
    expect(document.querySelector('[data-block][title^="Email "]')?.getAttribute("data-selected")).toBe("true")
    fireEvent.click(panel().getByRole("button", { name: "Edit" }))
    expect(screen.getByRole("dialog", { name: "Time entry" })).toBeTruthy()
  })

  test("Duplicate, Continue, Delete and Cancel", async () => {
    await openTab(baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { description: "Email" })] }))
    const tap = () => fireEvent.click(document.querySelector('[data-block][title^="Email "]') as HTMLElement)
    tap()
    fireEvent.click(panel().getByRole("button", { name: "Duplicate" }))
    await waitFor(() => expect(stored().entries.filter((e) => e.description === "Email" && !e.serverDeletedAt)).toHaveLength(2))
    tap()
    fireEvent.click(panel().getByRole("button", { name: "Continue" }))
    await waitFor(() => expect(stored().entries.find((e) => e.stop === null)?.description).toBe("Email"))
    tap()
    fireEvent.click(panel().getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("region", { name: "Selected time entry" })).toBeNull()
    // three Email blocks now (the first, its copy, the one running): the tapped one goes
    const before = stored().entries.filter((e) => e.description === "Email").length
    tap()
    fireEvent.click(panel().getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(stored().entries.filter((e) => e.description === "Email")).toHaveLength(before - 1))
    expect(screen.getByText("Time entry was deleted")).toBeTruthy()
  })

  test("a block made by holding opens its sheet at once, the name ready to type (audit findability, Phase 8)", async () => {
    await openTab(baseState({ entries: [] }))
    const column = document.querySelector<HTMLElement>("[data-day-column]")!
    const touch = { pointerId: 9, pointerType: "touch", isPrimary: true, clientX: 150, button: 0 }
    fireEvent.pointerDown(column, { ...touch, clientY: y(10) })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 60))
    })
    fireEvent.pointerUp(column, { ...touch, clientY: y(10) })
    const sheet = await screen.findByRole("dialog", { name: "Time entry" })
    const name = within(sheet).getByPlaceholderText("I’ve worked on…")
    await waitFor(() => expect(document.activeElement).toBe(name))
    // closed without a name, the block stays, as before
    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Time entry" })).toBeNull())
    expect(stored().entries.filter((e) => !e.serverDeletedAt)).toHaveLength(1)
  })

  test("a tap on the name in the block's panel opens the sheet, as Edit does", async () => {
    await openTab(baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { description: "Email" })] }))
    fireEvent.click(document.querySelector('[data-block][title^="Email "]') as HTMLElement)
    fireEvent.click(panel().getByRole("button", { name: /Email/ }))
    expect(screen.getByRole("dialog", { name: "Time entry" })).toBeTruthy()
  })

  test("the hint is above the grid, where it is seen", async () => {
    await openTab(baseState({ entries: [] }))
    const hints = screen.getAllByText(/Hold empty space/)
    expect(hints).toHaveLength(1)
    const grid = document.querySelector("[data-calendar-grid]")!
    expect(hints[0].compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test("a running block offers Discard · Edit · Stop", async () => {
    const running = startTimer(baseState(), { description: "Call", projectId: null, taskId: null, tagIds: [], billable: false }, at(14)).state
    await openTab(running)
    fireEvent.click(document.querySelector('[data-block][title^="Call "]') as HTMLElement)
    expect(within(panel().getByRole("group", { name: "Actions" })).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Discard", "Edit", "Stop"])
    expect(panel().getByRole("button", { name: "Cancel" })).toBeTruthy()
    fireEvent.click(panel().getByRole("button", { name: "Stop" }))
    await waitFor(() => expect(stored().entries.some((e) => e.stop === null)).toBe(false))
  })
})
