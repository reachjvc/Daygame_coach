/**
 * THE ONE-TAP FIXES KEEP EVERY END AT OR AFTER ITS START, TO THE MILLISECOND.
 *
 * The same rule as `anEndIsNeverStoredBeforeItsStart.test.ts` (edits audit B1),
 * in the paths Phase 4 added: Switched at…, Stopped at…, the sheet's ±5 and End
 * now, and Fix on an overlap. Timer-made starts carry milliseconds, and each of
 * these built or ordered times in whole seconds, so a tap on a timer started in
 * the same second built an end a fraction of a second before the start. The
 * rule refuses that row now rather than storing it — so each of these has to
 * build a pair in order, or a reasonable tap would be refused.
 */

import { describe, expect, test } from "vitest"

import { endNow, jointsOf, mendJoint, shiftEdge, stopAt, switchAt } from "@/src/timetrack/timeFixService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (h: number, m = 0, s = 0, ms = 0) => new Date(2026, 10, 4, h, m, s, ms).toISOString()
const ms = (iso: string) => new Date(iso).getTime()
const draft: EntryDraft = { description: "next", projectId: null, taskId: null, tagIds: [], billable: false }

/** a timer started at 10:00:00.640, the way `serverNowIso` stamps one */
function running(): TimetrackState {
  return startTimer(baseState({ entries: [] }), { ...draft, description: "first" }, at(10, 0, 0, 640)).state
}

function inOrder(e: TimeEntry | undefined | null) {
  expect(e, "the entry is gone").toBeTruthy()
  expect(e!.stop, "still running").not.toBeNull()
  expect(ms(e!.stop!) - ms(e!.start), `stored ${e!.start} -> ${e!.stop}`).toBeGreaterThanOrEqual(0)
}

describe("Switched at… and Stopped at…", () => {
  test("Stopped at the start's own second ends it at its start", () => {
    const result = stopAt(running(), at(10, 0, 0, 0), at(10, 0, 30))
    expect(result.violations).toEqual([])
    inOrder(result.stopped)
  })

  test("Switched at the start's own second ends the old one at its start and begins the next there", () => {
    const result = switchAt(running(), draft, at(10, 0, 0, 0), at(10, 0, 30))
    expect(result.violations).toEqual([])
    inOrder(result.stopped)
    expect(ms(result.started!.start)).toBeGreaterThanOrEqual(ms(result.stopped!.stop!))
  })
})

describe("the sheet's one-tap fixes", () => {
  /** 10:00:00.640 → 10:05:00.640, a timer-made five minutes */
  function fiveMinutes(): TimetrackState {
    const made = entry(1, "2026-11-04", "10:00", "10:05")
    return baseState({ entries: [{ ...made, start: at(10, 0, 0, 640), stop: at(10, 5, 0, 640), duration: 300 }] })
  }

  test("End 5 minutes earlier on a five-minute entry leaves it zero long, not refused", () => {
    const result = shiftEdge(fiveMinutes(), "1", "stop", -300, at(12))
    expect(result.violations).toEqual([])
    inOrder(result.state.entries[0])
    expect(result.state.entries[0].duration).toBe(0)
  })

  test("Start 5 minutes later on it does the same from the other end", () => {
    const result = shiftEdge(fiveMinutes(), "1", "start", 300, at(12))
    expect(result.violations).toEqual([])
    inOrder(result.state.entries[0])
  })

  test("End now on a timer started this very second stops it at its start", () => {
    const state = running()
    const result = endNow(state, state.entries[0].id, at(10, 0, 0, 200))
    expect(result.violations).toEqual([])
    inOrder(result.state.entries[0])
  })
})

describe("Fix on an overlap", () => {
  test("of two entries that began in the same second ends the earlier where the later starts", () => {
    const first = entry("a", "2026-11-04", "10:00", "10:30", { description: "earlier" })
    // Changed on 2026-11-04 (code review): this ended at 10:20, inside the earlier one, and Fix
    // no longer cuts more than the overlap (`aFixNeverCutsMoreThanTheOverlap`). Ending at 10:40,
    // Fix still has to order the two starts to the millisecond, which is what this is about.
    const second = entry("b", "2026-11-04", "10:00", "10:40", { description: "later" })
    // listed later-first, so the order has to come from the times themselves
    const state = baseState({
      entries: [
        { ...second, start: at(10, 0, 0, 900), duration: 40 * 60 },
        { ...first, start: at(10, 0, 0, 100), duration: 30 * 60 },
      ],
    })
    const [joint] = jointsOf(state.entries, at(12))
    expect(joint?.kind).toBe("overlap")
    expect(joint.earlierId).toBe("a")

    const fixed = mendJoint(state, joint, at(12))
    expect(fixed.violations).toEqual([])
    inOrder(fixed.state.entries.find((e) => e.id === "a"))
  })
})
