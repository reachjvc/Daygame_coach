// @vitest-environment node
import { describe, expect, it } from "vitest"
import * as ns from "@/src/goals/northStarService"
import { COMMIT_KEY } from "@/src/goals/data/northStarStart"
import { sequenceById } from "@/src/goals/planSteps/planSequences"
import { planNumbers } from "@/src/goals/planSteps/planNumbers"
import { accountOf, buildStepsOf, dailyScreensOf, nextUp, screenToFill, stepSummary } from "@/src/goals/planSteps/planHome"
import { fullPlan } from "../../support/fullLifePlan"

const NOW = "2026-08-17T09:00:00.000Z"
// A fixed Thursday: with the real date the weekly review is due Sunday to Tuesday and takes Next up.
const TODAY = "2026-08-20"
const V1 = sequenceById("v1")

describe("the plan home over the real steps", () => {
  it("the build list is the sequence's build steps once each, in order; the daily list is the four daily steps", () => {
    expect(buildStepsOf(V1)).toEqual(["star", "now", "pick", "systems", "milestones", "focus", "values", "recap"])
    expect(dailyScreensOf(V1).map((s) => s.step)).toEqual(["track", "today", "journal", "review"].sort((a, b) => V1.screens.findIndex((s) => s.step === a) - V1.screens.findIndex((s) => s.step === b)))
  })

  it("Next up on a new plan is the first step, on the screen of its first missing box, and says Start", () => {
    const plan = ns.emptyNsPlan()
    const next = nextUp(V1, plan, planNumbers(plan, accountOf(plan), TODAY), TODAY)
    expect(next.kind).toBe("build")
    if (next.kind !== "build") return
    expect(next.step).toBe("star")
    expect(next.screen.id).toBe("star.vision")
    expect(next.started).toBe(false)
  })

  it("Next up moves to the screen that holds the first missing box, and says Continue", () => {
    let plan = ns.setNorthStar(ns.emptyNsPlan(), "A life.", NOW)
    plan = ns.setAnswer(plan, "star_why", "because", NOW)
    const next = nextUp(V1, plan, planNumbers(plan, accountOf(plan), TODAY), TODAY)
    expect(next.kind === "build" && next.screen.id).toBe("star.self")
    expect(next.kind === "build" && next.started).toBe(true)
    expect(next.kind === "build" && next.chip).toMatch(/questions under the paragraph/)
  })

  it("Next up's words and its address come from the same chip", () => {
    const plan = ns.toggleSeasonArea(ns.emptyNsPlan(), "lm_fitness", NOW)
    const numbers = planNumbers(plan, accountOf(plan), TODAY)
    // make every step before Season done so Season is next
    for (const step of ["star", "now", "systems", "milestones"] as const) numbers.steps[step] = { ...numbers.steps[step], state: "done", chips: [] }
    const next = nextUp(V1, plan, numbers, TODAY)
    expect(next.kind === "build" && next.step).toBe("focus")
    expect(next.kind === "build" && next.chip).toBe(numbers.steps.focus.chips[0].text)
    expect(next.kind === "build" && next.screen.id).toBe("season.one-thing")
    // when the focus is the first thing left, the address opens the area's sheet
    numbers.steps.focus = { ...numbers.steps.focus, chips: numbers.steps.focus.chips.filter((c) => c.id === "focus.focus") }
    const focus = nextUp(V1, plan, numbers, TODAY)
    expect(focus.kind === "build" && focus.href).toBe("/plan/new/now?area=lm_fitness")
    expect(focus.kind === "build" && focus.chip).toBe("No focus area for the season")
  })

  it("has no locks: a later step is Next up when the earlier ones are done, never blocked when they are not", () => {
    const plan = fullPlan()
    const numbers = planNumbers(plan, accountOf(plan), TODAY)
    // Every step has a screen that can be walked to, whatever its state.
    for (const step of buildStepsOf(V1)) expect(screenToFill(V1, step, numbers)).not.toBeNull()
  })

  it("is All set, pointing at Today, when every ringed step is done", () => {
    const plan = ns.emptyNsPlan()
    const done = planNumbers(plan, { hasOneThing: true }, TODAY)
    for (const step of ["star", "now", "systems", "milestones", "focus", "values", "recap"] as const) done.steps[step] = { ...done.steps[step], state: "done", chips: [] }
    const next = nextUp(V1, plan, done, TODAY)
    expect(next.kind).toBe("all-set")
    expect(next.screen?.id).toBe("today")
  })

  it("summarises a step in the person's own words and numbers, and says nothing for an empty one", () => {
    const empty = ns.emptyNsPlan()
    for (const step of buildStepsOf(V1)) expect(stepSummary(empty, step, TODAY), step).toBe("")
    let plan = ns.setNorthStar(empty, "A life I chose, with a house by the water.", NOW)
    plan = ns.setValues(plan, ["Courage", "Discipline"], NOW)
    plan = ns.setAnswer(plan, COMMIT_KEY, "I am in.", NOW)
    expect(stepSummary(plan, "star", TODAY)).toContain("A life I chose")
    expect(stepSummary(plan, "values", TODAY)).toBe("Courage · Discipline")
    expect(stepSummary(plan, "recap", TODAY)).toBe("I am in.")
    expect(stepSummary(fullPlan(), "milestones", TODAY)).toMatch(/experiences? · \d+ with a date/)
  })
})
