/**
 * Pure progression logic for the Exercising slice.
 * No side effects — all functions take data in, return decisions out.
 */

import type {
  DayLabel,
  ExerciseEntry,
  NextSessionExercise,
  ProgressionResult,
  SetLog,
} from "./types"
import { TIER_CONFIGS } from "./types"
import {
  CONSECUTIVE_FAIL_THRESHOLD,
  DELOAD_SETS_REDUCTION,
  DELOAD_WEEK_INTERVAL,
  DELOAD_WEIGHT_MULTIPLIER,
  REACTIVE_DELOAD_MULTIPLIER,
} from "./config"

// ============================================================================
// Determine next day in rotation
// ============================================================================

const DAY_ORDER: DayLabel[] = ["A", "B", "C", "D"]

export function getNextDay(log: SetLog[]): DayLabel {
  if (log.length === 0) return "A"

  // Find the most recent day logged
  const lastEntry = log[log.length - 1]
  const lastDayIndex = DAY_ORDER.indexOf(lastEntry.day)
  return DAY_ORDER[(lastDayIndex + 1) % DAY_ORDER.length]
}

// ============================================================================
// Calculate week number from log (count unique dates / 4, rounded up)
// ============================================================================

export function getWeekNumber(log: SetLog[]): number {
  if (log.length === 0) return 1
  const uniqueDates = new Set(log.map((e) => e.date))
  return Math.ceil(uniqueDates.size / DAY_ORDER.length) + 1
}

export function isDeloadWeek(weekNumber: number): boolean {
  return weekNumber > 1 && weekNumber % DELOAD_WEEK_INTERVAL === 0
}

// ============================================================================
// Build "Next Session" view
// ============================================================================

export function buildNextSession(
  programme: ExerciseEntry[],
  nextDay: DayLabel,
  weekNumber: number,
): NextSessionExercise[] {
  const dayExercises = programme.filter((e) => e.day === nextDay)
  const deload = isDeloadWeek(weekNumber)

  return dayExercises.map((e) => {
    const weight = deload
      ? roundToNearest(e.currentWeightKg * DELOAD_WEIGHT_MULTIPLIER, 1.25)
      : e.currentWeightKg
    const sets = deload
      ? Math.max(1, e.sets - DELOAD_SETS_REDUCTION)
      : e.sets

    const notes: string[] = []
    if (deload) notes.push("DELOAD WEEK")
    if (e.consecutiveFails >= 1) notes.push(`${e.consecutiveFails} consecutive miss(es)`)
    if (e.status === "DELOAD") notes.push("Weight was deloaded")

    return {
      exercise: e.exercise,
      sets,
      targetReps: `${e.repMin}-${e.repMax}`,
      weightKg: weight,
      notes: notes.join("; "),
    }
  })
}

// ============================================================================
// Apply progression after logging a workout
// ============================================================================

export function applyProgression(
  programme: ExerciseEntry[],
  day: DayLabel,
  loggedSets: { exercise: string; sets: { reps: number }[] }[],
): { updatedProgramme: ExerciseEntry[]; results: ProgressionResult[] } {
  const results: ProgressionResult[] = []

  const updatedProgramme = programme.map((entry) => {
    if (entry.day !== day) return entry

    const logged = loggedSets.find((l) => l.exercise === entry.exercise)
    if (!logged) return entry

    const result = evaluateExercise(entry, logged.sets.map((s) => s.reps))
    results.push(result)

    return applyResult(entry, result)
  })

  return { updatedProgramme, results }
}

// ============================================================================
// Core progression evaluation
// ============================================================================

function evaluateExercise(
  entry: ExerciseEntry,
  actualReps: number[],
): ProgressionResult {
  const { repMin, repMax, currentWeightKg, incrementKg, consecutiveFails } = entry
  const tierConfig = TIER_CONFIGS[entry.tier]

  // Count how many sets hit the top of the range
  const setsAtMax = actualReps.filter((r) => r >= repMax).length
  // Count how many sets failed to hit the minimum
  const setsBelowMin = actualReps.filter((r) => r < repMin).length

  const totalSets = actualReps.length

  // ADVANCE: all sets hit top of range
  if (setsAtMax === totalSets) {
    const newWeight = roundToNearest(currentWeightKg + incrementKg, incrementKg)
    return {
      exercise: entry.exercise,
      previousWeight: currentWeightKg,
      newWeight,
      previousStatus: entry.status,
      newStatus: "ADVANCE",
      reason: `All ${totalSets} sets hit ${repMax} reps → +${incrementKg}kg`,
    }
  }

  // DELOAD: 2+ sets below minimum for N consecutive sessions
  if (setsBelowMin >= 2 && consecutiveFails + 1 >= CONSECUTIVE_FAIL_THRESHOLD) {
    const newWeight = roundToNearest(
      currentWeightKg * REACTIVE_DELOAD_MULTIPLIER,
      tierConfig.incrementKg,
    )
    return {
      exercise: entry.exercise,
      previousWeight: currentWeightKg,
      newWeight,
      previousStatus: entry.status,
      newStatus: "DELOAD",
      reason: `${setsBelowMin} sets below ${repMin} reps for ${consecutiveFails + 1} consecutive sessions → -10% weight`,
    }
  }

  // HOLD: check if this session counts as a fail (for consecutive tracking)
  if (setsBelowMin >= 2) {
    return {
      exercise: entry.exercise,
      previousWeight: currentWeightKg,
      newWeight: currentWeightKg,
      previousStatus: entry.status,
      newStatus: "HOLD",
      reason: `${setsBelowMin} sets below ${repMin} reps (fail ${consecutiveFails + 1}/${CONSECUTIVE_FAIL_THRESHOLD}) → same weight`,
    }
  }

  // HOLD: mixed results, no fail
  return {
    exercise: entry.exercise,
    previousWeight: currentWeightKg,
    newWeight: currentWeightKg,
    previousStatus: entry.status,
    newStatus: "HOLD",
    reason: `Mixed results (${setsAtMax}/${totalSets} sets at max) → same weight`,
  }
}

function applyResult(
  entry: ExerciseEntry,
  result: ProgressionResult,
): ExerciseEntry {
  switch (result.newStatus) {
    case "ADVANCE":
      return {
        ...entry,
        currentWeightKg: result.newWeight,
        consecutiveFails: 0,
        status: "ADVANCE",
      }
    case "DELOAD":
      return {
        ...entry,
        currentWeightKg: result.newWeight,
        consecutiveFails: 0,
        status: "DELOAD",
      }
    case "HOLD": {
      const isFail = result.reason.includes("fail")
      return {
        ...entry,
        currentWeightKg: result.newWeight,
        consecutiveFails: isFail ? entry.consecutiveFails + 1 : 0,
        status: "HOLD",
      }
    }
    default:
      return entry
  }
}

// ============================================================================
// Utility
// ============================================================================

export function roundToNearest(value: number, increment: number): number {
  return Math.round(value / increment) * increment
}

// ============================================================================
// Convert programme to sheet rows and back
// ============================================================================

export function programmeToRows(programme: ExerciseEntry[]): string[][] {
  return programme.map((e) => [
    e.day,
    e.exercise,
    e.tier,
    String(e.sets),
    String(e.repMin),
    String(e.repMax),
    String(e.currentWeightKg),
    String(e.incrementKg),
    String(e.consecutiveFails),
    e.status,
  ])
}

export function rowsToProgramme(rows: string[][]): ExerciseEntry[] {
  return rows.map((r) => ({
    day: r[0] as DayLabel,
    exercise: r[1],
    tier: r[2] as ExerciseEntry["tier"],
    sets: Number(r[3]),
    repMin: Number(r[4]),
    repMax: Number(r[5]),
    currentWeightKg: Number(r[6]),
    incrementKg: Number(r[7]),
    consecutiveFails: Number(r[8]),
    status: r[9] as ExerciseEntry["status"],
  }))
}

export function setLogsToRows(logs: SetLog[]): string[][] {
  return logs.map((l) => [
    l.date,
    l.day,
    l.exercise,
    String(l.setNumber),
    String(l.targetWeightKg),
    String(l.targetRepMin),
    String(l.targetRepMax),
    String(l.actualReps),
    l.hitTarget ? "YES" : "NO",
  ])
}

export function nextSessionToRows(exercises: NextSessionExercise[]): string[][] {
  return exercises.map((e) => [
    e.exercise,
    String(e.sets),
    e.targetReps,
    String(e.weightKg),
    e.notes,
  ])
}

export function rowsToSetLogs(rows: string[][]): SetLog[] {
  return rows.map((r) => ({
    date: r[0],
    day: r[1] as DayLabel,
    exercise: r[2],
    setNumber: Number(r[3]),
    targetWeightKg: Number(r[4]),
    targetRepMin: Number(r[5]),
    targetRepMax: Number(r[6]),
    actualReps: Number(r[7]),
    hitTarget: r[8] === "YES",
  }))
}

// ============================================================================
// High-level orchestrators (called by thin API routes)
// ============================================================================

import { readRange, writeRange, appendRows, clearRange, createTabIfMissing } from "./sheetsClient"
import {
  SHEET_TABS,
  PROGRAMME_HEADERS,
  LOG_HEADERS,
  NEXT_SESSION_HEADERS,
  RULES_TEXT,
  buildDefaultProgramme,
} from "./config"
import type { WorkoutLogInput } from "./types"

export async function fetchExercisingData() {
  const [progRows, logRows] = await Promise.all([
    readRange(`${SHEET_TABS.PROGRAMME}!A2:J`),
    readRange(`${SHEET_TABS.LOG}!A2:I`),
  ])

  const programme = rowsToProgramme(progRows)
  const logs = rowsToSetLogs(logRows)
  const nextDay = getNextDay(logs)
  const weekNumber = getWeekNumber(logs)

  return {
    programme,
    nextDay,
    weekNumber,
    nextSession: buildNextSession(programme, nextDay, weekNumber),
    recentLog: logs.slice(-30).reverse().map((l) => ({
      date: l.date, day: l.day, exercise: l.exercise,
      setNumber: l.setNumber, targetWeightKg: l.targetWeightKg,
      actualReps: l.actualReps, hitTarget: l.hitTarget,
    })),
  }
}

export async function initializeProgramme() {
  for (const tab of Object.values(SHEET_TABS)) {
    await createTabIfMissing(tab)
  }

  await clearRange(`${SHEET_TABS.RULES}!A:Z`)
  await writeRange(`${SHEET_TABS.RULES}!A1`, RULES_TEXT)

  const programme = buildDefaultProgramme()
  await clearRange(`${SHEET_TABS.PROGRAMME}!A:J`)
  await writeRange(`${SHEET_TABS.PROGRAMME}!A1`, [PROGRAMME_HEADERS, ...programmeToRows(programme)])

  await clearRange(`${SHEET_TABS.LOG}!A:I`)
  await writeRange(`${SHEET_TABS.LOG}!A1`, [LOG_HEADERS])

  const nextDay = getNextDay([])
  const nextSession = buildNextSession(programme, nextDay, 1)
  await clearRange(`${SHEET_TABS.NEXT_SESSION}!A:E`)
  await writeRange(`${SHEET_TABS.NEXT_SESSION}!A1`, [NEXT_SESSION_HEADERS, ...nextSessionToRows(nextSession)])

  return { nextDay, exerciseCount: programme.length }
}

export async function logWorkoutAndProgress(input: WorkoutLogInput) {
  const { day, exercises } = input
  const progRows = await readRange(`${SHEET_TABS.PROGRAMME}!A2:J`)
  const programme = rowsToProgramme(progRows)
  const today = new Date().toISOString().split("T")[0]

  const newLogs: SetLog[] = []
  for (const ex of exercises) {
    const prog = programme.find((p) => p.day === day && p.exercise === ex.exercise)
    if (!prog) continue
    ex.sets.forEach((set, i) => {
      newLogs.push({
        date: today, day, exercise: ex.exercise, setNumber: i + 1,
        targetWeightKg: prog.currentWeightKg, targetRepMin: prog.repMin,
        targetRepMax: prog.repMax, actualReps: set.reps,
        hitTarget: set.reps >= prog.repMin,
      })
    })
  }

  await appendRows(`${SHEET_TABS.LOG}!A:I`, setLogsToRows(newLogs))

  const { updatedProgramme, results } = applyProgression(programme, day, exercises)
  await writeRange(`${SHEET_TABS.PROGRAMME}!A1`, [PROGRAMME_HEADERS, ...programmeToRows(updatedProgramme)])

  const allLogRows = await readRange(`${SHEET_TABS.LOG}!A2:I`)
  const allLogs = rowsToSetLogs(allLogRows)
  const nextDay = getNextDay(allLogs)
  const weekNumber = getWeekNumber(allLogs)
  const nextSession = buildNextSession(updatedProgramme, nextDay, weekNumber)
  await clearRange(`${SHEET_TABS.NEXT_SESSION}!A:E`)
  await writeRange(`${SHEET_TABS.NEXT_SESSION}!A1`, [NEXT_SESSION_HEADERS, ...nextSessionToRows(nextSession)])

  return { progressionResults: results, nextDay, weekNumber }
}
