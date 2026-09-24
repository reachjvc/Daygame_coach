/**
 * CHECK 1: YOUR PLAN GOES INTO A REAL POSTGRES AND COMES BACK THE SAME PLAN.
 *
 * `docs/plans/life-mastery-everything-saves.md` named this file in its manifest
 * and it was never written. What stood in for it — `lifePlanDay.integration.
 * test.ts` — says in its own header that it is NOT this, and matching the
 * manifest against `ls` was enough to read the gap as closed for a week.
 *
 * **What the in-memory round trip cannot see.** `lifePlanMapper.test.ts` sends
 * the same fixture through `planToRows` and `rowsToPlan` and asserts it comes
 * back identical. That proves the mapper agrees with itself. It cannot see a
 * column the database refuses, a CHECK that rejects a value the mapper is happy
 * to emit, a cascade that removes a row on the way in, a `NOT NULL` nobody
 * declared in TypeScript, or a JSON round trip through `jsonb` that changes a
 * number's type. Every one of those is a plan that saves in a test and fails —
 * or worse, silently loses a field — against the real thing.
 *
 * So the middle of this round trip is Postgres, and not a hand-written INSERT
 * either: it is `save_life_plan`, the same function the app calls, with the
 * same JSONB payload the repo sends it.
 *
 * The fixture is shared with the in-memory test on purpose. Two copies drift,
 * and the one that drifts is the one proving less.
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import { fullPlan, withoutDays } from "@/tests/support/fullLifePlan"
import type { PlanRows } from "@/src/db/lifePlanTypes"

/**
 * The tables the repo reads, keyed by the field they land in.
 *
 * Written out rather than derived, because the point of this test is to notice
 * when the two lists stop agreeing. A field the repo reads and this does not is
 * a field this test would silently stop checking.
 */
const TABLES: Array<[keyof PlanRows, string, "plan" | "user"]> = [
  ["nodes", "life_plan_nodes", "plan"],
  ["north_stars", "life_plan_north_stars", "plan"],
  ["areas", "life_plan_areas", "plan"],
  ["goals", "life_plan_goals", "plan"],
  ["routines", "life_plan_routines", "plan"],
  ["steps", "life_plan_routine_steps", "user"],
  ["split_days", "life_plan_routine_split_days", "user"],
  ["experiences", "life_plan_experiences", "plan"],
  ["fields", "life_plan_fields", "plan"],
  ["sub_steps", "life_plan_sub_steps", "plan"],
  ["values", "life_plan_values", "plan"],
  ["answers", "life_plan_answers", "plan"],
  ["checkpoints", "life_plan_goal_checkpoints", "user"],
  ["obstacles", "life_plan_goal_obstacles", "user"],
  ["beliefs", "life_plan_goal_beliefs", "user"],
  ["habits", "life_plan_goal_habits", "user"],
  ["goal_feeds", "life_plan_goal_feeds", "user"],
  ["goal_serves", "life_plan_goal_serves", "user"],
  ["routine_serves", "life_plan_routine_serves", "user"],
  ["step_serves", "life_plan_step_serves", "user"],
]

/** Deterministic ids, exactly as the repo's own `idFor` is. */
function context(planId: string, userId: string) {
  const minted = new Map<string, string>()
  let n = 0
  return {
    planId,
    userId,
    idFor(localId: string): string {
      const had = minted.get(localId)
      if (had) return had
      n += 1
      return minted.set(localId, `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`).get(localId)!
    },
  }
}

/**
 * Read every table back, in the shape `rowsToPlan` expects.
 *
 * **`to_jsonb(t)` RATHER THAN `SELECT *`, AND IT IS NOT A STYLE CHOICE.** The
 * app reads through PostgREST, which renders every column as JSON: a `DATE`
 * arrives as `"2027-06-01"`. The `pg` driver used here parses it into a
 * JavaScript `Date` at LOCAL midnight instead — `2027-05-31T22:00:00.000Z` on
 * this container — and `normalizeNsPlan` correctly refuses a non-string, so
 * every goal's target date came back null and read exactly like the database
 * losing it. It is not: the row is right, the driver differs from the one the
 * app uses, and a test that models the transport wrongly reports a defect that
 * does not exist. (Had it silently `toISOString()`-ed that Date instead, the
 * date would have been a day early — the bug class this repo has hit three
 * times.) Asking Postgres for the JSON makes this read what the app's read is.
 */
async function readBack(planId: string, userId: string): Promise<PlanRows> {
  const db = await getClient()
  const plan = await db.query(`SELECT to_jsonb(t) AS row FROM life_plans t WHERE id = $1`, [planId])
  const p = plan.rows[0].row as Record<string, unknown>
  const out: Record<string, unknown> = {
    plan_id: planId,
    user_id: userId,
    version: p.version,
    seq: p.seq,
    season_focus_id: p.season_focus_id,
    updated_at: p.updated_at,
  }
  for (const [field, table, on] of TABLES) {
    const col = on === "plan" ? "plan_id" : "user_id"
    const val = on === "plan" ? planId : userId
    const got = await db.query(`SELECT to_jsonb(t) AS row FROM ${table} t WHERE ${col} = $1`, [val])
    out[field] = got.rows.map((r) => r.row)
  }
  return out as unknown as PlanRows
}

describe("a plan that goes through a real Postgres comes back the same plan", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  /**
   * THE TEST ABOVE THE TEST.
   *
   * A round trip over an empty table is the strongest possible pass over
   * nothing, and three of these twenty were empty when this file was written:
   * `answers`, because the fixture used keys the loader prunes, and
   * `split_days` and `step_serves`, because nothing had ever put one in it. The
   * in-memory round trip had been green over all three for as long as it had
   * existed. So the coverage is asserted before the round trip is trusted.
   */
  test("the fixture actually fills every table this reads", async () => {
    const rows = planToRows(fullPlan(), context("p", "u")) as unknown as Record<string, unknown[]>
    const empty = TABLES.map(([field]) => field).filter((f) => (rows[f] ?? []).length === 0)
    expect(
      empty,
      "these tables round-trip nothing, so the assertion below says nothing about them",
    ).toEqual([])
  })

  test("every part of a full plan survives save_life_plan and the read", async () => {
    const userId = await createTestUser()
    const db = await getClient()
    const planId = (await db.query(
      `INSERT INTO life_plans (user_id) VALUES ($1) RETURNING id`, [userId])).rows[0].id as string

    const plan = fullPlan()
    const rows = planToRows(plan, context(planId, userId))

    /* THE REAL WRITE PATH. `save_life_plan(p_rows, p_expected_rev)` is what
       `/api/life-plan` calls, taking the same JSONB the repo sends. A
       hand-written INSERT here would be a second copy of the write and would
       agree with itself exactly as the in-memory test does. */
    await db.query(`SELECT set_config('test.uid', $1, true)`, [userId])
    const saved = await db.query(`SELECT save_life_plan($1::jsonb, $2) AS revision`, [JSON.stringify(rows), 0])
    expect(saved.rows[0].revision, "the save bumps the revision it was built on").toBe(1)

    const back = rowsToPlan(await readBack(planId, userId))
    expect(back, "a plan that went in and could not come out at all").not.toBeNull()

    /* `updatedAt` is the database's and the day half is not carried by the
       whole-plan save, by design — both are asserted elsewhere. Everything
       else has to match field for field. */
    expect(withoutDays(back!)).toEqual(withoutDays(plan))
  })

  /**
   * THE HALF THE MAPPER CANNOT TEST: what the database refuses.
   *
   * A revision lock that does not hold is the failure with no cure — two
   * devices, and the second save silently wins over work it never saw. The app
   * turns this error code into a 409 and stops saving; here it is the raise
   * itself.
   */
  test("a save built on a stale revision is refused, not merged", async () => {
    const userId = await createTestUser()
    const db = await getClient()
    const planId = (await db.query(
      `INSERT INTO life_plans (user_id) VALUES ($1) RETURNING id`, [userId])).rows[0].id as string

    const rows = planToRows(fullPlan(), context(planId, userId))
    await db.query(`SELECT set_config('test.uid', $1, true)`, [userId])
    await db.query(`SELECT save_life_plan($1::jsonb, $2)`, [JSON.stringify(rows), 0])

    await expect(
      db.query(`SELECT save_life_plan($1::jsonb, $2)`, [JSON.stringify(rows), 0]),
      "the second device quoted revision 0 and the plan has moved on",
    ).rejects.toThrow(/revision/i)
  })

  /**
   * SAVING THE SAME PLAN TWICE KEEPS THE IDS.
   *
   * The whole day half hangs off node ids by foreign key, so a save that
   * re-minted them would take a year of ticks with it — the one failure the
   * 25-table design exists to prevent. `save_life_plan` upserts for this
   * reason, and nothing in TypeScript can say so.
   */
  test("re-saving an unchanged plan keeps every node id", async () => {
    const userId = await createTestUser()
    const db = await getClient()
    const planId = (await db.query(
      `INSERT INTO life_plans (user_id) VALUES ($1) RETURNING id`, [userId])).rows[0].id as string

    const rows = planToRows(fullPlan(), context(planId, userId))
    await db.query(`SELECT set_config('test.uid', $1, true)`, [userId])
    await db.query(`SELECT save_life_plan($1::jsonb, $2)`, [JSON.stringify(rows), 0])
    const first = (await db.query(`SELECT id FROM life_plan_nodes WHERE plan_id = $1 ORDER BY id`, [planId])).rows

    await db.query(`SELECT save_life_plan($1::jsonb, $2)`, [JSON.stringify(rows), 1])
    const second = (await db.query(`SELECT id FROM life_plan_nodes WHERE plan_id = $1 ORDER BY id`, [planId])).rows

    expect(first.length, "the fixture has nodes, or this passes on an empty table").toBeGreaterThan(5)
    expect(second, "a re-mint here takes every tick and every journal line with it").toEqual(first)
  })
})
