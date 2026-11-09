import { describe, it, expect } from "vitest"
import { landingStep, planInUse } from "@/src/goals/planLanding"
import { addGoal, emptyNsPlan, updateGoal } from "@/src/goals/northStarService"

describe("where /plan opens", () => {
  it("opens on Today when no step is asked and the plan is in use", () => {
    expect(landingStep(undefined, true)).toBe("today")
  })
  it("leaves the start to the flow when the plan is not in use", () => {
    expect(landingStep(undefined, false)).toBeUndefined()
  })
  it("never overrides a step the address asks for", () => {
    expect(landingStep("review", true)).toBeUndefined()
  })
})

describe("whether the plan is in use, on the client", () => {
  const area = emptyNsPlan().areas[0].id

  it("is in use with one active goal", () => {
    const plan = addGoal(emptyNsPlan(), area, "Run a 10k")
    expect(planInUse(plan)).toBe(true)
  })

  it("is not in use when the only goal is paused and no routine has a step", () => {
    let plan = addGoal(emptyNsPlan(), area, "Run a 10k")
    plan = updateGoal(plan, plan.goals[0].id, { status: "paused" })
    expect(plan.routines.every((r) => r.steps.length === 0)).toBe(true)
    expect(planInUse(plan)).toBe(false)
  })
})
