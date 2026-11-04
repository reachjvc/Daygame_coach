// @vitest-environment jsdom
/**
 * THE TIMER LIST SPLITS A NIGHT AT MIDNIGHT, AS EVERY OTHER SCREEN DOES.
 *
 * A Sunday 22:00 → Monday 02:00 entry read "Sun 4:00" in the list's day header,
 * while the calendar, the week total and the reports said two hours on each
 * day (`entryDaySeconds`). The header summed whole entries by their start day.
 * And the row said "22:30–01:15" with nothing to show the end was the next
 * morning. Found by the edits audit on 2026-11-04, and again by the heavy-use
 * audit's night-shift check.
 */

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { buildDayGroups, daySeconds } from "@/src/timetrack/timetrackService"
import type { TimeEntry } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).toISOString()
const NOW_SEC = epochSeconds(at(4, 12))

afterEach(cleanup)

/** Sunday 1 Nov 22:00 → Monday 2 Nov 02:00 */
function sundayNight(): TimeEntry {
  const e = entry("night", "2026-11-01", "22:00", "23:00", { description: "night" })
  return { ...e, stop: at(2, 2, 0), duration: 4 * 3600 }
}

describe("the list's day headers", () => {
  test("count only the hours that fell on each day", () => {
    const monday = entry("mon", "2026-11-02", "09:00", "10:00", { description: "monday" })
    const groups = buildDayGroups([sundayNight(), monday], { groupSimilar: false, nowSec: NOW_SEC })
    const total = (day: string) => groups.find((g) => g.date === day)?.totalSeconds

    expect(total("2026-11-01"), "Sunday was given the whole night").toBe(2 * 3600)
    expect(total("2026-11-02"), "Monday lost the two hours after midnight").toBe(3 * 3600)
  })

  test("agree with the calendar's day columns", () => {
    const entries = [sundayNight()]
    const groups = buildDayGroups(entries, { groupSimilar: true, nowSec: NOW_SEC })
    expect(groups[0].totalSeconds).toBe(daySeconds(entries, "2026-11-01", NOW_SEC))
  })

  test("the row still shows the whole entry, on the day it started", () => {
    const groups = buildDayGroups([sundayNight()], { groupSimilar: false, nowSec: NOW_SEC })
    expect(groups.map((g) => g.date)).toEqual(["2026-11-01"])
    expect(groups[0].rows[0].totalSeconds).toBe(4 * 3600)
  })
})

describe("the list's rows", () => {
  test("mark an end on the next day, the way the sheet does", () => {
    const state = baseState({ entries: [sundayNight()] })
    const view = render(<EntryList state={state} setState={vi.fn()} nowSec={NOW_SEC} pushToast={vi.fn()} onEditEntry={vi.fn()} />)

    const marks = [...view.container.querySelectorAll('[data-end-day]')].map((el) => el.textContent)
    expect(marks.length, "no row says the end is the next day").toBeGreaterThan(0)
    expect(marks.every((text) => text === "next day")).toBe(true)
  })

  test("and say nothing on an entry that ends the day it starts", () => {
    const state = baseState({ entries: [entry(1, "2026-11-02", "09:00", "10:00")] })
    const view = render(<EntryList state={state} setState={vi.fn()} nowSec={NOW_SEC} pushToast={vi.fn()} onEditEntry={vi.fn()} />)

    expect(view.container.querySelectorAll('[data-end-day]')).toHaveLength(0)
  })
})
