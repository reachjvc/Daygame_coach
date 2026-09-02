/**
 * How every achievement badge is earned.
 *
 * One rule per badge. A rule takes the fact sheet built from the user's own rows
 * (approaches, sessions, field reports, reviews) and returns the ISO timestamp at
 * which the badge was earned, or null if it has not been.
 *
 * Rules never look at a counter. That is the whole point: counters drift, rows do
 * not. See docs/plans/achievement_counters.md.
 *
 * MILESTONE_RULES is typed as Record<MilestoneType, MilestoneRule>, so a badge that
 * exists in MILESTONE_TYPES but has no rule here fails to compile — and
 * tests/unit/tracking/milestoneRules.test.ts fails it at runtime too, because the
 * build is configured to skip type checking.
 */

import type { MilestoneType } from "@/src/db/trackingEnums"
import { previousPeriodStart } from "@/src/shared/dateUtils"
import type { ActiveWeek, MilestoneFacts, MilestoneRule } from "../types"

// ============================================
// Helpers
// ============================================

/** When the nth event in an ascending list happened, or null if it never did. */
export function nth(list: string[], n: number): string | null {
  return list[n - 1] ?? null
}

/** Merge ascending ISO lists into one ascending list (ISO strings sort chronologically). */
export function merge(...lists: string[][]): string[] {
  return lists.flat().sort()
}

/**
 * When a run of `n` consecutive days was first completed.
 *
 * `days` are YYYY-MM-DD in the user's own timezone. The answer is timestamped at
 * noon UTC on the qualifying day, which lands on that same calendar date in every
 * timezone the app realistically sees — midnight would slide to the previous day
 * for anyone west of UTC.
 */
export function dayStreakReachedAt(days: string[], n: number): string | null {
  if (n < 1 || days.length < n) return null

  let run = 0
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && isNextDay(days[i - 1], days[i]) ? run + 1 : 1
    if (run >= n) return `${days[i]}T12:00:00.000Z`
  }
  return null
}

/**
 * When a run of `n` consecutive active weeks was first completed.
 *
 * A week is named by its Monday, in the user's timezone — the same
 * representation `user_tracking_stats.week_start_date` and
 * `user_goals.period_start_date` use. Two weeks are consecutive when the second
 * one's previous Monday is the first one's.
 *
 * This function once carried its own copy of an ISO-week ("2026-W07") parser,
 * which silently returned NaN for every Monday date it was actually given, so
 * the run never advanced and all six week-streak badges were unearnable. Its
 * tests passed because they fed it ISO labels that no caller ever produces. Do
 * not reintroduce a private notion of what a week is: ask dateUtils.
 */
export function weekStreakReachedAt(weeks: ActiveWeek[], n: number): string | null {
  if (n < 1 || weeks.length < n) return null

  let run = 0
  for (let i = 0; i < weeks.length; i++) {
    const follows = i > 0 && previousPeriodStart("weekly", weeks[i].week) === weeks[i - 1].week
    run = follows ? run + 1 : 1
    if (run >= n) return weeks[i].qualifiedAt
  }
  return null
}

/** True when `b` is the calendar day directly after `a`. Both YYYY-MM-DD. */
function isNextDay(a: string, b: string): boolean {
  const next = new Date(`${a}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10) === b
}

// ============================================
// Rules
// ============================================

export const MILESTONE_RULES: Record<MilestoneType, MilestoneRule> = {
  // Volume - Approaches
  first_approach: (f) => nth(f.approaches, 1),
  "5_approaches": (f) => nth(f.approaches, 5),
  "10_approaches": (f) => nth(f.approaches, 10),
  "25_approaches": (f) => nth(f.approaches, 25),
  "50_approaches": (f) => nth(f.approaches, 50),
  "100_approaches": (f) => nth(f.approaches, 100),
  "250_approaches": (f) => nth(f.approaches, 250),
  "500_approaches": (f) => nth(f.approaches, 500),
  "1000_approaches": (f) => nth(f.approaches, 1000),

  // Volume - Numbers
  first_number: (f) => nth(f.numbers, 1),
  "2_numbers": (f) => nth(f.numbers, 2),
  "5_numbers": (f) => nth(f.numbers, 5),
  "10_numbers": (f) => nth(f.numbers, 10),
  "25_numbers": (f) => nth(f.numbers, 25),
  "50_numbers": (f) => nth(f.numbers, 50),
  "100_numbers": (f) => nth(f.numbers, 100),

  // Volume - Instadates
  first_instadate: (f) => nth(f.instadates, 1),
  "2_instadates": (f) => nth(f.instadates, 2),
  "5_instadates": (f) => nth(f.instadates, 5),
  "10_instadates": (f) => nth(f.instadates, 10),
  "25_instadates": (f) => nth(f.instadates, 25),

  // Sessions
  first_session: (f) => nth(f.sessions, 1),
  "3_sessions": (f) => nth(f.sessions, 3),
  "5_sessions": (f) => nth(f.sessions, 5),
  "10_sessions": (f) => nth(f.sessions, 10),
  "25_sessions": (f) => nth(f.sessions, 25),
  "50_sessions": (f) => nth(f.sessions, 50),
  "100_sessions": (f) => nth(f.sessions, 100),
  first_5_approach_session: (f) => f.firstSession5Approaches,
  first_10_approach_session: (f) => f.firstSession10Approaches,
  first_goal_hit: (f) => f.firstSessionGoalMet,

  // Weekly Streaks
  "2_week_streak": (f) => weekStreakReachedAt(f.activeWeeks, 2),
  "4_week_streak": (f) => weekStreakReachedAt(f.activeWeeks, 4),
  "8_week_streak": (f) => weekStreakReachedAt(f.activeWeeks, 8),
  "12_week_streak": (f) => weekStreakReachedAt(f.activeWeeks, 12),
  "26_week_streak": (f) => weekStreakReachedAt(f.activeWeeks, 26),
  "52_week_streak": (f) => weekStreakReachedAt(f.activeWeeks, 52),

  // Reports & Reviews
  first_field_report: (f) => nth(f.fieldReports, 1),
  "5_field_reports": (f) => nth(f.fieldReports, 5),
  "10_field_reports": (f) => nth(f.fieldReports, 10),
  "25_field_reports": (f) => nth(f.fieldReports, 25),
  "50_field_reports": (f) => nth(f.fieldReports, 50),
  first_weekly_review: (f) => nth(f.weeklyReviews, 1),
  monthly_unlocked: (f) => nth(f.weeklyReviews, 4),
  quarterly_unlocked: (f) => nth(f.monthlyReviews, 3),

  // Fun/Variety
  night_owl: (f) => f.firstSessionStartedAfter9pm,
  early_bird: (f) => f.firstSessionStartedBefore10am,
  globetrotter: (f) => f.fifthUniqueLocation,
  // Same condition as 7_day_streak by design — two catalog entries, one rule.
  consistent: (f) => dayStreakReachedAt(f.approachDays, 7),
  marathon: (f) => f.firstSession120Min,
  weekend_warrior: (f) => f.firstSessionWeekend,

  // Comeback & Resilience
  comeback_kid: (f) => f.firstComeback,
  rejection_proof: (f) => f.firstSession10NoNumbers,
  never_give_up: (f) => f.firstSessionAfter5ConsecutiveRejections,

  // Time-based achievements
  lunch_break_legend: (f) => f.first3ApproachesInLunchHour,
  rush_hour_hero: (f) => f.first5ApproachesInRushHour,
  sunday_funday: (f) => f.firstSessionSunday,
  new_years_resolution: (f) => f.firstSessionFirstWeekJan,
  valentines_warrior: (f) => f.firstSessionValentines,

  // Efficiency achievements
  sniper: (f) => f.firstNumberOnFirstApproachOfDay,
  hot_streak: (f) => f.firstSession3Numbers,
  perfect_session: (f) => f.firstSession5Numbers,
  instant_connection: (f) => f.firstInstadateOnFirstApproachOfSession,
  double_date: (f) => f.firstSession2Instadates,

  // Location variety
  coffee_connoisseur: (f) => nth(f.numbersByTag.cafe ?? [], 1),
  bookworm: (f) => nth(f.numbersByTag.bookstore ?? [], 1),
  street_smart: (f) => nth(f.tags.street ?? [], 10),
  mall_rat: (f) => nth(f.tags.mall ?? [], 10),
  park_ranger: (f) => nth(f.tags.park ?? [], 10),

  // Mindset & Growth
  first_rejection: (f) => nth(f.rejections, 1),
  "10_rejections": (f) => nth(f.rejections, 10),
  "50_rejections": (f) => nth(f.rejections, 50),
  "100_rejections": (f) => nth(f.rejections, 100),
  first_blowout: (f) => nth(f.blowouts, 1),
  approach_anxiety_conquered: (f) => f.first3ApproachesIn10Min,
  zone_state: (f) => f.first5ApproachesIn15Min,
  flow_state: (f) => f.first10ApproachesIn30Min,

  // Social
  wing_commander: (f) => nth(f.wingmanSessions, 1),
  "10_wingman_sessions": (f) => nth(f.wingmanSessions, 10),
  "25_wingman_sessions": (f) => nth(f.wingmanSessions, 25),
  first_double_set: (f) => nth(f.setTypes.double_set, 1),
  "10_double_sets": (f) => nth(f.setTypes.double_set, 10),

  // Unique Set Types
  first_two_set: (f) => nth(f.setTypes.two_set, 1),
  // three_plus and triple_set are the same thing recorded by two different pickers.
  first_group: (f) => nth(merge(f.setTypes.three_plus, f.setTypes.triple_set), 1),
  first_mixed_group: (f) => nth(f.setTypes.mixed_group, 1),
  first_mom_daughter: (f) => nth(f.setTypes.mom_daughter, 1),
  first_sisters: (f) => nth(f.setTypes.sisters, 1),
  first_tourist: (f) => nth(f.setTypes.tourist, 1),
  tourist_guide: (f) => nth(f.setTypes.tourist, 10),
  world_traveler: (f) => nth(f.setTypes.tourist, 25),
  first_moving_set: (f) => nth(f.setTypes.moving, 1),
  first_seated: (f) => nth(f.setTypes.seated, 1),
  "10_seated": (f) => nth(f.setTypes.seated, 10),
  seated_master: (f) => nth(f.setTypes.seated, 25),
  first_foreign: (f) => nth(f.setTypes.foreign_language, 1),
  polyglot: (f) => nth(f.setTypes.foreign_language, 5),

  // Big milestones
  "2000_approaches": (f) => nth(f.approaches, 2000),
  "5000_approaches": (f) => nth(f.approaches, 5000),
  "200_numbers": (f) => nth(f.numbers, 200),
  "50_instadates": (f) => nth(f.instadates, 50),

  // Legacy
  "7_day_streak": (f) => dayStreakReachedAt(f.approachDays, 7),
  "30_day_streak": (f) => dayStreakReachedAt(f.approachDays, 30),
  "100_day_streak": (f) => dayStreakReachedAt(f.approachDays, 100),
}

/** An empty fact sheet — every list empty, every first null. Used by tests and as a base. */
export function emptyFacts(): MilestoneFacts {
  return {
    approaches: [],
    numbers: [],
    instadates: [],
    rejections: [],
    blowouts: [],
    sessions: [],
    wingmanSessions: [],
    fieldReports: [],
    weeklyReviews: [],
    monthlyReviews: [],
    setTypes: {
      solo: [], two_set: [], three_plus: [], mixed_group: [], mom_daughter: [],
      sisters: [], tourist: [], moving: [], seated: [], working: [], gym: [],
      foreign_language: [], celebrity_vibes: [], double_set: [], triple_set: [],
    },
    tags: {},
    numbersByTag: {},
    approachDays: [],
    activeWeeks: [],
    uniqueLocations: [],
    firstSession5Approaches: null,
    firstSession10Approaches: null,
    firstSessionGoalMet: null,
    firstSession120Min: null,
    firstSession3Numbers: null,
    firstSession5Numbers: null,
    firstSession2Instadates: null,
    firstSession10NoNumbers: null,
    firstSessionWeekend: null,
    firstSessionSunday: null,
    firstSessionFirstWeekJan: null,
    firstSessionValentines: null,
    firstSessionAfter5ConsecutiveRejections: null,
    firstSessionStartedAfter9pm: null,
    firstSessionStartedBefore10am: null,
    first3ApproachesIn10Min: null,
    first5ApproachesIn15Min: null,
    first10ApproachesIn30Min: null,
    first3ApproachesInLunchHour: null,
    first5ApproachesInRushHour: null,
    firstNumberOnFirstApproachOfDay: null,
    firstInstadateOnFirstApproachOfSession: null,
    firstComeback: null,
    fifthUniqueLocation: null,
  }
}
