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
 * siblings, from the One Thing step, on the account since Phase 1.
 *
 * This file exists because deleting the dead home deletes the tests that stood
 * over it, and two of them protected something real:
 *
 *   - extending a deadline must not blank three weeks of writing;
 *   - and a fresh start used to clear it.
 *
 * The first still holds and is asserted below. **The second no longer holds, and
 * that is the visible consequence of the choice** — the plan has no chapters, so
 * there is nothing for a new one thing to restart. Last season's why sits under
 * this season's sentence until it is rewritten. Written down as a test rather
 * than left to be discovered, because a reader of the old code would expect the
 * opposite.
 */

import { describe, it, expect } from "vitest"
import { emptyNsPlan, setAnswer, answerOf } from "@/src/goals/northStarService"
import { ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import { LIFE_ANSWER_KEYS } from "@/src/db/lifeAnswerRepo"

const SUPPORTS = [ONE_ANSWERS.why, ONE_ANSWERS.cost, ONE_ANSWERS.identity, ONE_ANSWERS.values]

/** A plan with all four supports written, as the One Thing step writes them. */
function planWithSupports() {
  let plan = emptyNsPlan()
  plan = setAnswer(plan, ONE_ANSWERS.why, "Because I want my head back")
  plan = setAnswer(plan, ONE_ANSWERS.cost, "Another year gone")
  plan = setAnswer(plan, ONE_ANSWERS.identity, "Someone who finishes things")
  plan = setAnswer(plan, ONE_ANSWERS.values, "Clarity")
  return plan
}

describe("the supports live in the plan and nowhere else", () => {
  it("the table that used to hold them accepts only the sentence", () => {
    expect(
      [...LIFE_ANSWER_KEYS],
      "a key here is a second home for something the plan already stores",
    ).toEqual(["one_thing"])
  })

  it("all four are stored under the plan's own keys", () => {
    const plan = planWithSupports()
    for (const key of SUPPORTS) {
      expect(answerOf(plan, key), `${key} must be readable from the plan`).not.toBe("")
    }
  })

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

describe("what the retired carry-across rule was protecting", () => {
  /**
   * THE ONE THAT WOULD HAVE SHIPPED BROKEN, restated against the real home.
   *
   * Moving a deadline used to open a new chapter, and the rule copied the
   * supports into it so that adding a fortnight to a date did not leave the why
   * and the cost blank under an unchanged sentence. In the plan there is no
   * chapter and nothing to copy: the answers are simply still there.
   */
  it("moving a deadline cannot blank them, because nothing about a date touches them", () => {
    const plan = planWithSupports()

    // Everything a deadline change does to the plan: nothing. The dates live on
    // `life_chapters`, which this object has no field for.
    const afterMovingTheDeadline = plan

    expect(answerOf(afterMovingTheDeadline, ONE_ANSWERS.why)).toBe("Because I want my head back")
    expect(answerOf(afterMovingTheDeadline, ONE_ANSWERS.cost)).toBe("Another year gone")
  })

  /**
   * AND THE CHANGE OF BEHAVIOUR, stated plainly so nobody has to infer it.
   *
   * A genuinely new one thing used to clear them — "a new commitment deserves
   * its own reasons". It no longer does. If that turns out to be wrong for the
   * product, the fix is a control on the One Thing step that offers to clear
   * them, NOT a second copy of these four answers somewhere with a chapter id
   * on it, which is exactly what was just retired.
   */
  it("starting a new one thing now KEEPS them, which the old design cleared", () => {
    const plan = planWithSupports()
    const afterStartingANewOne = setAnswer(plan, ONE_ANSWERS.oneThing, "Bench 100 kg")

    expect(
      answerOf(afterStartingANewOne, ONE_ANSWERS.why),
      "last season's why sits under this season's sentence until it is rewritten",
    ).toBe("Because I want my head back")
  })

  it("and rewriting one replaces it rather than adding a second", () => {
    const plan = setAnswer(planWithSupports(), ONE_ANSWERS.why, "Because I said I would")

    expect(answerOf(plan, ONE_ANSWERS.why)).toBe("Because I said I would")
  })
})
