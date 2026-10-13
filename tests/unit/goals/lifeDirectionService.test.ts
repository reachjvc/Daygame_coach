/**
 * KEPT FOR ONE REASON: WRITE COVERAGE.
 *
 * `lifeDirectionService` is reached only from the `/test/life-direction` lab,
 * and its tests were retired with the decision to keep the lab pages but not
 * test them. This one stays because `setGoalField` is a classified write
 * function in `tests/support/writeCoverage.baseline.json`, and this was the
 * only test that names it. The plan's counter-rule: the only cover for a write
 * function goes in the same change that deletes the function and its baseline
 * row, never before.
 *
 * It is the one test of the old set that fails if `setGoalField` stops storing
 * what it is handed: with the anti-goal missing, the warning fires.
 */

import { describe, it, expect } from "vitest"
import {
  addGoal,
  coherenceWarnings,
  emptyLdiPlan,
  setConstraints,
  setGoalField,
} from "@/src/goals/lifeDirectionService"

const NOW = "2026-08-09T10:00:00.000Z"

describe("coherence warnings", () => {
  it("stays quiet once the anti-goal names it", () => {
    let p = setConstraints(emptyLdiPlan(NOW), { nonNegotiables: "Evenings with my daughter." }, NOW)
    p = addGoal(p, "mission", "Launch the business", null, NOW)
    p = setGoalField(p, p.goals[0].id, "antiGoals", "Nothing that touches evenings with my daughter.", NOW)
    expect(coherenceWarnings(p).some((w) => w.id === "nonneg-unprotected")).toBe(false)
  })
})
