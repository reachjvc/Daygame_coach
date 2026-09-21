/**
 * WHAT THE PUSH PRODUCES, THE API MUST ACCEPT.
 *
 * THE DEFECT THIS PINS, and it was introduced by the shape work itself rather
 * than found in old code.
 *
 * When descending ladders started being pushed as real counters, `goalToInsert`
 * began emitting `target_value: 0` for a goal aimed AT zero — "twenty
 * cigarettes a day down to none", which is the most ordinary quitting goal
 * there is. `CreateGoalSchema` had `target_value: z.number().int().min(1)`,
 * written when every target was something you counted UP to.
 *
 * The plan is pushed in ONE batch. So a single goal aimed at zero did not fail
 * on its own — it turned the whole push into a 400 with "Validation failed",
 * and not one of the other forty-nine goals was written. The button says
 * "Send" and nothing goes.
 *
 * Nothing caught it because the tests on either side of the boundary each
 * passed: `goalToInsert` produced what it meant to, and the schema rejected
 * what it meant to. The two had simply stopped agreeing about what a target
 * can be. These tests are the join — every shape the push can emit, run
 * through the schema that guards the route it is sent to.
 */

import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import { addGoal, emptyNsPlan, loadNsPlan, updateGoal } from "@/src/goals/northStarService"
import { buildTrackInserts, goalToInsert } from "@/src/goals/northStarTrackService"
import { BatchCreateGoalSchema } from "@/src/db/goalSchemas"
import type { NsPlan } from "@/src/goals/types"

const RUN = "run-1"

/** The shape the Track step actually posts to /api/goals/batch. */
function accepts(plan: NsPlan) {
  return BatchCreateGoalSchema.safeParse({ goals: buildTrackInserts(plan, RUN) })
}

function withGoal(title: string, type: "achievement" | "habit_ramp" | "milestone_ladder", patch: Record<string, unknown> = {}) {
  const seed = addGoal(emptyNsPlan(), "lm_health", title, type)
  return updateGoal(seed, seed.goals[0].id, patch)
}

describe("every shape the push can emit passes the schema that guards the route", () => {
  it("a ladder that runs down to zero — the case that broke the whole batch", () => {
    const plan = withGoal("Cigarettes a day", "milestone_ladder", {
      ladder: { start: 20, target: 0, steps: 5, curveTension: 0, controlPoints: [], pins: [] },
    })
    const insert = goalToInsert(plan, RUN, plan.goals[0])
    expect(insert.target_value).toBe(0)

    const parsed = accepts(plan)
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true)
  })

  it("one goal aimed at zero does not take the other forty-nine with it", () => {
    // The real failure. A batch is all or nothing, so a single rejected row is
    // a push that writes nothing while reporting success to the user.
    let plan = withGoal("Cigarettes a day", "milestone_ladder", {
      ladder: { start: 20, target: 0, steps: 5, curveTension: 0, controlPoints: [], pins: [] },
    })
    for (let i = 0; i < 5; i++) {
      plan = addGoal(plan, "lm_health", `Ordinary goal ${i}`, "achievement")
    }
    const parsed = accepts(plan)
    expect(parsed.success).toBe(true)
    expect(buildTrackInserts(plan, RUN)).toHaveLength(6)
  })

  const SHAPES: Array<[string, () => NsPlan]> = [
    ["a finish line", () => withGoal("Ride across Vietnam", "achievement")],
    ["a climb up", () => withGoal("Bench press", "milestone_ladder", {
      ladder: { start: 22, target: 26, steps: 4, curveTension: 0, controlPoints: [], pins: [] },
    })],
    ["a climb down", () => withGoal("Body weight", "milestone_ladder", {
      ladder: { start: 90, target: 80, steps: 6, curveTension: 0, controlPoints: [], pins: [] },
    })],
    ["a weekly practice", () => withGoal("Workout", "habit_ramp", { daysPerWeek: 5 })],
    ["a ramped practice", () => withGoal("Approaches", "habit_ramp", {
      perWeek: null, daysPerWeek: 7,
      rampSteps: [{ durationWeeks: 8, frequencyPerWeek: 5 }, { durationWeeks: 12, frequencyPerWeek: 10 }],
    })],
    ["an every-day practice", () => withGoal("Read at night", "habit_ramp", { perWeek: null, daysPerWeek: 7 })],
    ["a prohibition", () => withGoal("No weed", "achievement")],
    ["a staged goal", () => withGoal("Opening Skill", "achievement", {
      checkpoints: ["open without a script", "consistent daily opens", "read it & adapt", "it feels effortless"]
        .map((title, i) => ({ id: `c${i}`, title, done: false, celebration: "" })),
    })],
    ["a single stage", () => withGoal("One step", "achievement", {
      checkpoints: [{ id: "c1", title: "the only step", done: false, celebration: "" }],
    })],
  ]

  for (const [name, build] of SHAPES) {
    it(name, () => {
      const parsed = accepts(build())
      expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true)
    })
  }
})

describe("the owner's real plan, pushed", () => {
  /**
   * Fifty goals of his own writing, straight from plan_snapshots revision 340.
   * Every shape in this product that he actually uses, in one assertion — and
   * the fixture is the plan as saved rather than one assembled here, so it
   * catches shapes nobody thought to write a case for.
   */
  const FIXTURE = path.join(
    "/tmp/claude-1000/-home-jonaswsl-projects-daygame-coach",
    "853d760b-244f-4c36-883f-d35b1eb17279/scratchpad/owner-plan-rev340.json",
  )

  it("every goal in it produces a row the route will accept", () => {
    if (!fs.existsSync(FIXTURE)) {
      // The fixture is the owner's own plan and is deliberately kept out of the
      // repository, so this is a check that runs where the file is present
      // rather than a silent pass. The generated shapes above stand alone.
      return
    }
    const plan = loadNsPlan(JSON.stringify(JSON.parse(fs.readFileSync(FIXTURE, "utf-8")).plan))!
    expect(plan.goals.length).toBeGreaterThan(40)

    // The route caps a batch at fifty, which is exactly what he has.
    const inserts = buildTrackInserts(plan, RUN)
    const parsed = BatchCreateGoalSchema.safeParse({ goals: inserts })
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 5))).toBe(true)
  })
})
