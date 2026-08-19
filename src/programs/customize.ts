/**
 * Editing a program you picked, without forking the catalog.
 *
 * WHY COPY-ON-WRITE AND NOT A DIFF. An enrollment's `customSchedule` is null
 * until the first edit, so anyone who took StrongLifts as written keeps picking
 * up catalog corrections. The first edit snapshots the WHOLE resolved schedule
 * and the user owns it from then on. The alternative — storing a patch keyed by
 * catalog day/exercise ids — has to decide what a patch means when the catalog
 * renames or retires an id, and every answer to that is a guess made silently
 * at read time. CLAUDE.md forbids the silent fallback, and a training program
 * that quietly changes what it prescribes is exactly the bug that rule exists
 * for.
 *
 * WHY THE ENGINE DID NOT CHANGE. Every function in programsService takes a
 * `ProgramDefinition` as its first argument and reads `program.schedule`.
 * `effectiveProgram` returns that same definition with the user's schedule
 * swapped in, so the whole progression engine runs on the edited version
 * without knowing customization exists. The resolution happens once, at the
 * repo boundary.
 *
 * WHAT CANNOT BE EDITED. Endurance plans (Couch-to-5K, the triathlon builds)
 * are week-by-week prescriptions where week 6 only means something because
 * weeks 1–5 happened. There is no coherent "swap an exercise" on them, so
 * `isCustomizable` says no and the editor says so out loud rather than
 * offering controls that would produce a broken plan.
 */

import type {
  DayTemplate,
  ExerciseState,
  HoldDay,
  HoldExercise,
  LevelId,
  LibraryExercise,
  LoadExercise,
  ProgramDefinition,
  ProgramSchedule,
  SkillDay,
  SkillExercise,
  UnitSystem,
} from "./types"
import { fromKg, roundToLoadable } from "./programsService"
import { LIBRARY_BY_ID } from "./data/exerciseLibrary"

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** Endurance plans are week-prescribed; everything else is days-of-exercises. */
export function isCustomizable(program: ProgramDefinition): boolean {
  return program.schedule.kind !== "endurance_weeks"
}

/** The program the engine should actually run for this enrollment. */
export function effectiveProgram(
  program: ProgramDefinition,
  customSchedule: ProgramSchedule | null | undefined
): ProgramDefinition {
  if (!customSchedule) return program
  if (customSchedule.kind !== program.schedule.kind) {
    throw new Error(
      `Custom schedule for ${program.id} is ${customSchedule.kind}, but the program is ${program.schedule.kind}`
    )
  }
  return { ...program, schedule: customSchedule }
}

/** A deep, independent copy of the program's schedule — the copy-on-write snapshot. */
export function materializeSchedule(program: ProgramDefinition): ProgramSchedule {
  if (!isCustomizable(program)) {
    throw new Error(`${program.id} is an endurance plan and cannot be customized`)
  }
  return structuredClone(program.schedule)
}

/**
 * The schedule to edit: the user's copy if they have one, otherwise a fresh
 * snapshot. Callers pass the result back to the edit functions below.
 */
export function editableSchedule(
  program: ProgramDefinition,
  customSchedule: ProgramSchedule | null | undefined
): ProgramSchedule {
  return customSchedule ? structuredClone(customSchedule) : materializeSchedule(program)
}

/**
 * What is wrong with this schedule, in words the user can act on.
 *
 * `addDay` deliberately creates an EMPTY day — you name it, then put lifts in
 * it — so a schedule mid-edit is routinely not startable. That is fine while
 * editing and not fine to save: an empty day prescribes a session with no
 * exercises, which advances the cursor, writes an empty log and tells somebody
 * they trained. The wire schema refuses it too (`.min(1)` on a day's
 * exercises), so this is the readable half of a rule enforced in both places
 * rather than the only thing standing in the way.
 *
 * Returns an empty array when the schedule is good to go.
 */
export function scheduleProblems(schedule: ProgramSchedule): string[] {
  if (schedule.kind === "endurance_weeks") return []
  const problems: string[] = []
  for (const day of schedule.days) {
    if (day.exercises.length === 0) problems.push(`${day.label} has no exercises in it yet.`)
  }
  return problems
}

/** True when the schedule differs from the catalog — i.e. worth persisting. */
export function isModified(program: ProgramDefinition, schedule: ProgramSchedule): boolean {
  return JSON.stringify(schedule) !== JSON.stringify(program.schedule)
}

// ---------------------------------------------------------------------------
// Reading days, whatever the schedule kind
// ---------------------------------------------------------------------------

export type AnyDay = DayTemplate | SkillDay | HoldDay
export type AnyExercise = LoadExercise | SkillExercise | HoldExercise

/** The day list, for any customizable schedule kind. Throws on endurance. */
export function scheduleDays(schedule: ProgramSchedule): AnyDay[] {
  if (schedule.kind === "endurance_weeks") {
    throw new Error("Endurance plans have weeks, not days")
  }
  return schedule.days
}

/** Rebuild a schedule of the same kind around a new day list. */
function withDays(schedule: ProgramSchedule, days: AnyDay[]): ProgramSchedule {
  switch (schedule.kind) {
    case "linear_rotation":
      return { kind: "linear_rotation", days: days as DayTemplate[] }
    case "weekly_waved":
      return { kind: "weekly_waved", weeks: schedule.weeks, days: days as DayTemplate[] }
    case "skill_routine":
      return { kind: "skill_routine", days: days as SkillDay[] }
    case "hold_routine":
      return { kind: "hold_routine", days: days as HoldDay[] }
    case "endurance_weeks":
      throw new Error("Endurance plans cannot be customized")
  }
}

/**
 * A day/exercise id that will not collide with the catalog's.
 *
 * Deterministic rather than random: the same schedule edited the same way
 * produces the same ids, so a test can assert on them and a double-submit
 * cannot produce two differently-named copies of one lift. The counter walks
 * until it finds a free slot, so removing and re-adding never resurrects an id
 * that a logged session still refers to within the same schedule.
 */
function freshId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}_${n}`)) n++
  return `${base}_${n}`
}

function allExerciseIds(schedule: ProgramSchedule): Set<string> {
  const ids = new Set<string>()
  for (const day of scheduleDays(schedule)) for (const ex of day.exercises) ids.add(ex.id)
  return ids
}

function allDayIds(schedule: ProgramSchedule): Set<string> {
  return new Set(scheduleDays(schedule).map((d) => d.id))
}

// ---------------------------------------------------------------------------
// Day operations
// ---------------------------------------------------------------------------

export function renameDay(schedule: ProgramSchedule, dayId: string, label: string): ProgramSchedule {
  const trimmed = label.trim()
  if (!trimmed) throw new Error("A training day needs a name")
  return withDays(
    schedule,
    scheduleDays(schedule).map((d) => (d.id === dayId ? { ...d, label: trimmed } : d))
  )
}

export function moveDay(schedule: ProgramSchedule, index: number, dir: -1 | 1): ProgramSchedule {
  const days = [...scheduleDays(schedule)]
  const target = index + dir
  if (index < 0 || index >= days.length || target < 0 || target >= days.length) return schedule
  ;[days[index], days[target]] = [days[target], days[index]]
  return withDays(schedule, days)
}

/** Add an empty training day. Exercises are added to it separately. */
export function addDay(schedule: ProgramSchedule, label: string): ProgramSchedule {
  const trimmed = label.trim()
  if (!trimmed) throw new Error("A training day needs a name")
  const days = scheduleDays(schedule)
  const id = freshId(
    `custom_${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "day"}`,
    allDayIds(schedule)
  )
  return withDays(schedule, [...days, { id, label: trimmed, exercises: [] } as AnyDay])
}

/**
 * Remove a training day. The last day cannot go — a program with no days has
 * nothing to prescribe, and the cursor would have nowhere to point.
 */
export function removeDay(schedule: ProgramSchedule, dayId: string): ProgramSchedule {
  const days = scheduleDays(schedule)
  if (days.length <= 1) throw new Error("A program needs at least one training day")
  return withDays(schedule, days.filter((d) => d.id !== dayId))
}

// ---------------------------------------------------------------------------
// Exercise operations
// ---------------------------------------------------------------------------

function mapDay(schedule: ProgramSchedule, dayId: string, fn: (day: AnyDay) => AnyDay): ProgramSchedule {
  const days = scheduleDays(schedule)
  if (!days.some((d) => d.id === dayId)) throw new Error(`No day ${dayId} in this program`)
  return withDays(schedule, days.map((d) => (d.id === dayId ? fn(d) : d)))
}

/**
 * Build a LoadExercise from a library entry.
 *
 * Compounds get linear loading (add weight every session while it works, deload
 * after three misses — the StrongLifts/Starting Strength rule), accessories get
 * double progression (chase the top of the rep range, then add weight). Those
 * are the two rules the engine already implements, and the increments match the
 * catalog's own: 2.5 kg / 5 lb.
 */
export function loadExerciseFromLibrary(entry: LibraryExercise, exerciseId: string): LoadExercise {
  const loadStyle = entry.barbell ? ("barbell" as const) : ("free" as const)
  return entry.compound
    ? {
        id: exerciseId,
        name: entry.name,
        metricType: "load",
        loadStyle,
        scheme: { kind: "linear", sets: entry.defaultSets, reps: entry.defaultRepMin },
        progression: {
          kind: "linear_load",
          incrementKg: 2.5,
          incrementLb: 5,
          deloadAfterFails: 3,
          deloadPct: 0.1,
        },
      }
    : {
        id: exerciseId,
        name: entry.name,
        metricType: "load",
        loadStyle,
        scheme: {
          kind: "rep_range",
          sets: entry.defaultSets,
          repMin: entry.defaultRepMin,
          repMax: entry.defaultRepMax,
        },
        progression: { kind: "double_progression", incrementKg: 2.5, incrementLb: 5 },
      }
}

/** Add a library movement to a load day. */
export function addExercise(
  schedule: ProgramSchedule,
  dayId: string,
  entry: LibraryExercise
): { schedule: ProgramSchedule; exerciseId: string } {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") {
    throw new Error("Only load programs take exercises from the library")
  }
  const exerciseId = freshId(entry.id, allExerciseIds(schedule))
  const exercise = loadExerciseFromLibrary(entry, exerciseId)
  const next = mapDay(schedule, dayId, (d) => ({ ...d, exercises: [...(d.exercises as LoadExercise[]), exercise] }))
  return { schedule: next, exerciseId }
}

/**
 * Swap one exercise for another, keeping its position in the day.
 *
 * The old exercise's SCHEME IS NOT KEPT. A swap changes what the lift is, and
 * carrying 5×5 over onto a Lateral Raise, or a percentage-of-training-max wave
 * onto a Face Pull, prescribes something nobody should do. The replacement
 * arrives with its own sensible prescription, which the user can then edit.
 */
export function swapExercise(
  schedule: ProgramSchedule,
  dayId: string,
  exerciseId: string,
  entry: LibraryExercise
): { schedule: ProgramSchedule; exerciseId: string } {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") {
    throw new Error("Only load programs can swap exercises")
  }
  const taken = allExerciseIds(schedule)
  taken.delete(exerciseId)
  const newId = freshId(entry.id, taken)
  const replacement = loadExerciseFromLibrary(entry, newId)
  const next = mapDay(schedule, dayId, (d) => ({
    ...d,
    exercises: (d.exercises as LoadExercise[]).map((e) => (e.id === exerciseId ? replacement : e)),
  }))
  return { schedule: next, exerciseId: newId }
}

export function removeExercise(schedule: ProgramSchedule, dayId: string, exerciseId: string): ProgramSchedule {
  return mapDay(schedule, dayId, (d) => {
    if (d.exercises.length <= 1) throw new Error("A training day needs at least one exercise")
    return { ...d, exercises: (d.exercises as AnyExercise[]).filter((e) => e.id !== exerciseId) } as AnyDay
  })
}

export function moveExercise(
  schedule: ProgramSchedule,
  dayId: string,
  index: number,
  dir: -1 | 1
): ProgramSchedule {
  return mapDay(schedule, dayId, (d) => {
    const list = [...(d.exercises as AnyExercise[])]
    const target = index + dir
    if (index < 0 || index >= list.length || target < 0 || target >= list.length) return d
    ;[list[index], list[target]] = [list[target], list[index]]
    return { ...d, exercises: list } as AnyDay
  })
}

/**
 * Change sets and reps on a load exercise.
 *
 * Percentage-of-training-max exercises (5/3/1's main lifts) are refused: their
 * sets ARE the program — the 65/75/85 wave is the thing Wendler wrote — and a
 * per-week set table is not something a sets/reps box can express. The editor
 * shows them as fixed and says why.
 */
export function updateExerciseScheme(
  schedule: ProgramSchedule,
  dayId: string,
  exerciseId: string,
  patch: { sets?: number; reps?: number; repMin?: number; repMax?: number }
): ProgramSchedule {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") {
    throw new Error("Only load programs have editable sets and reps")
  }
  return mapDay(schedule, dayId, (d) => ({
    ...d,
    exercises: (d.exercises as LoadExercise[]).map((e): LoadExercise => {
      if (e.id !== exerciseId) return e
      if (e.scheme.kind === "percentage_tm") {
        throw new Error(`${e.name} follows a percentage wave; its sets are part of the program`)
      }
      if (e.scheme.kind === "linear") {
        const sets = patch.sets ?? e.scheme.sets
        const reps = patch.reps ?? e.scheme.reps
        assertPositive(sets, "Sets")
        assertPositive(reps, "Reps")
        return { ...e, scheme: { kind: "linear", sets, reps } }
      }
      const sets = patch.sets ?? e.scheme.sets
      const repMin = patch.repMin ?? e.scheme.repMin
      const repMax = patch.repMax ?? e.scheme.repMax
      assertPositive(sets, "Sets")
      assertPositive(repMin, "Bottom of the rep range")
      assertPositive(repMax, "Top of the rep range")
      if (repMax < repMin) throw new Error("The top of the rep range cannot be below the bottom")
      return { ...e, scheme: { kind: "rep_range", sets, repMin, repMax } }
    }),
  }))
}

function assertPositive(n: number, what: string): void {
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    throw new Error(`${what} must be a whole number of at least 1`)
  }
}

// ---------------------------------------------------------------------------
// Enrolling an edited program
// ---------------------------------------------------------------------------

/**
 * Exercises in the edited schedule that the level's seed table has no weight
 * for — every lift the user added or swapped in.
 *
 * `seedEnrollment` throws rather than guessing a starting weight, which is
 * correct and also means the editor has to collect one. This is the list it
 * asks about, with the library's suggestion prefilled in the user's unit.
 */
export function missingWorkingWeights(
  program: ProgramDefinition,
  schedule: ProgramSchedule,
  level: LevelId,
  unit: UnitSystem
): Array<{ exerciseId: string; name: string; suggested: number }> {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return []
  const seeds = program.levels.find((l) => l.id === level)?.seedWorkingWeightKg ?? {}
  const out: Array<{ exerciseId: string; name: string; suggested: number }> = []
  const seen = new Set<string>()
  for (const day of schedule.days) {
    for (const ex of day.exercises) {
      if (seen.has(ex.id)) continue
      seen.add(ex.id)
      if (ex.progression.kind === "percentage_tm") continue // asks for a 1RM instead
      if (seeds[ex.id] != null) continue
      out.push({
        exerciseId: ex.id,
        name: ex.name,
        suggested: suggestedStartKg(ex, level, unit),
      })
    }
  }
  return out
}

/**
 * A starting weight to SHOW for a lift the catalog never seeded.
 *
 * Comes from the library entry the exercise id was minted from — `addExercise`
 * and `swapExercise` both derive the id from the library id, so stripping the
 * disambiguating suffix finds it again. A lift with no library entry gets 0,
 * which the editor renders as an empty box the user has to fill: still no
 * guessed number reaching the engine.
 */
function suggestedStartKg(ex: LoadExercise, level: LevelId, unit: UnitSystem): number {
  const base = ex.id.replace(/_\d+$/, "")
  const entry = LIBRARY_BY_ID.get(base)
  if (!entry) return 0
  return roundToLoadable(fromKg(entry.suggestedKg[level], unit), unit, ex.loadStyle)
}

/**
 * Exercise state for lifts that exist in the edited schedule but not in the
 * enrollment — i.e. what an ALREADY ENROLLED user's edit needs seeding.
 *
 * Editing mid-program must not disturb the lifts that are still there: their
 * working weights, training maxes and fail counts carry over untouched. Only
 * the new ones get state, and only from a weight the user supplied.
 */
export function seedForAddedExercises(
  schedule: ProgramSchedule,
  existing: Record<string, ExerciseState>,
  workingWeights: Record<string, number>,
  unit: UnitSystem
): Record<string, ExerciseState> {
  const next: Record<string, ExerciseState> = { ...existing }
  if (schedule.kind === "skill_routine") {
    for (const d of schedule.days) for (const ex of d.exercises) if (!next[ex.id]) next[ex.id] = { tierIndex: 0 }
    return next
  }
  if (schedule.kind === "hold_routine") {
    for (const d of schedule.days) {
      for (const ex of d.exercises) if (!next[ex.id]) next[ex.id] = { currentHoldSec: ex.startSec }
    }
    return next
  }
  if (schedule.kind === "endurance_weeks") return next
  for (const d of schedule.days) {
    for (const ex of d.exercises) {
      if (next[ex.id]) continue
      const supplied = workingWeights[ex.id]
      // 0 is a real answer (bodyweight), so "missing" is absent-or-negative
      // rather than falsy. `roundToLoadable` then floors a barbell lift at the
      // bar and leaves a free-weight one at nothing.
      if (supplied == null || !Number.isFinite(supplied) || supplied < 0) {
        throw new Error(`${ex.name} was added to the program but has no starting weight`)
      }
      next[ex.id] = { workingWeight: roundToLoadable(supplied, unit, ex.loadStyle), consecutiveFails: 0 }
    }
  }
  return next
}

/**
 * Keep the cursor pointing at a real day after an edit.
 *
 * Removing the day the cursor sat on, or reordering days, must not leave the
 * next session pointing past the end of the list — `dayAt` throws on an index
 * that does not exist, which would lock the user out of their own program.
 */
export function clampCursorDay(schedule: ProgramSchedule, dayIndex: number): number {
  if (schedule.kind === "endurance_weeks") return dayIndex
  if (schedule.days.length === 0) return 0
  return Math.min(Math.max(dayIndex, 0), schedule.days.length - 1)
}
