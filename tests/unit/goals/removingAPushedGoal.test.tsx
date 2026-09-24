/**
 * REMOVING A PLAN GOAL USED TO ORPHAN ITS COUNTED TWIN, SILENTLY.
 *
 * A pushed plan goal has a row in `user_goals` that counts, streaks and resets
 * on its own. Taking the goal out of the plan removed the plan half and left
 * that row running with nothing behind it — and the link went with it on the
 * next whole-plan save, so there was no way back to it from here. A goal you
 * deleted, still counting, findable only by scrolling the goals page.
 *
 * Six call sites each wrote `setPlan((p) => ns.removeGoal(p, goalId))`, so the
 * meaning of "delete" was stated six times. It is stated once now, and when a
 * link exists the removal stops and asks.
 *
 * **WHAT THIS FILE DOES NOT COVER, said rather than implied.** Every handler
 * bundle in `NorthStarFlow` is a `useMemo` with `[]` deps — deliberately, so the
 * screens below do not re-render on every keystroke. A `useCallback` closing
 * over `goalLinks` is therefore captured on the FIRST render, when the links are
 * still empty, and the question would never be asked however many goals were
 * pushed. `removePlanGoal` reads through refs for exactly that reason, and
 * NOTHING HERE PROVES IT: catching it needs the whole flow mounted, the links
 * arriving from the account, and a delete after that. The rule and the control
 * are covered below; the wiring between them is not.
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ConfirmRemove } from "@/src/goals/components/north-star/ConfirmRemove"
import { removalOf } from "@/src/goals/northStarTrackService"

describe("nothing in the plan is deleted on one click", () => {
  /**
   * Four of the six delete surfaces asked and two did not — `GuidedBuild`'s row
   * and `AreaBuilder`'s "this duplicates a routine step" tidy-up link, which
   * are the two places somebody is moving fastest. All six share this now.
   */
  it("asks before removing, and removes only on the second click", async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<ConfirmRemove title="Twenty approaches" onRemove={onRemove} />)

    await user.click(screen.getByLabelText("Remove Twenty approaches"))
    expect(onRemove, "the first click asks, it does not delete").not.toHaveBeenCalled()

    await user.click(screen.getByText("delete"))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it("keeps it when the answer is keep, and can be asked again", async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<ConfirmRemove title="Twenty approaches" onRemove={onRemove} />)

    await user.click(screen.getByLabelText("Remove Twenty approaches"))
    await user.click(screen.getByText("keep"))
    expect(onRemove).not.toHaveBeenCalled()
    // Back to the trigger rather than stuck in the asked state.
    expect(screen.getByLabelText("Remove Twenty approaches")).toBeTruthy()
  })

  /**
   * The echo tidy-up is a phrase inside a sentence, not an icon beside a row,
   * so it needs the same rule in a different shape. One component, two shapes,
   * rather than a fourth copy of the dance.
   */
  it("asks the same way when it is a link inside a sentence", async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<ConfirmRemove variant="link" label="drop it" title="Twenty approaches" onRemove={onRemove} />)

    await user.click(screen.getByText("drop it"))
    expect(onRemove).not.toHaveBeenCalled()
    await user.click(screen.getByText("delete"))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})

/**
 * WHAT REMOVING ONE MEANS, as a rule rather than as a rendering.
 *
 * Deliberately NOT asserted by reading `NorthStarFlow.tsx` for strings. A test
 * that greps the source of the thing it is testing proves the words are there,
 * not that anything happens — which is the stand-in this repo keeps paying for.
 * The rule lives in `northStarTrackService` so it can be asked directly.
 */
describe("what removing a plan goal means", () => {
  it("goes straight out when nothing counts it", () => {
    expect(removalOf("g1", {})).toEqual({ kind: "remove" })
  })

  it("stops and asks when the account counts it", () => {
    expect(removalOf("g1", { g1: "uuid-a" })).toEqual({ kind: "ask", countedId: "uuid-a" })
  })

  /**
   * The link is per goal, and the question is about THAT goal's twin. Asking
   * about the wrong row is how somebody archives a goal they meant to keep.
   */
  it("asks about this goal's own counted row, not another's", () => {
    expect(removalOf("g2", { g1: "uuid-a", g2: "uuid-b" })).toEqual({ kind: "ask", countedId: "uuid-b" })
  })

  /**
   * `pushedGoalIds` already drops a link whose row is archived or gone, so by
   * the time this is asked an empty entry means "not counted" and must not
   * produce a question about a row that is not there.
   */
  it("treats an empty link as not counted rather than asking about nothing", () => {
    expect(removalOf("g1", { g1: "" })).toEqual({ kind: "remove" })
  })
})
