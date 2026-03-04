/**
 * Health & Appearance business logic
 *
 * Computations for rolling averages, trend detection, plateau detection,
 * cross-domain correlations, and PR detection.
 */

import type {
  WeightLogRow,
  WeightTrend,
  WeightUnit,
  SleepLogRow,
  SleepStats,
  SleepQuality,
  WorkoutSetRow,
  PersonalRecord,
  NutritionLogRow,
  NutritionStats,
  CorrelationInsight,
} from "./types"

// ============================================================================
// Unit Conversion
// ============================================================================

const KG_TO_LBS = 2.20462
const LBS_TO_KG = 1 / KG_TO_LBS

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value
  return from === "kg" ? value * KG_TO_LBS : value * LBS_TO_KG
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  const val = unit === "kg" ? kg : kg * KG_TO_LBS
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
      projectedTargetDate = target.toISOString().split("T")[0]
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
export function detectPersonalRecords(
  allSets: (WorkoutSetRow & { logged_at: string })[],
  newSets: WorkoutSetRow[]
): PersonalRecord[] {
  const records: PersonalRecord[] = []
  const exerciseMaxes = new Map<string, { weight_kg: number; reps: number }>()

  // Build map of previous maxes (by exercise)
  for (const s of allSets) {
    const key = s.exercise.toLowerCase()
    const prev = exerciseMaxes.get(key)
    if (!prev || s.weight_kg > prev.weight_kg || (s.weight_kg === prev.weight_kg && s.reps > prev.reps)) {
      exerciseMaxes.set(key, { weight_kg: s.weight_kg, reps: s.reps })
    }
  }

  // Check new sets for PRs
  for (const s of newSets) {
    const key = s.exercise.toLowerCase()
    const prev = exerciseMaxes.get(key)
    if (!prev || s.weight_kg > prev.weight_kg || (s.weight_kg === prev.weight_kg && s.reps > prev.reps)) {
      records.push({
        exercise: s.exercise,
        weight_kg: s.weight_kg,
        reps: s.reps,
        date: new Date().toISOString().split("T")[0],
        isNew: true,
      })
    }
  }

  return records
}

/**
 * Compute volume load: sets × reps × weight for a workout's sets.
 */
export function computeVolumeLoad(sets: WorkoutSetRow[]): number {
  return sets.reduce((total, s) => total + s.weight_kg * s.reps, 0)
}

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
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function avgApproachesForDates(
  dates: string[],
  sessions: { date: string; approachCount: number }[]
): number {
  const matching = sessions.filter((s) => dates.includes(s.date))
  if (matching.length === 0) return 0
  return matching.reduce((sum, s) => sum + s.approachCount, 0) / matching.length
}
