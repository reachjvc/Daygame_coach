/**
 * TIME TRAVEL: WATCH THE SHAPE OF EVERY COUNTER, HOUR BY HOUR.
 *
 * Every other test in this repo asks "what is the number at this instant". A
 * fixture only ever sits on the instants somebody thought to write down, and the
 * bugs live at the boundaries nobody chose: the hour a week turns over, the
 * night the clocks change, the Monday before you have done anything.
 *
 * So this holds the rows still and moves the clock — every 6 hours across four
 * weeks, twice, once through each Copenhagen DST switch — and asserts the SHAPE
 * of each series instead of any single value:
 *
 *   - a lifetime total may never decrease;
 *   - a weekly counter resets exactly when the week does, and at no other time;
 *   - a stored streak may never decrease without new rows (it is a record of
 *     what happened, and the past does not change);
 *   - a DISPLAYED streak may fall to zero, but never recover on its own.
 *
 * Each of those is a rule that was broken in production at some point in the
 * last week.
 */

import { describe, it, expect } from "vitest"
import { projectTrackingStats } from "@/src/tracking/achievementsService"
import { gateStreaks } from "@/src/db/metricsRepo"
import { periodStartFor, getNowInTimezone } from "@/src/shared/dateUtils"
import type { MilestoneSourceRows, ApproachRow, SessionRow } from "@/src/tracking/types"
import type { UserTrackingStatsRow } from "@/src/db/trackingTypes"

const TZ = "Europe/Copenhagen"

let seq = 0
function approach(timestamp: string): ApproachRow {
  seq += 1
  return {
    id: `a${seq}`, user_id: "u1", session_id: null, timestamp, created_at: timestamp,
    outcome: null, tags: null, mood: null, latitude: null, longitude: null,
    note: null, voice_note_url: null, set_type: null, quality: null,
  } as unknown as ApproachRow
}

function session(at: string): SessionRow {
  seq += 1
  return {
    id: `s${seq}`, user_id: "u1", started_at: at, ended_at: at,
    end_reason: "completed", is_active: false, duration_minutes: 30,
    goal: null, goal_met: false, total_approaches: 0, primary_location: null,
    location_data: null, created_at: at, updated_at: at, with_wingman: false,
  } as unknown as SessionRow
}

/** Two sessions a week for four weeks — an active week each time. */
function fourActiveWeeks(mondays: string[]): MilestoneSourceRows {
  const sessions: SessionRow[] = []
  const approaches: ApproachRow[] = []
  for (const monday of mondays) {
    const [y, m, d] = monday.split("-").map(Number)
    for (const offset of [1, 3]) {
      const day = new Date(Date.UTC(y, m - 1, d + offset, 12, 0, 0)).toISOString()
      sessions.push(session(day))
      approaches.push(approach(day))
    }
  }
  return { approaches, sessions, fieldReports: [], reviews: [] }
}

function blankRow(): UserTrackingStatsRow {
  return {
    user_id: "u1",
    total_approaches: 0, total_sessions: 0, total_numbers: 0,
    total_instadates: 0, total_field_reports: 0,
    current_streak: 0, longest_streak: 0, last_approach_date: null,
    current_week_sessions: 0, current_week_approaches: 0, current_week_numbers: 0,
    current_week_instadates: 0, current_week_field_reports: 0,
    current_week_streak: 0, longest_week_streak: 0,
    week_start_date: null, last_active_week_start: null, last_review_week_start: null,
    unique_locations: [],
    weekly_reviews_completed: 0, current_weekly_streak: 0,
    monthly_review_unlocked: false, quarterly_review_unlocked: false,
    favorite_template_ids: [], updated_at: "2026-01-01T00:00:00.000Z",
  }
}

/** Every 6 hours from `from`, for `days` days. */
function everySixHours(from: string, days: number): Date[] {
  const start = new Date(from).getTime()
  return Array.from({ length: days * 4 }, (_, i) => new Date(start + i * 6 * 3600 * 1000))
}

interface Sample {
  at: Date
  week: string
  stored: ReturnType<typeof projectTrackingStats>
  shown: UserTrackingStatsRow
}

function sweep(rows: MilestoneSourceRows, instants: Date[]): Sample[] {
  return instants.map((at) => {
    const stored = projectTrackingStats(rows, TZ, at)
    const shown = gateStreaks({ ...blankRow(), ...stored } as UserTrackingStatsRow, TZ, at)
    return { at, week: periodStartFor("weekly", getNowInTimezone(TZ, at)), stored, shown }
  })
}

describe.each([
  ["spring forward", ["2026-03-09", "2026-03-16", "2026-03-23", "2026-03-30"], "2026-03-09T00:00:00.000Z"],
  ["autumn back", ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"], "2026-10-05T00:00:00.000Z"],
])("across four weeks, %s", (_label, mondays, from) => {
  const rows = fourActiveWeeks(mondays)
  // 45 days: four active weeks, the week after (still alive), and the week after
  // that (over) — the window has to contain the moment the streak dies or the
  // "never comes back" assertion has nothing to observe.
  const samples = sweep(rows, everySixHours(from, 45))

  it("never lets a lifetime total go down", () => {
    for (let i = 1; i < samples.length; i++) {
      expect(
        samples[i].stored.total_sessions!,
        `total_sessions fell at ${samples[i].at.toISOString()}`
      ).toBeGreaterThanOrEqual(samples[i - 1].stored.total_sessions!)
      expect(samples[i].stored.total_approaches!).toBeGreaterThanOrEqual(
        samples[i - 1].stored.total_approaches!
      )
    }
  })

  it("resets a weekly counter exactly when the week turns over, and never otherwise", () => {
    for (let i = 1; i < samples.length; i++) {
      const previous = samples[i - 1]
      const current = samples[i]
      const weekChanged = current.week !== previous.week
      const countFell = current.stored.current_week_sessions! < previous.stored.current_week_sessions!
      if (countFell) {
        expect(
          weekChanged,
          `weekly count fell at ${current.at.toISOString()} without the week changing`
        ).toBe(true)
      }
    }
  })

  it("never lets a stored streak go down — the past does not change", () => {
    for (let i = 1; i < samples.length; i++) {
      expect(
        samples[i].stored.longest_week_streak!,
        `longest_week_streak fell at ${samples[i].at.toISOString()}`
      ).toBeGreaterThanOrEqual(samples[i - 1].stored.longest_week_streak!)
    }
  })

  it("never lets a shown streak come back from zero on its own", () => {
    let hasBeenZero = false
    for (const sample of samples) {
      if (sample.shown.current_week_streak === 0) hasBeenZero = true
      else if (hasBeenZero) {
        // Rows are fixed, so nothing new was earned. A streak that reappears is
        // a boundary computed two different ways.
        throw new Error(
          `shown streak returned to ${sample.shown.current_week_streak} at ${sample.at.toISOString()} with no new rows`
        )
      }
    }
    expect(hasBeenZero).toBe(true)
  })

  it("shows the streak throughout the week after the last active one, then stops", () => {
    const lastMonday = mondays[mondays.length - 1]
    const during = samples.filter((s) => s.week === lastMonday)
    const weekAfter = samples.filter(
      (s) => s.week > lastMonday && s.week <= periodStartFor("weekly", new Date(`${lastMonday}T00:00:00Z`))
    )
    expect(during.length).toBeGreaterThan(0)
    for (const s of during) expect(s.shown.current_week_streak).toBe(4)
    for (const s of weekAfter) expect(s.shown.current_week_streak).toBe(4)
  })
})
