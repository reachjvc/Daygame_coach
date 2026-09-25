/**
 * A FAILED READ SHOWED A FIRST RUN TO SOMEBODY WITH YEARS ON THEIR ACCOUNT.
 *
 * `decideOnLoad` gets this right — a read that fails is `stay-local`, with a
 * sentence, and `canSave` then refuses to save because this browser does not
 * know what it would be overwriting. Careful the whole way down.
 *
 * Then the screen showed every step blank and every prompt inviting you to
 * begin, with the sentence in 11px at the bottom edge of the fold: measured at
 * y=852 in a 900px viewport on desktop and y=597 of 664 on an iPhone 14, on a
 * page four to seven thousand pixels long. Scroll once and it is gone. What it
 * costs if believed is that somebody retypes a plan they already have — and it
 * is not even kept, because saving is correctly refused, so the account's real
 * plan replaces it on the next load that succeeds.
 *
 * The distinction is the one the whole sync design turns on and it has been
 * paid for before: **could not be read is not empty.** The dashboard's season
 * band already refuses to draw its invitation on a failed read, for this exact
 * reason, in a comment that calls it "the same lie in a different costume".
 * This is the flow's version of that.
 *
 * Found by the session working on the vices, who hit the identical thing on the
 * Black Box: a person with years of record, a failed read, and the first-run
 * empty state with no notice at all.
 */

import { describe, it, expect } from "vitest"
import { NOTHING_TO_SHOW, decideOnLoad, canSave, planHasNothingWritten } from "@/src/goals/lifePlanSync"
import { addGoal, emptyNsPlan, setNorthStar } from "@/src/goals/northStarService"

describe("a read that failed is not an account with nothing in it", () => {
  it("is its own decision, and saving is refused under it", () => {
    const decision = decideOnLoad({ server: undefined, browser: null })

    expect(decision.kind, "not start-empty, which is what an empty ACCOUNT is").toBe("stay-local")
    expect(canSave(decision, true), "this browser does not know what it would overwrite").toBe(false)
  })

  it("and an account genuinely holding nothing is a different decision", () => {
    const decision = decideOnLoad({ server: { plan: null, revision: 0 }, browser: null })

    expect(decision.kind).toBe("start-empty")
    expect(canSave(decision, true), "nothing to lose, so writing is allowed").toBe(true)
  })
})

/**
 * WHICH GATE DECIDES "THIS BROWSER HOLDS NOTHING", and it is not the obvious one.
 *
 * The banner's first version asked `planIsUntouched` and never appeared. That
 * function also counts the plan's SEEDED areas, routines and day maps, so it
 * answers false for a browser holding nothing of the person's at all — which is
 * precisely the state the banner exists for. The same distinction is the one
 * the import gate got wrong and was corrected for on 2026-09-23.
 */
describe("the gate that decides whether there is anything to show", () => {
  it("says a fresh plan holds nothing written, seeded areas and all", () => {
    const fresh = emptyNsPlan()

    expect(fresh.areas.length, "it IS seeded, which is what made the other gate wrong").toBeGreaterThan(0)
    expect(planHasNothingWritten(fresh), "seeded is not written").toBe(true)
  })

  it("and says a plan with one sentence in it does not", () => {
    expect(planHasNothingWritten(setNorthStar(emptyNsPlan(), "A house I chose."))).toBe(false)
  })

  it("nor one with a single goal", () => {
    const plan = emptyNsPlan()
    expect(planHasNothingWritten(addGoal(plan, plan.areas[0].id, "Run a half marathon"))).toBe(false)
  })
})

describe("what it says when it says it", () => {
  /**
   * The three things the sentence has to carry, asserted as meaning rather than
   * as an exact string so a reword does not fail this — but a reword that drops
   * one of them does.
   */
  it("says this is not your plan, that yours is still there, and not to start again", () => {
    expect(NOTHING_TO_SHOW, "it must deny being the plan").toMatch(/not your plan/i)
    expect(NOTHING_TO_SHOW, "it must say the real one survives").toMatch(/still on your account/i)
    expect(NOTHING_TO_SHOW, "it must say not to retype it").toMatch(/rather than starting again/i)
    expect(NOTHING_TO_SHOW, "and that nothing written now is kept").toMatch(/will be saved/i)
  })

  /**
   * It must NOT claim the account has a plan. A new account with a broken
   * connection has nothing there either, and telling that person their work is
   * safe on the account would be the same failure pointing the other way.
   */
  it("does not promise there is a plan to come back to", () => {
    expect(NOTHING_TO_SHOW, "conditional, because we cannot know — the read failed").toMatch(/if you have written one/i)
  })
})
