import { describe, it, expect, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { applyLifePlanChanges, ensureLifePlan, readLifePlan } from "@/src/db/lifePlanRepo"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import { diffPlanRows } from "@/src/goals/lifePlanDiff"
import { addCustomStep, addGoal, emptyNsPlan, goalActions, updateGoal } from "@/src/goals/northStarService"
import { GOAL_ACTIONS_BLUEPRINT_ID } from "@/src/goals/data/northStar"
import type { PlanRows } from "@/src/db/lifePlanTypes"
import type { NsPlan } from "@/src/goals/types"

/**
 * A GOAL'S HABITS BECOME ROUTINE STEPS (Plans/life-plan-rebuild.md, Phase 4, Q5).
 *
 * Two promises, both about the person's existing habit rows, and both only
 * checkable against the real database:
 *
 *   1. THE APP NEVER DELETES THEM. It stops reading them, and the change-only
 *      save removes whatever it read and did not write back — so a read that
 *      still carried them would have deleted every one on the first save.
 *   2. THE COPY (migration 20261104170000) MAKES EACH ACTION ONE STEP, links a
 *      step the plan already runs instead of copying it, skips placeholders,
 *      and adds nothing when it runs a second time.
 */

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const NOW = "2026-11-04T12:00:00.000Z"
const MIGRATION = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261104170000_goal_habits_become_steps.sql"),
  "utf8",
)

async function personWithPlan(label: string) {
  const user = await newUser(label)
  actAs(user)
  const { id: planId } = await ensureLifePlan(user.id)
  const minted = new Map<string, string>()
  const rows = (plan: NsPlan): PlanRows =>
    planToRows(plan, {
      planId,
      userId: user.id,
      idFor: (local) => minted.get(local) ?? minted.set(local, randomUUID()).get(local)!,
    })
  return { user, planId, rows, minted }
}

describe("a goal's habits, once routine steps", () => {
  it("are left out of the read, kept through a save, and copied into steps exactly once", async () => {
    const { user, planId, rows, minted } = await personWithPlan("habits-to-steps")
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Body weight 80 kg", "milestone_ladder", NOW)
    plan = addGoal(plan, "lm_fitness", "Waist 80 cm", "milestone_ladder", NOW)
    plan = addGoal(plan, "lm_money", "400 deep work hours", "milestone_ladder", NOW)
    plan = addCustomStep(plan, plan.routines[0].id, "Ninety minutes of deep work", 90, 5, NOW)
    const deepStep = plan.routines[0].steps.at(-1)!
    const [weight, waist, deep] = plan.goals
    expect(await applyLifePlanChanges(diffPlanRows(null, rows(plan)), 0, user.id)).toBe(1)

    // The habit rows the old save wrote: one action under two goals, one that
    // matches a step the plan already runs, and a placeholder.
    const habits: Array<[string, string, number, boolean]> = [
      [weight.id, "Train, and hit your protein", 4, false],
      [waist.id, "train, and hit your protein ", 4, false],
      [deep.id, "Ninety minutes of deep work", 5, false],
      [deep.id, "Work toward: 400 deep work hours", 3, true],
    ]
    await asOwner(async (q) => {
      for (const [i, [goal, title, days, placeholder]] of habits.entries()) {
        const [node] = await q(
          `insert into life_plan_nodes (plan_id, user_id, kind, local_id) values ($1, $2, 'habit', $3) returning id`,
          [planId, user.id, `h90${i}`],
        )
        await q(
          `insert into life_plan_goal_habits (id, user_id, goal_id, node_kind, position, title, days_per_week, placeholder, routine_days, source_target_id)
           values ($1, $2, $3, 'habit', $4, $5, $6, $7, '[]'::jsonb, null)`,
          [node.id, user.id, minted.get(goal), i, title, days, placeholder],
        )
      }
    })
    const habitCount = async () =>
      Number((await asOwner((q) => q(`select count(*) from life_plan_goal_habits where user_id = $1`, [user.id])))[0].count)
    expect(await habitCount()).toBe(4)

    // 1. Left out of the read, nodes and all…
    const read = (await readLifePlan(user.id))!
    expect(read.rows.habits).toEqual([])
    expect(read.rows.nodes.some((n) => n.kind === "habit")).toBe(false)
    // …and an ordinary save from that read leaves every one of them alone.
    const loaded = rowsToPlan(read.rows)!
    const edited = updateGoal(loaded, weight.id, { title: "Body weight 78 kg" }, NOW)
    await applyLifePlanChanges(diffPlanRows(read.rows, rows(edited)), read.revision, user.id)
    expect(await habitCount()).toBe(4)

    // 2. The copy.
    await asOwner((q) => q(MIGRATION))
    const after = (await readLifePlan(user.id))!
    expect(after.revision).toBeGreaterThan(read.revision + 1)
    expect(after.rows.seq).toBeGreaterThan(read.rows.seq)
    const copied = rowsToPlan(after.rows)!

    const actionRoutines = copied.routines.filter((r) => r.blueprintId === GOAL_ACTIONS_BLUEPRINT_ID)
    expect(actionRoutines.map((r) => r.label)).toEqual(["Fitness actions"])
    const train = goalActions(copied, weight.id)
    expect(train.map((a) => [a.title, a.daysPerWeek, a.routineLabel])).toEqual([["Train, and hit your protein", 4, "Fitness actions"]])
    // One step for the two goals that named it.
    expect(goalActions(copied, waist.id).map((a) => a.id)).toEqual([train[0].id])
    // The step it already ran, linked rather than copied; the placeholder, not at all.
    expect(goalActions(copied, deep.id).map((a) => a.id)).toEqual([deepStep.id])
    expect(copied.routines.flatMap((r) => r.steps).some((s) => s.title.startsWith("Work toward"))).toBe(false)
    // The rows it came from are still there, for Phase 7 to decide.
    expect(await habitCount()).toBe(4)

    // A second run adds nothing.
    const count = (table: string) =>
      asOwner(async (q) => Number((await q(`select count(*) from ${table} where user_id = $1`, [user.id]))[0].count))
    const before = [await count("life_plan_routines"), await count("life_plan_routine_steps"), await count("life_plan_step_serves")]
    await asOwner((q) => q(MIGRATION))
    expect([await count("life_plan_routines"), await count("life_plan_routine_steps"), await count("life_plan_step_serves")]).toEqual(before)
  })
})
