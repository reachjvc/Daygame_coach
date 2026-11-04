// @vitest-environment jsdom
/**
 * AN OVERLAP JUST AFTER MIDNIGHT IS MARKED, LIKE ANY OTHER.
 *
 * The overlap and gap marks (Phase 4, item 6) compared entries within the day
 * they started on. So sleep from 23:00 to 07:00:40, and the next entry from
 * 07:00, counted 40 seconds twice in the morning's total and were never
 * marked: the two started on different days. Found by the code review of
 * 2026-11-04. Now each day's first entry is also compared with the entry that
 * reached furthest into it from an earlier day.
 *
 * Only when that entry did reach into the day: an evening that ended at 23:58
 * and a start at 00:01 are two days, not a gap to close, because closing it
 * would move the morning's entry back onto the night before.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import { jointsOf, mendJoint } from "@/src/timetrack/timeFixService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW = at(4, 16, 0)

function exact(id: string, start: string, stop: string, description: string): TimeEntry {
  return { ...entry(id, "2026-11-04", "00:00", "00:00", { description }), start, stop, duration: epochSeconds(stop) - epochSeconds(start) }
}

const find = (state: TimetrackState, id: string) => state.entries.find((e) => e.id === id)!

/** Sleep from 23:00 on the 3rd to 07:00:40 on the 4th, and Coffee from 07:00 */
const sleepThenCoffee = () =>
  baseState({ entries: [exact("sleep", at(3, 23, 0), at(4, 7, 0, 40), "Sleep"), exact("coffee", at(4, 7, 0), at(4, 7, 30), "Coffee")] })

describe("which joints are marked across midnight", () => {
  test("sleep to 07:00:40 and an entry from 07:00 overlap by 40 seconds", () => {
    expect(jointsOf(sleepThenCoffee().entries, NOW)).toEqual([{ kind: "overlap", earlierId: "sleep", laterId: "coffee", seconds: 40 }])
  })

  test("and Fix ends the sleep at 07:00", () => {
    const state = sleepThenCoffee()
    const result = mendJoint(state, jointsOf(state.entries, NOW)[0], NOW)

    expect(result.violations).toEqual([])
    expect(find(result.state, "sleep").stop).toBe(at(4, 7, 0))
    expect(jointsOf(result.state.entries, NOW)).toEqual([])
  })

  test("a small gap after a night is marked, and closing it keeps the morning's entry on its day", () => {
    const state = baseState({ entries: [exact("sleep", at(3, 23, 0), at(4, 7, 0), "Sleep"), exact("coffee", at(4, 7, 3), at(4, 7, 30), "Coffee")] })
    const [joint] = jointsOf(state.entries, NOW)
    expect(joint).toEqual({ kind: "gap", earlierId: "sleep", laterId: "coffee", seconds: 180 })

    expect(find(mendJoint(state, joint, NOW).state, "coffee").start).toBe(at(4, 7, 0))
  })

  test("the entry compared is the one that reached furthest into the day, not the last to start", () => {
    const state = baseState({
      entries: [
        exact("sleep", at(3, 22, 30), at(4, 7, 0, 40), "Sleep"),
        exact("note", at(3, 23, 0), at(3, 23, 5), "Note"),
        exact("coffee", at(4, 7, 0), at(4, 7, 30), "Coffee"),
      ],
    })
    expect(jointsOf(state.entries, NOW)).toContainEqual({ kind: "overlap", earlierId: "sleep", laterId: "coffee", seconds: 40 })
  })

  test("an evening that ended before midnight is not compared with a start after it", () => {
    const state = baseState({ entries: [exact("evening", at(3, 21, 0), at(3, 23, 58), "Reading"), exact("late", at(4, 0, 1), at(4, 0, 30), "Late")] })
    expect(jointsOf(state.entries, NOW)).toEqual([])
  })
})

describe("in the list", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(NOW))
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  test("the mark sits under the day's first entry, names the night, and Fix ends it there", () => {
    let current = sleepThenCoffee()
    const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
      current = updater(current)
    })
    const view = render(<EntryList state={current} setState={setState} nowSec={epochSeconds(NOW)} pushToast={vi.fn()} onEditEntry={() => {}} />)

    const today = view.container.querySelectorAll("section")[0]
    expect(today.querySelector("[data-joint='overlap']")?.textContent, "no mark under today's first entry").toContain(
      "Overlap of 40 seconds with “Sleep”",
    )
    fireEvent.click(screen.getByRole("button", { name: "Fix: end “Sleep” at 07:00" }))
    expect(find(current, "sleep").stop).toBe(at(4, 7, 0))
  })
})
