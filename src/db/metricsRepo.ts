/**
 * The one place a metric turns into a number.
 *
 * WHY THIS FILE EXISTS: goal progress and the dashboard tiles show the same
 * quantities. When each had its own fetch path they were free to disagree — a
 * tile saying 12 approaches next to a goal card saying 9 is the kind of thing
 * that destroys trust in every other number on the page. `syncLinkedGoals` in
 * goalRepo and `resolveMetrics` in the tracking slice both come through here.
 *
 * TWO KINDS OF ID:
 *  - a `LinkedMetric` (from goalEnums) — can back a goal, synced to
 *    `user_goals.current_value`
 *  - a stats-derived id such as `week_streak` — displayable, but nothing syncs
 *    it into a goal, so it is not in LINKED_METRICS
 * Both resolve here. Goal-derived ids (`goal:<uuid>:<view>`) do not: they are
 * read straight off the goal row in metricsService, which also checks ownership.
 *
 * NULL IS NOT ZERO. A source with no rows yet returns null and the tile renders
 * "—". `syncLinkedGoals` coerces null to 0 on the way into a goal's
 * current_value, because a goal counter is a number by definition; a tile is
 * not, and a fabricated zero reads as "you did nothing" rather than "nothing
 * logged here yet".
 */

import {
  getOrCreateUserTrackingStats,
  getWeeklyApproachQualityAvg,
  getHighQualityApproachCount,
  rollTrackingCounters,
} from "./trackingRepo"
import { getScenarioStats } from "./scenarioRepo"
import { getNowInTimezone, periodStartFor, toDateISO, isStreakCurrent, startOfDayInstant } from "../shared/dateUtils"
import type { LinkedMetric } from "./goalTypes"
import type { UserTrackingStatsRow } from "./trackingTypes"

/**
 * Metrics read straight off the user_tracking_stats row but absent from
 * LINKED_METRICS — nothing syncs them into a goal, they are display-only.
 */
export const STATS_ONLY_METRICS = [
  "week_streak",
  "best_week_streak",
  "day_streak",
  "best_day_streak",
  "unique_locations",
  "weekly_reviews_cumulative",
  "weekly_review_streak",
] as const

/** Metrics that need a query beyond the stats row. */
const APPROACH_METRICS = [
  "approach_quality_avg_weekly",
  "high_quality_approaches_cumulative",
  "high_quality_approaches_weekly",
]

const SCENARIO_METRICS = [
  "scenario_sessions_cumulative",
  "scenario_types_cumulative",
  "scenario_high_scores_cumulative",
]

const HEALTH_METRICS = [
  "body_weight_current", "sleep_hours_avg_weekly",
  "gym_sessions_weekly", "gym_sessions_cumulative",
  "nutrition_quality_avg_weekly",
  "cardio_sessions_weekly", "training_hours_cumulative",
  "consecutive_training_weeks",
  "bench_press_1rm", "squat_1rm", "deadlift_1rm",
  "overhead_press_1rm", "pullups_max_reps",
  "progress_photos_cumulative", "protein_days_hit_weekly",
  "calorie_days_hit_weekly",
  "weight_lost_from_peak", "weight_gained_from_lowest",
  "body_measurements_count",
  "mobility_sessions_weekly", "yoga_sessions_weekly",
  "flexibility_hours_cumulative",
  "running_sessions_weekly", "running_distance_cumulative",
  "longest_run_km", "consecutive_cardio_weeks",
]

/**
 * Monday 00:00 of the week containing now, in the user's timezone, as the
 * absolute instant it happened — the columns it is compared against are
 * `timestamptz`, so the conversion is not optional.
 *
 * The boundary comes from `periodStartFor` and the conversion from
 * `startOfDayInstant`; neither is implemented here. This used to build the
 * instant from the SERVER's midnight, which for a Copenhagen user pulled two
 * hours of last week into this week's counts.
 */
function weekStartInstant(timezone: string): string {
  return startOfDayInstant(periodStartFor("weekly", getNowInTimezone(timezone)), timezone)
}

/**
 * A STREAK IS A NUMBER PLUS THE PERIOD IT WAS LAST EARNED IN.
 *
 * Returned raw, a streak earned in February reads as a streak in August — which
 * is exactly what the Week Streak tile did for six months, because nothing on
 * the row forces the two facts to be read together. This is the one place that
 * forces it, and every read path goes through it.
 *
 * `isStreakCurrent` allows the current period and the one immediately before it
 * (the current period is not over, so nothing has been missed yet) and nothing
 * older. It only ever hides a number; it never lowers a stored one, so a
 * recovered user still sees the streak they had.
 *
 * `longest_*` are records, not streaks, and pass through untouched.
 */
export function gateStreaks(
  stats: UserTrackingStatsRow,
  timezone: string,
  /**
   * Overridable so the gate can be asked about a boundary rather than about
   * "now". A function that reads the clock inside itself cannot be tested at the
   * hour a week turns over, and that hour is where these bugs live.
   */
  at: Date = new Date()
): UserTrackingStatsRow {
  const now = getNowInTimezone(timezone, at)
  return {
    ...stats,
    current_week_streak: isStreakCurrent("weekly", stats.last_active_week_start, periodStartFor("weekly", now))
      ? stats.current_week_streak
      : 0,
    current_streak: isStreakCurrent("daily", stats.last_approach_date, toDateISO(now))
      ? stats.current_streak
      : 0,
    // The review streak now has a key of its own: `last_review_week_start` is the
    // Monday of the week the last review was FILED FOR, written by the counter
    // projection. A weekly review is written during the week after the one it
    // covers, so "still going" means that week is this week or last week —
    // exactly the same window as the other two streaks. Without this a streak
    // that stopped in June still read as live in August, which is the bug this
    // whole function exists to kill.
    current_weekly_streak: isStreakCurrent("weekly", stats.last_review_week_start, periodStartFor("weekly", now))
      ? stats.current_weekly_streak
      : 0,
  }
}

/**
 * Get the metric value from tracking stats based on linked_metric type.
 * Weekly metrics validate that `week_start_date` is this week's Monday —
 * if the week rolled over but no new session was logged, weekly values return 0.
 *
 * Synchronous and pure: only metrics living on the stats row are answerable
 * here. Everything else needs a query and goes through resolveMetricValues.
 */
export function getMetricValue(
  stats: UserTrackingStatsRow,
  metric: LinkedMetric | (typeof STATS_ONLY_METRICS)[number],
  timezone: string
): number {
  if (metric === null) return 0

  // A weekly counter is only readable inside the week it belongs to. The row is
  // rolled before every read, so this is a second line of defence rather than
  // the only one — and it is what makes a forgotten roll show 0 instead of a
  // number from a week that is over.
  const isCurrentWeek = stats.week_start_date === periodStartFor("weekly", getNowInTimezone(timezone))

  switch (metric) {
    case "approaches_weekly":
      return isCurrentWeek ? stats.current_week_approaches : 0
    case "sessions_weekly":
      return isCurrentWeek ? stats.current_week_sessions : 0
    case "numbers_weekly":
      return isCurrentWeek ? (stats.current_week_numbers ?? 0) : 0
    case "instadates_weekly":
      return isCurrentWeek ? (stats.current_week_instadates ?? 0) : 0
    case "field_reports_weekly":
      return isCurrentWeek ? (stats.current_week_field_reports ?? 0) : 0
    case "approaches_cumulative":
      return stats.total_approaches
    case "sessions_cumulative":
      return stats.total_sessions
    case "numbers_cumulative":
      return stats.total_numbers
    case "instadates_cumulative":
      return stats.total_instadates
    case "field_reports_cumulative":
      return stats.total_field_reports
    // Display-only metrics (STATS_ONLY_METRICS) — no goal syncs to these.
    // Streaks come from `gateStreaks`; `longest_*` are records and do not decay.
    case "week_streak":
      return gateStreaks(stats, timezone).current_week_streak
    case "best_week_streak":
      return stats.longest_week_streak
    case "day_streak":
      return gateStreaks(stats, timezone).current_streak
    case "best_day_streak":
      return stats.longest_streak
    case "unique_locations":
      return stats.unique_locations?.length ?? 0
    case "weekly_reviews_cumulative":
      return stats.weekly_reviews_completed
    case "weekly_review_streak":
      return gateStreaks(stats, timezone).current_weekly_streak
    case "approach_quality_avg_weekly":
      console.warn(`[getMetricValue] approach_quality_avg_weekly should be handled by resolveMetricValues (requires async DB query). Returning 0.`)
      return 0
    case "high_quality_approaches_cumulative":
    case "high_quality_approaches_weekly":
      console.warn(`[getMetricValue] ${metric} should be handled by resolveMetricValues (requires async DB query). Returning 0.`)
      return 0
    case "scenario_sessions_cumulative":
    case "scenario_types_cumulative":
    case "scenario_high_scores_cumulative":
      console.warn(`[getMetricValue] ${metric} should be handled by resolveMetricValues (requires async DB query). Returning 0.`)
      return 0
    default:
      console.warn(`[getMetricValue] Unknown linked_metric "${metric}". Returning 0 — goal progress may be incorrect.`)
      return 0
  }
}

/**
 * Resolve a set of metric ids to numbers in as few queries as possible.
 *
 * Only the sources a requested metric actually needs are queried. A source that
 * has never been written returns null for its metrics — see the NULL IS NOT
 * ZERO note at the top of this file.
 *
 * Ids that aren't metrics (goal-derived, unknown) are simply absent from the
 * result; the caller decides what that means rather than getting a 0 back.
 */
export async function resolveMetricValues(
  userId: string,
  metricIds: string[],
  timezone: string
): Promise<Record<string, number | null>> {
  const wanted = new Set(metricIds)
  const out: Record<string, number | null> = {}
  if (wanted.size === 0) return out

  const needs = (m: string) => wanted.has(m)
  const needsAny = (list: readonly string[]) => list.some((m) => wanted.has(m))

  const statsIds = [...wanted].filter((id) => STATS_METRIC_IDS.has(id))

  // Each of these is a network round-trip to Postgres, so they run together
  // rather than one after another. Sequentially this endpoint cost ~1s; the
  // slowest single source now sets the floor instead of their sum.
  const [stats] = await Promise.all([
    statsIds.length > 0 ? loadStats(userId, timezone) : Promise.resolve(null),

    needsAny(APPROACH_METRICS)
      ? (async () => {
          await Promise.all([
            needs("approach_quality_avg_weekly")
              ? getWeeklyApproachQualityAvg(userId, weekStartInstant(timezone)).then((avg) => {
                  // Returns 0 for "nothing rated"; 0 is not on the 1-10 scale, so
                  // that is an absence, not a reading.
                  out.approach_quality_avg_weekly = avg > 0 ? avg : null
                })
              : null,
            needs("high_quality_approaches_cumulative")
              ? getHighQualityApproachCount(userId).then((n) => {
                  out.high_quality_approaches_cumulative = n
                })
              : null,
            // The same count, this week only. The "High-Quality Approaches"
            // catalogue goal ramps 2 -> 4 -> 6 A WEEK, and had the lifetime
            // count wired to it — so it read as complete on day one and the ramp
            // meant nothing.
            needs("high_quality_approaches_weekly")
              ? getHighQualityApproachCount(userId, weekStartInstant(timezone)).then((n) => {
                  out.high_quality_approaches_weekly = n
                })
              : null,
          ])
        })()
      : null,

    needsAny(SCENARIO_METRICS)
      ? getScenarioStats(userId).then((s) => {
          if (needs("scenario_sessions_cumulative")) out.scenario_sessions_cumulative = s.totalSessions
          if (needs("scenario_types_cumulative")) out.scenario_types_cumulative = s.uniqueTypes
          if (needs("scenario_high_scores_cumulative")) out.scenario_high_scores_cumulative = s.highScoreCount
        })
      : null,

    needsAny(HEALTH_METRICS)
      ? resolveHealthMetrics(userId, needs, timezone).then((health) => {
          Object.assign(out, health)
        })
      : null,
  ])

  if (stats) {
    for (const id of statsIds) {
      if (id in out) continue
      out[id] = getMetricValue(stats, id as LinkedMetric, timezone)
    }
  }

  return out
}

/**
 * The stats row, repaired only when the answer depends on the repair.
 *
 * repairWeeklyCounters costs two COUNT queries. The counters it fixes are the
 * weekly ones, so a dashboard showing only lifetime totals and streaks — which
 * the default layout is — has nothing to gain from paying for it.
 */
/**
 * The stats row, rolled to the current week before anything reads it.
 *
 * It used to recount this week's five counters from the source tables on every
 * read ("repairWeeklyCounters"), because under the old `+1` scheme a failed
 * write left the cache wrong forever. Counters are now recomputed from the rows
 * on every write (`achievementsService.projectTrackingStats`), so there is
 * nothing left to repair — and the repair had become actively harmful: it
 * counted DIFFERENT rows (all sessions by `started_at`, approaches by
 * `created_at`) than the projection (completed sessions by `ended_at`,
 * approaches by `timestamp`), so the two overwrote each other and a tile could
 * show a different number on every page load.
 */
async function loadStats(
  userId: string,
  timezone: string
): Promise<UserTrackingStatsRow> {
  // ROLL BEFORE YOU READ. A weekly counter belongs to the week named by
  // `week_start_date`; if that week is over, the number on the row is last
  // week's and the page would draw it as this week's.
  await rollTrackingCounters(userId, timezone)
  return getOrCreateUserTrackingStats(userId)
}

/** Ids `getMetricValue` can answer from the stats row alone. */
const STATS_METRIC_IDS = new Set<string>([
  "approaches_weekly", "sessions_weekly", "numbers_weekly", "instadates_weekly", "field_reports_weekly",
  "approaches_cumulative", "sessions_cumulative", "numbers_cumulative", "instadates_cumulative", "field_reports_cumulative",
  ...STATS_ONLY_METRICS,
])

/**
 * Health sources, fetched in parallel, each only if something asked for it.
 * A rejected fetch yields null rather than 0 — a failed query is not evidence
 * that the user has never trained.
 */
async function resolveHealthMetrics(
  userId: string,
  needs: (m: string) => boolean,
  timezone: string
): Promise<Record<string, number | null>> {
  const hr = await import("./healthRepo")

  const jobs: [string, Promise<unknown> | null][] = [
    ["body_weight_current", needs("body_weight_current") ? hr.getLatestWeight(userId) : null],
    ["sleep_hours_avg_weekly", needs("sleep_hours_avg_weekly") ? hr.getSleepWeeklyAvgHours(userId, timezone) : null],
    ["gym_sessions_weekly", needs("gym_sessions_weekly") ? hr.getWorkoutWeeklyCount(userId, timezone) : null],
    ["gym_sessions_cumulative", needs("gym_sessions_cumulative") ? hr.getWorkoutCumulativeCount(userId) : null],
    ["nutrition_quality_avg_weekly", needs("nutrition_quality_avg_weekly") ? hr.getNutritionWeeklyAvg(userId, timezone) : null],
    ["cardio_sessions_weekly", needs("cardio_sessions_weekly") ? hr.getCardioWeeklyCount(userId, timezone) : null],
    ["training_hours_cumulative", needs("training_hours_cumulative") ? hr.getTrainingHoursCumulative(userId) : null],
    ["consecutive_training_weeks", needs("consecutive_training_weeks") ? hr.getConsecutiveTrainingWeeks(userId, timezone) : null],
    ["bench_press_1rm", needs("bench_press_1rm") ? hr.getExerciseMax(userId, "bench press") : null],
    ["squat_1rm", needs("squat_1rm") ? hr.getExerciseMax(userId, "squat") : null],
    ["deadlift_1rm", needs("deadlift_1rm") ? hr.getExerciseMax(userId, "deadlift") : null],
    ["overhead_press_1rm", needs("overhead_press_1rm") ? hr.getExerciseMax(userId, "overhead press") : null],
    ["pullups_max_reps", needs("pullups_max_reps") ? hr.getPullUpsMax(userId) : null],
    ["progress_photos_cumulative", needs("progress_photos_cumulative") ? hr.getProgressPhotoCount(userId) : null],
    ["protein_days_hit_weekly", needs("protein_days_hit_weekly") ? hr.getProteinDaysHitWeekly(userId, timezone) : null],
    ["calorie_days_hit_weekly", needs("calorie_days_hit_weekly") ? hr.getCalorieDaysHitWeekly(userId, timezone) : null],
    ["weight_lost_from_peak", needs("weight_lost_from_peak") ? hr.getWeightLostFromPeak(userId) : null],
    ["weight_gained_from_lowest", needs("weight_gained_from_lowest") ? hr.getWeightGainedFromLowest(userId) : null],
    ["body_measurements_count", needs("body_measurements_count") ? hr.getBodyMeasurementCount(userId) : null],
    ["mobility_sessions_weekly", needs("mobility_sessions_weekly") ? hr.getMobilitySessionsWeekly(userId, timezone) : null],
    ["yoga_sessions_weekly", needs("yoga_sessions_weekly") ? hr.getYogaSessionsWeekly(userId, timezone) : null],
    ["flexibility_hours_cumulative", needs("flexibility_hours_cumulative") ? hr.getFlexibilityHoursCumulative(userId) : null],
    ["running_sessions_weekly", needs("running_sessions_weekly") ? hr.getRunningSessionsWeekly(userId, timezone) : null],
    ["running_distance_cumulative", needs("running_distance_cumulative") ? hr.getRunningDistanceCumulative(userId) : null],
    ["longest_run_km", needs("longest_run_km") ? hr.getLongestRunKm(userId) : null],
    ["consecutive_cardio_weeks", needs("consecutive_cardio_weeks") ? hr.getConsecutiveCardioWeeks(userId, timezone) : null],
  ]

  const settled = await Promise.allSettled(jobs.map(([, p]) => p ?? Promise.resolve(null)))
  const out: Record<string, number | null> = {}

  settled.forEach((r, i) => {
    const [id, requested] = jobs[i]
    if (!requested) return
    if (r.status !== "fulfilled" || r.value === null || r.value === undefined) {
      out[id] = null
      return
    }
    if (typeof r.value === "number") {
      out[id] = r.value
      return
    }
    // getLatestWeight returns the whole log row.
    if (typeof r.value === "object" && "weight_kg" in (r.value as Record<string, unknown>)) {
      out[id] = (r.value as { weight_kg: number }).weight_kg
      return
    }
    out[id] = null
  })

  return out
}
