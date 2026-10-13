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
import { decideOnLoad, canSave, planHasNothingWritten } from "@/src/goals/lifePlanSync"
import { recordIsEmpty, recordOf } from "@/src/goals/lifePlanDayService"
import type { NsPlan } from "@/src/goals/types"
import { addGoal, emptyNsPlan, setNorthStar } from "@/src/goals/northStarService"

describe("a read that failed is not an account with nothing in it", () => {
  it("is its own decision, and saving is refused under it", () => {
    const decision = decideOnLoad({ server: undefined, browser: null })

    expect(decision.kind, "not start-empty, which is what an empty ACCOUNT is").toBe("stay-local")
    expect(canSave(decision, true), "this browser does not know what it would overwrite").toBe(false)
  })
})

/**
 * WHICH GATE DECIDES "THERE IS NOTHING TO SHOW" — and it is neither of the two
 * predicates that nearly mean it.
 *
 * **Correcting `adebd402`, which stated a cause I had not verified.** That commit
 * said the banner's first version never appeared because `planIsUntouched`
 * counts the plan's SEEDED areas and routines as evidence. That is false, and a
 * probe says so: `planIsUntouched(emptyNsPlan())` is `true`, seeded areas and
 * all. The real reason is narrower — it also asks `areasTouched`, which inspects
 * the ROUTINES, and a plan that has been through this browser's own storage
 * round trip no longer matches the seed. Nothing to do with the person.
 *
 * And `planHasNothingWritten` alone is wrong in the other direction: it does not
 * look at the day half at all, so it answers true for somebody whose browser
 * holds a rating or a day note — who would then be told there is nothing to
 * show while looking at their own writing.
 *
 * So the gate is the claim, assembled from the two functions that each own half
 * of it: nothing written AND no day half. Asserted below as a DISAGREEMENT,
 * because that is what makes both halves necessary — if they ever answered the
 * same everywhere, one would be redundant and a caller picking either would
 * fail nothing. (That framing is the vice session's, from the same shape on the
 * Black Box.)
 */
describe("the gate that decides whether there is anything to show", () => {
  const withARating = (): NsPlan => ({ ...emptyNsPlan(), daily: { "2026-09-25": { lm_health: 7 } } })

  it("says a fresh plan holds nothing written, seeded areas and all", () => {
    const fresh = emptyNsPlan()

    expect(fresh.areas.length, "it IS seeded").toBeGreaterThan(0)
    expect(planHasNothingWritten(fresh)).toBe(true)
    expect(recordIsEmpty(recordOf(fresh)), "and no day half").toBe(true)
  })

  it("and says a plan with one sentence in it does not", () => {
    expect(planHasNothingWritten(setNorthStar(emptyNsPlan(), "A house I chose."))).toBe(false)
  })

  it("nor one with a single goal", () => {
    const plan = emptyNsPlan()
    expect(planHasNothingWritten(addGoal(plan, plan.areas[0].id, "Run a half marathon"))).toBe(false)
  })

  /**
   * THE DISAGREEMENT THAT MAKES BOTH HALVES NECESSARY. A browser whose only
   * content is a day rating has nothing WRITTEN and does have something to SHOW.
   * One predicate cannot answer that, which is why the banner asks both.
   */
  it("disagrees on a browser holding only a day rating, which is the point", () => {
    const plan = withARating()

    expect(planHasNothingWritten(plan), "the plan half is untouched").toBe(true)
    expect(recordIsEmpty(recordOf(plan)), "and yet there is something on screen").toBe(false)
  })
})
