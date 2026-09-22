/**
 * WHAT A MISS ACTUALLY COSTS.
 *
 * The finish sheet said "these count as misses and will bring the weight
 * down" over every lift you were short on. For StrongLifts that is false two
 * times in three: its rule is three consecutive misses before a deload, so
 * the first two hold the weight exactly where it is.
 *
 * Telling somebody their squat is about to drop when it is not is the kind of
 * sentence that makes people fake a set — which is the one outcome a training
 * log cannot survive.
 */

import { describe, it, expect } from "vitest"
import { missOutcome, missWording, missRulesFor, seedEnrollment } from "@/src/programs/programsService"
import { requireProgram } from "@/src/programs/data/catalog"

describe("what today's miss does", () => {
  it("holds the weight while there is room before the deload", () => {
    const rule = { failsSoFar: 0, deloadAfter: 3, deloadPct: 0.1 }
    expect(missOutcome(rule)).toBe("hold")
    expect(missWording("hold", rule)).toBe("miss 1 of 3 — the weight stays")
  })

  it("drops it on the one that reaches the limit", () => {
    const rule = { failsSoFar: 2, deloadAfter: 3, deloadPct: 0.1 }
    expect(missOutcome(rule)).toBe("deload")
    expect(missWording("deload", rule)).toBe("miss 3 of 3 — the weight drops 10%")
  })

  it("counts from the misses already on the lift, not from zero", () => {
    // The whole point: the same miss means different things depending on what
    // came before it, and only the enrollment knows.
    expect(missOutcome({ failsSoFar: 1, deloadAfter: 3, deloadPct: 0.1 })).toBe("hold")
    expect(missOutcome({ failsSoFar: 2, deloadAfter: 3, deloadPct: 0.1 })).toBe("deload")
  })

  it("promises nothing when the program has no rule to read", () => {
    // A skill ladder and a hold routine do not deload. Claiming either
    // outcome would be inventing one.
    expect(missOutcome({ failsSoFar: 0, deloadAfter: null, deloadPct: null })).toBe("unknown")
    expect(missOutcome(undefined)).toBe("unknown")
    expect(missWording("unknown")).toBe("counts as a miss")
  })

  it("a skipped or swapped lift is not a miss at all", () => {
    expect(missWording("held")).toBe("not counted")
  })

  it("says the weight drops without a percentage when the program gives none", () => {
    const rule = { failsSoFar: 1, deloadAfter: 2, deloadPct: null }
    expect(missWording("deload", rule)).toBe("miss 2 of 2 — the weight drops")
  })
})

describe("reading the rule off a real program", () => {
  it("takes StrongLifts' own three-misses rule, not a number typed here", () => {
    const program = requireProgram("stronglifts-5x5")
    const { exerciseState } = seedEnrollment(program, "beginner", "kg")
    const rules = missRulesFor(program, { exerciseState })

    expect(rules.squat, "squat should have a rule").toBeTruthy()
    expect(rules.squat.deloadAfter, "the program's own number").toBeGreaterThan(1)
    expect(rules.squat.failsSoFar, "a fresh enrollment has missed nothing").toBe(0)
    // And so the first miss of a fresh program holds the weight.
    expect(missOutcome(rules.squat)).toBe("hold")
  })

  it("carries the misses already recorded against a lift", () => {
    const program = requireProgram("stronglifts-5x5")
    const { exerciseState } = seedEnrollment(program, "beginner", "kg")
    const worn = {
      ...exerciseState,
      squat: { ...exerciseState.squat, consecutiveFails: 2 },
    }
    const rules = missRulesFor(program, { exerciseState: worn })
    expect(rules.squat.failsSoFar).toBe(2)
  })
})
