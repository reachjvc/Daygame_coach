// @vitest-environment jsdom
/**
 * THE PC CALENDAR, LIKE TOGGL TRACK'S WEB CALENDAR (D-PC-CAL, Phase 6 of
 * Plans/toggl-parity.md; LIVE web-14, web-08; W25 10:04, 10:48, 12:14).
 *
 * "Week view ▾" with Week / 5 days / Day; − + zoom; a drag or a click on empty
 * space draws a block in 15-minute steps and opens the box beside it, which
 * writes nothing until "Add time entry"; a click on a block opens the same box
 * with ▶, Duplicate, ⋮, ✕ and Save. Touching neighbours still move together
 * (D-NEIGHBOURS), and a block made for later is still striped (D-PLANNED).
 *
 * jsdom has no `matchMedia`, so the calendar takes it for a PC. It lays
 * nothing out either: every day column's top is 0 and a block's box is the
 * one its own style draws, so the calendar's arithmetic runs as in a browser.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { CalendarView } from "@/src/timetrack/components/CalendarView"
import { CALENDAR_ZOOMS } from "@/src/timetrack/config"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { startTimer, stopTimer, updateEntry } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

// a Wednesday afternoon: the Monday week is 2–8 Nov
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).toISOString()
const NOW = at(4, 15)
const NOW_SEC = epochSeconds(NOW)
const hourPx = (id: string) => CALENDAR_ZOOMS.find((z) => z.id === id)!.hourHeight
const MINUTE_PX = hourPx("normal") / 60
const WEDNESDAY = 2

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
  Element.prototype.scrollIntoView = vi.fn()
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const el = this as HTMLElement
    const top = el.hasAttribute("data-block") ? parseFloat(el.style.top) || 0 : 0
    const height = parseFloat(el.style.height) || 0
    return { top, bottom: top + height, height, left: 0, right: 100, width: 100, x: 0, y: top, toJSON: () => ({}) } as DOMRect
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function calendar(initial: TimetrackState) {
  const latest = { current: initial, writes: 0, other: (() => {}) as (change: (s: TimetrackState) => TimetrackState) => void }
  const onEditEntry = vi.fn()
  const toasts: { text: string; undo?: () => void }[] = []
  function Harness() {
    const [state, setState] = useState(initial)
    latest.current = state
    // the other device's change, arriving as a sync does: not one of this page's writes
    latest.other = (change) => act(() => setState((current) => change(current)))
    return (
      <CalendarView
        state={state}
        setState={(updater) => {
          latest.writes++
          setState((current) => updater(current))
        }}
        nowSec={NOW_SEC}
        pushToast={(text: string, _tone?: string, undo?: () => void) => {
          toasts.push({ text, undo })
        }}
        onEditEntry={onEditEntry}
        onOpenIntegrations={vi.fn()}
        boxes
      />
    )
  }
  const view = render(<Harness />)
  const mouse = { pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0 }
  const column = (index: number) => view.container.querySelectorAll<HTMLElement>("[data-day-column]")[index]
  const y = (h: number, m = 0) => (h * 60 + m) * MINUTE_PX + 0.5
  const press = (el: HTMLElement, fromY: number, toY = fromY) => {
    fireEvent.pointerDown(el, { ...mouse, clientY: fromY })
    if (toY !== fromY) for (let i = 1; i <= 10; i++) fireEvent.pointerMove(el, { ...mouse, clientY: fromY + ((toY - fromY) * i) / 10 })
    fireEvent.pointerUp(el, { ...mouse, clientY: toY })
    fireEvent.click(el, { clientY: toY })
  }
  const block = (description: string) =>
    [...view.container.querySelectorAll<HTMLElement>("[data-entry-block]")].find((el) => el.title.startsWith(`${description} `))!
  return { view, latest, onEditEntry, column, y, press, block, toasts }
}

const box = (name: "New time entry" | "Edit time entry") => within(screen.getByRole("dialog", { name }))
const value = (scope: ReturnType<typeof box>, label: string) => (scope.getByLabelText(label) as HTMLInputElement).value

describe("the view menu and the zoom", () => {
  test("Week view ▾ offers Week, 5 days and Day; 5 days is Monday to Friday", () => {
    const cal = calendar(baseState({ entries: [] }))
    fireEvent.click(screen.getByRole("button", { name: "Calendar view" }))
    const menu = document.querySelector("[data-dropdown-panel]") as HTMLElement
    expect(within(menu).getAllByRole("button").map((b) => b.textContent)).toEqual(["Week view", "5 days view", "Day view"])
    fireEvent.click(within(menu).getByRole("button", { name: "5 days view" }))
    const heads = [...cal.view.container.querySelectorAll("[data-day-header] p:first-child")].map((p) => p.textContent)
    expect(heads).toEqual(["Mon, 2 Nov", "Yesterday", "Today", "Thu, 5 Nov", "Fri, 6 Nov"])
  })

  test("− and + step the zoom, and stop at either end", () => {
    const cal = calendar(baseState({ entries: [entry(1, "2026-11-04", "09:00", "10:00", { description: "standup" })] }))
    const height = () => parseFloat(cal.block("standup").style.height)
    expect(height()).toBeCloseTo(hourPx("normal") - 1, 0)
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))
    expect(height()).toBeCloseTo(hourPx("comfortable") - 1, 0)
    expect((screen.getByRole("button", { name: "Zoom in" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    expect(height()).toBeCloseTo(hourPx("compact") - 1, 0)
    expect((screen.getByRole("button", { name: "Zoom out" }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe("a drag on empty space", () => {
  test("draws a block in 15-minute steps and asks for it beside the block, writing nothing yet", () => {
    const cal = calendar(baseState({ entries: [] }))
    cal.press(cal.column(WEDNESDAY), cal.y(10, 0), cal.y(11, 20))
    const asked = box("New time entry")
    expect(asked.getByPlaceholderText("Add description")).toBeTruthy()
    expect(value(asked, "Start time")).toBe("10:00")
    expect(value(asked, "End time")).toBe("11:15")
    expect(value(asked, "Duration")).toBe("1:15")
    expect(asked.getByRole("button", { name: "Add time entry" })).toBeTruthy()
    expect(cal.view.container.querySelector("[data-preview]"), "the block is drawn while it is asked for").toBeTruthy()
    expect(cal.latest.writes, "a drag wrote before Add time entry").toBe(0)

    fireEvent.change(asked.getByPlaceholderText("Add description"), { target: { value: "planning" } })
    fireEvent.click(asked.getByRole("button", { name: "Add time entry" }))
    const made = cal.latest.current.entries.find((e) => e.description === "planning")!
    expect({ start: made.start, stop: made.stop }).toEqual({ start: at(4, 10), stop: at(4, 11, 15) })
    expect(screen.queryByRole("dialog", { name: "New time entry" })).toBeNull()
  })

  test("a click is a 15-minute block in the quarter clicked; ✕ throws it away", () => {
    const cal = calendar(baseState({ entries: [] }))
    cal.press(cal.column(WEDNESDAY), cal.y(13, 7))
    const asked = box("New time entry")
    expect(value(asked, "Start time")).toBe("13:00")
    expect(value(asked, "End time")).toBe("13:15")
    fireEvent.click(asked.getByRole("button", { name: "Close" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(cal.view.container.querySelector("[data-preview]")).toBeNull()
    expect(cal.latest.writes).toBe(0)
  })

  test("a block made for later is striped, as planned", () => {
    const cal = calendar(baseState({ entries: [] }))
    cal.press(cal.column(WEDNESDAY + 1), cal.y(10), cal.y(11))
    fireEvent.click(box("New time entry").getByRole("button", { name: "Add time entry" }))
    expect(cal.view.container.querySelector("[data-entry-block][data-planned]")).toBeTruthy()
  })
})

describe("a click on a block", () => {
  function twoTouching(): TimetrackState {
    return baseState({
      entries: [
        entry(1, "2026-11-04", "08:00", "09:00", { description: "email" }),
        entry(2, "2026-11-04", "09:00", "10:00", { description: "deep work" }),
      ],
    })
  }

  test("opens the box beside it with ▶, Duplicate, ⋮, ✕ and Save, and changes nothing", () => {
    const cal = calendar(twoTouching())
    const deep = cal.block("deep work")
    cal.press(deep, parseFloat(deep.style.top) + 10)
    const edit = box("Edit time entry")
    for (const name of ["Continue time entry", "Duplicate time entry", "More actions for this time entry", "Close", "Save"]) {
      expect(edit.getByRole("button", { name }), name).toBeTruthy()
    }
    expect((edit.getByLabelText("Description") as HTMLInputElement).value).toBe("deep work")
    expect(value(edit, "Start time")).toBe("09:00")
    expect(cal.latest.writes).toBe(0)
    expect(cal.onEditEntry).not.toHaveBeenCalled()
  })

  test("Save writes what was typed; a start moved alone takes the touching entry's end along", () => {
    const cal = calendar(twoTouching())
    const deep = cal.block("deep work")
    cal.press(deep, parseFloat(deep.style.top) + 10)
    const edit = box("Edit time entry")
    fireEvent.change(edit.getByLabelText("Description"), { target: { value: "deep work, chapter 2" } })
    fireEvent.change(edit.getByLabelText("Start time"), { target: { value: "0830" } })
    fireEvent.blur(edit.getByLabelText("Start time"))
    expect(cal.latest.writes, "typing wrote before Save").toBe(0)
    fireEvent.click(edit.getByRole("button", { name: "Save" }))

    const byId = Object.fromEntries(cal.latest.current.entries.map((e: TimeEntry) => [e.id, e]))
    expect(byId["2"]).toMatchObject({ description: "deep work, chapter 2", start: at(4, 8, 30), stop: at(4, 10) })
    expect(byId["1"].stop, "the touching entry before it did not follow (D-NEIGHBOURS)").toBe(at(4, 8, 30))
  })

  test("Escape throws the typing away", () => {
    const cal = calendar(twoTouching())
    const deep = cal.block("deep work")
    cal.press(deep, parseFloat(deep.style.top) + 10)
    const edit = box("Edit time entry")
    fireEvent.change(edit.getByLabelText("Description"), { target: { value: "renamed" } })
    fireEvent.keyDown(edit.getByLabelText("Description"), { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(cal.latest.writes).toBe(0)
  })

  test("⋮ has Toggl's items, and Edit details… opens the full sheet", () => {
    const cal = calendar(twoTouching())
    const deep = cal.block("deep work")
    cal.press(deep, parseFloat(deep.style.top) + 10)
    fireEvent.click(box("Edit time entry").getByRole("button", { name: "More actions for this time entry" }))
    const menu = document.querySelector("[data-dropdown-panel]") as HTMLElement
    const items = within(menu).getAllByRole("button").map((b) => b.textContent?.trim())
    expect(items).toEqual(expect.arrayContaining(["Split", "Pin as favorite", "Copy description", "Copy start link", "Duplicate", "Delete", "Edit details…"]))
    fireEvent.click(within(menu).getByRole("button", { name: "Edit details…" }))
    expect(cal.onEditEntry).toHaveBeenCalledTimes(1)
  })

  test("Enter on a focused block opens the box too", () => {
    const cal = calendar(twoTouching())
    fireEvent.keyDown(cal.block("email"), { key: "Enter" })
    expect((box("Edit time entry").getByLabelText("Description") as HTMLInputElement).value).toBe("email")
  })
})

describe("a click on the running block", () => {
  test("opens the box with Running, ■ Stop, ⋮ and ✕; Stop ends it now, with Undo", () => {
    const running = startTimer(baseState({ entries: [] }), { description: "call", projectId: null, taskId: null, tagIds: [], billable: false }, at(4, 14)).state
    const cal = calendar(running)
    const live = cal.block("call")
    cal.press(live, parseFloat(live.style.top) + 10)
    const edit = box("Edit time entry")
    expect(edit.getByText("Running")).toBeTruthy()
    for (const name of ["More actions for this time entry", "Close"]) expect(edit.getByRole("button", { name }), name).toBeTruthy()
    expect(edit.queryByRole("button", { name: "Continue time entry" }), "a running entry has nothing to continue").toBeNull()

    fireEvent.click(edit.getByRole("button", { name: "Stop time entry" }))
    const stopped = cal.latest.current.entries[0]
    expect(stopped.stop, "Stop did not end it now").toBe(NOW)
    expect(screen.queryByRole("dialog", { name: "Edit time entry" })).toBeNull()
    const toast = cal.toasts.find((t) => t.text.startsWith("Stopped “call”"))
    expect(toast?.undo, "no Undo after Stop").toBeTruthy()

    act(() => toast!.undo!())
    expect(cal.latest.current.entries[0].stop, "Undo did not set it running again").toBeNull()
  })
})

describe("the box's Save, when the other device changed the entry while it was open (Phase 8 two-devices audit)", () => {
  test("writes only what was changed in the box: the phone's rename survives a billable tick", () => {
    const cal = calendar(baseState({ entries: [entry(1, "2026-11-04", "09:00", "10:00", { description: "Gym", billable: false })] }))
    const gym = cal.block("Gym")
    cal.press(gym, parseFloat(gym.style.top) + 10)
    const edit = box("Edit time entry")
    cal.latest.other((s) => updateEntry(s, "1", { description: "Gym, legs day" }, NOW).state)
    fireEvent.click(edit.getByRole("button", { name: "Non-billable" }))
    fireEvent.click(edit.getByRole("button", { name: "Save" }))
    const after = cal.latest.current.entries[0]
    expect(after.description, "the box's Save put the old name back over the phone's rename").toBe("Gym, legs day")
    expect(after.billable).toBe(true)
  })

  test("a rename saved after the phone stopped the running entry leaves it stopped", () => {
    const running = startTimer(baseState({ entries: [] }), { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false }, at(4, 14)).state
    const cal = calendar(running)
    const gym = cal.block("Gym")
    cal.press(gym, parseFloat(gym.style.top) + 10)
    const edit = box("Edit time entry")
    cal.latest.other((s) => stopTimer(s, at(4, 14, 30)).state)
    fireEvent.change(edit.getByLabelText("Description"), { target: { value: "Gym, legs day" } })
    fireEvent.click(edit.getByRole("button", { name: "Save" }))
    const after = cal.latest.current.entries[0]
    expect(after.description).toBe("Gym, legs day")
    expect(after.stop, "the box's Save set Gym running again").toBe(at(4, 14, 30))
  })
})
