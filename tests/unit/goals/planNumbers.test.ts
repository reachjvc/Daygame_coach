// @vitest-environment node
/**
 * ONE RULE FOR EVERY NUMBER ON /plan/new (Plans/plan-new-from-real.md, Phase 6.5).
 * Each case below is a contradiction the walk of 2026-11-18 found in the real tool's three separate counts.
 */
import { describe, expect, it } from "vitest"
import { VISION_RUNGS } from "@/src/goals/data/lifeMasteryWhy"
import { rateArea } from "@/src/goals/reviewService"
import { SCORED_TABS, TAB_ORDER } from "@/src/goals/data/northStar"
import { COMMIT_DATE_KEY, COMMIT_KEY, ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import type { NsAccount, NsPlan } from "@/src/goals/types"
import * as ns from "@/src/goals/northStarService"
import { planNumbers, stepNumbers } from "@/src/goals/planSteps/planNumbers"
import { fullPlan } from "../../support/fullLifePlan"

const NOW = "2026-08-17T09:00:00.000Z"
const TODAY = ns.todayISO()
const SAVED: NsAccount = { hasOneThing: true }
const NONE: NsAccount = { hasOneThing: false }

const starWork = (plan: NsPlan) => {
  for (const id of ["identity_total", "conduct", "become", "affirmations"]) plan = ns.setAnswer(plan, id, "written", NOW)
  return plan
}

describe("planNumbers", () => {
  it("North star is 100 % and has no chip once the paragraph, the why and every box under it are filled", () => {
    // The walk: paragraph + four boxes filled, and the step read "50 % · 0 of 7 ladder questions answered".
    let plan = ns.setNorthStar(ns.emptyNsPlan(), "A life I chose.", NOW)
    plan = ns.setAnswer(plan, "star_why", "Because I said so.", NOW)
    plan = starWork(plan)
    expect(ns.rungsAnswered(plan)).toBe(0) // the ladder is untouched
    expect(ns.stepProgress(plan, "star", NONE).fraction).toBeCloseTo(0.5) // what the real tool says
    const s = stepNumbers(plan, "star", NONE, TODAY)
    expect(s.state).toBe("done")
    expect(s.fraction).toBe(1)
    expect(s.chips).toEqual([])
  })

  it("ladder answers count toward the paragraph until it is written, so a filled ladder is not an empty step", () => {
    const plan = VISION_RUNGS.reduce((p, r) => ns.setRung(p, r.id, "x", NOW), ns.emptyNsPlan())
    const s = stepNumbers(plan, "star", NONE, TODAY)
    expect(s.state).toBe("started")
    expect(s.chips[0].text).toBe("Your north star paragraph")
    expect(Math.floor(s.fraction * 100)).toBe(30)
  })

  it("a part-filled North star names exactly what is left, and its number follows", () => {
    let plan = ns.setNorthStar(ns.emptyNsPlan(), "A life I chose.", NOW)
    const s = stepNumbers(plan, "star", NONE, TODAY)
    expect(s.state).toBe("started")
    expect(s.chips.map((c) => c.text)).toEqual(["Why that life matters to you", "4 questions under the paragraph still blank"])
    expect(s.chips.map((c) => c.section)).toEqual(["star.vision", "star.self"])
    expect(Math.floor(s.fraction * 100)).toBe(33)
    plan = ns.setAnswer(plan, "identity_total", "x", NOW)
    expect(stepNumbers(plan, "star", NONE, TODAY).chips.map((c) => c.text)).toContain("3 questions under the paragraph still blank")
  })

  it("the season step is not empty (0 %) while its answers are written", () => {
    let plan = ns.emptyNsPlan()
    for (const key of [ONE_ANSWERS.why, ONE_ANSWERS.cost, ONE_ANSWERS.identity, ONE_ANSWERS.values]) plan = ns.setAnswer(plan, key, "x", NOW)
    expect(ns.stepState(plan, "focus", NONE)).toBe("empty") // the real tool
    const s = stepNumbers(plan, "focus", NONE, TODAY)
    expect(s.state).toBe("started")
    expect(s.fraction).toBeGreaterThan(0)
    expect(s.chips.map((c) => c.id)).toEqual(["focus.one", "focus.goal", "focus.areas", "focus.focus"])
  })

  it("the focus chip opens a season area's sheet (the only place the focus is set), else sends to pick areas; season chips run in screen order", () => {
    let plan = ns.emptyNsPlan()
    const order = ["season.one-thing", "season.one-thing", "season.why", "season.why", "season.who", "season.who", "season.areas", "season.areas"]
    expect(stepNumbers(plan, "focus", NONE, TODAY).chips.map((c) => c.section)).toEqual(order)
    expect(stepNumbers(plan, "focus", NONE, TODAY).chips.at(-1)!.areaId).toBeUndefined()
    plan = ns.toggleSeasonArea(plan, "lm_fitness", NOW)
    const focus = stepNumbers(plan, "focus", NONE, TODAY).chips.find((c) => c.id === "focus.focus")!
    expect(focus.areaId).toBe("lm_fitness")
    expect(focus.tab).toBe("now")
  })

  it("values with one or two ranked have a chip (the real tool shows 33 % and nothing to do)", () => {
    const plan = ns.setValues(ns.emptyNsPlan(), ["Courage"], NOW)
    const s = stepNumbers(plan, "values", NONE, TODAY)
    expect(Math.floor(s.fraction * 100)).toBe(33)
    expect(s.chips.map((c) => c.text)).toEqual(["Put three values in order"])
    expect(stepNumbers(ns.setValues(plan, ["a", "b", "c"], NOW), "values", NONE, TODAY).chips).toEqual([])
  })

  it("Your 10s shows a chip for the missing 10s even when none is written yet", () => {
    let plan = ns.emptyNsPlan()
    plan = rateArea(plan, plan.areas[0].id, 6, TODAY, NOW)
    const s = stepNumbers(plan, "now", NONE, TODAY)
    expect(s.chips.map((c) => c.id)).toEqual(["now.rated", "now.ten"]) // ns.planTodos hides the second while none is written
  })

  it("Everything: a date with no sentence counts for nothing, a sentence alone is half", () => {
    let plan = ns.setAnswer(ns.emptyNsPlan(), COMMIT_DATE_KEY, TODAY, NOW)
    expect(stepNumbers(plan, "recap", NONE, TODAY).state).toBe("empty")
    plan = ns.setAnswer(plan, COMMIT_KEY, "I commit.", NOW)
    expect(stepNumbers(plan, "recap", NONE, TODAY).state).toBe("done")
    plan = ns.setAnswer(ns.setAnswer(ns.emptyNsPlan(), COMMIT_KEY, "I commit.", NOW), COMMIT_DATE_KEY, "", NOW)
    const s = stepNumbers(plan, "recap", NONE, TODAY)
    expect(s.fraction).toBeCloseTo(0.5)
    expect(s.chips.map((c) => c.text)).toEqual(["The date you commit"])
  })

  it("every scored step agrees with itself, on empty, full and in-between plans: done <=> 100 % <=> no chip, empty <=> 0 %", () => {
    const plans: Array<[string, NsPlan, NsAccount]> = [
      ["empty", ns.emptyNsPlan(), NONE],
      ["full", fullPlan(), SAVED],
      ["full, no account sentence", fullPlan(), NONE],
      ["paragraph only", ns.setNorthStar(ns.emptyNsPlan(), "x", NOW), NONE],
      ["one milestone", ns.addGoal(ns.emptyNsPlan(), "lm_fitness", "Run", "milestone_ladder", NOW), NONE],
      ["one practice", ns.addGoal(ns.emptyNsPlan(), "lm_fitness", "Stretch", "habit_ramp", NOW), NONE],
    ]
    for (const [name, plan, account] of plans) {
      const n = planNumbers(plan, account, TODAY)
      for (const tab of TAB_ORDER) {
        const s = n.steps[tab]
        const label = `${name} / ${tab}`
        if (!SCORED_TABS.includes(tab)) {
          expect(s.chips, label).toEqual([])
          expect(s.state, label).toBe("empty")
          continue
        }
        expect(s.state === "done", `${label}: done <=> 100 %`).toBe(s.fraction === 1)
        expect(s.state === "empty", `${label}: empty <=> 0 %`).toBe(s.fraction === 0)
        expect(s.chips.length === 0, `${label}: no chip <=> done`).toBe(s.state === "done")
        expect(s.boxes.reduce((a, b) => a + b.weight, 0), `${label}: weights add to 1`).toBeCloseTo(1)
        expect(n.progress.steps[tab].fraction, label).toBe(s.fraction)
        expect(n.states[tab], label).toBe(s.state)
        expect(n.done[tab], label).toBe(s.state === "done")
      }
      // The plan's total is the mean of the scored steps, rounded down, and "most left" is a step that is not done.
      const mean = SCORED_TABS.reduce((a, t) => a + n.steps[t].fraction, 0) / SCORED_TABS.length
      expect(n.progress.percent, name).toBe(ns.percentDown(mean))
      if (n.progress.percent < 100) expect(n.states[n.progress.mostLeft!]).not.toBe("done")
      // "Still to fill in" is every step's chips in the real step order, and nothing else.
      expect(n.chips, name).toEqual(TAB_ORDER.flatMap((t) => n.steps[t].chips))
    }
  })

  it("a complete plan is 100 % with nothing left to fill in", () => {
    let plan = fullPlan()
    plan = ns.setNorthStar(plan, "A life.", NOW)
    plan = ns.setAnswer(plan, "star_why", "because", NOW)
    plan = starWork(plan)
    for (const area of plan.areas) {
      plan = ns.setAreaReview(plan, area.id, { ten: "A ten" }, NOW)
      plan = rateArea(plan, area.id, 6, TODAY, NOW)
    }
    for (const key of [ONE_ANSWERS.why, ONE_ANSWERS.cost, ONE_ANSWERS.identity, ONE_ANSWERS.values, COMMIT_KEY]) plan = ns.setAnswer(plan, key, "x", NOW)
    plan = ns.setAnswer(plan, COMMIT_DATE_KEY, TODAY, NOW)
    plan = ns.setValues(plan, ["a", "b", "c"], NOW)
    plan = ns.addOneThingRequirement(plan, "Do the thing", plan.areas[0].id, "habit_ramp", NOW)
    // something runs at every milestone
    for (const m of ns.milestoneGoals(plan)) {
      plan = ns.addCustomStep(plan, "r1", `Work on ${m.title}`, 30, 3, NOW)
      const step = plan.routines.find((r) => r.id === "r1")!.steps.at(-1)!
      plan = ns.linkStepToGoal(plan, "r1", step.id, m.id, true, NOW)
    }
    plan = { ...plan, goals: plan.goals.map((g) => ({ ...g, why: "because", targetDate: g.targetDate ?? "2027-08-17" })) }
    const n = planNumbers(plan, SAVED, TODAY)
    for (const tab of SCORED_TABS) if (n.steps[tab].state !== "done") throw new Error(`${tab} not done: ${n.steps[tab].chips.map((c) => c.text).join(" | ")}`)
    expect(n.progress.percent).toBe(100)
    expect(n.chips).toEqual([])
    expect(n.progress.mostLeft).toBeNull()
  })
})
