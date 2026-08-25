/**
 * WEEKLY COUNTERS EXPIRE.
 *
 * The bug this pins: Today showed a week the user had not started. A weekly
 * goal's `current_value` is the count for the week named by its
 * `period_start_date`, and the read path Today uses — `/api/goals` →
 * `getUserGoals` — never rolled a period, so last week's number was drawn as
 * this week's and `+1` added to it.
 *
 * These tests run the real repo against a stand-in for Supabase, so what is
 * asserted is the value that comes back out of the row: what the page would
 * show, not the shape of a query.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { isPeriodStale } from "@/src/goals/goalsService"

// ------------------------------------------------------------------
// A stand-in for the Supabase query builder: enough of it to run the
// repo's real select / update / upsert chains against an in-memory table.
// ------------------------------------------------------------------

type Row = Record<string, unknown>
const tables: Record<string, Row[]> = { user_goals: [], daily_goal_snapshots: [] }

class FakeQuery {
  private filters: ((r: Row) => boolean)[] = []
  private mode: "select" | "update" | "upsert" = "select"
  private payload: Row | Row[] = {}
  private one = false

  constructor(private table: string) {}

  select() {
    if (this.mode === "select") this.mode = "select"
    return this
  }
  update(values: Row) {
    this.mode = "update"
    this.payload = values
    return this
  }
  upsert(rows: Row[]) {
    this.mode = "upsert"
    this.payload = rows
    return this
  }
  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val)
    return this
  }
  neq(col: string, val: unknown) {
    this.filters.push((r) => r[col] !== val)
    return this
  }
  lt(col: string, val: string) {
    this.filters.push((r) => String(r[col]) < val)
    return this
  }
  in(col: string, vals: unknown[]) {
    this.filters.push((r) => vals.includes(r[col]))
    return this
  }
  order() {
    return this
  }
  limit() {
    return this
  }
  single() {
    this.one = true
    return this
  }
  maybeSingle() {
    this.one = true
    return this
  }

  private matched() {
    return (tables[this.table] ?? []).filter((r) => this.filters.every((f) => f(r)))
  }

  then(resolve: (v: { data: unknown; error: unknown }) => void) {
    if (this.mode === "upsert") {
      const rows = this.payload as Row[]
      for (const row of rows) {
        const table = tables[this.table]
        const at = table.findIndex(
          (r) => r.goal_id === row.goal_id && r.snapshot_date === row.snapshot_date
        )
        if (at >= 0) table[at] = { ...row }
        else table.push({ ...row })
      }
      return resolve({ data: null, error: null })
    }

    const hits = this.matched()
    if (this.mode === "update") {
      for (const row of hits) Object.assign(row, this.payload)
    }
    const data = this.one ? (hits[0] ? { ...hits[0] } : null) : hits.map((r) => ({ ...r }))
    const error = this.one && !hits[0] ? { message: "no rows" } : null
    return resolve({ data, error })
  }
}

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => new FakeQuery(table),
  })),
}))

const { rollGoalPeriods, incrementGoalProgress, resetWeeklyGoals } = await import("@/src/db/goalRepo")

const USER = "user-1"

/** A weekly driver — "20 approaches a week" — counted up to `count`. */
const weeklyGoal = (over: Partial<Row> = {}): Row => ({
  id: "goal-weekly",
  user_id: USER,
  title: "20 approaches",
  period: "weekly",
  current_value: 13,
  target_value: 20,
  current_streak: 3,
  best_streak: 5,
  is_active: true,
  is_archived: false,
  streak_freezes_available: 0,
  streak_freezes_used: 0,
  last_freeze_date: null,
  linked_metric: null,
  target_date: null,
  custom_end_date: null,
  aligned_values: [],
  period_start_date: "2026-08-17", // last week's Monday
  ...over,
})

const goalRow = () => tables.user_goals.find((g) => g.id === "goal-weekly")!

/** Wall-clock instant, given as UTC so the repo's tz math is deterministic. */
const at = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

beforeEach(() => {
  tables.user_goals = []
  tables.daily_goal_snapshots = []
})
afterEach(() => {
  vi.useRealTimers()
})

describe("isPeriodStale", () => {
  it("holds a week open through Sunday and closes it on Monday", () => {
    // Week of Monday 2026-08-24.
    expect(isPeriodStale("weekly", "2026-08-24", "2026-08-24")).toBe(false)
    expect(isPeriodStale("weekly", "2026-08-24", "2026-08-31")).toBe(true)
  })

  it("treats a missing period start as expired", () => {
    expect(isPeriodStale("weekly", null, "2026-08-24")).toBe(true)
  })

  it("pulls a daily counter dated anything but today back onto today", () => {
    expect(isPeriodStale("daily", "2026-08-24", "2026-08-24")).toBe(false)
    expect(isPeriodStale("daily", "2026-08-23", "2026-08-24")).toBe(true)
    expect(isPeriodStale("daily", "2026-08-25", "2026-08-24")).toBe(true)
  })

  it("closes a month and a year on their first day", () => {
    expect(isPeriodStale("monthly", "2026-08-01", "2026-08-01")).toBe(false)
    expect(isPeriodStale("monthly", "2026-07-01", "2026-08-01")).toBe(true)
    expect(isPeriodStale("yearly", "2026-01-01", "2026-01-01")).toBe(false)
    expect(isPeriodStale("yearly", "2025-01-01", "2026-01-01")).toBe(true)
  })
})

describe("rollGoalPeriods", () => {
  it("does not carry last week's count into this week", () => {
    tables.user_goals.push(weeklyGoal())
    at("2026-08-25T09:00:00Z") // Tuesday

    return rollGoalPeriods(USER, "UTC").then(() => {
      expect(goalRow().current_value).toBe(0)
      expect(goalRow().period_start_date).toBe("2026-08-24")
    })
  })

  it("leaves this week's count alone, and is idempotent", async () => {
    tables.user_goals.push(weeklyGoal({ period_start_date: "2026-08-24", current_value: 7 }))
    at("2026-08-26T18:00:00Z") // Wednesday of that same week

    expect(await rollGoalPeriods(USER, "UTC")).toBe(0)
    expect(await rollGoalPeriods(USER, "UTC")).toBe(0)
    expect(goalRow().current_value).toBe(7)
  })

  it("keeps counting until Sunday 23:59 and starts over at Monday 00:00", async () => {
    tables.user_goals.push(weeklyGoal({ period_start_date: "2026-08-24", current_value: 18 }))

    at("2026-08-30T23:59:00Z") // Sunday, one minute to go
    await rollGoalPeriods(USER, "UTC")
    expect(goalRow().current_value).toBe(18)
    expect(goalRow().period_start_date).toBe("2026-08-24")

    at("2026-08-31T00:00:00Z") // Monday, the week is over
    await rollGoalPeriods(USER, "UTC")
    expect(goalRow().current_value).toBe(0)
    expect(goalRow().period_start_date).toBe("2026-08-31")
  })

  it("rolls on the user's clock, not the server's", async () => {
    tables.user_goals.push(weeklyGoal({ period_start_date: "2026-08-24", current_value: 4 }))
    // Sunday 21:00 UTC is already Monday 09:00 in Auckland.
    at("2026-08-30T21:00:00Z")

    expect(await rollGoalPeriods(USER, "UTC")).toBe(0)
    expect(await rollGoalPeriods(USER, "Pacific/Auckland")).toBe(1)
    expect(goalRow().period_start_date).toBe("2026-08-31")
  })

  it("keeps the finished week's number as a snapshot before zeroing it", async () => {
    tables.user_goals.push(weeklyGoal({ current_value: 13 }))
    at("2026-08-25T09:00:00Z")

    await rollGoalPeriods(USER, "UTC")
    expect(tables.daily_goal_snapshots).toHaveLength(1)
    expect(tables.daily_goal_snapshots[0]).toMatchObject({
      goal_id: "goal-weekly",
      current_value: 13,
      was_complete: false,
    })
  })

  it("breaks the streak on a week that was missed, keeps it on one that was hit", async () => {
    tables.user_goals.push(weeklyGoal({ current_value: 20, target_value: 20 }))
    at("2026-08-25T09:00:00Z")
    await rollGoalPeriods(USER, "UTC")
    expect(goalRow().current_streak).toBe(3)

    tables.user_goals = [weeklyGoal({ current_value: 6, target_value: 20 })]
    await rollGoalPeriods(USER, "UTC")
    expect(goalRow().current_streak).toBe(0)
  })

  it("rolls every cadence in one pass", async () => {
    tables.user_goals.push(
      weeklyGoal({ id: "g-daily", period: "daily", period_start_date: "2026-08-24", current_value: 2 }),
      weeklyGoal({ id: "g-weekly", period_start_date: "2026-08-17", current_value: 9 }),
      weeklyGoal({ id: "g-monthly", period: "monthly", period_start_date: "2026-07-01", current_value: 40 }),
      weeklyGoal({ id: "g-yearly", period: "yearly", period_start_date: "2025-01-01", current_value: 300 })
    )
    at("2026-08-25T09:00:00Z")

    expect(await rollGoalPeriods(USER, "UTC")).toBe(4)
    const starts = Object.fromEntries(
      tables.user_goals.map((g) => [g.id, [g.period_start_date, g.current_value]])
    )
    expect(starts).toEqual({
      "g-daily": ["2026-08-25", 0],
      "g-weekly": ["2026-08-24", 0],
      "g-monthly": ["2026-08-01", 0],
      "g-yearly": ["2026-01-01", 0],
    })
  })

  it("leaves archived and inactive goals out of it", async () => {
    tables.user_goals.push(
      weeklyGoal({ id: "g-archived", is_archived: true, current_value: 11 }),
      weeklyGoal({ id: "g-inactive", is_active: false, current_value: 12 })
    )
    at("2026-08-25T09:00:00Z")

    expect(await rollGoalPeriods(USER, "UTC")).toBe(0)
    expect(tables.user_goals.map((g) => g.current_value)).toEqual([11, 12])
  })

  it("rolls only the signed-in user's goals", async () => {
    tables.user_goals.push(weeklyGoal({ id: "g-mine" }), weeklyGoal({ id: "g-theirs", user_id: "user-2" }))
    at("2026-08-25T09:00:00Z")

    expect(await rollGoalPeriods(USER, "UTC")).toBe(1)
    expect(tables.user_goals.find((g) => g.id === "g-theirs")!.current_value).toBe(13)
  })

  it("still works through the per-cadence entry point", async () => {
    tables.user_goals.push(weeklyGoal())
    at("2026-08-25T09:00:00Z")

    expect(await resetWeeklyGoals(USER, "UTC")).toBe(1)
    expect(goalRow().current_value).toBe(0)
  })
})

describe("incrementGoalProgress", () => {
  it("counts the first tick of a new week as 1, not last week's total plus one", async () => {
    tables.user_goals.push(weeklyGoal({ current_value: 13 })) // last week's 13
    at("2026-08-25T09:00:00Z") // Tuesday of the next week

    const goal = await incrementGoalProgress(USER, "goal-weekly", 1, "UTC")

    expect(goal.current_value).toBe(1)
    expect(goal.period_start_date).toBe("2026-08-24")
  })

  it("adds to this week's count when the week has not turned over", async () => {
    tables.user_goals.push(weeklyGoal({ period_start_date: "2026-08-24", current_value: 4 }))
    at("2026-08-26T09:00:00Z")

    const goal = await incrementGoalProgress(USER, "goal-weekly", 1, "UTC")
    expect(goal.current_value).toBe(5)
  })
})
