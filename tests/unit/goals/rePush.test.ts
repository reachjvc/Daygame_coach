/**
 * PRESSING TRACK AGAIN ON A GOAL YOU CORRECTED.
 *
 * THE DEFECT THESE PIN. A second push did nothing at all. `createGoalBatch`
 * found the existing row by its `template_id`, mapped the temporary id onto
 * it, pushed it into the returned array and moved on — there was no update
 * branch anywhere in the function — and the route answered 201, so the screen
 * said the goals had been sent.
 *
 * So a shape corrected in the plan could never reach a row already pushed.
 * That is why the fifteen rows repaired on 2026-09-20 had to be repaired by a
 * migration: the button that exists for exactly this job silently did nothing.
 *
 * THE HALF THAT MUST NOT CHANGE. A re-push updates what you TYPED and never
 * what you have EARNED. Rename a goal, fix its shape, push again — the count,
 * the streak, the best streak and the period start stay where they were. The
 * second block here is the more important one: a repair that resets a counter
 * is worse than no repair.
 *
 * AND IT IS OPT-IN. This function is shared. The catalogue picker and the
 * goal-graph mapper call it too, and for them a repeat means somebody adding
 * the same template twice — overwriting a title they had edited by hand would
 * be a worse bug than the one being fixed. The default is still to skip.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createFakeSupabase, type Row } from "../../helpers/fakeSupabase"
import { createGoalBatch } from "@/src/db/goalRepo"

const tables: Record<string, Row[]> = { user_goals: [], daily_goal_snapshots: [] }

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(async () => fake),
  createAdminSupabaseClient: vi.fn(() => fake),
}))

const fake = createFakeSupabase(tables, {
  upsertKey: (r) => `${r.goal_id}|${r.snapshot_date}`,
})

const USER = "user-1"
const TZ = "Europe/Copenhagen"
const TAG = "ns:run-1:g1"

/** A goal already pushed, with a month of progress logged against it. */
function existing(over: Partial<Row> = {}): Row {
  return {
    id: "row-1",
    user_id: USER,
    template_id: TAG,
    title: "Body Weight",
    category: "fitness",
    life_area: "fitness",
    tracking_type: "boolean",
    goal_type: "milestone",
    period: "custom",
    period_start_date: "2026-08-03",
    target_value: 1,
    current_value: 0,
    current_streak: 7,
    best_streak: 9,
    is_active: true,
    is_archived: false,
    linked_metric: null,
    milestone_config: null,
    ramp_steps: null,
    stages: null,
    is_abstinence: false,
    position: 0,
    streak_freezes_available: 0,
    streak_freezes_used: 0,
    last_freeze_date: null,
    aligned_values: [],
    created_at: "2026-08-03T00:00:00Z",
    ...over,
  }
}

/** The corrected goal, as `goalToInsert` now builds it: a real climb. */
function corrected(over: Record<string, unknown> = {}) {
  return {
    _tempId: "g1",
    _tempParentId: null,
    template_id: TAG,
    title: "Body Weight",
    category: "fitness",
    life_area: "fitness",
    tracking_type: "counter" as const,
    goal_type: "milestone" as const,
    period: "custom" as const,
    target_value: 80,
    current_value: 90,
    milestone_config: { start: 90, target: 80, steps: 6 },
    ...over,
  }
}

const saved = () => tables.user_goals.find((g) => g.id === "row-1")!

beforeEach(() => {
  tables.user_goals = [existing()]
  tables.daily_goal_snapshots = []
})

describe("a corrected goal reaches the row it was pushed to", () => {
  it("the shape is updated instead of silently skipped", async () => {
    await createGoalBatch(USER, [corrected()], TZ, "updateAuthored")

    expect(saved().tracking_type).toBe("counter")
    expect(saved().target_value).toBe(80)
    expect(saved().milestone_config).toMatchObject({ start: 90, target: 80 })
  })

  it("a rename reaches it too", async () => {
    await createGoalBatch(USER, [corrected({ title: "Bodyweight to 80 kg" })], TZ, "updateAuthored")
    expect(saved().title).toBe("Bodyweight to 80 kg")
  })

  it("named stages and the prohibition flag come across", async () => {
    await createGoalBatch(
      USER,
      [corrected({ stages: ["first pull-up", "visible abs"], is_abstinence: true })],
      TZ,
      "updateAuthored",
    )
    expect(saved().stages).toEqual(["first pull-up", "visible abs"])
    expect(saved().is_abstinence).toBe(true)
  })

  it("and the row comes back, so the screen reports what really happened", async () => {
    const out = await createGoalBatch(USER, [corrected()], TZ, "updateAuthored")
    expect(out).toHaveLength(1)
    expect(out[0].target_value).toBe(80)
  })
})

describe("what you earned is never touched", () => {
  it("the count, the streak and the period start all survive", async () => {
    tables.user_goals = [existing({ current_value: 42, current_streak: 7, best_streak: 9 })]

    await createGoalBatch(USER, [corrected({ current_value: 90 })], TZ, "updateAuthored")

    // `current_value` is on the insert and must NOT be copied over: 42 is a
    // month of logging, 90 is where the plan says the climb begins.
    expect(saved().current_value).toBe(42)
    expect(saved().current_streak).toBe(7)
    expect(saved().best_streak).toBe(9)
    expect(saved().period_start_date).toBe("2026-08-03")
  })

  it("those four fields are not in the authored list at all", async () => {
    // A field added to AUTHORED_FIELDS by mistake would show up here as a
    // changed number rather than as a passing test somewhere else.
    tables.user_goals = [existing({ current_value: 3, current_streak: 5, best_streak: 11 })]
    const before = { ...saved() }

    await createGoalBatch(USER, [corrected({ current_value: 999, current_streak: 999 })], TZ, "updateAuthored")

    expect(saved().current_value).toBe(before.current_value)
    expect(saved().current_streak).toBe(before.current_streak)
    expect(saved().best_streak).toBe(before.best_streak)
  })
})

describe("it is opt-in, because this function is shared", () => {
  it("by default a repeat is still skipped", async () => {
    await createGoalBatch(USER, [corrected({ title: "Overwritten" })], TZ)

    expect(saved().title).toBe("Body Weight")
    expect(saved().tracking_type).toBe("boolean")
  })

  it("omitting the option entirely behaves as skip", async () => {
    const out = await createGoalBatch(USER, [corrected({ title: "Overwritten" })], TZ)
    expect(out).toHaveLength(1)
    expect(saved().title).toBe("Body Weight")
  })

  it("a heuristic match is never overwritten, even when asked", async () => {
    /* The other two duplicate rules — same linked metric, same title in the
       same area — are guesses. A guess must not overwrite what somebody wrote,
       so only the tag branch updates. */
    tables.user_goals = [existing({ template_id: null, title: "Body Weight" })]

    await createGoalBatch(
      USER,
      [{ ...corrected({ title: "Body Weight" }), template_id: undefined }],
      TZ,
      "updateAuthored",
    )

    expect(saved().tracking_type).toBe("boolean")
    expect(saved().target_value).toBe(1)
  })
})

describe("a goal that is not there yet is still created", () => {
  it("the ordinary first push is unaffected", async () => {
    tables.user_goals = []

    const out = await createGoalBatch(USER, [corrected()], TZ, "updateAuthored")

    expect(out).toHaveLength(1)
    expect(tables.user_goals).toHaveLength(1)
    expect(tables.user_goals[0].target_value).toBe(80)
    expect(tables.user_goals[0].current_value).toBe(90)
  })
})
