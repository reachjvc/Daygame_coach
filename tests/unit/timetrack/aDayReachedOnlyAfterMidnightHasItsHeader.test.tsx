// @vitest-environment jsdom
/**
 * A DAY THAT A NIGHT REACHES HAS ITS OWN HEADER IN THE TIMER LIST.
 *
 * The list made a day header only for days on which an entry STARTS. Its
 * headers split a night at midnight (`aNightIsSplitAtMidnightInTheList`), so
 * the hours after midnight belonged to the next day — and when nothing else
 * started that day, there was no header to show them under:
 *   - a timer started at 23:00, looked at 01:00 with nothing else today, read
 *     "Yesterday 1:00", no "Today", while "This week" said 2:00;
 *   - a finished 22:00–02:00 lost its two morning hours the same way.
 * Found by the code review of 2026-11-04. Now every day with tracked seconds
 * has a header, and a day reached only by a night shows that entry under it,
 * marked as carrying on from the day before.
 */

import { cleanup, render, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import { timerList } from "@/src/timetrack/timerListService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { buildDayGroups, startTimer } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).toISOString()

/** a timer started Tuesday 3 Nov at 23:00, looked at on Wednesday 4 Nov at 01:00 */
const ONE_AM = at(4, 1, 0)
const timerSinceEleven = (): TimetrackState =>
  startTimer(baseState(), { description: "Late shift", projectId: null, taskId: null, tagIds: [], billable: false }, at(3, 23, 0)).state

/** Sunday 1 Nov 22:00 → Monday 2 Nov 02:00 */
function sundayNight(): TimeEntry {
  const e = entry("night", "2026-11-01", "22:00", "23:00", { description: "night" })
  return { ...e, stop: at(2, 2, 0), duration: 4 * 3600 }
}

describe("the day groups", () => {
  test("a timer running since 23:00 has a header today as well as yesterday, an hour on each", () => {
    const nowSec = epochSeconds(ONE_AM)
    const groups = buildDayGroups(timerSinceEleven().entries, { groupSimilar: true, nowSec })

    expect(groups.map((g) => g.date), "there is no group for today").toEqual(["2026-11-04", "2026-11-03"])
    expect(groups.map((g) => g.totalSeconds)).toEqual([3600, 3600])
  })

  test("a day reached only by a night lists that entry, marked as carried on from the day before", () => {
    const groups = buildDayGroups([sundayNight()], { groupSimilar: true, nowSec: epochSeconds(at(4, 12)) })
    const monday = groups.find((g) => g.date === "2026-11-02")

    expect(monday?.totalSeconds, "Monday's two hours are on no header").toBe(2 * 3600)
    expect(monday?.rows.map((r) => r.entries[0].id)).toEqual(["night"])
    expect(monday?.rows[0].continuedDays).toBe(1)
    // on the day it started it is an ordinary row
    expect(groups.find((g) => g.date === "2026-11-01")?.rows[0].continuedDays).toBeUndefined()
  })

  test("a day with entries of its own does not list the night again", () => {
    const monday = entry("mon", "2026-11-02", "09:00", "10:00", { description: "monday" })
    const groups = buildDayGroups([sundayNight(), monday], { groupSimilar: true, nowSec: epochSeconds(at(4, 12)) })

    expect(groups.find((g) => g.date === "2026-11-02")?.rows.map((r) => r.entries[0].id)).toEqual(["mon"])
  })

  test("an entry that ends exactly at midnight makes no empty header for the next day", () => {
    const toMidnight = { ...entry("late", "2026-11-01", "22:00", "23:00"), stop: at(2, 0, 0), duration: 2 * 3600 }
    const groups = buildDayGroups([toMidnight], { groupSimilar: true, nowSec: epochSeconds(at(4, 12)) })

    expect(groups.map((g) => g.date)).toEqual(["2026-11-01"])
  })

  test("the list's own once-a-change copy agrees, second by second", () => {
    const list = timerList(timerSinceEleven().entries, true)
    expect(list.groupsAt(epochSeconds(ONE_AM)).map((g) => [g.date, g.totalSeconds])).toEqual([
      ["2026-11-04", 3600],
      ["2026-11-03", 3600],
    ])
  })
})

describe("on screen", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(ONE_AM))
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  test("at 01:00 the running timer shows under Today, carried on from the day before, and under Yesterday", () => {
    const state = timerSinceEleven()
    const view = render(
      <EntryList state={state} setState={vi.fn()} nowSec={epochSeconds(ONE_AM)} pushToast={vi.fn()} onEditEntry={vi.fn()} />,
    )

    const sections = [...view.container.querySelectorAll("section")]
    expect(sections.map((s) => s.querySelector("h3")?.textContent), "no Today header").toEqual(["Today", "Yesterday"])
    const today = within(sections[0])
    // the pointer layout's description is an editable box
    expect(today.getAllByDisplayValue("Late shift").length).toBeGreaterThan(0)
    const marks = [...sections[0].querySelectorAll("[data-continued]")].map((el) => el.textContent)
    expect(marks.length, "the row under Today does not say it began the day before").toBeGreaterThan(0)
    expect(marks.every((text) => text === "from the day before")).toBe(true)
    // yesterday's row is the entry where it began, with no such mark
    expect(sections[1].querySelectorAll("[data-continued]")).toHaveLength(0)
  })
})
