import { describe, it, expect } from "vitest"
import * as ns from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"
import { numbersFor, planNumbers, todayNumbers } from "@/src/goals/planSteps/planNumbers"
import { fullPlan } from "@/tests/support/fullLifePlan"

describe("the Old version reads today's numbers", () => {
  const plans = [ns.emptyNsPlan(), fullPlan() as unknown as NsPlan]

  it("its percent, rings, done marks and chips are the ones /plan shows", () => {
    for (const plan of plans) {
      const n = todayNumbers(plan)
      expect(n.progress).toEqual(ns.planProgress(plan))
      expect(n.states).toEqual(ns.stepStates(plan))
      expect(n.done).toEqual(ns.nsProgress(plan).done)
      expect(n.chips.map((c) => c.text)).toEqual(ns.planTodos(plan).map((t) => t.text))
    }
  })

  it("only the whole-page version gets them; the others keep the one rule", () => {
    const plan = fullPlan() as unknown as NsPlan
    expect(numbersFor(true, plan, undefined, "2026-11-26")).toEqual(todayNumbers(plan))
    expect(numbersFor(false, plan, undefined, "2026-11-26")).toEqual(planNumbers(plan, undefined, "2026-11-26"))
  })
})
