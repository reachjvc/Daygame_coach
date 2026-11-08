// @vitest-environment jsdom
/**
 * THE PC CALENDAR OPENS WITH NOW IN VIEW (Phase 8 Toggl-parity audit of
 * Plans/toggl-parity.md).
 *
 * It opened an hour before the earliest entry shown, so at 19:56 with the
 * day's work in the morning the now line was off the bottom of the screen;
 * Toggl Track's calendar opens with now in view. When the days shown include
 * today, now sits about a third of the way down; a week without today keeps
 * the old rule, an hour before its earliest entry.
 */

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { CalendarView } from "@/src/timetrack/components/CalendarView"
import { CALENDAR_ZOOMS } from "@/src/timetrack/config"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"

import { baseState, entry } from "./helpers"

const NOW = new Date(2026, 10, 5, 19, 56, 0, 0)
const MINUTE_PX = CALENDAR_ZOOMS.find((z) => z.id === "normal")!.hourHeight / 60
const VIEW_PX = 600

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  Element.prototype.scrollIntoView = vi.fn()
  // jsdom lays nothing out: the calendar's window is 600 px tall
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute("data-calendar-scroll") ? VIEW_PX : 0
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function scrolledTo(anchor?: string) {
  const state = baseState({ entries: [entry(1, "2026-11-05", "09:00", "10:00"), entry(2, "2026-10-28", "09:00", "10:00")] })
  const { container } = render(
    <CalendarView
      state={state}
      setState={vi.fn()}
      nowSec={epochSeconds(NOW.toISOString())}
      pushToast={vi.fn()}
      onEditEntry={vi.fn()}
      onOpenIntegrations={vi.fn()}
      anchor={anchor}
      onAnchor={anchor ? vi.fn() : undefined}
    />,
  )
  return (container.querySelector("[data-calendar-scroll]") as HTMLElement).scrollTop
}

test("a week with today in it opens with now a third of the way down", () => {
  const nowPx = (19 * 60 + 56) * MINUTE_PX
  expect(scrolledTo()).toBeCloseTo(nowPx - VIEW_PX / 3, 0)
})

test("a week without today opens an hour before its earliest entry, as before", () => {
  expect(scrolledTo("2026-10-28")).toBeCloseTo(8 * 60 * MINUTE_PX - 10, 0)
})
