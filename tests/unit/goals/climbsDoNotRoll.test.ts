/**
 * A CLIMB HAS NO PERIOD, SO IT NEVER ROLLS.
 *
 * THE DEFECT THESE PIN. The period roll sets `current_value` back to zero at
 * every period boundary, and it did that to ANY row whose period had gone
 * stale — including the ones that do not repeat at all.
 *
 * The goals editor, which is live inside Life Mastery's Track step, hides the
 * period control for a Milestone and sends no period at all. `createGoal` then
 * filled the gap with "weekly". So "Squat 1RM, climb to 200 kg" was filed as a
 * weekly goal, and every Monday the weight you had logged was set back to
 * zero. It could never be finished. Seventy-four live rows are in that state,
 * six of them carrying progress.
 *
 * The same rule un-ticked an UNDATED finish line every New Year, for the same
 * reason: no period sent, `yearly` inherited, `yearly` rolls.
 *
 * These run the real repo against a stand-in for Supabase, so what is asserted
 * is the value that comes back out of the row — what the page would show,
 * rather than the shape of a query.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createFakeSupabase, type Row } from "../../helpers/fakeSupabase"
// `vi.mock` is hoisted above this by vitest, so a static import is enough and
// avoids a top-level `await` that the typechecker refuses.
import { rollGoalPeriods, createGoal } from "@/src/db/goalRepo"

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
/** Long past, so every period is stale however this is run. */
const STALE = "2020-01-06"

function row(over: Partial<Row> = {}): Row {
  return {
    id: "g1",
    user_id: USER,
    title: "Squat 1RM",
    category: "fitness",
    life_area: "fitness",
    tracking_type: "counter",
    goal_type: "milestone",
    period: "weekly",
    period_start_date: STALE,
    target_value: 200,
    current_value: 140,
    current_streak: 0,
    best_streak: 0,
    is_active: true,
    is_archived: false,
    linked_metric: null,
    milestone_config: { start: 60, target: 200 },
    ramp_steps: null,
    streak_freezes_available: 0,
    streak_freezes_used: 0,
    last_freeze_date: null,
    created_at: "2026-01-05T00:00:00Z",
    ...over,
  }
}

const find = (id: string) => tables.user_goals.find((g) => g.id === id)!

beforeEach(() => {
  tables.user_goals = []
  tables.daily_goal_snapshots = []
})

describe("the roll leaves climbs alone", () => {
  it("a Squat 1RM filed as weekly keeps the weight you logged", () => {
    // The defect's own example, from the owner's live data.
    tables.user_goals.push(row())

    return rollGoalPeriods(USER, TZ).then(() => {
      expect(find("g1").current_value).toBe(140)
      expect(find("g1").period_start_date).toBe(STALE)
    })
  })

  it("an undated finish line is not un-ticked at New Year", () => {
    tables.user_goals.push(row({
      id: "g2",
      title: "Ride across Vietnam",
      tracking_type: "boolean",
      period: "yearly",
      target_value: 1,
      current_value: 1,
      milestone_config: null,
    }))

    return rollGoalPeriods(USER, TZ).then(() => {
      expect(find("g2").current_value).toBe(1)
    })
  })

  it("a climb is not snapshotted either, because its history is not periodic", () => {
    tables.user_goals.push(row())
    return rollGoalPeriods(USER, TZ).then(() => {
      expect(tables.daily_goal_snapshots).toHaveLength(0)
    })
  })
})

describe("the roll still does its job for goals that repeat", () => {
  it("a weekly practice is zeroed and restamped", () => {
    tables.user_goals.push(row({
      id: "p1",
      title: "Approaches",
      goal_type: "habit_ramp",
      target_value: 5,
      current_value: 4,
      milestone_config: null,
    }))

    return rollGoalPeriods(USER, TZ).then(() => {
      expect(find("p1").current_value).toBe(0)
      expect(find("p1").period_start_date).not.toBe(STALE)
    })
  })

  it("a daily rule is zeroed too", () => {
    tables.user_goals.push(row({
      id: "p2",
      title: "No weed",
      goal_type: "recurring",
      tracking_type: "boolean",
      period: "daily",
      target_value: 1,
      current_value: 1,
      milestone_config: null,
    }))

    return rollGoalPeriods(USER, TZ).then(() => {
      expect(find("p2").current_value).toBe(0)
    })
  })

  it("a practice and a climb side by side: only the practice moves", () => {
    tables.user_goals.push(row())
    tables.user_goals.push(row({
      id: "p3",
      goal_type: "habit_ramp",
      target_value: 5,
      current_value: 4,
      milestone_config: null,
    }))

    return rollGoalPeriods(USER, TZ).then(() => {
      expect(find("g1").current_value).toBe(140)
      expect(find("p3").current_value).toBe(0)
    })
  })
})

describe("a milestone is not given a repeating period in the first place", () => {
  it("the editor sends no period, and a climb no longer inherits weekly", () => {
    // `GoalFormModal` writes `period` only for recurring and habit_ramp shapes,
    // so a Milestone POST carries none. That gap is where "weekly" came from.
    return createGoal(USER, {
      title: "Squat 1RM",
      category: "fitness",
      target_value: 200,
      goal_type: "milestone",
    }, TZ).then(() => {
      const made = tables.user_goals[0]
      expect(made.period).toBe("custom")
    })
  })

  it("a practice still gets weekly", () => {
    return createGoal(USER, {
      title: "Approaches",
      category: "daygame",
      target_value: 5,
      goal_type: "habit_ramp",
    }, TZ).then(() => {
      expect(tables.user_goals[0].period).toBe("weekly")
    })
  })

  it("an explicit period always wins", () => {
    return createGoal(USER, {
      title: "Monthly revenue",
      category: "money",
      target_value: 10000,
      goal_type: "milestone",
      period: "monthly",
    }, TZ).then(() => {
      expect(tables.user_goals[0].period).toBe("monthly")
    })
  })
})
