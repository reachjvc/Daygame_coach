/**
 * CHANGING A GOAL'S KIND TAKES THE OLD KIND'S STRUCTURE WITH IT.
 *
 * THE DEFECT THESE PIN. The goals editor is live inside Life Mastery's Track
 * step, and it can change a row's kind. It only ever SENT the new kind, so the
 * old kind's structure stayed on the row: turn a Target into a Finish line and
 * its ladder was still there; turn it into a Practice and the ladder sat
 * beside the new ramp.
 *
 * Untidy while nothing read the leftovers. Not untidy since progress began
 * counting from `milestone_config.start` on 2026-09-19: a Practice carrying a
 * stale ladder that starts at 70 reports the first of four runs as below zero,
 * and a Finish line carrying one reports a percentage at all.
 *
 * AND A PROHIBITION THAT STOPS BEING ONE. `is_abstinence` makes a goal daily
 * and suppresses its streaks. A row turned into a climb or a finish line is
 * neither, so the flag goes with the shape.
 *
 * Only structure is cleared. Nothing earned and nothing typed — the title, the
 * why, the count, the streak — is touched by any of this.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createFakeSupabase, type Row } from "../../helpers/fakeSupabase"
import { updateGoal } from "@/src/db/goalRepo"

const tables: Record<string, Row[]> = { user_goals: [], daily_goal_snapshots: [] }

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(async () => fake),
  createAdminSupabaseClient: vi.fn(() => fake),
}))

const fake = createFakeSupabase(tables, { upsertKey: (r) => `${r.goal_id}|${r.snapshot_date}` })

const USER = "user-1"
const TZ = "Europe/Copenhagen"

function row(over: Partial<Row> = {}): Row {
  return {
    id: "g1",
    user_id: USER,
    title: "Bench Press 1RM",
    category: "fitness",
    life_area: "fitness",
    tracking_type: "counter",
    goal_type: "milestone",
    period: "custom",
    period_start_date: "2026-09-07",
    target_value: 100,
    current_value: 85,
    current_streak: 4,
    best_streak: 6,
    is_active: true,
    is_archived: false,
    linked_metric: null,
    milestone_config: { start: 70, target: 100, steps: 5 },
    ramp_steps: null,
    stages: null,
    is_abstinence: false,
    motivation_note: "It is the lift I care about",
    position: 0,
    streak_freezes_available: 0,
    streak_freezes_used: 0,
    last_freeze_date: null,
    aligned_values: [],
    created_at: "2026-09-07T00:00:00Z",
    ...over,
  }
}

const saved = () => tables.user_goals.find((g) => g.id === "g1")!

beforeEach(() => {
  tables.user_goals = [row()]
})

describe("a climb that becomes something else drops its ladder", () => {
  it("turned into a finish line", async () => {
    await updateGoal(USER, "g1", { tracking_type: "boolean", target_value: 1 }, TZ)

    expect(saved().milestone_config).toBeNull()
    expect(saved().stages).toBeNull()
  })

  it("turned into a practice", async () => {
    // A practice counts from zero every period. A ladder starting at 70 would
    // report the first of four runs as below zero.
    await updateGoal(USER, "g1", { goal_type: "habit_ramp", target_value: 4, period: "weekly" }, TZ)

    expect(saved().milestone_config).toBeNull()
    expect(saved().goal_type).toBe("habit_ramp")
  })

  it("a staged climb loses its stages too", async () => {
    tables.user_goals = [row({ stages: ["first pull-up", "visible abs"], target_value: 2 })]

    await updateGoal(USER, "g1", { tracking_type: "boolean", target_value: 1 }, TZ)

    expect(saved().stages).toBeNull()
  })
})

describe("a practice that becomes something else drops its ramp", () => {
  it("turned into a climb", async () => {
    tables.user_goals = [row({
      goal_type: "habit_ramp", target_value: 5, milestone_config: null,
      ramp_steps: [{ frequencyPerWeek: 5, durationWeeks: 8 }],
    })]

    await updateGoal(USER, "g1", { goal_type: "milestone", tracking_type: "counter" }, TZ)

    expect(saved().ramp_steps).toBeNull()
  })

  it("a prohibition that becomes a climb stops being one", async () => {
    // `is_abstinence` makes a goal daily and suppresses its streaks. A climb
    // is neither daily nor streak-free.
    tables.user_goals = [row({
      goal_type: "recurring", tracking_type: "boolean", period: "daily",
      target_value: 1, milestone_config: null, is_abstinence: true,
    })]

    await updateGoal(USER, "g1", { goal_type: "milestone", tracking_type: "counter", target_value: 30 }, TZ)

    expect(saved().is_abstinence).toBe(false)
  })
})

describe("what is never cleared", () => {
  it("the count, the streaks, the title and the why all survive", async () => {
    await updateGoal(USER, "g1", { tracking_type: "boolean", target_value: 1 }, TZ)

    expect(saved().current_value).toBe(85)
    expect(saved().current_streak).toBe(4)
    expect(saved().best_streak).toBe(6)
    expect(saved().title).toBe("Bench Press 1RM")
    expect(saved().motivation_note).toBe("It is the lift I care about")
  })

  it("an edit that does not change the shape leaves everything alone", async () => {
    await updateGoal(USER, "g1", { title: "Bench Press", target_value: 120 }, TZ)

    expect(saved().milestone_config).toMatchObject({ start: 70, target: 100 })
    expect(saved().title).toBe("Bench Press")
    expect(saved().target_value).toBe(120)
  })

  it("re-sending the same shape is not a change", async () => {
    await updateGoal(USER, "g1", { goal_type: "milestone", tracking_type: "counter" }, TZ)

    expect(saved().milestone_config).toMatchObject({ start: 70, target: 100 })
  })

  it("a caller that sends its own structure is not overruled", async () => {
    // Changing shape AND supplying the new shape's data in one call must keep
    // what was supplied, not blank it.
    await updateGoal(
      USER,
      "g1",
      { goal_type: "habit_ramp", ramp_steps: [{ frequencyPerWeek: 3, durationWeeks: 4 }] as unknown as Record<string, unknown>[] },
      TZ,
    )

    expect(saved().ramp_steps).toHaveLength(1)
    expect(saved().milestone_config).toBeNull()
  })
})
