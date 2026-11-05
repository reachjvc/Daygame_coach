import { describe, it, expect } from "vitest"
import {
  addCheckpoint,
  addCustomStep,
  addExperiences,
  addGoal,
  emptyNsPlan,
  linkGoal,
  toggleExperienceDone,
  updateCheckpoint,
  updateGoal,
} from "@/src/goals/northStarService"
import { toggleStepLogged } from "@/src/goals/northStarTrackService"
import { periodOf, writeReview } from "@/src/goals/reviewService"
import {
  allAchievements,
  earnedBetween,
  fedAchievements,
  goalAchievements,
  reviewAchievements,
  stepAchievements,
} from "@/src/goals/planAchievementsService"
import type { NsPlan } from "@/src/goals/types"

const NOW = "2026-11-05T09:00:00.000Z"
// A Thursday.
const TODAY = "2026-11-05"

/** A day's count on a goal, as Today's "Log one" leaves it. */
function count(plan: NsPlan, date: string, goalId: string, n: number): NsPlan {
  return { ...plan, numbers: { ...plan.numbers, [date]: { ...(plan.numbers[date] ?? {}), [goalId]: n } } }
}

function approaches(): { plan: NsPlan; id: string } {
  let plan = addGoal(emptyNsPlan(), "lm_relationship", "Approaches", "habit_ramp", NOW)
  const id = plan.goals[0].id
  plan = updateGoal(plan, id, { perWeek: 21, unit: "approaches", daysPerWeek: 7 }, NOW)
  return { plan, id }
}

function gym(): { plan: NsPlan; id: string } {
  let plan = addGoal(emptyNsPlan(), "lm_fitness", "Gym", "habit_ramp", NOW)
  const id = plan.goals[0].id
  plan = updateGoal(plan, id, { perWeek: null, daysPerWeek: 4, unit: "" }, NOW)
  return { plan, id }
}

describe("a counted goal", () => {
  it("has nothing yet, and the first one next, before it is counted", () => {
    const { plan, id } = approaches()
    expect(goalAchievements(plan, id, TODAY)).toEqual({ earned: [], next: expect.objectContaining({ label: "The first one" }) })
  })

  it("earns its first one, its totals on the day each is reached, and says how far the next is", () => {
    const seeded = approaches()
    let plan = seeded.plan
    const id = seeded.id
    plan = count(plan, "2026-11-02", id, 4)
    plan = count(plan, "2026-11-03", id, 7)
    plan = count(plan, "2026-11-04", id, 3)
    const { earned, next } = goalAchievements(plan, id, TODAY)
    expect(earned.map((a) => [a.label, a.earnedOn])).toEqual(
      expect.arrayContaining([
        ["First approaches logged", "2026-11-02"],
        ["10 approaches in all", "2026-11-03"],
      ]),
    )
    expect(earned.some((a) => a.label === "25 approaches in all")).toBe(false)
    expect(next).toEqual({ partId: id, label: "25 approaches in all", toGo: "11 to go" })
  })

  it("gives a best day to a goal that counts things, and not to one that counts sessions", () => {
    const a = approaches()
    a.plan = count(a.plan, "2026-11-03", a.id, 10)
    expect(goalAchievements(a.plan, a.id, TODAY).earned.map((x) => x.label)).toEqual(
      expect.arrayContaining(["3 in one day", "5 in one day", "10 in one day"]),
    )
    const g = gym()
    for (const d of ["2026-11-02", "2026-11-03", "2026-11-04"]) g.plan = count(g.plan, d, g.id, 1)
    expect(goalAchievements(g.plan, g.id, TODAY).earned.some((x) => x.kind === "best_day")).toBe(false)
  })

  it("counts weeks on target in a row, by the goal's own weekly number, and a missed week starts it again", () => {
    const seeded = gym()
    let plan = seeded.plan
    const id = seeded.id
    // Four sessions in each of four weeks from 5 Oct, then nothing in the week of 2 Nov so far.
    for (const monday of ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]) {
      for (const offset of [0, 1, 2, 3]) {
        const d = new Date(`${monday}T12:00:00Z`)
        d.setUTCDate(d.getUTCDate() + offset)
        plan = count(plan, d.toISOString().slice(0, 10), id, 1)
      }
    }
    const four = goalAchievements(plan, id, TODAY).earned.find((a) => a.kind === "weeks")
    expect(four).toMatchObject({ label: "4 weeks on target in a row", earnedOn: "2026-10-29" })
    // Sixteen in all: the next total is 25.
    expect(goalAchievements(plan, id, TODAY).next).toEqual({ partId: id, label: "25 in all", toGo: "9 to go" })

    // A week with three of four breaks the run.
    const broken = count(plan, "2026-10-15", id, 0)
    expect(goalAchievements(broken, id, TODAY).earned.some((a) => a.kind === "weeks")).toBe(false)
  })

  it("follows a ramp: an easy first week on target counts as met", () => {
    const seeded = gym()
    let plan = seeded.plan
    const id = seeded.id
    plan = updateGoal(plan, id, { rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 4 }] }, NOW)
    for (const d of ["2026-10-05", "2026-10-07", "2026-10-12", "2026-10-14", "2026-10-19", "2026-10-21", "2026-10-26", "2026-10-28"]) {
      plan = count(plan, d, id, 1)
    }
    expect(goalAchievements(plan, id, TODAY).earned.find((a) => a.kind === "weeks")).toMatchObject({ earnedOn: "2026-10-28" })
  })

  it("has no streak on a goal about stopping something, and keeps its totals", () => {
    const seeded = gym()
    let plan = seeded.plan
    const id = seeded.id
    plan = updateGoal(plan, id, { isAbstinence: true }, NOW)
    for (let i = 0; i < 28; i += 1) {
      const d = new Date("2026-10-05T12:00:00Z")
      d.setUTCDate(d.getUTCDate() + i)
      plan = count(plan, d.toISOString().slice(0, 10), id, 1)
    }
    const earned = goalAchievements(plan, id, TODAY).earned
    expect(earned.some((a) => a.kind === "weeks")).toBe(false)
    expect(earned.some((a) => a.label === "25 in all")).toBe(true)
  })

  it("does not count a day after today", () => {
    const seeded = approaches()
    let plan = seeded.plan
    const id = seeded.id
    plan = count(plan, "2026-11-09", id, 30)
    expect(goalAchievements(plan, id, TODAY).earned).toEqual([])
  })
})

describe("a routine step", () => {
  function morning(): { plan: NsPlan; stepId: string } {
    const base = emptyNsPlan()
    const plan = addCustomStep(base, base.routines[0].id, "Cold shower", 5, 7, NOW)
    return { plan, stepId: plan.routines[0].steps.at(-1)!.id }
  }

  it("counts the days it was ticked, and finished workouts too", () => {
    const seeded = morning()
    let plan = seeded.plan
    const stepId = seeded.stepId
    for (let i = 0; i < 9; i += 1) {
      const d = new Date("2026-10-20T12:00:00Z")
      d.setUTCDate(d.getUTCDate() + i)
      plan = toggleStepLogged(plan, d.toISOString().slice(0, 10), stepId)
    }
    expect(stepAchievements(plan, stepId, TODAY).earned.map((a) => a.label)).toEqual(["Done for the first time"])
    const withWorkout = stepAchievements(plan, stepId, TODAY, { "2026-11-01": [stepId] })
    expect(withWorkout.earned.find((a) => a.label === "Done 10 times")).toMatchObject({ earnedOn: "2026-11-01" })
  })
})

describe("milestones, experiences and reviews", () => {
  it("names a milestone reached and an experience done, on the day it was done", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Muscle up", "achievement", NOW)
    const goalId = plan.goals[0].id
    plan = addCheckpoint(plan, goalId, "Ten pull-ups", NOW)
    plan = updateCheckpoint(plan, goalId, plan.goals[0].checkpoints[0].id, { done: true }, NOW)
    plan = addExperiences(plan, "Learn to surf", null, NOW)
    plan = toggleExperienceDone(plan, plan.experiences[0].id, "2026-10-30", NOW)
    expect(allAchievements(plan, TODAY).map((a) => [a.label, a.earnedOn])).toEqual([
      ["Did it: Learn to surf", "2026-10-30"],
      ["Reached: Ten pull-ups", null],
    ])
  })

  it("counts weekly reviews written week after week", () => {
    let plan = emptyNsPlan()
    for (const day of ["2026-10-11", "2026-10-18", "2026-10-25", "2026-11-01"]) {
      plan = writeReview(plan, periodOf("week", day), { magicMoments: "A good week." }, day, NOW)
    }
    expect(reviewAchievements(plan, TODAY).earned).toEqual([
      expect.objectContaining({ label: "4 weekly reviews in a row", earnedOn: "2026-11-01" }),
    ])
  })

  it("keeps the run going on the Monday before last week's review is written", () => {
    let plan = emptyNsPlan()
    for (const day of ["2026-10-11", "2026-10-18", "2026-10-25"]) {
      plan = writeReview(plan, periodOf("week", day), { magicMoments: "A good week." }, day, NOW)
    }
    // Monday 2 Nov: the week of 26 Oct has no review yet, and the run is still three.
    expect(reviewAchievements(plan, "2026-11-02").next).toEqual({ partId: "reviews", label: "4 weekly reviews in a row", toGo: "1 more week" })
    // A week later it has broken.
    expect(reviewAchievements(plan, "2026-11-09").next).toBeNull()
  })
})

describe("what a review celebrates, and what feeds a bigger goal", () => {
  it("lists what was earned inside a period", () => {
    const seeded = approaches()
    let plan = seeded.plan
    const id = seeded.id
    plan = count(plan, "2026-10-28", id, 6)
    plan = count(plan, "2026-11-03", id, 5)
    const thisWeek = earnedBetween(plan, "2026-11-02", "2026-11-08", TODAY).map((a) => a.label)
    // Five on 3 Nov is no new best: six on 28 Oct already earned it.
    expect(thisWeek).toEqual(["10 approaches in all"])
    expect(earnedBetween(plan, "2026-10-26", "2026-11-01", TODAY).map((a) => a.label).sort()).toEqual(["3 in one day", "5 in one day", "First approaches logged"])
  })

  it("shows on a bigger goal what the goals feeding it have earned (the girlfriend, and approaching)", () => {
    const seeded = approaches()
    let plan = seeded.plan
    const id = seeded.id
    plan = addGoal(plan, "lm_relationship", "A girlfriend", "achievement", NOW)
    const big = plan.goals[1].id
    plan = linkGoal(plan, id, big, NOW)
    plan = count(plan, "2026-11-03", id, 12)
    expect(fedAchievements(plan, big, TODAY).map((a) => `${a.partTitle}: ${a.label}`)).toEqual(
      expect.arrayContaining(["Approaches: 10 approaches in all", "Approaches: 10 in one day"]),
    )
    expect(fedAchievements(plan, id, TODAY)).toEqual([])
  })
})
