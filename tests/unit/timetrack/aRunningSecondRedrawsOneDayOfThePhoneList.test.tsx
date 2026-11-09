// @vitest-environment jsdom
/**
 * A SECOND OF A RUNNING TIMER REDRAWS ONE DAY OF THE PHONE LIST, NOT ALL OF THEM.
 *
 * Audit of 2026-11-09 (`heavy-history/phonelist.spec.ts:98`, bug 3 of
 * Plans/time-tracker-leftovers.md): with three months of entries and every day
 * opened with "Load more days", a running timer cost ~2.4 s of work in every
 * 5 s on a phone, because each second drew every row of every day again.
 *
 * Only the running entry's day can change in a second (`timerList` hands back
 * the other days as the same objects), and "This week". So a tick may draw
 * that one day; the rest stay as they were. Counted here by how many days
 * work out their rows (`listedRows`, once per day drawn).
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"

const drawn = vi.hoisted(() => ({ days: [] as string[] }))
vi.mock("@/src/timetrack/phoneListService", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/src/timetrack/phoneListService")>()
  return {
    ...real,
    listedRows: (...args: Parameters<typeof real.listedRows>) => {
      drawn.days.push(args[0].date)
      return real.listedRows(...args)
    },
  }
})

import { PhoneEntryList } from "@/src/timetrack/components/phone/PhoneEntryList"
import { addDays } from "@/src/timetrack/timetrackFormatService"
import { runningDurationValue } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

afterEach(cleanup)
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

const TODAY = "2026-08-10"
const NOW_SEC = Math.floor(new Date(2026, 7, 10, 15, 0, 0).getTime() / 1000)

function heavy(): TimetrackState {
  const entries: TimeEntry[] = []
  for (let back = 1; back <= 50; back++) {
    const day = addDays(TODAY, -back)
    for (let h = 8; h < 11; h++) entries.push(entry(`${back}-${h}`, day, `${h}:00`, `${h}:50`, { description: `Task ${h}` }))
  }
  entries.push(entry("today-done", TODAY, "09:00", "10:00", { description: "Morning" }))
  const start = new Date(2026, 7, 10, 14, 0, 0).toISOString()
  entries.push({ ...entry("run", TODAY, "14:00", "14:00"), stop: null, start, duration: runningDurationValue(start), description: "running" })
  return baseState({ entries })
}

describe("the phone list with every day open and a timer running", () => {
  test("one second draws the running day only", { timeout: 60_000 }, () => {
    const state = heavy()
    const props = {
      state,
      setState: () => {},
      pushToast: () => {},
      afterCheck: () => {},
      onEditEntry: () => {},
      onGoToProject: () => {},
      selected: null,
      onSelect: () => {},
    }
    // the parent makes "See in calendar" afresh every render, as PhoneTracker does
    const { rerender } = render(<PhoneEntryList {...props} nowSec={NOW_SEC} onSeeInCalendar={() => {}} />)
    for (let i = 0; i < 10; i++) {
      const more = screen.queryByRole("button", { name: /Load more days/ })
      if (!more) break
      act(() => fireEvent.click(more))
    }
    expect(screen.queryByRole("button", { name: /Load more days/ })).toBeNull()
    expect(screen.getAllByRole("heading", { level: 3 }).length, "every day is open").toBe(51)

    drawn.days = []
    rerender(<PhoneEntryList {...props} nowSec={NOW_SEC + 1} onSeeInCalendar={() => {}} />)
    expect(drawn.days, "days drawn by one second").toEqual([TODAY])
  })
})
