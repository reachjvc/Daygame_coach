// @vitest-environment jsdom
/**
 * A TYPED START STAYS ON THE START'S OWN DAY.
 *
 * On an entry longer than a day — a timer forgotten on Monday and stopped on
 * Wednesday — a start typed as "09:30" was read on the END's day, because that
 * time was still before the end: Mon 09:00 → Wed 10:00 became Wed 09:30 → Wed
 * 10:00, and 48 hours were gone without a question. A timer running since
 * yesterday 09:00 given the start "09:30" jumped to today. Found by the edits
 * audit on 2026-11-04.
 *
 * The one case the end's day was for still holds: on a 22:00–02:00 night,
 * "00:30" is half past midnight that night, because that is the reading nearer
 * the start you are changing.
 *
 * And a typed time that would cut more than 12 hours off a finished entry asks
 * first (plan D10), the way one that makes it longer than 12 hours does.
 */

import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody } from "@/src/timetrack/components/EntryList"
import { epochSeconds, parseStartTimeInput } from "@/src/timetrack/timetrackFormatService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

/** local wall-clock times in November 2026: Mon 2, Tue 3, Wed 4 */
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).toISOString()
const NOW = at(4, 12, 0)
const NOW_SEC = epochSeconds(NOW)

describe("reading a typed start", () => {
  test("on a Monday-to-Wednesday entry, 09:30 is Monday 09:30", () => {
    expect(parseStartTimeInput("09:30", at(2, 9, 0), at(4, 10, 0))).toBe(at(2, 9, 30))
  })

  test("on a timer running since yesterday 09:00, 09:30 is yesterday", () => {
    expect(parseStartTimeInput("09:30", at(3, 9, 0), NOW)).toBe(at(3, 9, 30))
  })

  test("an earlier hour on the start's day stays there too", () => {
    expect(parseStartTimeInput("08:00", at(2, 9, 0), at(4, 10, 0))).toBe(at(2, 8, 0))
  })

  test("on a 22:00–02:00 night, 00:30 is still that night, not the night before", () => {
    expect(parseStartTimeInput("00:30", at(2, 22, 0), at(3, 2, 0))).toBe(at(3, 0, 30))
  })

  test("and 21:00 on that night stays on the start's day", () => {
    expect(parseStartTimeInput("21:00", at(2, 22, 0), at(3, 2, 0))).toBe(at(2, 21, 0))
  })
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function sheet(initial: TimetrackState) {
  let current = initial
  const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
    current = updater(current)
  })
  const pushToast = vi.fn()
  const view = render(
    <EntryDetailModalBody entry={initial.entries[0]} state={initial} setState={setState} pushToast={pushToast} nowSec={NOW_SEC} />,
  )
  const box = (label: string) => view.container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement
  const type = (label: string, text: string) => {
    const input = box(label)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: text } })
    fireEvent.blur(input)
  }
  return { type, stored: () => current.entries[0], pushToast }
}

/** Mon 09:00 → Wed 10:00 */
function twoDays(): TimetrackState {
  const made = entry(1, "2026-11-02", "09:00", "10:00")
  const long: TimeEntry = { ...made, stop: at(4, 10, 0), duration: epochSeconds(at(4, 10, 0)) - epochSeconds(at(2, 9, 0)) }
  return baseState({ entries: [long] })
}

describe("the detail sheet", () => {
  test("a start of 09:30 on a Monday-to-Wednesday entry moves it half an hour, with nothing asked", () => {
    const { type, stored, pushToast } = sheet(twoDays())
    type("Start time", "09:30")

    expect(stored().start).toBe(at(2, 9, 30))
    expect(stored().stop).toBe(at(4, 10, 0))
    expect(pushToast).not.toHaveBeenCalled()
  })

  test("an end that cuts it from 49 hours to 2 asks before it is written", () => {
    const { type, stored, pushToast } = sheet(twoDays())
    // meant Wednesday 11:00; read, as an end always is, on the first day after the start
    type("End time", "11:00")

    expect(stored().stop, "47 hours were cut without asking").toBe(at(4, 10, 0))
    const call = pushToast.mock.calls.find(([text]) => typeof text === "string" && text.startsWith("That cuts it"))
    expect(call, "nothing was asked").toBeTruthy()
    const [text, , keep, keepLabel] = call as [string, string, () => void, string]
    expect(text).toBe("That cuts it from 49 hours to 2 hours.")
    expect(keepLabel).toBe("Keep 2 hours")
    act(() => keep())
    expect(stored().stop).toBe(at(2, 11, 0))
  })

  test("a timer running since yesterday 09:00, given 09:30, starts yesterday 09:30 with nothing asked", () => {
    const running = startTimer(baseState({ entries: [] }), { description: "since yesterday", projectId: null, taskId: null, tagIds: [], billable: false }, at(3, 9, 0)).state
    const { type, stored, pushToast } = sheet(running)
    type("Start time", "09:30")

    expect(stored().start).toBe(at(3, 9, 30))
    expect(stored().stop).toBeNull()
    expect(pushToast, "shortening a long timer asked as if it made it long").not.toHaveBeenCalled()
  })

  test("a start that makes a long entry longer still asks", () => {
    const { type, stored, pushToast } = sheet(twoDays())
    type("Start time", "08:00")

    expect(stored().start).toBe(at(2, 9, 0))
    expect(pushToast.mock.calls[0]?.[0]).toMatch(/^That makes it 50 hours/)
  })

  test("an ordinary trim of a finished entry is written at once", () => {
    const { type, stored, pushToast } = sheet(baseState({ entries: [entry(1, "2026-11-04", "08:00", "11:00")] }))
    type("End time", "10:30")

    expect(stored().stop).toBe(at(4, 10, 30))
    expect(pushToast).not.toHaveBeenCalled()
  })
})
