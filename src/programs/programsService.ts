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

import {
  DEFAULT_PLATES,
  FREE_PRECISION,
  KG_PER_LB,
  LOAD_TOLERANCE,
  PLATES,
  REST_SECONDS,
  UNIT_CONFIG,
} from "./config"
import { libraryByName } from "./data/exerciseLibrary"
import type {
  ApplyLogResult,
  DayTemplate,
  EnduranceBlock,
  EnduranceSet,
  EnrollmentCursor,
  ExerciseState,
  LoadExercise,
  LoadJudgement,
  LoadPoint,
  LoggedExercise,
  LoggedSet,
  PlateSetup,
  ProgramSchedule,
  ReplayEvent,
  StoredSet,
  WorkoutAdjustments,
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
  style: "barbell" | "free" | "bodyweight" = "barbell",
  setup?: PlateSetup,
  /**
   * "down" never asks for more than intended — which is what a PRESCRIPTION
   * needs, and what Wendler says to do with a percentage. "nearest" is for a
   * number somebody typed, where the intent is the number itself.
   */
  mode: "nearest" | "down" = "nearest"
): number {
  if (style === "free" || style === "bodyweight") {
    // Rounded to a number a person would write down, and allowed all the way
    // to nothing. It used to be snapped to the BARBELL's 2.5 kg step, which
    // turned a 6 kg dumbbell into 5 and a 12 kg one into 12.5, and made a 1 kg
    // increment move nothing while the app said "+1 kg". We do not know what a
    // given gym's dumbbells or cable stack go up in, so the increment decides
    // the step and this only keeps the number sane.
    const precision = FREE_PRECISION[unit]
    const steps = mode === "down" ? Math.floor(weight / precision) : Math.round(weight / precision)
    return Math.max(0, round2(steps * precision))
  }
  const plates = setup ?? DEFAULT_PLATES[unit]
  const step = plates.smallestPlate * 2
  if (weight <= plates.barWeight) return plates.barWeight
  // Measured from the BAR, not from zero: with a 15 kg bar and 1.25 kg plates
  // the loadable weights are 15, 17.5, 20 — not the multiples of 2.5 that
  // rounding the absolute number would give.
  const steps = (weight - plates.barWeight) / step
  const rounded = plates.barWeight + (mode === "down" ? Math.floor(steps + 1e-9) : Math.round(steps)) * step
  return Math.max(plates.barWeight, round2(rounded))
}

/**
 * How a lift is loaded — declared by the author, or DERIVED from the library.
 *
 * IT USED TO DEFAULT TO BARBELL FOR EVERYTHING. Fourteen lifts across the
 * catalogue — every lat pulldown, leg press, cable fly, lateral raise — were
 * therefore floored at the 20 kg bar and told the lifter "just the bar", which
 * is both a weight they cannot use and, once at the floor, one they can never
 * move off. Hand-writing `loadStyle` on every row would be a hundred chances to
 * file a lift wrongly; the library already knows which lifts have a bar under
 * them, so it is asked. An explicit value still wins, for the lifts the library
 * has never heard of.
 */
export function loadStyleOf(
  ex: Pick<LoadExercise, "name" | "loadStyle">
): "barbell" | "free" | "bodyweight" {
  if (ex.loadStyle) return ex.loadStyle
  const lib = libraryByName(ex.name)
  if (!lib) return "barbell"
  return lib.barbell ? "barbell" : "free"
}

/**
 * The loadable weights either side of a target, for "can my gym make this?".
 *
 * `roundToLoadable` answers with one number; the engine also needs to know
 * whether that number IS the target, because a program whose increment is
 * smaller than the plates you own can never move if every session silently
 * rounds back to where it started.
 */
export function isLoadable(
  weight: number,
  unit: UnitSystem,
  style: "barbell" | "free" | "bodyweight" = "barbell",
  setup?: PlateSetup
): boolean {
  return Math.abs(roundToLoadable(weight, unit, style, setup) - weight) < 1e-9
}

/**
 * Whether this schedule runs on a calendar or in sequence.
 *
 * Deliberately all-or-nothing. A week where three days have weekdays and two do
 * not has no coherent answer to "what is today's session" on the days nobody
 * assigned, and every way of resolving it is a guess. `designProblems` reports
 * the half-assigned state so it is fixed rather than interpreted.
 *
 * Lives here, with the engine, because it decides what gets prescribed. It was
 * in `builder.ts` next to the editor that sets the weekdays, which is where you
 * look to change one, not where you look to find out what today is.
 */
export function isWeekdayAnchored(schedule: ProgramSchedule): boolean {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return false
  return schedule.days.length > 0 && schedule.days.every((d) => d.weekday != null)
}

/** The day to do on a given ISO weekday, if this schedule is anchored. */
export function dayForWeekday(schedule: ProgramSchedule, weekday: number) {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return undefined
  return schedule.days.find((d) => d.weekday === weekday)
}

/**
 * Which day of an anchored week is today's, and whether today is a rest day.
 *
 * PURE, AND HERE, because it decides what a person is shown. It used to live in
 * `programRepo` — inside the database layer, reachable by no unit test and by
 * no integration test either (that harness runs raw SQL and never calls a repo
 * function), so the single rule that answers "am I training today" was the one
 * rule nobody could check. It also read the SERVER's clock; the weekday is now
 * an argument, so the caller has to say whose today it means.
 *
 * Returns null when the program is not on a calendar at all — StrongLifts is
 * A/B/A three times a week and its author never said which days — and the
 * caller then walks the cursor, which is the behaviour those programs have
 * always had.
 */
export function pickTodaysDay(
  schedule: ProgramSchedule,
  todayWeekday: number
): { dayIndex: number; restDay: boolean; scheduledWeekday?: number } | null {
  if (!isWeekdayAnchored(schedule)) return null
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return null
  const days = schedule.days

  const today = dayForWeekday(schedule, todayWeekday)
  // A REST DAY IS A REAL ANSWER. The next session is still resolved so the
  // screen can say what is coming, but it is flagged rather than served as
  // today's work — otherwise a three-day week silently becomes a seven-day one.
  const target =
    today ??
    [...days]
      .filter((d) => d.weekday != null)
      .sort(
        (a, b) => ((a.weekday! - todayWeekday + 7) % 7) - ((b.weekday! - todayWeekday + 7) % 7)
      )[0]
  if (!target) return null

  const dayIndex = days.findIndex((d) => d.id === target.id)
  if (dayIndex < 0) return null
  return {
    dayIndex,
    restDay: !today,
    ...(target.weekday != null ? { scheduledWeekday: target.weekday } : {}),
  }
}

/**
 * What a logged lift did, measured against what it asked for.
 *
 * THE WEIGHT USED TO BE IGNORED IN BOTH DIRECTIONS. Only reps were compared, so
 * five sets of five at 60 kg when 80 was prescribed counted as a clean session
 * and earned +2.5 kg on a weight that had not been touched; and five sets at 85
 * when 80 was asked for ratcheted to 82.5, less than had just been demonstrated.
 *
 * Three outcomes, because "did you do it" has three honest answers and the old
 * boolean had two. Missing reps at the prescribed weight is the only one that
 * counts as a failure — training lighter on purpose is a decision, not a miss,
 * and deloading somebody for it (three sessions at 60 of 80 used to take 10%
 * off the 80) punishes the one person who was being sensible.
 *
 * ASSISTANCE LIFTS RUN THE OTHER WAY. On an assisted pull-up the machine takes
 * weight off you, so less of it is progress and "at least the prescribed
 * weight" is exactly backwards.
 */
export function judgeLoadEntry(
  prescribed: { sets: number; reps: number; weight: number },
  entry: LoggedExercise | undefined,
  opts: { direction?: "up" | "down"; tolerance?: number } = {}
): LoadJudgement {
  const tol = opts.tolerance ?? LOAD_TOLERANCE
  const down = opts.direction === "down"
  const done = entry?.sets ?? []

  const atWeight = (set: LoggedSet) =>
    down ? set.weight <= prescribed.weight + tol : set.weight >= prescribed.weight - tol
  const madeReps = done.filter((set) => set.reps >= prescribed.reps)
  const counted = madeReps.filter(atWeight)

  /**
   * The heaviest weight at which ALL the prescribed sets were made.
   *
   * Not the heaviest single set: four sets at 80 and a last one at 85 is a
   * session at 80 with one heavy single on the end. Sorting and taking the
   * n-th is the whole rule.
   */
  const achievedFrom = (sets: LoggedSet[]): number => {
    const weights = sets.map((set) => set.weight).sort((a, b) => (down ? a - b : b - a))
    return weights[prescribed.sets - 1] ?? prescribed.weight
  }

  if (counted.length >= prescribed.sets)
    return { verdict: "advance", achieved: achievedFrom(counted), setsDone: done.length }
  if (madeReps.length >= prescribed.sets)
    return { verdict: "hold_lighter", achieved: achievedFrom(madeReps), setsDone: done.length }

  /**
   * WHICH KIND OF SHORT, because they are not the same session and must not
   * read as the same sentence. Stopping after one good set because the gym
   * closed is not the same as grinding out five sets and missing reps on three
   * of them, and only one of them is "missed reps".
   */
  const shortOnReps = madeReps.length < done.length
  const shortOnSets = done.length < prescribed.sets
  return {
    verdict: "fail",
    achieved: prescribed.weight,
    setsDone: done.length,
    shortfall: shortOnReps && shortOnSets ? "both" : shortOnReps ? "reps" : "sets",
  }
}

/**
 * How long to rest after a set, and whether the number is ours or the author's.
 *
 * IT USED TO BE PICKED BY SET COUNT — four or more sets meant "compound" — so a
 * 3×5 squat got ninety seconds and 4×12 curls got three minutes, which is
 * exactly wrong in both directions. What decides rest is the LIFT.
 *
 * `ours` is returned rather than assumed because most of this catalogue's
 * authors never specified rest, and presenting our guess as their instruction
 * would be putting our numbers into somebody else's cited program. Where a
 * source does specify it (StrongLifts), the exercise carries `restSec` and this
 * says so.
 */
export function restSecondsFor(
  exercise: Pick<LoadExercise, "name" | "restSec" | "loadStyle">,
  opts: { setRestSec?: number; warmup?: boolean } = {}
): { seconds: number; ours: boolean } {
  if (opts.warmup) return { seconds: REST_SECONDS.warmup, ours: true }
  if (opts.setRestSec != null) return { seconds: opts.setRestSec, ours: false }
  if (exercise.restSec != null) return { seconds: exercise.restSec, ours: false }
  // A dip and a pull-up have no bar under them and still need three minutes, so
  // the question is whether the lift is COMPOUND, not whether it is barbell.
  const lib = libraryByName(exercise.name)
  const compound = lib ? lib.compound : (exercise.loadStyle ?? "barbell") === "barbell"
  return { seconds: compound ? REST_SECONDS.compound : REST_SECONDS.accessory, ours: true }
}

/** Epley 1RM estimate: w · (1 + reps/30). reps=1 → w. (Epley 1985.) */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + reps / 30)
}

/** 5/3/1 training max = 90% of 1RM, rounded loadable. (Wendler, 5/3/1.) */
export function trainingMaxFromOneRepMax(
  oneRepMax: number,
  unit: UnitSystem,
  plates?: PlateSetup
): number {
  return roundToLoadable(oneRepMax * 0.9, unit, "barbell", plates)
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
  workingWeightOverrides?: Record<string, number>, // in unitSystem; overrides linear seeds
  plates?: PlateSetup
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
      exerciseState[ex.id] = { trainingMax: trainingMaxFromOneRepMax(oneRm, unitSystem, plates) }
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
          ? roundToLoadable(override, unitSystem, loadStyleOf(ex), plates)
          : roundToLoadable(fromKg(seedKg!, unitSystem), unitSystem, loadStyleOf(ex), plates)
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

  const levelSeed = program.levels.find((l) => l.id === enrollment.level)

  const exercises: PrescribedExercise[] = day.exercises.map((ex) => {
    /**
     * A PROGRAM THAT GAINS A LIFT MUST NOT BRICK THE PEOPLE ON IT.
     *
     * `exerciseState` is written at enrolment, so a lift added to a cited
     * program afterwards has no entry and every session on that program threw —
     * the whole screen, not just the new lift. Correcting a catalogue program is
     * supposed to reach everybody on the next deploy; that only works if adding
     * to one degrades gracefully. The level's own starting weight is the honest
     * answer when there is one, and when there is not, the error names the lift
     * and what to do rather than an enrollment id.
     */
    let state = enrollment.exerciseState[ex.id]
    if (!state) {
      const seedKg = levelSeed?.seedWorkingWeightKg?.[ex.id]
      if (seedKg == null) {
        throw new Error(
          `${ex.name} was added to ${program.name} after you started it, and it has no starting weight. Open "Change this program" and give it one.`
        )
      }
      state = {
        workingWeight: roundToLoadable(
          fromKg(seedKg, unit),
          unit,
          loadStyleOf(ex),
          enrollment.plates
        ),
        consecutiveFails: 0,
      }
    }

    if (ex.scheme.kind === "linear") {
      const weight = prescribedWeight(state.workingWeight!, ex, unit, enrollment.plates)
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
      const weight = prescribedWeight(state.workingWeight!, ex, unit, enrollment.plates)
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

    /**
     * STRAIGHT SETS WITH AN AMRAP LAST SET — "4×5, then 1×5+".
     *
     * The shape the r/Fitness PPL and StrongLifts-style "5+" work actually
     * have, and one the engine could not say before: `linear` has no AMRAP set
     * and `percentage_tm` is a weekly table rather than one lift's setting. The
     * last set carries the floor as its rep target and `amrap`, which is what
     * makes the session refuse to be logged closed (`needsInput`) — logging a
     * "5+" as five would record a number nobody chose.
     */
    if (ex.scheme.kind === "straight_amrap") {
      const weight = prescribedWeight(state.workingWeight!, ex, unit, enrollment.plates)
      const { sets: nSets, reps } = ex.scheme
      const sets = Array.from({ length: nSets }, (_, i) => ({
        setNumber: i + 1,
        reps,
        amrap: i === nSets - 1,
        weight,
        weightKg: round2(toKg(weight, unit)),
      }))
      return { exerciseId: ex.id, name: ex.name, sets, ...carried(ex) }
    }

    // percentage_tm
    const tm = state.trainingMax!
    const weekSpec = ex.scheme.setsByWeek[week]
    if (!weekSpec) throw new Error(`${ex.id} has no sets for week ${week}`)
    const sets = weekSpec.map((s, i) => {
      const weight = roundToLoadable(tm * s.pctTM, unit, loadStyleOf(ex), enrollment.plates, "down")
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
 * The weight to actually put on the bar for a stored working weight.
 *
 * THE WORKING WEIGHT IS EXACT; THE PRESCRIPTION IS LOADABLE. Keeping them the
 * same number broke any program whose increment is finer than the plates in
 * your gym: with only 2.5 kg plates, a 2.5 kg increment on a 20 kg bench
 * rounded to the nearest loadable weight and landed on 25, so the bench climbed
 * FIVE kilos a session — twice the program's rate — and with rounding the other
 * way it would have sat on 20 for ever.
 *
 * Holding the intent exactly and flooring only what is asked for fixes both:
 * 20 → 22.5 stored, 20 asked; 22.5 → 25 stored, 25 asked. The lifter adds a
 * full step every second session, which is what a person with those plates
 * actually does, and nothing stalls or doubles.
 */
function prescribedWeight(
  workingWeight: number,
  ex: LoadExercise,
  unit: UnitSystem,
  plates?: PlateSetup
): number {
  return roundToLoadable(workingWeight, unit, loadStyleOf(ex), plates, "down")
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
function carried(ex: LoadExercise): {
  supersetGroup?: string
  dropSets?: number
  note?: string
  perSide?: boolean
  repUnit?: "reps" | "sec"
} {
  return {
    ...(ex.supersetGroup ? { supersetGroup: ex.supersetGroup } : {}),
    // Drops are the author's too. The maths ignores them; the person doing it
    // on Tuesday must not have to.
    ...(ex.dropSets ? { dropSets: ex.dropSets } : {}),
    ...(ex.note ? { note: ex.note } : {}),
    // "3×8 lunges" is eight each leg or four each, and only the author knows.
    ...(ex.perSide ? { perSide: true } : {}),
    // A plank logged as "3 reps" is not a plank.
    ...(ex.repUnit ? { repUnit: ex.repUnit } : {}),
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

    /**
     * A LIFT YOU DID NOT DO IS NOT A LIFT YOU FAILED.
     *
     * The machine was broken, the rack was taken, the gym shut. The engine used
     * to read "no entry" as "missed every rep", so three skipped leg presses
     * deloaded the leg press by ten per cent off a weight nobody had attempted
     * — and a skipped session (which sends no entries at all) did it to every
     * lift in the program at once. Skipping holds, and does not touch the fail
     * counter, so coming back finds the weight exactly where it was left.
     */
    if (!entry || entry.skipped) {
      nextState[ex.id] = prev
      changes.push({
        exerciseId: ex.id,
        name: ex.name,
        kind: "hold",
        ...(prev.workingWeight != null
          ? { fromWeight: prev.workingWeight, toWeight: prev.workingWeight }
          : {}),
        reason:
          entry && entry.sets.length > 0
            ? "You said not to count this one — the weight is waiting where you left it."
            : "Skipped — nothing changed, it is waiting where you left it.",
      })
      continue
    }

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
      changes.push(progressLinear(ex, prev, entry, unit, nextState, enrollment.plates))
    } else if (ex.progression.kind === "double_progression") {
      changes.push(progressDouble(ex, prev, entry, unit, nextState, enrollment.plates))
    } else {
      const change = progressPercentage(
        program,
        ex,
        prev,
        entry,
        enrollment.cursor.week,
        unit,
        nextState,
        enrollment.plates
      )
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

/**
 * Index of a day by id, or -1.
 *
 * Covers skill and hold routines too. It used to narrow to load programs only,
 * which is why the calisthenics and mobility engines had no choice but to
 * progress whatever day the CURSOR pointed at — the same bug that was fixed for
 * lifting in August and left in place for the other two.
 */
function dayIndexOf(program: ProgramDefinition, dayId: string): number {
  const s = program.schedule
  if (s.kind === "endurance_weeks") return -1
  return s.days.findIndex((d) => d.id === dayId)
}

function progressLinear(
  ex: LoadExercise,
  prev: ExerciseState,
  entry: ProgramSessionLogInput["entries"][number] | undefined,
  unit: UnitSystem,
  nextState: Record<string, ExerciseState>,
  setup?: PlateSetup
): ProgressionChange {
  if (
    (ex.scheme.kind !== "linear" && ex.scheme.kind !== "straight_amrap") ||
    ex.progression.kind !== "linear_load"
  ) {
    throw new Error(`progressLinear called on non-linear ${ex.id}`)
  }
  const rule = ex.progression
  const fromWeight = prev.workingWeight!
  const down = rule.direction === "down"
  const unitLabel = unit

  /**
   * The smaller jump, once this lift has stalled once.
   *
   * StrongLifts runs the deadlift at 5 kg a workout "until 5 kg stops working",
   * then 2.5; Starting Strength halves the press and bench jump at the first
   * stall. Every other lift here has one increment for ever, which is what an
   * absent `stallIncrement` means.
   */
  const stalled = prev.stalled === true
  const baseIncrement = unit === "kg" ? rule.incrementKg : rule.incrementLb
  const stallIncrement = unit === "kg" ? rule.stallIncrementKg : rule.stallIncrementLb
  const increment = stalled && stallIncrement != null ? stallIncrement : baseIncrement

  // JUDGED AGAINST WHAT WAS ASKED FOR, which is the working weight floored to
  // something the gym can load — not the exact number held behind it.
  const asked = prescribedWeight(fromWeight, ex, unit, setup)
  const judged = judgeLoadEntry(
    { sets: ex.scheme.sets, reps: ex.scheme.reps, weight: asked },
    entry,
    { direction: rule.direction }
  )

  if (judged.verdict === "advance") {
    // Ratchet from what was actually DONE when that is ahead of what was
    // stored: somebody who put 85 on the bar when 80 was asked for should not
    // be prescribed 82.5 next time. `achieved` is the heaviest weight all the
    // prescribed sets were made at, never a single heavy set on the end.
    const base = down
      ? Math.min(fromWeight, judged.achieved)
      : Math.max(fromWeight, judged.achieved)
    const toWeight = round2(down ? Math.max(0, base - increment) : base + increment)
    const nextAsked = prescribedWeight(toWeight, ex, unit, setup)
    // When the increment is finer than your plates the bar does not move this
    // time; the intent is kept and it moves next session. Saying "+2.5" while
    // the number on screen is unchanged is the app claiming something it did
    // not do.
    const note =
      nextAsked === asked
        ? ` — your plates cannot make that step yet, so it is the same weight again and moves next session`
        : ""
    nextState[ex.id] = { ...prev, workingWeight: toWeight, consecutiveFails: 0 }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: nextAsked === asked ? "hold" : "advance",
      fromWeight: asked,
      toWeight: nextAsked,
      reason: down
        ? `Hit all reps → ${increment}${unitLabel} less help${note}`
        : `Hit all reps → +${increment}${unitLabel}${note}`,
    }
  }

  if (judged.verdict === "hold_lighter") {
    // Every rep, at a weight you chose. That is a decision, not a miss, so it
    // holds and the fail counter is not touched — three of these in a row used
    // to deload a weight that had never been attempted.
    nextState[ex.id] = { ...prev, workingWeight: fromWeight, consecutiveFails: 0 }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: "hold",
      fromWeight,
      toWeight: fromWeight,
      reason: `You did every rep at ${formatLoad(judged.achieved)} ${unitLabel} rather than ${formatLoad(asked)} — kept at ${formatLoad(asked)}.`,
    }
  }

  const fails = (prev.consecutiveFails ?? 0) + 1
  if (fails >= rule.deloadAfterFails) {
    const dropped = down
      ? fromWeight * (1 + rule.deloadPct)
      : fromWeight * (1 - rule.deloadPct)
    const toWeight = roundToLoadable(dropped, unit, loadStyleOf(ex), setup)
    // At the bar with nowhere left to go. Saying "deloaded" when the number did
    // not move is the app telling you it did something it did not do.
    const atFloor = !down && toWeight >= fromWeight
    nextState[ex.id] = { ...prev, workingWeight: toWeight, consecutiveFails: 0, stalled: true }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: atFloor ? "hold" : "deload",
      fromWeight,
      toWeight,
      reason: atFloor
        ? `${fails} misses, but this is already the lightest your bar can be — use a lighter bar, or change the weight yourself.`
        : `${fails} misses → back off ${Math.round(rule.deloadPct * 100)}%${stallIncrement != null ? `, then ${stallIncrement}${unitLabel} a session` : ""}`,
    }
  }

  nextState[ex.id] = { ...prev, workingWeight: fromWeight, consecutiveFails: fails }
  /**
   * SAY WHAT HAPPENED, IN WORDS.
   *
   * This line used to read "Missed reps (1/3)", which was wrong twice over. It
   * said "missed reps" for a session where every rep was made and only the sets
   * ran out, and the "(1/3)" — meant as "the first of three misses before the
   * weight drops" — reads as one rep out of three.
   */
  const askedSets = ex.scheme.sets
  const short =
    judged.shortfall === "sets"
      ? `Only ${judged.setsDone} of ${askedSets} ${askedSets === 1 ? "set" : "sets"}`
      : judged.shortfall === "both"
        ? `Only ${judged.setsDone} of ${askedSets} sets, and short on reps`
        : `Short on reps`
  const left = rule.deloadAfterFails - fails
  const warning =
    left <= 0
      ? ""
      : left === 1
        ? " One more like this and the weight comes down."
        : ` ${left} more like this and the weight comes down.`
  return {
    exerciseId: ex.id,
    name: ex.name,
    kind: "hold",
    fromWeight,
    toWeight: fromWeight,
    reason: `${short} → same weight next time.${warning}`,
  }
}

function progressDouble(
  ex: LoadExercise,
  prev: ExerciseState,
  entry: ProgramSessionLogInput["entries"][number] | undefined,
  unit: UnitSystem,
  nextState: Record<string, ExerciseState>,
  setup?: PlateSetup
): ProgressionChange {
  if (ex.scheme.kind !== "rep_range" || ex.progression.kind !== "double_progression") {
    throw new Error(`progressDouble called on non-rep_range ${ex.id}`)
  }
  const { sets: nSets, repMin, repMax } = ex.scheme
  const rule = ex.progression
  const fromWeight = prev.workingWeight!
  const increment = unit === "kg" ? rule.incrementKg : rule.incrementLb

  // Top of the range on every set, AT THE WEIGHT ASKED FOR. The weight used to
  // be ignored, so a whole session taken lighter still earned the increment on
  // a number that had not been touched.
  const asked = prescribedWeight(fromWeight, ex, unit, setup)
  const top = judgeLoadEntry({ sets: nSets, reps: repMax, weight: asked }, entry)
  const floor = judgeLoadEntry({ sets: nSets, reps: repMin, weight: asked }, entry)

  if (top.verdict === "advance") {
    const base = Math.max(fromWeight, top.achieved)
    const toWeight = round2(base + increment)
    const nextAsked = prescribedWeight(toWeight, ex, unit, setup)
    const note =
      nextAsked === asked
        ? " — your plates cannot make that step yet, so it is the same weight again and moves next session"
        : ""
    nextState[ex.id] = { ...prev, workingWeight: toWeight, consecutiveFails: 0 }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: nextAsked === asked ? "hold" : "advance",
      fromWeight: asked,
      toWeight: nextAsked,
      reason: `Hit ${repMax} on all sets → +${increment}${unit}${note}`,
    }
  }

  // Hit the top of the range, but lighter than asked. Nothing to add to.
  if (top.verdict === "hold_lighter") {
    nextState[ex.id] = { ...prev, workingWeight: fromWeight, consecutiveFails: 0 }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: "hold",
      fromWeight,
      toWeight: fromWeight,
      reason: `You did every rep at ${formatLoad(top.achieved)} ${unit} rather than ${formatLoad(asked)} — kept at ${formatLoad(asked)}.`,
    }
  }

  if (floor.verdict !== "fail" || !rule.deloadAfterFails) {
    nextState[ex.id] = { ...prev, workingWeight: fromWeight, consecutiveFails: 0 }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: "hold",
      fromWeight,
      toWeight: fromWeight,
      reason: `In range → hold ${formatLoad(fromWeight)}${unit}, chase ${repMax}`,
    }
  }

  const fails = (prev.consecutiveFails ?? 0) + 1
  if (fails >= rule.deloadAfterFails) {
    const toWeight = roundToLoadable(fromWeight * (1 - (rule.deloadPct ?? 0.1)), unit, loadStyleOf(ex), setup)
    const atFloor = toWeight >= fromWeight
    nextState[ex.id] = { ...prev, workingWeight: toWeight, consecutiveFails: 0, stalled: true }
    return {
      exerciseId: ex.id,
      name: ex.name,
      kind: atFloor ? "hold" : "deload",
      fromWeight,
      toWeight,
      reason: atFloor
        ? `${fails} sessions under ${repMin}, and this is already as light as your bar goes.`
        : `${fails} sessions under ${repMin} → back off`,
    }
  }
  nextState[ex.id] = { ...prev, workingWeight: fromWeight, consecutiveFails: fails }
  return {
    exerciseId: ex.id,
    name: ex.name,
    kind: "hold",
    fromWeight,
    toWeight: fromWeight,
    reason: `Below ${repMin} (${fails}/${rule.deloadAfterFails})`,
  }
}

function progressPercentage(
  program: ProgramDefinition,
  ex: LoadExercise,
  prev: ExerciseState,
  entry: ProgramSessionLogInput["entries"][number] | undefined,
  week: number,
  unit: UnitSystem,
  nextState: Record<string, ExerciseState>,
  setup?: PlateSetup
): ProgressionChange | null {
  if (ex.scheme.kind !== "percentage_tm" || ex.progression.kind !== "percentage_tm") {
    throw new Error(`progressPercentage called on non-percentage ${ex.id}`)
  }
  if (program.schedule.kind !== "weekly_waved") {
    throw new Error(`percentage_tm requires weekly_waved schedule (${program.id})`)
  }
  const rule = ex.progression
  const fromTM = prev.trainingMax!
  const increment = unit === "kg" ? rule.tmIncrementKg : rule.tmIncrementLb

  /**
   * THE TOP SET IS JUDGED EVERY WEEK, AND BY ITS FLAG.
   *
   * Wendler checks the "+" set in every working week. The engine only looked in
   * week 3, so a blown week-1 or week-2 top set raised the training max as if
   * it had gone fine. And it took "the top set" to mean the LAST logged set,
   * which stops being true the moment somebody adds a back-off set or a set
   * beyond the prescription — a 1+ judged against a 60% back-off single reads
   * as a miss and cuts the max ten per cent. The prescription says which set is
   * the AMRAP; that is the one that counts.
   */
  const weekSpec = ex.scheme.setsByWeek[week]
  const amrapIndex = weekSpec?.findIndex((set) => set.amrap) ?? -1
  const topSpec = amrapIndex >= 0 ? weekSpec![amrapIndex] : undefined
  const logged = entry?.sets.find((set) => set.setNumber === amrapIndex + 1)
  const missedThisWeek = topSpec && logged ? logged.reps < topSpec.reps : false
  const missedTopSet = prev.missedTopSet === true || missedThisWeek

  /**
   * THE MAX MOVES WHEN THE CYCLE IS OVER, NOT BEFORE THE DELOAD.
   *
   * It used to bump at the end of week 3, so week 4 — the deload, whose whole
   * job is to be light — was computed from the already-raised number. Wendler
   * deloads off the max you just finished the cycle with. Holding the change
   * until the final week is logged also means a miss anywhere in the wave is
   * still in hand when the decision is made.
   */
  if (week !== program.schedule.weeks) {
    // Nothing changes yet, but a miss has to be remembered until it does.
    if (missedTopSet !== (prev.missedTopSet === true)) {
      nextState[ex.id] = { ...prev, missedTopSet }
    }
    return null
  }

  if (missedTopSet && rule.missTmReductionPct != null) {
    const toTM = roundToLoadable(fromTM * (1 - rule.missTmReductionPct), unit, loadStyleOf(ex), setup)
    nextState[ex.id] = { trainingMax: toTM, missedTopSet: false }
    return { exerciseId: ex.id, name: ex.name, kind: "tm_reset", fromWeight: fromTM, toWeight: toTM, reason: `Missed a top set this cycle → training max −${Math.round(rule.missTmReductionPct * 100)}%` }
  }

  const toTM = roundToLoadable(fromTM + increment, unit, loadStyleOf(ex), setup)
  nextState[ex.id] = { trainingMax: toTM, missedTopSet: false }
  return { exerciseId: ex.id, name: ex.name, kind: "tm_increase", fromWeight: fromTM, toWeight: toTM, reason: `Cycle complete → training max +${increment}${unit}` }
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
    /**
     * WHAT THE SESSION ASKS FOR IS NOT THE UNLOCK THRESHOLD.
     *
     * Every set used to be seeded with `unlockReps`, so pressing "I did this"
     * cleared the bar by definition and promoted you to a harder variation on
     * every single session, whatever you had actually managed. The routine this
     * cites works in a range and moves on at the top of it: the ask is the
     * bottom, the unlock is the top, and they are different numbers.
     */
    const reps = tier.workReps ?? tier.unlockReps
    const sets = Array.from({ length: tier.sets }, (_, i) => ({
      setNumber: i + 1,
      reps,
      repRangeMax: tier.workReps != null ? tier.unlockReps : undefined,
      amrap: false,
      weight: 0,
      weightKg: 0,
    }))
    return {
      exerciseId: ex.id,
      name: ex.name,
      sets,
      note: top ? `${tier.name} — top tier` : `${tier.name} — ${tier.unlockReps}+ on every set unlocks the next one`,
      bodyweight: true,
      repUnit: "reps" as const,
    }
  })
  return { programId: program.id, dayId: day.id, dayLabel: day.label, cycle: enrollment.cursor.cycle, week: enrollment.cursor.week, sessionCount: enrollment.cursor.sessionCount, periodised: false, exercises }
}

function applySkillLog(program: ProgramDefinition, enrollment: ProgramEnrollment, log: ProgramSessionLogInput): ApplyLogResult {
  if (program.schedule.kind !== "skill_routine") throw new Error(`${program.id} is not skill_routine`)
  // The day that was actually done, not the one the cursor happened to be on.
  const loggedIndex = dayIndexOf(program, log.dayId)
  const dayIndex = loggedIndex >= 0 ? loggedIndex : enrollment.cursor.dayIndex
  const day = program.schedule.days[dayIndex] ?? program.schedule.days[0]
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
  return {
    enrollment: {
      ...enrollment,
      exerciseState: nextState,
      cursor: advanceCursor(program, { ...enrollment.cursor, dayIndex }),
    },
    changes,
  }
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
  // The day that was actually done, not the one the cursor happened to be on.
  const loggedIndex = dayIndexOf(program, log.dayId)
  const dayIndex = loggedIndex >= 0 ? loggedIndex : enrollment.cursor.dayIndex
  const day = program.schedule.days[dayIndex] ?? program.schedule.days[0]
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
  return {
    enrollment: {
      ...enrollment,
      exerciseState: nextState,
      cursor: advanceCursor(program, { ...enrollment.cursor, dayIndex }),
    },
    changes,
  }
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
// One record, read as a session
// ---------------------------------------------------------------------------

/**
 * The engine's view of a workout, DERIVED from the rows that were stored.
 *
 * THERE USED TO BE TWO COPIES OF EVERY SESSION. `program_session_logs.entries`
 * held what the engine replayed from, and `workout_sets` held what the
 * dashboard, the calendar, the personal records and the export read — with
 * nothing joining them. Deleting a session left its twin behind; editing one
 * reached neither. Now there is one set of rows and this is how the engine
 * reads them, so the two can no longer disagree: there is nothing to disagree
 * with.
 *
 * Warm-ups and drop sets are excluded, because they are not what the
 * progression rule is about — a warm-up counted as a working set reads as a
 * collapse. Weights are converted out of the stored kilograms into whatever
 * unit the enrollment is in.
 */
export function entriesFromSets(
  sets: StoredSet[],
  adjustments: WorkoutAdjustments | null | undefined,
  unit: UnitSystem
): LoggedExercise[] {
  const byExercise = new Map<string, LoggedSet[]>()
  for (const row of sets) {
    // The progression rule is about work sets. `backoff` counts: it is work,
    // just lighter, and the judge compares weights anyway.
    if (row.set_kind !== "working" && row.set_kind !== "amrap" && row.set_kind !== "backoff") continue
    const key = row.exercise_id ?? row.exercise
    const list = byExercise.get(key) ?? []
    list.push({
      setNumber: row.set_number,
      reps: row.reps,
      weight: round2(fromKg(row.weight_kg, unit)),
      ...(row.side ? { side: row.side as "left" | "right" } : {}),
    })
    byExercise.set(key, list)
  }

  const entries: LoggedExercise[] = []
  for (const [exerciseId, list] of byExercise) {
    /**
     * A SET DONE ON BOTH SIDES IS ONE SET.
     *
     * A unilateral lift stores a row per side with the same set number. The
     * engine asks "did you make the set", and you made it only if both sides
     * did — so the harder of the two is the answer, and counting them as two
     * sets would tell a three-set lift it had done six.
     */
    const merged = new Map<number, LoggedSet>()
    for (const set of list) {
      const seen = merged.get(set.setNumber)
      if (!seen) merged.set(set.setNumber, { setNumber: set.setNumber, reps: set.reps, weight: set.weight })
      else
        merged.set(set.setNumber, {
          setNumber: set.setNumber,
          reps: Math.min(seen.reps, set.reps),
          weight: Math.min(seen.weight, set.weight),
        })
    }
    entries.push({
      exerciseId,
      sets: [...merged.values()].sort((a, b) => a.setNumber - b.setNumber),
    })
  }

  /**
   * "DON'T COUNT IT" HAS TO COUNT FOR SOMETHING.
   *
   * This only marked a lift skipped when it had NO rows at all, so the button on
   * the finish sheet — offered precisely for a lift that was started and cut
   * short — did nothing. Two of three squat sets, tapped "Don't count it": the
   * warning row disappeared, the person believed it was handled, and the engine
   * still scored a miss and moved a step towards a 10% deload off a weight that
   * was never failed. That is the exact bug the comment above `applyLog` was
   * written to kill, reintroduced by the screen above it.
   *
   * The sets stay on the entry: they were done, and they belong in the volume,
   * the history and any record they set. Only the JUDGEMENT is withheld.
   */
  const held = new Set([...(adjustments?.skipped ?? []), ...(adjustments?.incomplete ?? [])])
  for (const entry of entries) {
    if (held.has(entry.exerciseId)) entry.skipped = true
  }
  for (const exerciseId of held) {
    if (!byExercise.has(exerciseId)) entries.push({ exerciseId, sets: [], skipped: true })
  }
  return entries
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

  const side = exercise.perSide ? " each side" : ""
  if (uniform) {
    const head = `${sets.length} × ${repsOf(sets[0])} ${unit}${side}`
    return bodyweight ? head : `${head} @ ${weightOf(sets[0])}`
  }
  return (
    sets.map((s) => (bodyweight ? repsOf(s) : `${weightOf(s)} × ${repsOf(s)}`)).join(", ") + side
  )
}

/**
 * What each lift did the LAST time it came round, set by set.
 *
 * `lastTimePerLift` already existed and returns one summary line per lift —
 * enough to read, not enough to pre-fill a row with. The live screen needs the
 * individual sets, because "what did I get on set three last week" is the
 * question being answered while the number is typed.
 */
export function lastSetsPerLift(
  logs: { logged_at: string; entries: LoggedExercise[] }[]
): Record<string, { weight: number; reps: number }[]> {
  const out: Record<string, { weight: number; reps: number }[]> = {}
  // Newest first, and the first one seen for a lift is its last session.
  for (const log of [...logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at))) {
    for (const entry of log.entries) {
      if (entry.skipped || entry.sets.length === 0 || out[entry.exerciseId]) continue
      out[entry.exerciseId] = [...entry.sets]
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((s) => ({ weight: s.weight, reps: s.reps }))
    }
  }
  return out
}

/**
 * Whether a lift has to be opened before it can be logged honestly.
 *
 * An AMRAP set has no prescribed answer — the whole point is how many you got —
 * so "log it as prescribed" would quietly record the floor of the range as your
 * result and progress you off a number you never lifted.
 */
export function needsInput(exercise: PrescribedExercise): boolean {
  // A REP RANGE HAS NO PRESCRIBED ANSWER EITHER. "6–8" was seeded as 6, so the
  // one-tap save recorded the bottom of every range — and the rule for adding
  // weight is hitting the TOP on every set. On the three programs built out of
  // rep ranges the weight could therefore never move, however well the session
  // had gone, unless you opened each lift and typed the top number by hand.
  return exercise.sets.some((s) => s.amrap || s.repRangeMax != null)
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
export function platesFor(target: number, unit: UnitSystem, setup?: PlateSetup): PlateLoad {
  const barWeight = setup?.barWeight ?? DEFAULT_PLATES[unit].barWeight
  if (target <= barWeight) {
    return { perSide: [], achievable: barWeight, approximate: target < barWeight, barOnly: true }
  }

  let remainingPerSide = (target - barWeight) / 2
  const perSide: number[] = []
  // Only plates this gym has: a 1.25 kg plate in the list when the person owns
  // nothing under 2.5 would show a load they cannot make.
  const smallest = setup?.smallestPlate ?? DEFAULT_PLATES[unit].smallestPlate
  for (const plate of PLATES[unit].filter((p) => p >= smallest - 1e-9)) {
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
  logs: { entries: LoggedExercise[]; logged_at: string; dayId: string; cycle: number; week: number }[],
  events: ReplayEvent[] = []
): ProgramEnrollment {
  /**
   * EVERYTHING THAT CHANGED THE STATE, IN THE ORDER IT HAPPENED.
   *
   * Sessions used to be the whole history, and they are not: skipping a session
   * advances the plan without logging anything, a reset rewinds the cursor on
   * purpose, and a manual weight change is the lifter overruling the engine.
   * None of the three were replayed, so deleting one session re-prescribed
   * every session that had been skipped and quietly undid a reset.
   */
  const timeline: Array<
    | { at: string; kind: "log"; log: (typeof logs)[number] }
    | { at: string; kind: "event"; event: ReplayEvent }
  > = [
    ...logs.map((log) => ({ at: log.logged_at, kind: "log" as const, log })),
    ...events.map((event) => ({ at: event.at, kind: "event" as const, event })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  let state: ProgramEnrollment = {
    ...seed,
    cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
  }

  for (const step of timeline) {
    if (step.kind === "log") {
      state = applyLog(program, state, {
        enrollment_id: seed.id,
        dayId: step.log.dayId,
        cycle: step.log.cycle,
        week: step.log.week,
        entries: step.log.entries,
      }).enrollment
      continue
    }
    const event = step.event
    if (event.kind === "skip") {
      // The same call the skip endpoint makes: no entries, so every lift holds
      // and only the cursor moves.
      state = applyLog(program, state, {
        enrollment_id: seed.id,
        dayId: "",
        cycle: state.cursor.cycle,
        week: state.cursor.week,
        entries: [],
      }).enrollment
    } else if (event.kind === "reset") {
      // Rewinds the plan and KEEPS the weights — exactly what the button does.
      state = { ...state, cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 } }
    } else {
      // The lifter set the weight themselves. It survives a later correction,
      // and it clears the fail counter: they have decided the number is right.
      const prev = state.exerciseState[event.exerciseId]
      if (prev) {
        state = {
          ...state,
          exerciseState: {
            ...state.exerciseState,
            [event.exerciseId]: { ...prev, workingWeight: event.to, consecutiveFails: 0 },
          },
        }
      }
    }
  }
  return state
}
