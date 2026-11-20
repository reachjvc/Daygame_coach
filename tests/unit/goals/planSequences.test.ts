// @vitest-environment node
import { describe, it, expect } from "vitest"
import { TAB_ORDER, USE_STEPS, BUILD_STEPS } from "@/src/goals/data/northStar"
import { SEQUENCES, DEFAULT_SEQUENCE_ID, screensOf, sequenceById, sequenceOfPlan, nextScreen, prevScreen, screenRoute, screenForStep, stepRoute, screenById } from "@/src/goals/planSteps/planSequences"
import { SEQUENCE_KEY } from "@/src/goals/planSteps/planFacts"
import { ROUTES } from "@/src/shared/routes"

describe("planSequences", () => {
  const v1 = sequenceById("v1")

  it("V1 is the twelve steps in the real tool's order, the long ones split into screens", () => {
    expect(DEFAULT_SEQUENCE_ID).toBe("v1")
    expect(screensOf("v1").map((s) => s.step).filter((s, i, a) => a.indexOf(s) === i)).toEqual(TAB_ORDER)
    expect(screensOf("v1").length).toBeGreaterThan(12)
  })

  it("splits build and daily the way NorthStarFlow does", () => {
    const uniq = (a: string[]) => a.filter((s, i) => a.indexOf(s) === i)
    expect(uniq(v1.screens.filter((s) => s.kind === "build").map((s) => s.step))).toEqual(BUILD_STEPS)
    expect(uniq(v1.screens.filter((s) => s.kind === "daily").map((s) => s.step)).sort()).toEqual([...USE_STEPS].sort())
    expect(BUILD_STEPS).toEqual(["star", "now", "pick", "systems", "milestones", "focus", "values", "recap"])
  })

  it("has no previous screen at the start and no next at the end, and walks every step between", () => {
    const first = v1.screens[0]
    const last = v1.screens[v1.screens.length - 1]
    expect(prevScreen(v1, first)).toBeNull()
    expect(nextScreen(v1, last)).toBeNull()
    let at = first
    const seen = [at.id]
    for (let n = nextScreen(v1, at); n; n = nextScreen(v1, n)) {
      expect(prevScreen(v1, n)?.id).toBe(at.id)
      at = n
      seen.push(at.id)
    }
    expect(seen).toEqual(v1.screens.map((s) => s.id))
  })

  it("gives every screen its own route under /plan/new, never under /first or /s", () => {
    for (const seq of SEQUENCES) {
      const ids = new Set<string>()
      const routes = new Set<string>()
      for (const s of seq.screens) {
        const r = screenRoute(seq, s)
        expect(r).toBe(`${ROUTES.planNew}/${s.id}`)
        expect(["first", "s", "read"]).not.toContain(s.id)
        expect(routes.has(r)).toBe(false)
        expect(ids.has(s.id)).toBe(false)
        routes.add(r)
        ids.add(s.id)
      }
    }
  })

  it("finds the screen for a step and an unknown id falls back to V1", () => {
    expect(stepRoute(v1, "today")).toBe(`${ROUTES.planNew}/today`)
    expect(screenForStep(v1, "star")?.id).toBe("star.vision")
    expect(screenById(v1, "nope")).toBeNull()
    expect(sequenceById("zzz").id).toBe("v1")
    expect(sequenceById(null).id).toBe("v1")
  })

  it("reads the active sequence from the plan's start:new:sequence answer", () => {
    expect(SEQUENCE_KEY).toBe("start:new:sequence")
    expect(sequenceOfPlan({ answers: {} }).id).toBe("v1")
    expect(sequenceOfPlan({ answers: { [SEQUENCE_KEY]: "v1" } }).id).toBe("v1")
    expect(sequenceOfPlan({ answers: { [SEQUENCE_KEY]: "unknown" } }).id).toBe("v1")
  })
})
