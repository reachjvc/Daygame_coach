/**
 * ACHIEVEMENTS AND COUNTERS, DERIVED FROM THE USER'S OWN ROWS.
 *
 * Badges used to be awarded at the instant a `+1` counter passed a threshold.
 * Miss that instant — a lost update, a request that died after the write, a
 * threshold that had not shipped yet — and the badge was gone permanently,
 * because nothing ever looked again. That is how a user with 33 approaches
 * ended up with "First Steps" and "Double Digits" but not "Getting Started".
 *
 * Here there is no instant to miss. Both the badges and the counters are
 * projections of one input — the rows the user actually created — computed in
 * the same pass, so they cannot disagree with each other or accumulate an error.
 * A missed reconcile is repaired by the next one.
 *
 * NOTHING IN THIS FILE READS A COUNTER. If you find yourself reaching for
 * `user_tracking_stats` as an input, that is the bug this file replaces.
 *
 * PURE ON PURPOSE — no database, no clock of its own, no Supabase import. Every
 * answer is a function of the rows handed in, which is why the same code can run
 * inside a request, inside a unit test with hand-written rows, and inside a
 * command-line audit that has no Next.js around it. The writing half lives in
 * `achievementsSyncService.ts`.
 *
 * See docs/plans/achievement_counters.md.
 */

import type { UserTrackingStatsUpdate } from "@/src/db/trackingTypes"
import type { MilestoneType, SetType } from "@/src/db/trackingEnums"
import { SET_TYPES } from "@/src/db/trackingEnums"
import {
  periodStartFor,
  previousPeriodStart,
  toDateISO,
  toZonedDate,
} from "@/src/shared/dateUtils"
import { isWeekActive } from "./counterRules"
import { streakRun } from "@/src/shared/streakRuns"
import { MILESTONE_RULES } from "./data/milestoneRules"
import type {
  ActiveWeek,
  MilestoneFacts,
  MilestoneSourceRows,
} from "./types"

// ============================================
// The index — one pass over the rows
// ============================================

/** An approach with everything any rule or counter needs, already in user time. */
interface IndexedApproach {
  at: string
  ms: number
  day: string
  week: string
  hour: number
  outcome: string | null
  setType: string | null
  tags: string[]
  sessionId: string | null
}

/** A completed session, in user time. Sessions that never ended are not here. */
interface IndexedSession {
  endedAt: string
  ms: number
  day: string
  week: string
  dayOfWeek: number
  month: number
  dayOfMonth: number
  startHour: number
  durationMinutes: number | null
  goalMet: boolean
  withWingman: boolean
  location: string | null
  approaches: IndexedApproach[]
}

interface TrackingIndex {
  approaches: IndexedApproach[]
  sessions: IndexedSession[]
  fieldReports: Array<{ at: string; week: string }>
  weeklyReviews: Array<{ at: string; periodWeek: string }>
  monthlyReviews: Array<{ at: string }>
}

const REJECTION_OUTCOMES = new Set(["blowout", "short"])
const COMEBACK_GAP_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Put every row in the user's own timezone and sort it.
 *
 * Everything downstream reads this, so a row is filtered, zoned and sorted
 * exactly once. Rows that cannot be dated are dropped loudly rather than
 * guessed at — a badge with an invented date is worse than a missing badge.
 */
function indexRows(rows: MilestoneSourceRows, timezone: string): TrackingIndex {
  const approaches: IndexedApproach[] = rows.approaches
    .filter((a) => Boolean(a.timestamp))
    .map((a) => {
      const zoned = toZonedDate(new Date(a.timestamp), timezone)
      return {
        at: a.timestamp,
        ms: new Date(a.timestamp).getTime(),
        day: toDateISO(zoned),
        week: periodStartFor("weekly", zoned),
        hour: zoned.getHours(),
        outcome: a.outcome ?? null,
        setType: a.set_type ?? null,
        tags: a.tags ?? [],
        sessionId: a.session_id ?? null,
      }
    })
    .sort((x, y) => x.ms - y.ms)

  const bySession = new Map<string, IndexedApproach[]>()
  for (const a of approaches) {
    if (!a.sessionId) continue
    const list = bySession.get(a.sessionId)
    if (list) list.push(a)
    else bySession.set(a.sessionId, [a])
  }

  const sessions: IndexedSession[] = []
  for (const s of rows.sessions) {
    if (s.end_reason !== "completed") continue
    if (!s.ended_at) {
      // A session the user has reopened is live again, not broken: it counts
      // when it is ended, like any other running session. Anything else cannot
      // be dated, so it cannot award anything — and that is worth saying out
      // loud rather than swallowing.
      if (!s.is_active) {
        console.error(
          `[achievements] session ${s.id} is end_reason='completed' with no ended_at — excluded`
        )
      }
      continue
    }
    const zonedEnd = toZonedDate(new Date(s.ended_at), timezone)
    const zonedStart = toZonedDate(new Date(s.started_at), timezone)
    sessions.push({
      endedAt: s.ended_at,
      ms: new Date(s.ended_at).getTime(),
      day: toDateISO(zonedEnd),
      week: periodStartFor("weekly", zonedEnd),
      dayOfWeek: zonedEnd.getDay(),
      month: zonedEnd.getMonth(),
      dayOfMonth: zonedEnd.getDate(),
      startHour: zonedStart.getHours(),
      durationMinutes: s.duration_minutes,
      goalMet: Boolean(s.goal_met),
      withWingman: Boolean(s.with_wingman),
      location: s.primary_location?.trim() || null,
      approaches: bySession.get(s.id) ?? [],
    })
  }
  sessions.sort((x, y) => x.ms - y.ms)

  const fieldReports = rows.fieldReports
    .filter((r) => !r.is_draft && Boolean(r.reported_at))
    .map((r) => ({
      at: r.reported_at,
      week: periodStartFor("weekly", toZonedDate(new Date(r.reported_at), timezone)),
    }))
    .sort((x, y) => x.at.localeCompare(y.at))

  const submittedReviews = rows.reviews.filter((r) => {
    if (r.is_draft) return false
    if (!r.created_at) {
      console.error(`[achievements] review ${r.id} has no created_at — excluded`)
      return false
    }
    return true
  })

  const weeklyReviews = submittedReviews
    .filter((r) => r.review_type === "weekly")
    .map((r) => ({
      at: r.created_at,
      periodWeek: periodStartFor("weekly", parseDateOnly(r.period_start)),
    }))
    .sort((x, y) => x.at.localeCompare(y.at))

  const monthlyReviews = submittedReviews
    .filter((r) => r.review_type === "monthly")
    .map((r) => ({ at: r.created_at }))
    .sort((x, y) => x.at.localeCompare(y.at))

  return { approaches, sessions, fieldReports, weeklyReviews, monthlyReviews }
}

/**
 * A YYYY-MM-DD column read as a wall-clock date.
 *
 * `new Date("2026-08-24")` is midnight UTC, which is the 23rd for anyone west of
 * Greenwich. `period_start` is a calendar date with no time in it, so it has to
 * be parsed as one.
 */
function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

// ============================================
// Facts — what the rules read
// ============================================

/** The fact sheet every achievement rule is evaluated against. */
export function buildFacts(
  rows: MilestoneSourceRows,
  timezone: string
): MilestoneFacts {
  return factsFromIndex(indexRows(rows, timezone))
}

function factsFromIndex(index: TrackingIndex): MilestoneFacts {
  const { approaches, sessions } = index

  const at = (list: IndexedApproach[]) => list.map((a) => a.at)
  const withOutcome = (outcome: string) => approaches.filter((a) => a.outcome === outcome)

  const setTypes = {} as Record<SetType, string[]>
  for (const t of SET_TYPES) setTypes[t] = []
  for (const a of approaches) {
    if (a.setType && a.setType in setTypes) setTypes[a.setType as SetType].push(a.at)
  }

  const tags: Record<string, string[]> = {}
  const numbersByTag: Record<string, string[]> = {}
  for (const a of approaches) {
    for (const tag of a.tags) {
      ;(tags[tag] ??= []).push(a.at)
      if (a.outcome === "number") (numbersByTag[tag] ??= []).push(a.at)
    }
  }

  const approachDays = [...new Set(approaches.map((a) => a.day))].sort()

  const uniqueLocations: Array<{ location: string; firstSeenAt: string }> = []
  const seenLocations = new Set<string>()
  for (const s of sessions) {
    if (!s.location || seenLocations.has(s.location)) continue
    seenLocations.add(s.location)
    uniqueLocations.push({ location: s.location, firstSeenAt: s.endedAt })
  }

  const sessionNumbers = (s: IndexedSession) =>
    s.approaches.filter((a) => a.outcome === "number").length
  const sessionInstadates = (s: IndexedSession) =>
    s.approaches.filter((a) => a.outcome === "instadate").length

  const firstSession = (predicate: (s: IndexedSession) => boolean): string | null =>
    sessions.find(predicate)?.endedAt ?? null

  return {
    approaches: at(approaches),
    numbers: at(withOutcome("number")),
    instadates: at(withOutcome("instadate")),
    rejections: at(approaches.filter((a) => a.outcome && REJECTION_OUTCOMES.has(a.outcome))),
    blowouts: at(withOutcome("blowout")),
    sessions: sessions.map((s) => s.endedAt),
    wingmanSessions: sessions.filter((s) => s.withWingman).map((s) => s.endedAt),
    fieldReports: index.fieldReports.map((r) => r.at),
    weeklyReviews: index.weeklyReviews.map((r) => r.at),
    monthlyReviews: index.monthlyReviews.map((r) => r.at),
    setTypes,
    tags,
    numbersByTag,
    approachDays,
    activeWeeks: activeWeeksFrom(index),
    uniqueLocations,

    firstSession5Approaches: firstSession((s) => s.approaches.length >= 5),
    firstSession10Approaches: firstSession((s) => s.approaches.length >= 10),
    firstSessionGoalMet: firstSession((s) => s.goalMet),
    firstSession120Min: firstSession((s) => (s.durationMinutes ?? 0) >= 120),
    firstSession3Numbers: firstSession((s) => sessionNumbers(s) >= 3),
    firstSession5Numbers: firstSession((s) => sessionNumbers(s) >= 5),
    firstSession2Instadates: firstSession((s) => sessionInstadates(s) >= 2),
    firstSession10NoNumbers: firstSession(
      (s) => s.approaches.length >= 10 && sessionNumbers(s) === 0
    ),
    firstSessionWeekend: firstSession((s) => s.dayOfWeek === 0 || s.dayOfWeek === 6),
    firstSessionSunday: firstSession((s) => s.dayOfWeek === 0),
    firstSessionFirstWeekJan: firstSession((s) => s.month === 0 && s.dayOfMonth <= 7),
    firstSessionValentines: firstSession((s) => s.month === 1 && s.dayOfMonth === 14),
    firstSessionAfter5ConsecutiveRejections: firstSession(hasRunOf5RejectionsThenMore),
    firstSessionStartedAfter9pm: firstSession((s) => s.startHour >= 21),
    firstSessionStartedBefore10am: firstSession((s) => s.startHour < 10),

    first3ApproachesIn10Min: firstInWindow(approaches, 3, 10),
    first5ApproachesIn15Min: firstInWindow(approaches, 5, 15),
    first10ApproachesIn30Min: firstInWindow(approaches, 10, 30),
    first3ApproachesInLunchHour: firstNPerDay(approaches, 3, (a) => a.hour === 12),
    first5ApproachesInRushHour: firstNPerDay(approaches, 5, (a) => a.hour === 17 || a.hour === 18),
    firstNumberOnFirstApproachOfDay: firstOfGroup(approaches, (a) => a.day, "number"),
    firstInstadateOnFirstApproachOfSession: firstOfGroup(
      approaches.filter((a) => a.sessionId),
      (a) => a.sessionId as string,
      "instadate"
    ),
    firstComeback: firstComebackAt(approaches),
    fifthUniqueLocation: uniqueLocations[4]?.firstSeenAt ?? null,
  }
}

/**
 * Five rejections in a row inside one session, and the user kept going.
 *
 * "Kept going" is the badge: the run has to be followed by at least one more
 * approach in the same session, otherwise it is just a session that ended badly.
 */
function hasRunOf5RejectionsThenMore(session: IndexedSession): boolean {
  let run = 0
  for (let i = 0; i < session.approaches.length; i++) {
    const outcome = session.approaches[i].outcome
    run = outcome && REJECTION_OUTCOMES.has(outcome) ? run + 1 : 0
    if (run >= 5 && i < session.approaches.length - 1) return true
  }
  return false
}

/** When `n` approaches first happened inside `minutes` of each other. */
function firstInWindow(
  approaches: IndexedApproach[],
  n: number,
  minutes: number
): string | null {
  const windowMs = minutes * 60 * 1000
  for (let i = n - 1; i < approaches.length; i++) {
    if (approaches[i].ms - approaches[i - (n - 1)].ms <= windowMs) return approaches[i].at
  }
  return null
}

/** When the `n`th qualifying approach of any single day first happened. */
function firstNPerDay(
  approaches: IndexedApproach[],
  n: number,
  qualifies: (a: IndexedApproach) => boolean
): string | null {
  const perDay = new Map<string, number>()
  for (const a of approaches) {
    if (!qualifies(a)) continue
    const count = (perDay.get(a.day) ?? 0) + 1
    perDay.set(a.day, count)
    if (count === n) return a.at
  }
  return null
}

/** When the first approach of some group (a day, a session) first had this outcome. */
function firstOfGroup(
  approaches: IndexedApproach[],
  groupOf: (a: IndexedApproach) => string,
  outcome: string
): string | null {
  const seen = new Set<string>()
  for (const a of approaches) {
    const group = groupOf(a)
    if (seen.has(group)) continue
    seen.add(group)
    if (a.outcome === outcome) return a.at
  }
  return null
}

/** The first approach that followed a gap of two weeks or more. */
function firstComebackAt(approaches: IndexedApproach[]): string | null {
  for (let i = 1; i < approaches.length; i++) {
    if (approaches[i].ms - approaches[i - 1].ms >= COMEBACK_GAP_MS) return approaches[i].at
  }
  return null
}

/**
 * Every week that qualified as active, and the moment it did.
 *
 * Events are walked in time order and counted per week, so `qualifiedAt` is the
 * approach or session that actually tipped the week over — which is what dates
 * the streak badge. A week qualifies at 2 sessions or 5 approaches, the same
 * rule the live counters use (`isWeekActive`).
 */
function activeWeeksFrom(index: TrackingIndex): ActiveWeek[] {
  const events = [
    ...index.approaches.map((a) => ({ ms: a.ms, at: a.at, week: a.week, kind: "approach" as const })),
    ...index.sessions.map((s) => ({ ms: s.ms, at: s.endedAt, week: s.week, kind: "session" as const })),
  ].sort((x, y) => x.ms - y.ms)

  const counts = new Map<string, { approaches: number; sessions: number }>()
  const qualified = new Map<string, string>()

  for (const e of events) {
    const c = counts.get(e.week) ?? { approaches: 0, sessions: 0 }
    if (e.kind === "approach") c.approaches++
    else c.sessions++
    counts.set(e.week, c)

    if (!qualified.has(e.week) && isWeekActive(c.sessions, c.approaches)) {
      qualified.set(e.week, e.at)
    }
  }

  return [...qualified.entries()]
    .map(([week, qualifiedAt]) => ({ week, qualifiedAt }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

// ============================================
// Derivation
// ============================================

/** Every badge these facts earn, with the moment each was earned, oldest first. */
export function deriveEarnedMilestones(
  facts: MilestoneFacts
): Array<{ type: MilestoneType; achievedAt: string }> {
  const earned: Array<{ type: MilestoneType; achievedAt: string }> = []

  for (const [type, rule] of Object.entries(MILESTONE_RULES)) {
    const achievedAt = rule(facts)
    if (achievedAt) earned.push({ type: type as MilestoneType, achievedAt })
  }

  return earned.sort((a, b) => a.achievedAt.localeCompare(b.achievedAt))
}

// ============================================
// Counters — the other projection of the same rows
// ============================================

/**
 * Every counter on `user_tracking_stats`, worked out from the rows.
 *
 * `favorite_template_ids` is deliberately absent: it is something the user
 * chose, not something derived, so this projection must never overwrite it.
 * The ISO-week label columns this used to have (`current_week`,
 * `last_active_week`, `last_session_week`) were dropped from the database on
 * 28-08-2026, replaced by the Monday-date columns written below.
 */
export function projectTrackingStats(
  rows: MilestoneSourceRows,
  timezone: string,
  now: Date = new Date()
): UserTrackingStatsUpdate {
  return statsFromIndex(indexRows(rows, timezone), timezone, now)
}

function statsFromIndex(
  index: TrackingIndex,
  timezone: string,
  now: Date
): UserTrackingStatsUpdate {
  const facts = factsFromIndex(index)
  const zonedNow = toZonedDate(now, timezone)
  const today = toDateISO(zonedNow)
  const thisWeek = periodStartFor("weekly", zonedNow)
  const lastWeek = previousPeriodStart("weekly", thisWeek)

  const inThisWeek = (week: string) => week === thisWeek
  const numbers = index.approaches.filter((a) => a.outcome === "number")
  const instadates = index.approaches.filter((a) => a.outcome === "instadate")

  const weekFollows = (a: string, b: string) => previousPeriodStart("weekly", b) === a

  // Counted raw and stored raw: the row records what was achieved. Whether a run
  // is still alive is decided at the moment of display by `gateStreaks`, so a
  // streak that has gone stale is hidden rather than erased.
  const dayRuns = streakRun(facts.approachDays, isNextDay)
  const weekRuns = streakRun(facts.activeWeeks.map((w) => w.week), weekFollows)
  const reviewWeeks = [...new Set(index.weeklyReviews.map((r) => r.periodWeek))].sort()
  const reviewRuns = streakRun(reviewWeeks, weekFollows)

  const lastActiveWeek = facts.activeWeeks.at(-1)?.week ?? null
  const lastReviewWeek = reviewWeeks.at(-1) ?? null

  return {
    total_approaches: index.approaches.length,
    total_sessions: index.sessions.length,
    total_numbers: numbers.length,
    total_instadates: instadates.length,
    total_field_reports: index.fieldReports.length,

    // Streaks are stored raw and gated on read (`gateStreaks`), so a run that
    // has gone stale is still the truth about what was achieved.
    current_streak: dayRuns.run,
    longest_streak: dayRuns.longest,
    last_approach_date: facts.approachDays.at(-1) ?? null,

    week_start_date: thisWeek,
    current_week_approaches: index.approaches.filter((a) => inThisWeek(a.week)).length,
    current_week_sessions: index.sessions.filter((s) => inThisWeek(s.week)).length,
    current_week_numbers: numbers.filter((a) => inThisWeek(a.week)).length,
    current_week_instadates: instadates.filter((a) => inThisWeek(a.week)).length,
    current_week_field_reports: index.fieldReports.filter((r) => inThisWeek(r.week)).length,

    current_week_streak: weekRuns.run,
    longest_week_streak: weekRuns.longest,
    last_active_week_start: lastActiveWeek,

    weekly_reviews_completed: index.weeklyReviews.length,
    current_weekly_streak: reviewRuns.run,
    last_review_week_start: lastReviewWeek,
    monthly_review_unlocked: index.weeklyReviews.length >= 4,
    quarterly_review_unlocked: index.monthlyReviews.length >= 3,

    unique_locations: facts.uniqueLocations.map((l) => l.location),
  }

  /** True when `b` is the calendar day directly after `a`. */
  function isNextDay(a: string, b: string): boolean {
    const next = new Date(`${a}T00:00:00.000Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    return next.toISOString().slice(0, 10) === b
  }

}
