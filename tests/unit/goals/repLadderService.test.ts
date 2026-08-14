import { describe, test, expect } from "vitest"

import {
  REP_SCHEMA_VERSION,
  daysBetween,
  emptyRun,
  entryFor,
  loadRun,
  logRep,
  missMessage,
  missStreak,
  recentDays,
  rungState,
  serializeRun,
  setLetter,
  adjustRung,
  buildCustomLadder,
  customIsUsable,
  setCadence,
  startRun,
  statusOf,
  weekPace,
  type RepRun,
} from "@/src/goals/repLadderService"
import { CUSTOM_RELEASE, LADDER_BY_ID, REPS_TO_ADVANCE, REP_LADDERS } from "@/src/goals/data/repLadders"

const DAY = (n: number) => `2026-03-${String(n).padStart(2, "0")}`
const START = DAY(1)

function begun(startRung = 0): RepRun {
  return startRun(emptyRun(START), "talking", startRung, 3, START, null, START)
}

/** Log `n` clean reps on consecutive days from day 1. */
function withReps(n: number, run = begun()): RepRun {
  let r = run
  for (let i = 0; i < n; i++) r = logRep(r, DAY(i + 1), "did", START)
  return r
}

describe("setup", () => {
  test("a run is ready to use straight after setup", () => {
    const run = begun()
    const status = statusOf(run, START)

    expect(status.started).toBe(true)
    expect(run.ladder).toBe("talking")
    expect(run.daysPerWeek).toBe(3)
  })

  test("an unstarted run reports itself as not started rather than pretending", () => {
    expect(statusOf(emptyRun(START), START).started).toBe(false)
    expect(rungState(emptyRun(START))).toBeNull()
  })

  test("any cadence from one to seven is allowed", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7]) {
      expect(startRun(emptyRun(START), "talking", 0, n, START).daysPerWeek).toBe(n)
    }
  })

  test("cadence outside a week is clamped rather than accepted", () => {
    expect(startRun(emptyRun(START), "talking", 0, 0, START).daysPerWeek).toBe(1)
    expect(startRun(emptyRun(START), "talking", 0, 99, START).daysPerWeek).toBe(7)
  })

  test("cadence can be changed later without disturbing anything else", () => {
    const run = setCadence(withReps(2), 6, START)

    expect(run.daysPerWeek).toBe(6)
    expect(rungState(run)!.done).toBe(2)
  })
})

describe("you start where you actually are", () => {
  test("entering partway up puts you on that rung, not on rung one", () => {
    const s = rungState(begun(3))!

    expect(s.index).toBe(3)
    expect(s.rung).toEqual(LADDER_BY_ID.talking.rungs[3])
  })

  test("a start rung past the top of the ladder lands on the top", () => {
    const ladder = LADDER_BY_ID.talking
    expect(rungState(begun(99))!.index).toBe(ladder.rungs.length - 1)
  })

  test("a negative start rung lands on the first", () => {
    expect(rungState(begun(-4))!.index).toBe(0)
  })

  test("progress from a mid-ladder start continues from there", () => {
    const s = rungState(withReps(REPS_TO_ADVANCE, begun(2)))!
    expect(s.index).toBe(3)
  })
})

describe("moving by hand, in either direction", () => {
  test("a rung that turns out to be too much can be stepped down", () => {
    const run = adjustRung(begun(3), -1, START)

    expect(run.rung).toBe(2)
  })

  test("stepping down is not recorded as a failure anywhere", () => {
    const before = withReps(2, begun(3))
    const after = adjustRung(before, -1, START)

    expect(after.entries).toEqual(before.entries)
    expect(missStreak(after)).toBe(0)
  })

  test("a rung that turns out to be trivial can be skipped without grinding reps", () => {
    expect(adjustRung(begun(1), 1, START).rung).toBe(2)
  })

  test("moving resets the banked reps, because they were earned elsewhere", () => {
    const run = adjustRung(withReps(2), 1, START)

    expect(run.rung).toBe(1)
    expect(run.repsAtRung).toBe(0)
  })

  test("cannot be moved off either end of the ladder", () => {
    const ladder = LADDER_BY_ID.talking
    expect(adjustRung(begun(0), -1, START).rung).toBe(0)
    expect(adjustRung(begun(ladder.rungs.length - 1), 1, START).rung).toBe(ladder.rungs.length - 1)
  })

  test("a move that changes nothing returns the same run untouched", () => {
    const run = begun(0)
    expect(adjustRung(run, -1, START)).toBe(run)
  })
})

describe("bringing your own ladder", () => {
  test("builds one from what the user typed", () => {
    const l = buildCustomLadder("Cold showers", [
      { action: "Turn it cold for five seconds", counts: "Five seconds of cold" },
      { action: "Thirty seconds", counts: "Thirty seconds of cold" },
    ])

    expect(l.id).toBe("custom")
    expect(l.label).toBe("Cold showers")
    expect(l.rungs).toHaveLength(2)
  })

  test("supplies the permission to stop, so it cannot be dropped", () => {
    const l = buildCustomLadder("x", [
      { action: "a", counts: "" },
      { action: "b", counts: "" },
    ])

    expect(l.rungs.every((r) => r.release === CUSTOM_RELEASE)).toBe(true)
  })

  test("fills in a usable 'counts' when the user leaves it blank", () => {
    const l = buildCustomLadder("x", [{ action: "a", counts: "  " }, { action: "b", counts: "" }])
    expect(l.rungs[0].counts.length).toBeGreaterThan(0)
  })

  test("drops blank rungs rather than creating empty steps", () => {
    const l = buildCustomLadder("x", [
      { action: "a", counts: "" },
      { action: "   ", counts: "ignored" },
      { action: "b", counts: "" },
    ])

    expect(l.rungs.map((r) => r.action)).toEqual(["a", "b"])
  })

  test("one rung is not a ladder", () => {
    expect(customIsUsable(buildCustomLadder("x", [{ action: "a", counts: "" }]))).toBe(false)
    expect(customIsUsable(buildCustomLadder("x", [{ action: "a", counts: "" }, { action: "b", counts: "" }]))).toBe(true)
    expect(customIsUsable(null)).toBe(false)
  })

  test("a custom run climbs and persists like any other", () => {
    const custom = buildCustomLadder("Cold showers", [
      { action: "Five seconds", counts: "five" },
      { action: "Thirty seconds", counts: "thirty" },
    ])
    let run = startRun(emptyRun(START), "custom", 0, 3, START, custom, START)
    run = withReps(REPS_TO_ADVANCE, run)

    expect(rungState(run)!.index).toBe(1)
    expect(rungState(run)!.rung.action).toBe("Thirty seconds")
    expect(loadRun(serializeRun(run))).toEqual(run)
  })
})

describe("the ladder is supplied, and climbed by reps", () => {
  test("everyone starts on rung one unless they say otherwise", () => {
    const s = rungState(begun())!
    expect(s.index).toBe(0)
    expect(s.rung).toEqual(LADDER_BY_ID.talking.rungs[0])
    expect(s.toAdvance).toBe(REPS_TO_ADVANCE)
  })

  test("three clean reps move you up one rung, not more", () => {
    const s = rungState(withReps(REPS_TO_ADVANCE))!
    expect(s.index).toBe(1)
    expect(s.done).toBe(0)
  })

  test("progress is earned by repetitions, never by days passing", () => {
    // Twenty days later with nothing logged, still rung one.
    const run = begun()
    expect(rungState(run)!.index).toBe(0)
    expect(statusOf(run, DAY(21)).dayNumber).toBe(21)
    expect(rungState(run)!.index).toBe(0)
  })

  test("the ladder stops at the top rung instead of running off the end", () => {
    const ladder = LADDER_BY_ID.talking
    const s = rungState(withReps(REPS_TO_ADVANCE * (ladder.rungs.length + 3)))!

    expect(s.index).toBe(ladder.rungs.length - 1)
    expect(s.isLast).toBe(true)
    expect(s.toAdvance).toBe(0)
    expect(s.rung).toEqual(ladder.rungs[ladder.rungs.length - 1])
  })

  test("misses do not push you up and do not pull you down", () => {
    let run = withReps(2)
    expect(rungState(run)!.done).toBe(2)

    run = logRep(run, DAY(3), "missed", START)
    run = logRep(run, DAY(4), "missed", START)

    const s = rungState(run)!
    expect(s.index, "a miss must never demote").toBe(0)
    expect(s.done, "a miss must never wipe reps already earned").toBe(2)
  })
})

describe("logging a day", () => {
  test("re-logging the same day replaces it rather than double-counting", () => {
    let run = logRep(begun(), DAY(1), "did", START)
    run = logRep(run, DAY(1), "missed", START)

    expect(run.entries).toHaveLength(1)
    expect(entryFor(run, DAY(1))?.outcome).toBe("missed")
    expect(statusOf(run, DAY(1)).totalDone).toBe(0)
  })

  test("entries stay in date order however they were logged", () => {
    let run = begun()
    run = logRep(run, DAY(5), "did", START)
    run = logRep(run, DAY(2), "did", START)
    run = logRep(run, DAY(9), "missed", START)

    expect(run.entries.map((e) => e.date)).toEqual([DAY(2), DAY(5), DAY(9)])
  })

  test("each entry records the rung it happened on", () => {
    const run = withReps(REPS_TO_ADVANCE + 1)
    expect(run.entries[0].rung).toBe(0)
    expect(run.entries[run.entries.length - 1].rung).toBe(1)
  })

  test("today is reported as logged only once it has been", () => {
    const run = begun()
    expect(statusOf(run, DAY(1)).loggedToday).toBeNull()
    expect(statusOf(logRep(run, DAY(1), "did", START), DAY(1)).loggedToday).toBe("did")
  })

  test("changing today's answer rolls back the rep it banked", () => {
    // Otherwise a mis-tap on "did it" leaves a rep banked that never happened,
    // and three mis-taps promote you up a rung you never earned.
    let run = withReps(2)
    expect(rungState(run)!.done).toBe(2)

    run = logRep(run, DAY(2), "missed", START)

    expect(rungState(run)!.done, "the rep from day 2 must be given back").toBe(1)
    expect(statusOf(run, DAY(2)).totalDone).toBe(1)
  })

  test("a mis-tap cannot promote you", () => {
    let run = withReps(REPS_TO_ADVANCE - 1)
    run = logRep(run, DAY(REPS_TO_ADVANCE), "did", START)
    expect(rungState(run)!.index, "earned it").toBe(1)

    // Undo the promoting rep on the same day.
    run = logRep(run, DAY(REPS_TO_ADVANCE), "missed", START)
    expect(rungState(run)!.index, "the promotion should not survive the undo").toBe(1)
    expect(rungState(run)!.done).toBe(0)
  })

  test("the promoting rep is announced once", () => {
    const run = withReps(REPS_TO_ADVANCE)
    expect(statusOf(run, DAY(REPS_TO_ADVANCE)).justPromoted).toBe(true)
    expect(statusOf(withReps(1), DAY(1)).justPromoted).toBe(false)
  })
})

describe("pace against what they said was realistic", () => {
  test("counts the last seven days against the chosen cadence", () => {
    const run = withReps(3)
    expect(weekPace(run, DAY(5))).toEqual({ done: 3, target: 3 })
  })

  test("only the last seven days count", () => {
    const run = withReps(3)
    expect(weekPace(run, DAY(20)).done).toBe(0)
  })
})

describe("the miss rules", () => {
  test("a skipped day with nothing logged is not counted as a miss", () => {
    // Silence is not failure. Not opening the app must not read as quitting.
    let run = logRep(begun(), DAY(1), "did", START)
    run = logRep(run, DAY(6), "did", START)

    expect(missStreak(run)).toBe(0)
    expect(statusOf(run, DAY(6)).missStreak).toBe(0)
  })

  test("one miss is weather and says so", () => {
    const run = logRep(withReps(2), DAY(3), "missed", START)

    expect(missStreak(run)).toBe(1)
    expect(missMessage(1)).toContain("Nothing resets")
  })

  test("two in a row is named as the one that ends things", () => {
    let run = logRep(withReps(2), DAY(3), "missed", START)
    run = logRep(run, DAY(4), "missed", START)

    expect(missStreak(run)).toBe(2)
    expect(missMessage(2)).toContain("two in a row")
  })

  test("a clean rep clears the streak", () => {
    let run = logRep(withReps(1), DAY(2), "missed", START)
    run = logRep(run, DAY(3), "missed", START)
    expect(missStreak(run)).toBe(2)

    run = logRep(run, DAY(4), "did", START)
    expect(missStreak(run)).toBe(0)
    expect(missMessage(0)).toBeNull()
  })
})

describe("the letter", () => {
  test("is not asked for before there is anything to protect", () => {
    expect(statusOf(begun(), DAY(1)).letterDue).toBe(false)
  })

  test("is asked for after the first success, while nothing has gone wrong", () => {
    const run = withReps(1)
    const s = statusOf(run, DAY(1))

    expect(s.letterDue).toBe(true)
    expect(s.showLetter).toBe(false)
  })

  test("stops being asked for once written", () => {
    const run = setLetter(withReps(1), "Dear me, get up.", START)
    expect(statusOf(run, DAY(1)).letterDue).toBe(false)
  })

  test("surfaces on the second consecutive miss, and not on the first", () => {
    let run = setLetter(withReps(2), "Dear me, get up.", START)

    run = logRep(run, DAY(3), "missed", START)
    expect(statusOf(run, DAY(3)).showLetter, "one miss is not the moment").toBe(false)

    run = logRep(run, DAY(4), "missed", START)
    expect(statusOf(run, DAY(4)).showLetter).toBe(true)
  })

  test("cannot surface if it was never written", () => {
    let run = withReps(2)
    run = logRep(run, DAY(3), "missed", START)
    run = logRep(run, DAY(4), "missed", START)

    expect(statusOf(run, DAY(4)).showLetter).toBe(false)
  })
})

describe("where you are in the arc", () => {
  test("counts the first day as day one, not day zero", () => {
    expect(statusOf(begun(), START).dayNumber).toBe(1)
  })

  test("names week three as the worst moment to judge it", () => {
    expect(statusOf(begun(), DAY(15)).timelineNote).toContain("least useful moment")
  })

  test("moves through the arc as the days pass", () => {
    const run = begun()
    const notes = [1, 10, 30].map((d) => statusOf(run, DAY(d)).timelineNote)
    expect(new Set(notes).size, "each phase should read differently").toBe(3)
  })

  test("daysBetween is date-only, so a clock change cannot shift it", () => {
    expect(daysBetween("2026-03-01", "2026-03-31")).toBe(30)
    expect(daysBetween("2026-03-01T23:59:59Z", "2026-03-02T00:00:01Z")).toBe(1)
    expect(daysBetween("nonsense", "2026-03-02")).toBe(0)
  })
})

describe("the history strip", () => {
  test("returns one slot per day, oldest first, ending today", () => {
    const days = recentDays(withReps(2), DAY(5), 5)

    expect(days).toHaveLength(5)
    expect(days[days.length - 1].date).toBe(DAY(5))
    expect(days[0].date).toBe(DAY(1))
  })

  test("shows blanks for days with nothing logged", () => {
    const days = recentDays(logRep(begun(), DAY(2), "did", START), DAY(4), 4)
    expect(days.map((d) => d.outcome)).toEqual([null, "did", null, null])
  })
})

describe("persistence", () => {
  test("round-trips a run", () => {
    const run = setLetter(withReps(4), "Dear me.", START)
    expect(loadRun(serializeRun(run))).toEqual(run)
  })

  test("rejects another schema version rather than repairing it", () => {
    const stale = JSON.stringify({ ...emptyRun(START), v: REP_SCHEMA_VERSION + 1 })
    expect(loadRun(stale)).toBeNull()
  })

  test("returns null for junk instead of throwing", () => {
    expect(loadRun(null)).toBeNull()
    expect(loadRun("{oops")).toBeNull()
    expect(loadRun('"a string"')).toBeNull()
  })

  test("drops malformed entries instead of crashing the whole run", () => {
    const raw = JSON.stringify({ ...begun(), entries: [{ date: DAY(1), outcome: "did", rung: 0 }, null, { nope: 1 }] })
    const restored = loadRun(raw)

    expect(restored?.entries).toHaveLength(1)
  })
})

describe("the ladders themselves", () => {
  test("every rung carries permission to stop, which is the mechanism", () => {
    for (const ladder of REP_LADDERS) {
      for (const rung of ladder.rungs) {
        expect(rung.release.trim().length, `${ladder.id} rung missing its release`).toBeGreaterThan(0)
        expect(rung.action.trim().length).toBeGreaterThan(0)
        expect(rung.counts.trim().length).toBeGreaterThan(0)
      }
    }
  })

  test("every ladder has enough rungs to be a progression", () => {
    for (const ladder of REP_LADDERS) {
      expect(ladder.rungs.length, ladder.id).toBeGreaterThanOrEqual(4)
    }
  })

  test("ladder ids are unique and reachable by id", () => {
    const ids = REP_LADDERS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(LADDER_BY_ID[id].id).toBe(id)
  })
})
