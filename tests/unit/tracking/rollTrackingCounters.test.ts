/**
 * ROLLING THE WEEK, AGAINST THE REAL REPO.
 *
 * `rollTrackingCounters` runs before every read and every write of
 * `user_tracking_stats`. What is asserted here is the row that comes back out
 * of the table — what the page would show — not that a function was called.
 *
 * The cases are the ones that actually happened: a week that ended active, the
 * week-07 row whose counters said "one session, one approach" while the streak
 * went up anyway, a row six months stale, and two page loads racing on a Monday.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { createFakeSupabase, type Row } from "../../helpers/fakeSupabase"

const tables: Record<string, Row[]> = { user_tracking_stats: [] }
const fake = createFakeSupabase(tables, { upsertKey: (r) => String(r.user_id) })

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(async () => fake),
  createAdminSupabaseClient: vi.fn(() => fake),
}))

const { rollTrackingCounters } = await import("@/src/db/trackingRepo")

const USER = "user-1"

function statsRow(over: Partial<Row> = {}): Row {
  return {
    user_id: USER,
    total_approaches: 31,
    total_sessions: 21,
    total_numbers: 0,
    total_instadates: 0,
    total_field_reports: 10,
    current_streak: 1,
    longest_streak: 3,
    last_approach_date: "2026-08-19",
    current_week_sessions: 3,
    current_week_approaches: 12,
    current_week_numbers: 2,
    current_week_instadates: 1,
    current_week_field_reports: 4,
    current_week_streak: 3,
    longest_week_streak: 4,
    week_start_date: "2026-08-17",
    last_active_week_start: "2026-08-17",
    last_review_week_start: null,
    unique_locations: [],
    weekly_reviews_completed: 0,
    current_weekly_streak: 0,
    monthly_review_unlocked: false,
    quarterly_review_unlocked: false,
    favorite_template_ids: [],
    updated_at: "2026-08-19T00:00:00Z",
    ...over,
  }
}

const row = () => tables.user_tracking_stats[0]

beforeEach(() => {
  tables.user_tracking_stats = []
  vi.useFakeTimers()
  // Monday 24 August 2026, 09:00 UTC.
  vi.setSystemTime(new Date("2026-08-24T09:00:00Z"))
})
afterEach(() => {
  vi.useRealTimers()
})

describe("rollTrackingCounters", () => {
  it("zeroes every weekly counter when the week has turned over", async () => {
    tables.user_tracking_stats = [statsRow()]

    expect(await rollTrackingCounters(USER, "UTC")).toBe(true)

    expect(row().current_week_sessions).toBe(0)
    expect(row().current_week_approaches).toBe(0)
    expect(row().current_week_numbers).toBe(0)
    expect(row().current_week_instadates).toBe(0)
    expect(row().current_week_field_reports).toBe(0)
    expect(row().week_start_date).toBe("2026-08-24")
  })

  it("refuses to roll backwards when the caller's clock is behind", async () => {
    // A caller that forgets the timezone computes "this week" from the server
    // clock. Just past midnight on a Monday in Copenhagen that is still LAST
    // week, and rolling to it would wipe counters belonging to the week that
    // has already started. Verified against the real failure: endSession used
    // to call syncLinkedGoals with no timezone straight after writing them.
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    tables.user_tracking_stats = [{ ...statsRow(), week_start_date: "2026-08-31", current_week_approaches: 4 }]

    const rolled = await rollTrackingCounters(USER, "UTC")

    expect(rolled).toBe(false)
    expect(row().week_start_date).toBe("2026-08-31")
    expect(row().current_week_approaches).toBe(4)
    expect(error).toHaveBeenCalledWith(expect.stringContaining("backwards"))
    error.mockRestore()
  })

  it("leaves the streak alone — rolling is about counters, not streaks", async () => {
    tables.user_tracking_stats = [statsRow()]

    await rollTrackingCounters(USER, "UTC")

    // The streak is earned by qualifying and hidden by the read gate. If rolling
    // could also change it, running twice would decay it twice.
    expect(row().current_week_streak).toBe(3)
    expect(row().longest_week_streak).toBe(4)
    expect(row().last_active_week_start).toBe("2026-08-17")
  })

  it("does nothing when the row is already on this week", async () => {
    tables.user_tracking_stats = [statsRow({ week_start_date: "2026-08-24" })]

    expect(await rollTrackingCounters(USER, "UTC")).toBe(false)
    expect(row().current_week_sessions).toBe(3)
  })

  it("rolls a six-month-stale row in one step", async () => {
    tables.user_tracking_stats = [
      statsRow({ week_start_date: "2026-02-16", current_week_sessions: 1, current_week_approaches: 1 }),
    ]

    expect(await rollTrackingCounters(USER, "UTC")).toBe(true)
    expect(row().current_week_sessions).toBe(0)
    expect(row().week_start_date).toBe("2026-08-24")
  })

  it("stamps a row that has never been stamped, without inventing a rollover", async () => {
    tables.user_tracking_stats = [
      statsRow({ week_start_date: null, current_week_sessions: 0, current_week_approaches: 0 }),
    ]

    expect(await rollTrackingCounters(USER, "UTC")).toBe(true)
    expect(row().week_start_date).toBe("2026-08-24")
    expect(row().current_week_streak).toBe(3)
  })

  it("only one of two concurrent rolls reports having rolled", async () => {
    tables.user_tracking_stats = [statsRow()]

    const [first, second] = await Promise.all([
      rollTrackingCounters(USER, "UTC"),
      rollTrackingCounters(USER, "UTC"),
    ])

    // The guard is `.eq("week_start_date", <the old one>)`, so the second UPDATE
    // matches no row once the first has moved it on.
    expect([first, second].filter(Boolean)).toHaveLength(1)
    expect(row().week_start_date).toBe("2026-08-24")
  })

  it("uses the user's calendar, not the server's", async () => {
    // 24 Aug 09:00 UTC is still Sunday the 23rd in Honolulu (UTC-10), so that
    // user's week has NOT turned over yet.
    tables.user_tracking_stats = [statsRow()]

    expect(await rollTrackingCounters(USER, "Pacific/Honolulu")).toBe(false)
    expect(row().current_week_sessions).toBe(3)
  })
})
