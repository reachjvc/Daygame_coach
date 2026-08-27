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

import { createServerSupabaseClient } from "./supabase"
import {
  getOrCreateUserTrackingStats,
  getWeeklyApproachQualityAvg,
  getHighQualityApproachCount,
  updateUserTrackingStats,
} from "./trackingRepo"
import { getScenarioStats } from "./scenarioRepo"
import { getISOWeekString } from "../tracking/trackingService"
import { getNowInTimezone } from "../shared/dateUtils"
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
const APPROACH_METRICS = ["approach_quality_avg_weekly", "high_quality_approaches_cumulative"]

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

/** Monday 00:00 of the week containing `now`, in the user's timezone. */
function weekStartISO(timezone: string | null): string {
  const now = getNowInTimezone(timezone)
  const dayOfWeek = now.getDay() || 7 // 1=Mon..7=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

/**
 * Get the metric value from tracking stats based on linked_metric type.
 * Weekly metrics validate that current_week matches the actual current week —
 * if the week rolled over but no new session was logged, weekly values return 0.
 *
 * Synchronous and pure: only metrics living on the stats row are answerable
 * here. Everything else needs a query and goes through resolveMetricValues.
 */
export function getMetricValue(
  stats: UserTrackingStatsRow,
  metric: LinkedMetric | (typeof STATS_ONLY_METRICS)[number],
  timezone: string | null = null
): number {
  if (metric === null) return 0

  const currentWeek = getISOWeekString(getNowInTimezone(timezone))
  const isCurrentWeek = stats.current_week === currentWeek

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
    case "week_streak":
      return stats.current_week_streak
    case "best_week_streak":
      return stats.longest_week_streak
    case "day_streak":
      return stats.current_streak
    case "best_day_streak":
      return stats.longest_streak
    case "unique_locations":
      return stats.unique_locations?.length ?? 0
    case "weekly_reviews_cumulative":
      return stats.weekly_reviews_completed
    case "weekly_review_streak":
      return stats.current_weekly_streak
    case "approach_quality_avg_weekly":
      console.warn(`[getMetricValue] approach_quality_avg_weekly should be handled by resolveMetricValues (requires async DB query). Returning 0.`)
      return 0
    case "high_quality_approaches_cumulative":
      console.warn(`[getMetricValue] high_quality_approaches_cumulative should be handled by resolveMetricValues (requires async DB query). Returning 0.`)
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
 * Recompute this week's counters from the underlying rows.
 *
 * Pre-computed counters drift: session, approach and field-report writes each
 * advance `current_week` without resetting the others' counters, so a week that
 * turned over between two writes leaves stale numbers behind. Called on every
 * resolve because a wrong number on screen is worse than one extra count query.
 */
async function repairWeeklyCounters(
  userId: string,
  stats: UserTrackingStatsRow,
  timezone: string | null
): Promise<UserTrackingStatsRow> {
  if (stats.current_week !== getISOWeekString(getNowInTimezone(timezone))) return stats

  const supabase = await createServerSupabaseClient()
  const mondayISO = weekStartISO(timezone)

  const { count: sessionCount } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("started_at", mondayISO)

  const { count: approachCount } = await supabase
    .from("approaches")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", mondayISO)

  const realSessions = sessionCount ?? 0
  const realApproaches = approachCount ?? 0

  if (realSessions === stats.current_week_sessions && realApproaches === stats.current_week_approaches) {
    return stats
  }

  console.warn(`[metricsRepo] repairing weekly counters: sessions ${stats.current_week_sessions} → ${realSessions}, approaches ${stats.current_week_approaches} → ${realApproaches}`)
  await updateUserTrackingStats(userId, {
    current_week_sessions: realSessions,
    current_week_approaches: realApproaches,
  })
  return { ...stats, current_week_sessions: realSessions, current_week_approaches: realApproaches }
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
  timezone: string | null = null
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
    statsIds.length > 0 ? loadStats(userId, statsIds, timezone) : Promise.resolve(null),

    needsAny(APPROACH_METRICS)
      ? (async () => {
          await Promise.all([
            needs("approach_quality_avg_weekly")
              ? getWeeklyApproachQualityAvg(userId, weekStartISO(timezone)).then((avg) => {
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
      ? resolveHealthMetrics(userId, needs).then((health) => {
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
async function loadStats(
  userId: string,
  statsIds: string[],
  timezone: string | null
): Promise<UserTrackingStatsRow> {
  const stats = await getOrCreateUserTrackingStats(userId)
  const needsWeekly = statsIds.some((id) => id.endsWith("_weekly"))
  return needsWeekly ? repairWeeklyCounters(userId, stats, timezone) : stats
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
  needs: (m: string) => boolean
): Promise<Record<string, number | null>> {
  const hr = await import("./healthRepo")

  const jobs: [string, Promise<unknown> | null][] = [
    ["body_weight_current", needs("body_weight_current") ? hr.getLatestWeight(userId) : null],
    ["sleep_hours_avg_weekly", needs("sleep_hours_avg_weekly") ? hr.getSleepWeeklyAvgHours(userId) : null],
    ["gym_sessions_weekly", needs("gym_sessions_weekly") ? hr.getWorkoutWeeklyCount(userId) : null],
    ["gym_sessions_cumulative", needs("gym_sessions_cumulative") ? hr.getWorkoutCumulativeCount(userId) : null],
    ["nutrition_quality_avg_weekly", needs("nutrition_quality_avg_weekly") ? hr.getNutritionWeeklyAvg(userId) : null],
    ["cardio_sessions_weekly", needs("cardio_sessions_weekly") ? hr.getCardioWeeklyCount(userId) : null],
    ["training_hours_cumulative", needs("training_hours_cumulative") ? hr.getTrainingHoursCumulative(userId) : null],
    ["consecutive_training_weeks", needs("consecutive_training_weeks") ? hr.getConsecutiveTrainingWeeks(userId) : null],
    ["bench_press_1rm", needs("bench_press_1rm") ? hr.getExerciseMax(userId, "bench press") : null],
    ["squat_1rm", needs("squat_1rm") ? hr.getExerciseMax(userId, "squat") : null],
    ["deadlift_1rm", needs("deadlift_1rm") ? hr.getExerciseMax(userId, "deadlift") : null],
    ["overhead_press_1rm", needs("overhead_press_1rm") ? hr.getExerciseMax(userId, "overhead press") : null],
    ["pullups_max_reps", needs("pullups_max_reps") ? hr.getPullUpsMax(userId) : null],
    ["progress_photos_cumulative", needs("progress_photos_cumulative") ? hr.getProgressPhotoCount(userId) : null],
    ["protein_days_hit_weekly", needs("protein_days_hit_weekly") ? hr.getProteinDaysHitWeekly(userId) : null],
    ["calorie_days_hit_weekly", needs("calorie_days_hit_weekly") ? hr.getCalorieDaysHitWeekly(userId) : null],
    ["weight_lost_from_peak", needs("weight_lost_from_peak") ? hr.getWeightLostFromPeak(userId) : null],
    ["weight_gained_from_lowest", needs("weight_gained_from_lowest") ? hr.getWeightGainedFromLowest(userId) : null],
    ["body_measurements_count", needs("body_measurements_count") ? hr.getBodyMeasurementCount(userId) : null],
    ["mobility_sessions_weekly", needs("mobility_sessions_weekly") ? hr.getMobilitySessionsWeekly(userId) : null],
    ["yoga_sessions_weekly", needs("yoga_sessions_weekly") ? hr.getYogaSessionsWeekly(userId) : null],
    ["flexibility_hours_cumulative", needs("flexibility_hours_cumulative") ? hr.getFlexibilityHoursCumulative(userId) : null],
    ["running_sessions_weekly", needs("running_sessions_weekly") ? hr.getRunningSessionsWeekly(userId) : null],
    ["running_distance_cumulative", needs("running_distance_cumulative") ? hr.getRunningDistanceCumulative(userId) : null],
    ["longest_run_km", needs("longest_run_km") ? hr.getLongestRunKm(userId) : null],
    ["consecutive_cardio_weeks", needs("consecutive_cardio_weeks") ? hr.getConsecutiveCardioWeeks(userId) : null],
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
