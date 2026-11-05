import { describe, it, expect } from "vitest"
import { addCheckpoint, addGoal, dateSteps, emptyNsPlan, goalMilestones, normalizeNsPlan, serializeNsPlan, setCheckpointDone, setGoalStatus, updateCheckpoint, updateGoal } from "@/src/goals/northStarService"
import { stepsDue } from "@/src/goals/northStarTrackService"
import { stepsReadBack } from "@/src/goals/reviewReadBack"
import { periodOf } from "@/src/goals/reviewService"
import { earnedBetween } from "@/src/goals/planAchievementsService"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import type { NsPlan } from "@/src/goals/types"

/**
 * STEPS WITH DAYS (Plans/life-plan-dated-steps.md): the owner's item 27, a
 * to-do of twenty things done in twenty days. Days are given once and kept, a
 * tick keeps its day, due and late steps reach Today, and the review counts
 * them.
 */

const NOW = "2026-11-05T09:00:00.000Z"
const TODAY = "2026-11-05"

function launch(): { plan: NsPlan; id: string } {
  let plan = addGoal(emptyNsPlan(), "lm_mission", "Launch the app", "achievement", NOW)
  const id = plan.goals[0].id
  plan = updateGoal(plan, id, { targetDate: "2026-11-25" }, NOW)
  for (const t of ["Landing page", "Pricing", "Onboarding", "Ship"]) plan = addCheckpoint(plan, id, t, NOW)
  return { plan, id }
}

describe("giving steps their days", () => {
  it("spreads the open steps evenly to the goal's date, once, the last on the date", () => {
    const seeded = launch()
    const plan = dateSteps(seeded.plan, seeded.id, TODAY, NOW)
    expect(plan.goals[0].checkpoints.map((c) => c.dueOn)).toEqual(["2026-11-10", "2026-11-15", "2026-11-20", "2026-11-25"])
    // Kept: they do not move as the days pass, so a step can be behind.
    expect(stepsDue(plan, "2026-11-12").map((d) => [d.checkpoint.title, d.late])).toEqual([["Landing page", 2]])
    // And every view agrees with them.
    expect(goalMilestones(plan.goals[0], "2026-11-12").filter((m) => m.kind === "checkpoint").map((m) => m.date)).toEqual(["2026-11-10", "2026-11-15", "2026-11-20", "2026-11-25"])
    // Pressed again the same day: nothing to move. After the goal's date moves: spread afresh.
    expect(dateSteps(plan, seeded.id, TODAY, NOW)).toBe(plan)
    const sooner = dateSteps(updateGoal(plan, seeded.id, { targetDate: "2026-11-13" }, NOW), seeded.id, TODAY, NOW)
    expect(sooner.goals[0].checkpoints.map((c) => c.dueOn)).toEqual(["2026-11-07", "2026-11-09", "2026-11-11", "2026-11-13"])
  })

  it("dates only what has no day and is not done, and does nothing without a date ahead", () => {
    const seeded = launch()
    let plan = setCheckpointDone(seeded.plan, seeded.id, seeded.plan.goals[0].checkpoints[0].id, true, TODAY, NOW)
    plan = dateSteps(plan, seeded.id, TODAY, NOW)
    expect(plan.goals[0].checkpoints.map((c) => c.dueOn ?? null)).toEqual([null, "2026-11-12", "2026-11-18", "2026-11-25"])
    const noDate = updateGoal(seeded.plan, seeded.id, { targetDate: null }, NOW)
    expect(dateSteps(noDate, seeded.id, TODAY, NOW)).toBe(noDate)
    expect(dateSteps(seeded.plan, seeded.id, "2026-11-26", NOW)).toBe(seeded.plan)
  })
})

describe("a tick", () => {
  it("keeps the day it was done, and taking it back takes the day", () => {
    const seeded = launch()
    const cp = seeded.plan.goals[0].checkpoints[1].id
    const done = setCheckpointDone(seeded.plan, seeded.id, cp, true, TODAY, NOW)
    expect(done.goals[0].checkpoints[1]).toMatchObject({ done: true, doneOn: TODAY })
    const undone = setCheckpointDone(done, seeded.id, cp, false, TODAY, NOW)
    expect(undone.goals[0].checkpoints[1].done).toBe(false)
    expect(undone.goals[0].checkpoints[1].doneOn).toBeUndefined()
    // The same tick twice is nothing to save; and an untick by the plain edit takes the day too.
    expect(setCheckpointDone(done, seeded.id, cp, true, TODAY, NOW)).toBe(done)
    expect(updateCheckpoint(done, seeded.id, cp, { done: false }, NOW).goals[0].checkpoints[1].doneOn).toBeUndefined()
  })

  it("is celebrated in the review of the stretch it was done in", () => {
    const seeded = launch()
    const done = setCheckpointDone(seeded.plan, seeded.id, seeded.plan.goals[0].checkpoints[0].id, true, TODAY, NOW)
    expect(earnedBetween(done, "2026-11-02", "2026-11-08", TODAY)).toContainEqual(expect.objectContaining({ label: "Reached: Landing page", earnedOn: TODAY }))
  })
})

describe("steps due", () => {
  it("lists the open steps whose day has come, most behind first, for goals being worked on", () => {
    const seeded = launch()
    let plan = dateSteps(seeded.plan, seeded.id, "2026-11-01", NOW)
    // From 1 Nov: due 7, 13, 19 and 25 Nov.
    const due = stepsDue(plan, "2026-11-14")
    expect(due.map((d) => [d.checkpoint.title, d.late])).toEqual([["Landing page", 7], ["Pricing", 1]])
    plan = setCheckpointDone(plan, seeded.id, plan.goals[0].checkpoints[0].id, true, "2026-11-14", NOW)
    expect(stepsDue(plan, "2026-11-14").map((d) => d.checkpoint.title)).toEqual(["Pricing"])
    expect(stepsDue(setGoalStatus(plan, seeded.id, "paused", "2026-11-14", NOW), "2026-11-14")).toEqual([])
    // A goal the ranking does not list is still read.
    expect(stepsDue({ ...plan, priorityIds: [] }, "2026-11-14").map((d) => d.checkpoint.title)).toEqual(["Pricing"])
  })
})

describe("the review's count", () => {
  it("says how many are done, how many in the stretch, and how many are behind", () => {
    const seeded = launch()
    let plan = dateSteps(seeded.plan, seeded.id, "2026-11-01", NOW)
    plan = setCheckpointDone(plan, seeded.id, plan.goals[0].checkpoints[0].id, true, "2026-11-09", NOW)
    expect(stepsReadBack(plan.goals[0], periodOf("week", "2026-11-10"), "2026-11-14")).toEqual({ done: 1, total: 4, inPeriod: 1, behind: 1 })
    // A step due today is not behind yet.
    expect(stepsReadBack(plan.goals[0], periodOf("week", "2026-11-13"), "2026-11-13")?.behind).toBe(0)
    // A past week reads the steps as they stood at its end: the step ticked after it was behind then.
    expect(stepsReadBack(plan.goals[0], periodOf("week", "2026-11-03"), "2026-11-14")).toEqual({ done: 0, total: 4, inPeriod: 0, behind: 1 })
    expect(stepsReadBack(addGoal(emptyNsPlan(), "lm_fun", "Surf", "achievement", NOW).goals[0], periodOf("week", TODAY), TODAY)).toBeNull()
  })
})

describe("the days are saved", () => {
  it("through the rows and the browser copy, and a tick before days were kept has none", () => {
    const seeded = launch()
    let plan = dateSteps(seeded.plan, seeded.id, TODAY, NOW)
    plan = setCheckpointDone(plan, seeded.id, plan.goals[0].checkpoints[0].id, true, TODAY, NOW)
    const minted = new Map<string, string>()
    let n = 0
    const rows = planToRows(plan, {
      planId: "11111111-1111-1111-1111-111111111111",
      userId: "22222222-2222-2222-2222-222222222222",
      idFor: (l) => minted.get(l) ?? minted.set(l, `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`).get(l)!,
    })
    expect(rows.checkpoints[0]).toMatchObject({ due_on: "2026-11-10", done_on: TODAY })
    expect(rowsToPlan(rows)!.goals[0].checkpoints).toEqual(plan.goals[0].checkpoints)
    expect(normalizeNsPlan(JSON.parse(serializeNsPlan(plan)))!.goals[0].checkpoints).toEqual(plan.goals[0].checkpoints)
  })
})
