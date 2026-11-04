/**
 * A NUMBER BOX'S DAYS (Plans/life-plan-rebuild.md, Phase 6), against the real
 * `life_plan_day_numbers`: a number is written, changed, cleared and read back
 * by the plan's own ids; a decimal comes back a number; the box's removal takes
 * its numbers; and another account can neither read one nor write one.
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, asUser, newUser, type TestUser } from "@/tests/db/harness"
import { readDayRows, readNodeIds, saveDay } from "@/src/db/lifePlanDayRepo"
import { dayRowsToRecord } from "@/src/goals/lifePlanDayService"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

/** A plan with two number boxes, as the plan's own save would leave it. */
async function arrangePlan(user: TestUser): Promise<string> {
  return asOwner(async (q) => {
    const [plan] = await q("insert into public.life_plans (user_id) values ($1) returning id", [user.id])
    const nodes = await q(
      `insert into public.life_plan_nodes (plan_id, user_id, kind, local_id)
       values ($1, $2, 'field', 'f1'), ($1, $2, 'field', 'f2') returning id, local_id`,
      [plan.id, user.id],
    )
    for (const [i, n] of nodes.entries()) {
      await q(
        `insert into public.life_plan_fields (id, user_id, plan_id, position, label, kind) values ($1, $2, $3, $4, $5, 'number')`,
        [n.id, user.id, plan.id, i, n.local_id === "f1" ? "Approaches" : "Kilos"],
      )
    }
    return plan.id as string
  })
}

const DATE = "2026-11-04"

describe("a number on a day", () => {
  it("is written, changed, cleared and read back by the plan's own ids", async () => {
    const user = await newUser("numbers")
    const planId = await arrangePlan(user)
    actAs(user)
    const ids = await readNodeIds(user.id, planId)
    const local = new Map([...ids].map(([l, id]) => [id, l]))
    const read = async () => dayRowsToRecord(await readDayRows(user.id, planId), local).numbers

    await saveDay(user.id, planId, { date: DATE, numbers: { f1: 5, f2: 81.5 } }, ids)
    expect(await read()).toEqual({ [DATE]: { f1: 5, f2: 81.5 } })

    // A patch naming one box leaves the other alone; null clears one.
    await saveDay(user.id, planId, { date: DATE, numbers: { f1: 0 } }, ids)
    await saveDay(user.id, planId, { date: DATE, numbers: { f2: null } }, ids)
    expect(await read()).toEqual({ [DATE]: { f1: 0 } })

    // The box goes, and its numbers with it…
    await asOwner((q) => q(`delete from public.life_plan_nodes where id = $1`, [ids.get("f1")]))
    expect(await read()).toEqual({})
    // …and a clear sent for it afterwards is no error: there is nothing left to clear.
    const now = await readNodeIds(user.id, planId)
    await expect(saveDay(user.id, planId, { date: DATE, numbers: { f1: null } }, now)).resolves.toBeUndefined()
  })

  it("is its owner's alone", async () => {
    const owner = await newUser("numbers-owner")
    const planId = await arrangePlan(owner)
    actAs(owner)
    const ids = await readNodeIds(owner.id, planId)
    await saveDay(owner.id, planId, { date: DATE, numbers: { f1: 5 } }, ids)
    const [day] = await asOwner((q) => q(`select id from public.life_plan_days where plan_id = $1`, [planId]))

    const other = await newUser("numbers-other")
    const seen = await asUser(other.id, (q) => q(`select value from public.life_plan_day_numbers where day_id = $1`, [day.id]))
    expect(seen).toEqual([])
    await expect(
      asUser(other.id, (q) =>
        q(`insert into public.life_plan_day_numbers (user_id, day_id, node_id, value) values ($1, $2, $3, 1)`, [
          other.id, day.id, ids.get("f2"),
        ]),
      ),
    ).rejects.toThrow(/life_plan_day_numbers_day_fk/)
  })
})
