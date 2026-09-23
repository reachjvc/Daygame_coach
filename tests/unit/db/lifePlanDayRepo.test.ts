/**
 * WHAT ONE DAY'S SAVE HANDS THE DATABASE.
 *
 * Run against the fake query builder rather than a mocked repo, because the
 * thing worth pinning is the ROW: which columns a patch writes, which it leaves
 * alone, and which id each table is keyed by. A mock would only prove a
 * function was called.
 *
 * The rule under all of it, and the reason the day half is not part of the
 * whole-plan save: **absent is not null.** A patch changes the keys it carries
 * and nothing else, so two devices writing different parts of one day both win
 * and neither erases the other.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createFakeSupabase, type Row } from "@/tests/helpers/fakeSupabase"

let tables: Record<string, Row[]> = {}

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: async () =>
    createFakeSupabase(tables, {
      // Each day table has its own identity, and the repo names it with
      // `onConflict` on every upsert — the fake honours that, so nothing here
      // has to guess from a row's shape.
      upsertKey: (r: Row) => String(r.id),
    }),
}))

import { saveDay, readDayRows, readNodeIds } from "@/src/db/lifePlanDayRepo"

const USER = "11111111-1111-4111-8111-111111111111"
const OTHER = "99999999-9999-4999-8999-999999999999"
const PLAN = "22222222-2222-4222-8222-222222222222"
const AREA_UUID = "33333333-3333-4333-8333-333333333333"
const STEP_UUID = "44444444-4444-4444-8444-444444444444"
const DAY = "2026-09-23"

/** The plan's own ids, as the route resolves them before calling the repo. */
const ids = () => new Map([["lm_health", AREA_UUID], ["s5", STEP_UUID]])

beforeEach(() => {
  tables = {
    life_plans: [{ id: PLAN, user_id: USER }],
    life_plan_nodes: [
      { id: AREA_UUID, user_id: USER, plan_id: PLAN, local_id: "lm_health", kind: "area" },
      { id: STEP_UUID, user_id: USER, plan_id: PLAN, local_id: "s5", kind: "routine_step" },
    ],
    life_plan_days: [],
    life_plan_day_ratings: [],
    life_plan_day_ticks: [],
    life_plan_day_journal: [],
  }
})

describe("saveDay writes the day and its cells", () => {
  it("opens the day with its owner, its plan and the person's own calendar date", async () => {
    await saveDay(USER, PLAN, { date: DAY, note: "a good day" }, ids())

    expect(tables.life_plan_days).toEqual([
      expect.objectContaining({ user_id: USER, plan_id: PLAN, on_date: DAY, note: "a good day" }),
    ])
  })

  it("stamps the owner on every child row, never taking it from the caller's payload", async () => {
    await saveDay(
      USER,
      PLAN,
      { date: DAY, ratings: { lm_health: 7 }, ticks: { s5: true }, journal: { s5: "three gratitudes" } },
      ids(),
    )

    for (const table of ["life_plan_day_ratings", "life_plan_day_ticks", "life_plan_day_journal"]) {
      expect(tables[table], table).toHaveLength(1)
      expect(tables[table][0].user_id, table).toBe(USER)
    }
  })

  it("resolves a rating and a tick to the node's UUID, and the journal to the plan's own id", async () => {
    await saveDay(
      USER,
      PLAN,
      { date: DAY, ratings: { lm_health: 7 }, ticks: { s5: true }, journal: { s5: "coffee, the walk" }, asked: { s5: "What are you grateful for?" } },
      ids(),
    )

    expect(tables.life_plan_day_ratings[0]).toMatchObject({ area_id: AREA_UUID, rating: 7 })
    expect(tables.life_plan_day_ticks[0]).toMatchObject({ node_id: STEP_UUID })
    // NOT a UUID. The journal keys on the plan's own id, which is what lets an
    // answer outlive the question that asked for it.
    expect(tables.life_plan_day_journal[0]).toMatchObject({
      local_id: "s5",
      asked: "What are you grateful for?",
      body: "coffee, the walk",
    })
  })
})

describe("absent is not null", () => {
  it("a patch with no note leaves a note another device wrote", async () => {
    await saveDay(USER, PLAN, { date: DAY, note: "written on the laptop" }, ids())
    await saveDay(USER, PLAN, { date: DAY, ticks: { s5: true } }, ids())

    expect(tables.life_plan_days[0].note).toBe("written on the laptop")
  })

  it("a patch with no ratings cannot empty the day's ratings", async () => {
    await saveDay(USER, PLAN, { date: DAY, ratings: { lm_health: 7 } }, ids())
    await saveDay(USER, PLAN, { date: DAY, note: "only a note this time" }, ids())

    expect(tables.life_plan_day_ratings).toHaveLength(1)
  })

  it("writes one day row for one date, however many times it is saved", async () => {
    await saveDay(USER, PLAN, { date: DAY, note: "first" }, ids())
    await saveDay(USER, PLAN, { date: DAY, note: "second" }, ids())

    expect(tables.life_plan_days).toHaveLength(1)
    expect(tables.life_plan_days[0].note).toBe("second")
  })
})

describe("clearing one cell", () => {
  it("null clears that rating and leaves the day", async () => {
    await saveDay(USER, PLAN, { date: DAY, ratings: { lm_health: 7 }, note: "kept" }, ids())
    await saveDay(USER, PLAN, { date: DAY, ratings: { lm_health: null } }, ids())

    expect(tables.life_plan_day_ratings).toEqual([])
    expect(tables.life_plan_days[0].note).toBe("kept")
  })

  it("false takes the tick back", async () => {
    await saveDay(USER, PLAN, { date: DAY, ticks: { s5: true } }, ids())
    await saveDay(USER, PLAN, { date: DAY, ticks: { s5: false } }, ids())

    expect(tables.life_plan_day_ticks).toEqual([])
  })

  it("an emptied entry is removed rather than stored blank", async () => {
    await saveDay(USER, PLAN, { date: DAY, journal: { s5: "something" } }, ids())
    await saveDay(USER, PLAN, { date: DAY, journal: { s5: "   " } }, ids())

    expect(tables.life_plan_day_journal).toEqual([])
  })
})

describe("reading it back", () => {
  it("hands back only this plan's days, and the ids the browser talks in", async () => {
    await saveDay(USER, PLAN, { date: DAY, note: "mine", ratings: { lm_health: 7 } }, ids())
    // Somebody else's day, in the same tables.
    tables.life_plan_days.push({ id: "other-day", user_id: OTHER, plan_id: "other-plan", on_date: DAY, note: "theirs" })

    const rows = await readDayRows(USER, PLAN)
    expect(rows.days.map((d) => d.note)).toEqual(["mine"])

    const map = await readNodeIds(USER, PLAN)
    expect(map.get("lm_health")).toBe(AREA_UUID)
    expect(map.get("s5")).toBe(STEP_UUID)
  })

  it("keeps a journal entry whose question the plan no longer has", async () => {
    await saveDay(USER, PLAN, { date: DAY, journal: { f9: "written under a question since deleted" } }, ids())

    const rows = await readDayRows(USER, PLAN)
    expect(rows.journal.map((j) => j.local_id)).toEqual(["f9"])
  })
})
