import { describe, it, expect } from "vitest"
import { landingStep } from "@/src/goals/planLanding"

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
