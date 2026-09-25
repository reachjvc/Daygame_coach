/**
 * THE DAY HALF'S RULES, ENFORCED BY THE DATABASE RATHER THAN BY THE APP.
 *
 * M1 of docs/plans/life-mastery-everything-saves.md. Every rule here is one the
 * app also keeps, and that is exactly why it is tested against a real Postgres:
 * an app-level rule is advisory — the service-role key, a script and a future
 * route all walk straight past it. `.claude/rules/database.md` says it plainly:
 * "if a rule must hold for everyone, it is a CHECK, a NOT NULL, a foreign key
 * or a trigger."
 *
 * **What this is NOT.** The plan's Check 1 asks for "your real plan in, the
 * identical plan back out" through the repo. That cannot run here and saying so
 * is better than a test that looks like it: `lifePlanRepo` talks through
 * supabase-js and this container is reached with `pg`, so a repo round trip in
 * this file would be testing a client that is not the one the app uses. The
 * mapper's round trip is a unit test (`lifePlanMapper.test.ts`); the two
 * browsers writing one account are an e2e (`life-mastery-day-persists.spec.ts`).
 * What only THIS can prove is what the schema itself refuses.
 *
 * The central one is the first: **a diary entry outlives the question that
 * asked for it, and a tick does not.** Those two rows sit in adjacent tables
 * and differ deliberately, and if that difference is ever flattened — by an
 * ALTER, by a rebuild, by somebody tidying a join — deleting one daily question
 * silently takes months of writing with it, with nothing on screen to say so.
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

const DAY = "2026-09-23"

/** A plan, one area node, one step node and one opened day. */
async function seed(userId: string) {
  const db = await getClient()
  const plan = await db.query(
    `INSERT INTO life_plans (user_id) VALUES ($1) RETURNING id`, [userId])
  const planId = plan.rows[0].id as string

  const node = async (kind: string, localId: string) =>
    (await db.query(
      `INSERT INTO life_plan_nodes (plan_id, user_id, kind, local_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [planId, userId, kind, localId])).rows[0].id as string

  const areaId = await node("area", "lm_health")
  await db.query(
    `INSERT INTO life_plan_areas (id, user_id, plan_id, position, label)
     VALUES ($1, $2, $3, 0, 'Health')`, [areaId, userId, planId])
  const stepId = await node("routine_step", "s5")

  const day = await db.query(
    `INSERT INTO life_plan_days (user_id, plan_id, on_date, note)
     VALUES ($1, $2, $3, 'a good day') RETURNING id`, [userId, planId, DAY])

  return { planId, areaId, stepId, dayId: day.rows[0].id as string }
}

describe("what you wrote outlives what asked for it", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  test("deleting the question KEEPS the answer", async () => {
    const userId = await createTestUser()
    const { dayId, stepId } = await seed(userId)
    const db = await getClient()

    await db.query(
      `INSERT INTO life_plan_day_journal (user_id, day_id, local_id, asked, body)
       VALUES ($1, $2, 's5', 'What are you grateful for?', 'coffee, the walk, the quiet')`,
      [userId, dayId])

    // The plan drops the step — which is what `save_life_plan` does to any node
    // no longer in the payload.
    await db.query(`DELETE FROM life_plan_nodes WHERE id = $1`, [stepId])

    const left = await db.query(`SELECT body, asked FROM life_plan_day_journal WHERE day_id = $1`, [dayId])
    expect(left.rows, "the diary entry survived its question being deleted").toHaveLength(1)
    expect(left.rows[0].body).toBe("coffee, the walk, the quiet")
    // And it still knows what it was answering, which is why `asked` exists:
    // the question's row is gone, so nothing else could say.
    expect(left.rows[0].asked).toBe("What are you grateful for?")
  })

  test("deleting the step DOES take its tick, because a tick means nothing without it", async () => {
    const userId = await createTestUser()
    const { dayId, stepId } = await seed(userId)
    const db = await getClient()

    await db.query(
      `INSERT INTO life_plan_day_ticks (user_id, day_id, node_id) VALUES ($1, $2, $3)`,
      [userId, dayId, stepId])
    await db.query(`DELETE FROM life_plan_nodes WHERE id = $1`, [stepId])

    const left = await db.query(`SELECT 1 FROM life_plan_day_ticks WHERE day_id = $1`, [dayId])
    expect(left.rows, "a tick on a step that no longer exists is not a record").toHaveLength(0)
  })

  test("deleting an area takes its rating", async () => {
    const userId = await createTestUser()
    const { dayId, areaId } = await seed(userId)
    const db = await getClient()

    await db.query(
      `INSERT INTO life_plan_day_ratings (user_id, day_id, area_id, rating) VALUES ($1, $2, $3, 7)`,
      [userId, dayId, areaId])
    await db.query(`DELETE FROM life_plan_nodes WHERE id = $1`, [areaId])

    const left = await db.query(`SELECT 1 FROM life_plan_day_ratings WHERE day_id = $1`, [dayId])
    expect(left.rows).toHaveLength(0)
  })
})

describe("the shapes the day half refuses", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  test("one answer per question per day", async () => {
    const userId = await createTestUser()
    const { dayId } = await seed(userId)
    const db = await getClient()
    const write = (body: string) =>
      db.query(
        `INSERT INTO life_plan_day_journal (user_id, day_id, local_id, body) VALUES ($1, $2, 'f1', $3)`,
        [userId, dayId, body])

    await write("first")
    await expect(write("second"), "a second answer to one question on one day").rejects.toThrow(
      /life_plan_day_journal_key/)
  })

  test("refuses an id the plan could never have minted", async () => {
    const userId = await createTestUser()
    const { dayId } = await seed(userId)
    const db = await getClient()

    // No foreign key guards `local_id` — that is what lets an entry outlive its
    // question — so the SHAPE check is the only thing standing between a typo
    // and a row nothing can ever match. It has to be real.
    await expect(
      db.query(
        `INSERT INTO life_plan_day_journal (user_id, day_id, local_id, body) VALUES ($1, $2, 'has a space', 'x')`,
        [userId, dayId]),
      "a malformed question id",
    ).rejects.toThrow(/life_plan_day_journal_local_shape/)
  })

  test("refuses a question longer than the column, and a rating outside 0-10", async () => {
    const userId = await createTestUser()
    const { dayId, areaId } = await seed(userId)
    const db = await getClient()

    await expect(
      db.query(
        `INSERT INTO life_plan_day_journal (user_id, day_id, local_id, asked, body) VALUES ($1, $2, 'f1', $3, 'x')`,
        [userId, dayId, "q".repeat(501)]),
    ).rejects.toThrow(/life_plan_day_journal_asked_len/)

    await expect(
      db.query(
        `INSERT INTO life_plan_day_ratings (user_id, day_id, area_id, rating) VALUES ($1, $2, $3, 11)`,
        [userId, dayId, areaId]),
    ).rejects.toThrow(/rating/)
  })

  test("a day belongs to one person and one date", async () => {
    const userId = await createTestUser()
    const { planId } = await seed(userId)
    const db = await getClient()

    await expect(
      db.query(`INSERT INTO life_plan_days (user_id, plan_id, on_date) VALUES ($1, $2, $3)`,
        [userId, planId, DAY]),
      "a second row for the same day",
    ).rejects.toThrow(/life_plan_days_key/)
  })

  test("deleting the day takes everything written on it", async () => {
    const userId = await createTestUser()
    const { dayId, areaId, stepId } = await seed(userId)
    const db = await getClient()

    await db.query(`INSERT INTO life_plan_day_ratings (user_id, day_id, area_id, rating) VALUES ($1,$2,$3,7)`, [userId, dayId, areaId])
    await db.query(`INSERT INTO life_plan_day_ticks (user_id, day_id, node_id) VALUES ($1,$2,$3)`, [userId, dayId, stepId])
    await db.query(`INSERT INTO life_plan_day_journal (user_id, day_id, local_id, body) VALUES ($1,$2,'f1','x')`, [userId, dayId])

    await db.query(`DELETE FROM life_plan_days WHERE id = $1`, [dayId])

    for (const table of ["life_plan_day_ratings", "life_plan_day_ticks", "life_plan_day_journal"]) {
      const left = await db.query(`SELECT 1 FROM ${table} WHERE day_id = $1`, [dayId])
      expect(left.rows, table).toHaveLength(0)
    }
  })
})


/**
 * THE ONE PLACE TWO DEVICES CAN LOSE WRITING, AND THE SCREEN NOW SAYS SO.
 *
 * Every other cell of the day half survives two devices: two phones ticking
 * different steps both win, because a tick is a membership and the diff carries
 * each one separately. Free text is the exception — the note is one field and
 * the save is an upsert, so the second device's sentence replaces the first's
 * with no warning.
 *
 * That was left as the plan's open question and the recommendation was to accept
 * it and say so on screen, which `DAY_NOTE_SAVED` now does on both screens that
 * draw the box. **A sentence on screen that claims a behaviour has to be checked
 * against the behaviour**, or it is one more promise in a file that never
 * changes when the storage does — which is the failure three slices hit on
 * 2026-09-25. So the claim is pinned here, against a real Postgres.
 */
describe("what two devices do to one day", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  test("the last note saved is the one kept, which is what the screen promises", async () => {
    const userId = await createTestUser()
    const { planId } = await seed(userId)
    const db = await getClient()

    const write = (note: string) =>
      db.query(
        `INSERT INTO life_plan_days (user_id, plan_id, on_date, note) VALUES ($1, $2, $3, $4)
         ON CONFLICT (plan_id, on_date) DO UPDATE SET note = EXCLUDED.note`,
        [userId, planId, DAY, note])

    await write("written on the phone")
    await write("written on the laptop")

    const left = await db.query(`SELECT note FROM life_plan_days WHERE plan_id = $1 AND on_date = $2`, [planId, DAY])
    expect(left.rows, "one row, not two — the day is the key").toHaveLength(1)
    expect(left.rows[0].note, "the second device wins, and the copy says so").toBe("written on the laptop")
  })

  /**
   * AND THE PROMISE IS NARROW, which is the half that makes it worth printing.
   * If ticks lost each other the same way, the sentence would be understating a
   * much bigger problem and pointing at the wrong field.
   */
  test("but two devices ticking different steps both win", async () => {
    const userId = await createTestUser()
    const { dayId, stepId, areaId } = await seed(userId)
    const db = await getClient()

    // Two different nodes ticked on the same day, as two devices would.
    for (const node of [stepId, areaId]) {
      await db.query(
        `INSERT INTO life_plan_day_ticks (user_id, day_id, node_id) VALUES ($1, $2, $3)
         ON CONFLICT (day_id, node_id) DO NOTHING`,
        [userId, dayId, node])
    }

    const ticks = await db.query(`SELECT node_id FROM life_plan_day_ticks WHERE day_id = $1`, [dayId])
    expect(ticks.rows, "neither device's tick replaced the other's").toHaveLength(2)
  })
})
