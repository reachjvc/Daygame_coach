// @vitest-environment node
import { describe, it, expect } from "vitest"
import { REAL_STEP_IDS, REAL_STEP_BASE, realStepRoute, realStepOfRoute, realStepOfParam } from "@/src/goals/planSteps/realStepRoutes"
import { ROUTES } from "@/src/shared/routes"

describe("realStepRoutes", () => {
  it("has the twelve steps of the real tool", () => {
    expect([...REAL_STEP_IDS]).toEqual(["star", "now", "pick", "systems", "milestones", "focus", "values", "recap", "track", "today", "journal", "review"])
  })

  it("maps every id to its own route under the new version, and back", () => {
    const seen = new Set<string>()
    for (const id of REAL_STEP_IDS) {
      const route = realStepRoute(id)
      expect(route).toBe(`${ROUTES.planNew}/s/${id}`)
      expect(route!.startsWith(REAL_STEP_BASE)).toBe(true)
      expect(seen.has(route!)).toBe(false)
      seen.add(route!)
      expect(realStepOfRoute(route!)).toBe(id)
      expect(realStepOfRoute(`${route}?area=x#top`)).toBe(id)
    }
    expect(seen.size).toBe(12)
  })

  it("answers null for anything that is not one of the twelve", () => {
    expect(realStepRoute("nope")).toBeNull()
    expect(realStepRoute("toString")).toBeNull()
    expect(realStepRoute("")).toBeNull()
    expect(realStepOfRoute("/plan/new/s/nope")).toBeNull()
    expect(realStepOfRoute("/plan/new/areas/pick")).toBeNull()
    expect(realStepOfRoute("/plan/s/star")).toBeNull()
    expect(realStepOfRoute("/plan/new/s/star/extra")).toBeNull()
  })

  it("sends the old folded step names to the step that took them over", () => {
    expect(realStepOfParam("one")).toBe("focus")
    expect(realStepOfParam("commit")).toBe("recap")
    expect(realStepOfParam("templates")).toBe("pick")
    expect(realStepOfParam("review")).toBe("review")
    expect(realStepOfParam("toString")).toBeNull()
    expect(realStepOfParam(null)).toBeNull()
  })
})
