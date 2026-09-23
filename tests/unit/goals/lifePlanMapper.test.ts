/**
 * A PLAN THAT GOES OUT AND COMES BACK IS THE SAME PLAN.
 *
 * This is the only property that matters about the mapper, and it is the one a
 * field-by-field test never catches: every column can be mapped correctly and
 * the plan still come back wrong, because the flow's shape is nested and the
 * rows are flat, and the joining back up is where it goes.
 *
 * So the test is a ROUND TRIP over a plan with something in every part of it,
 * not a list of assertions about columns. `planToRows` then `rowsToPlan`, and
 * the result must equal what went in.
 *
 * The rest of the file is the handful of places where "the same plan" is
 * subtler than deep equality, each of which was a real decision in the schema:
 * a goal's rank IS its position, absent is not null, a routine tracked by a
 * program has no split-day rows of its own, and the day half does not travel.
 */

import { describe, it, expect } from "vitest"
import { emptyNsPlan, addGoal, addPractice, normalizeNsPlan, serializeNsPlan } from "@/src/goals/northStarService"
import { planToRows, rowsToPlan, mergeDayRecord, NORTH_STAR_LOCAL_ID } from "@/src/goals/lifePlanMapper"
import type { MapContext } from "@/src/goals/lifePlanMapper"
import type { NsPlan } from "@/src/goals/types"

const PLAN_ID = "11111111-1111-1111-1111-111111111111"
const USER_ID = "22222222-2222-2222-2222-222222222222"

/**
 * A stable, deterministic `idFor`.
 *
 * Deterministic on purpose: a mapper that minted random UUIDs could not be
 * round-tripped, and the real repo's version is equally deterministic — it
 * returns the UUID a local id already has and only mints for a new one.
 */
function context(): MapContext & { minted: Map<string, string> } {
  const minted = new Map<string, string>()
  let n = 0
  return {
    planId: PLAN_ID,
    userId: USER_ID,
    minted,
    idFor(localId: string): string {
      const had = minted.get(localId)
      if (had) return had
      n += 1
      const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
      minted.set(localId, id)
      return id
    },
  }
}

/** A plan with something in every part of it, built through the real service. */
function fullPlan(): NsPlan {
  let plan = emptyNsPlan()
  plan = { ...plan, northStar: "A house I chose, and the health to enjoy it.", horizonYears: 20 }
  // The seeded routines start EMPTY, so steps are added through the real
  // service rather than assumed. Without this every assertion about a step
  // passes vacuously.
  plan = addPractice(plan, "morning", "smile")
  plan = addPractice(plan, "morning", "stretch")
  plan = addPractice(plan, "night", "tomorrow")

  const health = plan.areas[0].id
  const money = plan.areas[1].id
  plan = addGoal(plan, health, "Run a half marathon")
  plan = addGoal(plan, money, "Six months of runway")
  const [g1, g2] = plan.goals

  plan = {
    ...plan,
    rungs: { star_why: "Because I said I would.", star_who: "The person who finishes things." },
    answers: { one_thing: "Train four mornings a week." },
    currentValues: ["Comfort", "Avoidance"],
    values: ["Courage", "Discipline"],
    seasonFocusId: health,
    seasonAreaIds: [health, money],
    // Deliberately the reverse of the goals array, so a round trip that ignored
    // priorityIds would come back in the wrong order and this would catch it.
    priorityIds: [g2.id, g1.id],
    review: {
      [health]: {
        ten: "Running without thinking about it.",
        purpose: "To not be afraid of my own body.",
        snapshot: "Out of breath on one flight of stairs.",
        fortnight: 4,
        goalsAim: "yes",
        blockers: "Evenings disappear.",
        values: ["Vitality", "Consistency"],
        identity: "Someone who trains.",
      },
    },
    goals: [
      {
        ...g1,
        why: "Because I want to finish something hard.",
        painWhy: "Because I have quit every other time.",
        sentence: "I will easily run 21 km by June.",
        targetDate: "2027-06-01",
        beliefLevel: 6,
        desireLevel: 9,
        unit: "km",
        daysPerWeek: 4,
        perWeek: 30,
        feeling: "Light.",
        reward: "A weekend away.",
        stake: "I tell my brother.",
        isAbstinence: false,
        servesOneThing: true,
        serves: [money],
        values: ["Courage"],
        asked: ["why", "when"],
        reasonsList: ["I said I would", "My knees will thank me"],
        checkpoints: [
          { id: "m1", title: "Run 5 km", done: true, celebration: "A coffee out" },
          { id: "m2", title: "Run 10 km", done: false },
        ],
        obstacles: [{ id: "o1", what: "Rain", counter: "A treadmill exists" }],
        beliefs: [{ id: "b1", old: "I am not a runner", useful: false, evidence: "I ran in school", replacement: "I am becoming one" }],
        habits: [{ id: "h1", title: "Morning run", daysPerWeek: 4, placeholder: false }],
        feedsGoalIds: [g2.id],
      },
      { ...g2, why: "So I can leave a job I hate.", values: ["Discipline"] },
    ],
    experiences: [
      { id: "x1", title: "See the northern lights", areaId: health, done: false, doneOn: null, goalId: null },
      { id: "x2", title: "Swim in the sea in winter", areaId: null, done: true, doneOn: "2026-02-01", goalId: g1.id },
    ],
    fields: [
      { id: "f1", label: "How did the day go?", targetId: null, kind: "write", readSourceId: null },
      { id: "f2", label: "Read your north star", targetId: null, kind: "read", readSourceId: "star" },
    ],
    subSteps: [{ id: "s1", targetId: g1.id, title: "Book the race" }],
    seq: 42,
  }

  return normalizeNsPlan(JSON.parse(serializeNsPlan(plan)))!
}

/** Everything except the day half, which Phase 1 does not carry. */
function withoutDays(plan: NsPlan): NsPlan {
  return { ...plan, daily: {}, logged: {}, notes: {}, journal: {}, updatedAt: null }
}

describe("a plan that goes out and comes back is the same plan", () => {
  it("round-trips every part of a full plan", () => {
    const plan = fullPlan()
    const rows = planToRows(plan, context())
    const back = rowsToPlan(rows)

    expect(back).not.toBeNull()
    expect(withoutDays(back!)).toEqual(withoutDays(plan))
  })

  it("round-trips the empty plan the flow starts from", () => {
    const plan = normalizeNsPlan(JSON.parse(serializeNsPlan(emptyNsPlan())))!
    const back = rowsToPlan(planToRows(plan, context()))
    expect(withoutDays(back!)).toEqual(withoutDays(plan))
  })

  it("keeps BOTH orders, because there really are two", () => {
    const plan = fullPlan()
    const back = rowsToPlan(planToRows(plan, context()))!

    // `priorityIds` went in as the REVERSE of the goals array, so a mapper
    // that stored one order and derived the other cannot pass both of these.
    // An earlier draft stored only the rank, on the strength of a comment
    // naming an `orderedGoals` function that does not exist and has no
    // callers — eight live screens read `plan.goals` directly, so that would
    // have reordered every goal screen on the first load after this shipped.
    expect(back.priorityIds).toEqual(plan.priorityIds)
    expect(back.goals.map((g) => g.id)).toEqual(plan.goals.map((g) => g.id))
    expect(back.priorityIds).not.toEqual(back.goals.map((g) => g.id))
  })

  it("puts a goal that priorityIds forgot on the end rather than dropping it", () => {
    const plan = fullPlan()
    const orphaned: NsPlan = { ...plan, priorityIds: [plan.goals[1].id] }
    const back = rowsToPlan(planToRows(orphaned, context()))!
    // Phase 0 hit exactly this: renaming a duplicate dropped it from the list,
    // and a goal with no position disappears from every ordered view.
    expect(back.goals).toHaveLength(plan.goals.length)
    expect(back.goals.map((g) => g.id)).toContain(plan.goals[0].id)
  })
})

describe("absent is not null", () => {
  it("brings back a step that never had a destination WITHOUT the key", () => {
    const plan = fullPlan()
    // Built, not hoped for: the seeded routines all have a destination
    // inferred, so the third state has to be made deliberately.
    const morning = plan.routines.findIndex((r) => r.blueprintId === "morning")
    const older: NsPlan = {
      ...plan,
      routines: plan.routines.map((r, i) =>
        i === morning
          ? { ...r, steps: r.steps.map((s, j) => (j === 0 ? stripKey(s, "goesTo") : s)) }
          : r,
      ),
    }
    const rows = planToRows(older, context())
    const step = rows.steps.find((s) => !s.goes_to_set)
    expect(step, "a step with no destination key at all").toBeTruthy()

    // THE ROW IS WHAT CARRIES THE THIRD STATE. Never set and deliberately
    // cleared are both `goes_to = NULL`; only the companion flag tells them
    // apart, which is the whole reason the column pair exists.
    expect(step!.goes_to).toBeNull()
    expect(step!.goes_to_set).toBe(false)

    const cleared: NsPlan = {
      ...older,
      routines: older.routines.map((r, i) =>
        i === plan.routines.findIndex((x) => x.blueprintId === "morning")
          ? { ...r, steps: r.steps.map((s, j) => (j === 0 ? { ...s, goesTo: null } : s)) }
          : r,
      ),
    }
    const clearedRow = planToRows(cleared, context()).steps.find(
      (s) => s.position === step!.position && s.routine_id === step!.routine_id,
    )!
    // Same null, different state. One nullable column could not hold both.
    expect(clearedRow.goes_to).toBeNull()
    expect(clearedRow.goes_to_set).toBe(true)
    expect(clearedRow.goes_to_set).not.toBe(step!.goes_to_set)
  })

  it("keeps a destination somebody deliberately cleared as null", () => {
    const plan = fullPlan()
    const morning = plan.routines.findIndex((r) => r.blueprintId === "morning")
    const cleared: NsPlan = {
      ...plan,
      routines: plan.routines.map((r, i) =>
        i === morning ? { ...r, steps: r.steps.map((s, j) => (j === 0 ? { ...s, goesTo: null } : s)) } : r,
      ),
    }
    const rows = planToRows(cleared, context())
    const target = cleared.routines[morning].steps[0].id
    const first = rows.steps.find((s) => localOf(rows, s.id) === target)!
    expect(first.goes_to_set).toBe(true)
    expect(first.goes_to).toBeNull()

    const back = rowsToPlan(rows)!
    const backStep = back.routines[morning].steps[0]
    // AND INFERENCE DID NOT ARGUE WITH IT. This is the pair to the test above:
    // the same loader that fills in a never-set destination must leave a
    // deliberately cleared one alone, or clearing a step silently undoes itself
    // on the next reload.
    expect("goesTo" in backStep).toBe(true)
    expect(backStep.goesTo).toBeNull()
  })
})

describe("the schema's own rules, enforced by the mapper", () => {
  it("writes no split-day rows for a routine tracked by a program", () => {
    const plan = fullPlan()
    // The four seeded routines are morning, night, work and vices — there is
    // no workout routine by default, so the week is put on one that exists.
    const weekly = 0
    expect(plan.routines[weekly]).toBeTruthy()
    const days = [{ id: "d1", name: "Upper" }, { id: "d2", name: "Lower" }]

    // A week somebody typed by hand DOES get rows.
    const byHand: NsPlan = {
      ...plan,
      routines: plan.routines.map((r, i) => (i === weekly ? { ...r, splitDays: days } : r)),
    }
    const handRows = planToRows(byHand, context())
    expect(handRows.split_days).toHaveLength(2)
    expect(handRows.split_days.map((d) => d.name)).toEqual(["Upper", "Lower"])

    // The same week, once a program is tracking it, does not.
    const tracked: NsPlan = {
      ...byHand,
      routines: byHand.routines.map((r, i) =>
        i === weekly ? { ...r, program: { enrollmentId: "33333333-3333-3333-3333-333333333333" } } : r,
      ),
    }
    const rows = planToRows(tracked, context())
    const routine = rows.routines[weekly]
    // Its days come from the enrollment's own schedule, so a swapped lift is
    // named correctly. Two answers to one question is what this refuses.
    expect(routine.enrollment_id).toBe("33333333-3333-3333-3333-333333333333")
    expect(rows.split_days.filter((d) => d.routine_id === routine.id)).toHaveLength(0)
  })

  it("stores the enrollment as a reference and nothing else about the program", () => {
    const plan = fullPlan()
    const tracked: NsPlan = {
      ...plan,
      routines: plan.routines.map((r, i) =>
        i === 0 ? { ...r, program: { enrollmentId: "33333333-3333-3333-3333-333333333333" } } : r,
      ),
    }
    const rows = planToRows(tracked, context())
    const keys = Object.keys(rows.routines[0])
    expect(keys.filter((k) => /program|catalog|label_copy|started/.test(k))).toEqual([])
  })

  it("refuses a plan where two parts share an id, naming the id", () => {
    const plan = fullPlan()
    const clashing: NsPlan = {
      ...plan,
      fields: [...plan.fields, { ...plan.fields[0], label: "A second thing called f1" }],
    }
    expect(() => planToRows(clashing, context())).toThrow(/share the id "f1"/)
  })

  it("gives the north star a local id no counter can mint", () => {
    const rows = planToRows(fullPlan(), context())
    expect(rows.north_stars).toHaveLength(1)
    expect(rows.nodes.find((n) => n.kind === "north_star")?.local_id).toBe(NORTH_STAR_LOCAL_ID)
    expect(NORTH_STAR_LOCAL_ID).not.toMatch(/^[a-z]+\d+$/)
  })

  it("drops a sub-step whose parent has left the plan rather than saving a dangling id", () => {
    const plan = fullPlan()
    const orphan: NsPlan = { ...plan, subSteps: [{ id: "s9", targetId: "a-goal-that-is-gone", title: "Nothing" }] }
    const rows = planToRows(orphan, context())
    expect(rows.sub_steps).toHaveLength(0)
  })
})

describe("a node keeps its uuid, because the day tables point at it", () => {
  it("hands the same uuid back for a local id that already has one", () => {
    const plan = fullPlan()
    const ctx = context()
    const first = planToRows(plan, ctx)
    // A second save of an edited plan, through the SAME context — which is what
    // the repo does, having read the existing nodes first.
    const edited: NsPlan = { ...plan, northStar: "Something else entirely." }
    const second = planToRows(edited, ctx)

    const idsOf = (rows: typeof first) =>
      Object.fromEntries(rows.nodes.map((n) => [n.local_id, n.id]))
    // Every part that still exists must have the id it had. A re-mint here
    // deletes every tick and journal entry the person ever wrote.
    expect(idsOf(second)).toEqual(idsOf(first))
  })
})

describe("the day half does not travel, and is not lost either", () => {
  it("comes back empty from rows, because Phase 1 has no day route", () => {
    const plan = fullPlan()
    const back = rowsToPlan(planToRows(plan, context()))!
    expect(back.daily).toEqual({})
    expect(back.journal).toEqual({})
  })

  it("takes the browser's day record when the server has none", () => {
    const server = rowsToPlan(planToRows(fullPlan(), context()))!
    const browser: NsPlan = {
      ...server,
      daily: { "2026-09-01": { health: 7 } },
      logged: { "2026-09-01": ["g1"] },
      notes: { "2026-09-01": "a good day" },
      journal: { "2026-09-01": { f1: "three gratitudes" } },
    }
    const merged = mergeDayRecord(server, browser)
    expect(merged.journal).toEqual(browser.journal)
    expect(merged.notes).toEqual(browser.notes)
    // And the plan half is still the server's.
    expect(merged.northStar).toBe(server.northStar)
  })

  it("prefers the server's day record once it has one", () => {
    const base = rowsToPlan(planToRows(fullPlan(), context()))!
    const server: NsPlan = { ...base, notes: { "2026-09-02": "from the server" } }
    const browser: NsPlan = { ...base, notes: { "2026-09-01": "from this browser" } }
    expect(mergeDayRecord(server, browser).notes).toEqual({ "2026-09-02": "from the server" })
  })
})

/** A copy of the step with the key genuinely absent, not set to undefined. */
function stripKey<T extends object, K extends keyof T>(obj: T, key: K): T {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

/** The local id a uuid stands for, for assertions that need to cross back. */
function localOf(rows: { nodes: { id: string; local_id: string }[] }, uuid: string): string {
  return rows.nodes.find((n) => n.id === uuid)?.local_id ?? ""
}

/**
 * THE ONE THING FOR THIS SEASON, when it is a goal — which the type says is the
 * usual case.
 *
 * `planToRows` resolved this through the AREA map until 2026-09-23, so a goal
 * focus became NULL on the way out and the Focus step's whole answer was lost
 * on the next device. It never errored: NULL is a legal "not picked yet".
 */
describe("the season focus survives whatever kind of thing it is", () => {
  const roundTrip = (plan: NsPlan): NsPlan => rowsToPlan(planToRows(plan, context()))!

  it("keeps a focus that is a GOAL", () => {
    const base = emptyNsPlan()
    let plan = addGoal(base, base.areas[0].id, "Run a half marathon")
    const goalId = plan.goals[0].id
    plan = { ...plan, seasonFocusId: goalId }

    const rows = planToRows(plan, context())
    expect(rows.season_focus_id, "a goal focus must reach the column").not.toBeNull()
    expect(roundTrip(plan).seasonFocusId).toBe(goalId)
  })

  it("keeps a focus that is an AREA", () => {
    const base = emptyNsPlan()
    const areaId = base.areas[0].id
    const plan = { ...base, seasonFocusId: areaId, northStar: "something written" }
    expect(roundTrip(plan).seasonFocusId).toBe(areaId)
  })

  it("keeps null as null", () => {
    expect(roundTrip({ ...emptyNsPlan(), northStar: "written" }).seasonFocusId).toBeNull()
  })
})

