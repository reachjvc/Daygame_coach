// @vitest-environment jsdom
/**
 * A CLOCK TIME TYPED WITH A DOT OR A COMMA IS HOURS AND MINUTES.
 *
 * The clock-time boxes kept only digits and ":", so "10.30" became "1030" by
 * luck, while "10.5" became "105" — 01:05 — and "12.5" 01:25. In a start box
 * nothing asks first, so the start moved nine hours without a word, while "9.5"
 * was refused. Found by the code review of 2026-11-04. Now "." and "," are read
 * as ":" in a clock time, and one digit after them is refused with words:
 * "10.5" could be 10:05, 10:30 or 10:50.
 *
 * The DURATION box keeps its own rules (edits audit B7, 1e4ed2af): "1.30" is
 * an hour and a half, and so is "1.5".
 */

import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody } from "@/src/timetrack/components/EntryList"
import {
  epochSeconds,
  parseDurationInput,
  parseEndTimeInput,
  parseMomentInput,
  parseStartTimeInput,
  parseTimeInput,
  unreadableTimeMessage,
} from "@/src/timetrack/timetrackFormatService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).toISOString()
const NOW = at(4, 16, 0)

describe("reading a clock time", () => {
  test("10.30 and 10,30 are half past ten, in a start, an end, manual mode and a moment", () => {
    expect(parseStartTimeInput("10.30", at(4, 9, 0), at(4, 12, 0))).toBe(at(4, 10, 30))
    expect(parseStartTimeInput("10,30", at(4, 9, 0), at(4, 12, 0))).toBe(at(4, 10, 30))
    expect(parseEndTimeInput("10.30", at(4, 9, 0))).toBe(at(4, 10, 30))
    expect(parseTimeInput("10.30", "2026-11-04")).toBe(at(4, 10, 30))
    expect(parseMomentInput("10.30", null, NOW)).toBe(at(4, 10, 30))
  })

  test("one digit after the dot is refused, not read as 01:05", () => {
    expect(parseStartTimeInput("10.5", at(4, 9, 0), at(4, 12, 0)), "10.5 was read as a time").toBeNull()
    expect(parseStartTimeInput("12.5", at(4, 9, 0), at(4, 14, 0))).toBeNull()
    expect(parseEndTimeInput("9,5", at(4, 9, 0))).toBeNull()
  })

  test("and the refusal says why, in words", () => {
    expect(unreadableTimeMessage("10.5")).toBe("“10.5” could be 10:05, 10:30 or 10:50 — type 10.05, 10.30 or 10.50")
    expect(unreadableTimeMessage(" 9,5 ")).toBe("“9,5” could be 9:05, 9:30 or 9:50 — type 9.05, 9.30 or 9.50")
    // anything else unreadable has nothing special to say
    expect(unreadableTimeMessage("x")).toBeNull()
    expect(unreadableTimeMessage("10:30")).toBeNull()
  })

  test("a duration keeps its own rules: 1.30 and 1.5 are both an hour and a half", () => {
    expect(parseDurationInput("1.30")).toBe(5400)
    expect(parseDurationInput("1.5")).toBe(5400)
    expect(parseDurationInput("10.5")).toBe(10.5 * 3600)
  })
})

describe("the sheet's start box", () => {
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
      <EntryDetailModalBody entry={initial.entries[0]} state={initial} setState={setState} pushToast={pushToast} nowSec={epochSeconds(NOW)} />,
    )
    const type = (label: string, text: string) => {
      const input = view.container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: text } })
      fireEvent.blur(input)
    }
    return { type, stored: () => current.entries[0], pushToast }
  }

  test("a start of 10.5 on a 09:00–12:00 entry is refused with words and the start stays", () => {
    const { type, stored, pushToast } = sheet(baseState({ entries: [entry(1, "2026-11-04", "09:00", "12:00")] }))
    type("Start time", "10.5")

    expect(stored().start, "the start moved to 01:05").toBe(at(4, 9, 0))
    expect(pushToast).toHaveBeenCalledWith("“10.5” could be 10:05, 10:30 or 10:50 — type 10.05, 10.30 or 10.50", "error")
  })

  test("a start of 10.30 moves it to half past ten", () => {
    const { type, stored } = sheet(baseState({ entries: [entry(1, "2026-11-04", "09:00", "12:00")] }))
    type("Start time", "10.30")

    expect(stored().start).toBe(at(4, 10, 30))
  })
})
