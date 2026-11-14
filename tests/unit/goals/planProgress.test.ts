/**
 * The plan's percentage, and whether it agrees with the rings.
 *
 * Plans/plan-progress-percent.md, Phase 1. `stepState` is the one definition
 * of done; the number has to follow it: a step is at 100 % exactly when its
 * ring says done, and at 0 % whenever its ring says empty. The generated-plan
 * test below is what keeps the two from ever contradicting each other.
 */

import { describe, expect, it } from "vitest"
import { rateArea } from "@/src/goals/reviewService"
import { SCORED_TABS } from "@/src/goals/data/northStar"
import { COMMIT_DATE_KEY, COMMIT_KEY, ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import { VISION_RUNGS } from "@/src/goals/data/lifeMasteryWhy"
import type { NsAccount, NsPlan } from "@/src/goals/types"
import {
  addCustomStep,
  addGoal,
  addOneThingRequirement,
  emptyNsPlan,
  linkStepToGoal,
  milestoneGoals,
  percentDown,
  planProgress,
  setAnswer,
  setAreaReview,
  setNorthStar,
  setRung,
  setSeasonFocus,
  setValues,
  stepProgress,
  stepState,
  toggleSeasonArea,
  todayISO,
  updateGoal,
} from "@/src/goals/northStarService"

const NOW = "2026-08-17T09:00:00.000Z"
// Rated areas are read as of the real today (stepState does the same), so the
// scores are written for the real today too.
const TODAY = todayISO()
const SAVED: NsAccount = { hasOneThing: true }
const NONE: NsAccount = { hasOneThing: false }
const ONE_KEYS = [ONE_ANSWERS.why, ONE_ANSWERS.cost, ONE_ANSWERS.identity, ONE_ANSWERS.values]

function rateAll(plan: NsPlan, rate: boolean, ten: boolean): NsPlan {
  for (const area of plan.areas) {
    if (ten) plan = setAreaReview(plan, area.id, { ten: "A ten" }, NOW)
    if (rate) plan = rateArea(plan, area.id, 6, TODAY, NOW)
  }
  return plan
}

function withMilestone(plan: NsPlan, why: boolean, date: boolean): NsPlan {
  plan = addGoal(plan, "lm_fitness", `Milestone ${plan.goals.length + 1}`, "milestone_ladder", NOW)
  const m = milestoneGoals(plan).at(-1)!
  return updateGoal(plan, m.id, { why: why ? "because" : "", targetDate: date ? "2027-08-17" : null }, NOW)
}

function completePlan(): NsPlan {
  let plan = setNorthStar(emptyNsPlan(), "A paragraph.", NOW)
  for (const rung of VISION_RUNGS) plan = setRung(plan, rung.id, "written", NOW)
  plan = rateAll(plan, true, true)
  for (const key of ONE_KEYS) plan = setAnswer(plan, key, "written", NOW)
  plan = addOneThingRequirement(plan, "Train four times a week", "lm_fitness", "habit_ramp", NOW)
  plan = withMilestone(plan, true, true)
  plan = addCustomStep(plan, "r1", "Strength session", 45, 4, NOW)
  const step = plan.routines.find((r) => r.id === "r1")!.steps.at(-1)!
  plan = linkStepToGoal(plan, "r1", step.id, milestoneGoals(plan)[0].id, true, NOW)
  plan = toggleSeasonArea(plan, "lm_fitness", NOW)
  plan = setSeasonFocus(plan, "lm_fitness", NOW)
  plan = setValues(plan, ["Freedom", "Health", "Mastery"], NOW)
  plan = setAnswer(plan, COMMIT_KEY, "I am doing this", NOW)
  plan = setAnswer(plan, COMMIT_DATE_KEY, TODAY, NOW)
  return plan
}

describe("the plan's percentage", () => {
  it("is 0 for an empty plan and 100 for a full one", () => {
    const empty = planProgress(emptyNsPlan(), NONE)
    expect(empty.percent).toBe(0)
    for (const tab of SCORED_TABS) expect(empty.steps[tab].fraction, tab).toBe(0)
    // Every step has everything left: the first one in order wins the tie.
    expect(empty.mostLeft).toBe(SCORED_TABS[0])

    const full = planProgress(completePlan(), SAVED)
    expect(full.percent).toBe(100)
    for (const tab of SCORED_TABS) expect(full.steps[tab].fraction, tab).toBe(1)
    expect(full.mostLeft).toBeNull()
  })

  it("counts the north star paragraph as half the step, the seven questions as the other half", () => {
    const plan = setNorthStar(emptyNsPlan(), "A paragraph.", NOW)
    expect(stepProgress(plan, "star").fraction).toBe(0.5)
    const withThree = VISION_RUNGS.slice(0, 3).reduce((p, r) => setRung(p, r.id, "x", NOW), plan)
    expect(stepProgress(withThree, "star").fraction).toBeCloseTo(0.5 + 0.5 * 3 / VISION_RUNGS.length)
    const rungsOnly = VISION_RUNGS.reduce((p, r) => setRung(p, r.id, "x", NOW), emptyNsPlan())
    expect(stepProgress(rungsOnly, "star").fraction).toBe(0.5)
  })

  it("counts areas rated and areas pictured as a half each", () => {
    const rated = rateAll(emptyNsPlan(), true, false)
    expect(stepProgress(rated, "now").fraction).toBe(0.5)
    const both = rateAll(rated, false, true)
    expect(stepProgress(both, "now").fraction).toBe(1)
    let one = emptyNsPlan()
    one = rateArea(one, one.areas[0].id, 5, TODAY, NOW)
    expect(stepProgress(one, "now").fraction).toBeCloseTo(0.5 / one.areas.length)
  })

  it("scores milestones on their whys and dates, and asks for a first one when there are none", () => {
    expect(stepProgress(emptyNsPlan(), "milestones")).toEqual({ fraction: 0, parts: [{ label: "First milestone", have: 0, of: 1, weight: 1 }] })
    let plan = withMilestone(emptyNsPlan(), true, false)
    plan = withMilestone(plan, false, true)
    expect(stepProgress(plan, "milestones").fraction).toBe(0.5)
    plan = withMilestone(plan, true, true)
    // whys 2 of 3, dates 2 of 3
    expect(stepProgress(plan, "milestones").fraction).toBeCloseTo(2 / 3)
  })

  it("scores systems on milestones with something running, or on anything running when there are none", () => {
    expect(stepProgress(emptyNsPlan(), "systems").fraction).toBe(0)
    const running = addCustomStep(emptyNsPlan(), "r1", "Walk", 20, 3, NOW)
    expect(stepProgress(running, "systems").fraction).toBe(1)

    let plan = withMilestone(withMilestone(running, true, true), true, true)
    expect(stepProgress(plan, "systems").fraction).toBe(0)
    const step = plan.routines.find((r) => r.id === "r1")!.steps.at(-1)!
    plan = linkStepToGoal(plan, "r1", step.id, milestoneGoals(plan)[0].id, true, NOW)
    expect(stepProgress(plan, "systems").fraction).toBe(0.5)
    expect(stepProgress(plan, "systems").parts[0]).toMatchObject({ have: 1, of: 2 })
  })

  it("splits the season step into eight equal parts", () => {
    let plan = toggleSeasonArea(emptyNsPlan(), "lm_fitness", NOW)
    expect(stepProgress(plan, "focus", NONE).fraction).toBe(1 / 8)
    expect(stepProgress(plan, "focus", SAVED).fraction).toBe(2 / 8)
    for (const key of ONE_KEYS) plan = setAnswer(plan, key, "x", NOW)
    expect(stepProgress(plan, "focus", SAVED).fraction).toBe(6 / 8)
    plan = setSeasonFocus(plan, "lm_fitness", NOW)
    expect(stepProgress(plan, "focus", SAVED).fraction).toBe(7 / 8)
    expect(stepProgress(plan, "focus", SAVED).parts).toHaveLength(8)
  })

  it("follows the ring on a season that is empty to stepState but holds the four answers", () => {
    // stepState looks only for the sentence, a serving goal and the areas to
    // call the season started; the number never runs ahead of the ring.
    let plan = emptyNsPlan()
    for (const key of ONE_KEYS) plan = setAnswer(plan, key, "x", NOW)
    expect(stepState(plan, "focus", NONE)).toBe("empty")
    expect(stepProgress(plan, "focus", NONE).fraction).toBe(0)
  })

  it("counts values up to three", () => {
    expect(stepProgress(setValues(emptyNsPlan(), ["A"], NOW), "values").fraction).toBeCloseTo(1 / 3)
    expect(stepProgress(setValues(emptyNsPlan(), ["A", "B", "C", "D", "E"], NOW), "values").fraction).toBe(1)
  })

  it("counts the commitment date only once there is a sentence", () => {
    const dateOnly = setAnswer(emptyNsPlan(), COMMIT_DATE_KEY, TODAY, NOW)
    expect(stepProgress(dateOnly, "recap").fraction).toBe(0)
    const said = setAnswer(emptyNsPlan(), COMMIT_KEY, "yes", NOW)
    expect(stepProgress(said, "recap").fraction).toBe(0.5)
    expect(stepProgress(setAnswer(said, COMMIT_DATE_KEY, TODAY, NOW), "recap").fraction).toBe(1)
  })

  it("averages the steps, each counting the same, and names the step with the most left", () => {
    // star 1/2, values 1/3, everything else 0: (0.5 + 1/3) / 7 = 11.9 %
    const plan = setValues(setNorthStar(emptyNsPlan(), "A paragraph.", NOW), ["A"], NOW)
    const progress = planProgress(plan, NONE)
    expect(progress.percent).toBe(11)
    // "now" is the first step at 0 %.
    expect(progress.mostLeft).toBe("now")
  })

  it("rounds down, so nearly done never shows 100", () => {
    expect(percentDown(0.996)).toBe(99)
    expect(percentDown(0.999999)).toBe(99)
    expect(percentDown(0.29)).toBe(29)
    expect(percentDown(1)).toBe(100)
    expect(percentDown(0)).toBe(0)
  })
})

/** A small seeded generator, so a failure is reproducible from its seed. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generatedPlan(seed: number): { plan: NsPlan; account: NsAccount } {
  const r = rng(seed)
  const coin = (p = 0.5) => r() < p
  let plan = emptyNsPlan()
  if (coin()) plan = setNorthStar(plan, "A paragraph.", NOW)
  const rungsAll = coin(0.3)
  for (const rung of VISION_RUNGS) if (rungsAll || coin(0.3)) plan = setRung(plan, rung.id, "x", NOW)
  const areasAll = coin(0.3)
  for (const area of plan.areas) {
    if (areasAll || coin(0.3)) plan = rateArea(plan, area.id, 1 + Math.floor(r() * 10), TODAY, NOW)
    if (areasAll || coin(0.3)) plan = setAreaReview(plan, area.id, { ten: "A ten" }, NOW)
  }
  for (const key of ONE_KEYS) if (coin()) plan = setAnswer(plan, key, "x", NOW)
  if (coin(0.4)) plan = addOneThingRequirement(plan, "Requirement", "lm_fitness", "habit_ramp", NOW)
  const milestones = Math.floor(r() * 4)
  for (let i = 0; i < milestones; i++) plan = withMilestone(plan, coin(0.6), coin(0.6))
  if (coin(0.5)) {
    plan = addCustomStep(plan, "r1", "A step", 20, 3, NOW)
    const step = plan.routines.find((x) => x.id === "r1")!.steps.at(-1)!
    for (const m of milestoneGoals(plan)) if (coin(0.6)) plan = linkStepToGoal(plan, "r1", step.id, m.id, true, NOW)
  }
  if (coin()) plan = toggleSeasonArea(plan, "lm_fitness", NOW)
  if (coin()) plan = setSeasonFocus(plan, "lm_health", NOW)
  const values = Math.floor(r() * 5)
  if (values > 0) plan = setValues(plan, ["A", "B", "C", "D"].slice(0, values), NOW)
  if (coin()) plan = setAnswer(plan, COMMIT_KEY, "yes", NOW)
  if (coin()) plan = setAnswer(plan, COMMIT_DATE_KEY, TODAY, NOW)
  return { plan, account: { hasOneThing: coin() } }
}

describe("the number and the ring never contradict each other", () => {
  it("holds over 400 generated plans", () => {
    const seen = { empty: 0, started: 0, done: 0 }
    for (let seed = 1; seed <= 400; seed++) {
      const { plan, account } = generatedPlan(seed)
      const progress = planProgress(plan, account)
      for (const tab of SCORED_TABS) {
        const state = stepState(plan, tab, account)
        const { fraction } = progress.steps[tab]
        seen[state]++
        expect(fraction === 1, `seed ${seed}, ${tab}: fraction ${fraction}, state ${state}`).toBe(state === "done")
        if (state === "empty") expect(fraction, `seed ${seed}, ${tab}`).toBe(0)
        expect(fraction).toBeGreaterThanOrEqual(0)
        expect(fraction).toBeLessThanOrEqual(1)
      }
      expect(progress.percent === 100).toBe(SCORED_TABS.every((tab) => stepState(plan, tab, account) === "done"))
    }
    // The generator has to reach all three states, or the test proves nothing.
    expect(seen.empty).toBeGreaterThan(0)
    expect(seen.started).toBeGreaterThan(0)
    expect(seen.done).toBeGreaterThan(0)
  })
})
