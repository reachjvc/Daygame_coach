// @vitest-environment node
/**
 * A NEIGHBOUR ALREADY WHERE THE EDGE LANDS IS NOT MOVED, NOR WRITTEN.
 *
 * Touching neighbours move with an edited edge (D12). But the fix the owner
 * makes most — "End where the next one starts", or an end typed to equal the
 * next start — lands the edge exactly on the neighbour. Deep work ending
 * 11:55:40 and Email starting 11:55:10: Email was "moved" from 11:55:10 to
 * 11:55:10, its row was written and synced, and the toast said "Also moved
 * ‘Email’ to start 11:55" with a Keep button for nothing. Found by the code
 * review of 2026-11-04. Now a neighbour whose edge already equals the new edge,
 * to the millisecond, is left alone.
 */

import { describe, expect, test } from "vitest"

import { endWhereNextStarts, withNeighbours } from "@/src/timetrack/timeFixService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { setEntryStart, updateEntry } from "@/src/timetrack/timetrackService"
import type { TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0, ms = 0) => new Date(2026, 10, day, h, m, s, ms).toISOString()
const NOW = at(4, 16, 0)

function exact(id: string, start: string, stop: string, description: string): TimeEntry {
  return { ...entry(id, "2026-11-04", "00:00", "00:00", { description }), start, stop, duration: epochSeconds(stop) - epochSeconds(start) }
}

const find = (state: TimetrackState, id: string) => state.entries.find((e) => e.id === id)!

/** Deep work 09:00–11:55:40, Email from 11:55:10: thirty seconds of overlap */
const overlapBySeconds = (emailStart = at(4, 11, 55, 10)) =>
  baseState({ entries: [exact("a", at(4, 9, 0), at(4, 11, 55, 40), "Deep work"), exact("b", emailStart, at(4, 12, 30), "Email")] })

describe("an edge that lands on its neighbour", () => {
  test("End where the next one starts ends Deep work at 11:55:10 and leaves Email's row untouched", () => {
    const state = overlapBySeconds()
    const email = find(state, "b")

    const result = withNeighbours(state, "a", NOW, (base) => endWhereNextStarts(base, "a", NOW))

    expect(result.violations).toEqual([])
    expect(find(result.state, "a").stop).toBe(at(4, 11, 55, 10))
    expect(result.moved, "Email was reported as moved to where it already was").toEqual([])
    expect(find(result.state, "b"), "Email's row was rewritten, so it would sync").toBe(email)
  })

  test("an end typed to equal the next start does the same", () => {
    const state = overlapBySeconds()
    const result = withNeighbours(state, "a", NOW, (base) => updateEntry(base, "a", { stop: at(4, 11, 55, 10) }, NOW))

    expect(result.moved).toEqual([])
    expect(find(result.state, "b")).toBe(find(state, "b"))
  })

  test("a start typed to equal the previous end leaves that one alone too", () => {
    const state = baseState({ entries: [exact("a", at(4, 9, 0), at(4, 10, 0, 20), "Deep work"), exact("b", at(4, 10, 0, 50), at(4, 11, 0), "Email")] })
    const result = withNeighbours(state, "b", NOW, (base) => setEntryStart(base, "b", at(4, 10, 0, 20), NOW))

    expect(find(result.state, "b").start).toBe(at(4, 10, 0, 20))
    expect(result.moved).toEqual([])
    expect(find(result.state, "a")).toBe(find(state, "a"))
  })

  test("a neighbour half a second away still follows: the same means the same millisecond", () => {
    const state = overlapBySeconds(at(4, 11, 55, 10, 500))
    const result = withNeighbours(state, "a", NOW, (base) => updateEntry(base, "a", { stop: at(4, 11, 55, 10) }, NOW))

    expect(result.moved.map((m) => m.entryId)).toEqual(["b"])
    expect(find(result.state, "b").start).toBe(at(4, 11, 55, 10))
  })
})
