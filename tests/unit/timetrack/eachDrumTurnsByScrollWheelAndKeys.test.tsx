// @vitest-environment jsdom
/**
 * EACH DRUM TURNS BY SCROLL, WHEEL AND KEYS (Phase 5 items 1, 2 and 6).
 *
 * The drums are the browser's own scroll snapping, with no library (D14): a
 * flick on a phone is a native scroll, and where it comes to rest is the
 * value. So these tests scroll each drum the way the browser does — move
 * `scrollTop`, then `scrollend` — and drive the keys a listbox answers to:
 * Up/Down, PageUp/PageDown, Home/End. A step ticks the vibration (5 ms) on
 * phones that have it, and what is past now is greyed and refused: a drum
 * that comes to rest there goes back.
 *
 * Every drum sits in the Stopped at… picker beside the typed box, and the two
 * follow each other both ways.
 */

import { useState } from "react"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { DRUM_ITEM_PX, MomentDrums } from "@/src/timetrack/components/Drums"
import { MomentPicker } from "@/src/timetrack/components/MomentPicker"
import type { DrumBounds } from "@/src/timetrack/drumService"
import type { TimeFormat } from "@/src/timetrack/types"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
/** a timer started at 09:00:40, and now is 14:30:25: what Stopped at… is opened on */
const STARTED = at(4, 9, 0, 40)
const NOW = at(4, 14, 30, 25)
const ITEM = DRUM_ITEM_PX

let shown = NOW

function Harness({ format = "h24" as TimeFormat, initial = NOW, open = false }: { format?: TimeFormat; initial?: string; open?: boolean }) {
  const [value, setValue] = useState(initial)
  shown = value
  // `open`: Started at… with nothing running has no start to stay after
  const bounds: DrumBounds = { earliest: open ? null : STARTED, latest: NOW }
  return (
    <MomentPicker
      value={value}
      onChange={setValue}
      earliest={bounds.earliest}
      latest={NOW}
      chips={[]}
      timeFormat={format}
      drums={(control) => (
        <MomentDrums
          value={control.value}
          onChange={control.set}
          bounds={bounds}
          timeFormat={format}
          todayKey="2026-11-04"
        />
      )}
    />
  )
}

const drum = (name: string) => screen.getByRole("listbox", { name })
const chosen = (name: string) => within(drum(name)).getByRole("option", { selected: true }).textContent
const box = () => (screen.getByLabelText("Time") as HTMLInputElement).value

/** what the browser does for a flick: the drum scrolls, then comes to rest */
function flick(name: string, toIndex: number) {
  const listbox = drum(name)
  fireEvent.touchStart(listbox)
  listbox.scrollTop = toIndex * ITEM
  fireEvent.scroll(listbox)
  fireEvent.touchEnd(listbox)
  fireEvent(listbox, new Event("scrollend"))
}

let vibrate: ReturnType<typeof vi.fn>

beforeEach(() => {
  vibrate = vi.fn(() => true)
  Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("three drums, [day][hour][minute], each a listbox", () => {
  test("they open on the moment, and the selected value is the one read aloud", () => {
    render(<Harness />)

    expect(chosen("Day")).toBe("Today")
    expect(chosen("Hour")).toBe("14")
    expect(chosen("Minute")).toBe("30")
    const hour = drum("Hour")
    const active = document.getElementById(hour.getAttribute("aria-activedescendant")!)
    expect(active?.textContent).toBe("14")
    expect(hour).toHaveAttribute("tabindex", "0")
  })

  test("the day drum names Yesterday, Today and Tomorrow, and older days by date", () => {
    render(<Harness />)
    const days = within(drum("Day")).getAllByRole("option").map((option) => option.textContent)
    expect(days).toHaveLength(29)
    expect(days).toContain("Yesterday")
    expect(days).toContain("Tomorrow")
    expect(days).toContain("Fri 30 Oct")
  })
})

describe("a flick comes to rest on a value", () => {
  test("the hour drum scrolled to 11 is 11:30, and the box says so", () => {
    render(<Harness />)
    flick("Hour", 11)

    expect(chosen("Hour")).toBe("11")
    expect(box()).toBe("11:30")
    expect(shown).toBe(at(4, 11, 30))
  })

  test("each item it passes ticks the vibration once, 5 ms", () => {
    render(<Harness />)
    const hour = drum("Hour")
    fireEvent.touchStart(hour)
    for (const index of [13, 12, 11]) {
      hour.scrollTop = index * ITEM
      fireEvent.scroll(hour)
    }
    fireEvent.touchEnd(hour)
    fireEvent(hour, new Event("scrollend"))

    expect(vibrate).toHaveBeenCalledTimes(3)
    expect(vibrate).toHaveBeenCalledWith(5)
  })

  test("the minute drum and the day drum turn too", () => {
    render(<Harness initial={at(4, 12, 0)} />)
    flick("Minute", 55)
    expect(box()).toBe("12:55")

    // the timer began today, so yesterday is greyed; the drum goes back
    const today = within(drum("Day")).getAllByRole("option").findIndex((option) => option.textContent === "Today")
    flick("Day", today - 1)
    expect(chosen("Day")).toBe("Today")
    expect(drum("Day").scrollTop).toBe(today * ITEM)
  })

  test("an hour after now is greyed, and a drum that comes to rest there goes back", () => {
    render(<Harness />)
    const fifteen = within(drum("Hour")).getByRole("option", { name: "15" })
    expect(fifteen).toHaveAttribute("aria-disabled", "true")

    flick("Hour", 15)

    expect(chosen("Hour")).toBe("14")
    expect(drum("Hour").scrollTop).toBe(14 * ITEM)
    expect(shown).toBe(NOW)
  })

  test("a drum left between two items, with no scrollend, still settles", () => {
    vi.useFakeTimers()
    render(<Harness />)
    const hour = drum("Hour")
    fireEvent.touchStart(hour)
    hour.scrollTop = 12 * ITEM + 7
    fireEvent.scroll(hour)
    fireEvent.touchEnd(hour)
    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(box()).toBe("12:30")
  })
})

describe("the mouse wheel steps one item a notch", () => {
  test("one notch up on the minute drum is one minute earlier", () => {
    render(<Harness />)
    const minute = drum("Minute")
    fireEvent.wheel(minute, { deltaY: -100 })
    fireEvent(minute, new Event("scrollend"))

    expect(box()).toBe("14:29")
  })
})

describe("keys, for a listbox", () => {
  test("Up and Down step one, PageUp and PageDown five, Home and End the ends", () => {
    render(<Harness />)
    const hour = drum("Hour")
    const minute = drum("Minute")

    fireEvent.keyDown(hour, { key: "ArrowUp" })
    expect(box()).toBe("13:30")
    fireEvent.keyDown(minute, { key: "PageDown" })
    expect(box()).toBe("13:35")
    fireEvent.keyDown(minute, { key: "ArrowDown" })
    expect(box()).toBe("13:36")
    fireEvent.keyDown(hour, { key: "PageUp" })
    expect(box()).toBe("09:36")
    fireEvent.keyDown(minute, { key: "Home" })
    // 09:00 is before the timer began at 09:00:40, so it lands on the start itself
    expect(shown).toBe(STARTED)
    fireEvent.keyDown(hour, { key: "End" })
    expect(box()).toBe("14:00")
  })

  test("a key into what is greyed does nothing: after now, and before the start", () => {
    render(<Harness />)
    fireEvent.keyDown(drum("Hour"), { key: "ArrowDown" })
    fireEvent.keyDown(drum("Minute"), { key: "ArrowDown" })
    fireEvent.keyDown(drum("Day"), { key: "ArrowUp" })
    expect(shown).toBe(NOW)
  })

  test("a key that steps ticks too", () => {
    render(<Harness />)
    fireEvent.keyDown(drum("Hour"), { key: "ArrowUp" })
    expect(vibrate).toHaveBeenCalledWith(5)
  })
})

describe("12-hour mode", () => {
  test("the hour drum reads 12, 1 … 11 beside an AM/PM drum, and turning it to AM is the morning", () => {
    render(<Harness format="h12" initial={at(4, 13, 15)} open />)
    expect(chosen("Hour")).toBe("1")
    expect(chosen("AM or PM")).toBe("PM")
    expect(within(drum("Hour")).getAllByRole("option").map((o) => o.textContent)[0]).toBe("12")

    fireEvent.keyDown(drum("AM or PM"), { key: "ArrowUp" })

    expect(shown).toBe(at(4, 1, 15))
    expect(box()).toBe("1:15 AM")
  })
})

describe("the box and the drums follow each other", () => {
  test("a time typed in the box turns the drums", () => {
    render(<Harness />)
    const input = screen.getByLabelText("Time")
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "1155" } })
    fireEvent.blur(input)

    expect(chosen("Hour")).toBe("11")
    expect(chosen("Minute")).toBe("55")
    expect(drum("Hour").scrollTop).toBe(11 * ITEM)
  })

  test("the ± buttons turn them as well", () => {
    render(<Harness initial={at(4, 12, 0)} />)
    fireEvent.click(screen.getByRole("button", { name: "5 minutes earlier" }))
    expect(chosen("Hour")).toBe("11")
    expect(chosen("Minute")).toBe("55")
  })
})
