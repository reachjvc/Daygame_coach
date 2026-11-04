/**
 * SWITCHED AT… AND STOPPED AT… END AN ENTRY WHERE THE WORK DID, TO THE SECOND
 * (Phase 4, items 1 and 2 in Plans/time-tracker-like-toggl.md).
 *
 * The owner tracks whole days back to back. When a timer was left running after
 * he had moved on, the repair was two hand edits — end the old entry, then add
 * the new one — and his own records show what that cost: on 2 and 3 November
 * every such repair left a gap or an overlap, the longest almost four minutes.
 * Switched at… asks for the one thing he knows, the moment he switched, and
 * writes both halves from it as one change with one Undo. Stopped at… is the
 * same question with no next entry.
 *
 * These pin the rules. `switchedAtIsOneTapFromTheTimerBar` and
 * `theRunningBarOffersStopAt` prove the bar reaches them.
 */

import { describe, expect, test } from "vitest"

import { parseMomentInput } from "@/src/timetrack/timetrackFormatService"
import { jointsOf, momentChips, momentRefusal, stopAt, switchAt, undoStopAt } from "@/src/timetrack/timeFixService"
import { liveEntries, runningEntry, startTimer, undoDisplacement } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimeEntry, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

/** Local wall-clock times in November 2026, so the test reads the same in any zone */
const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()

const draftFor = (description: string, extra: Partial<EntryDraft> = {}): EntryDraft => ({
  description,
  projectId: null,
  taskId: null,
  tagIds: [],
  billable: false,
  ...extra,
})

function runningSince(startIso: string, description = "Deep work", entries: TimeEntry[] = []): TimetrackState {
  return startTimer(baseState({ entries }), draftFor(description), startIso).state
}

const named = (state: TimetrackState, description: string) => state.entries.find((e) => e.description === description)!

describe("the morning of 2026-11-03, replayed", () => {
  test("started at 06:17, forgotten, switched at 07:00: one ends at 07:00:00 and the next starts at 07:00:00", () => {
    const forgotten = runningSince(at(3, 6, 17, 23), "Morning pages")
    const noticed = at(3, 9, 9, 41)
    const typed = parseMomentInput("0700", at(3, 6, 17, 23), noticed)
    expect(typed).toBe(at(3, 7, 0, 0))

    const result = switchAt(forgotten, draftFor("Email"), typed!, noticed)

    expect(result.violations).toEqual([])
    const ended = result.state.entries.find((e) => e.id === result.stopped?.id)!
    const next = runningEntry(result.state)!
    expect(ended.description).toBe("Morning pages")
    expect(ended.stop).toBe(at(3, 7, 0, 0))
    expect(ended.duration).toBe(42 * 60 + 37)
    expect(next.description).toBe("Email")
    expect(next.start).toBe(at(3, 7, 0, 0))
    expect(next.id).toBe(result.started?.id)
    expect(jointsOf(liveEntries(result.state), noticed), "a gap or an overlap was left between them").toEqual([])
  })
})

describe("what a day looks like (Part 1 of the plan)", () => {
  test("Deep work from 09:00, switched to Email at 11:55, noticed at 14:30", () => {
    const day = runningSince(at(4, 9, 0))
    const now = at(4, 14, 30)

    const result = switchAt(day, draftFor("Email"), parseMomentInput("1155", at(4, 9, 0), now)!, now)

    const deep = named(result.state, "Deep work")
    const email = runningEntry(result.state)!
    expect(deep.start).toBe(at(4, 9, 0))
    expect(deep.stop).toBe(at(4, 11, 55))
    expect(deep.duration).toBe((2 * 60 + 55) * 60)
    expect(email.description).toBe("Email")
    expect(email.start).toBe(at(4, 11, 55))
    expect(email.stop, "Email should still be running").toBeNull()
  })
})

describe("Switched at…", () => {
  test("is one change, and one Undo puts the first entry back running and removes the second", () => {
    const day = runningSince(at(4, 9, 0))
    const now = at(4, 14, 30)
    const switched = switchAt(day, draftFor("Email"), at(4, 11, 55), now)

    const undone = undoDisplacement(switched.state, switched.started!.id, switched.stopped!.id, now).state

    expect(liveEntries(undone)).toHaveLength(1)
    const deep = runningEntry(undone)!
    expect(deep.description).toBe("Deep work")
    expect(deep.start).toBe(at(4, 9, 0))
  })

  test("keeps the next entry's project and tags", () => {
    const day = runningSince(at(4, 9, 0))
    const now = at(4, 14, 30)
    const result = switchAt(day, draftFor("Email", { projectId: "31", tagIds: ["51"] }), at(4, 11, 55), now)

    const email = runningEntry(result.state)!
    expect(email.projectId).toBe("31")
    expect(email.tagIds).toEqual(["51"])
  })

  test("refuses a moment before the running entry began, and changes nothing", () => {
    const day = runningSince(at(4, 9, 0))
    const now = at(4, 14, 30)

    const result = switchAt(day, draftFor("Email"), at(4, 8, 30), now)

    expect(result.violations[0]?.message).toBe("That is before “Deep work” started at 09:00")
    expect(result.state).toBe(day)
    expect(momentRefusal(day, at(4, 8, 30), now)).toBe("That is before “Deep work” started at 09:00")
  })

  test("refuses a moment that has not happened yet", () => {
    const day = runningSince(at(4, 9, 0))
    const now = at(4, 14, 30)

    const result = switchAt(day, draftFor("Email"), at(4, 15, 0), now)

    expect(result.violations[0]?.message).toBe("That has not happened yet")
    expect(result.state).toBe(day)
  })

  test("inside the minute you are typing in, a moment just ahead is now", () => {
    const day = runningSince(at(4, 9, 0))
    const now = at(4, 14, 29, 50)

    const result = switchAt(day, draftFor("Email"), at(4, 14, 30), now)

    expect(result.violations).toEqual([])
    expect(named(result.state, "Deep work").stop).toBe(now)
    expect(runningEntry(result.state)!.start).toBe(now)
  })

  test("with nothing running, starts the next one at the moment — filling the gap after the last entry", () => {
    const finished = entry("deep", "2026-11-04", "09:00", "11:55", { description: "Deep work", stop: at(4, 11, 55, 40) })
    const idle = baseState({ entries: [{ ...finished, duration: epochSecondsBetween(finished.start, at(4, 11, 55, 40)) }] })
    const now = at(4, 14, 30)

    const result = switchAt(idle, draftFor("Email"), at(4, 11, 55, 40), now)

    expect(result.violations).toEqual([])
    expect(result.stopped).toBeNull()
    const email = runningEntry(result.state)!
    expect(email.start).toBe(at(4, 11, 55, 40))
    expect(jointsOf(liveEntries(result.state), now)).toEqual([])
  })
})

describe("Stopped at…", () => {
  test("ends the running entry at the moment and starts nothing", () => {
    const day = runningSince(at(4, 9, 0))
    const now = at(4, 14, 30)

    const result = stopAt(day, parseMomentInput("1155", at(4, 9, 0), now)!, now)

    expect(result.violations).toEqual([])
    expect(runningEntry(result.state)).toBeNull()
    expect(liveEntries(result.state)).toHaveLength(1)
    expect(result.stopped?.stop).toBe(at(4, 11, 55))
    expect(result.stopped?.duration).toBe((2 * 60 + 55) * 60)
  })

  test("refuses before the start, and after now", () => {
    const day = runningSince(at(4, 9, 0))
    const now = at(4, 14, 30)

    expect(stopAt(day, at(4, 8, 59), now).violations[0]?.message).toBe("That is before “Deep work” started at 09:00")
    expect(stopAt(day, at(4, 14, 32), now).violations[0]?.message).toBe("That has not happened yet")
  })

  test("with nothing running there is nothing to stop, and it says so", () => {
    expect(stopAt(baseState(), at(4, 11, 55), at(4, 14, 30)).violations[0]?.message).toBe("Nothing is running")
  })

  test("Undo puts it back running from its own start", () => {
    const day = runningSince(at(4, 9, 0))
    const now = at(4, 14, 30)
    const stopped = stopAt(day, at(4, 11, 55), now)

    const undone = undoStopAt(stopped.state, stopped.stopped!.id, now)

    expect(undone.violations).toEqual([])
    expect(runningEntry(undone.state)?.start).toBe(at(4, 9, 0))
  })

  test("Undo says so when another timer runs by then, rather than running two", () => {
    const day = runningSince(at(4, 9, 0))
    const now = at(4, 14, 30)
    const stopped = stopAt(day, at(4, 11, 55), now)
    const other = startTimer(stopped.state, draftFor("Lunch"), now).state

    const undone = undoStopAt(other, stopped.stopped!.id, now)

    expect(undone.violations[0]?.message).toMatch(/Another timer is running/)
    expect(undone.state).toBe(other)
  })
})

describe("the chips", () => {
  test("are 5, 15 and 30 minutes and an hour ago, then when the last entry ended", () => {
    const earlier = entry("mail", "2026-11-04", "08:00", "08:30", { description: "Email" })
    const day = runningSince(at(4, 9, 0), "Deep work", [earlier])
    const now = at(4, 14, 30, 12)

    const chips = momentChips(day, now)

    expect(chips.map((c) => c.label)).toEqual(["5 min ago", "15 min ago", "30 min ago", "1 h ago"])
    expect(chips.map((c) => c.at)).toEqual([at(4, 14, 25, 12), at(4, 14, 15, 12), at(4, 14, 0, 12), at(4, 13, 30, 12)])
    expect(chips.every((c) => !c.disabled)).toBe(true)
  })

  test("a chip from before the running entry began is offered greyed, not left to fail", () => {
    const day = runningSince(at(4, 14, 10))
    const chips = momentChips(day, at(4, 14, 30))

    expect(chips.filter((c) => c.disabled).map((c) => c.label)).toEqual(["30 min ago", "1 h ago"])
  })

  test("'When the last entry ended' is that end exactly, seconds and all, when nothing runs", () => {
    const finished = { ...entry("deep", "2026-11-04", "09:00", "11:55"), stop: at(4, 11, 55, 40) }
    const chips = momentChips(baseState({ entries: [finished] }), at(4, 14, 30))

    const gap = chips.find((c) => c.label === "When the last entry ended")
    expect(gap?.at).toBe(at(4, 11, 55, 40))
    expect(gap?.disabled).toBe(false)
  })

  test("'When the last entry ended' is not offered while a timer runs that began after it", () => {
    const earlier = entry("mail", "2026-11-04", "08:00", "08:30", { description: "Email" })
    const chips = momentChips(runningSince(at(4, 9, 0), "Deep work", [earlier]), at(4, 14, 30))

    expect(chips.some((c) => c.label === "When the last entry ended")).toBe(false)
  })
})

describe("a typed moment", () => {
  test("1155 is 11:55 and 930 is 09:30, on the number pad", () => {
    const now = at(4, 14, 30)
    expect(parseMomentInput("1155", at(4, 9, 0), now)).toBe(at(4, 11, 55))
    expect(parseMomentInput("930", at(4, 9, 0), now)).toBe(at(4, 9, 30))
  })

  test("a bare hour is the half of the day that has come round since the start", () => {
    const now = at(4, 14, 30)
    expect(parseMomentInput("2", at(4, 9, 0), now)).toBe(at(4, 14, 0))
    expect(parseMomentInput("11", at(4, 9, 0), now)).toBe(at(4, 11, 0))
  })

  test("on a timer forgotten overnight, an evening time is the evening it started", () => {
    const now = at(5, 8, 0)
    expect(parseMomentInput("2330", at(4, 22, 0), now)).toBe(at(4, 23, 30))
    expect(parseMomentInput("1", at(4, 22, 0), now)).toBe(at(5, 1, 0))
  })

  test("with nothing running, it is the last time that clock time came round", () => {
    const now = at(5, 0, 30)
    expect(parseMomentInput("2330", null, now)).toBe(at(4, 23, 30))
    expect(parseMomentInput("0010", null, now)).toBe(at(5, 0, 10))
    expect(parseMomentInput("3", null, at(4, 14, 30))).toBe(at(4, 3, 0))
  })

  test("nothing readable is no moment", () => {
    expect(parseMomentInput("soon", at(4, 9, 0), at(4, 14, 30))).toBeNull()
  })
})

function epochSecondsBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 1000)
}
