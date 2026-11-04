import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser, type TestUser } from "@/tests/db/harness"
import { applyLifePlanChanges, ensureLifePlan, readLifePlan, StalePlanError } from "@/src/db/lifePlanRepo"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import { diffPlanRows } from "@/src/goals/lifePlanDiff"
import { removeGoal, setAnswer, updateGoal } from "@/src/goals/northStarService"
import { fullPlan, withoutDays } from "@/tests/support/fullLifePlan"
import type { PlanRows } from "@/src/db/lifePlanTypes"
import type { NsPlan } from "@/src/goals/types"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

/** A signed-in person with an empty plan row, and a mapper that keeps its ids for the whole visit. */
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
  return { user, planId, rows }
}

/** Every row of the person's plan in one table, as the database holds it. */
function tableOf(user: TestUser, table: string) {
  return asOwner((q) => q(`select * from public.${table} where user_id = $1 order by 1`, [user.id]))
}

describe("saving only what changed", () => {
  it("a full plan sent as changes comes back the same plan", async () => {
    const { user, rows } = await personWithPlan("changes-full")
    const plan = fullPlan()
    const after = rows(plan)

    expect(await applyLifePlanChanges(diffPlanRows(null, after), 0, user.id)).toBe(1)

    const stored = await readLifePlan(user.id)
    expect(withoutDays(rowsToPlan(stored!.rows)!)).toEqual(withoutDays(plan))
  })

  it("one changed goal writes that goal and leaves every other row as it was", async () => {
    const { user, rows } = await personWithPlan("changes-one")
    const plan = fullPlan()
    await applyLifePlanChanges(diffPlanRows(null, rows(plan)), 0, user.id)
    const valuesBefore = await tableOf(user, "life_plan_values")
    const goalsBefore = await tableOf(user, "life_plan_goals")

    const goal = plan.goals[0]
    const edited = updateGoal(plan, goal.id, { title: "Renamed on purpose" })
    const changes = diffPlanRows(rows(plan), rows(edited))
    expect(Object.keys(changes.upsert)).toEqual(["goals"])
    expect(await applyLifePlanChanges(changes, 1, user.id)).toBe(2)

    const goalsAfter = await tableOf(user, "life_plan_goals")
    const changed = goalsAfter.filter((g) => JSON.stringify(g) !== JSON.stringify(goalsBefore.find((b) => b.id === g.id)))
    expect(changed.map((g) => g.title)).toEqual(["Renamed on purpose"])
    // The values were not touched at all: same rows, same ids.
    expect(await tableOf(user, "life_plan_values")).toEqual(valuesBefore)
  })

  it("a removed goal takes its own parts with it and nothing else", async () => {
    const { user, rows } = await personWithPlan("changes-remove")
    const plan = fullPlan()
    await applyLifePlanChanges(diffPlanRows(null, rows(plan)), 0, user.id)
    const goal = plan.goals.find((g) => g.checkpoints.length > 0) ?? plan.goals[0]

    const without = removeGoal(plan, goal.id)
    await applyLifePlanChanges(diffPlanRows(rows(plan), rows(without)), 1, user.id)

    // Compared with what the mapper makes of the plan, not the plan itself: the
    // flow's copy still names the removed goal from a step and a sub-step, and
    // the mapper drops both references, as the database's cascade does.
    const stored = await readLifePlan(user.id)
    expect(withoutDays(rowsToPlan(stored!.rows)!)).toEqual(withoutDays(rowsToPlan(rows(without))!))
  })

  it("a page that loaded only part of the plan cannot delete the part it never saw", async () => {
    const { user, rows } = await personWithPlan("changes-partial")
    const plan = fullPlan()
    await applyLifePlanChanges(diffPlanRows(null, rows(plan)), 0, user.id)
    const goalsBefore = await tableOf(user, "life_plan_goals")

    const valuesBefore = await tableOf(user, "life_plan_values")

    // Nothing known, and a plan missing every goal and every value: the old
    // save deleted them all.
    await applyLifePlanChanges(diffPlanRows(null, rows({ ...plan, goals: [], values: [], currentValues: [] })), 1, user.id)

    expect((await tableOf(user, "life_plan_goals")).map((g) => g.id)).toEqual(goalsBefore.map((g) => g.id))
    expect((await tableOf(user, "life_plan_values")).length).toBeGreaterThanOrEqual(valuesBefore.length)
  })

  it("a changed answer replaces the answers whole, so no prompt is answered twice", async () => {
    const { user, planId, rows } = await personWithPlan("changes-answers")
    const plan = fullPlan()
    await applyLifePlanChanges(diffPlanRows(null, rows(plan)), 0, user.id)

    // A new visit mints new ids for the answers, which the account has never seen.
    const minted = new Map<string, string>()
    const visit = (p: NsPlan) =>
      planToRows(p, { planId, userId: user.id, idFor: (l) => minted.get(l) ?? minted.set(l, randomUUID()).get(l)! })
    const prompt = Object.keys(plan.answers)[0] ?? "why"
    await applyLifePlanChanges(diffPlanRows(visit(plan), visit(setAnswer(plan, prompt, "Said again"))), 1, user.id)

    const answers = await tableOf(user, "life_plan_answers")
    const keys = answers.map((a) => `${a.kind}:${a.prompt_id}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(answers.find((a) => a.kind === "answer" && a.prompt_id === prompt)?.body).toBe("Said again")
  })

  it("refuses a change built on a stale revision", async () => {
    const { user, rows } = await personWithPlan("changes-stale")
    const plan = fullPlan()
    await applyLifePlanChanges(diffPlanRows(null, rows(plan)), 0, user.id)

    const edited = updateGoal(plan, plan.goals[0].id, { title: "Late" })
    await expect(applyLifePlanChanges(diffPlanRows(rows(plan), rows(edited)), 0, user.id)).rejects.toBeInstanceOf(
      StalePlanError,
    )
  })

  it("refuses to write into somebody else's plan", async () => {
    const owner = await personWithPlan("changes-owner")
    await applyLifePlanChanges(diffPlanRows(null, owner.rows(fullPlan())), 0, owner.user.id)
    const goalsBefore = await tableOf(owner.user, "life_plan_goals")

    const intruder = await newUser("changes-intruder")
    actAs(intruder)
    const plan = fullPlan()
    const edited = updateGoal(plan, plan.goals[0].id, { title: "Not yours" })
    await expect(
      applyLifePlanChanges(diffPlanRows(owner.rows(plan), owner.rows(edited)), 1, intruder.id),
    ).rejects.toThrow(/not yours/)

    expect(await tableOf(owner.user, "life_plan_goals")).toEqual(goalsBefore)
  })

  it("never writes the link to a counted goal, even when called directly with one", async () => {
    const { user, planId, rows } = await personWithPlan("changes-link")
    const changes = diffPlanRows(null, rows(fullPlan()))
    const claimed = randomUUID()
    // Straight to the function, past the repo that strips the link.
    const goals = (changes.upsert.goals ?? []).map((g) => ({ ...g, user_id: user.id, user_goal_id: claimed }))
    const stamped = Object.fromEntries(
      Object.entries(changes.upsert).map(([t, list]) => [t, (list ?? []).map((r) => ({ ...r, user_id: user.id }))]),
    )
    const { error } = await user.client.rpc("apply_life_plan_changes", {
      p_changes: { ...changes, plan_id: planId, upsert: { ...stamped, goals } },
      p_expected_rev: 0,
    })
    expect(error).toBeNull()
    const written = await tableOf(user, "life_plan_goals")
    expect(written.length).toBeGreaterThan(0)
    expect(written.map((g) => g.user_goal_id)).toEqual(written.map(() => null))
  })

  it("cannot be pointed at a table outside the plan, the day tables included", async () => {
    const { user, planId } = await personWithPlan("changes-days")
    const changes = { plan_id: planId, plan: {}, upsert: { days: [{ id: randomUUID() }] }, remove: {}, replace: [] }
    await expect(applyLifePlanChanges(changes as never, 0, user.id)).rejects.toThrow(/cannot reach "days"/)
  })
})
