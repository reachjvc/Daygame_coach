import { describe, it, expect } from "vitest"
import { addGoal, countGoal, emptyNsPlan, setGoalReading, setGoalType, updateGoal } from "@/src/goals/northStarService"
import { climbFraction, latestReading, readingsOf, takesReadings } from "@/src/goals/goalReadings"
import { goalAchievements } from "@/src/goals/planAchievementsService"
import { goalsReadBack } from "@/src/goals/reviewReadBack"
import { periodOf } from "@/src/goals/reviewService"
import type { NsPlan } from "@/src/goals/types"

/**
 * READINGS ON A NUMBER GOAL (Plans/life-plan-readings.md): written on a day,
 * read back as a history, the latest is where it stands, and the climb earns
 * its quarters, halfway and the target, whichever way it runs.
 */

const NOW = "2026-11-05T09:00:00.000Z"
const TODAY = "2026-11-05"

function bodyWeight(): { plan: NsPlan; id: string } {
  let plan = addGoal(emptyNsPlan(), "lm_fitness", "Body weight", "milestone_ladder", NOW)
  const id = plan.goals[0].id
  plan = updateGoal(plan, id, { unit: "kg", ladder: { start: 95, target: 80, steps: 5, curveTension: 0 } }, NOW)
  return { plan, id }
}

describe("a number goal's readings", () => {
  it("are written on a day, cleared again, and read back oldest first with the latest as where it stands", () => {
    const seeded = bodyWeight()
    let plan = setGoalReading(seeded.plan, "2026-10-20", seeded.id, 92, NOW)
    plan = setGoalReading(plan, "2026-11-03", seeded.id, 90.5, NOW)
    expect(readingsOf(plan, seeded.id, TODAY)).toEqual([{ date: "2026-10-20", value: 92 }, { date: "2026-11-03", value: 90.5 }])
    expect(latestReading(plan, seeded.id, "2026-10-31")).toEqual({ date: "2026-10-20", value: 92 })
    plan = setGoalReading(plan, "2026-11-03", seeded.id, null, NOW)
    expect(latestReading(plan, seeded.id, TODAY)?.value).toBe(92)
    expect(plan.numbers["2026-11-03"]).toBeUndefined()
  })

  it("are taken only by a number goal, and not one wired to the area's daily ratings", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Gym", "habit_ramp", NOW)
    expect(setGoalReading(plan, TODAY, plan.goals[0].id, 3, NOW)).toBe(plan)
    plan = addGoal(plan, "lm_health", "Energy", "milestone_ladder", NOW)
    const energy = plan.goals[1]
    plan = updateGoal(plan, energy.id, { metric: "daily_area" }, NOW)
    expect(takesReadings(plan.goals[1])).toBe(false)
    expect(setGoalReading(plan, TODAY, energy.id, 7, NOW)).toBe(plan)
  })

  it("measure the climb both ways: down for a weight to lose, up for a lift", () => {
    const { plan, id } = bodyWeight()
    const goal = plan.goals.find((g) => g.id === id)!
    expect(climbFraction(goal, 87.5)).toBe(0.5)
    expect(climbFraction(goal, 96)).toBe(0)
    const lift = { ...goal, ladder: { start: 60, target: 100, steps: 5, curveTension: 0 } }
    expect(climbFraction(lift, 70)).toBe(0.25)
  })
})

describe("a number goal's achievements", () => {
  it("earns the first reading, each quarter and the target on the day a reading got there", () => {
    const seeded = bodyWeight()
    let plan = setGoalReading(seeded.plan, "2026-10-01", seeded.id, 95, NOW)
    plan = setGoalReading(plan, "2026-10-15", seeded.id, 91, NOW)
    plan = setGoalReading(plan, "2026-11-01", seeded.id, 87, NOW)
    const { earned, next } = goalAchievements(plan, seeded.id, TODAY)
    expect(earned.map((a) => [a.label, a.earnedOn])).toEqual([
      ["Halfway to 80 kg", "2026-11-01"],
      ["A quarter of the way to 80 kg", "2026-10-15"],
      ["First reading", "2026-10-01"],
    ])
    expect(next).toEqual({ partId: seeded.id, label: "Three quarters of the way to 80 kg", toGo: "at 83.75 kg" })
  })

  it("asks for the first reading before there is one", () => {
    const { plan, id } = bodyWeight()
    expect(goalAchievements(plan, id, TODAY)).toEqual({ earned: [], next: expect.objectContaining({ label: "The first reading" }) })
  })
})

describe("the review's numbers", () => {
  it("lists each number goal with its latest reading up to the period's end, apart from the other goals", () => {
    const seeded = bodyWeight()
    let plan = setGoalReading(seeded.plan, "2026-10-28", seeded.id, 91, NOW)
    plan = setGoalReading(plan, "2026-11-04", seeded.id, 90, NOW)
    plan = addGoal(plan, "lm_fun", "Northern lights", "achievement", NOW)
    const thisWeek = goalsReadBack(plan, periodOf("week", TODAY), TODAY)
    expect(thisWeek.numbers).toEqual([{ goal: expect.objectContaining({ id: seeded.id }), latest: { date: "2026-11-04", value: 90 } }])
    expect(thisWeek.rest.map((g) => g.title)).toEqual(["Northern lights"])
    expect(goalsReadBack(plan, periodOf("week", "2026-10-28"), TODAY).numbers[0].latest).toEqual({ date: "2026-10-28", value: 91 })
  })
})

describe("a change of kind", () => {
  it("takes the goal's day numbers with the old kind: readings are not counts", () => {
    const seeded = bodyWeight()
    let plan = setGoalReading(seeded.plan, "2026-11-02", seeded.id, 92, NOW)
    plan = setGoalReading(plan, "2026-11-03", seeded.id, 91, NOW)
    const practice = setGoalType(plan, seeded.id, "habit_ramp", NOW)
    expect(Object.values(practice.numbers).some((row) => seeded.id in row)).toBe(false)
    // And the other way: counts do not become readings.
    const counted = countGoal(practice, "2026-11-04", seeded.id, 1, NOW)
    expect(latestReading(setGoalType(counted, seeded.id, "milestone_ladder", NOW), seeded.id, TODAY)).toBeNull()
    // Picking the kind it already is keeps everything.
    expect(setGoalType(plan, seeded.id, "milestone_ladder", NOW).numbers).toEqual(plan.numbers)
  })
})

describe("a climb with nowhere to go", () => {
  it("earns its first reading and asks for nothing next when start and target are the same", () => {
    const seeded = bodyWeight()
    let plan = updateGoal(seeded.plan, seeded.id, { ladder: { start: 80, target: 80, steps: 5, curveTension: 0 } }, NOW)
    plan = setGoalReading(plan, TODAY, seeded.id, 80, NOW)
    expect(goalAchievements(plan, seeded.id, TODAY)).toEqual({ earned: [expect.objectContaining({ label: "First reading" })], next: null })
  })

  it("rounds where the next mark sits", () => {
    const seeded = bodyWeight()
    let plan = updateGoal(seeded.plan, seeded.id, { ladder: { start: 90.5, target: 80.2, steps: 5, curveTension: 0 } }, NOW)
    plan = setGoalReading(plan, TODAY, seeded.id, 90.5, NOW)
    expect(goalAchievements(plan, seeded.id, TODAY).next?.toGo).toBe("at 87.93 kg")
  })
})
