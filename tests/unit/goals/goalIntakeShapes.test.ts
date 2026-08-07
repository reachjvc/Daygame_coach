/**
 * M10 — the gate: does intake hold up for goal lists nobody here wrote?
 *
 * Ten fixture lists from ten archetypes drive this file (see
 * `fixtures/goalLists.ts`). Per-line expectations catch the specific rule each
 * line exercises; the INVARIANTS below catch the failure CLASS, which is the
 * part that generalises to the eleventh user.
 *
 * Convention borrowed from `lifeMasteryRegressions.test.ts`: a defect becomes a
 * test about its class, not about its instance.
 */

import { describe, it, expect } from "vitest"
import {
  classifyGoalInput, readCadence, readGoalRoute, ladderSteps, measureDirection,
  parseGoalList, createAreaGoal, loadVisionPlanState,
} from "@/src/goals/visionPlanService"
import { GOAL_LIST_FIXTURES, ALL_FIXTURE_LINES, fixtureAsPastedText } from "./fixtures/goalLists"

const TODAY = "2026-07-30"

describe("M10 — ten users' goal lists", () => {
  for (const list of GOAL_LIST_FIXTURES) {
    describe(`${list.id} — ${list.who}`, () => {
      for (const line of list.lines) {
        const label = line.proves ? `${line.text}  [${line.proves}]` : line.text
        it(label, () => {
          const r = classifyGoalInput(line.text, TODAY)
          expect(r.route, "route").toBe(line.route ?? "goal")
          if ((line.route ?? "goal") !== "goal") return

          if (line.type) expect(r.type, "type").toBe(line.type)
          if (line.daysPerWeek !== undefined) expect(r.daysPerWeek, "daysPerWeek").toBe(line.daysPerWeek)
          if (line.monthly !== undefined) expect(!!r.monthly, "monthly").toBe(line.monthly)
          if (line.unit !== undefined) expect(r.measure?.unit, "unit").toBe(line.unit)
          if (line.start !== undefined) expect(r.measure?.start, "start").toBe(line.start)
          if (line.target !== undefined) expect(r.measure?.target, "target").toBe(line.target)
          if (line.protocol !== undefined) expect(r.measure?.protocol, "protocol").toBe(line.protocol)
        })
      }
    })
  }
})

describe("M10 — invariants across all ten lists", () => {
  const readings = ALL_FIXTURE_LINES.map((l) => ({ line: l, r: classifyGoalInput(l.text, TODAY) }))

  it("no ladder has more rungs than its integer range", () => {
    const bad = readings.filter(({ r }) => {
      const m = r.measure
      if (!m || !Number.isInteger(m.start) || !Number.isInteger(m.target)) return false
      return m.steps > Math.max(2, Math.abs(m.target - m.start))
    })
    expect(bad.map((b) => `${b.line.text} → ${b.r.measure!.steps} rungs over ${Math.abs(b.r.measure!.target - b.r.measure!.start)}`)).toEqual([])
  })

  it("a unit is never a word lifted from BEFORE the number", () => {
    // The "Bench 28 kg" → unit "Bench" class. A unit may come from the unit
    // table or from the word AFTER the number; never from the one before it.
    const bad = readings.filter(({ line, r }) => {
      const m = r.measure
      if (!m || !m.unit) return false
      const idx = line.text.search(/\d/)
      if (idx <= 0) return false
      const before = line.text.slice(0, idx).trim().split(/\s+/).pop()?.replace(/[^a-z]/gi, "").toLowerCase()
      return !!before && before.length > 1 && before === m.unit.toLowerCase()
    })
    expect(bad.map((b) => `${b.line.text} → unit "${b.r.measure!.unit}"`)).toEqual([])
  })

  it("a line that names a rhythm never becomes a target", () => {
    // Except an explicit two-ended range, which outranks the rhythm rule by
    // design: in "cut painkillers from 4 a day to 0" the "a day" is part of
    // the unit being reduced, not a cadence to schedule.
    const bad = readings.filter(({ line, r }) =>
      readCadence(line.text) !== null &&
      r.type === "milestone_ladder" &&
      !/\bfrom\b.*\bto\b/i.test(line.text))
    expect(bad.map((b) => b.line.text)).toEqual([])
  })

  it("no line is routed away from 'goal' without an inspectable cue", () => {
    const bad = readings.filter(({ r }) => r.route !== "goal" && !r.routeCue)
    expect(bad.map((b) => b.line.text)).toEqual([])
  })

  it("every measurable goal has a start, a target that differs from it, and a unit", () => {
    const bad = readings.filter(({ r }) =>
      r.type === "milestone_ladder" &&
      (!r.measure || !r.measure.unit.trim() || r.measure.start === r.measure.target))
    expect(bad.map((b) => b.line.text)).toEqual([])
  })

  it("no line arrives with a deadline nobody chose", () => {
    // This assertion used to demand the OPPOSITE — that every target carried a
    // date — which is how today+365 ended up stamped on every captured line and
    // printed in its SMART sentence as though the user had picked it.
    const bad = readings.filter(({ r }) => r.targetDate !== null)
    expect(bad.map((b) => `${b.line.text} → ${b.r.targetDate}`)).toEqual([])
  })

  it("classification is deterministic and free of trailing punctuation in titles", () => {
    for (const { line } of readings) {
      const a = classifyGoalInput(line.text, TODAY)
      const b = classifyGoalInput(line.text, TODAY)
      expect(a).toEqual(b)
      expect(a.title, line.text).not.toMatch(/[,;]\s*$/)
      expect(a.title.trim(), line.text).not.toBe("")
    }
  })
})

describe("M10 — every list survives paste → create → save → load", () => {
  for (const list of GOAL_LIST_FIXTURES) {
    it(`${list.id}`, () => {
      // Arrange: the list exactly as a user would paste it, heading and all.
      const parsed = parseGoalList(fixtureAsPastedText(list), TODAY)

      // Assert: the heading resolved, so no row is left without a room.
      expect(parsed.unresolvedHeadings, `heading "${list.heading}"`).toEqual([])
      expect(parsed.rows).toHaveLength(list.lines.length)
      for (const row of parsed.rows) expect(row.areaId).toBe(list.areaId)

      // Act: create every row the review screen would treat as a goal.
      const goalRows = parsed.rows.filter((r) => r.reading.route === "goal" && !r.reading.monthly)
      let goals: ReturnType<typeof createAreaGoal>[] = []
      for (const row of goalRows) {
        goals = [...goals, createAreaGoal({ areaId: row.areaId!, ...row.reading }, goals.map((g) => g.id))]
      }
      expect(goals).toHaveLength(goalRows.length)
      expect(new Set(goals.map((g) => g.id)).size, "ids collide").toBe(goals.length)

      // Assert: it round-trips through persistence unchanged.
      const state = {
        vision: `${list.who}`,
        intents: [],
        goals,
        priorityIds: goals.map((g) => g.id),
        dailyBudget: 4,
        confirmed: false,
      }
      const loaded = loadVisionPlanState(JSON.stringify(state))
      expect(loaded, "state was rejected by the loader").not.toBeNull()
      expect(loaded!.repairs, "the loader had to repair a state we just built").toEqual([])
      expect(loaded!.state.goals).toEqual(goals)
    })
  }
})

describe("M4 — ladderSteps", () => {
  it("an integer range never gets more rungs than it has room for", () => {
    expect(ladderSteps(0, 1)).toBe(2)
    expect(ladderSteps(0, 3)).toBe(3)
    expect(ladderSteps(0, 5)).toBe(5)
    expect(ladderSteps(0, 100)).toBe(5)
  })
  it("a fractional range keeps the default — 3.1 → 3.6 GPA has real rungs between", () => {
    expect(ladderSteps(3.1, 3.6)).toBe(5)
    expect(ladderSteps(7.2, 6.0)).toBe(5)
  })
  it("direction does not change the rung count", () => {
    expect(ladderSteps(22, 14)).toBe(ladderSteps(14, 22))
  })
})

describe("M5 — direction", () => {
  it("reads down from the pair, not from the words", () => {
    expect(measureDirection({ start: 22, target: 14 })).toBe("down")
    expect(measureDirection({ start: 0, target: 100 })).toBe("up")
    expect(measureDirection({ start: 5, target: 5 })).toBe("up")
  })
})

describe("M7 — readGoalRoute never guesses", () => {
  it("returns 'goal' with no cue for ordinary goals", () => {
    for (const s of ["Bench 80 kg", "Get a girlfriend", "Ship the MVP", "Read 30 pages every day"]) {
      expect(readGoalRoute(s), s).toEqual({ route: "goal", cue: null })
    }
  })
  it("a superlative outranks the identity shape", () => {
    // "Be the biggest band" matches both "^be the…" and a superlative. The
    // superlative wins, because it is a verdict other people deliver.
    expect(readGoalRoute("Be the biggest band in this city").route).toBe("horizon-want")
    expect(readGoalRoute("Be a patient father").route).toBe("identity")
  })
  it("carries the literal cue back so the suggestion is inspectable", () => {
    expect(readGoalRoute("Remember why I started").cue?.toLowerCase()).toBe("remember")
  })
})
