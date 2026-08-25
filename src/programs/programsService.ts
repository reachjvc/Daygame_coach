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

import { KG_PER_LB, UNIT_CONFIG } from "./config"
import type {
  ApplyLogResult,
  DayTemplate,
  EnduranceBlock,
  EnduranceSet,
  EnrollmentCursor,
  ExerciseState,
  LoadExercise,
  ProgramDefinition,
  ProgramEnrollment,
  ProgramSessionLogInput,
  PrescribedExercise,
  ProgressionChange,
  SessionPrescription,
  UnitSystem,
} from "./types"

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
      return { exerciseId: ex.id, name: ex.name, sets, ...carried(ex), note: ex.note ?? `${repMin}–${repMax} reps` }
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
  return { programId: program.id, dayId: day.id, dayLabel: day.label, cycle: enrollment.cursor.cycle, week: enrollment.cursor.week, exercises }
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
  return { programId: program.id, dayId: day.id, dayLabel: day.label, cycle: enrollment.cursor.cycle, week: enrollment.cursor.week, exercises }
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

  return {
    programId: program.id,
    dayId: session.id,
    dayLabel: weekPlan.label ? `${weekPlan.label} · ${session.label}` : session.label,
    cycle: enrollment.cursor.cycle,
    week,
    exercises: [],
    enduranceSets: session.sets,
    summary: summarizeEndurance(session.sets),
    isFinalSession,
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
