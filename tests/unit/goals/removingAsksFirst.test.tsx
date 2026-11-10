// @vitest-environment jsdom
/**
 * NOTHING IN THE PLAN IS DELETED ON ONE CLICK.
 *
 * Every delete surface in the plan asks first, through one control. (This file
 * also covered the question about a goal's counted twin in the old goals
 * table; Phase 7 of Plans/life-plan-rebuild.md removed those copies and the
 * question with them.)
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ConfirmRemove } from "@/src/goals/components/north-star/ConfirmRemove"

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
