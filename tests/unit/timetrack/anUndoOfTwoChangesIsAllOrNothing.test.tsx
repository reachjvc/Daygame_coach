// @vitest-environment jsdom
/**
 * AN UNDO THAT TAKES BACK TWO CHANGES TAKES BACK BOTH, OR NEITHER, AND SAYS WHY.
 *
 * "Stopped ‘Night’ and started ‘Email’ · Undo" is two changes: the new entry
 * goes, and the old one runs again. With entries locked up to yesterday and a
 * timer running since 22:00 yesterday, Start still stops it (a Stop has no lock
 * check). Undo then deleted the new entry, the lock refused the resume, and the
 * refusal was dropped: nothing running, the new entry gone, no word said.
 * Found by the code review of 2026-11-04.
 *
 * Now the undo of a combined change is all or nothing: if either half is
 * refused, nothing changes and the toast says why. The single-change undos
 * beside it — Fix, Close gap, "Keep ‘B’ as it was" — say why too, instead of
 * doing nothing in silence.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import { announceNeighbours } from "@/src/timetrack/components/neighbourNotice"
import { withNeighbours } from "@/src/timetrack/timeFixService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { liveEntries, runningEntry, startTimer, undoDisplacement, updateEntry } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW = at(4, 9, 0)
const LOCKED = "Nothing was undone: Time entries on or before 2026-11-03 are locked"

const draft = (description: string): EntryDraft => ({ description, projectId: null, taskId: null, tagIds: [], billable: false })

const lockUpToYesterday = (state: TimetrackState): TimetrackState => ({ ...state, workspace: { ...state.workspace, lockEntriesBefore: "2026-11-03" } })

function exact(id: string, start: string, stop: string, description: string): TimeEntry {
  return { ...entry(id, "2026-11-04", "00:00", "00:00", { description }), start, stop, duration: epochSeconds(stop) - epochSeconds(start) }
}

/** "Night" running since 22:00 yesterday; then everything up to yesterday is locked */
function nightRunningThenLocked(entries: TimeEntry[] = []): { state: TimetrackState; nightId: string } {
  const night = startTimer(baseState({ entries }), draft("Night"), at(3, 22, 0))
  return { state: lockUpToYesterday(night.state), nightId: night.entry.id }
}

describe("undoing Stopped X and started Y", () => {
  test("with yesterday locked, nothing changes and the refusal is returned", () => {
    const { state, nightId } = nightRunningThenLocked()
    const started = startTimer(state, draft("Email"), NOW)
    expect(started.displaced?.id, "Start did not stop the night").toBe(nightId)

    const undone = undoDisplacement(started.state, started.entry.id, nightId, at(4, 9, 1))

    expect(undone.violations[0]?.message).toBe("Time entries on or before 2026-11-03 are locked")
    expect(undone.state, "half the undo was done").toBe(started.state)
    expect(runningEntry(undone.state)?.id).toBe(started.entry.id)
  })

  test("with another timer started since, nothing changes: two would run", () => {
    const night = startTimer(baseState(), draft("Night"), at(3, 22, 0))
    const email = startTimer(night.state, draft("Email"), NOW)
    const third = startTimer(email.state, draft("Call"), at(4, 9, 30))

    const undone = undoDisplacement(third.state, email.entry.id, night.entry.id, at(4, 9, 31))

    expect(undone.violations[0]?.message).toBe("Another timer is running now — stop it first")
    expect(undone.state).toBe(third.state)
  })

  test("with nothing in the way, both halves are done", () => {
    const night = startTimer(baseState(), draft("Night"), at(3, 22, 0))
    const email = startTimer(night.state, draft("Email"), NOW)

    const undone = undoDisplacement(email.state, email.entry.id, night.entry.id, at(4, 9, 1))

    expect(undone.violations).toEqual([])
    expect(liveEntries(undone.state).map((e) => e.id)).toEqual([night.entry.id])
    expect(runningEntry(undone.state)?.id).toBe(night.entry.id)
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

  /** the list as the tracker holds it: every change lands, and the list is drawn again with it */
  function list(initial: TimetrackState) {
    let current = initial
    const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
      current = updater(current)
    })
    const pushToast = vi.fn()
    const view = render(<EntryList state={initial} setState={setState} nowSec={epochSeconds(NOW)} pushToast={pushToast} onEditEntry={() => {}} />)
    const rerender = () =>
      view.rerender(<EntryList state={current} setState={setState} nowSec={epochSeconds(NOW)} pushToast={pushToast} onEditEntry={() => {}} />)
    /** a change from elsewhere — another device — that the list is then drawn with */
    const arrive = (change: (s: TimetrackState) => TimetrackState) => {
      current = change(current)
      rerender()
    }
    return { view, current: () => current, pushToast, rerender, arrive }
  }

  test("Continue on today's entry stops the locked night; its Undo changes nothing and says why", () => {
    const { state, nightId } = nightRunningThenLocked([exact("email", at(4, 8, 0), at(4, 8, 30), "Email")])
    const { view, current, pushToast, rerender } = list(state)

    const today = view.container.querySelectorAll("section")[0] as HTMLElement
    fireEvent.click(within(today).getByRole("button", { name: "Continue this entry" }))
    const [text, , undo] = pushToast.mock.calls.at(-1)! as [string, string, () => void]
    expect(text).toBe("Stopped “Night” and started “Email”")
    const afterStart = current()
    rerender()

    act(() => undo())

    expect(pushToast).toHaveBeenLastCalledWith(LOCKED, "error")
    expect(current(), "the new entry was deleted and the night left stopped").toBe(afterStart)
    expect(runningEntry(current())?.description).toBe("Email")
    expect(current().entries.find((e) => e.id === nightId)?.stop).toBe(at(4, 9, 0))
  })

  test("Fix's Undo, refused by a lock set since, says why", () => {
    const { current, pushToast, rerender, arrive } = list(
      baseState({ entries: [exact("a", at(3, 9, 0), at(3, 10, 3), "Deep work"), exact("b", at(3, 10, 0), at(3, 11, 0), "Email")] }),
    )
    fireEvent.click(screen.getByRole("button", { name: "Fix: end “Deep work” at 10:00" }))
    const undo = pushToast.mock.calls.at(-1)![2] as () => void
    rerender()
    // another device locks yesterday while the toast is up
    arrive(lockUpToYesterday)

    act(() => undo())

    expect(pushToast).toHaveBeenLastCalledWith(LOCKED, "error")
    expect(current().entries.find((e) => e.id === "a")?.stop).toBe(at(3, 10, 0))
  })

  test("Close gap's Undo, refused the same way, says why", () => {
    const { current, pushToast, rerender, arrive } = list(
      baseState({ entries: [exact("a", at(3, 9, 0), at(3, 10, 0), "Deep work"), exact("b", at(3, 10, 2), at(3, 11, 0), "Email")] }),
    )
    fireEvent.click(screen.getByRole("button", { name: "Close gap: start “Email” at 10:00" }))
    const undo = pushToast.mock.calls.at(-1)![2] as () => void
    rerender()
    arrive(lockUpToYesterday)

    act(() => undo())

    expect(pushToast).toHaveBeenLastCalledWith(LOCKED, "error")
    expect(current().entries.find((e) => e.id === "b")?.start).toBe(at(3, 10, 0))
  })
})

describe("Keep ‘B’ as it was", () => {
  test("refused by a lock set since, says why and leaves B where it moved to", () => {
    const state = baseState({ entries: [exact("a", at(3, 9, 0), at(3, 14, 30), "Deep work"), exact("b", at(3, 14, 30), at(3, 15, 0), "Email")] })
    const moved = withNeighbours(state, "a", NOW, (base) => updateEntry(base, "a", { stop: at(3, 11, 55) }, NOW))
    expect(moved.moved).toHaveLength(1)

    let current = lockUpToYesterday(moved.state)
    const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
      current = updater(current)
    })
    const pushToast = vi.fn()
    announceNeighbours(moved, "h24", setState, pushToast, () => current)
    const keep = pushToast.mock.calls[0][2] as () => void

    keep()

    expect(pushToast).toHaveBeenLastCalledWith(LOCKED, "error")
    expect(current.entries.find((e) => e.id === "b")?.start).toBe(at(3, 11, 55))
  })
})
