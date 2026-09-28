/**
 * WHAT A TIME FIELD SHOWS MUST PARSE BACK TO THE TIME IT SHOWED.
 *
 * The entry list's inline start and end fields are editable inputs whose value
 * is a formatted time, and whose blur hands that text to `parseTimeInput`. So
 * the formatter and the parser are two halves of one round trip, and anything
 * the formatter leaves out the parser has to guess.
 *
 * In 12-hour mode it left out AM/PM. `EntryList` carried its own copy of
 * `formatTimeOfDay` with the suffix dropped, so 13:30 rendered as "1:30" — the
 * same four characters as 01:30. Change that to "1:45" meaning a quarter to two
 * in the afternoon and `parseTimeInput` reads a quarter to two in the morning:
 * the entry moves back twelve hours, and its duration with it. Every other
 * screen was correct, because every other screen called the shared formatter.
 *
 * This asserts the round trip rather than the string, because the string is not
 * the promise — "I can read my time back" is.
 *
 * THE FIRST DESCRIBE PINS BEHAVIOUR THAT ALREADY WORKED, deliberately.
 * `formatTimeOfDay` was never the broken half — `EntryList` carried its own copy —
 * so those four cases pass against the pre-fix source and are here to keep the
 * shared formatter honest, not to prove the fix. The second describe is the one that
 * fails without it: it reports "the entry moved -705 minutes".
 * `scripts/tests-must-fail-without-the-fix.mjs` lists them as SUSPECT for that
 * reason; this paragraph is the answer, so nobody has to run it again to find out.
 */

import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import { dateKey, formatHourOfDay, formatTimeOfDay, parseTimeInput } from "@/src/timetrack/timetrackFormatService"
import type { TimeFormat, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

afterEach(cleanup)

/** Every half hour of a day, as a local wall clock instant */
function everyHalfHour(): Date[] {
  const out: Date[] = []
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) out.push(new Date(2026, 8, 20, h, m, 0, 0))
  return out
}

describe.each(["h12", "h24"] as TimeFormat[])("a time shown in %s mode", (format) => {
  test("parses back to the same minute, every half hour of the day", () => {
    const wrong: string[] = []

    for (const at of everyHalfHour()) {
      const iso = at.toISOString()
      const shown = formatTimeOfDay(iso, format)
      const back = parseTimeInput(shown, dateKey(iso))
      if (!back || new Date(back).getTime() !== at.getTime()) {
        wrong.push(`${at.getHours()}:${String(at.getMinutes()).padStart(2, "0")} showed as "${shown}" and read back as ${back ? new Date(back).getHours() + ":" + String(new Date(back).getMinutes()).padStart(2, "0") : "nothing"}`)
      }
    }

    expect(wrong, `these times cannot be edited without moving:\n  ${wrong.join("\n  ")}`).toEqual([])
  })

  test("morning and afternoon are not the same string", () => {
    /**
     * The mechanical half. Without this, a formatter that dropped the suffix
     * could still pass the round trip above if the parser guessed the same way
     * every time — and the person would have no way to enter the other twelve
     * hours of the day.
     */
    const morning = formatTimeOfDay(new Date(2026, 8, 20, 1, 30).toISOString(), format)
    const afternoon = formatTimeOfDay(new Date(2026, 8, 20, 13, 30).toISOString(), format)
    expect(morning).not.toBe(afternoon)
  })
})

describe("the entry list's own start and end fields, in 12-hour mode", () => {
  /**
   * The round trip above is checked against the shared formatter, which was
   * never the broken half — `EntryList` carried its own copy. So this drives the
   * real inputs: the afternoon entry the person is looking at, the minutes they
   * change, and where the entry ends up.
   */
  function list(timeFormat: TimeFormat) {
    const initial = baseState({
      user: { ...baseState().user, timeFormat },
      // 13:30 to 14:30 — an ordinary afternoon hour
      entries: [entry(1, "2026-08-10", "13:30", "14:30", { description: "an afternoon hour" })],
    })
    let current = initial
    const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
      current = updater(current)
    })
    const nowSec = Math.floor(new Date(2026, 7, 10, 18, 0, 0).getTime() / 1000)
    const view = render(
      <EntryList state={initial} setState={setState} nowSec={nowSec} pushToast={vi.fn()} onEditEntry={vi.fn()} />,
    )
    return { view, stored: () => current.entries[0] }
  }

  test("show which half of the day they mean", () => {
    const { view } = list("h12")
    const start = view.container.querySelector('input[aria-label="Start time"]') as HTMLInputElement
    expect(start, "the inline start field was not rendered, so this asserts nothing").toBeTruthy()
    expect(start.value, `"${start.value}" is also what 1:30 in the morning looks like`).toBe("1:30 PM")
  })

  test("changing the minutes does not move the entry twelve hours", () => {
    const { view, stored } = list("h12")
    const before = stored()
    const start = view.container.querySelector('input[aria-label="Start time"]') as HTMLInputElement

    // the person edits the field they can see, keeping the half of the day it shows
    fireEvent.change(start, { target: { value: start.value.replace("1:30", "1:45") } })
    fireEvent.blur(start)

    const moved = (new Date(stored().start).getTime() - new Date(before.start).getTime()) / 60_000
    expect(moved, `the entry moved ${moved} minutes; 15 was asked for`).toBe(15)
    expect(new Date(stored().start).getHours(), "an afternoon entry became a small-hours one").toBe(13)
  })

  test("and the same edit in 24-hour mode behaves identically", () => {
    const { view, stored } = list("h24")
    const before = stored()
    const start = view.container.querySelector('input[aria-label="Start time"]') as HTMLInputElement
    expect(start.value).toBe("13:30")

    fireEvent.change(start, { target: { value: "13:45" } })
    fireEvent.blur(start)

    expect((new Date(stored().start).getTime() - new Date(before.start).getTime()) / 60_000).toBe(15)
  })
})

describe("the hour labels down the side of the calendar", () => {
  /**
   * They were built from a real `Date` for today with `setHours(hour, 0, 0, 0)`. On
   * the spring-forward day 02:00 does not exist, so it landed on 03:00: twenty-four
   * rows carried twenty-three distinct labels, "02:00" was missing, "03:00" appeared
   * twice, and every label below it was one row out of step with the block beside it.
   * And because the ruler took its date from `new Date()` rather than the day on
   * screen, it did that on the real clock-change day whatever week was being looked
   * at.
   *
   * An hour label is a number and a format; it does not need a day at all, and asking
   * for one is what let a day missing an hour break it.
   */
  test.each(["h12", "h24"] as TimeFormat[])("are twenty-four distinct labels in %s", (format) => {
    const labels = Array.from({ length: 24 }, (_, hour) => formatHourOfDay(hour, format))
    expect(new Set(labels).size, `only ${new Set(labels).size} distinct: ${labels.join(" ")}`).toBe(24)
  })

  test("and do not depend on today's date, so a clock change cannot move them", () => {
    /**
     * The premise is checked first, and so is the old approach: if a local `Date` on
     * that day did NOT lose an hour, this test would be asserting nothing.
     * `vitest.config.ts` pins Europe/Copenhagen, where 2026-03-29 has 23 hours.
     */
    const springForward = new Date(2026, 2, 29)
    const nextDay = new Date(2026, 2, 30)
    expect(
      (nextDay.getTime() - springForward.getTime()) / 3600_000,
      "this zone has no clock change on 2026-03-29 — is TZ pinned?",
    ).toBe(23)

    const viaLocalDate = Array.from({ length: 24 }, (_, hour) => {
      const at = new Date(2026, 2, 29)
      at.setHours(hour, 0, 0, 0)
      return at.getHours()
    })
    expect(new Set(viaLocalDate).size, "the old approach must be broken for this to mean anything").toBe(23)

    expect(new Set(Array.from({ length: 24 }, (_, hour) => formatHourOfDay(hour, "h24"))).size).toBe(24)
  })

  test("and read the same as the entry times beside them", () => {
    // 13:00 down the side must not say "13:00" while the block says "1:00 PM"
    const at = new Date(2026, 8, 20, 13, 0, 0)
    expect(formatHourOfDay(13, "h12")).toBe(formatTimeOfDay(at.toISOString(), "h12"))
    expect(formatHourOfDay(13, "h24")).toBe(formatTimeOfDay(at.toISOString(), "h24"))
  })
})
