/**
 * Health & Appearance business logic
 *
 * Computations for rolling averages, trend detection, plateau detection,
 * cross-domain correlations, and PR detection.
 */

import { periodStartFor, previousPeriodStart, isStreakCurrent, middayInstant, localTimeInstant, getTodayInTimezone, toDateISO, toZonedDate } from "@/src/shared/dateUtils"
import { weeklyStreakRun } from "@/src/shared/streakRuns"
import { estimateOneRepMax } from "@/src/programs/programsService"
import { isTimedLift } from "@/src/programs/data/exerciseLibrary"
import type { LoadPoint } from "@/src/programs/types"
import { fromKg, toKg } from "@/src/shared/weight"
import type {
  WeightLogRow,
  WeightTrend,
  WeightUnit,
  SleepLogRow,
  SleepStats,
  SleepQuality,
  WorkoutLogRow,
  WorkoutLogWithSets,
  WorkoutSetRow,
  HeatmapDay,
  PersonalRecord,
  NutritionLogRow,
  NutritionStats,
  CorrelationInsight,
  SessionType,
} from "./types"

// ============================================================================
// Unit Conversion
// ============================================================================

/**
 * THE SECOND CONSTANT IS GONE. This slice held `KG_TO_LBS = 2.20462`, whose
 * reciprocal is 0.45359290 — the programs slice used the exact 0.45359237, so
 * the same weight could round differently depending on which screen read it.
 * Both now come from `src/shared/weight.ts`.
 */
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value
  return from === "kg" ? fromKg(value, "lb") : toKg(value, "lb")
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  const val = unit === "kg" ? kg : fromKg(kg, "lb")
  return `${val.toFixed(1)} ${unit}`
}

// ============================================================================
// Weight Trend Computation
// ============================================================================

/**
 * Compute 7-day rolling average, velocity, plateau detection from weight logs.
 * Expects entries sorted by logged_at ascending.
 */
export function computeWeightTrend(
  entries: WeightLogRow[],
  targetWeight: number | null = null
): WeightTrend {
  if (entries.length === 0) {
    return {
      rollingAvg7d: null,
      rawEntries: [],
      velocityPerWeek: null,
      projectedTargetDate: null,
      trendDirection: "flat",
      plateauDays: 0,
    }
  }

  const rawEntries = entries.map((e) => ({
    date: e.logged_at.split("T")[0],
    weight_kg: e.weight_kg,
    time_of_day: e.time_of_day,
  }))

  // 7-day rolling average (use last 7 entries, not necessarily 7 days)
  const last7 = entries.slice(-7)
  const rollingAvg7d = last7.reduce((sum, e) => sum + e.weight_kg, 0) / last7.length

  // Velocity: compare current 7d avg with 7d avg from 7 entries ago
  let velocityPerWeek: number | null = null
  if (entries.length >= 14) {
    const prev7 = entries.slice(-14, -7)
    const prevAvg = prev7.reduce((sum, e) => sum + e.weight_kg, 0) / prev7.length
    const daysBetween = Math.max(1, daysDiff(prev7[0].logged_at, last7[last7.length - 1].logged_at))
    velocityPerWeek = ((rollingAvg7d - prevAvg) / daysBetween) * 7
  }

  // Plateau detection: how many days the weight has been flat (< 0.3kg change)
  let plateauDays = 0
  if (entries.length >= 10) {
    const recentAvg = rollingAvg7d
    for (let i = entries.length - 1; i >= 0; i--) {
      if (Math.abs(entries[i].weight_kg - recentAvg) < 0.3) {
        plateauDays = daysDiff(entries[i].logged_at, entries[entries.length - 1].logged_at)
      } else {
        break
      }
    }
  }

  // Trend direction
  let trendDirection: WeightTrend["trendDirection"] = "flat"
  if (velocityPerWeek !== null && targetWeight !== null) {
    const goingDown = targetWeight < rollingAvg7d
    if (goingDown) {
      trendDirection = velocityPerWeek < -0.1 ? "toward_goal" : velocityPerWeek > 0.1 ? "reversing" : "flat"
    } else {
      trendDirection = velocityPerWeek > 0.1 ? "toward_goal" : velocityPerWeek < -0.1 ? "reversing" : "flat"
    }
  } else if (plateauDays >= 10) {
    trendDirection = "flat"
  }

  // Projected target date
  let projectedTargetDate: string | null = null
  if (velocityPerWeek !== null && targetWeight !== null && Math.abs(velocityPerWeek) > 0.05) {
    const kgRemaining = targetWeight - rollingAvg7d
    const weeksToTarget = kgRemaining / velocityPerWeek
    if (weeksToTarget > 0 && weeksToTarget < 200) {
      const target = new Date()
      target.setDate(target.getDate() + Math.round(weeksToTarget * 7))
      projectedTargetDate = toDateISO(target)
    }
  }

  return {
    rollingAvg7d,
    rawEntries,
    velocityPerWeek,
    projectedTargetDate,
    trendDirection,
    plateauDays,
  }
}

// ============================================================================
// Sleep Stats Computation
// ============================================================================

/**
 * Compute sleep stats from logs. Entries sorted by logged_at ascending.
 */
export function computeSleepStats(
  entries: SleepLogRow[],
  targetHours: number = 8
): SleepStats {
  if (entries.length === 0) {
    return { avgHoursWeekly: null, sleepDebt: 0, bedtimeConsistency: [], entries: [] }
  }

  const parsed = entries.map((e) => {
    const hours = computeSleepHours(e.bedtime, e.wake_time)
    const bedtimeMin = timeToMinutesSinceMidnight(e.bedtime)
    return {
      date: e.logged_at.split("T")[0],
      hours,
      quality: e.quality as SleepQuality,
      bedtimeMinutes: bedtimeMin,
    }
  })

  // Weekly average (last 7 entries)
  const last7 = parsed.slice(-7)
  const avgHoursWeekly = last7.reduce((sum, e) => sum + e.hours, 0) / last7.length

  // Sleep debt against target
  const sleepDebt = last7.reduce((debt, e) => debt + Math.max(0, targetHours - e.hours), 0)

  return {
    avgHoursWeekly,
    sleepDebt,
    bedtimeConsistency: parsed.map((e) => ({ date: e.date, bedtimeMinutes: e.bedtimeMinutes })),
    entries: parsed.map((e) => ({ date: e.date, hours: e.hours, quality: e.quality })),
  }
}

/**
 * Compute sleep duration in hours from bedtime and wake_time strings.
 * Handles overnight sleep (e.g., 23:00 → 07:00 = 8h).
 */
export function computeSleepHours(bedtime: string, wakeTime: string): number {
  const bedMin = timeToMinutesSinceMidnight(bedtime)
  const wakeMin = timeToMinutesSinceMidnight(wakeTime)
  let diff = wakeMin - bedMin
  if (diff <= 0) diff += 24 * 60 // overnight
  return diff / 60
}

function timeToMinutesSinceMidnight(time: string): number {
  // Handle both "HH:MM" and full ISO datetime strings
  const timeStr = time.includes("T") ? time.split("T")[1].substring(0, 5) : time.substring(0, 5)
  const [h, m] = timeStr.split(":").map(Number)
  return h * 60 + m
}

// ============================================================================
// Workout Stats
// ============================================================================

/**
 * Detect personal records from a set history.
 * Returns new PRs relative to previous entries for the same exercise.
 */
/**
 * Is this a set the numbers should be built from?
 *
 * `is_warmup` became `set_kind`, because a boolean could say "warm-up" and
 * nothing else — an all-out top set and a back-off set, the two things a
 * progression rule most needs to tell apart, were indistinguishable from
 * ordinary work. Warm-ups and drop sets stay out of every total, chart and
 * personal record, which is what the boolean was for; the rest count.
 */
export function isWorkingSet(set: { set_kind?: string | null }): boolean {
  const kind = set.set_kind ?? "working"
  return kind !== "warmup" && kind !== "drop"
}

/**
 * @param onDate The lifter's own calendar day for these sets, YYYY-MM-DD.
 *   Passed in, never taken from the clock here: this runs in a route handler on
 *   a server whose process time is UTC, so `new Date()` filed a Berlin lifter's
 *   00:30 Tuesday record on Monday and a Los Angeles lifter's 18:00 Monday one
 *   on Tuesday. It is also the day of the WORKOUT rather than the day it was
 *   written up, so a Tuesday session closed on Thursday still reads Tuesday.
 *
 *   REQUIRED, not optional with a fall-back to the clock. It was optional, and
 *   the fall-back was `new Date()` — the exact thing the paragraph above says
 *   must never happen. Every caller today passes the account's day, so the
 *   fall-back was unreachable; leaving it in place meant the next caller who
 *   forgot would get the server's calendar silently instead of a red build.
 */
export function detectPersonalRecords(
  allSets: (WorkoutSetRow & { logged_at: string })[],
  newSets: WorkoutSetRow[],
  onDate: string
): PersonalRecord[] {
  const records: PersonalRecord[] = []
  const exerciseMaxes = new Map<string, { weight_kg: number; reps: number }>()

  // Build map of previous maxes (by exercise); warm-up sets never count toward PRs
  for (const s of allSets) {
    if (!isWorkingSet(s)) continue
    const key = s.exercise.toLowerCase()
    const prev = exerciseMaxes.get(key)
    if (!prev || s.weight_kg > prev.weight_kg || (s.weight_kg === prev.weight_kg && s.reps > prev.reps)) {
      exerciseMaxes.set(key, { weight_kg: s.weight_kg, reps: s.reps })
    }
  }

  /**
   * Check the new sets, RAISING THE BAR AS IT GOES.
   *
   * The running best was built from the history and then never updated, so
   * every qualifying set in the session was announced separately: three sets of
   * five at a new weight reported "New best" three times, for the same lift, on
   * the same numbers. Only the best set of the session is the record.
   */
  for (const s of newSets) {
    if (!isWorkingSet(s)) continue
    const key = s.exercise.toLowerCase()
    const prev = exerciseMaxes.get(key)
    /**
     * A LIFT YOU HAVE NEVER DONE HAS NOTHING TO BEAT.
     *
     * With no history at all, `prev` is undefined and every single set counted
     * as a record — so the very first set a new account ever logged came back
     * as "New best", and so did all six lifts of somebody's first session. That
     * is not a best, it is a first: `firstTimeLifts` names those instead, which
     * is true and still worth seeing.
     */
    if (!prev) continue
    if (s.weight_kg > prev.weight_kg || (s.weight_kg === prev.weight_kg && s.reps > prev.reps)) {
      exerciseMaxes.set(key, { weight_kg: s.weight_kg, reps: s.reps })
      // Replace an earlier announcement for the same lift rather than adding to
      // it: what stands at the end of the session is the record.
      const already = records.findIndex((r) => r.exercise.toLowerCase() === key)
      if (already >= 0) records.splice(already, 1)
      records.push({
        exercise: s.exercise,
        weight_kg: s.weight_kg,
        reps: s.reps,
        date: onDate,
        isNew: true,
      })
    }
  }

  return records
}

/**
 * Lifts in this session that have never been logged before.
 *
 * THE OTHER HALF OF "New best". Records are claimed against a history, and a
 * lift with no history cannot beat anything — so these are named as firsts.
 * Both answers come from ONE read of the past (`personalBestBaseline`), because
 * worked out separately at different moments they would disagree.
 *
 * Warm-ups do not count as having done a lift: five reps of the empty bar is
 * not "you have benched before".
 */
export function firstTimeLifts(
  prior: (WorkoutSetRow & { logged_at: string })[],
  newSets: WorkoutSetRow[]
): string[] {
  const known = new Set(
    prior.filter(isWorkingSet).map((s) => s.exercise.trim().toLowerCase())
  )
  const firsts = new Map<string, string>()
  for (const s of newSets) {
    if (!isWorkingSet(s)) continue
    const key = s.exercise.trim().toLowerCase()
    if (known.has(key) || firsts.has(key)) continue
    firsts.set(key, s.exercise.trim())
  }
  return [...firsts.values()]
}

/**
 * An estimated one-rep max, with the cap that keeps it honest.
 *
 * ONE FORMULA, BECAUSE THERE WERE TWO. Epley (`weight × (1 + reps/30)`)
 * inflates badly at high reps: a 60 kg set of twenty comes out as 100 kg, a
 * weight nobody in that example has ever lifted. `liftBests` capped it at ten
 * reps and the "estimated 1RM" tile on the dashboard did not, so the same set
 * produced two different numbers on two screens. Above ten reps the honest
 * answer is the weight itself.
 */
export function cappedEstimate(weightKg: number, reps: number): number {
  return reps > 10 ? weightKg : estimateOneRepMax(weightKg, reps)
}

/** Local-date key (YYYY-MM-DD) so a 23:30 workout counts on the day the user trained. */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * The Monday of the week containing `d`, as a Date at local midnight.
 *
 * The boundary itself comes from `periodStartFor` — the one implementation of a
 * week in this codebase. This wrapper only turns the answer back into a Date,
 * because the heatmap grid steps forward in days from it.
 */
function mondayOf(d: Date): Date {
  const [y, m, day] = periodStartFor("weekly", d).split("-").map(Number)
  return new Date(y, m - 1, day)
}

/**
 * WHAT A SESSION WAS, IN WORDS, for a row that has no lifts to name.
 *
 * History described a workout by its top sets — which says nothing at all
 * about a run, a yoga class or a mobility session, because they have none. A
 * finished 5 km read as `running`, the raw column value, lower-cased and on
 * its own, and opening it said "No sets were recorded for this one" as though
 * something had gone wrong.
 *
 * A NUMBER THAT IS NOT THERE IS NOT ZERO. A missing distance or duration is
 * left out of the sentence rather than printed as "0 km" — the silent-failure
 * rule, in the one place a reader would believe it.
 */
export function describeSessionRow(log: {
  session_type: string
  distance_km?: number | null
  duration_min?: number | null
}): string {
  // "running" reads as a state; "Run" reads as a thing you did.
  const kind =
    log.session_type === "running"
      ? "Run"
      : log.session_type.charAt(0).toUpperCase() + log.session_type.slice(1)
  const parts = [kind]
  if (log.distance_km !== null && log.distance_km !== undefined) {
    parts.push(`${log.distance_km} km`)
  }
  if (log.duration_min !== null && log.duration_min !== undefined) {
    parts.push(`${log.duration_min} min`)
  }
  return parts.join(" · ")
}

/**
 * One lift's whole history, across every program and every loose workout.
 *
 * `summariseProgression` reads ONE enrollment's session logs, so "my bench"
 * resets the day you change program — which is exactly backwards, because the
 * lift is the thing that persists and the program is the thing that changes.
 *
 * `workout_sets` is the table that already spans everything: a program session
 * mirrors into it and the free-form logger writes to it directly. It is keyed by
 * exercise NAME rather than by a program-specific id, which is usually a
 * weakness and here is the whole point — the same name across two programs is
 * the same lift.
 *
 * Matched on `exercise.toLowerCase().trim()`, the key `detectPersonalRecords`
 * already uses. A second normalisation would mean a PR and a history that
 * disagree about what counts as the same lift.
 *
 * One point per DAY, taking the heaviest working set, so a session logged as
 * five sets is one point and a drop set does not read as a collapse. Warm-ups
 * are excluded for the same reason they are excluded from PRs.
 */
export function liftHistory(
  sets: (WorkoutSetRow & { logged_at: string })[],
  exercise: string,
  /**
   * The ACCOUNT's zone. Required, because the alternative is the machine's —
   * and on the server that is UTC, so a 23:30 Copenhagen set was filed on the
   * previous day and a 18:00 Los Angeles one on the next.
   */
  timezone: string
): LoadPoint[] {
  const key = exercise.toLowerCase().trim()
  const topByDay = new Map<string, { at: string; weight: number }>()

  for (const s of sets) {
    if (!isWorkingSet(s)) continue
    if (s.exercise.toLowerCase().trim() !== key) continue
    const day = getTodayInTimezone(timezone, new Date(s.logged_at))
    const cur = topByDay.get(day)
    if (!cur || s.weight_kg > cur.weight) topByDay.set(day, { at: s.logged_at, weight: s.weight_kg })
  }

  return [...topByDay.values()].sort((a, b) => a.at.localeCompare(b.at))
}

/**
 * The lifts with enough history to be worth drawing, most-trained first.
 *
 * A list of every exercise name somebody has ever typed is not a feature; two
 * points is the minimum a line can be drawn from, which makes it the natural
 * floor here too.
 */
export function liftsWithHistory(
  sets: (WorkoutSetRow & { logged_at: string })[],
  /** The account's zone, for the same reason `liftHistory` needs it. */
  timezone: string,
  minDays = 2
): { exercise: string; points: LoadPoint[] }[] {
  const names = new Map<string, string>()
  for (const s of sets) {
    if (!isWorkingSet(s)) continue
    const key = s.exercise.toLowerCase().trim()
    // Keep the first spelling seen, so the list does not flip between
    // "Bench press" and "Bench Press" depending on load order.
    if (!names.has(key)) names.set(key, s.exercise)
  }
  return [...names.values()]
    .map((exercise) => ({ exercise, points: liftHistory(sets, exercise, timezone) }))
    .filter((l) => l.points.length >= minDays)
    .sort((a, b) => b.points.length - a.points.length)
}

/**
 * Every set ever logged, as a spreadsheet.
 *
 * "I lost years of data" is one of the loudest complaints about training apps,
 * and the answer people actually want is not a backup promise — it is a file
 * they hold. `workout_sets` already spans both program sessions and loose
 * workouts, so one table is the whole export.
 *
 * QUOTING IS THE ONLY HARD PART and it is the part that silently corrupts a
 * file: an exercise called "Bench Press, close grip" splits into two columns in
 * every spreadsheet on earth unless it is quoted, and a quote inside a name has
 * to be doubled. Warm-ups are marked rather than dropped — they are part of what
 * happened, they are simply not working sets.
 */
export function workoutsToCsv(logs: WorkoutLogWithSets[], timezone: string): string {
  // `set_kind` rather than a warm-up flag: the file can now say whether a set
  // was an all-out top set or a back-off, which "warm_up: false" could not.
  const header = ["date", "session_type", "duration_min", "exercise", "set", "reps", "weight_kg", "set_kind"]
  const cell = (v: string | number | boolean | null): string => {
    if (v === null) return ""
    const str = String(v)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const rows: string[] = [header.join(",")]

  for (const log of logs) {
    // The file you hold has to agree with the screen it came from: the day
              // is the account's, not the machine's.
    const date = getTodayInTimezone(timezone, new Date(log.logged_at))
    // A cardio session has no sets and still belongs in the file — leaving it
    // out would make the export disagree with the session count on screen.
    if (!log.sets || log.sets.length === 0) {
      rows.push([date, log.session_type, log.duration_min, "", "", "", "", ""].map(cell).join(","))
      continue
    }
    for (const s of log.sets) {
      rows.push(
        [date, log.session_type, log.duration_min, s.exercise, s.set_number, s.reps, s.weight_kg, s.set_kind]
          .map(cell)
          .join(",")
      )
    }
  }
  return rows.join("\n")
}

/**
 * `workoutsOnDate` was here, keyed by the running process's clock — see
 * tests/unit/health/workoutsByLocalDate.test.ts for why that is the wrong
 * clock. Its one caller was the deleted form. What day a workout belongs to is
 * answered in the account's zone, by `workoutsByLocalDate`.
 */

/**
 * Aligned activity grid: `weeks` Monday-start columns of 7 days, ending with
 * the week containing `today`. Days after `today` are flagged future.
 */
export function buildWorkoutHeatmapWeeks(
  logs: WorkoutLogRow[],
  today: Date,
  weeks: number = 13
): HeatmapDay[][] {
  const counts = new Map<string, number>()
  for (const log of logs) {
    const key = localDateKey(new Date(log.logged_at))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const todayKey = localDateKey(today)
  const start = mondayOf(today)
  start.setDate(start.getDate() - (weeks - 1) * 7)

  const grid: HeatmapDay[][] = []
  for (let w = 0; w < weeks; w++) {
    const week: HeatmapDay[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + w * 7 + d)
      const key = localDateKey(day)
      week.push({ date: key, count: counts.get(key) ?? 0, future: key > todayKey })
    }
    grid.push(week)
  }
  return grid
}

/**
 * Consecutive weeks with at least one workout, as of `today`.
 *
 * An empty current week does not break the run — it is not over yet. That was
 * already right here and wrong in `healthRepo.getConsecutiveTrainingWeeks`,
 * which is exactly why both now go through `streakRun`: one rule written twice
 * is one rule that will eventually disagree with itself.
 *
 * `today` is the viewer's own Date, so this uses the viewer's calendar. The
 * server-side twin takes an explicit timezone instead.
 */
export function computeWeekStreak(logs: WorkoutLogRow[], today: Date): number {
  const mondays = logs.map((log) => periodStartFor("weekly", new Date(log.logged_at)))
  const thisWeek = periodStartFor("weekly", today)

  const { run, last } = weeklyStreakRun(mondays, (monday) =>
    previousPeriodStart("weekly", monday)
  )
  return isStreakCurrent("weekly", last, thisWeek) ? run : 0
}

/**
 * `summarizeWorkoutSets` was here. It built "Squat 120 kg × 5" from a set
 * list, with kilograms baked into the string — so a pounds lifter read their
 * own history in numbers they never lifted. `HistoryTab` builds that line
 * itself, in the lifter's unit; there is no second copy to drift now.
 */

/**
 * `findLastExerciseSets` was here: the last time you did a given lift, for the
 * form that pre-filled its rows from it. The live screen asks the server for
 * the same fact (`lastTime`, resolved in `app/programs/live/page.tsx`), which
 * is the one that has the whole history rather than the 90 days the form had
 * loaded.
 */

// ============================================================================
// Nutrition Stats
// ============================================================================

/**
 * Compute nutrition stats from logs.
 */
export function computeNutritionStats(
  entries: NutritionLogRow[],
  proteinTarget: number | null = null
): NutritionStats {
  if (entries.length === 0) {
    return { weeklyQualityAvg: null, proteinHitRate: null, entries: [] }
  }

  // Weekly quality average (last 7 entries)
  const last7 = entries.slice(-7)
  const weeklyQualityAvg = last7.reduce((sum, e) => sum + e.quality_score, 0) / last7.length

  // Protein hit rate (% of days hitting target)
  let proteinHitRate: number | null = null
  if (proteinTarget !== null) {
    const withProtein = entries.filter((e) => e.protein_g !== null)
    if (withProtein.length > 0) {
      const hits = withProtein.filter((e) => (e.protein_g ?? 0) >= proteinTarget).length
      proteinHitRate = Math.round((hits / withProtein.length) * 100)
    }
  }

  return {
    weeklyQualityAvg,
    proteinHitRate,
    entries: entries.map((e) => ({
      date: e.logged_at.split("T")[0],
      quality: e.quality_score,
      note: e.note,
      protein_g: e.protein_g,
    })),
  }
}

// ============================================================================
// Cross-Domain Correlation
// ============================================================================

/**
 * Generate correlation insights between health data and daygame performance.
 * Takes aggregated health data and session data for the same period.
 */
export function generateCorrelationInsights(
  sleepData: { date: string; hours: number }[],
  sessionData: { date: string; approachCount: number; rating: number | null }[]
): CorrelationInsight[] {
  const insights: CorrelationInsight[] = []

  if (sleepData.length < 7 || sessionData.length < 3) return insights

  // Sleep vs approach count correlation
  const sessionDates = new Set(sessionData.map((s) => s.date))
  const sleepBeforeSessions = sleepData.filter((s) => {
    const nextDay = addDays(s.date, 1)
    return sessionDates.has(nextDay)
  })

  if (sleepBeforeSessions.length >= 3) {
    const goodSleepSessions = sleepBeforeSessions.filter((s) => s.hours >= 7)
    const badSleepSessions = sleepBeforeSessions.filter((s) => s.hours < 6)

    if (goodSleepSessions.length >= 2 && badSleepSessions.length >= 1) {
      const goodAvgApproaches = avgApproachesForDates(
        goodSleepSessions.map((s) => addDays(s.date, 1)),
        sessionData
      )
      const badAvgApproaches = avgApproachesForDates(
        badSleepSessions.map((s) => addDays(s.date, 1)),
        sessionData
      )

      if (goodAvgApproaches > badAvgApproaches * 1.2) {
        const pctMore = Math.round(((goodAvgApproaches - badAvgApproaches) / badAvgApproaches) * 100)
        insights.push({
          metric: "sleep_vs_approaches",
          correlation: "positive",
          description: `Weeks with 7+ hours avg, you approached ${pctMore}% more`,
          strength: pctMore > 30 ? "strong" : "moderate",
        })
      }
    }
  }

  return insights
}

// ============================================================================
// Helpers
// ============================================================================

function daysDiff(a: string, b: string): number {
  const da = new Date(a)
  const db = new Date(b)
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

function addDays(dateStr: string, days: number): string {
  // Built from the parts, not parsed. `new Date("2026-01-01")` is UTC midnight,
  // while `getDate`/`setDate` are local — so west of UTC the shift read the
  // previous day and every correlation window came out one day short.
  const [y, m, d] = dateStr.split("-").map(Number)
  const shifted = new Date(y, m - 1, d + days)
  return toDateISO(shifted)
}

function avgApproachesForDates(
  dates: string[],
  sessions: { date: string; approachCount: number }[]
): number {
  const matching = sessions.filter((s) => dates.includes(s.date))
  if (matching.length === 0) return 0
  return matching.reduce((sum, s) => sum + s.approachCount, 0) / matching.length
}

/**
 * The instant to stamp a health entry with — a workout, a meal, a night's sleep,
 * a weigh-in — from the day, and optionally the time, the user says it happened.
 *
 * One function for all four, because they had four different answers to the same
 * question: three of them accepted `logged_at` as an arbitrary string that went
 * straight into a weekly counter, and the fourth had no date field at all.
 *
 * WHY A TIME AT ALL. Two workouts on the same day are ordinary: a lift in the
 * morning and a run in the evening. Without a time both land on the same instant
 * and nothing can put them in order — "last time you benched" picks one of them
 * at random, and so does anything else that sorts by when it happened.
 *
 * NOON WHEN NO TIME IS GIVEN, for one reason: the date has to survive the round
 * trip. Midnight in Copenhagen is 22:00 UTC the day before, so a date stored
 * that way reads back as the previous day from anywhere further west. Noon
 * leaves twelve hours of slack either side.
 *
 * A REAL TIME IS BETTER THAN NOON, and not just more precise: it removes the
 * guess. "07:00 on the 20th" is a fact with an exact instant behind it, and the
 * twelve-hour caveat above stops applying to it — the instant IS the answer,
 * rather than an encoding of a date that has to be decoded again.
 *
 * THREE CASES, and the middle one is easy to get wrong:
 *
 *   - a past day, no time  -> midday on that day
 *   - TODAY, no time       -> now. "I trained today" means the moment you wrote
 *                             it down; noon is still ahead of you at breakfast,
 *                             and stamping it would put the log in the future.
 *   - any day with a time  -> exactly that moment
 *
 * Returns `null` for anything still to come — a future date, or a time today
 * that has not arrived. The second check needs the instant, not just the date.
 */
export function loggedAtForEntry(
  entryDate: string,
  timezone: string,
  entryTime?: string,
  now: Date = new Date()
): string | null {
  const today = getTodayInTimezone(timezone, now)
  if (entryDate > today) return null

  // No time given, and the day is today: stamp it NOW. "I trained today" means
  // the moment you wrote it down, not noon — and noon is still ahead of you at
  // breakfast, which would be a timestamp in the future.
  if (!entryTime) {
    return entryDate === today ? now.toISOString() : middayInstant(entryDate, timezone)
  }

  // A time was given, so it is a claim about a moment and can be checked as one.
  // 23:00 tonight has not happened at breakfast, and checking only the date
  // would have let it through.
  const instant = localTimeInstant(entryDate, entryTime, timezone)
  return new Date(instant).getTime() > now.getTime() ? null : instant
}

// ============================================================================
// Progress: what this week looked like, and what your best has been
// ============================================================================

export interface WeekAdherence {
  /** Training days the program asks for in a week. 0 when nothing is running. */
  planned: number
  /** Workouts actually done this week. */
  done: number
  /** Monday to Sunday. `future` days are not misses yet. */
  days: Array<{ date: string; done: boolean; future: boolean }>
}

/**
 * Planned against done, this week, as seven days.
 *
 * WHY SEVEN DAYS AND NOT A PERCENTAGE. "71% adherence" tells somebody nothing
 * they can act on. Seven marks tells them they have done three of four and
 * there are two days left, which is a decision.
 *
 * A day still to come is NOT a missed day. Counting Thursday as a failure on
 * Tuesday is how a tracker teaches somebody to stop opening it.
 *
 * `today` is the viewer's own wall-clock Date, matching every other function in
 * this file; the server passes one made in the account's timezone.
 */
export function adherenceThisWeek(
  logs: WorkoutLogRow[],
  plannedPerWeek: number,
  /** `now` as an INSTANT. Which day that is, is the next argument's business. */
  now: Date,
  /**
   * The account's zone. This used to bucket on the machine's — UTC on the
   * server — so a Sunday 23:30 session in Copenhagen counted towards the
   * following week, and a traveller's week began on the wrong day.
   */
  timezone: string
): WeekAdherence {
  const dayOf = (instant: Date) => getTodayInTimezone(timezone, instant)
  const trained = new Set(logs.map((log) => dayOf(new Date(log.logged_at))))
  const todayKey = dayOf(now)
  // `periodStartFor("weekly", …)` is the one implementation of a Monday in
  // this codebase, and it is given the account's own zoned date.
  const monday = periodStartFor("weekly", toZonedDate(now, timezone))

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    return { date, done: trained.has(date), future: date > todayKey }
  })

  return {
    planned: Math.max(0, Math.round(plannedPerWeek)),
    done: days.filter((d) => d.done).length,
    days,
  }
}

/**
 * WHAT ONE SET MOVED — the one multiplication in this codebase.
 *
 * Four places did it themselves: the History month total, each History row's
 * summary, the weekly chart and the finish summary. Three of the four excluded
 * warm-ups; exactly one excluded TIMED lifts, and the chart's comment claimed
 * the finish summary did too. So a 3 × 30 s farmer's carry at 40 kg was worth
 * 3,600 kg on the finish screen — outranking a 5 × 5 squat at 100 kg — and
 * nothing on the chart, for the same session.
 *
 * Seconds are stored in the same column as reps, which is why this cannot be
 * left to the caller: the number looks exactly like reps and multiplies
 * exactly as wrong.
 */
export function setVolumeKg(set: {
  weight_kg: number
  reps: number
  set_kind?: string | null
  exercise: string
  library_id?: string | null
}): number {
  if (!isWorkingSet(set)) return 0
  if (isTimedLift(set)) return 0
  return set.weight_kg * set.reps
}

/** The same rule over a session, a month or a week. */
export function workingVolumeKg(
  sets: readonly {
    weight_kg: number
    reps: number
    set_kind?: string | null
    exercise: string
    library_id?: string | null
  }[]
): number {
  return sets.reduce((total, set) => total + setVolumeKg(set), 0)
}

export interface WeekVolume {
  /** Monday of the week, YYYY-MM-DD. */
  weekStart: string
  volumeKg: number
  sets: number
}

/**
 * Weight moved per week, newest week last.
 *
 * Warm-ups and drop sets are excluded, because they are not the work — the same
 * rule `isWorkingSet` applies everywhere else.
 *
 * SO IS TIMED WORK, and this comment used to claim that while the code did no
 * such thing. Seconds are stored in the same column as reps, so a 3 × 30 s
 * farmer's carry at 40 kg contributed 3,600 kg and outranked a 5 × 5 squat at
 * 100 kg on the very chart the feature exists for. The lift library knows which
 * movements are timed, and they are left out.
 */
export function weeklyVolume(
  logs: WorkoutLogWithSets[],
  /** `now` as an INSTANT; the account's zone decides which week that is. */
  now: Date,
  weeks: number = 8,
  timezone: string = "UTC"
): WeekVolume[] {
  const byWeek = new Map<string, { volumeKg: number; sets: number }>()
  /**
   * THE WEEK IS THE ACCOUNT'S, not the machine's. This bucketed on the local
   * Date of the process — UTC on the server — so a Sunday-night session landed
   * in the next week's bar, and the squares on Progress disagreed with the
   * week strip on Today, which reads the account's calendar.
   */
  const weekOf = (instant: Date) => periodStartFor("weekly", toZonedDate(instant, timezone))
  const startKey = addDays(weekOf(now), -(weeks - 1) * 7)

  for (const log of logs) {
    const week = weekOf(new Date(log.logged_at))
    if (week < startKey) continue
    const bucket = byWeek.get(week) ?? { volumeKg: 0, sets: 0 }
    for (const set of log.sets ?? []) {
      // ONE RULE, and it is not written out here: `setVolumeKg` decides what a
      // set moved, so the chart cannot disagree with the History total or with
      // the number on the finish screen.
      if (!isWorkingSet(set)) continue
      bucket.volumeKg += setVolumeKg(set)
      /**
       * A TIMED SET IS STILL A SET. It used to be skipped entirely, so a
       * session of carries and planks counted as no work at all on the chart
       * — while the finish screen counted every working set including those.
       * Two numbers for one fact. It moves no WEIGHT, which is what the bar
       * measures, and it counts as the set it was.
       */
      bucket.sets += 1
    }
    byWeek.set(week, bucket)
  }

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(startKey, i * 7)
    const bucket = byWeek.get(weekStart) ?? { volumeKg: 0, sets: 0 }
    return { weekStart, volumeKg: Math.round(bucket.volumeKg), sets: bucket.sets }
  })
}

export interface LiftBest {
  exercise: string
  /**
   * Nothing was loaded on it — a pull-up, a push-up, a plank. The list used to
   * print "Pull-up 0 kg × 12 · est. max 0", which is not a fact about anything.
   */
  bodyweight: boolean
  /** The heaviest single working set. */
  bestWeightKg: number
  bestWeightReps: number
  bestWeightDate: string
  /** The highest Epley estimate, which rewards reps as well as weight. */
  bestEstimatedMaxKg: number
  bestEstimatedDate: string
}

/**
 * The best you have done on each lift, all time.
 *
 * TWO BESTS, BECAUSE THEY ARE DIFFERENT ACHIEVEMENTS. The heaviest single set
 * is what people mean by a personal best. The best estimated max rewards
 * grinding out eight at a weight you used to do five at, which is progress the
 * heaviest-single number cannot see.
 *
 * WHOSE CALENDAR THE DATE IS ON. `timezone` is required, and it is the
 * account's. This used to stamp each best with `new Date(logged_at)` read
 * through whatever calendar the code happened to be running in — the browser's,
 * which was roughly right, and then the SERVER's the moment this moved
 * server-side, which is UTC and belongs to no country. A 23:30 Copenhagen set
 * would have been filed on the previous day.
 */
export function liftBests(logs: WorkoutLogWithSets[], timezone: string): LiftBest[] {
  const best = new Map<string, LiftBest>()

  for (const log of logs) {
    const date = toDateISO(toZonedDate(new Date(log.logged_at), timezone))
    for (const set of log.sets ?? []) {
      if (!isWorkingSet(set) || set.reps <= 0) continue
      const key = set.exercise.trim().toLowerCase()
      // A timed hold has seconds in `reps`; estimating a one-rep max from
      // "30" would announce a max nobody has ever lifted.
      if (isTimedLift(set)) continue
      const estimate = cappedEstimate(set.weight_kg, set.reps)
      const cur = best.get(key)
      if (!cur) {
        best.set(key, {
          exercise: set.exercise.trim(),
          bodyweight: set.weight_kg === 0,
          bestWeightKg: set.weight_kg,
          bestWeightReps: set.reps,
          bestWeightDate: date,
          bestEstimatedMaxKg: estimate,
          bestEstimatedDate: date,
        })
        continue
      }
      if (
        set.weight_kg > cur.bestWeightKg ||
        (set.weight_kg === cur.bestWeightKg && set.reps > cur.bestWeightReps)
      ) {
        cur.bestWeightKg = set.weight_kg
        cur.bestWeightReps = set.reps
        cur.bestWeightDate = date
        cur.bodyweight = set.weight_kg === 0
      }
      if (estimate > cur.bestEstimatedMaxKg) {
        cur.bestEstimatedMaxKg = estimate
        cur.bestEstimatedDate = date
      }
    }
  }

  return [...best.values()].sort((a, b) => b.bestEstimatedMaxKg - a.bestEstimatedMaxKg)
}

/** A run of identical sets, shown as one line instead of N. */
export interface CollapsedSet {
  /** How many sets in the run — 4 means "4 × 100 kg × 5". */
  count: number
  /**
   * IN WHATEVER UNIT IT ARRIVED IN. This was `weightKg`, and the field name
   * was a claim the function cannot make: it compares numbers for equality and
   * never converts anything. The live screen's lift history passes weights
   * already converted to the reader's unit, and a caller mapping those into a
   * field called `weight_kg` is how a pounds number ends up somewhere that
   * treats it as kilograms.
   */
  weight: number
  reps: number
  kind: string
  exercise: string
  /** The set numbers this run covers, so a correction can still find them. */
  setNumbers: number[]
}

/**
 * IDENTICAL SETS, SAID ONCE.
 *
 * A 5×5 rendered as five rows reading "1  20 kg × 5", "2  20 kg × 5" … which is
 * a spreadsheet, not a record of a session: five lines to say one thing, and the
 * one line that DIFFERED — the set you missed — looked exactly like its
 * neighbours. Collapsing the runs makes the exception visible, which is the only
 * part worth reading.
 *
 * Only CONSECUTIVE identical sets collapse. Two sets of 100 either side of a
 * missed set are not "2 × 100": they are what happened before and after the
 * miss, and merging them would hide the order things happened in.
 */
export function collapseSets(
  sets: Array<{ exercise: string; weight: number; reps: number; kind?: string | null; setNumber: number }>
): CollapsedSet[] {
  const out: CollapsedSet[] = []
  for (const s of sets) {
    const last = out[out.length - 1]
    const kind = s.kind ?? "working"
    if (
      last &&
      last.exercise === s.exercise &&
      last.weight === s.weight &&
      last.reps === s.reps &&
      last.kind === kind
    ) {
      last.count += 1
      last.setNumbers.push(s.setNumber)
      continue
    }
    out.push({
      count: 1,
      weight: s.weight,
      reps: s.reps,
      kind,
      exercise: s.exercise,
      setNumbers: [s.setNumber],
    })
  }
  return out
}

/**
 * WHICH STEP OF THE TRAINING WEEK A FINISHED WORKOUT TICKS.
 *
 * The Track step's ticks lived only in the plan in the browser, so a week with
 * three finished gym sessions showed zero on "Strength session" until somebody
 * ticked it by hand. Two records of one workout, kept separately, free to
 * disagree — and the one the person actually did was the one being ignored.
 *
 * The ids on the right are the workout routine's own library steps
 * (`src/goals/data/northStar.ts`). Five session types, three steps: a run and
 * a bike are both cardio, yoga and mobility are both mobility.
 */
export const STEP_FOR_SESSION_TYPE: Record<SessionType, "strength" | "cardio" | "mobility"> = {
  weights: "strength",
  cardio: "cardio",
  running: "cardio",
  mobility: "mobility",
  yoga: "mobility",
}

/**
 * Finished workouts grouped by the day they happened ON THE PERSON'S calendar.
 *
 * WHOSE CLOCK. `workoutsOnDate` keys by the running process's clock, which on
 * the server is UTC — so a 23:45 session in Copenhagen counts as the next day
 * and ticks the wrong column of the week grid. `toZonedDate` and `toDateISO`
 * are the two functions in this codebase that get this right; three separate
 * bugs have come from `toISOString().split("T")[0]` instead.
 */
export function workoutsByLocalDate(
  logs: Array<{ logged_at: string; session_type: SessionType }>,
  timezone: string
): Map<string, SessionType[]> {
  const byDate = new Map<string, SessionType[]>()
  for (const log of logs) {
    const at = new Date(log.logged_at)
    // A date that cannot be read is left out rather than filed under today,
    // which would tick a day nobody trained.
    if (Number.isNaN(at.getTime())) continue
    const date = toDateISO(toZonedDate(at, timezone))
    const already = byDate.get(date)
    if (already) already.push(log.session_type)
    else byDate.set(date, [log.session_type])
  }
  return byDate
}

/**
 * EVERYTHING THE PROGRESS TAB SHOWS, COMPUTED ONCE, ON THE SERVER.
 *
 * The tab used to download a year of workouts with every set attached, work
 * out the week, the eight bars and the bests in the browser, and then the
 * lift-history panel inside it downloaded THREE years of the same rows again.
 * Two reads of the same table for one screen, both on a phone, both after the
 * screen had already painted.
 *
 * It also meant the browser's clock decided which week "this week" was — the
 * thing steps 3 and 4 have just taken away from every other screen.
 *
 * `empty` is a fact about the ACCOUNT, not about the chart. An account with one
 * workout of warm-ups has a chart of zeros and is not empty, and telling
 * somebody "nothing logged yet" the day after they trained is the kind of
 * wrong that makes people stop trusting a screen.
 */
export interface ProgressSnapshot {
  timezone: string
  thisWeek: { done: number; days: WeekAdherence["days"] }
  weeks: WeekVolume[]
  bests: LiftBest[]
  lifts: { exercise: string; points: LoadPoint[] }[]
  empty: boolean
}

/** How many of each list is worth a phone screen. */
const PROGRESS_SHOWN = 8

export function progressSnapshot(
  logs: WorkoutLogWithSets[],
  opts: { timezone: string; now?: Date }
): ProgressSnapshot {
  const now = opts.now ?? new Date()
  const { timezone } = opts
  /**
   * `planned` is not here: it belongs to the program that is running, which
   * this read knows nothing about. The tab already has it as a prop, and a
   * second source for it is a second answer.
   */
  const week = adherenceThisWeek(logs as unknown as WorkoutLogRow[], 0, now, timezone)
  const flat = logs.flatMap((log) =>
    (log.sets ?? []).map((set) => ({ ...set, logged_at: log.logged_at }))
  )

  return {
    timezone,
    thisWeek: { done: week.done, days: week.days },
    weeks: weeklyVolume(logs, now, PROGRESS_SHOWN, timezone),
    bests: liftBests(logs, timezone).slice(0, PROGRESS_SHOWN),
    lifts: liftsWithHistory(flat, timezone).slice(0, PROGRESS_SHOWN),
    empty: logs.length === 0,
  }
}
