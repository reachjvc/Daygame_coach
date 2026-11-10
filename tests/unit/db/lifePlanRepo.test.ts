/**
 * WHAT THE PLAN REPO ACTUALLY SENDS.
 *
 * Every test here asserts the PAYLOAD, not that a call happened. A repo test
 * that only checks "it called rpc" passes just as well when the rpc is sent the
 * wrong revision or somebody else's user id — the ways this file can lose
 * somebody's data.
 *
 * The write-coverage ratchet has no slack left (131 of 131), so all three
 * writes here ship classified "asserted" rather than adding to the debt.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { createFakeSupabase, type Row, type RpcCall } from "@/tests/helpers/fakeSupabase"

const tables: Record<string, Row[]> = {}
const calls: RpcCall[] = []
let rpcResult: (call: RpcCall) => { data: unknown; error: unknown } = () => ({ data: 1, error: null })

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: async () =>
    createFakeSupabase(tables, { calls, rpcResult: (c) => rpcResult(c) }),
}))

import {
  ensureLifePlan,
  readLifePlan,
  applyLifePlanChanges,
  StalePlanError,
  planIsInUse,
} from "@/src/db/lifePlanRepo"
import type { PlanChanges } from "@/src/db/lifePlanTypes"

const USER = "11111111-1111-1111-1111-111111111111"
const PLAN = "aaaaaaaa-0000-0000-0000-000000000001"

const EMPTY_TABLES = [
  "life_plans", "life_plan_nodes", "life_plan_north_stars", "life_plan_areas",
  "life_plan_goals", "life_plan_goal_checkpoints", "life_plan_goal_obstacles",
  "life_plan_goal_beliefs", "life_plan_goal_feeds",
  "life_plan_goal_serves", "life_plan_routines", "life_plan_routine_serves",
  "life_plan_routine_steps", "life_plan_routine_split_days", "life_plan_step_serves",
  "life_plan_experiences", "life_plan_fields", "life_plan_sub_steps",
  "life_plan_values", "life_plan_answers",
]

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key]
  for (const t of EMPTY_TABLES) tables[t] = []
  calls.length = 0
  rpcResult = () => ({ data: 1, error: null })
})

function changes(upsert: PlanChanges["upsert"] = {}): PlanChanges {
  return { plan_id: PLAN, plan: {}, upsert, remove: {}, replace: [] }
}

describe("saving the plan", () => {
  it("sends the revision it was given, so the lock can refuse a stale save", async () => {
    await applyLifePlanChanges(changes(), 7, USER)
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe("apply_life_plan_changes")
    expect(calls[0].args.p_expected_rev).toBe(7)
  })

  it("turns the revision lock into a typed refusal rather than a generic failure", async () => {
    rpcResult = () => ({ data: null, error: { code: "55000", message: "Plan revision is 4 but the save was built on 2" } })
    await expect(applyLifePlanChanges(changes(), 2, USER)).rejects.toBeInstanceOf(StalePlanError)
  })

  it("fails loudly when the save returns no revision", async () => {
    // A swallowed failure here looks exactly like a successful save until the
    // next reload, which is when the evening's work turns out to be gone.
    rpcResult = () => ({ data: null, error: null })
    await expect(applyLifePlanChanges(changes(), 0, USER)).rejects.toThrow(/cannot be trusted to have run/)
  })

  it("passes a real database error on rather than reporting success", async () => {
    rpcResult = () => ({ data: null, error: { code: "23503", message: "violates foreign key" } })
    await expect(applyLifePlanChanges(changes(), 0, USER)).rejects.toThrow(/violates foreign key/)
  })

  it("stamps the signed-in owner on every row, whatever the browser sent", async () => {
    const goals = [{ id: "g-1", user_id: "someone-else", title: "One" }]
    const areas = [{ id: "a-1", user_id: "someone-else", label: "Health" }]

    await applyLifePlanChanges(changes({ goals, areas }), 0, USER)
    const sent = calls[0].args.p_changes as PlanChanges

    // The owner is a fact about the session, never a claim in the body. Row
    // security would refuse a foreign one, but not sending it beats relying on
    // the database to catch it — and the browser does not know its own uuid.
    expect((sent.upsert.goals as { user_id: string; title: string }[])[0]).toMatchObject({ user_id: USER, title: "One" })
    expect((sent.upsert.areas as { user_id: string }[])[0].user_id).toBe(USER)
  })
})

describe("starting a plan", () => {
  it("returns the existing one rather than making a second", async () => {
    tables.life_plans = [{ id: PLAN, user_id: USER, revision: 4, seq: 9 }]
    const found = await ensureLifePlan(USER)
    expect(found.id).toBe(PLAN)
    expect(found.revision).toBe(4)
    expect(found.seq).toBe(9)
    // Nothing was inserted: a second plan row would break the one-per-user key
    // and, worse, split somebody's plan across two of them.
    expect(tables.life_plans).toHaveLength(1)
  })

  it("makes one for an account that has none, owned by that account", async () => {
    await ensureLifePlan(USER)
    expect(tables.life_plans).toHaveLength(1)
    // The owner is the whole point: a plan row with the wrong user_id is a plan
    // its owner cannot see and nobody else can either.
    expect(tables.life_plans[0].user_id).toBe(USER)
  })
})

describe("reading the plan", () => {
  it("returns null for an account with no plan, which is not an empty plan", async () => {
    // The two must stay tellable apart: an empty plan returned here would be
    // saved straight over the real one by the flow.
    expect(await readLifePlan(USER)).toBeNull()
  })

  it("hands back the revision beside the rows", async () => {
    tables.life_plans = [{ id: PLAN, user_id: USER, revision: 5, version: 1, seq: 2 }]
    tables.life_plan_goals = [
      { id: "g-1", user_id: USER, plan_id: PLAN },
      { id: "g-2", user_id: USER, plan_id: PLAN },
    ]
    const stored = await readLifePlan(USER)
    expect(stored?.revision).toBe(5)
    expect(stored?.rows.goals.map((g) => g.id).sort()).toEqual(["g-1", "g-2"])
  })

  it("drops a child row whose parent is not in this plan", async () => {
    tables.life_plans = [{ id: PLAN, user_id: USER, revision: 0, version: 1, seq: 0 }]
    tables.life_plan_goals = [{ id: "g-1", user_id: USER, plan_id: PLAN }]
    tables.life_plan_goal_checkpoints = [
      { id: "c-1", user_id: USER, goal_id: "g-1" },
      { id: "c-2", user_id: USER, goal_id: "g-gone" },
    ]
    const stored = await readLifePlan(USER)
    expect(stored?.rows.checkpoints.map((c) => c.id)).toEqual(["c-1"])
  })
})

describe("planIsInUse", () => {
  it("is true with one goal being worked on", async () => {
    tables.life_plan_goals = [{ id: "g-1", user_id: USER, status: "active" }]
    expect(await planIsInUse(USER)).toBe(true)
  })

  it("is true with no goals and one routine step", async () => {
    tables.life_plan_routine_steps = [{ id: "s-1", user_id: USER }]
    expect(await planIsInUse(USER)).toBe(true)
  })

  it("is false with only a paused goal and no steps", async () => {
    tables.life_plan_goals = [{ id: "g-1", user_id: USER, status: "paused" }]
    expect(await planIsInUse(USER)).toBe(false)
  })
})
