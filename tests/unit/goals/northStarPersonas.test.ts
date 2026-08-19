/**
 * Six people, run through the whole flow.
 *
 * Everything else in this suite tests one function against one input. These are
 * whole plans in the shape real people arrive in — a lifter with numbers
 * everywhere, somebody whose goals have no numbers at all, somebody counting
 * money, somebody who wrote the same thing in two places, somebody who only
 * wrote feelings, and somebody who has written nothing yet — asked the question
 * the page is actually judged on: does what comes back make sense for THEM.
 *
 * Every case below started as a thing the page got wrong for one of them.
 */

import { describe, expect, it } from "vitest"
import {
  addCustomStep,
  addOneThingRequirement,
  addGoal,
  emptyNsPlan,
  goalMilestones,
  liftProgression,
  milestoneValues,
  setAreaReview,
  setLadderStart,
  suggestedActions,
  updateGoal,
  goalEchoes,
  oneThingRequirements,
} from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"

const NOW = "2026-08-17T09:00:00.000Z"
const TODAY = "2026-08-17"

/** A climb, written the way the builder writes one. */
function climb(plan: NsPlan, areaId: string, title: string, unit: string, start: number, target: number, date: string) {
  let next = addGoal(plan, areaId, title, "milestone_ladder", NOW)
  const goal = next.goals[next.goals.length - 1]
  next = updateGoal(next, goal.id, {
    unit,
    targetDate: date,
    ladder: { start: 0, target, steps: 4, curveTension: 0, controlPoints: [], pins: [] },
  }, NOW)
  return setLadderStart(next, goal.id, start, NOW)
}

/** A driver: a rate you hold, with no finish line. */
function driver(plan: NsPlan, areaId: string, title: string, daysPerWeek: number) {
  const next = addGoal(plan, areaId, title, "habit_ramp", NOW)
  return updateGoal(next, next.goals[next.goals.length - 1].id, { daysPerWeek }, NOW)
}

const rungTitles = (plan: NsPlan, i = 0) => goalMilestones(plan.goals[i], TODAY).map((m) => m.label)

describe("the lifter — numbers in everything", () => {
  const plan = climb(emptyNsPlan(), "lm_fitness", "Flat bench 100 kg", "kg", 72, 100, "2027-08-17")

  it("climbs on the plate grid, in the numbers he actually wrote", () => {
    const rungs = rungTitles(plan)
    expect(rungs.length).toBeGreaterThan(3)
    for (const rung of rungs) {
      const weight = Number(/([\d.]+) kg/.exec(rung)?.[1])
      expect(weight, rung).toBeGreaterThan(0)
      // Loadable: every rung is a multiple of the smallest plate jump.
      expect(Math.round((weight / 2.5) * 100) % 100, rung).toBe(0)
      expect(weight, rung).toBeLessThanOrEqual(100)
    }
    // No sets and reps: "Flat bench 100 kg" says nothing about either, and
    // the page inventing 3×8 is it deciding how this person trains.
    expect(rungs.some((r) => /×/.test(r))).toBe(false)
    expect(rungs[rungs.length - 1]).toContain("100 kg")
  })
})

describe("the calisthenics one — nothing to compute", () => {
  it("asks for no number where the goal has none, and offers no fake one", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "One muscle-up", "achievement", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { targetDate: "2027-01-01" }, NOW)
    // One finish line on the date and nothing else: an achievement has no
    // ladder to space, and must not have a "from" invented to make one.
    const marks = goalMilestones(plan.goals[0], TODAY)
    expect(marks.map((m) => m.kind)).toEqual(["finish"])
    expect(marks[0].label).not.toMatch(/\d+\s*(kg|reps|×)/)
  })

  it("keeps a distance climb in whole kilometres", () => {
    const plan = climb(emptyNsPlan(), "lm_fitness", "Run 21 km", "km", 5, 21, "2027-05-01")
    // The label is "<goal title>: <rung>", and the title has a number in it
    // too — read the rung, not the goal.
    const values = rungTitles(plan).map((r) => Number(/:\s*([\d.]+) km/.exec(r)?.[1]))
    expect(values).toEqual([9, 13, 17, 21])
  })
})

describe("the money one — big numbers are not exempt", () => {
  it("spaces revenue on round numbers, not on arithmetic", () => {
    // 4150 kr was what even spacing produced. Nobody writes that down.
    expect(milestoneValues(2200, 10000, 4, "kr")).toEqual([4000, 6000, 8000, 10000])
  })

  it("scales the grid to the size of the climb", () => {
    for (const [from, to] of [[500, 5000], [3000, 10000], [20000, 100000]]) {
      const values = milestoneValues(from, to, 4, "kr")
      const grid = 10 ** Math.floor(Math.log10(to - from)) / 2
      for (const v of values.slice(0, -1)) expect(Math.round(v % grid), `${from}→${to}: ${v}`).toBe(0)
      expect(values[values.length - 1]).toBe(to)
    }
  })

  it("leaves small numbers alone", () => {
    // A goal of "12 % body fat" must not be rounded to the nearest 5.
    expect(milestoneValues(22, 12, 4, "%")).toEqual([20, 17, 15, 12])
  })
})

describe("the one who wrote it twice", () => {
  let plan = emptyNsPlan()
  plan = addCustomStep(plan, "r1", "Stretch while you are still lying down", 2, 7, NOW)
  plan = driver(plan, "lm_health", "Stretch while you are still lying down", 5)
  plan = driver(plan, "lm_health", "No weed", 7)

  it("names the routine the goal is already in", () => {
    const echoes = goalEchoes(plan, plan.goals[0])
    expect(echoes.length).toBeGreaterThan(0)
    expect(echoes.join(" ")).toMatch(/routine/i)
  })

  it("does not delete either copy on the person's behalf", () => {
    // Naming it is the whole behaviour. Which one they keep is theirs to say.
    expect(plan.goals).toHaveLength(2)
    expect(plan.routines.find((r) => r.id === "r1")?.steps).toHaveLength(1)
  })

  it("suggests nothing for a driver it has nothing to say about", () => {
    const weed = plan.goals[1]
    for (const action of suggestedActions(plan, weed)) {
      expect(action.title.toLowerCase(), `offered under "${weed.title}"`).not.toMatch(/water|bed|smile/)
    }
  })
})

describe("the vague one — feelings, no verbs", () => {
  let plan = emptyNsPlan()
  plan = setAreaReview(plan, "lm_emotions", { ten: "I wake up happy and excited to start the day." }, NOW)
  plan = setAreaReview(plan, "lm_fun", { ten: "Life feels light again." }, NOW)
  plan = setAreaReview(plan, "lm_relationship", { ten: "I am not lonely." }, NOW)
  plan = addGoal(plan, "lm_emotions", "Be happier", "achievement", NOW)

  it("has nothing offered to it, which is the point", () => {
    // This person is why the suggestion list went. Every version of it either
    // handed them back "Life feels light again" — scenery, with no Tuesday on
    // which you can do it — or, once the filter was tight enough to reject
    // that, offered them nothing at all. A box asks the question honestly.
    expect(plan.goals.filter((g) => g.servesOneThing)).toEqual([])
  })

  it("still gets a shaped goal out of whatever they do write", () => {
    const next = addOneThingRequirement(plan, "Ring my mother once a week", undefined, NOW)
    expect(next.goals[next.goals.length - 1]).toMatchObject({ areaId: "lm_family", type: "habit_ramp", daysPerWeek: 1 })
  })
})

describe("the new one — nothing written yet", () => {
  const plan = emptyNsPlan()

  it("starts empty, and nothing is filled in on their behalf", () => {
    expect(plan.goals).toEqual([])
    expect(oneThingRequirements(plan)).toEqual([])
  })

  it("still has the twelve areas and the routines to open", () => {
    expect(plan.areas.length).toBe(12)
    expect(plan.routines.length).toBeGreaterThan(0)
    for (const routine of plan.routines) expect(routine.steps).toEqual([])
  })
})

describe("across all six, the rules that hold for everybody", () => {
  it("never puts a rung past the finish line, whatever the unit", () => {
    for (const unit of ["kg", "lbs", "km", "%", "kr", "reps", ""]) {
      for (const [from, to] of [[0, 10], [5, 21], [72, 100], [2200, 10000], [22, 12], [7, 10]]) {
        const values = milestoneValues(from, to, 4, unit)
        expect(values[values.length - 1], `${unit} ${from}→${to}`).toBe(to)
        for (const v of values) {
          const inside = to > from ? v > from && v <= to : v < from && v >= to
          expect(inside, `${unit} ${from}→${to}: ${v}`).toBe(true)
        }
      }
    }
  })

  it("never repeats a rung, which is how a climb stops looking like one", () => {
    for (const unit of ["kg", "kr", "reps", ""]) {
      for (let to = 3; to <= 200; to += 7) {
        const values = milestoneValues(2, to, 4, unit)
        expect(new Set(values).size, `${unit} → ${to}`).toBe(values.length)
      }
    }
  })

  it("never staggers reps on something that is not lifted", () => {
    // `liftProgression` shapes lifts on request; the decision of WHICH climbs
    // are lifts is `goalMilestones`', and that is the one a person meets.
    const plan = climb(emptyNsPlan(), "lm_fitness", "Run 21 km", "km", 5, 21, "2027-05-01")
    expect(rungTitles(plan).join(" ")).not.toMatch(/×/)
    expect(liftProgression(72, 100, "kg", { count: 4 }).join(" ")).toMatch(/×/)
  })
})
