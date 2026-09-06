/**
 * Programs progression ENGINE — pure, no I/O, unit-tested.
 *
 * Two public operations:
 *   - computePrescription(program, enrollment) → today's session (read).
 *   - applyLog(program, enrollment, log)        → next enrollment state + changes.
 *
 * Plus calibration helpers (1RM estimate, training-max, plate rounding, units).
 *
 * M1 implements the LOAD metric type only. Any other metric type throws an
 * explicit error — no silent fallback (CLAUDE.md §3 / §15).
 */

import { KG_PER_LB, PLATES, UNIT_CONFIG } from "./config"
import type {
  ApplyLogResult,
  DayTemplate,
  EnduranceBlock,
  EnduranceSet,
  EnrollmentCursor,
  ExerciseState,
  LoadExercise,
  LoadPoint,
  LoggedExercise,
  ProgramDefinition,
  ProgramEnrollment,
  ProgramSessionLogInput,
  PrescribedExercise,
  PrescribedSet,
  ProgressionChange,
  SessionPrescription,
  UnitSystem,
} from "./types"
import { scheduleDays } from "./customize"

// ============================================================================
// Units, rounding, 1RM
// ============================================================================

export function toKg(weight: number, unit: UnitSystem): number {
  return unit === "kg" ? weight : weight * KG_PER_LB
}

export function fromKg(weightKg: number, unit: UnitSystem): number {
  return unit === "kg" ? weightKg : weightKg / KG_PER_LB
}

/**
 * Round to a weight that can actually be loaded.
 *
 * BARBELL (the default, and what every catalog program gets): floored at the
 * bar, because you cannot squat 15 kg on a 20 kg bar.
 *
 * FREE (dumbbells, cables, machines, bodyweight): no floor. The bar minimum
 * applied to everything used to turn a 6 kg lateral raise into a 20 kg one and
 * a bodyweight push-up into 20 kg of nothing. It rarely showed while the only
 * lifts in the app were a catalog of barbell programs; a self-designed week is
 * mostly accessories, and it showed immediately.
 */
export function roundToLoadable(
  weight: number,
  unit: UnitSystem,
  style: "barbell" | "free" = "barbell"
): number {
  const cfg = UNIT_CONFIG[unit]
  if (style === "free") {
    // Still snapped to a sensible step so the prescription is not 7.3 kg, but
    // allowed all the way down to nothing for bodyweight work.
    return Math.max(0, Math.round(weight / cfg.loadGranularity) * cfg.loadGranularity)
  }
  if (weight <= cfg.barWeight) return cfg.barWeight
  const rounded = Math.round(weight / cfg.loadGranularity) * cfg.loadGranularity
  return Math.max(cfg.barWeight, rounded)
}

/** Epley 1RM estimate: w · (1 + reps/30). reps=1 → w. (Epley 1985.) */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + reps / 30)
}

/** 5/3/1 training max = 90% of 1RM, rounded loadable. (Wendler, 5/3/1.) */
export function trainingMaxFromOneRepMax(oneRepMax: number, unit: UnitSystem): number {
  return roundToLoadable(oneRepMax * 0.9, unit)
}

// ============================================================================
// Seeding (called by repo at enroll time)
// ============================================================================

/**
 * Build the initial per-exercise state + cursor for a new enrollment.
 * - linear programs seed working weights from the level (kg → unit, rounded).
 * - percentage programs require a 1RM per exercise (in the enrollment unit);
 *   throws if any is missing — no guessed numbers (CLAUDE.md no-fallback).
 */
export function seedEnrollment(
  program: ProgramDefinition,
  level: ProgramDefinition["levels"][number]["id"],
  unitSystem: UnitSystem,
  oneRepMaxesByExerciseId?: Record<string, number>,
  workingWeightOverrides?: Record<string, number> // in unitSystem; overrides linear seeds
): { exerciseState: Record<string, ExerciseState>; cursor: EnrollmentCursor } {
  const levelSeed = program.levels.find((l) => l.id === level)
  if (!levelSeed) throw new Error(`Program ${program.id} has no level ${level}`)
  if (levelSeed.structuralVariantOf) {
    throw new Error(
      `Level ${level} of ${program.id} routes to program ${levelSeed.structuralVariantOf}; enroll there instead`
    )
  }

  const startCursor: EnrollmentCursor = { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 }

  // Endurance plans are fully prescribed by week — no per-exercise state to seed.
  if (program.metricType === "endurance") return { exerciseState: {}, cursor: startCursor }

  if (program.schedule.kind === "skill_routine") {
    const exerciseState: Record<string, ExerciseState> = {}
    for (const d of program.schedule.days) for (const ex of d.exercises) exerciseState[ex.id] = { tierIndex: 0 }
    return { exerciseState, cursor: startCursor }
  }

  if (program.schedule.kind === "hold_routine") {
    const exerciseState: Record<string, ExerciseState> = {}
    for (const d of program.schedule.days) for (const ex of d.exercises) exerciseState[ex.id] = { currentHoldSec: ex.startSec }
    return { exerciseState, cursor: startCursor }
  }

  const exerciseState: Record<string, ExerciseState> = {}
  for (const ex of allExercises(program)) {
    if (ex.progression.kind === "percentage_tm") {
      const oneRm = oneRepMaxesByExerciseId?.[ex.id]
      if (oneRm == null) {
        throw new Error(`Program ${program.id} requires a 1RM for ${ex.id} to compute training max`)
      }
      exerciseState[ex.id] = { trainingMax: trainingMaxFromOneRepMax(oneRm, unitSystem) }
    } else {
      // linear_load and double_progression both ratchet an absolute working weight.
      const override = workingWeightOverrides?.[ex.id]
      const seedKg = levelSeed.seedWorkingWeightKg?.[ex.id]
      // An override of 0 is bodyweight and counts as an answer; only an absent
      // one falls through to the level's seed.
      if (override == null && seedKg == null) {
        throw new Error(`Level ${level} of ${program.id} missing seed weight for ${ex.id}`)
      }
      const workingWeight =
        override != null
          ? roundToLoadable(override, unitSystem, ex.loadStyle)
          : roundToLoadable(fromKg(seedKg!, unitSystem), unitSystem, ex.loadStyle)
      exerciseState[ex.id] = { workingWeight, consecutiveFails: 0 }
    }
  }

  return { exerciseState, cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 } }
}

// ============================================================================
// Prescription (read side)
// ============================================================================

export function computePrescription(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment
): SessionPrescription {
  if (program.metricType === "endurance") return computeEndurancePrescription(program, enrollment)
  if (program.metricType === "skill_tier") return computeSkillPrescription(program, enrollment)
  if (program.metricType === "hold_range") return computeHoldPrescription(program, enrollment)
  const day = dayAt(program, enrollment.cursor.dayIndex)
  const week = enrollment.cursor.week
  const unit = enrollment.unitSystem

  const exercises: PrescribedExercise[] = day.exercises.map((ex) => {
    const state = enrollment.exerciseState[ex.id]
    if (!state) throw new Error(`Enrollment ${enrollment.id} missing state for ${ex.id}`)

    if (ex.scheme.kind === "linear") {
      const weight = state.workingWeight!
      const sets = Array.from({ length: ex.scheme.sets }, (_, i) => ({
        setNumber: i + 1,
        reps: (ex.scheme as { reps: number }).reps,
        amrap: false,
        weight,
        weightKg: round2(toKg(weight, unit)),
      }))
      return { exerciseId: ex.id, name: ex.name, sets, ...carried(ex) }
    }

    if (ex.scheme.kind === "rep_range") {
      const weight = state.workingWeight!
      const { sets: nSets, repMin, repMax } = ex.scheme
      const sets = Array.from({ length: nSets }, (_, i) => ({
        setNumber: i + 1,
        reps: repMin,
        repRangeMax: repMax,
        amrap: false,
        weight,
        weightKg: round2(toKg(weight, unit)),
      }))
      // NO SYNTHETIC NOTE. This used to default to "6–8 reps", from back when
      // every set was its own row and the range was worth repeating up top.
      // `describeSets` now says "4 × 6–8 reps @ 40 kg" on the line itself, so
      // the default turned into "· 6–8 reps" appended to a line that had just
      // said exactly that. The note is the author's or it is nothing.
      return { exerciseId: ex.id, name: ex.name, sets, ...carried(ex), ...(ex.note ? { note: ex.note } : {}) }
    }

    // percentage_tm
    const tm = state.trainingMax!
    const weekSpec = ex.scheme.setsByWeek[week]
    if (!weekSpec) throw new Error(`${ex.id} has no sets for week ${week}`)
    const sets = weekSpec.map((s, i) => {
      const weight = roundToLoadable(tm * s.pctTM, unit, ex.loadStyle)
      return {
        setNumber: i + 1,
        reps: s.reps,
        amrap: Boolean(s.amrap),
        weight,
        weightKg: round2(toKg(weight, unit)),
      }
    })
    return { exerciseId: ex.id, name: ex.name, sets, ...carried(ex), note: ex.note ?? `TM ${tm}${unit}` }
  })

  return {
    programId: program.id,
    dayId: day.id,
    dayLabel: day.label,
    cycle: enrollment.cursor.cycle,
    week,
    sessionCount: enrollment.cursor.sessionCount,
    periodised: program.schedule.kind !== "linear_rotation",
    exercises,
  }
}

/**
 * The parts of a lift that are the author's, not the engine's.
 *
 * A superset tag, a drop-set count and a hand-written note mean nothing to the
 * progression maths,
 * but they are the whole difference between "Bench Press 3×8" and what the
 * person actually intended to do on Tuesday, so the prescription has to carry
 * them through to the session widget rather than compute them away.
 */
function carried(ex: LoadExercise): { supersetGroup?: string; dropSets?: number; note?: string } {
  return {
    ...(ex.supersetGroup ? { supersetGroup: ex.supersetGroup } : {}),
    // Drops are the author's too. The maths ignores them; the person doing it
    // on Tuesday must not have to.
    ...(ex.dropSets ? { dropSets: ex.dropSets } : {}),
    ...(ex.note ? { note: ex.note } : {}),
  }
}

// ============================================================================
// Apply log (progression + cursor advance)
// ============================================================================

export function applyLog(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
  log: ProgramSessionLogInput
): ApplyLogResult {
  // Endurance has no per-exercise progression — logging just advances the plan.
  if (program.metricType === "endurance") {
    return { enrollment: { ...enrollment, cursor: advanceCursor(program, enrollment.cursor) }, changes: [] }
  }
  if (program.metricType === "skill_tier") return applySkillLog(program, enrollment, log)
  if (program.metricType === "hold_range") return applyHoldLog(program, enrollment, log)

  /**
   * THE DAY THAT WAS ACTUALLY DONE, not the one the cursor was pointing at.
   *
   * These are the same thing right up until somebody is allowed to say "I did
   * Pull today, not Push" — and then reading the cursor progresses the wrong
   * lifts: bench goes up because you rowed. The log names its day, so the log
   * decides. An unrecognised or absent dayId (the skip path sends "") falls
   * back to the cursor, which is the only case where there is nothing better.
   */
  const loggedIndex = dayIndexOf(program, log.dayId)
  const dayIndex = loggedIndex >= 0 ? loggedIndex : enrollment.cursor.dayIndex
  const day = dayAt(program, dayIndex)
  const unit = enrollment.unitSystem
  const nextState: Record<string, ExerciseState> = { ...enrollment.exerciseState }
  const changes: ProgressionChange[] = []

  for (const ex of day.exercises) {
    const entry = log.entries.find((e) => e.exerciseId === ex.id)
    const prev = enrollment.exerciseState[ex.id]
    if (!prev) throw new Error(`Enrollment ${enrollment.id} missing state for ${ex.id}`)

    if (ex.progression.kind === "none") {
      // Held on purpose. Carried into nextState unchanged so the weight
      // survives, and reported as no change rather than omitted, so a custom
      // program's session summary does not look like the lift was skipped.
      nextState[ex.id] = prev
      changes.push({
        exerciseId: ex.id,
        name: ex.name,
        kind: "hold",
        fromWeight: prev.workingWeight ?? 0,
        toWeight: prev.workingWeight ?? 0,
        reason: "You set this one to hold — change the weight yourself when you are ready.",
      })
    } else if (ex.progression.kind === "linear_load") {
      changes.push(progressLinear(ex, prev, entry, unit, nextState))
    } else if (ex.progression.kind === "double_progression") {
      changes.push(progressDouble(ex, prev, entry, unit, nextState))
    } else {
      const change = progressPercentage(program, ex, prev, entry, enrollment.cursor.week, unit, nextState)
      if (change) changes.push(change)
    }
  }

  return {
    enrollment: {
      ...enrollment,
      exerciseState: nextState,
      // Advance from the day that was DONE, so logging out of order continues
      // from there rather than resuming a sequence nobody is following.
      cursor: advanceCursor(program, { ...enrollment.cursor, dayIndex }),
    },
    changes,
  }
}

/** Index of a day by id, or -1. */
function dayIndexOf(program: ProgramDefinition, dayId: string): number {
  const s = program.schedule
  if (s.kind !== "linear_rotation" && s.kind !== "weekly_waved") return -1
  return s.days.findIndex((d) => d.id === dayId)
}

function progressLinear(
  ex: LoadExercise,
  prev: ExerciseState,
  entry: ProgramSessionLogInput["entries"][number] | undefined,
  unit: UnitSystem,
  nextState: Record<string, ExerciseState>
): ProgressionChange {
  if (ex.scheme.kind !== "linear" || ex.progression.kind !== "linear_load") {
    throw new Error(`progressLinear called on non-linear ${ex.id}`)
  }
  const rule = ex.progression
  const fromWeight = prev.workingWeight!
  const increment = unit === "kg" ? rule.incrementKg : rule.incrementLb
  const hit = didHitLinear(ex.scheme.sets, ex.scheme.reps, entry)

  if (hit) {
    const toWeight = roundToLoadable(fromWeight + increment, unit, ex.loadStyle)
    nextState[ex.id] = { workingWeight: toWeight, consecutiveFails: 0 }
    return { exerciseId: ex.id, name: ex.name, kind: "advance", fromWeight, toWeight, reason: `Hit all reps → +${increment}${unit}` }
  }

  const fails = (prev.consecutiveFails ?? 0) + 1
  if (fails >= rule.deloadAfterFails) {
    const toWeight = roundToLoadable(fromWeight * (1 - rule.deloadPct), unit, ex.loadStyle)
    nextState[ex.id] = { workingWeight: toWeight, consecutiveFails: 0 }
    return { exerciseId: ex.id, name: ex.name, kind: "deload", fromWeight, toWeight, reason: `${fails} fails → deload ${Math.round(rule.deloadPct * 100)}%` }
  }

  nextState[ex.id] = { workingWeight: fromWeight, consecutiveFails: fails }
  return { exerciseId: ex.id, name: ex.name, kind: "hold", fromWeight, toWeight: fromWeight, reason: `Missed reps (${fails}/${rule.deloadAfterFails}) → repeat weight` }
}

function progressDouble(
  ex: LoadExercise,
  prev: ExerciseState,
  entry: ProgramSessionLogInput["entries"][number] | undefined,
  unit: UnitSystem,
  nextState: Record<string, ExerciseState>
): ProgressionChange {
  if (ex.scheme.kind !== "rep_range" || ex.progression.kind !== "double_progression") {
    throw new Error(`progressDouble called on non-rep_range ${ex.id}`)
  }
  const { sets: nSets, repMin, repMax } = ex.scheme
  const rule = ex.progression
  const fromWeight = prev.workingWeight!
  const increment = unit === "kg" ? rule.incrementKg : rule.incrementLb
  const done = entry?.sets ?? []
  const hitTop = done.filter((s) => s.reps >= repMax).length >= nSets
  const allAtFloor = done.filter((s) => s.reps >= repMin).length >= nSets

  if (hitTop) {
    const toWeight = roundToLoadable(fromWeight + increment, unit, ex.loadStyle)
    nextState[ex.id] = { workingWeight: toWeight, consecutiveFails: 0 }
    return { exerciseId: ex.id, name: ex.name, kind: "advance", fromWeight, toWeight, reason: `Hit ${repMax} on all sets → +${increment}${unit}` }
  }

  if (allAtFloor || !rule.deloadAfterFails) {
    nextState[ex.id] = { workingWeight: fromWeight, consecutiveFails: 0 }
    return { exerciseId: ex.id, name: ex.name, kind: "hold", fromWeight, toWeight: fromWeight, reason: `In range → hold ${fromWeight}${unit}, chase ${repMax}` }
  }

  const fails = (prev.consecutiveFails ?? 0) + 1
  if (fails >= rule.deloadAfterFails) {
    const toWeight = roundToLoadable(fromWeight * (1 - (rule.deloadPct ?? 0.1)), unit, ex.loadStyle)
    nextState[ex.id] = { workingWeight: toWeight, consecutiveFails: 0 }
    return { exerciseId: ex.id, name: ex.name, kind: "deload", fromWeight, toWeight, reason: `${fails} sessions under ${repMin} → deload` }
  }
  nextState[ex.id] = { workingWeight: fromWeight, consecutiveFails: fails }
  return { exerciseId: ex.id, name: ex.name, kind: "hold", fromWeight, toWeight: fromWeight, reason: `Below ${repMin} (${fails}/${rule.deloadAfterFails})` }
}

function progressPercentage(
  program: ProgramDefinition,
  ex: LoadExercise,
  prev: ExerciseState,
  entry: ProgramSessionLogInput["entries"][number] | undefined,
  week: number,
  unit: UnitSystem,
  nextState: Record<string, ExerciseState>
): ProgressionChange | null {
  if (ex.scheme.kind !== "percentage_tm" || ex.progression.kind !== "percentage_tm") {
    throw new Error(`progressPercentage called on non-percentage ${ex.id}`)
  }
  if (program.schedule.kind !== "weekly_waved") {
    throw new Error(`percentage_tm requires weekly_waved schedule (${program.id})`)
  }
  // TM bumps once per cycle, at the last WORKING week (final week is deload).
  const lastWorkingWeek = program.schedule.weeks - 1
  if (week !== lastWorkingWeek) return null

  const rule = ex.progression
  const fromTM = prev.trainingMax!
  const increment = unit === "kg" ? rule.tmIncrementKg : rule.tmIncrementLb

  // Top-set AMRAP miss on the heaviest working week → reset TM down instead of up.
  const topSpec = ex.scheme.setsByWeek[week]?.find((s) => s.amrap)
  const topActual = entry?.sets[entry.sets.length - 1]?.reps ?? 0
  const missed = topSpec ? topActual < topSpec.reps : false

  if (missed && rule.missTmReductionPct != null) {
    const toTM = roundToLoadable(fromTM * (1 - rule.missTmReductionPct), unit)
    nextState[ex.id] = { trainingMax: toTM }
    return { exerciseId: ex.id, name: ex.name, kind: "tm_reset", fromWeight: fromTM, toWeight: toTM, reason: `Missed top set → TM −${Math.round(rule.missTmReductionPct * 100)}%` }
  }

  const toTM = roundToLoadable(fromTM + increment, unit)
  nextState[ex.id] = { trainingMax: toTM }
  return { exerciseId: ex.id, name: ex.name, kind: "tm_increase", fromWeight: fromTM, toWeight: toTM, reason: `Cycle complete → TM +${increment}${unit}` }
}

// ============================================================================
// Cursor advance (hybrid scheduling — load is log-driven sequential)
// ============================================================================

export function advanceCursor(program: ProgramDefinition, cursor: EnrollmentCursor): EnrollmentCursor {
  const next: EnrollmentCursor = { ...cursor, sessionCount: cursor.sessionCount + 1 }

  // Endurance: walk sessions within the week, then weeks; clamp at the final
  // session once the plan is finished (a fixed-length plan graduates, no loop).
  if (program.schedule.kind === "endurance_weeks") {
    const weeks = program.schedule.weeks
    const sessionsThisWeek = weeks[cursor.week - 1]?.sessions.length ?? 1
    next.dayIndex = cursor.dayIndex + 1
    if (next.dayIndex >= sessionsThisWeek) {
      if (cursor.week >= weeks.length) {
        // Finished — hold at the last session of the last week.
        next.dayIndex = cursor.dayIndex
        return next
      }
      next.dayIndex = 0
      next.week = cursor.week + 1
    }
    return next
  }

  const days = program.schedule.days
  next.dayIndex = cursor.dayIndex + 1
  if (next.dayIndex >= days.length) {
    next.dayIndex = 0
    if (program.schedule.kind === "weekly_waved") {
      next.week = cursor.week + 1
      if (next.week > program.schedule.weeks) {
        next.week = 1
        next.cycle = cursor.cycle + 1
      }
    } else {
      next.cycle = cursor.cycle + 1
    }
  }
  return next
}

// ============================================================================
// Skill-tier prescription + progression (calisthenics)
// ============================================================================

function computeSkillPrescription(program: ProgramDefinition, enrollment: ProgramEnrollment): SessionPrescription {
  if (program.schedule.kind !== "skill_routine") throw new Error(`${program.id} is not skill_routine`)
  const day = program.schedule.days[enrollment.cursor.dayIndex] ?? program.schedule.days[0]
  const exercises: PrescribedExercise[] = day.exercises.map((ex) => {
    const idx = Math.min(enrollment.exerciseState[ex.id]?.tierIndex ?? 0, ex.tiers.length - 1)
    const tier = ex.tiers[idx]
    const top = idx >= ex.tiers.length - 1
    const sets = Array.from({ length: tier.sets }, (_, i) => ({ setNumber: i + 1, reps: tier.unlockReps, amrap: false, weight: 0, weightKg: 0 }))
    return {
      exerciseId: ex.id,
      name: ex.name,
      sets,
      note: top ? `${tier.name} — top tier` : `${tier.name} — ${tier.unlockReps}+ reps to advance`,
      bodyweight: true,
      repUnit: "reps" as const,
    }
  })
  return { programId: program.id, dayId: day.id, dayLabel: day.label, cycle: enrollment.cursor.cycle, week: enrollment.cursor.week, sessionCount: enrollment.cursor.sessionCount, periodised: false, exercises }
}

function applySkillLog(program: ProgramDefinition, enrollment: ProgramEnrollment, log: ProgramSessionLogInput): ApplyLogResult {
  if (program.schedule.kind !== "skill_routine") throw new Error(`${program.id} is not skill_routine`)
  const day = program.schedule.days[enrollment.cursor.dayIndex] ?? program.schedule.days[0]
  const nextState = { ...enrollment.exerciseState }
  const changes: ProgressionChange[] = []
  for (const ex of day.exercises) {
    const idx = Math.min(enrollment.exerciseState[ex.id]?.tierIndex ?? 0, ex.tiers.length - 1)
    const tier = ex.tiers[idx]
    const entry = log.entries.find((e) => e.exerciseId === ex.id)
    const hit = (entry?.sets.filter((s) => s.reps >= tier.unlockReps).length ?? 0) >= tier.sets
    if (hit && idx < ex.tiers.length - 1) {
      nextState[ex.id] = { tierIndex: idx + 1 }
      changes.push({ exerciseId: ex.id, name: ex.name, kind: "tier_up", reason: `Unlocked: ${ex.tiers[idx + 1].name}` })
    } else {
      nextState[ex.id] = { tierIndex: idx }
      changes.push({ exerciseId: ex.id, name: ex.name, kind: "hold", reason: hit ? `Top tier — keep adding reps` : `Keep working ${tier.name}` })
    }
  }
  return { enrollment: { ...enrollment, exerciseState: nextState, cursor: advanceCursor(program, enrollment.cursor) }, changes }
}

// ============================================================================
// Hold/range prescription + progression (flexibility / mobility)
// ============================================================================

function computeHoldPrescription(program: ProgramDefinition, enrollment: ProgramEnrollment): SessionPrescription {
  if (program.schedule.kind !== "hold_routine") throw new Error(`${program.id} is not hold_routine`)
  const day = program.schedule.days[enrollment.cursor.dayIndex] ?? program.schedule.days[0]
  const exercises: PrescribedExercise[] = day.exercises.map((ex) => {
    const hold = enrollment.exerciseState[ex.id]?.currentHoldSec ?? ex.startSec
    const atTarget = hold >= ex.targetSec
    const sets = Array.from({ length: ex.sets }, (_, i) => ({ setNumber: i + 1, reps: hold, amrap: false, weight: 0, weightKg: 0 }))
    return {
      exerciseId: ex.id,
      name: ex.name,
      sets,
      note: `${hold}s${ex.perSide ? " each side" : ""}${atTarget ? " — target reached" : ` → ${ex.targetSec}s goal`}`,
      bodyweight: true,
      repUnit: "sec" as const,
    }
  })
  return { programId: program.id, dayId: day.id, dayLabel: day.label, cycle: enrollment.cursor.cycle, week: enrollment.cursor.week, sessionCount: enrollment.cursor.sessionCount, periodised: false, exercises }
}

function applyHoldLog(program: ProgramDefinition, enrollment: ProgramEnrollment, log: ProgramSessionLogInput): ApplyLogResult {
  if (program.schedule.kind !== "hold_routine") throw new Error(`${program.id} is not hold_routine`)
  const day = program.schedule.days[enrollment.cursor.dayIndex] ?? program.schedule.days[0]
  const nextState = { ...enrollment.exerciseState }
  const changes: ProgressionChange[] = []
  for (const ex of day.exercises) {
    const current = enrollment.exerciseState[ex.id]?.currentHoldSec ?? ex.startSec
    const entry = log.entries.find((e) => e.exerciseId === ex.id)
    const held = (entry?.sets.filter((s) => s.reps >= current).length ?? 0) >= ex.sets
    if (held && current < ex.targetSec) {
      const next = Math.min(ex.targetSec, current + ex.incrementSec)
      nextState[ex.id] = { currentHoldSec: next }
      changes.push({ exerciseId: ex.id, name: ex.name, kind: "hold_up", fromWeight: current, toWeight: next, reason: `Held ${current}s → ${next}s` })
    } else {
      nextState[ex.id] = { currentHoldSec: current }
      changes.push({ exerciseId: ex.id, name: ex.name, kind: "hold", reason: held ? `At target ${current}s` : `Keep working ${current}s` })
    }
  }
  return { enrollment: { ...enrollment, exerciseState: nextState, cursor: advanceCursor(program, enrollment.cursor) }, changes }
}

// ============================================================================
// Helpers
// ============================================================================

function didHitLinear(
  prescribedSets: number,
  prescribedReps: number,
  entry: ProgramSessionLogInput["entries"][number] | undefined
): boolean {
  if (!entry) return false
  const completed = entry.sets.filter((s) => s.reps >= prescribedReps).length
  return completed >= prescribedSets
}

function allExercises(program: ProgramDefinition): LoadExercise[] {
  const s = program.schedule
  if (s.kind === "linear_rotation" || s.kind === "weekly_waved") return s.days.flatMap((d) => d.exercises)
  return []
}

function dayAt(program: ProgramDefinition, dayIndex: number): DayTemplate {
  const s = program.schedule
  if (s.kind !== "linear_rotation" && s.kind !== "weekly_waved") throw new Error(`${program.id} has no load day templates`)
  const day = s.days[dayIndex]
  if (!day) throw new Error(`Program ${program.id} has no day at index ${dayIndex}`)
  return day
}

// ============================================================================
// Endurance prescription (cardio — fully prescribed by week/session)
// ============================================================================

function computeEndurancePrescription(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment
): SessionPrescription {
  if (program.schedule.kind !== "endurance_weeks") throw new Error(`${program.id} is not endurance_weeks`)
  const { week, dayIndex } = enrollment.cursor
  const weekPlan = program.schedule.weeks[week - 1]
  if (!weekPlan) throw new Error(`${program.id} has no week ${week}`)
  const session = weekPlan.sessions[dayIndex] ?? weekPlan.sessions[weekPlan.sessions.length - 1]

  const isFinalSession =
    week >= program.schedule.weeks.length && dayIndex >= weekPlan.sessions.length - 1
  /**
   * Every session in the plan has been logged.
   *
   * `isFinalSession` cannot answer this: the cursor HOLDS at the last session
   * once it gets there, so "this is the last one" stays true forever and looks
   * identical before and after you do it. Counting what has been logged against
   * what the program contains is the only thing that can tell them apart.
   */
  const totalSessions = program.schedule.weeks.reduce((n, w) => n + w.sessions.length, 0)
  const isComplete = enrollment.cursor.sessionCount >= totalSessions

  return {
    programId: program.id,
    dayId: session.id,
    dayLabel: weekPlan.label ? `${weekPlan.label} · ${session.label}` : session.label,
    cycle: enrollment.cursor.cycle,
    week,
    sessionCount: enrollment.cursor.sessionCount,
    periodised: true,
    exercises: [],
    enduranceSets: session.sets,
    summary: summarizeEndurance(session.sets),
    isFinalSession,
    isComplete,
  }
}

/** One-line human summary, e.g. "5 min walk · 8×(jog 60s / walk 90s) · 5 min walk". */
function summarizeEndurance(sets: EnduranceSet[]): string {
  const fmt = (b: EnduranceBlock) => {
    const amount = b.durationSec != null ? `${Math.round(b.durationSec / 60) || b.durationSec / 60}m` : b.distanceKm != null ? `${b.distanceKm}km` : ""
    return `${b.label}${amount ? ` ${amount}` : ""}`
  }
  return sets
    .map((s) => {
      const inner = s.blocks.map(fmt).join(" / ")
      return s.repeat > 1 ? `${s.repeat}×(${inner})` : inner
    })
    .join(" · ")
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ---------------------------------------------------------------------------
// Reading a session at a glance
// ---------------------------------------------------------------------------

/**
 * One line describing what a lift asks for today — "4 × 6–8 @ 40 kg".
 *
 * THE SESSION WAS UNREADABLE. Every set rendered as its own row of two number
 * boxes, so an upper/lower day with five lifts was twenty rows of identical
 * inputs saying "40 kg × 6 / 6–8 reps" — a sentence that parses as neither the
 * prescription nor what you did, repeated until it filled the screen. The thing
 * a person actually wants to know on a Tuesday is one line long.
 *
 * Sets that are all the same collapse into `sets × reps @ weight`. Sets that
 * differ do NOT collapse — a 5/3/1 wave is three different weights and saying
 * "3 × 5" would be a lie — so each is listed. AMRAP is marked with `+`, because
 * "as many as possible" is the one number the app cannot guess for you.
 */
export function describeSets(exercise: PrescribedExercise, unitLabel: string): string {
  const { sets, bodyweight, repUnit } = exercise
  if (sets.length === 0) return "—"
  const unit = repUnit === "sec" ? "sec" : "reps"

  const repsOf = (s: PrescribedSet) =>
    `${s.repRangeMax ? `${s.reps}–${s.repRangeMax}` : s.reps}${s.amrap ? "+" : ""}`
  const weightOf = (s: PrescribedSet) => `${s.weight} ${unitLabel}`

  const uniform =
    sets.every((s) => s.weight === sets[0].weight) &&
    sets.every((s) => repsOf(s) === repsOf(sets[0]))

  if (uniform) {
    const head = `${sets.length} × ${repsOf(sets[0])} ${unit}`
    return bodyweight ? head : `${head} @ ${weightOf(sets[0])}`
  }
  return sets
    .map((s) => (bodyweight ? repsOf(s) : `${weightOf(s)} × ${repsOf(s)}`))
    .join(", ")
}

/**
 * Whether a lift has to be opened before it can be logged honestly.
 *
 * An AMRAP set has no prescribed answer — the whole point is how many you got —
 * so "log it as prescribed" would quietly record the floor of the range as your
 * result and progress you off a number you never lifted.
 */
export function needsInput(exercise: PrescribedExercise): boolean {
  return exercise.sets.some((s) => s.amrap)
}

// ---------------------------------------------------------------------------
// A year of it, read back
// ---------------------------------------------------------------------------

/**
 * A load as somebody would write it on a whiteboard — the NUMBER only.
 *
 * Named `formatLoad`, not `formatWeight`: `healthService.formatWeight(kg, unit)`
 * already exists and returns "82.5 kg". Two functions with one name in two
 * slices is how the wrong one gets imported.
 *
 * Progression arithmetic produces numbers like `20.4375` — 2.5 kg increments,
 * percentage-of-training-max waves and pound conversions all divide, and the
 * result was being printed raw. Nobody has ever loaded 20.4375 kg. One decimal
 * is the finest a barbell is actually adjustable to, and whole numbers lose the
 * ".5" that half the plates in a gym are.
 */
export function formatLoad(weight: number): string {
  const rounded = Math.round(weight * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** What one lift did over every session logged on a program. */
export interface LiftProgress {
  exerciseId: string
  name: string
  /** Heaviest working weight the first time it was logged. */
  first: number
  /** Heaviest working weight the last time it was logged. */
  latest: number
  /** Heaviest ever, which is not always the latest — a deload moves it down. */
  best: number
  sessions: number
  firstAt: string
  latestAt: string
  /**
   * The working weight at each session, oldest first — the SHAPE of the year.
   *
   * First and latest say where it started and where it is; they cannot say
   * whether it climbed steadily, stalled for four months, or came back from a
   * deload. That is the part somebody actually recognises as their training.
   *
   * Downsampled to at most `SPARK_POINTS`, evenly across the run and always
   * keeping the true first and last, so a three-year log renders the same size
   * as a three-week one and the endpoints still match the numbers beside it.
   */
  points: LoadPoint[]
}

/** Enough to show a shape, few enough to stay a glyph rather than a chart. */
const SPARK_POINTS = 40

export function downsample(values: LoadPoint[], max = SPARK_POINTS): LoadPoint[] {
  if (values.length <= max) return values
  const step = (values.length - 1) / (max - 1)
  const out: LoadPoint[] = []
  for (let i = 0; i < max; i++) out.push(values[Math.round(i * step)])
  return out
}

/**
 * WHAT THE NUMBERS DID, which is the only reason anybody logs them.
 *
 * The history panel showed the last twelve sessions as `ohp-day · C1 W1` and a
 * date. After a year that is a scrolling list of internal identifiers, and the
 * one question a training log exists to answer — *did my bench go up?* — could
 * not be asked at all, even though every set of every session was sitting in
 * `program_session_logs.entries` the whole time.
 *
 * Deliberately reports FIRST, LATEST and BEST as three separate numbers rather
 * than one "progress" figure. They come apart in normal training and the
 * difference is the information: latest below best means a deload, latest equal
 * to first after thirty sessions means a stall, and a single "+45 kg" would
 * hide both.
 *
 * `logs` may arrive in any order; this sorts, so a caller that fetched newest
 * first does not silently get its first and latest swapped.
 */
export function summariseProgression(
  logs: { entries: LoggedExercise[]; logged_at: string }[],
  nameFor: (exerciseId: string) => string
): LiftProgress[] {
  const byLift = new Map<string, { at: string; top: number }[]>()

  for (const log of logs) {
    for (const entry of log.entries ?? []) {
      // The working weight of a session is its heaviest set. Taking the last
      // set instead would read a drop set as a collapse in strength.
      const top = entry.sets.reduce((m, s) => Math.max(m, s.weight), 0)
      if (!byLift.has(entry.exerciseId)) byLift.set(entry.exerciseId, [])
      byLift.get(entry.exerciseId)!.push({ at: log.logged_at, top })
    }
  }

  const out: LiftProgress[] = []
  for (const [exerciseId, points] of byLift) {
    points.sort((a, b) => a.at.localeCompare(b.at))
    out.push({
      exerciseId,
      name: nameFor(exerciseId),
      first: points[0].top,
      latest: points[points.length - 1].top,
      best: points.reduce((m, p) => Math.max(m, p.top), 0),
      sessions: points.length,
      firstAt: points[0].at,
      latestAt: points[points.length - 1].at,
      points: downsample(points.map((pt) => ({ at: pt.at, weight: pt.top }))),
    })
  }
  // Biggest gain first — the lifts that moved are the ones worth reading.
  return out.sort((a, b) => b.latest - b.first - (a.latest - a.first))
}

/**
 * How many sessions in a row were logged with nothing missed.
 *
 * THE 395 KG SQUAT. Linear progression adds weight after a session you
 * completed, and deloads only after you FAIL — which is correct, and is what
 * StrongLifts says. But "log session as prescribed" is now one button, so it is
 * very easy to tell the app you hit every rep on a day you did not, and a year
 * of that ratchets a beginner's squat to a number no human has lifted.
 *
 * A CEILING WOULD BE THE WRONG FIX. The programs here are cited; inventing a cap
 * would be editing somebody else's program with a number we made up. What can be
 * said honestly is what the log itself shows: an unbroken run. Real linear
 * progression stalls — that is the entire premise of the program — so a run this
 * long means the log and the gym have come apart, and the person is the only one
 * who can say which is right.
 *
 * Counts back from the most recent session and stops at the first missed rep.
 */
export function unbrokenRun(
  logs: { entries: LoggedExercise[]; logged_at: string }[],
  targetRepsFor: (exerciseId: string) => number | null
): number {
  const ordered = [...logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at))
  let run = 0
  for (const log of ordered) {
    const everyRepHit = (log.entries ?? []).every((entry) => {
      const target = targetRepsFor(entry.exerciseId)
      // A lift with no fixed rep target — an AMRAP top set, a timed hold — can
      // not be "missed", so it neither breaks a run nor extends one.
      if (target === null) return true
      return entry.sets.every((s) => s.reps >= target)
    })
    if (!everyRepHit) break
    run++
  }
  return run
}

/**
 * The point at which an unbroken run is worth asking about.
 *
 * Beginner linear programs are expected to stall inside a few months — roughly
 * forty sessions at three a week. Thirty is comfortably inside "still plausible"
 * while being far enough in that a real stall should have happened.
 */
export const UNBROKEN_RUN_QUESTION_AT = 30

/**
 * Days since the last session on this enrollment, or null if never trained.
 *
 * COMING BACK. The engine advances on what you log, so a program you left in
 * March prescribes, in September, exactly the weight you walked away from — and
 * that weight is now wrong, because six months off costs strength that no rule
 * in the program accounts for. The program cannot know; only the calendar can.
 *
 * Not a deload rule. These programs are cited and inventing "drop 20% after
 * eight weeks" would be putting our number in somebody else's program. This is
 * the fact; what to do with it is the lifter's call, and the controls to do it
 * already exist.
 */
export function daysSinceLastSession(
  logs: { logged_at: string }[],
  now: Date = new Date()
): number | null {
  if (logs.length === 0) return null
  const latest = logs.reduce((m, l) => (l.logged_at > m ? l.logged_at : m), logs[0].logged_at)
  const then = new Date(latest)
  // Whole days between two wall-clock dates, so a session logged last night at
  // 23:00 reads as "yesterday" rather than as a fraction of a day.
  const dayMs = 24 * 60 * 60 * 1000
  const a = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((b - a) / dayMs))
}

/**
 * Days since each individual lift was last trained.
 *
 * The program-level layoff notice says "you last trained this 94 days ago" and
 * stops there. After three months off that is true of the whole program, but
 * after an injury or a busy month it is usually true of SOME lifts — you kept
 * squatting and stopped pressing — and one line for the program cannot say which
 * weights are the stale ones.
 *
 * Still states the fact and stops. No cited program has a detraining rule, so
 * computing "drop 15%" here would be putting our number into somebody else's
 * program under their name.
 */
export function staleLifts(
  logs: { entries: LoggedExercise[]; logged_at: string }[],
  nameFor: (exerciseId: string) => string,
  now: Date = new Date(),
  thresholdDays: number = LAYOFF_DAYS
): { exerciseId: string; name: string; days: number }[] {
  const lastByLift = new Map<string, string>()
  for (const log of logs) {
    for (const entry of log.entries ?? []) {
      const seen = lastByLift.get(entry.exerciseId)
      if (!seen || log.logged_at > seen) lastByLift.set(entry.exerciseId, log.logged_at)
    }
  }

  const out: { exerciseId: string; name: string; days: number }[] = []
  for (const [exerciseId, at] of lastByLift) {
    // Reuse the one day-difference rule rather than writing a second one.
    const days = daysSinceLastSession([{ logged_at: at }], now)
    if (days !== null && days >= thresholdDays) out.push({ exerciseId, name: nameFor(exerciseId), days })
  }
  return out.sort((a, b) => b.days - a.days)
}

/** Long enough away that the weights waiting for you are probably wrong. */
export const LAYOFF_DAYS = 21

/**
 * What you did last time, per lift, in the words you would say it in.
 *
 * "What did I get last week" is the question somebody is actually answering
 * when they decide today's numbers, and every other lifting app puts the answer
 * beside the input. This screen had it nowhere — the data was sitting in the
 * session logs the whole time.
 *
 * Reads the most recent session that CONTAINED the lift, not the most recent
 * session: on an alternating program the last session was the other day, and
 * "last time" means the last time you did this lift.
 */
export function lastTimePerLift(
  logs: { entries: LoggedExercise[]; logged_at: string }[],
  unitLabel: string
): Record<string, string> {
  const newestFirst = [...logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at))
  const out: Record<string, string> = {}

  for (const log of newestFirst) {
    for (const entry of log.entries ?? []) {
      if (out[entry.exerciseId] || entry.sets.length === 0) continue
      const reps = entry.sets.map((s) => s.reps)
      const weights = entry.sets.map((s) => s.weight)
      const sameReps = reps.every((r) => r === reps[0])
      const sameWeight = weights.every((w) => w === weights[0])
      // Uniform sets collapse; anything else is listed, for the same reason
      // `describeSets` refuses to flatten a wave — "5 × 5" would be a lie.
      const body = sameReps && sameWeight
        ? `${entry.sets.length} × ${reps[0]} @ ${formatLoad(weights[0])} ${unitLabel}`
        : entry.sets.map((s) => `${formatLoad(s.weight)}×${s.reps}`).join(", ")
      out[entry.exerciseId] = `${body} · ${new Date(log.logged_at).toLocaleDateString()}`
    }
  }
  return out
}

/**
 * Exercise ids in a logged session that the program does not contain.
 *
 * A session was accepted, stored and returned 200 while naming lifts that do
 * not exist in the enrollment's program — `bench` against a program whose lift
 * is `ul_bench`. Nothing downstream could recover: the engine has no state to
 * progress for an id it has never seen, and every screen that turns an id back
 * into a name falls through to printing the raw id for ever.
 *
 * Returns the offending ids rather than a boolean, because "unknown exercise"
 * with no name is a support ticket rather than an error message.
 *
 * An ENDURANCE session legitimately has no entries at all, so an empty list is
 * always valid — this only ever rejects an id that was actually sent.
 */
export function unknownExerciseIds(
  program: ProgramDefinition,
  entries: { exerciseId: string }[]
): string[] {
  if (entries.length === 0) return []
  const known = new Set<string>()
  // `scheduleDays` throws on an endurance plan, which genuinely has weeks and
  // not days. Such a plan has no exercises at all, so ANY entry sent against it
  // is unknown — that is the answer, not a crash.
  if (program.schedule.kind !== "endurance_weeks") {
    for (const day of scheduleDays(program.schedule)) {
      for (const ex of day.exercises) known.add(ex.id)
    }
  }
  return [...new Set(entries.map((e) => e.exerciseId))].filter((id) => !known.has(id))
}

/** What to hang on each side of the bar, heaviest first. */
export interface PlateLoad {
  /** Plates for ONE side, heaviest first. */
  perSide: number[]
  /** The weight this actually makes — equal to the target when exact. */
  achievable: number
  /** True when the plates cannot make the target exactly. */
  approximate: boolean
  /** True when the target is at or below the empty bar. */
  barOnly: boolean
}

/**
 * Which plates to load for a target weight.
 *
 * "What do I put on the bar" is arithmetic somebody does in their head between
 * sets, gets wrong, and then lifts the wrong weight — which is why every serious
 * lifting app has this and why its absence is a standing complaint. It is pure
 * arithmetic, so it lives here rather than in a component.
 *
 * THREE ANSWERS IT HAS TO BE ABLE TO GIVE, and the reason this is not two lines:
 *   - the exact plates, when the number is loadable;
 *   - the closest it can get, SAID to be approximate, when it is not — a
 *     silently-rounded answer would have somebody lift a different weight than
 *     the one on their screen;
 *   - "just the bar", when the target is at or below the bar, rather than an
 *     empty list that reads as "no answer".
 *
 * Greedy from the heaviest plate down, which is both what a person does and
 * optimal for any real plate set (each plate divides the next one up).
 */
export function platesFor(target: number, unit: UnitSystem): PlateLoad {
  const { barWeight } = UNIT_CONFIG[unit]
  if (target <= barWeight) {
    return { perSide: [], achievable: barWeight, approximate: target < barWeight, barOnly: true }
  }

  let remainingPerSide = (target - barWeight) / 2
  const perSide: number[] = []
  for (const plate of PLATES[unit]) {
    // A hair of tolerance: (target - bar) / 2 on a .5 kg increment is exact in
    // decimal but not in binary, and a strict >= would drop the last 1.25.
    while (remainingPerSide >= plate - 1e-9) {
      perSide.push(plate)
      remainingPerSide -= plate
    }
  }
  const achievable = barWeight + perSide.reduce((t, p) => t + p, 0) * 2
  return {
    perSide,
    achievable: Math.round(achievable * 100) / 100,
    approximate: Math.abs(achievable - target) > 1e-9,
    barOnly: perSide.length === 0,
  }
}

/** "20 + 10 + 2.5 per side" — the plate load as somebody would say it. */
export function describePlates(load: PlateLoad, unitLabel: string): string {
  if (load.barOnly) return "just the bar"
  const counted = load.perSide.reduce<{ plate: number; n: number }[]>((acc, p) => {
    const last = acc[acc.length - 1]
    if (last && last.plate === p) last.n++
    else acc.push({ plate: p, n: 1 })
    return acc
  }, [])
  const body = counted.map((c) => (c.n > 1 ? `${c.n}×${c.plate}` : `${c.plate}`)).join(" + ")
  return `${body} per side${load.approximate ? ` (makes ${load.achievable} ${unitLabel})` : ""}`
}

/**
 * Rebuild an enrollment's state by replaying every session from the start.
 *
 * EDITING A PAST SESSION HAS TO CHANGE WHAT COMES NEXT, or it is not a
 * correction — it is a note. But the state a log advanced FROM is not stored:
 * `exercise_state` only ever holds where you are now, so a single log cannot be
 * reversed. There is nothing to subtract.
 *
 * Replay is the way out, and it is available only because the engine is pure.
 * Seed the enrollment exactly as it was created, then fold every session over it
 * in order. The result is what the state would have been had the corrected
 * session been logged that way originally — which is the whole feature, and the
 * thing its test asserts.
 *
 * Deliberately takes the seed rather than deriving it: the level's starting
 * weights are the enrollment's own history and re-resolving them from today's
 * catalogue would silently rewrite somebody's past if a program were ever
 * corrected upstream.
 */
export function replayEnrollment(
  program: ProgramDefinition,
  seed: ProgramEnrollment,
  logs: { entries: LoggedExercise[]; logged_at: string; dayId: string; cycle: number; week: number }[]
): ProgramEnrollment {
  const ordered = [...logs].sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  let state: ProgramEnrollment = {
    ...seed,
    cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
  }
  for (const log of ordered) {
    state = applyLog(program, state, {
      enrollment_id: seed.id,
      dayId: log.dayId,
      cycle: log.cycle,
      week: log.week,
      entries: log.entries,
    }).enrollment
  }
  return state
}
