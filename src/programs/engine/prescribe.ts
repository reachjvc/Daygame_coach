/**
 * WHAT A DAY ASKS FOR — a program in the new format, read for one week.
 *
 * Plans/program-builder.md, Phase 2.2. Set groups in order, week changes
 * applied, every load source resolved against the lift's numbers, effort
 * targets on the sets they belong to, and every weight rounded to something
 * the gym can load.
 *
 * The output is the shape every screen already reads (`SessionPrescription`),
 * with the new format's extras as optional fields: a converted built-in fills
 * exactly the fields it always filled, which is what golden equivalence
 * checks, and a program that uses a range of sets or a back-off from today's
 * top set fills the rest.
 *
 * PURE. No clock, no database: the caller says which day, which week, and
 * what the gym can load.
 */

import { fromKg, toKg, loadStyleOf } from "../programsService"
import { libraryExercise } from "../data/exerciseLibrary"
import type {
  EnrollmentCursor,
  ExerciseState,
  PlateSetup,
  PrescribedExercise,
  PrescribedGroup,
  PrescribedSet,
  SessionPrescription,
} from "../types"
import type {
  Increment,
  LiftRef,
  LoadSpec,
  LoadStyle,
  NumberOrRange,
  ProgramSpec,
  SetGroup,
  SetReps,
  SlotSpec,
  UnitSystem,
} from "../spec/types"
import { stateKeyOf } from "../spec/schema"
import { weekSetHas } from "../spec/weeks"
import { place, type Clock, type Placement } from "./calendar"
import { roundLoad, roundingContext, type RoundingContext } from "./rounding"
import { weightForEffort } from "./e1rm"

/** What the engine needs to know about an enrollment. A `ProgramEnrollment` is one. */
export interface EngineEnrollment {
  id: string
  unitSystem: UnitSystem
  exerciseState: Record<string, ExerciseState>
  cursor: EnrollmentCursor
  plates?: PlateSetup
  /** The program's first day on the account's calendar, `YYYY-MM-DD`. */
  startedOn?: string
}

export interface PrescribeOptions {
  /** The catalogue id the prescription is filed under. */
  programId: string
  /** Force a day (the person picked one). */
  dayIndex?: number
  clock?: Clock
  /**
   * Starting weights for lifts added to a program after somebody started it,
   * in the enrollment's unit — the catalogue level's seeds. A lift with no
   * state and none here is an error that names it.
   */
  fallbackWorking?: Record<string, number>
}

// ---------------------------------------------------------------------------
// Lifts
// ---------------------------------------------------------------------------

/** The name a lift is shown and logged under. */
export function liftName(ref: LiftRef): string {
  if ("lib" in ref) return ref.name ?? libraryExercise(ref.lib)?.name ?? ref.lib
  return ref.name
}

/** How a lift is loaded: what the author said, else what the library knows, else a barbell. */
export function liftLoadStyle(ref: LiftRef): LoadStyle {
  if ("lib" in ref) {
    const entry = libraryExercise(ref.lib)
    if (entry) return entry.barbell ? "barbell" : "free"
    return loadStyleOf({ name: liftName(ref) })
  }
  return loadStyleOf({ name: ref.name, loadStyle: ref.loadStyle })
}

/** The rung of a ladder a lift is on, clamped to the top. */
export function ladderRung(slot: SlotSpec, state: ExerciseState | undefined): number {
  if (slot.progression.kind !== "ladder") return 0
  return Math.min(state?.tierIndex ?? 0, slot.progression.lifts.length - 1)
}

// ---------------------------------------------------------------------------
// The week's version of a lift
// ---------------------------------------------------------------------------

/**
 * The set groups this lift does in `week`: its stage's sets when it is on a
 * `stages` rule, every week change for that week laid over them in order,
 * and the extra sets an `add-set-per-week` rule has reached.
 */
export function groupsForWeek(slot: SlotSpec, week: number, state: ExerciseState | undefined): SetGroup[] {
  const rule = slot.progression
  let groups: SetGroup[] =
    rule.kind === "stages" ? rule.stages[Math.min(state?.stage ?? 0, rule.stages.length - 1)] : slot.sets
  groups = groups.flatMap((g) => {
    let out: SetGroup = g
    for (const w of slot.weeks ?? []) {
      if (w.set !== g.id || !weekSetHas(w.weeks, week)) continue
      if (w.skip) return []
      const changes: Partial<SetGroup> = { ...w }
      delete (changes as Partial<typeof w>).weeks
      delete (changes as Partial<typeof w>).set
      delete (changes as Partial<typeof w>).skip
      out = { ...out, ...changes }
    }
    return [out]
  })
  if (rule.kind === "add-set-per-week") {
    groups = groups.map((g) => {
      if (rule.group ? g.id !== rule.group : g.kind === "warmup") return g
      const base = typeof g.count === "number" ? g.count : g.count.min
      const count = Math.min(rule.maxSets, base + Math.max(0, week - 1))
      return { ...g, count, ...(g.perSet ? { perSet: undefined } : {}) }
    })
  }
  return groups
}

const lo = (n: NumberOrRange) => (typeof n === "number" ? n : n.min)
const hi = (n: NumberOrRange) => (typeof n === "number" ? n : n.max)
const round2 = (n: number) => Math.round(n * 100) / 100
const incIn = (inc: Increment | undefined, unit: UnitSystem) => (inc ? (unit === "kg" ? inc.kg : inc.lb) : 0)

/** One row's rep target, in the old prescription's terms. */
function repsOf(reps: SetReps): Pick<PrescribedSet, "reps" | "repRangeMax" | "amrap" | "seconds" | "total"> {
  if (typeof reps === "number") return { reps, amrap: false }
  if ("atLeast" in reps) return { reps: reps.atLeast, amrap: true }
  if ("seconds" in reps) {
    const s = reps.seconds
    return typeof s === "number" ? { reps: s, amrap: false, seconds: true } : { reps: s.min, repRangeMax: s.max, amrap: false, seconds: true }
  }
  if ("total" in reps) return { reps: reps.total, amrap: false, total: true }
  return { reps: reps.min, repRangeMax: reps.max, amrap: false }
}

/** A max of the kind a load asks for, from a lift's state. */
export function maxValue(state: ExerciseState | undefined, kind: "1rm" | "tm" | "rm"): number | undefined {
  if (!state) return undefined
  return kind === "tm" ? state.trainingMax : kind === "1rm" ? state.oneRepMax : state.repMax
}

interface SlotContext {
  slot: SlotSpec
  key: string
  state: ExerciseState
  states: Record<string, ExerciseState>
  unit: UnitSystem
  style: LoadStyle
  ctx: RoundingContext
}

/** The weight (or range, or "worked out later", or "picked") for one row. */
function loadOf(
  load: LoadSpec,
  pctOverride: number | undefined,
  c: SlotContext,
  row: Pick<PrescribedSet, "reps" | "rpe">
): Pick<PrescribedSet, "weight" | "weightMax" | "derive" | "pick" | "suggested"> {
  const range = (base: number, pct: NumberOrRange, plus: number) => {
    const a = roundLoad(base * lo(pct) + plus, c.style, c.ctx)
    const b = roundLoad(base * hi(pct) + plus, c.style, c.ctx)
    return a === b ? { weight: a } : { weight: a, weightMax: b }
  }
  switch (load.from) {
    case "working": {
      const owner = load.of ? c.states[load.of] : c.state
      const base = owner?.workingWeight
      if (base == null) throw new Error(`${liftName(c.slot.lift)} has no working weight to work from`)
      return range(base, pctOverride ?? load.pct ?? 1, incIn(load.plus, c.unit))
    }
    case "max": {
      const key = load.of ?? c.key
      const base = maxValue(c.states[key], load.max)
      if (base == null) throw new Error(`${liftName(c.slot.lift)} needs a ${load.max.toUpperCase()} for ${key}`)
      return range(base, pctOverride ?? load.pct, incIn(load.plus, c.unit))
    }
    case "set": {
      const pct = load.pct
      return { weight: 0, derive: { slot: load.slot ?? c.slot.id, group: load.group, pct: { min: lo(pct), max: hi(pct) } } }
    }
    case "effort": {
      const e1 = c.state.e1rm
      const guess = e1 != null && row.rpe != null ? weightForEffort(e1, row.reps, row.rpe) : null
      return { weight: 0, pick: "effort", ...(guess != null ? { suggested: roundLoad(guess, c.style, c.ctx) } : {}) }
    }
    case "bodyweight":
      return { weight: load.plusKg ? round2(fromKg(load.plusKg, c.unit)) : 0 }
    case "choose":
      return { weight: 0, pick: "choose" }
  }
}

/** The rows and the group summaries for one lift in one week. */
function rowsFor(c: SlotContext, groups: SetGroup[]): { sets: PrescribedSet[]; groups: PrescribedGroup[] } {
  const sets: PrescribedSet[] = []
  const summaries: PrescribedGroup[] = []
  for (const g of groups) {
    const countMin = lo(g.count)
    const countMax = hi(g.count)
    summaries.push({
      id: g.id,
      kind: g.kind,
      countMin,
      countMax,
      ...(g.options ? { options: g.options } : {}),
      ...(g.effort
        ? {
            effort: {
              ...(g.effort.rpe != null ? { rpe: lo(g.effort.rpe), ...(typeof g.effort.rpe === "object" ? { rpeMax: g.effort.rpe.max } : {}) } : {}),
              ...(g.effort.rir != null ? { rir: lo(g.effort.rir), ...(typeof g.effort.rir === "object" ? { rirMax: g.effort.rir.max } : {}) } : {}),
              ...(g.effort.cap ? { cap: true } : {}),
              ...(g.effort.lastSetOnly ? { lastSetOnly: true } : {}),
            },
          }
        : {}),
      ...(g.note ? { note: g.note } : {}),
      ...(g.restSec != null ? { restSec: g.restSec } : {}),
    })
    for (let i = 0; i < countMin; i++) {
      const per = g.perSet?.[i]
      const reps = repsOf(per?.reps ?? g.reps)
      const lastOfGroup = i === countMin - 1
      const effort =
        g.effort && (!g.effort.lastSetOnly || lastOfGroup)
          ? {
              ...(g.effort.rpe != null ? { rpe: lo(g.effort.rpe), ...(typeof g.effort.rpe === "object" ? { rpeMax: g.effort.rpe.max } : {}) } : {}),
              ...(g.effort.rir != null ? { rir: lo(g.effort.rir), ...(typeof g.effort.rir === "object" ? { rirMax: g.effort.rir.max } : {}) } : {}),
              ...(g.effort.cap ? { cap: true } : {}),
            }
          : {}
      const load = loadOf(g.load, per?.pct, c, { reps: reps.reps, rpe: "rpe" in effort ? effort.rpe : undefined })
      sets.push({
        setNumber: sets.length + 1,
        ...reps,
        weightKg: round2(toKg(load.weight, c.unit)),
        ...load,
        groupId: g.id,
        kind: g.kind,
        ...effort,
      })
    }
  }
  return { sets, groups: summaries }
}

/** The extra fields a lift carries to the screen — the author's, untouched by the maths. */
function carried(slot: SlotSpec, ladderNote: string | undefined, maxNote: string | undefined) {
  const seconds = slot.sets.some((g) => typeof g.reps === "object" && "seconds" in g.reps)
  const note = slot.note ?? ladderNote ?? maxNote
  return {
    ...(slot.group ? { supersetGroup: slot.group } : {}),
    ...(slot.dropSets ? { dropSets: slot.dropSets } : {}),
    ...(note ? { note } : {}),
    ...(slot.perSide ? { perSide: true } : {}),
    ...(slot.restSec != null ? { restSec: slot.restSec } : {}),
    ...(seconds ? { repUnit: "sec" as const } : {}),
  }
}

/** "TM 100kg" — the max a percentage lift is working from, when the author left no note. */
function maxNoteFor(spec: ProgramSpec, groups: SetGroup[], c: SlotContext): string | undefined {
  const load = groups.map((g) => g.load).find((l): l is Extract<LoadSpec, { from: "max" }> => l.from === "max")
  if (!load) return undefined
  const key = load.of ?? c.key
  const value = maxValue(c.states[key], load.max)
  if (value == null) return undefined
  const reps = spec.maxes?.find((m) => m.lift === key)?.reps
  const label = load.max === "tm" ? "TM" : load.max === "1rm" ? "1RM" : `${reps ?? ""}RM`
  return `${label} ${value}${c.unit}`
}

/** One lift, one week. */
export function prescribeSlot(
  spec: ProgramSpec,
  slot: SlotSpec,
  week: number,
  enr: Pick<EngineEnrollment, "unitSystem" | "exerciseState" | "plates">,
  fallbackWorking?: Record<string, number>
): PrescribedExercise {
  const key = stateKeyOf(slot)
  const unit = enr.unitSystem
  let state = enr.exerciseState[key]
  if (!state) {
    const seed = fallbackWorking?.[key]
    if (seed == null) {
      throw new Error(
        `${liftName(slot.lift)} was added to ${spec.name} after you started it, and it has no starting weight. Open "Change this program" and give it one.`
      )
    }
    state = { workingWeight: seed, consecutiveFails: 0 }
  }
  const ctx = roundingContext(spec, unit, enr.plates)
  const style = liftLoadStyle(slot.lift)
  const c: SlotContext = { slot, key, state, states: { ...enr.exerciseState, [key]: state }, unit, style, ctx }

  if (slot.progression.kind === "ladder") {
    const rule = slot.progression
    const idx = ladderRung(slot, state)
    const rung = liftName(rule.lifts[idx])
    const top = idx >= rule.lifts.length - 1
    const unlock = rule.advanceAt.reps ?? rule.advanceAt.seconds
    const ladderNote = top ? `${rung} — top tier` : `${rung} — ${unlock}+ on every set unlocks the next one`
    const { sets } = rowsFor(c, groupsForWeek(slot, week, state))
    return {
      exerciseId: key,
      name: liftName(slot.lift),
      sets: sets.map((s) => ({ ...s, weight: 0, weightKg: 0 })),
      note: slot.note ?? ladderNote,
      bodyweight: true,
      repUnit: "reps",
      ...(slot.group ? { supersetGroup: slot.group } : {}),
      ...(slot.restSec != null ? { restSec: slot.restSec } : {}),
      ...newFields(slot, style, []),
    }
  }

  const groups = groupsForWeek(slot, week, state)
  if (state.needsRetest && slot.progression.kind === "stages") {
    return {
      exerciseId: key,
      name: liftName(slot.lift),
      sets: [{ setNumber: 1, reps: slot.progression.stages[0][0] ? lo(slot.progression.stages[0][0].count) : 1, amrap: false, weight: 0, weightKg: 0, pick: "choose", kind: "top" }],
      note: "Retest: work up to a new max for the first stage's reps; the program restarts from it.",
      ...newFields(slot, style, []),
    }
  }
  const { sets, groups: summaries } = rowsFor(c, groups)
  const allBodyweight = groups.every((g) => g.load.from === "bodyweight" && !g.load.plusKg)
  return {
    exerciseId: key,
    name: liftName(slot.lift),
    sets,
    ...carried(slot, undefined, maxNoteFor(spec, groups, c)),
    ...(allBodyweight ? { bodyweight: true } : {}),
    ...newFields(slot, style, summaries),
  }
}

/** The fields only the new format has; screens that predate it never read them. */
function newFields(slot: SlotSpec, style: LoadStyle, groups: PrescribedGroup[]) {
  return {
    slotId: slot.id,
    loadStyle: style,
    ...(slot.choices ? { choices: slot.choices.map(liftName) } : {}),
    ...(groups.length ? { groups } : {}),
  }
}

/** Today's session. */
export function prescribe(
  spec: ProgramSpec,
  enr: EngineEnrollment,
  opts: PrescribeOptions
): SessionPrescription {
  const where: Placement = place(spec, enr.cursor, {
    clock: opts.clock,
    startedOn: enr.startedOn,
    ...(opts.dayIndex != null ? { dayIndex: opts.dayIndex } : {}),
  })
  const day = spec.days[where.dayIndex]
  if (!day) throw new Error(`${spec.name} has no day at index ${where.dayIndex}`)
  const length = spec.calendar.lengthWeeks
  const week = length != null ? Math.min(where.week, length) : where.week

  return {
    programId: opts.programId,
    dayId: day.id,
    dayLabel: day.label,
    cycle: where.cycle,
    week: where.week,
    sessionCount: enr.cursor.sessionCount,
    periodised: length != null,
    ...(where.complete ? { isComplete: true } : {}),
    exercises: day.slots.map((slot) => prescribeSlot(spec, slot, week, enr, opts.fallbackWorking)),
    ...(where.restDay ? { restDay: true } : {}),
    ...(where.scheduledWeekday != null && spec.calendar.days === "weekdays" ? { scheduledWeekday: where.scheduledWeekday } : {}),
    ...(length != null && spec.calendar.atEnd === "finish" ? { weeksTotal: length } : {}),
    ...(spec.rounding ? { rounding: spec.rounding } : {}),
    ...(where.phase ? { phase: where.phase } : {}),
    ...(where.deload ? { deloadWeek: true } : {}),
    ...(where.test ? { testWeek: true } : {}),
  }
}
