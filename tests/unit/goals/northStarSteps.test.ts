/**
 * The circle on each step, and whether it is telling the truth.
 *
 * It used to be a green tick, and it appeared the moment a step had one
 * sentence in it. Somebody who wrote a north star and pressed next collected a
 * finished step for a tenth of the work — which makes the rail a scoreboard
 * that congratulates you for arriving, and the whole flow is judged on that
 * rail.
 *
 * Three states now: `empty` (nothing here), `started` (something here), `done`
 * (every box this step asks for is filled). These tests are about the property
 * rather than the wording: whatever the rules per step, the circles have to
 * make sense together — nothing is done before it is started, nothing goes
 * backwards as you write more, and every step is reachable to done.
 */

import { describe, expect, it } from "vitest"
import { SCORED_TABS, TAB_ORDER } from "@/src/goals/data/northStar"
import { COMMIT_DATE_KEY, COMMIT_KEY, ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import { VISION_RUNGS } from "@/src/goals/data/lifeMasteryWhy"
import type { NorthStarTabId, NsPlan } from "@/src/goals/types"
import {
  addCustomStep,
  addGoal,
  addOneThingRequirement,
  emptyNsPlan,
  linkStepToGoal,
  milestoneGoals,
  nsProgress,
  setAnswer,
  setAreaReview,
  setNorthStar,
  setRung,
  setSeasonFocus,
  setValues,
  stepState,
  stepStates,
  toggleSeasonArea,
  updateGoal,
} from "@/src/goals/northStarService"

const NOW = "2026-08-17T09:00:00.000Z"
const TODAY = "2026-08-17"

/** A plan with every box on every step filled in. */
function completePlan(): NsPlan {
  let plan = setNorthStar(emptyNsPlan(), "I wake up near the water and my work pays for itself.", NOW)
  for (const rung of VISION_RUNGS) plan = setRung(plan, rung.id, "written", NOW)
  for (const area of plan.areas) plan = setAreaReview(plan, area.id, { ten: "A ten looks like this", fortnight: 6 }, NOW)

  plan = setAnswer(plan, ONE_ANSWERS.oneThing, "Get my training consistent", NOW)
  for (const key of [ONE_ANSWERS.why, ONE_ANSWERS.cost, ONE_ANSWERS.identity, ONE_ANSWERS.values]) {
    plan = setAnswer(plan, key, "written", NOW)
  }
  plan = addOneThingRequirement(plan, "Train four times a week", "lm_fitness", NOW)

  plan = addGoal(plan, "lm_fitness", "Flat bench 100 kg", "milestone_ladder", NOW)
  const milestone = milestoneGoals(plan)[0]
  plan = updateGoal(plan, milestone.id, { why: "Because I want to be strong at fifty", targetDate: "2027-08-17" }, NOW)

  plan = addCustomStep(plan, "r1", "Strength session", 45, 4, NOW)
  const step = plan.routines.find((r) => r.id === "r1")!.steps[0]
  plan = linkStepToGoal(plan, "r1", step.id, milestone.id, true, NOW)

  plan = toggleSeasonArea(plan, "lm_fitness", NOW)
  plan = setSeasonFocus(plan, "lm_fitness", NOW)
  plan = setValues(plan, ["Freedom", "Health", "Mastery"], NOW)
  plan = setAnswer(plan, COMMIT_KEY, "I am doing this", NOW)
  plan = setAnswer(plan, COMMIT_DATE_KEY, TODAY, NOW)
  return plan
}

describe("the circles on the rail", () => {
  it("shows nothing done on a plan nobody has touched", () => {
    const states = stepStates(emptyNsPlan())
    expect(Object.values(states).every((s) => s === "empty")).toBe(true)
  })

  it("fills every one of them when every box is filled", () => {
    const states = stepStates(completePlan())
    // SCORED_TABS, not TAB_ORDER: the fork after the one thing draws no ring,
    // because it holds nothing — its doors write into the steps they open.
    const unfinished = SCORED_TABS.filter((tab) => states[tab] !== "done")
    // Naming which step is not reachable is the point of the failure message:
    // a step that can never fill its circle is a step somebody will keep
    // returning to looking for the thing they missed.
    expect(unfinished).toEqual([])
  })

  it("never reports done for a step with nothing in it", () => {
    const empty = emptyNsPlan()
    for (const tab of TAB_ORDER) expect(stepState(empty, tab), tab).toBe("empty")
  })

  it("passes through started on the way to done, on every step", () => {
    // No step may jump from empty to done: if it can, its "done" rule is
    // testing one box, and one box is what the green tick used to mean.
    const complete = completePlan()
    for (const tab of SCORED_TABS) {
      expect(stepState(complete, tab), tab).toBe("done")
    }
    const partial = setAnswer(setNorthStar(emptyNsPlan(), "Something", NOW), ONE_ANSWERS.oneThing, "Something else", NOW)
    expect(stepState(partial, "star")).toBe("started")
    expect(stepState(partial, "one")).toBe("started")
  })

  it("does not go backwards as somebody writes more", () => {
    // Monotonic: adding work to a plan can move a step forward or leave it,
    // never back. A ring that empties as you type is a ring nobody trusts.
    const rank = { empty: 0, started: 1, done: 2 }
    let plan = emptyNsPlan()
    const steps: Array<(p: NsPlan) => NsPlan> = [
      (p) => setNorthStar(p, "I wake up near the water", NOW),
      (p) => VISION_RUNGS.reduce((acc, r) => setRung(acc, r.id, "written", NOW), p),
      (p) => p.areas.reduce((acc, a) => setAreaReview(acc, a.id, { ten: "ten", fortnight: 5 }, NOW), p),
      (p) => setAnswer(p, ONE_ANSWERS.oneThing, "Quit weed", NOW),
      (p) => [ONE_ANSWERS.why, ONE_ANSWERS.cost, ONE_ANSWERS.identity, ONE_ANSWERS.values].reduce((acc, k) => setAnswer(acc, k, "x", NOW), p),
      (p) => addOneThingRequirement(p, "Delete the number", "lm_health", NOW),
      (p) => addGoal(p, "lm_health", "Sleep 8 hours", "achievement", NOW),
      (p) => updateGoal(p, p.goals[p.goals.length - 1].id, { why: "because", targetDate: "2027-01-01" }, NOW),
      (p) => addCustomStep(p, "r1", "Lights out at eleven", 1, 7, NOW),
      (p) => toggleSeasonArea(p, "lm_health", NOW),
      (p) => setSeasonFocus(p, "lm_health", NOW),
      (p) => setValues(p, ["Health", "Freedom", "Mastery"], NOW),
      (p) => setAnswer(p, COMMIT_KEY, "yes", NOW),
      (p) => setAnswer(p, COMMIT_DATE_KEY, TODAY, NOW),
    ]
    let before = stepStates(plan)
    for (const [i, apply] of steps.entries()) {
      plan = apply(plan)
      const after = stepStates(plan)
      for (const tab of TAB_ORDER) {
        expect(rank[after[tab]], `${tab} went backwards at write ${i + 1}`).toBeGreaterThanOrEqual(rank[before[tab]])
      }
      before = after
    }
  })

  it("keeps the rail and the progress map saying the same thing", () => {
    // Two definitions of "done" is how a page ends up with a tick in the rail
    // and a "still to fill in" list underneath naming the same step.
    for (const plan of [emptyNsPlan(), completePlan()]) {
      const states = stepStates(plan)
      const done = nsProgress(plan).done
      for (const tab of TAB_ORDER) expect(done[tab], tab).toBe(states[tab] === "done")
    }
  })
})

describe("what each step counts as full", () => {
  it("wants every area rated AND pictured, not one of them", () => {
    let plan = setAreaReview(emptyNsPlan(), "lm_health", { ten: "ten", fortnight: 7 }, NOW)
    expect(stepState(plan, "now")).toBe("started")
    for (const area of plan.areas) plan = setAreaReview(plan, area.id, { ten: "ten", fortnight: 7 }, NOW)
    expect(stepState(plan, "now")).toBe("done")
  })

  it("wants every milestone to carry a why and a date", () => {
    // A goal arrives with a default date on it, so clear it to test the rule.
    let plan = addGoal(emptyNsPlan(), "lm_health", "Sleep 8 hours", "achievement", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { targetDate: null }, NOW)
    expect(stepState(plan, "milestones")).toBe("started")
    plan = updateGoal(plan, plan.goals[0].id, { why: "because" }, NOW)
    // A why and no date is a thing you will do later.
    expect(stepState(plan, "milestones")).toBe("started")
    plan = updateGoal(plan, plan.goals[0].id, { targetDate: "2027-01-01" }, NOW)
    // A why and a date is what THIS step asks for. Whether anything is running
    // at it is the next step's question, asked where it can be answered — the
    // two halves are two steps again, so they are two rings.
    expect(stepState(plan, "milestones")).toBe("done")
    expect(stepState(plan, "systems")).toBe("empty")
  })

  it("wants systems joined to milestones, not merely written", () => {
    // The join is scored on the systems step: a milestone nothing is pointed
    // at is a wish, and pointing things at things is what this step is.
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Flat bench 100 kg", "milestone_ladder", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { why: "because", targetDate: "2027-08-17" }, NOW)
    const milestone = plan.goals[0]
    plan = addCustomStep(plan, "r1", "Strength session", 45, 4, NOW)
    // Something running, joined to nothing: started, not done.
    expect(stepState(plan, "systems")).toBe("started")
    const step = plan.routines.find((r) => r.id === "r1")!.steps[0]
    plan = linkStepToGoal(plan, "r1", step.id, milestone.id, true, NOW)
    expect(stepState(plan, "systems")).toBe("done")
    // And the wanting was already finished before any of that happened.
    expect(stepState(plan, "milestones")).toBe("done")
  })

  it("wants the commitment signed and dated", () => {
    let plan = setAnswer(emptyNsPlan(), COMMIT_KEY, "I am doing this", NOW)
    expect(stepState(plan, "commit")).toBe("started")
    plan = setAnswer(plan, COMMIT_DATE_KEY, TODAY, NOW)
    expect(stepState(plan, "commit")).toBe("done")
  })

  it("covers every step in the flow, so none of them can go unjudged", () => {
    const judged: NorthStarTabId[] = [...SCORED_TABS]
    for (const tab of judged) {
      // A tab with no rule of its own would fall through to the commit branch
      // and report on somebody else's work.
      expect(stepState(completePlan(), tab), tab).toBe("done")
      expect(stepState(emptyNsPlan(), tab), tab).toBe("empty")
    }
  })
})
