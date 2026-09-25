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
import { dayRowsToRecord, recordToPatches, type DayRecord } from "@/src/goals/lifePlanDayService"
import type { DayRows } from "@/src/db/lifePlanDayTypes"
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


/**
 * A YEAR OF DAYS, which is the other half of Check 1's wording.
 *
 * The plan half above drives `save_life_plan`, the real write. **The day half
 * cannot be driven the same way and this is the honest limitation of this
 * block:** `saveDay` is a set of supabase-js upserts rather than a database
 * function, so there is nothing in Postgres to call. The upserts below mirror
 * it — same tables, same conflict targets — and a mirror is a second copy of
 * the write that can drift from the first. What it therefore proves is narrower
 * than the plan half, and worth stating rather than implying:
 *
 *   - the SCHEMA accepts a real year: 365 days, 4,380 ratings, 1,095 ticks and
 *     730 journal answers, with every constraint, unique key and length cap in
 *     force. Nothing here is a fixture small enough to pass by accident.
 *   - `dayRowsToRecord` rebuilds the exact four maps from rows that came out of
 *     Postgres rather than out of a literal.
 *   - and the day rows and the plan rows coexist, which is the relationship the
 *     whole 25-table design exists to keep safe.
 *
 * What it does NOT prove is the paging in `readDayRows`, which lives in the
 * supabase-js layer above: at this volume the ratings table alone is past a
 * default page, and only a real PostgREST read can say whether the second page
 * arrives. That gap is `readDayRows`'s, not the schema's, and it is still open.
 */
const YEAR_FROM = "2025-01-01"
const DAYS_IN_A_YEAR = 365

/** Dates walked as plain strings, so no clock and no timezone is involved. */
function everyDay(from: string, n: number): string[] {
  const [y, m, d] = from.split("-").map(Number)
  const out: string[] = []
  for (let i = 0; i < n; i += 1) {
    const at = new Date(Date.UTC(y, m - 1, d + i))
    out.push(at.toISOString().slice(0, 10))
  }
  return out
}

describe("a year of days goes in and comes back the same year", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  test("365 days of ratings, ticks, notes and journal survive the schema", async () => {
    const userId = await createTestUser()
    const db = await getClient()
    const planId = (await db.query(
      `INSERT INTO life_plans (user_id) VALUES ($1) RETURNING id`, [userId])).rows[0].id as string

    // The plan first, because every day row points into it.
    const plan = fullPlan()
    const rows = planToRows(plan, context(planId, userId))
    await db.query(`SELECT set_config('test.uid', $1, true)`, [userId])
    await db.query(`SELECT save_life_plan($1::jsonb, $2)`, [JSON.stringify(rows), 0])

    const localIds = await db.query(
      `SELECT local_id, id, kind FROM life_plan_nodes WHERE plan_id = $1`, [planId])
    const idFor = new Map<string, string>(localIds.rows.map((r) => [r.local_id, r.id]))
    const areas = localIds.rows.filter((r) => r.kind === "area").map((r) => r.local_id)
    const steps = localIds.rows.filter((r) => r.kind === "routine_step").map((r) => r.local_id)
    expect(areas.length, "twelve areas, or the rating volume below is not real").toBe(12)
    expect(steps.length, "the fixture's steps, or the ticks below are not real").toBeGreaterThan(2)

    /* A real year rather than a token one: every area rated every day, every
       step ticked every day, a line about the day, and two journal answers. */
    const record: DayRecord = { daily: {}, logged: {}, notes: {}, journal: {} }
    for (const [i, date] of everyDay(YEAR_FROM, DAYS_IN_A_YEAR).entries()) {
      record.daily[date] = Object.fromEntries(areas.map((a, j) => [a, (i + j) % 11]))
      record.logged[date] = [...steps]
      record.notes[date] = `Day ${i + 1}: what actually happened.`
      record.journal[date] = { [steps[0]]: `Grateful for day ${i + 1}.`, [steps[1]]: `Tomorrow: day ${i + 2}.` }
    }

    /* `recordToPatches` is the real function the client sends through. The SQL
       under it mirrors `saveDay`; see this block's header for why that is a
       weaker claim than the plan half's. */
    for (const patch of recordToPatches(record)) {
      const day = await db.query(
        `INSERT INTO life_plan_days (user_id, plan_id, on_date, note) VALUES ($1, $2, $3, $4)
         ON CONFLICT (plan_id, on_date) DO UPDATE SET note = EXCLUDED.note RETURNING id`,
        [userId, planId, patch.date, patch.note ?? ""])
      const dayId = day.rows[0].id as string

      for (const [local, rating] of Object.entries(patch.ratings ?? {})) {
        await db.query(
          `INSERT INTO life_plan_day_ratings (user_id, day_id, area_id, rating) VALUES ($1, $2, $3, $4)
           ON CONFLICT (day_id, area_id) DO UPDATE SET rating = EXCLUDED.rating`,
          [userId, dayId, idFor.get(local), rating])
      }
      for (const local of Object.keys(patch.ticks ?? {})) {
        await db.query(
          `INSERT INTO life_plan_day_ticks (user_id, day_id, node_id) VALUES ($1, $2, $3)
           ON CONFLICT (day_id, node_id) DO NOTHING`,
          [userId, dayId, idFor.get(local)])
      }
      for (const [local, body] of Object.entries(patch.journal ?? {})) {
        await db.query(
          `INSERT INTO life_plan_day_journal (user_id, day_id, local_id, asked, body) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (day_id, local_id) DO UPDATE SET body = EXCLUDED.body, asked = EXCLUDED.asked`,
          [userId, dayId, local, "What are you grateful for?", body])
      }
    }

    // The volume is asserted, not assumed: a year that quietly wrote 3 days
    // would pass every comparison below.
    const counts = await db.query(
      `SELECT (SELECT count(*) FROM life_plan_days WHERE plan_id = $1) AS days,
              (SELECT count(*) FROM life_plan_day_ratings WHERE user_id = $2) AS ratings,
              (SELECT count(*) FROM life_plan_day_ticks WHERE user_id = $2) AS ticks,
              (SELECT count(*) FROM life_plan_day_journal WHERE user_id = $2) AS journal`,
      [planId, userId])
    expect(Number(counts.rows[0].days)).toBe(DAYS_IN_A_YEAR)
    expect(Number(counts.rows[0].ratings)).toBe(DAYS_IN_A_YEAR * 12)
    expect(Number(counts.rows[0].journal)).toBe(DAYS_IN_A_YEAR * 2)

    /* Read back in the SAME order the repo orders by, because `dayRowsToRecord`
       walks the arrays and a different order is a different answer for
       `logged`. */
    const jsonRows = async (sql: string, params: unknown[]) =>
      (await db.query(sql, params)).rows.map((r) => r.row)
    const back: DayRows = {
      days: await jsonRows(
        `SELECT to_jsonb(t) AS row FROM life_plan_days t WHERE plan_id = $1 ORDER BY on_date, id`, [planId]) as DayRows["days"],
      ratings: await jsonRows(
        `SELECT to_jsonb(t) AS row FROM life_plan_day_ratings t WHERE user_id = $1 ORDER BY day_id, area_id`, [userId]) as DayRows["ratings"],
      ticks: await jsonRows(
        `SELECT to_jsonb(t) AS row FROM life_plan_day_ticks t WHERE user_id = $1 ORDER BY day_id, node_id`, [userId]) as DayRows["ticks"],
      journal: await jsonRows(
        `SELECT to_jsonb(t) AS row FROM life_plan_day_journal t WHERE user_id = $1 ORDER BY day_id, local_id`, [userId]) as DayRows["journal"],
    }

    const localIdFor = new Map([...idFor].map(([local, id]) => [id, local]))
    const got = dayRowsToRecord(back, localIdFor)

    expect(got.notes, "every line about a day").toEqual(record.notes)
    expect(got.daily, "every rating on every area on every day").toEqual(record.daily)
    expect(got.journal, "every journal answer, under the question it answered").toEqual(record.journal)
    /* `logged` comes back in the order the rows were read, so it is compared as
       a set per day — the plan treats it as one and `stepTickedByHand` asks
       `includes`. */
    for (const date of Object.keys(record.logged)) {
      expect([...(got.logged[date] ?? [])].sort(), `the ticks on ${date}`).toEqual([...record.logged[date]].sort())
    }
  })
})
