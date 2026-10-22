/**
 * THE NUMBERS A PROGRAM STARTS FROM.
 *
 * Every lift gets a state entry, even one with nothing to track (a lift picked
 * by feel starts as `{}`), so a finished workout always finds the lift it is
 * judging. A lift that needs a starting weight or a max and was given none is
 * refused by name — never guessed (the old engine's rule).
 *
 * Working weights round to the nearest loadable weight, a training max taken
 * from a 1RM rounds as a barbell weight: both exactly as `seedEnrollment`
 * did, so a converted built-in starts where it always started.
 */

import type { EnrollmentCursor, ExerciseState, PlateSetup } from "../types"
import type { LoadSpec, ProgramSpec, SetGroup, SlotSpec, UnitSystem } from "../spec/types"
import { stateKeyOf } from "../spec/schema"
import { liftLoadStyle, liftName } from "./prescribe"
import { roundLoad, roundingContext } from "./rounding"

export interface SeedInputs {
  /** Starting working weights, in the enrollment's unit, by lift key. */
  working?: Record<string, number>
  /** Maxes as their own kind — a training max IS the training max. */
  maxes?: Record<string, number>
  /** One-rep maxes, for a training max the program takes at a percentage of one. */
  oneRepMaxes?: Record<string, number>
}

export const START_CURSOR: EnrollmentCursor = { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 }

/** Every set group a slot can ever do: its sets, its stages, its week changes' loads. */
function everyLoad(slot: SlotSpec): LoadSpec[] {
  const groups: SetGroup[] = [...slot.sets, ...(slot.progression.kind === "stages" ? slot.progression.stages.flat() : [])]
  return [...groups.map((g) => g.load), ...(slot.weeks ?? []).flatMap((w) => (w.load ? [w.load] : []))]
}

/** Which lifts need a working weight: their own loads use it, or another lift's loads point at it. */
function needsWorking(spec: ProgramSpec): Set<string> {
  const out = new Set<string>()
  for (const d of spec.days) {
    for (const s of d.slots) {
      for (const load of everyLoad(s)) if (load.from === "working") out.add(load.of ?? stateKeyOf(s))
      const rule = s.progression
      if (
        rule.kind === "add-on-success" ||
        rule.kind === "double" ||
        rule.kind === "stages" ||
        ((rule.kind === "amrap-table" || rule.kind === "per-extra-rep") && rule.target === "working")
      ) {
        out.add(stateKeyOf(s))
      }
    }
  }
  return out
}

export function seed(
  spec: ProgramSpec,
  inputs: SeedInputs,
  unit: UnitSystem,
  plates?: PlateSetup
): { exerciseState: Record<string, ExerciseState>; cursor: EnrollmentCursor } {
  const ctx = roundingContext(spec, unit, plates)
  const working = needsWorking(spec)
  const maxes = new Map((spec.maxes ?? []).map((m) => [m.lift, m]))
  const state: Record<string, ExerciseState> = {}
  const firstSlot = new Map<string, SlotSpec>()
  for (const d of spec.days) for (const s of d.slots) if (!firstSlot.has(stateKeyOf(s))) firstSlot.set(stateKeyOf(s), s)

  const maxOf = (key: string, seen: Set<string> = new Set()): number => {
    const m = maxes.get(key)!
    const given = inputs.maxes?.[key]
    if (given != null) return given
    if (m.kind === "tm" && m.tmPct != null && inputs.oneRepMaxes?.[key] != null) {
      return roundLoad(inputs.oneRepMaxes[key] * m.tmPct, "barbell", ctx, "nearest")
    }
    if (m.derivedFrom && !seen.has(key)) {
      seen.add(key)
      return roundLoad(maxOf(m.derivedFrom.lift, seen) * m.derivedFrom.pct, "barbell", ctx, "nearest")
    }
    const slot = firstSlot.get(key)
    const what = m.kind === "tm" ? (m.tmPct != null ? "a 1RM (its training max is worked out from it)" : "a training max") : m.kind === "1rm" ? "a 1RM" : `a ${m.reps}RM`
    throw new Error(`${slot ? liftName(slot.lift) : key} needs ${what} to start.`)
  }

  for (const [key, slot] of firstSlot) {
    if (slot.progression.kind === "ladder") {
      state[key] = { tierIndex: 0 }
      continue
    }
    const entry: ExerciseState = {}
    const m = maxes.get(key)
    if (m) {
      const value = maxOf(key)
      if (m.kind === "tm") entry.trainingMax = value
      else if (m.kind === "1rm") entry.oneRepMax = value
      else entry.repMax = value
    }
    if (working.has(key)) {
      const typed = inputs.working?.[key]
      if (typed == null) throw new Error(`${liftName(slot.lift)} needs a starting weight.`)
      entry.workingWeight = roundLoad(typed, liftLoadStyle(slot.lift), ctx, "nearest")
      entry.consecutiveFails = 0
      if (slot.progression.kind === "stages") {
        entry.stage = 0
        entry.stageOneWeight = entry.workingWeight
      }
    }
    state[key] = entry
  }
  // A max named for a key no slot uses was refused by the schema; one used
  // only through `of` still needs its number.
  for (const [key] of maxes) {
    if (state[key]) continue
    const m = maxes.get(key)!
    const value = maxOf(key)
    state[key] = m.kind === "tm" ? { trainingMax: value } : m.kind === "1rm" ? { oneRepMax: value } : { repMax: value }
  }
  return { exerciseState: state, cursor: { ...START_CURSOR } }
}
