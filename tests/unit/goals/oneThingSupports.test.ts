/**
 * THE ONE THING'S SUPPORTS HAVE ONE HOME, AND IT IS THE PLAN.
 *
 * The why, the cost, the identity and the values had two homes and the DESIGNED
 * one was dead: `life_answers` gave them four `answer_key` values, a CHECK
 * constraint, a branch in `/api/life-answers` and a rule for carrying them
 * across an extension — and nothing ever wrote one. Counted on the live
 * database on 2026-09-24 before any of it was removed: **522 rows, every one
 * `one_thing`, and none under the other four.**
 *
 * What the flow actually writes is `plan.answers["start:one-why"]` and its three
 * siblings, from the One Thing step, on the account since Phase 1. Those stored
 * keys are what this file pins.
 */

import { describe, it, expect } from "vitest"
import { ONE_ANSWERS } from "@/src/goals/data/northStarStart"

const SUPPORTS = [ONE_ANSWERS.why, ONE_ANSWERS.cost, ONE_ANSWERS.identity, ONE_ANSWERS.values]

describe("the supports live in the plan and nowhere else", () => {
  /**
   * The keys are `start:one-why` and siblings, spelled out once here. If a
   * rename ever looks tempting: people have this written already, and a rename
   * silently empties their page — which is why the sentence's own key was never
   * renamed either.
   */
  it("under the keys the account already holds", () => {
    expect(SUPPORTS).toEqual(["start:one-why", "start:one-cost", "start:one-identity", "start:one-values"])
  })
})
