/**
 * lifePlanDayRepo against production's real `life_plan_day*` tables.
 *
 * The day half of Life Mastery: what somebody rated, ticked and wrote on each
 * day. A day is APPENDED TO, never replaced, and a save changes only the keys
 * it carries — that is what lets two devices write the same day without either
 * erasing the other. The read must page: a year of daily ratings passes the
 * 1,000-row ceiling the stack enforces exactly as production does.
 *
 * The plan, its nodes and its areas are arranged as the database owner; they
 * belong to the whole-plan save, which is not under test here.
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser, type TestUser } from "@/tests/db/harness"
import { readDayRows, readNodeIds, saveDay } from "@/src/db/lifePlanDayRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

/** A plan with two areas to rate and one habit to tick, as the plan's own save would leave it. */
async function arrangePlan(user: TestUser): Promise<string> {
  return asOwner(async (q) => {
    const [plan] = await q("insert into public.life_plans (user_id) values ($1) returning id", [user.id])
    const nodes = await q(
      `insert into public.life_plan_nodes (plan_id, user_id, kind, local_id)
       values ($1, $2, 'area', 'lm_health'), ($1, $2, 'area', 'lm_career'), ($1, $2, 'habit', 'g7')
       returning id, local_id`,
      [plan.id, user.id]
    )
    const area = (local: string) => nodes.find((n) => n.local_id === local)!.id
    await q(
      `insert into public.life_plan_areas (id, user_id, plan_id, position)
       values ($1, $3, $4, 0), ($2, $3, $4, 1)`,
      [area("lm_health"), area("lm_career"), user.id, plan.id]
    )
    return plan.id as string
  })
}

const DATE = "2026-10-12"

describe("a day in Life Mastery", () => {
  it("reads back exactly as it was written: the note, each rating, each tick and each answer", async () => {
    const user = await newUser("day")
    const planId = await arrangePlan(user)
    actAs(user)
    const ids = await readNodeIds(user.id, planId)

    await saveDay(
      user.id,
      planId,
      {
        date: DATE,
        note: "Slept well, trained.",
        ratings: { lm_health: 7, lm_career: 5 },
        ticks: { g7: true },
        journal: { f3: "Ran 5k before work." },
        asked: { f3: "What did you do for your body?" },
      },
      ids
    )

    const rows = await readDayRows(user.id, planId)
    expect(rows.days).toEqual([
      { id: expect.any(String), user_id: user.id, plan_id: planId, on_date: DATE, note: "Slept well, trained." },
    ])
    const dayId = rows.days[0].id
    expect(rows.ratings.map((r) => [r.area_id, r.rating]).sort()).toEqual(
      [
        [ids.get("lm_health"), 7],
        [ids.get("lm_career"), 5],
      ].sort()
    )
    expect(rows.ticks).toEqual([{ user_id: user.id, day_id: dayId, node_id: ids.get("g7") }])
    expect(rows.journal).toEqual([
      {
        id: expect.any(String),
        user_id: user.id,
        day_id: dayId,
        local_id: "f3",
        asked: "What did you do for your body?",
        body: "Ran 5k before work.",
      },
    ])
  })

  it("changes only what a later save carries: an omitted key keeps its value, null and false and \"\" clear one cell", async () => {
    const user = await newUser("day")
    const planId = await arrangePlan(user)
    actAs(user)
    const ids = await readNodeIds(user.id, planId)
    await saveDay(
      user.id,
      planId,
      {
        date: DATE,
        note: "Written on the phone.",
        ratings: { lm_health: 7, lm_career: 5 },
        ticks: { g7: true },
        journal: { f3: "Ran 5k." },
      },
      ids
    )

    // A second device that only touched the health rating and the habit.
    await saveDay(user.id, planId, { date: DATE, ratings: { lm_health: null }, ticks: { g7: false } }, ids)

    let rows = await readDayRows(user.id, planId)
    expect(rows.days).toHaveLength(1)
    expect(rows.days[0].note).toBe("Written on the phone.")
    expect(rows.ratings.map((r) => [r.area_id, r.rating])).toEqual([[ids.get("lm_career"), 5]])
    expect(rows.ticks).toEqual([])
    expect(rows.journal.map((j) => j.body)).toEqual(["Ran 5k."])

    // Emptying the answer removes it; the rest of the day stays.
    await saveDay(user.id, planId, { date: DATE, journal: { f3: "" } }, ids)

    rows = await readDayRows(user.id, planId)
    expect(rows.journal).toEqual([])
    expect(rows.days[0].note).toBe("Written on the phone.")
    expect(rows.ratings).toHaveLength(1)
  })

  it("reads back every day, rating, tick and answer past the 1,000-row ceiling", async () => {
    const user = await newUser("day-paging")
    const planId = await arrangePlan(user)
    const DAYS = 1001 // one past the ceiling: the smallest history a missing page can lose a row from
    await asOwner(async (q) => {
      const [health] = await q("select id from public.life_plan_nodes where plan_id = $1 and local_id = 'lm_health'", [planId])
      const [habit] = await q("select id from public.life_plan_nodes where plan_id = $1 and local_id = 'g7'", [planId])
      await q(
        `insert into public.life_plan_days (user_id, plan_id, on_date)
         select $1, $2, date '2023-01-01' + g from generate_series(0, $3 - 1) g`,
        [user.id, planId, DAYS]
      )
      await q(
        `insert into public.life_plan_day_ratings (user_id, day_id, area_id, rating)
         select $1, d.id, $3, 6 from public.life_plan_days d where d.plan_id = $2`,
        [user.id, planId, health.id]
      )
      await q(
        `insert into public.life_plan_day_ticks (user_id, day_id, node_id)
         select $1, d.id, $3 from public.life_plan_days d where d.plan_id = $2`,
        [user.id, planId, habit.id]
      )
      await q(
        `insert into public.life_plan_day_journal (user_id, day_id, local_id, body)
         select $1, d.id, 'f3', 'kept' from public.life_plan_days d where d.plan_id = $2`,
        [user.id, planId]
      )
    })
    actAs(user)

    // The ceiling is real on this stack, so this test can tell a paged read from an unpaged one.
    const unpaged = await user.client.from("life_plan_days").select("id").eq("plan_id", planId)
    expect(unpaged.data).toHaveLength(1000)

    const rows = await readDayRows(user.id, planId)

    expect(rows.days).toHaveLength(DAYS)
    expect(new Set(rows.days.map((d) => d.id)).size).toBe(DAYS)
    expect(rows.days[0].on_date).toBe("2023-01-01")
    expect(rows.days[DAYS - 1].on_date).toBe("2025-09-27")
    expect(rows.ratings).toHaveLength(DAYS)
    expect(rows.ticks).toHaveLength(DAYS)
    expect(rows.journal).toHaveLength(DAYS)
  })

  it("cannot be read or written by somebody else, whatever ids they pass", async () => {
    const owner = await newUser("day-owner")
    const intruder = await newUser("day-intruder")
    const planId = await arrangePlan(owner)
    actAs(owner)
    const ownerIds = await readNodeIds(owner.id, planId)
    await saveDay(owner.id, planId, { date: DATE, note: "Mine.", ratings: { lm_health: 8 } }, ownerIds)

    actAs(intruder)
    expect(await readNodeIds(owner.id, planId)).toEqual(new Map())
    expect(await readDayRows(owner.id, planId)).toEqual({ days: [], ratings: [], ticks: [], journal: [] })
    await expect(saveDay(intruder.id, planId, { date: DATE, note: "Overwritten." }, new Map())).rejects.toThrow(/row-level security/)
    await expect(saveDay(owner.id, planId, { date: DATE, note: "Overwritten." }, new Map())).rejects.toThrow(/row-level security/)
    // Filed under their own id against somebody else's plan: the (plan, user)
    // foreign key refuses it before row security is even asked.
    await expect(saveDay(intruder.id, planId, { date: "2026-10-11", note: "Planted." }, new Map())).rejects.toThrow(
      /Failed to open that day: insert or update on table "life_plan_days" violates foreign key constraint/
    )

    const days = await asOwner((q) =>
      q("select on_date::text, note from public.life_plan_days where plan_id = $1", [planId])
    )
    expect(days).toEqual([{ on_date: DATE, note: "Mine." }])
  })
})
