/**
 * A GOAL REACHED BY NAMED STEPS.
 *
 * THE DEFECT THESE PIN, from the owner's live plan on 2026-09-19. Three of his
 * goals — "Body Milestones", "Opening Skill" and "Abundance Stages" — each
 * carry four named checkpoints: first pull-up, visible abs, run a 5k,
 * photoshoot ready. Twelve named steps in all.
 *
 * `goalToInsert` emitted no checkpoint field of any kind, so all twelve became
 * three yes/no boxes. Worse than the descending ladders, which at least kept
 * their numbers in the description as prose: the description on those three
 * rows in the database is EMPTY. The names existed only in the browser.
 *
 * Stages are ordered and reached in order, so a staged goal is an ordinary
 * climb from zero — which means the work already done for climbs applies to it
 * unchanged, and that is what this file checks. (The half that turned a plan
 * goal into a `user_goals` row went with the Track step's copies in Phase 7 of
 * Plans/life-plan-rebuild.md.)
 */

import { describe, it, expect } from "vitest"
import { progressPercent, isGoalComplete, rungReached } from "@/src/db/goalProgress"

describe("the climb machinery works on stages with no special case", () => {
  /** A staged goal's row: four named steps, `reached` of them done. */
  const row = (reached: number) => ({
    current_value: reached,
    target_value: 4,
    milestone_config: { start: 0, target: 4, steps: 4 },
  })

  it("progress is steps reached out of steps total", () => {
    expect(progressPercent(row(0))).toBe(0)
    expect(progressPercent(row(1))).toBe(25)
    expect(progressPercent(row(2))).toBe(50)
    expect(progressPercent(row(4))).toBe(100)
  })

  it("it is finished when the last step is", () => {
    expect(isGoalComplete(row(3))).toBe(false)
    expect(isGoalComplete(row(4))).toBe(true)
  })

  it("each stage lights as it is reached — the notifications along the way", () => {
    expect(rungReached(row(2), 1)).toBe(true)
    expect(rungReached(row(2), 2)).toBe(true)
    expect(rungReached(row(2), 3)).toBe(false)
  })
})
