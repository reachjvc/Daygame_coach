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
 * unchanged, and that is what the last block here checks.
 */

import { describe, it, expect } from "vitest"
import { addGoal, emptyNsPlan, updateGoal } from "@/src/goals/northStarService"
import { goalToInsert } from "@/src/goals/northStarTrackService"
import { progressPercent, isGoalComplete, rungReached } from "@/src/db/goalProgress"

const RUN = "run-1"

/** The owner's real Body Milestones checkpoints. */
const STEPS = ["first pull-up", "visible abs", "run a 5k", "photoshoot ready"]

function staged(doneCount = 0) {
  const seed = addGoal(emptyNsPlan(), "lm_fitness", "Body Milestones", "achievement")
  const goal = seed.goals[0]
  const plan = updateGoal(seed, goal.id, {
    checkpoints: STEPS.map((title, i) => ({
      id: `c${i}`,
      title,
      done: i < doneCount,
      celebration: "",
    })),
  })
  return { plan, goal: plan.goals[0] }
}

describe("what a goal with named steps becomes", () => {
  it("carries its names across, instead of losing them", () => {
    const { plan, goal } = staged()
    const insert = goalToInsert(plan, RUN, goal)

    expect(insert.stages).toEqual(STEPS)
  })

  it("counts the steps rather than being one yes/no box", () => {
    const { plan, goal } = staged()
    const insert = goalToInsert(plan, RUN, goal)

    expect(insert.tracking_type).toBe("counter") // was "boolean"
    expect(insert.target_value).toBe(4) // was 1
    expect(insert.current_value).toBe(0)
  })

  it("remembers how many are already reached", () => {
    const { plan, goal } = staged(2)
    expect(goalToInsert(plan, RUN, goal).current_value).toBe(2)
  })

  it("gets a ladder, so every screen built for climbs can draw it", () => {
    const { plan, goal } = staged()
    const config = goalToInsert(plan, RUN, goal).milestone_config as Record<string, number>

    expect(config.start).toBe(0)
    expect(config.target).toBe(4)
    expect(config.steps).toBe(4)
  })

  it("a goal with a real ladder is not turned into stages", () => {
    // A number you climb to that also has notes on it stays a number you climb
    // to. Checkpoints only take over when there is no ladder.
    const { plan, goal } = staged(1)
    const withLadder = updateGoal(plan, goal.id, {
      ladder: { start: 22, target: 26, steps: 4, curveTension: 0, controlPoints: [], pins: [] },
    })
    const insert = goalToInsert(withLadder, RUN, withLadder.goals[0])
    expect(insert.stages).toBeUndefined()
    expect(insert.target_value).toBe(26)
  })

  it("a goal with no checkpoints is still a finish line", () => {
    const seed = addGoal(emptyNsPlan(), "lm_fun", "Ride across Vietnam", "achievement")
    const insert = goalToInsert(seed, RUN, seed.goals[0])
    expect(insert.tracking_type).toBe("boolean")
    expect(insert.target_value).toBe(1)
    expect(insert.stages).toBeUndefined()
  })
})

describe("the climb machinery works on stages with no special case", () => {
  /** The row a staged goal becomes, as `goalToInsert` builds it. */
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
